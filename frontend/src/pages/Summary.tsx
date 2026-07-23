import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Summary as SummaryData } from "../types";
import { formatHoursMinutes } from "../utils/format";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";

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
        <div className="flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => shiftDate(d, range, -1))}
            aria-label="Previous"
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            onClick={() => setDate(toDateInput(new Date()))}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <button
            onClick={() => setDate((d) => shiftDate(d, range, 1))}
            aria-label="Next"
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Next
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading || !summary ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{formatRangeHeading(summary)}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {formatHoursMinutes(summary.totalSeconds)}
            </p>
          </div>

          {summary.projects.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No time tracked in this period.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {summary.projects.map((row) => {
                const pct = summary.totalSeconds > 0 ? Math.round((row.totalSeconds / summary.totalSeconds) * 100) : 0;
                return (
                  <li key={row.projectId} className="px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.projectColor }} />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{row.projectName}</span>
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {formatHoursMinutes(row.totalSeconds)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
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
