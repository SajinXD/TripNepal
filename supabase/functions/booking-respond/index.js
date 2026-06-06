

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireGuide, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "booking-respond";

const InputSchema = z.object({
  booking_id: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
  rejection_reason: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireGuide(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));
  }

  const { booking_id, action, rejection_reason } = parsed.data;

  if (action === "reject" && !rejection_reason) {
    return errorResponse("VALIDATION_ERROR", "rejection_reason is required when rejecting");
  }

  const admin = createAdminClient();

  log("info", FN, `Guide ${action}ing booking`, user.id, { booking_id });

  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, guide_id, tourist_id, status, total_price_npr, start_date, end_date")
    .eq("id", booking_id)
    .single();

  if (fetchErr || !booking) return errorResponse("BOOKING_NOT_FOUND", "Booking not found", 404);
  if (booking.guide_id !== user.id) return errorResponse("FORBIDDEN", "You are not the guide for this booking", 403);
  if (booking.status !== "pending") return errorResponse("INVALID_STATUS", `Cannot respond to booking with status: ${booking.status}`);

  const now = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (action === "accept") {
    await admin.from("bookings").update({ status: "accepted", responded_at: now }).eq("id", booking_id);

    try {
      const paymentResp = await fetch(`${supabaseUrl}/functions/v1/payment-initiate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id, gateway: "esewa", tourist_id: booking.tourist_id }),
      });
      const paymentData = await paymentResp.json();
      log("info", FN, "Payment initiation triggered", user.id, { booking_id, payment: paymentData });
    } catch (payErr) {
      log("warn", FN, "Payment initiation failed (non-fatal)", user.id, {
        err: payErr instanceof Error ? payErr.message : String(payErr),
      });
    }

    await admin.from("notifications").insert({
      user_id: booking.tourist_id,
      type: "booking_accepted",
      title: "🎉 Booking Accepted!",
      body: `Your guide has accepted your booking for ${booking.start_date}. Please complete payment.`,
      data: { booking_id, guide_id: user.id },
    });

    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: booking.tourist_id,
        title: "🎉 Booking Accepted!",
        body: `Your guide has accepted your booking for ${booking.start_date}. Complete payment to confirm.`,
        data: { type: "booking_accepted", booking_id },
      }),
    }).catch(() => {});

    log("info", FN, "Booking accepted", user.id, { booking_id });
    return okResponse({ booking_id, status: "accepted", message: "Booking accepted. Tourist has been notified." });

  } else {
    await admin.from("bookings").update({
      status: "rejected",
      responded_at: now,
      cancellation_reason: rejection_reason,
    }).eq("id", booking_id);

    await admin.from("notifications").insert({
      user_id: booking.tourist_id,
      type: "booking_rejected",
      title: "Booking Rejected",
      body: `Your booking request was declined. Reason: ${rejection_reason}. Try another guide.`,
      data: { booking_id, guide_id: user.id, reason: rejection_reason },
    });

    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: booking.tourist_id,
        title: "Booking Declined",
        body: `Your booking request was declined: ${rejection_reason}`,
        data: { type: "booking_rejected", booking_id, reason: rejection_reason },
      }),
    }).catch(() => {});

    log("info", FN, "Booking rejected", user.id, { booking_id });
    return okResponse({ booking_id, status: "rejected", message: "Booking rejected. Tourist has been notified." });
  }
});
