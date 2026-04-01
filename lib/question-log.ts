import { Redis } from "@upstash/redis";

interface QuestionLogEntry {
  question: string;
  askedAt: string;
  ip: string;
}

interface DateBucket {
  date: string;
  entries: QuestionLogEntry[];
}

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

function toDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export async function logUserQuestion(question: string, ip: string): Promise<void> {
  const redis = getRedisClient();
  const trimmed = question.trim();

  if (!redis || !trimmed) {
    return;
  }

  const askedAt = new Date().toISOString();
  const date = toDateKey(askedAt);
  const listKey = `question_logs:${date}`;
  const datesKey = "question_logs:dates";
  const payload = JSON.stringify({
    question: trimmed,
    askedAt,
    ip,
  });

  try {
    await redis.sadd(datesKey, date);
    await redis.lpush(listKey, payload);
    // Keep only the latest 500 entries per day.
    await redis.ltrim(listKey, 0, 499);
    await redis.expire(listKey, 60 * 60 * 24 * 365);
    await redis.expire(datesKey, 60 * 60 * 24 * 365);
  } catch (error) {
    // Logging should never block chat responses.
    console.error("Question log error:", error);
  }
}

export async function getQuestionLogsByDate(limitDates = 90): Promise<DateBucket[]> {
  const redis = getRedisClient();
  if (!redis) {
    return [];
  }

  try {
    const dates = (await redis.smembers("question_logs:dates")) as string[];
    const sortedDates = dates.sort((a, b) => b.localeCompare(a)).slice(0, limitDates);

    const grouped = await Promise.all(
      sortedDates.map(async (date) => {
        const rows = (await redis.lrange(`question_logs:${date}`, 0, 499)) as string[];
        const entries: QuestionLogEntry[] = [];

        for (const row of rows) {
          try {
            const parsed = JSON.parse(row) as QuestionLogEntry;
            if (parsed.question && parsed.askedAt) {
              entries.push(parsed);
            }
          } catch {
            // Skip invalid rows.
          }
        }

        return { date, entries };
      }),
    );

    return grouped.filter((bucket) => bucket.entries.length > 0);
  } catch (error) {
    console.error("Question log read error:", error);
    return [];
  }
}

