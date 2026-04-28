import "server-only"

/**
 * Tiny in-memory token-bucket-style rate limiter. Sufficient for a single-
 * region hackathon deploy; replace with Vercel KV / Upstash if the demo
 * starts seeing real traffic.
 *
 * Keyed by a caller identifier (IP address). Survives only the lifetime of
 * the serverless instance — restarts wipe the counters, which is acceptable
 * because limits are conservative.
 */

type Bucket = { count: number; resetAt: number }

const STORE = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Bucket identifier. Use a stable, low-cardinality value (e.g. IP). */
  key: string
  /** Maximum allowed requests in the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until the bucket resets. */
  retryAfter: number
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const bucket = STORE.get(key)

  if (!bucket || bucket.resetAt <= now) {
    STORE.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: Math.ceil(windowMs / 1000) }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  }
}

/** Best-effort caller identification — works across Vercel + most proxies. */
export function callerKey(req: Request): string {
  const headers = req.headers
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("fly-client-ip") ||
    "anon"
  )
}
