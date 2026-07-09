"use server";

import { resolveLoginBlockMessage } from "@/lib/account-access-status";
import { resolvePostLoginRoute } from "@/lib/internal-routes";
import { mapAuthError } from "@/lib/portal-auth";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { getRequestClientKey } from "@/lib/request-client.server";
import {
  buildRateLimitKey,
  clearRateLimit,
  isRateLimited,
  recordRateLimitAttempt,
} from "@/lib/rate-limit.server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PortalLoginResult =
  | { ok: true; userId: string; destination: string }
  | { ok: false; message: string; rateLimited?: boolean };

const PORTAL_LOGIN_MAX_ATTEMPTS = 10;

/** ARGOS — login com rate limit server-side (anti brute-force). */
export async function signInPortal(
  email: string,
  password: string,
): Promise<PortalLoginResult> {
  const clientKey = await getRequestClientKey();
  const rateKey = buildRateLimitKey("portal-login", clientKey);

  if (await isRateLimited(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS)) {
    return {
      ok: false,
      message: PORTAL_COPY.loginRateLimited,
      rateLimited: true,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail) {
    return { ok: false, message: "Informe o e-mail de acesso." };
  }

  if (!normalizedPassword) {
    return { ok: false, message: PORTAL_COPY.loginPasswordHint };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    await recordRateLimitAttempt(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS);
    return { ok: false, message: mapAuthError(error) };
  }

  if (!data.user) {
    await recordRateLimitAttempt(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS);
    return { ok: false, message: PORTAL_COPY.loginSessionError };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status_altar")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    await recordRateLimitAttempt(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS);
    return { ok: false, message: PORTAL_COPY.loginProfileMissing };
  }

  const loginBlockMessage = resolveLoginBlockMessage(profile.status_altar);
  if (profile.role === "cliente" && loginBlockMessage) {
    await supabase.auth.signOut();
    await recordRateLimitAttempt(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS);
    return { ok: false, message: loginBlockMessage };
  }

  const destination = resolvePostLoginRoute(profile.role);
  if (!destination) {
    await supabase.auth.signOut();
    await recordRateLimitAttempt(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS);
    return { ok: false, message: PORTAL_COPY.loginRoleUnauthorized };
  }

  await clearRateLimit(rateKey);
  return { ok: true, userId: data.user.id, destination };
}
