import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const RATE_LIMIT = 20; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export async function rateLimit(ip: string): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // If Redis is not configured, allow the request (fail open)
  if (!redis) {
    return {
      success: true,
      remaining: RATE_LIMIT,
      reset: 60,
    };
  }

  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // Remove old entries and count recent requests
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    if (count >= RATE_LIMIT) {
      const oldestEntries = (await redis.zrange(key, 0, 0)) as string[];
      const oldestTimestamp = oldestEntries.length > 0
        ? Number(oldestEntries[0].split("-")[0])
        : now;
      const resetTime = Math.max(
        1,
        Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000),
      );

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(key, 120); // Clean up after 2 minutes

    return {
      success: true,
      remaining: RATE_LIMIT - count - 1,
      reset: 60,
    };
  } catch (error) {
    // If Redis is unavailable, allow the request (fail open)
    console.error("Rate limit error:", error);
    return {
      success: true,
      remaining: RATE_LIMIT,
      reset: 60,
    };
  }
}
