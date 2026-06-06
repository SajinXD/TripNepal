

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAdmin, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "payout-process";

const InputSchema = z.object({
  booking_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireAdmin(req);
  if ("error" in authResult) return authResult.error;
  const { user: adminUser } = authResult;

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));
  }

  const { booking_id } = parsed.data;
  const admin = createAdminClient();

  log("info", FN, "Processing payout", adminUser.id, { booking_id });

  const { data: result, error: rpcErr } = await admin.rpc("complete_booking_and_release_payout", {
    p_booking_id: booking_id,
  });

  if (rpcErr) {
    const hint = rpcErr.hint ?? rpcErr.message;
    if (hint?.includes("BOOKING_NOT_FOUND")) {
      return errorResponse("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    if (hint?.includes("BOOKING_NOT_ACCEPTED")) {
      return errorResponse("BOOKING_NOT_ACCEPTED", "Booking must be accepted before release");
    }
    log("error", FN, "RPC error", adminUser.id, { err: rpcErr.message });
    return errorResponse("SERVER_ERROR", "Failed to process payout", 500);
  }

  const { booking_id: bid, transaction_id } = result;

  const { data: booking } = await admin
    .from("bookings")
    .select("guide_id, tourist_id, total_price_npr, guide_payout_npr, start_date")
    .eq("id", bid)
    .single();

  if (booking) {
    await admin.from("notifications").insert([
      {
        user_id: booking.guide_id,
        type: "payment_received",
        title: "💵 Payout Released!",
        body: `NPR ${Number(booking.guide_payout_npr).toLocaleString()} has been released to your account for the trip on ${booking.start_date}.`,
        data: { booking_id: bid, transaction_id, type: "payout_released" },
      },
      {
        user_id: booking.tourist_id,
        type: "system",
        title: "Trip Completed",
        body: "Your trip has been marked as completed. Please leave a review for your guide!",
        data: { booking_id: bid, type: "trip_completed" },
      },
    ]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    await Promise.allSettled([
      fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: booking.guide_id,
          title: "💵 Payment Released!",
          body: `NPR ${Number(booking.guide_payout_npr).toLocaleString()} transferred to your account.`,
          data: { type: "payout_released", booking_id: bid },
        }),
      }),
      fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: booking.tourist_id,
          title: "✅ Trip Completed",
          body: "Your trip is complete! Rate your guide to help other travelers.",
          data: { type: "trip_completed", booking_id: bid },
        }),
      }),
    ]);
  }

  log("info", FN, "Payout processed", adminUser.id, { booking_id: bid, transaction_id });

  return okResponse({
    booking_id: bid,
    transaction_id,
    status: "completed",
    message: "Booking completed and payout released to guide.",
  });
});
