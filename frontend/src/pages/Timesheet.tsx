import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Project, TimeEntry } from "../types";
import { formatHoursMinutes } from "../utils/format";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, PlusIcon, TrashIcon } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";

function projectLabel(entry: TimeEntry, projects: Project[]): { name: string; color: string } {
  if (typeof entry.projectId === "object") {
    return { name: entry.projectId.name, color: entry.projectId.color };
  }
  const project = projects.find((p) => p._id === entry.projectId);
  return { name: project?.name ?? "Unknown", color: project?.color ?? "#94a3b8" };
}

function toDateInput(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function toTimeInput(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function shiftDate(dateStr: string, direction: 1 | -1): string {
  const d = new Date(`${dateStr}T00:00`);
  d.setDate(d.getDate() + direction);
  return toDateInput(d);
}

function dayBounds(dateStr: string): { start: Date; end: Date; isToday: boolean; isFuture: boolean } {
  const start = new Date(`${dateStr}T00:00`);
  const nextDay = new Date(start);
  nextDay.setDate(nextDay.getDate() + 1);
  const now = new Date();
  const today = toDateInput(now);
  const isToday = dateStr === today;
  const isFuture = dateStr > today;
  const end = isToday ? now : nextDay;
  return { start, end, isToday, isFuture };
}

const GAP_THRESHOLD_MS = 60_000;

type Segment =
  | { type: "entry"; entry: TimeEntry }
  | { type: "gap"; start: Date; end: Date };

function buildSegments(entries: TimeEntry[], dayStart: Date, dayEnd: Date): Segment[] {
  const sorted = [...entries].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const segments: Segment[] = [];
  let cursor = dayStart;

  for (const entry of sorted) {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : dayEnd;
    if (start.getTime() - cursor.getTime() > GAP_THRESHOLD_MS) {
      segments.push({ type: "gap", start: cursor, end: start });
    }
    segments.push({ type: "entry", entry });
    if (end.getTime() > cursor.getTime()) cursor = end;
  }

  if (dayEnd.getTime() - cursor.getTime() > GAP_THRESHOLD_MS) {
    segments.push({ type: "gap", start: cursor, end: dayEnd });
  }

  return segments;
}

function GapRow({
  gap,
  date,
  projects,
  onCreated,
}: {
  gap: { start: Date; end: Date };
  date: string;
  projects: Project[];
  onCreated: (entry: TimeEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?._id ?? "");
  const [startTime, setStartTime] = useState(toTimeInput(gap.start));
  const [endTime, setEndTime] = useState(toTimeInput(gap.end));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const gapMs = gap.end.getTime() - gap.start.getTime();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setError(null);
    setSubmitting(true);
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const res = await api.post<{ entry: TimeEntry }>("/entries", {
        projectId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note,
      });
      onCreated(res.entry);
      setOpen(false);
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log time");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <li className="flex items-center justify-between gap-3 border-l-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/30">
        <div className="text-sm">
          <span className="font-medium text-slate-400 dark:text-slate-500">
            {formatTime(gap.start)} – {formatTime(gap.end)}
          </span>
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
            Unlogged · {formatHoursMinutes(Math.round(gapMs / 1000))}
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={projects.length === 0}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-white hover:text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Log this time
        </button>
      </li>
    );
  }

  return (
    <li className="border-l-2 border-dashed border-indigo-300 bg-indigo-50/40 px-4 py-3 dark:border-indigo-700 dark:bg-indigo-950/20">
      <form onSubmit={handleSubmit}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Fill {formatHoursMinutes(Math.round(gapMs / 1000))} gap
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="col-span-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:col-span-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !projectId}
          className="mt-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save entry"}
        </button>
      </form>
    </li>
  );
}

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function formatHourMark(hour: number): string {
  if (hour === 0 || hour === 24) return "12A";
  if (hour === 12) return "12P";
  return hour < 12 ? `${hour}A` : `${hour - 12}P`;
}

