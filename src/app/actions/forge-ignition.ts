"use server";

import { isForgeIgnitionConfigured, matchesForgeIgnitionKey } from "@/lib/forge-config.server";
import { getRequestClientKey } from "@/lib/request-client.server";
import {
  buildRateLimitKey,
  isRateLimited,
  recordRateLimitAttempt,
} from "@/lib/rate-limit.server";

export type ForgeIgnitionAvailability = {
  configured: boolean;
};

export type ForgeIgnitionValidation = {
  configured: boolean;
  valid: boolean;
};

const FORGE_KEY_MAX_ATTEMPTS = 8;

export async function checkForgeIgnitionAvailable(): Promise<ForgeIgnitionAvailability> {
  return { configured: isForgeIgnitionConfigured() };
}

export async function validateForgeIgnitionKey(
  candidate: string,
): Promise<ForgeIgnitionValidation> {
  if (!isForgeIgnitionConfigured()) {
    return { configured: false, valid: false };
  }

  const clientKey = await getRequestClientKey();
  const rateKey = buildRateLimitKey("forge-ignition", clientKey);
  if (isRateLimited(rateKey, FORGE_KEY_MAX_ATTEMPTS)) {
    return { configured: true, valid: false };
  }

  recordRateLimitAttempt(rateKey);

  return {
    configured: true,
    valid: matchesForgeIgnitionKey(candidate),
  };
}
