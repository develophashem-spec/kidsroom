/**
 * A tiny fixed-window rate limiter kept in process memory.
 *
 * Good enough to slow down password guessing on a single instance. With several
 * instances (or serverless) each one keeps its own counters – put a shared limiter
 * (Redis, an API gateway, ...) in front for stronger guarantees.
 */

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = { limit: number; windowMs: number };
export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still full of live entries (e.g. under attack): drop the oldest ones.
  if (buckets.size >= MAX_BUCKETS) {
    let toDrop = Math.ceil(MAX_BUCKETS / 10);
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (--toDrop <= 0) break;
    }
  }
}

/** Counts one hit against `key` and reports whether it is still within the limit. */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function clearAllRateLimits(): void {
  buckets.clear();
}
