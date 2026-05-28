"use server";

import { validateInviteToken } from "@/app/actions/invite-onboarding";
import { isDevInviteToken } from "@/lib/invite-config.server";
import { mapAuthError } from "@/lib/portal-auth.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  validatePrimeiroAcesso,
  type PrimeiroAcessoInput,
  type PrimeiroAcessoResult,
} from "@/lib/portal-onboarding";
import { createServiceRoleClient } from "@/lib/supabase-admin.server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type { PrimeiroAcessoInput, PrimeiroAcessoResult };

async function consumeInviteAfterSignup(userId: string, inviteToken: string): Promise<boolean> {
  const normalized = inviteToken.trim();
  if (isDevInviteToken(normalized)) {
    return true;
  }

  const admin = createServiceRoleClient();
  if (!admin) return false;

  const { data, error } = await admin.rpc("argos_consume_invite_for_user", {
    p_token: normalized,
    p_user_id: userId,
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

      const consumed = await consumeInviteAfterSignup(signInData.user.id, normalizedInvite);
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

    const consumed = await consumeInviteAfterSignup(data.user.id, normalizedInvite);
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
