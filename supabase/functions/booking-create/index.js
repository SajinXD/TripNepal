// booking-create/index.js
// POST /functions/v1/booking-create
// Tourist creates a booking request for a guide

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAuth, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "booking-create";
const PLATFORM_FEE_PERCENT = 0.10;

const InputSchema = z.object({
  guide_id: z.string().uuid(),
  trip_plan_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  travelers_count: z.number().int().min(1).max(20).default(1),
  trip_category: z.enum([
    "trekking", "cultural", "adventure", "religious",
    "wildlife", "photography", "food", "city_tour"
  ]),
  district: z.string().min(2).max(100),
  special_requests: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireAuth(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  if (user.role !== "tourist") {
    return errorResponse("FORBIDDEN", "Only tourists can create bookings", 403);
  }

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  }

  const input = parsed.data;
  const admin = createAdminClient();

  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    return errorResponse("INVALID_DATE", "start_date cannot be in the past");
  }
  if (endDate < startDate) {
    return errorResponse("INVALID_DATE", "end_date must be >= start_date");
  }

  log("info", FN, "Creating booking", user.id, { guide_id: input.guide_id });

  const { data: guide, error: guideErr } = await admin
    .from("guide_profiles")
    .select("id, is_verified, is_online, price_per_day_npr")
    .eq("id", input.guide_id)
    .single();

  if (guideErr || !guide) return errorResponse("GUIDE_NOT_FOUND", "Guide not found", 404);
  if (!guide.is_verified) return errorResponse("GUIDE_NOT_VERIFIED", "This guide is not yet verified");
  if (!guide.is_online) return errorResponse("GUIDE_OFFLINE", "This guide is currently offline");

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalPrice = Number((guide.price_per_day_npr * days).toFixed(2));
  const platformFee = Number((totalPrice * PLATFORM_FEE_PERCENT).toFixed(2));
  const guidePayout = Number((totalPrice - platformFee).toFixed(2));

  const { data: result, error: rpcErr } = await admin.rpc("create_booking_with_thread", {
    p_tourist_id: user.id,
    p_guide_id: input.guide_id,
    p_trip_plan_id: input.trip_plan_id ?? null,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    p_start_time: input.start_time ?? null,
    p_travelers_count: input.travelers_count,
    p_trip_category: input.trip_category,
    p_district: input.district,
    p_special_requests: input.special_requests ?? null,
    p_price_per_day_npr: guide.price_per_day_npr,
    p_total_price_npr: totalPrice,
    p_platform_fee_npr: platformFee,
    p_guide_payout_npr: guidePayout,
  });

  if (rpcErr) {
    const hint = rpcErr.hint ?? rpcErr.message;
    if (hint?.includes("GUIDE_NOT_AVAILABLE")) return errorResponse("GUIDE_NOT_AVAILABLE", "Guide is not available");
    if (hint?.includes("GUIDE_ALREADY_BOOKED")) return errorResponse("GUIDE_ALREADY_BOOKED", "Guide is already booked for those dates");
    log("error", FN, "RPC error", user.id, { err: rpcErr.message });
    return errorResponse("SERVER_ERROR", "Failed to create booking", 500);
  }

  const { booking_id, thread_id } = result;

  // Push-notify the guide
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: input.guide_id,
        title: "📅 New Booking Request!",
        body: `${user.full_name} wants to book you for ${days} day(s) starting ${input.start_date}. NPR ${totalPrice.toLocaleString()}`,
        data: { type: "booking_request", booking_id, thread_id, tourist_name: user.full_name, start_date: input.start_date, end_date: input.end_date, total_price_npr: totalPrice },
      }),
    });
  } catch (pushErr) {
    log("warn", FN, "Push notification failed (non-fatal)", user.id, {
      err: pushErr instanceof Error ? pushErr.message : String(pushErr),
    });
  }

  await admin.from("notifications").insert({
    user_id: input.guide_id,
    type: "booking_request",
    title: "New Booking Request",
    body: `${user.full_name} wants to book you for ${days} day(s) (NPR ${totalPrice.toLocaleString()})`,
    data: { booking_id, thread_id, tourist_id: user.id },
  });

  log("info", FN, "Booking created", user.id, { booking_id, thread_id });

  return okResponse({ booking_id, thread_id, total_price_npr: totalPrice, platform_fee_npr: platformFee, guide_payout_npr: guidePayout, days, status: "pending" }, 201);
});
