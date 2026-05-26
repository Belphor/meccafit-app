"use server";

import { createClient } from "@supabase/supabase-js";
import { isDevInviteToken } from "@/lib/invite-config.server";
import { PORTAL_COPY } from "@/lib/portal-copy";

export type InviteValidation = {
  valid: boolean;
  message?: string;
};

function createInviteAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const normalized = token.trim();
  if (!normalized) {
    return { valid: false, message: PORTAL_COPY.onboardingInviteInvalid };
  }

  if (isDevInviteToken(normalized)) {
    return { valid: true };
  }

  const admin = createInviteAdminClient();
  if (!admin) {
    return { valid: false, message: PORTAL_COPY.onboardingInviteUnavailable };
  }

  const { data, error } = await admin.rpc("argos_validate_invite_token", {
    p_token: normalized,
  });

  if (error) {
    return { valid: false, message: PORTAL_COPY.onboardingInviteUnavailable };
  }

  if (data !== true) {
    return { valid: false, message: PORTAL_COPY.onboardingInviteInvalid };
  }

  return { valid: true };
}
