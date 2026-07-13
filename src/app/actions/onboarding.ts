"use server";

import { mapAuthError } from "@/lib/portal-auth.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  validatePrimeiroAcesso,
  type PrimeiroAcessoInput,
  type PrimeiroAcessoResult,
} from "@/lib/portal-onboarding";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function fetchProfileById(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, nome_linhagem, status_altar")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function waitForServerProfile(userId: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const profile = await fetchProfileById(userId);
      if (profile) return profile;
    } catch {
      // trigger auth ainda criando profile
    }

    if (attempt < 5) {
      await new Promise((resolve) => {
        setTimeout(resolve, 250 * (attempt + 1));
      });
    }
  }

  return null;
}

/** Cadastro público de cliente (sem convite). */
export async function registerCliente(
  input: PrimeiroAcessoInput,
): Promise<PrimeiroAcessoResult> {
  const validation = validatePrimeiroAcesso(input);
  if (!validation.ok) return validation;

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const birthDate = input.birthDate.trim();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          data_nascimento: birthDate,
          role: "cliente",
          has_accepted_terms: false,
        },
      },
    });

    if (error) {
      return { ok: false, message: mapAuthError(error) };
    }

    if (!data.user) {
      return { ok: false, message: PORTAL_COPY.onboardingSignupFailed };
    }

    if (!data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: input.password,
      });

      if (signInError || !signInData.user) {
        return { ok: false, message: PORTAL_COPY.onboardingConfirmEmail };
      }

      const profile = await waitForServerProfile(signInData.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return { ok: false, message: PORTAL_COPY.loginProfileMissing };
      }

      return { ok: true };
    }

    const profile = await waitForServerProfile(data.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, message: PORTAL_COPY.loginProfileMissing };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: PORTAL_COPY.onboardingSignupFailed };
  }
}
