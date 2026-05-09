// payment-webhook-khalti/index.js
// POST /functions/v1/payment-webhook-khalti
// Handles Khalti payment verification webhook

import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "payment-webhook-khalti";

async function lookupKhaltiPayment(pidx) {
  const khaltiSecretKey = Deno.env.get("KHALTI_SECRET_KEY");
  const khaltiBaseUrl = "https://a.khalti.com/api/v2";

  const resp = await fetch(`${khaltiBaseUrl}/epayment/lookup/`, {
    method: "POST",
    headers: { "Authorization": `Key ${khaltiSecretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pidx }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Khalti lookup failed: ${errBody}`);
  }

  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const admin = createAdminClient();
  const url = new URL(req.url);

  log("info", FN, "Khalti webhook received", undefined, { method: req.method });

  const pidx = url.searchParams.get("pidx");
  const purchaseOrderId = url.searchParams.get("purchase_order_id");

  if (!pidx) return errorResponse("MISSING_PIDX", "pidx not found in Khalti callback", 400);

  let khaltiData;
  try {
    khaltiData = await lookupKhaltiPayment(pidx);
  } catch (lookupErr) {
    const msg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
    log("error", FN, "Khalti lookup failed", undefined, { err: msg, pidx });
    return errorResponse("GATEWAY_ERROR", "Failed to verify payment with Khalti", 502);
  }

  const { data: txn, error: txnErr } = await admin
    .from("transactions")
    .select("id, booking_id, amount_npr, status")
    .or(`gateway_txn_id.eq.${pidx},gateway_ref_id.eq.${purchaseOrderId ?? ""}`)
    .eq("gateway", "khalti")
    .single();

  if (txnErr || !txn) {
    log("error", FN, "Transaction not found for Khalti", undefined, { pidx });
    return errorResponse("TRANSACTION_NOT_FOUND", "No transaction found for this reference", 404);
  }

  await admin.from("transactions").update({ raw_gateway_payload: khaltiData }).eq("id", txn.id);

  if (khaltiData.status !== "Completed") {
    log("warn", FN, "Khalti payment not completed", undefined, { status: khaltiData.status, pidx });
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return okResponse({ message: "Payment not completed", status: khaltiData.status });
  }

  const receivedNpr = khaltiData.total_amount / 100;
  const expectedNpr = Number(txn.amount_npr);
  if (Math.abs(receivedNpr - expectedNpr) > 1) {
    log("error", FN, "Khalti amount mismatch!", undefined, { received: receivedNpr, expected: expectedNpr });
    return errorResponse("AMOUNT_MISMATCH", "Payment amount mismatch", 400);
  }

  if (txn.status === "held") return okResponse({ message: "Payment already processed" });

  await admin.from("transactions").update({
    status: "held",
    paid_at: new Date().toISOString(),
    gateway_txn_id: khaltiData.pidx,
  }).eq("id", txn.id);

  const { data: booking } = await admin
    .from("bookings")
    .select("tourist_id, guide_id, start_date")
    .eq("id", txn.booking_id)
    .single();

  if (booking) {
    await admin.from("notifications").insert([
      {
        user_id: booking.tourist_id,
        type: "payment_received",
        title: "✅ Payment Confirmed via Khalti!",
        body: `Your payment of NPR ${expectedNpr.toLocaleString()} has been confirmed.`,
        data: { booking_id: txn.booking_id, transaction_id: txn.id },
      },
      {
        user_id: booking.guide_id,
        type: "payment_received",
        title: "💰 Khalti Payment Secured",
        body: `Payment for booking on ${booking.start_date} is in escrow.`,
        data: { booking_id: txn.booking_id, transaction_id: txn.id },
      },
    ]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: booking.tourist_id,
        title: "✅ Khalti Payment Confirmed!",
        body: `Booking confirmed. NPR ${expectedNpr.toLocaleString()} secured.`,
        data: { type: "payment_confirmed", booking_id: txn.booking_id },
      }),
    }).catch(() => {});
  }

  log("info", FN, "Khalti payment verified and held", undefined, { transaction_id: txn.id });
  return okResponse({ transaction_id: txn.id, booking_id: txn.booking_id, status: "held" });
});
