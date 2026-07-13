"use server";

import { resolveLoginBlockMessage } from "@/lib/account-access-status";
import { isForjadorPanelRole, resolvePostLoginRoute } from "@/lib/internal-routes";
import { ONBOARDING_ROUTE } from "@/lib/onboarding-terms";
import { mapAuthError } from "@/lib/portal-auth.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { getRequestClientKey } from "@/lib/request-client.server";
import { buildRateLimitKey, consumeRateLimitSlot } from "@/lib/rate-limit.server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PortalLoginAudience = "cliente" | "forjador";

export type PortalLoginResult =
  | { ok: true; userId: string; destination: string }
  | { ok: false; message: string; rateLimited?: boolean };

const PORTAL_LOGIN_MAX_ATTEMPTS = 10;

/** ARGOS — login com porta obrigatória (cliente × forjador). Sem default silencioso. */
export async function signInPortal(
  email: string,
  password: string,
  audience: PortalLoginAudience,
): Promise<PortalLoginResult> {
  if (audience !== "cliente" && audience !== "forjador") {
    return { ok: false, message: PORTAL_COPY.loginRoleUnauthorized };
  }
  const clientKey = await getRequestClientKey();
  const rateKey = buildRateLimitKey(`portal-login:${audience}`, clientKey);

  if (await consumeRateLimitSlot(rateKey, PORTAL_LOGIN_MAX_ATTEMPTS)) {
    return {
      ok: false,
      message: PORTAL_COPY.loginRateLimited,
      rateLimited: true,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password;

  if (!normalizedEmail) {
    return { ok: false, message: "Informe o e-mail de acesso." };
  }

  if (!normalizedPassword.trim()) {
    return {
      ok: false,
      message:
        audience === "forjador"
          ? PORTAL_COPY.forjaLoginPasswordHint
          : PORTAL_COPY.loginPasswordHint,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    return { ok: false, message: mapAuthError(error) };
  }

  if (!data.user) {
    return { ok: false, message: PORTAL_COPY.loginSessionError };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status_altar")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false, message: PORTAL_COPY.loginProfileMissing };
  }

  const role = String(profile.role ?? "");
  const isForjador = isForjadorPanelRole(role);
  const isCliente = role === "cliente";

  if (audience === "cliente") {
    if (!isCliente) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message: PORTAL_COPY.loginWrongPortalForjador,
      };
    }

    const loginBlockMessage = resolveLoginBlockMessage(profile.status_altar);
    if (loginBlockMessage) {
      await supabase.auth.signOut();
      return { ok: false, message: loginBlockMessage };
    }
  } else if (audience === "forjador") {
    if (!isForjador) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message: PORTAL_COPY.loginWrongPortalCliente,
      };
    }
  }

  const destination = resolvePostLoginRoute(role);
  if (!destination) {
    await supabase.auth.signOut();
    return { ok: false, message: PORTAL_COPY.loginRoleUnauthorized };
  }

  // Clientes sempre passam pela cerimônia (logo + manifesto). Diretrizes só na 1ª vez.
  return {
    ok: true,
    userId: data.user.id,
    destination: isCliente ? ONBOARDING_ROUTE : destination,
  };
}
