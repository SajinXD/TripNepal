

import { z } from "npm:zod";
import { corsPreflightResponse, okResponse, errorResponse } from "../_shared/cors.js";
import { requireAuth, log } from "../_shared/auth.js";
import { createAdminClient } from "../_shared/supabase.js";

const FN = "kyc-submit";

const CITIZENSHIP_REGEX = /^[A-Z0-9\-\/]{5,20}$/i;
const PASSPORT_REGEX = /^[A-Z]{2}[0-9]{7}$/i;
const LICENSE_REGEX = /^[A-Z0-9\-]{5,30}$/i;

const InputSchema = z.object({
  citizenship_number: z.string().regex(CITIZENSHIP_REGEX).optional(),
  citizenship_front_url: z.string().url().optional(),
  citizenship_back_url: z.string().url().optional(),
  passport_number: z.string().regex(PASSPORT_REGEX).optional(),
  guide_license_number: z.string().regex(LICENSE_REGEX),
  guide_license_url: z.string().url(),
  selfie_url: z.string().url(),
}).refine(
  (d) => d.citizenship_number || d.passport_number,
  { message: "Either citizenship_number or passport_number is required" }
).refine(
  (d) => !d.citizenship_number || (d.citizenship_front_url && d.citizenship_back_url),
  { message: "Citizenship front and back images are required when submitting citizenship" }
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const authResult = await requireAuth(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  if (user.role !== "guide") {
    return errorResponse("FORBIDDEN", "Only guides can submit KYC", 403);
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

  log("info", FN, "KYC submission received", user.id);

  const { data: existing, error: fetchErr } = await admin
    .from("kyc_verifications")
    .select("id, status, resubmission_count")
    .eq("guide_id", user.id)
    .single();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    log("error", FN, "Failed to fetch KYC record", user.id, { err: fetchErr.message });
    return errorResponse("SERVER_ERROR", "Failed to check KYC status", 500);
  }

  if (existing?.status === "approved") {
    return errorResponse("KYC_ALREADY_APPROVED", "Your KYC is already approved");
  }

  if (existing?.status === "pending") {
    return errorResponse("KYC_PENDING", "Your KYC is already under review. Please wait.");
  }

  const kycPayload = {
    guide_id: user.id,
    status: "pending",
    citizenship_number: input.citizenship_number ?? null,
    citizenship_front_url: input.citizenship_front_url ?? null,
    citizenship_back_url: input.citizenship_back_url ?? null,
    passport_number: input.passport_number ?? null,
    guide_license_number: input.guide_license_number,
    guide_license_url: input.guide_license_url,
    selfie_url: input.selfie_url,
    submitted_at: new Date().toISOString(),
    rejection_reason: null,
  };

  let kycId;

  if (existing) {
    const { data: updated, error: updateErr } = await admin
      .from("kyc_verifications")
      .update({ ...kycPayload, resubmission_count: (existing.resubmission_count ?? 0) + 1 })
      .eq("guide_id", user.id)
      .select("id")
      .single();

    if (updateErr || !updated) {
      log("error", FN, "Failed to update KYC", user.id, { err: updateErr?.message });
      return errorResponse("SERVER_ERROR", "Failed to update KYC record", 500);
    }
    kycId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("kyc_verifications")
      .insert(kycPayload)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      log("error", FN, "Failed to insert KYC", user.id, { err: insertErr?.message });
      return errorResponse("SERVER_ERROR", "Failed to create KYC record", 500);
    }
    kycId = inserted.id;
  }

  
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    const adminNotifications = admins.map(a => ({
      user_id: a.id,
      type: "system",
      title: "New KYC Submission",
      body: `Guide ${user.full_name} has submitted KYC documents for review.`,
      data: { kyc_id: kycId, guide_id: user.id, guide_name: user.full_name },
    }));
    await admin.from("notifications").insert(adminNotifications);
  }

  log("info", FN, "KYC submitted successfully", user.id, { kycId });

  return okResponse({
    kyc_id: kycId,
    status: "pending",
    message: "KYC documents submitted successfully. You will be notified once reviewed.",
  });
});
