/** Convite de desenvolvimento — somente server-side. */

import { DEV_INVITE_TOKEN, isClientDevInviteToken } from "@/lib/invite-config";

export { DEV_INVITE_TOKEN };

export function isDevInviteBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.INVITE_DEV_BYPASS === "true";
}

export function isDevInviteToken(token: string): boolean {
  if (isClientDevInviteToken(token)) return true;
  return isDevInviteBypassEnabled() && token.trim() === DEV_INVITE_TOKEN;
}
