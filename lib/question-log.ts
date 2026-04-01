import fs from "node:fs/promises";
import path from "node:path";
import { get, list, put } from "@vercel/blob";

interface QuestionLogEntry {
  question: string;
  askedAt: string;
  ip: string;
  sessionId: string;
}

interface DateBucket {
  date: string;
  entries: QuestionLogEntry[];
}

const LOGS_PREFIX = "question-logs/";
const LOCAL_LOGS_DIR = path.join(process.cwd(), "data", "question-logs");

function toDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function csvEscape(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function csvUnescape(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("\"") || !trimmed.endsWith("\"")) {
    return trimmed;
  }
  return trimmed.slice(1, -1).replaceAll("\"\"", "\"");
}

function toCsvRow(entry: QuestionLogEntry): string {
  const sanitizedQuestion = entry.question.replace(/\r?\n/g, " ").trim();
  return `${csvEscape(entry.askedAt)},${csvEscape(entry.ip)},${csvEscape(entry.sessionId)},${csvEscape(sanitizedQuestion)}\n`;
}

function parseCsvLine(line: string): QuestionLogEntry | null {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
      continue;
    }

    current += char;
  }
  columns.push(current);

  if (columns.length < 3) {
    return null;
  }

  const askedAt = csvUnescape(columns[0]);
  const ip = csvUnescape(columns[1]);
  const hasSessionIdColumn = columns.length >= 4;
  const sessionId = hasSessionIdColumn ? csvUnescape(columns[2]) : "unknown";
  const question = csvUnescape(columns.slice(hasSessionIdColumn ? 3 : 2).join(","));

  if (!askedAt || !question) {
    return null;
  }

  return { askedAt, ip, sessionId: sessionId || "unknown", question };
}

function parseCsvFile(contents: string): QuestionLogEntry[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((entry): entry is QuestionLogEntry => entry !== null);
}

function usesBlobStorage(): boolean {
  return process.env.VERCEL === "1";
}

function getBlobPathname(date: string): string {
  return `${LOGS_PREFIX}${date}.csv`;
}

async function readBlobCsv(pathname: string): Promise<string> {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return "";
    }
    return await new Response(result.stream).text();
  } catch {
    return "";
  }
}

async function appendQuestionToBlob(entry: QuestionLogEntry): Promise<void> {
  const date = toDateKey(entry.askedAt);
  const pathname = getBlobPathname(date);
  const existing = await readBlobCsv(pathname);
  const next = `${existing}${toCsvRow(entry)}`;

  await put(pathname, next, {
    access: "private",
    allowOverwrite: true,
    contentType: "text/csv; charset=utf-8",
  });
}

function getLocalFilePath(date: string): string {
  return path.join(LOCAL_LOGS_DIR, `${date}.csv`);
}

async function appendQuestionToLocalFile(entry: QuestionLogEntry): Promise<void> {
  const date = toDateKey(entry.askedAt);
  const filePath = getLocalFilePath(date);
  await fs.mkdir(LOCAL_LOGS_DIR, { recursive: true });
  await fs.appendFile(filePath, toCsvRow(entry), "utf8");
}

export async function logUserQuestion(question: string, ip: string, sessionId = "unknown"): Promise<void> {
  const trimmed = question.trim();

  if (!trimmed) {
    return;
  }

  const entry: QuestionLogEntry = {
    question: trimmed,
    askedAt: new Date().toISOString(),
    ip,
    sessionId,
  };

  try {
    if (usesBlobStorage()) {
      await appendQuestionToBlob(entry);
      return;
    }

    await appendQuestionToLocalFile(entry);
  } catch (error) {
    // Logging should never block chat responses.
    console.error("Question log error:", error);
  }
}

export async function getQuestionLogsByDate(limitDates = 90): Promise<DateBucket[]> {
  try {
    if (usesBlobStorage()) {
      const result = await list({ prefix: LOGS_PREFIX });
      const dates = result.blobs
        .map((blob) => blob.pathname.replace(LOGS_PREFIX, ""))
        .filter((name) => /^\d{4}-\d{2}-\d{2}\.csv$/.test(name))
        .map((name) => name.replace(".csv", ""))
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limitDates);

      const grouped = await Promise.all(
        dates.map(async (date) => {
          const csv = await readBlobCsv(getBlobPathname(date));
          const entries = parseCsvFile(csv).sort((a, b) => b.askedAt.localeCompare(a.askedAt));
          return { date, entries };
        }),
      );

      return grouped.filter((bucket) => bucket.entries.length > 0);
    }

    const files = await fs.readdir(LOCAL_LOGS_DIR).catch(() => []);
    const dates = files
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.csv$/.test(name))
      .map((name) => name.replace(".csv", ""))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, limitDates);

    const grouped = await Promise.all(
      dates.map(async (date) => {
        const filePath = getLocalFilePath(date);
        const csv = await fs.readFile(filePath, "utf8").catch(() => "");
        const entries = parseCsvFile(csv).sort((a, b) => b.askedAt.localeCompare(a.askedAt));
        return { date, entries };
      }),
    );

    return grouped.filter((bucket) => bucket.entries.length > 0);
  } catch (error) {
    console.error("Question log read error:", error);
    return [];
  }
}
