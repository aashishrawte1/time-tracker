import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Summary as SummaryData } from "../types";
import { formatHoursMinutes } from "../utils/format";

type Range = "daily" | "weekly" | "monthly";

const RANGE_LABELS: Record<Range, string> = {
  daily: "Day",
  weekly: "Week",
  monthly: "Month",
};

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, range: Range, direction: 1 | -1): string {
  const d = new Date(dateStr);
  if (range === "daily") d.setDate(d.getDate() + direction);
  else if (range === "weekly") d.setDate(d.getDate() + direction * 7);
  else d.setMonth(d.getMonth() + direction);
  return toDateInput(d);
}

function formatRangeHeading(summary: SummaryData): string {
  const start = new Date(summary.start);
  const end = new Date(summary.end);
  end.setDate(end.getDate() - 1); // end is exclusive

  if (summary.range === "daily") {
    return start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (summary.range === "monthly") {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}, ${end.getFullYear()}`;
}

export function Summary() {
  const [range, setRange] = useState<Range>("daily");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<SummaryData>(`/summary?range=${range}&date=${date}`)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [range, date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border bg-white p-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                range === r ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => shiftDate(d, range, -1))}
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ← Prev
          </button>
          <button
            onClick={() => setDate(toDateInput(new Date()))}
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={() => setDate((d) => shiftDate(d, range, 1))}
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {loading || !summary ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <p className="text-sm text-slate-500">{formatRangeHeading(summary)}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHoursMinutes(summary.totalSeconds)}</p>
          </div>

          {summary.projects.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No time tracked in this period.</p>
          ) : (
            <ul className="divide-y">
              {summary.projects.map((row) => {
                const pct = summary.totalSeconds > 0 ? Math.round((row.totalSeconds / summary.totalSeconds) * 100) : 0;
                return (
                  <li key={row.projectId} className="px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.projectColor }} />
                        <span className="font-medium text-slate-700">{row.projectName}</span>
                      </div>
                      <span className="font-mono text-slate-600">{formatHoursMinutes(row.totalSeconds)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: row.projectColor }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
