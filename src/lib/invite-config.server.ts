/** Convite de desenvolvimento — somente server-side. */

import { DEV_INVITE_TOKEN, isClientDevInviteToken } from "@/lib/invite-config";

export { DEV_INVITE_TOKEN };

/** Bypass de convite só em `npm run dev` local — nunca em produção. */
export function isDevInviteBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isDevInviteToken(token: string): boolean {
  if (isClientDevInviteToken(token)) return true;
  return isDevInviteBypassEnabled() && token.trim() === DEV_INVITE_TOKEN;
}
