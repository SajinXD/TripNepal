// kyc-review/index.js
// POST /functions/v1/kyc-review  [ADMIN ONLY]
// Approves or rejects a guide's KYC submission

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAdmin, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "kyc-review";

const InputSchema = z.object({
  kyc_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireAdmin(req);
  if ("error" in authResult) return authResult.error;
  const { user: admin_user } = authResult;

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("INVALID_JSON", "Request body must be valid JSON"); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues.map(i => i.message).join("; "));
  }

  const { kyc_id, decision, reason } = parsed.data;

  if (decision === "rejected" && !reason) {
    return errorResponse("VALIDATION_ERROR", "Rejection reason is required when rejecting KYC");
  }

  const admin = createAdminClient();

  log("info", FN, `KYC decision: ${decision}`, admin_user.id, { kyc_id });

  const { data: kyc, error: fetchErr } = await admin
    .from("kyc_verifications")
    .select("id, guide_id, status")
    .eq("id", kyc_id)
    .single();

  if (fetchErr || !kyc) {
    return errorResponse("KYC_NOT_FOUND", "KYC record not found", 404);
  }

  if (kyc.status !== "pending") {
    return errorResponse("INVALID_STATUS", `KYC is already in status: ${kyc.status}`);
  }

  const now = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (decision === "approved") {
    await admin.from("kyc_verifications").update({
      status: "approved",
      reviewed_by: admin_user.id,
      reviewed_at: now,
      rejection_reason: null,
    }).eq("id", kyc_id);

    await admin.from("guide_profiles").update({ is_verified: true }).eq("id", kyc.guide_id);

    await admin.from("notifications").insert({
      user_id: kyc.guide_id,
      type: "kyc_approved",
      title: "🎉 KYC Approved!",
      body: "Your identity verification has been approved. You can now receive bookings.",
      data: { kyc_id },
    });

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: kyc.guide_id,
          title: "🎉 KYC Approved!",
          body: "Your identity verification has been approved. You can now receive bookings!",
          data: { type: "kyc_approved", kyc_id },
        }),
      });
    } catch (pushErr) {
      log("warn", FN, "Push notification failed (non-fatal)", admin_user.id, {
        err: pushErr instanceof Error ? pushErr.message : String(pushErr),
      });
    }

    log("info", FN, "KYC approved", admin_user.id, { kyc_id, guide_id: kyc.guide_id });
    return okResponse({ kyc_id, guide_id: kyc.guide_id, status: "approved" });

  } else {
    await admin.from("kyc_verifications").update({
      status: "rejected",
      reviewed_by: admin_user.id,
      reviewed_at: now,
      rejection_reason: reason,
    }).eq("id", kyc_id);

    await admin.from("notifications").insert({
      user_id: kyc.guide_id,
      type: "kyc_rejected",
      title: "KYC Rejected",
      body: `Your KYC was rejected: ${reason}. Please resubmit with correct documents.`,
      data: { kyc_id, reason },
    });

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: kyc.guide_id,
          title: "KYC Rejected",
          body: `Your KYC was rejected: ${reason}. Please resubmit.`,
          data: { type: "kyc_rejected", kyc_id, reason },
        }),
      });
    } catch (pushErr) {
      log("warn", FN, "Push notification failed (non-fatal)", admin_user.id, {
        err: pushErr instanceof Error ? pushErr.message : String(pushErr),
      });
    }

    log("info", FN, "KYC rejected", admin_user.id, { kyc_id, reason });
    return okResponse({ kyc_id, guide_id: kyc.guide_id, status: "rejected", reason });
  }
});
