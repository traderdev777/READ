import "server-only";

/**
 * Fixed-window, in-memory limiter keyed by IP. Good enough for one server instance;
 * swap for Upstash/Redis when the web app runs on more than one.
 */
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  return entry.count > limit
    ? { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) }
    : { ok: true, retryAfter: 0 };
}
