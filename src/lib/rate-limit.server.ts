/** PLUTUS/ARGOS — rate limit por IP (Upstash em produção/CI, memória em dev local). */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_PREFIX = "meccafit-rl";

type Bucket = {
  attempts: number[];
};

const buckets = new Map<string, Bucket>();
const limiterCache = new Map<number, Ratelimit>();
let productionUpstashWarned = false;

function pruneAttempts(attempts: number[], now: number): number[] {
  return attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
}

function resolveUpstashRestConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";
  if (!url || !token) return null;
  return { url, token };
}

function resolveDistributedLimiter(maxAttempts: number): Ratelimit | null {
  const cached = limiterCache.get(maxAttempts);
  if (cached) return cached;

  const upstash = resolveUpstashRestConfig();
  if (!upstash) {
    if (process.env.NODE_ENV === "production" && !productionUpstashWarned) {
      console.error(
        "PLUTUS: UPSTASH_REDIS_REST_URL/TOKEN ausentes em produção — rate limit in-memory (inseguro em serverless).",
      );
      productionUpstashWarned = true;
    }
    return null;
  }

  const limiter = new Ratelimit({
    redis: new Redis({ url: upstash.url, token: upstash.token }),
    limiter: Ratelimit.slidingWindow(maxAttempts, "60 s"),
    prefix: RATE_LIMIT_PREFIX,
    analytics: false,
  });

  limiterCache.set(maxAttempts, limiter);
  return limiter;
}

function memoryIsLimited(key: string, maxAttempts: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  const recent = pruneAttempts(bucket?.attempts ?? [], now);
  if (recent.length === 0) {
    buckets.delete(key);
    return false;
  }
  buckets.set(key, { attempts: recent });
  return recent.length >= maxAttempts;
}

function memoryRecordAttempt(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  const recent = pruneAttempts(bucket?.attempts ?? [], now);
  recent.push(now);
  buckets.set(key, { attempts: recent });
}

export function buildRateLimitKey(scope: string, clientKey: string): string {
  return `${scope}:${clientKey || "unknown"}`;
}

export async function isRateLimited(key: string, maxAttempts: number): Promise<boolean> {
  const limiter = resolveDistributedLimiter(maxAttempts);
  if (limiter) {
    const { remaining } = await limiter.getRemaining(key);
    return remaining <= 0;
  }

  return memoryIsLimited(key, maxAttempts);
}

export async function recordRateLimitAttempt(key: string, maxAttempts = 10): Promise<void> {
  const limiter = resolveDistributedLimiter(maxAttempts);
  if (limiter) {
    await limiter.limit(key);
    return;
  }

  memoryRecordAttempt(key);
}

/** Consome um slot de tentativa; retorna true se o limite foi excedido. */
export async function consumeRateLimitSlot(key: string, maxAttempts: number): Promise<boolean> {
  const limiter = resolveDistributedLimiter(maxAttempts);
  if (limiter) {
    const { success } = await limiter.limit(key);
    return !success;
  }

  if (memoryIsLimited(key, maxAttempts)) {
    return true;
  }

  memoryRecordAttempt(key);
  return false;
}

export async function clearRateLimit(key: string): Promise<void> {
  buckets.delete(key);

  const upstash = resolveUpstashRestConfig();
  if (!upstash) return;

  const redis = new Redis({ url: upstash.url, token: upstash.token });
  const keys = await redis.keys(`${RATE_LIMIT_PREFIX}:${key}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
