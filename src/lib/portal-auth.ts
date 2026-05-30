import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type PortalProfileRole =
  | "forjador"
  | "forjador_linhagem"
  | "forjador_soberano"
  | "cliente";

export type PortalProfile = {
  full_name: string | null;
  role: PortalProfileRole;
  nome_linhagem: string | null;
  status_altar: string | null;
};

const INVALID_CREDENTIAL_CODES = new Set([
  "invalid_credentials",
  "invalid_grant",
  "user_not_found",
]);

export function mapAuthError(error: AuthError): string {
  const code = (error.code ?? "").trim().toLowerCase();
  const message = error.message.trim().toLowerCase();

  if (
    INVALID_CREDENTIAL_CODES.has(code) ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
  }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de acessar o altar.";
  }

  if (error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Não foi possível autenticar agora. Tente novamente.";
}

export async function fetchAuthenticatedProfile(userId: string): Promise<PortalProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, nome_linhagem, status_altar")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

const PROFILE_BOOTSTRAP_ATTEMPTS = 6;
const PROFILE_BOOTSTRAP_DELAY_MS = 250;

export async function waitForAuthenticatedProfile(userId: string): Promise<PortalProfile | null> {
  for (let attempt = 0; attempt < PROFILE_BOOTSTRAP_ATTEMPTS; attempt += 1) {
    try {
      const profile = await fetchAuthenticatedProfile(userId);
      if (profile) return profile;
    } catch {
      // trigger auth ainda criando profile — retry
    }

    if (attempt < PROFILE_BOOTSTRAP_ATTEMPTS - 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, PROFILE_BOOTSTRAP_DELAY_MS * (attempt + 1));
      });
    }
  }

  return null;
}
