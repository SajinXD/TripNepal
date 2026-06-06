

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAuth, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "payment-initiate";

const InputSchema = z.object({
  booking_id: z.string().uuid(),
  gateway: z.enum(["esewa", "khalti", "ime_pay"]),
  tourist_id: z.string().uuid().optional(),
});

function buildEsewaPayload(params) {
  return {
    amount: params.amount.toString(),
    tax_amount: params.taxAmount.toString(),
    total_amount: params.totalAmount.toString(),
    transaction_uuid: params.transactionUUID,
    product_code: params.productCode,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };
}

async function initiateKhaltiPayment(params) {
  const khaltiSecretKey = Deno.env.get("KHALTI_SECRET_KEY");
  const khaltiBaseUrl = "https://a.khalti.com/api/v2";

  const resp = await fetch(`${khaltiBaseUrl}/epayment/initiate/`, {
    method: "POST",
    headers: { "Authorization": `Key ${khaltiSecretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      return_url: params.return_url,
      website_url: params.website_url,
      amount: params.amount_paisa,
      purchase_order_id: params.purchase_order_id,
      purchase_order_name: params.purchase_order_name,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Khalti initiation failed: ${errBody}`);
  }

  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCall = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

  let callerId;
  let input;

  if (isServiceCall) {
    let body;
    try { body = await req.json(); }
    catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));

    input = parsed.data;
    callerId = input.tourist_id ?? "internal";
  } else {
    const authResult = await requireAuth(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    callerId = user.id;

    let body;
    try { body = await req.json(); }
    catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));

    input = { ...parsed.data, tourist_id: user.id };
  }

  return await processPayment(input, callerId);
});

async function processPayment(input, callerId) {
  const admin = createAdminClient();

  log("info", FN, "Initiating payment", callerId, { booking_id: input.booking_id, gateway: input.gateway });

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, tourist_id, guide_id, total_price_npr, platform_fee_npr, guide_payout_npr, status")
    .eq("id", input.booking_id)
    .single();

  if (bookingErr || !booking) return errorResponse("BOOKING_NOT_FOUND", "Booking not found", 404);
  if (booking.status !== "accepted") return errorResponse("BOOKING_NOT_ACCEPTED", "Payment can only be initiated for accepted bookings");

  if (input.tourist_id && input.tourist_id !== "internal" && booking.tourist_id !== input.tourist_id) {
    return errorResponse("FORBIDDEN", "You are not the tourist for this booking", 403);
  }

  const { data: existingTxn } = await admin
    .from("transactions")
    .select("id, status")
    .eq("booking_id", input.booking_id)
    .neq("status", "failed")
    .single();

  if (existingTxn) return errorResponse("PAYMENT_EXISTS", "A payment already exists for this booking");

  const transactionUUID = crypto.randomUUID();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const appReturnBase = Deno.env.get("APP_RETURN_URL") ?? supabaseUrl;

  const { data: txn, error: txnErr } = await admin
    .from("transactions")
    .insert({
      booking_id: input.booking_id,
      tourist_id: booking.tourist_id,
      guide_id: booking.guide_id,
      gateway: input.gateway,
      gateway_ref_id: transactionUUID,
      amount_npr: booking.total_price_npr,
      platform_fee_npr: booking.platform_fee_npr,
      guide_payout_npr: booking.guide_payout_npr,
      status: "pending",
    })
    .select("id")
    .single();

  if (txnErr || !txn) {
    log("error", FN, "Failed to create transaction", callerId, { err: txnErr?.message });
    return errorResponse("SERVER_ERROR", "Failed to create payment record", 500);
  }

  let gatewayPayload = {};

  try {
    if (input.gateway === "esewa") {
      const merchantCode = Deno.env.get("ESEWA_MERCHANT_CODE");
      const payload = buildEsewaPayload({
        amount: Number(booking.total_price_npr),
        taxAmount: 0,
        totalAmount: Number(booking.total_price_npr),
        transactionUUID,
        productCode: merchantCode,
        successUrl: `${appReturnBase}/functions/v1/payment-webhook-esewa?status=success&booking_id=${input.booking_id}`,
        failureUrl: `${appReturnBase}/functions/v1/payment-webhook-esewa?status=failure&booking_id=${input.booking_id}`,
      });
      gatewayPayload = {
        gateway: "esewa",
        form_url: "https://epay.esewa.com.np/api/epay/main/v2/form",
        form_fields: payload,
        transaction_id: txn.id,
        reference: transactionUUID,
      };

    } else if (input.gateway === "khalti") {
      const khaltiResult = await initiateKhaltiPayment({
        amount_paisa: Math.round(Number(booking.total_price_npr) * 100),
        purchase_order_id: transactionUUID,
        purchase_order_name: `TripNepal Booking ${input.booking_id.slice(0, 8)}`,
        return_url: `${appReturnBase}/functions/v1/payment-webhook-khalti`,
        website_url: "https://tripnepal.app",
      });
      await admin.from("transactions").update({ gateway_txn_id: khaltiResult.pidx }).eq("id", txn.id);
      gatewayPayload = {
        gateway: "khalti",
        payment_url: khaltiResult.payment_url,
        pidx: khaltiResult.pidx,
        transaction_id: txn.id,
        reference: transactionUUID,
      };

    } else if (input.gateway === "ime_pay") {
      gatewayPayload = {
        gateway: "ime_pay",
        message: "IME Pay integration requires merchant account credentials",
        transaction_id: txn.id,
        reference: transactionUUID,
      };
    }
  } catch (gatewayErr) {
    const errMsg = gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr);
    log("error", FN, "Gateway call failed", callerId, { err: errMsg, gateway: input.gateway });
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return errorResponse("GATEWAY_ERROR", "Payment gateway error. Please try again.", 502);
  }

  log("info", FN, "Payment initiated", callerId, { transaction_id: txn.id, gateway: input.gateway });

  return okResponse({ transaction_id: txn.id, booking_id: input.booking_id, amount_npr: booking.total_price_npr, ...gatewayPayload });
}