function DayTimelineBar({
  entries,
  projects,
  midnight,
  now,
}: {
  entries: TimeEntry[];
  projects: Project[];
  midnight: Date;
  now: Date | null;
}) {
  const dayMs = 24 * 60 * 60 * 1000;
  const loggedEntries = entries.filter((e) => e.endTime || now);

  const blocks = loggedEntries.map((entry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : (now ?? start);
    const leftPct = Math.max(0, ((start.getTime() - midnight.getTime()) / dayMs) * 100);
    const widthPct = Math.min(100, ((end.getTime() - start.getTime()) / dayMs) * 100);
    const label = projectLabel(entry, projects);
    return { entry, leftPct, widthPct, label, start, end };
  });

  const legend = Array.from(new Map(blocks.map((b) => [b.label.name, b.label])).values());

  return (
    <div className="px-4 py-4">
      <div className="relative h-10 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {blocks.map(({ entry, leftPct, widthPct, label, start, end }) => (
          <div
            key={entry._id}
            title={`${label.name} · ${formatTime(start)} – ${entry.endTime ? formatTime(end) : "now"}`}
            className="absolute top-0 h-full transition-opacity hover:opacity-80"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.3)}%`, backgroundColor: label.color }}
          />
        ))}
        {now && (
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-900/60 dark:bg-white/70"
            style={{ left: `${Math.min(100, ((now.getTime() - midnight.getTime()) / dayMs) * 100)}%` }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        {HOUR_MARKS.map((h) => (
          <span key={h}>{formatHourMark(h)}</span>
        ))}
      </div>

      {legend.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {legend.map((p) => (
            <span key={p.name} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  projects,
  onDeleted,
}: {
  entry: TimeEntry;
  projects: Project[];
  onDeleted: (id: string) => void;
}) {
  const label = projectLabel(entry, projects);
  const [deleting, setDeleting] = useState(false);
  const start = new Date(entry.startTime);
  const end = entry.endTime ? new Date(entry.endTime) : null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/entries/${entry._id}`);
      onDeleted(entry._id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <li className="group flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {formatTime(start)} – {end ? formatTime(end) : "now"}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                entry.source === "timer"
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {entry.source === "timer" ? "Timer" : "Manual"}
            </span>
          </div>
          <div className="truncate text-xs text-slate-400 dark:text-slate-500">
            {label.name}
            {entry.note && <span> · {entry.note}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
          {end ? formatHoursMinutes(entry.durationSeconds) : "running"}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete entry"
          className="opacity-0 transition-opacity hover:text-red-600 disabled:opacity-50 group-hover:opacity-100 dark:hover:text-red-400"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function Timesheet() {
  const [date, setDate] = useState(toDateInput(new Date()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { start: dayStart, end: dayEnd, isToday, isFuture } = useMemo(() => dayBounds(date), [date]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    Promise.all([
      api.get<{ projects: Project[] }>("/projects"),
      api.get<{ entries: TimeEntry[] }>(
        `/entries?from=${dayStart.toISOString()}&to=${nextDay.toISOString()}&limit=500`,
      ),
    ])
      .then(([projectsRes, entriesRes]) => {
        setProjects(projectsRes.projects.filter((p) => !p.archived));
        setEntries(entriesRes.entries);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load timesheet"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const segments = useMemo(() => buildSegments(entries, dayStart, dayEnd), [entries, dayStart, dayEnd]);

  const loggedSeconds = useMemo(
    () => entries.reduce((sum, e) => sum + (e.endTime ? e.durationSeconds : Math.round((dayEnd.getTime() - new Date(e.startTime).getTime()) / 1000)), 0),
    [entries, dayEnd],
  );
  const unloggedSeconds = useMemo(
    () => segments.filter((s): s is Extract<Segment, { type: "gap" }> => s.type === "gap").reduce((sum, s) => sum + Math.round((s.end.getTime() - s.start.getTime()) / 1000), 0),
    [segments],
  );

  function handleEntryCreated(entry: TimeEntry) {
    setEntries((prev) => [...prev, entry]);
  }

  function handleEntryDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet"
        actions={
          <>
            <button
              onClick={() => setDate((d) => shiftDate(d, -1))}
              aria-label="Previous day"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              onClick={() => setDate(toDateInput(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              onClick={() => setDate((d) => shiftDate(d, 1))}
              aria-label="Next day"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Create a project before logging time.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {dayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">{formatHoursMinutes(loggedSeconds)}</span> logged
              </span>
              {unloggedSeconds > 0 && (
                <span className="text-slate-400 dark:text-slate-500">
                  {formatHoursMinutes(unloggedSeconds)} unlogged
                </span>
              )}
            </div>
          </div>

          {!isFuture && entries.length > 0 && (
            <div className="border-b border-slate-200 dark:border-slate-800">
              <DayTimelineBar entries={entries} projects={projects} midnight={dayStart} now={isToday ? dayEnd : null} />
            </div>
          )}

          {isFuture ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              This day hasn't happened yet.
            </p>
          ) : segments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <ClockIcon className="h-6 w-6 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Nothing logged yet today.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {segments.map((segment, i) =>
                segment.type === "entry" ? (
                  <EntryRow key={segment.entry._id} entry={segment.entry} projects={projects} onDeleted={handleEntryDeleted} />
                ) : (
                  <GapRow
                    key={`gap-${i}`}
                    gap={segment}
                    date={date}
                    projects={projects}
                    onCreated={handleEntryCreated}
                  />
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
