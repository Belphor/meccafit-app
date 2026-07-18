"use server";

import { mapAuthError } from "@/lib/portal-auth.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  validatePrimeiroAcesso,
  type PrimeiroAcessoInput,
  type PrimeiroAcessoResult,
} from "@/lib/portal-onboarding";
import { createServiceRoleClient } from "@/lib/supabase-admin.server";
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

function isEmailAlreadyRegistered(error: { message?: string; code?: string; status?: number }) {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    error.status === 422 ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already exists")
  );
}

/** Cadastro público de cliente — e-mail já confirmado no altar (sem link do Gmail). */
export async function registerCliente(
  input: PrimeiroAcessoInput,
): Promise<PrimeiroAcessoResult> {
  const validation = validatePrimeiroAcesso(input);
  if (!validation.ok) return validation;

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  try {
    const admin = createServiceRoleClient();
    if (!admin) {
      return { ok: false, message: PORTAL_COPY.onboardingSignupFailed };
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "cliente",
        has_accepted_terms: false,
      },
    });

    if (createError) {
      if (isEmailAlreadyRegistered(createError)) {
        return { ok: false, message: PORTAL_COPY.onboardingEmailAlreadyExists };
      }
      return { ok: false, message: createError.message.trim() || PORTAL_COPY.onboardingSignupFailed };
    }

    if (!created.user) {
      return { ok: false, message: PORTAL_COPY.onboardingSignupFailed };
    }

    const supabase = await createSupabaseServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });

    if (signInError || !signInData.user) {
      return {
        ok: false,
        message: signInError ? mapAuthError(signInError) : PORTAL_COPY.onboardingSignupFailed,
      };
    }

    const profile = await waitForServerProfile(signInData.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, message: PORTAL_COPY.loginProfileMissing };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: PORTAL_COPY.onboardingSignupFailed };
  }
}
