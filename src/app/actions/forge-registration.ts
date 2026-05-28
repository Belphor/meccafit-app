"use server";

import { headers } from "next/headers";
import { isForgeIgnitionConfigured, matchesForgeIgnitionKey } from "@/lib/forge-config.server";
import { PORTAL_COPY } from "@/lib/portal-copy";
import { getRequestClientKey } from "@/lib/request-client.server";
import {
  buildRateLimitKey,
  isRateLimited,
  recordRateLimitAttempt,
} from "@/lib/rate-limit.server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ForgeRegistrationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const FORGE_OTP_MAX_ATTEMPTS = 6;

/** ARGOS — cadastro forjador só após chave validada no servidor (não só no browser). */
export async function requestForjadorCadastroOtp(input: {
  forgeKey: string;
  email: string;
  forjadorName: string;
  lineageName: string;
}): Promise<ForgeRegistrationResult> {
  if (!isForgeIgnitionConfigured()) {
    return { ok: false, message: PORTAL_COPY.forgeNotConfigured };
  }

  const clientKey = await getRequestClientKey();
  const rateKey = buildRateLimitKey("forge-registration", clientKey);
  if (isRateLimited(rateKey, FORGE_OTP_MAX_ATTEMPTS)) {
    return { ok: false, message: PORTAL_COPY.forgeKeyInvalid };
  }

  recordRateLimitAttempt(rateKey);

  if (!matchesForgeIgnitionKey(input.forgeKey)) {
    return { ok: false, message: PORTAL_COPY.forgeKeyInvalid };
  }

  const email = input.email.trim().toLowerCase();
  const forjadorName = input.forjadorName.trim();
  const lineageName = input.lineageName.trim();

  if (!email || !forjadorName || !lineageName) {
    return { ok: false, message: PORTAL_COPY.forgeRegisterIncomplete };
  }

  const origin = (await headers()).get("origin") ?? undefined;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: origin,
      data: {
        full_name: forjadorName,
        nome_linhagem: lineageName,
      },
    },
  });

  if (error) {
    return { ok: false, message: PORTAL_COPY.forgeRegisterError };
  }

  return { ok: true, message: PORTAL_COPY.forgeRegisterSuccess };
}
