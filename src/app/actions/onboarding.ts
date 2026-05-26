"use server";

import { createClient } from "@supabase/supabase-js";
import { validateInviteToken } from "@/app/actions/invite-onboarding";
import { isDevInviteToken } from "@/lib/invite-config.server";
import { mapAuthError } from "@/lib/portal-auth.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  validatePrimeiroAcesso,
  type PrimeiroAcessoInput,
  type PrimeiroAcessoResult,
} from "@/lib/portal-onboarding";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type { PrimeiroAcessoInput, PrimeiroAcessoResult };

async function consumeInviteAfterSignup(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  inviteToken: string,
): Promise<boolean> {
  const normalized = inviteToken.trim();
  if (isDevInviteToken(normalized)) {
    return true;
  }

  const { data, error } = await supabase.rpc("argos_consume_invite_token", {
    p_token: normalized,
  });

  return !error && data === true;
}

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

export async function registerPrimeiroAcesso(
  inviteToken: string,
  input: PrimeiroAcessoInput,
): Promise<PrimeiroAcessoResult> {
  const validation = validatePrimeiroAcesso(input);
  if (!validation.ok) return validation;

  const inviteCheck = await validateInviteToken(inviteToken);
  if (!inviteCheck.valid) {
    return { ok: false, message: inviteCheck.message ?? PORTAL_COPY.onboardingInviteInvalid };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const birthDate = input.birthDate.trim();
  const normalizedInvite = inviteToken.trim();

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
          invite_token: normalizedInvite,
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

      const consumed = await consumeInviteAfterSignup(supabase, normalizedInvite);
      if (!consumed) {
        await supabase.auth.signOut();
        return { ok: false, message: PORTAL_COPY.onboardingInviteInvalid };
      }

      const profile = await waitForServerProfile(signInData.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return { ok: false, message: PORTAL_COPY.loginProfileMissing };
      }

      return { ok: true };
    }

    const consumed = await consumeInviteAfterSignup(supabase, normalizedInvite);
    if (!consumed) {
      await supabase.auth.signOut();
      return { ok: false, message: PORTAL_COPY.onboardingInviteInvalid };
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

/** Promove forjador após cadastro corporativo validado — só service_role. */
export async function bootstrapForjadorProfile(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return false;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.rpc("argos_bootstrap_forjador", { p_user_id: userId });
  return !error;
}
