import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type PortalProfile = {
  full_name: string | null;
  role: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
  nome_linhagem: string | null;
  status_altar: string | null;
};

export function mapAuthError(error: AuthError): string {
  const message = error.message.trim();
  return message.length > 0 ? message : "Não foi possível autenticar agora.";
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
