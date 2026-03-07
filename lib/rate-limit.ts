import { kv } from "@vercel/kv";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const RATE_LIMIT = 20; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

export async function rateLimit(ip: string): Promise<RateLimitResult> {
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // Remove old entries and count recent requests
    await kv.zremrangebyscore(key, 0, windowStart);
    const count = await kv.zcard(key);

    if (count >= RATE_LIMIT) {
      const oldestEntry = await kv.zrange(key, 0, 0, { withScores: true });
      const resetTime = oldestEntry.length > 1
        ? Math.ceil((Number(oldestEntry[1]) + WINDOW_MS - now) / 1000)
        : 60;

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    await kv.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await kv.expire(key, 120); // Clean up after 2 minutes

    return {
      success: true,
      remaining: RATE_LIMIT - count - 1,
      reset: 60,
    };
  } catch (error) {
    // If KV is unavailable, allow the request (fail open)
    console.error("Rate limit error:", error);
    return {
      success: true,
      remaining: RATE_LIMIT,
      reset: 60,
    };
  }
}
