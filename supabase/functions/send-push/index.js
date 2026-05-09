// send-push/index.js
// POST /functions/v1/send-push
// Sends Expo push notifications to a user's registered devices

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAuth, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "send-push";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

const InputSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().max(255),
  body: z.string().max(1024),
  data: z.record(z.unknown()).optional().default({}),
  badge: z.number().int().min(0).optional(),
  sound: z.enum(["default", "none"]).optional().default("default"),
  channel_id: z.string().optional().default("default"),
  priority: z.enum(["default", "normal", "high"]).optional().default("high"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCall = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

  if (!isServiceCall) {
    const authResult = await requireAuth(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    if (user.role !== "admin") {
      return errorResponse("FORBIDDEN", "Only admins or internal services can send push notifications", 403);
    }
  }

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));
  }

  const input = parsed.data;
  const admin = createAdminClient();

  const { data: tokens, error: tokenErr } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", input.user_id);

  if (tokenErr) {
    log("error", FN, "Failed to load push tokens", input.user_id, { err: tokenErr.message });
    return errorResponse("SERVER_ERROR", "Failed to load push tokens", 500);
  }

  if (!tokens || tokens.length === 0) {
    log("info", FN, "No push tokens found for user", input.user_id);
    return okResponse({ sent: 0, skipped: 0, message: "No push tokens registered for this user" });
  }

  const validTokens = tokens
    .map(t => t.token)
    .filter(t => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));

  if (validTokens.length === 0) {
    log("warn", FN, "No valid Expo tokens for user", input.user_id);
    return okResponse({ sent: 0, skipped: tokens.length, message: "No valid Expo push tokens" });
  }

  const messages = validTokens.map(token => ({
    to: token,
    title: input.title,
    body: input.body,
    data: input.data,
    sound: input.sound === "none" ? null : "default",
    badge: input.badge,
    channelId: input.channel_id,
    priority: input.priority,
  }));

  const batches = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    batches.push(messages.slice(i, i + EXPO_BATCH_SIZE));
  }

  let totalSent = 0;
  let totalFailed = 0;
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");

  for (const batch of batches) {
    try {
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      };
      if (expoToken) headers["Authorization"] = `Bearer ${expoToken}`;

      const resp = await fetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(batch) });

      if (!resp.ok) {
        const errText = await resp.text();
        log("error", FN, "Expo API error", input.user_id, { status: resp.status, body: errText });
        totalFailed += batch.length;
        continue;
      }

      const result = await resp.json();
      const data = result.data ?? [];
      for (const item of data) {
        if (item.status === "ok") totalSent++;
        else totalFailed++;
      }
    } catch (fetchErr) {
      log("error", FN, "Expo fetch failed", input.user_id, {
        err: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      totalFailed += batch.length;
    }
  }

  await admin.from("notifications").insert({
    user_id: input.user_id,
    type: "system",
    title: input.title,
    body: input.body,
    data: input.data,
    push_sent: totalSent > 0,
    push_sent_at: new Date().toISOString(),
  }).then(({ error: notifErr }) => {
    if (notifErr) log("warn", FN, "Failed to log notification", input.user_id, { err: notifErr.message });
  });

  log("info", FN, "Push notifications sent", input.user_id, { totalSent, totalFailed });

  return okResponse({ sent: totalSent, failed: totalFailed, total_tokens: validTokens.length });
});
