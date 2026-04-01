import { getQuestionLogsByDate } from "@/lib/question-log";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const asDate = new Date(Date.UTC(year, month - 1, day));
  return asDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupEntriesBySession(
  entries: Array<{ sessionId: string; askedAt: string; question: string; ip: string }>,
) {
  const map = new Map<
    string,
    Array<{ sessionId: string; askedAt: string; question: string; ip: string }>
  >();

  for (const entry of entries) {
    const key = entry.sessionId || "unknown";
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(entry);
  }

  return Array.from(map.entries())
    .map(([sessionId, items]) => {
      const sorted = [...items].sort((a, b) => a.askedAt.localeCompare(b.askedAt));
      return { sessionId, items: sorted };
    })
    .sort(
      (a, b) =>
        (b.items[b.items.length - 1]?.askedAt || "").localeCompare(
          a.items[a.items.length - 1]?.askedAt || "",
        ),
    );
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  if (!verifyAdminSessionToken(sessionToken)) {
    redirect("/admin/login");
  }

  const logs = await getQuestionLogsByDate(120);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Admin - User Questions</h1>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">Stored questions grouped by date.</p>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>

        {logs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            No questions found yet.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {logs.map((bucket) => (
              <section
                key={bucket.date}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-5"
              >
                <h2 className="text-lg font-medium text-white">
                  {formatDateLabel(bucket.date)}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {bucket.entries.length} question{bucket.entries.length === 1 ? "" : "s"}
                </p>

                <ul className="mt-4 space-y-3">
                  {groupEntriesBySession(bucket.entries).map((session) => (
                    <li
                      key={session.sessionId}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          Session: <span className="font-mono text-slate-300">{session.sessionId}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {session.items.length} question{session.items.length === 1 ? "" : "s"} |{" "}
                          {formatTimestamp(session.items[0].askedAt)} -{" "}
                          {formatTimestamp(session.items[session.items.length - 1].askedAt)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {session.items.map((entry, idx) => (
                          <div
                            key={`${entry.askedAt}-${idx}`}
                            className="rounded-md border border-slate-800 bg-slate-900 p-3"
                          >
                            <p className="text-sm leading-relaxed text-slate-100">{entry.question}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              {formatTimestamp(entry.askedAt)} | IP: {entry.ip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
