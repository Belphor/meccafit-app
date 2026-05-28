import { headers } from "next/headers";

/** HERMES — identificador estável para rate limit em server actions. */
export async function getRequestClientKey(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  return forwarded || realIp || "local";
}
