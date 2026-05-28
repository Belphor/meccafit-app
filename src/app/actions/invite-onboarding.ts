"use server";

import { isDevInviteToken } from "@/lib/invite-config.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { createServiceRoleClient } from "@/lib/supabase-admin.server";

export type InviteValidation = {
  valid: boolean;
  message?: string;
};

export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const normalized = token.trim();
  if (!normalized) {
    return { valid: false, message: PORTAL_COPY.onboardingInviteInvalid };
  }

  if (isDevInviteToken(normalized)) {
    return { valid: true };
  }

  const admin = createServiceRoleClient();
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
