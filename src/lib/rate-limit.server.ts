/** PLUTUS/ARGOS — rate limit in-memory por IP (server actions). */

const RATE_LIMIT_WINDOW_MS = 60_000;

type Bucket = {
  attempts: number[];
};

const buckets = new Map<string, Bucket>();

function pruneAttempts(attempts: number[], now: number): number[] {
  return attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
}

export function isRateLimited(key: string, maxAttempts: number): boolean {
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

export function recordRateLimitAttempt(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  const recent = pruneAttempts(bucket?.attempts ?? [], now);
  recent.push(now);
  buckets.set(key, { attempts: recent });
}

export function buildRateLimitKey(scope: string, clientKey: string): string {
  return `${scope}:${clientKey || "unknown"}`;
}
