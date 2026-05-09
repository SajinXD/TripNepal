// ai-trip-planner/index.js
// POST /functions/v1/ai-trip-planner
// Generates an AI-powered Nepal trip itinerary using Claude

import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAuth, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "ai-trip-planner";
const RATE_LIMIT_PER_DAY = 10;
const MODEL = "claude-haiku-4-5-20251001";

const InputSchema = z.object({
  tripPlanId: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  total_days: z.number().int().min(1).max(30),
  budget_npr: z.number().positive().optional(),
  travelers_count: z.number().int().min(1).max(50).default(1),
  trip_categories: z.array(z.enum([
    "trekking", "cultural", "adventure", "religious",
    "wildlife", "photography", "food", "city_tour"
  ])).min(1),
  preferred_districts: z.array(z.string()).optional().default([]),
  special_requests: z.string().max(1000).optional(),
  lang: z.enum(["en", "ne"]).default("en"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireAuth(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));
  }

  const input = parsed.data;
  const admin = createAdminClient();

  log("info", FN, "Request received", user.id, { total_days: input.total_days });

  // Rate limiting: 10 plans/user/day
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: plansToday, error: countErr } = await admin
    .from("trip_plans")
    .select("id", { count: "exact", head: true })
    .eq("tourist_id", user.id)
    .gte("created_at", todayStart.toISOString());

  if (countErr) {
    log("error", FN, "Rate limit check failed", user.id, { err: countErr.message });
    return errorResponse("SERVER_ERROR", "Failed to check rate limit", 500);
  }

  if ((plansToday ?? 0) >= RATE_LIMIT_PER_DAY) {
    return errorResponse("RATE_LIMITED", `You can generate at most ${RATE_LIMIT_PER_DAY} trip plans per day`, 429);
  }

  // Load destinations from DB
  const { data: destinations, error: destErr } = await admin
    .from("destinations")
    .select("id, name, district, province, category, lat, lng, elevation_m, entry_fee_npr, short_desc, avg_visit_hrs")
    .eq("is_active", true);

  if (destErr) {
    log("error", FN, "Failed to load destinations", user.id, { err: destErr.message });
    return errorResponse("SERVER_ERROR", "Failed to load destination data", 500);
  }

  // Load user profile for personalization
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, nationality, preferred_language")
    .eq("id", user.id)
    .single();

  // Create trip_plan row
  let tripPlanId = input.tripPlanId;
  if (!tripPlanId) {
    const { data: plan, error: planErr } = await admin
      .from("trip_plans")
      .insert({
        tourist_id: user.id,
        total_days: input.total_days,
        budget_npr: input.budget_npr ?? null,
        travelers_count: input.travelers_count,
        trip_categories: input.trip_categories,
        preferred_districts: input.preferred_districts,
        special_requests: input.special_requests ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        status: "generating",
        ai_model: MODEL,
      })
      .select("id")
      .single();

    if (planErr || !plan) {
      log("error", FN, "Failed to create trip plan", user.id, { err: planErr?.message });
      return errorResponse("SERVER_ERROR", "Failed to create trip plan record", 500);
    }
    tripPlanId = plan.id;
  } else {
    await admin.from("trip_plans")
      .update({ status: "generating", ai_model: MODEL })
      .eq("id", tripPlanId)
      .eq("tourist_id", user.id);
  }

  log("info", FN, "Generating itinerary", user.id, { tripPlanId, total_days: input.total_days });

  // Build Claude prompt
  const langInstruction = input.lang === "ne"
    ? "Respond entirely in Nepali (Devanagari script) except for place names and JSON keys."
    : "Respond in English.";

  const destinationSummary = destinations
    ?.map(d => `- ${d.name} (${d.district}, ${d.province}) | lat:${d.lat} lng:${d.lng} | categories:${d.category?.join(",")} | fee:NPR${d.entry_fee_npr} | ${d.short_desc}`)
    .join("\n");

  const systemPrompt = `You are an expert Nepal travel planner with deep knowledge of all 77 districts, trekking routes, cultural sites, local transport, accommodation options, and typical costs in Nepali Rupees (NPR). ${langInstruction}

You MUST respond with ONLY valid JSON that matches exactly this schema (no explanation, no markdown, no code fences):
{
  "title": string,
  "estimated_total_cost_npr": number,
  "days": [
    {
      "day": number,
      "date": "YYYY-MM-DD",
      "district": string,
      "summary": string,
      "stops": [
        {
          "time": "HH:MM",
          "name": string,
          "destination_id": "uuid or null",
          "lat": number,
          "lng": number,
          "duration_min": number,
          "estimated_cost_npr": number,
          "notes": string
        }
      ],
      "meals": [
        { "type": "breakfast|lunch|dinner", "suggestion": string, "cost_npr": number }
      ],
      "stay": { "name": string, "type": "hotel|guesthouse|teahouse", "cost_per_night_npr": number },
      "transport": { "mode": string, "cost_npr": number }
    }
  ],
  "tips": [string],
  "packing_list": [string]
}

Rules:
- destination_id must be a UUID from the provided destination list, or null for unlisted places.
- All costs in NPR (Nepali Rupees) as numbers, not strings.
- Budget must be respected; stay within ${input.budget_npr ? `NPR ${input.budget_npr}` : "a reasonable Nepal budget"}.
- Recommend realistic transport options (bus, jeep, flight, taxi) with actual route durations.
- Include safety tips relevant to the chosen activities.
- Be specific with accommodation names (real hotels/guesthouses in Nepal).`;

  const userMessage = `Plan a ${input.total_days}-day Nepal trip:
- Budget: ${input.budget_npr ? `NPR ${input.budget_npr}` : "flexible"}
- Travelers: ${input.travelers_count}
- Categories: ${input.trip_categories.join(", ")}
- Preferred districts: ${input.preferred_districts.length > 0 ? input.preferred_districts.join(", ") : "any"}
- Start date: ${input.start_date ?? "flexible"}
- Special requests: ${input.special_requests ?? "none"}
- Traveler name: ${profile?.full_name ?? "Guest"}
- Nationality: ${profile?.nationality ?? "International"}

Available destinations in our system (use destination_id from this list when applicable):
${destinationSummary}`;

  // Call Claude
  let itinerary;
  try {
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      throw new Error("Unexpected Claude response type");
    }

    let jsonText = rawContent.text.trim();
    jsonText = jsonText.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

    itinerary = JSON.parse(jsonText);
  } catch (claudeErr) {
    const msg = claudeErr instanceof Error ? claudeErr.message : "Unknown AI error";
    log("error", FN, "Claude call failed", user.id, { err: msg });

    await admin.from("trip_plans")
      .update({ status: "error", error_message: "AI generation failed" })
      .eq("id", tripPlanId);

    return errorResponse("AI_ERROR", "Trip plan generation failed. Please try again.", 500);
  }

  // Persist itinerary
  const { error: updateErr } = await admin
    .from("trip_plans")
    .update({
      status: "ready",
      itinerary,
      title: itinerary.title ?? "Nepal Trip",
      estimated_total_cost_npr: itinerary.estimated_total_cost_npr ?? null,
      generated_at: new Date().toISOString(),
    })
    .eq("id", tripPlanId);

  if (updateErr) {
    log("error", FN, "Failed to save itinerary", user.id, { err: updateErr.message });
    return errorResponse("SERVER_ERROR", "Failed to save trip plan", 500);
  }

  log("info", FN, "Itinerary generated and saved", user.id, { tripPlanId });

  return okResponse({ trip_plan_id: tripPlanId, itinerary });
});
