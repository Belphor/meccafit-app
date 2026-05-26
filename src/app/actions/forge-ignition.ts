"use server";



import {

  isForgeIgnitionConfigured,

  matchesForgeIgnitionKey,

} from "@/lib/forge-config.server";



export type ForgeIgnitionAvailability = {

  configured: boolean;

};



export type ForgeIgnitionValidation = {

  configured: boolean;

  valid: boolean;

};



const RATE_LIMIT_WINDOW_MS = 60_000;

const RATE_LIMIT_MAX_ATTEMPTS = 8;

const attemptLog = new Map<string, number[]>();



function pruneAttempts(key: string, now: number) {

  const attempts = attemptLog.get(key) ?? [];

  const recent = attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length === 0) {

    attemptLog.delete(key);

    return [];

  }

  attemptLog.set(key, recent);

  return recent;

}



function isRateLimited(key: string): boolean {

  const now = Date.now();

  const recent = pruneAttempts(key, now);

  return recent.length >= RATE_LIMIT_MAX_ATTEMPTS;

}



function recordAttempt(key: string) {

  const now = Date.now();

  const recent = pruneAttempts(key, now);

  recent.push(now);

  attemptLog.set(key, recent);

}



export async function checkForgeIgnitionAvailable(): Promise<ForgeIgnitionAvailability> {

  return { configured: isForgeIgnitionConfigured() };

}



export async function validateForgeIgnitionKey(

  candidate: string,

): Promise<ForgeIgnitionValidation> {

  if (!isForgeIgnitionConfigured()) {

    return { configured: false, valid: false };

  }



  const rateKey = "forge-ignition";

  if (isRateLimited(rateKey)) {

    return { configured: true, valid: false };

  }



  recordAttempt(rateKey);

  return {

    configured: true,

    valid: matchesForgeIgnitionKey(candidate),

  };

}

