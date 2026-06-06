

import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "payment-webhook-esewa";

async function verifyEsewaSignature(message, receivedSignature, secretKey) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const computedBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return computedBase64 === receivedSignature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const admin = createAdminClient();
  const url = new URL(req.url);

  log("info", FN, "eSewa webhook received", undefined, { method: req.method });

  let esewaData = {};

  if (req.method === "GET") {
    const encoded = url.searchParams.get("data");
    if (!encoded) return errorResponse("MISSING_DATA", "No data parameter in eSewa callback", 400);
    try {
      esewaData = JSON.parse(atob(encoded));
    } catch {
      return errorResponse("INVALID_DATA", "Failed to decode eSewa response data", 400);
    }
  } else if (req.method === "POST") {
    try {
      const text = await req.text();
      try {
        esewaData = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        params.forEach((v, k) => { esewaData[k] = v; });
      }
    } catch {
      return errorResponse("INVALID_BODY", "Failed to parse eSewa webhook body", 400);
    }
  }

  const { status, transaction_uuid: transactionUUID, total_amount: totalAmountStr, signed_field_names: signedFieldNames, signature } = esewaData;

  if (!transactionUUID) return errorResponse("MISSING_TRANSACTION_UUID", "transaction_uuid not found in response", 400);

  const { data: txn, error: txnErr } = await admin
    .from("transactions")
    .select("id, booking_id, amount_npr, status")
    .eq("gateway_ref_id", transactionUUID)
    .eq("gateway", "esewa")
    .single();

  if (txnErr || !txn) {
    log("error", FN, "Transaction not found for eSewa", undefined, { transactionUUID });
    return errorResponse("TRANSACTION_NOT_FOUND", "No transaction found for this reference", 404);
  }

  await admin.from("transactions").update({ raw_gateway_payload: esewaData }).eq("id", txn.id);

  if (status !== "COMPLETE") {
    log("warn", FN, "eSewa payment not complete", undefined, { status, transactionUUID });
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return okResponse({ message: "Payment not completed", status });
  }

  if (signature && signedFieldNames) {
    const secretKey = Deno.env.get("ESEWA_SECRET_KEY");
    const fields = signedFieldNames.split(",").map(f => f.trim());
    const message = fields.map(f => `${f}=${esewaData[f] ?? ""}`).join(",");
    const isValid = await verifyEsewaSignature(message, signature, secretKey);
    if (!isValid) {
      log("error", FN, "eSewa signature verification FAILED", undefined, { transactionUUID });
      return errorResponse("INVALID_SIGNATURE", "Payment signature verification failed", 400);
    }
  } else {
    log("warn", FN, "No signature in eSewa payload — skipping verification", undefined);
  }

  const receivedAmount = parseFloat(totalAmountStr?.replace(/,/g, "") ?? "0");
  const expectedAmount = Number(txn.amount_npr);
  if (Math.abs(receivedAmount - expectedAmount) > 1) {
    log("error", FN, "Amount mismatch!", undefined, { received: receivedAmount, expected: expectedAmount });
    return errorResponse("AMOUNT_MISMATCH", "Payment amount does not match booking amount", 400);
  }

  if (txn.status === "held") return okResponse({ message: "Payment already processed" });

  await admin.from("transactions").update({
    status: "held",
    paid_at: new Date().toISOString(),
    gateway_txn_id: esewaData.ref_id ?? esewaData.transaction_uuid,
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
        title: "✅ Payment Confirmed!",
        body: `Your payment of NPR ${expectedAmount.toLocaleString()} has been received. Have a great trip!`,
        data: { booking_id: txn.booking_id, transaction_id: txn.id },
      },
      {
        user_id: booking.guide_id,
        type: "payment_received",
        title: "💰 Payment Received",
        body: `Payment for booking on ${booking.start_date} is secured in escrow.`,
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
        title: "✅ Payment Confirmed!",
        body: `Your booking is confirmed! Payment of NPR ${expectedAmount.toLocaleString()} received.`,
        data: { type: "payment_confirmed", booking_id: txn.booking_id },
      }),
    }).catch(() => {});
  }

  log("info", FN, "eSewa payment verified and held", undefined, { transaction_id: txn.id });
  return okResponse({ transaction_id: txn.id, booking_id: txn.booking_id, status: "held" });
});
