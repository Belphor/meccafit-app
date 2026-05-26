/** Convite dev — seguro para import no client (NODE_ENV inlined no build). */

export const DEV_INVITE_TOKEN = "dev" as const;

export function isClientDevInviteToken(token: string): boolean {
  return process.env.NODE_ENV === "development" && token.trim() === DEV_INVITE_TOKEN;
}
