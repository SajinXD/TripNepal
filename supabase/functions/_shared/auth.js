

import { createAdminClient } from "./supabase.js";
import { errorResponse } from "./cors.js";

export async function requireAuth(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: errorResponse("UNAUTHORIZED", "Missing Authorization header", 401) };
  }

  const token = authHeader.replace("Bearer ", "");
  const adminClient = createAdminClient();

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return { error: errorResponse("UNAUTHORIZED", "Invalid or expired token", 401) };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: errorResponse("PROFILE_NOT_FOUND", "User profile not found", 404) };
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      role: profile.role,
      full_name: profile.full_name,
    },
  };
}

export async function requireAdmin(req) {
  const result = await requireAuth(req);
  if ("error" in result) return result;
  if (result.user.role !== "admin") {
    return { error: errorResponse("FORBIDDEN", "Admin access required", 403) };
  }
  return result;
}

export async function requireGuide(req) {
  const result = await requireAuth(req);
  if ("error" in result) return result;
  if (result.user.role !== "guide") {
    return { error: errorResponse("FORBIDDEN", "Guide access required", 403) };
  }
  return result;
}

export function log(level, fn, msg, userId, extra) {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      function: fn,
      level,
      msg,
      userId: userId ?? null,
      ...extra,
    })
  );
}
