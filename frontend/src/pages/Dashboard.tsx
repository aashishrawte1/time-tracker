import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Project, TimeEntry } from "../types";
import { formatDuration, formatHoursMinutes } from "../utils/format";
import { ChevronRightIcon, ClockIcon, FolderIcon, GaugeIcon, HistoryIcon, PlusIcon, XIcon } from "../components/icons";

function projectLabel(entry: TimeEntry, projects: Project[]): { name: string; color: string } {
  if (typeof entry.projectId === "object") {
    return { name: entry.projectId.name, color: entry.projectId.color };
  }
  const project = projects.find((p) => p._id === entry.projectId);
  return { name: project?.name ?? "Unknown", color: project?.color ?? "#94a3b8" };
}

function projectIdOf(entry: TimeEntry): string {
  return typeof entry.projectId === "object" ? entry.projectId._id : entry.projectId;
}

// If the tab or server dies mid-request, a Stop click must not silently
// vanish. The intended stop moment is captured up front and stashed here
// *before* the network call, so a page reload (or the retry loop below)
// can still finish the stop with the original timestamp — never "now".
const PENDING_STOPS_KEY = "time-tracker-pending-stops";

interface PendingStop {
  entryId: string;
  endTime: string;
}

function readPendingStops(): PendingStop[] {
  try {
    const raw = localStorage.getItem(PENDING_STOPS_KEY);
    return raw ? (JSON.parse(raw) as PendingStop[]) : [];
  } catch {
    return [];
  }
}

function writePendingStops(stops: PendingStop[]): void {
  try {
    localStorage.setItem(PENDING_STOPS_KEY, JSON.stringify(stops));
  } catch {
    // localStorage unavailable (e.g. private mode) — the request itself still proceeds.
  }
}

function addPendingStop(stop: PendingStop): void {
  writePendingStops([...readPendingStops().filter((s) => s.entryId !== stop.entryId), stop]);
}

function removePendingStop(entryId: string): void {
  writePendingStops(readPendingStops().filter((s) => s.entryId !== entryId));
}

type DisplayMode = "digital" | "analog";

function handRotation(elapsedSeconds: number): { hourDeg: number; minuteDeg: number; secondDeg: number } {
  const seconds = elapsedSeconds % 60;
  const minutes = Math.floor(elapsedSeconds / 60) % 60;
  const hours = Math.floor(elapsedSeconds / 3600) % 12;

  return {
    hourDeg: hours * 30 + minutes * 0.5,
    minuteDeg: minutes * 6 + seconds * 0.1,
    secondDeg: seconds * 6,
  };
}

function AnalogClock({ elapsedSeconds, color }: { elapsedSeconds: number; color: string }) {
  const { hourDeg, minuteDeg, secondDeg } = handRotation(elapsedSeconds);
  const ticks = Array.from({ length: 12 }, (_, i) => i);

  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-40 w-40">
      <circle
        cx="50"
        cy="50"
        r="48"
        strokeWidth="2"
        className="fill-white stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600"
      />
      {ticks.map((i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 50 + 42 * Math.sin(angle);
        const y1 = 50 - 42 * Math.cos(angle);
        const x2 = 50 + 46 * Math.sin(angle);
        const y2 = 50 - 46 * Math.cos(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth="1.5"
            className="stroke-slate-400 dark:stroke-slate-500"
          />
        );
      })}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="26"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-slate-700 dark:stroke-slate-200"
        transform={`rotate(${hourDeg} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="18"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-slate-700 dark:stroke-slate-200"
        transform={`rotate(${minuteDeg} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="14"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        transform={`rotate(${secondDeg} 50 50)`}
      />
      <circle cx="50" cy="50" r="2.5" className="fill-slate-700 dark:fill-slate-200" />
    </svg>
  );
}

function ActiveTimerCard({
  entry,
  projects,
  now,
  busy,
  retrying,
  onStop,
}: {
  entry: TimeEntry;
  projects: Project[];
  now: number;
  busy: boolean;
  retrying: boolean;
  onStop: (entryId: string) => void;
}) {
  const [mode, setMode] = useState<DisplayMode>("digital");
  const label = projectLabel(entry, projects);
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(entry.startTime).getTime()) / 1000));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: label.color }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
        </span>
        Tracking <span className="font-medium text-slate-700 dark:text-slate-200">{label.name}</span>
      </div>

      {retrying && (
        <div className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          Couldn't reach the server — retrying to save your stop time…
        </div>
      )}

      {mode === "digital" ? (
        <div className="mb-6 font-mono text-5xl font-semibold tabular-nums text-slate-900 dark:text-white">
          {formatDuration(elapsedSeconds)}
        </div>
      ) : (
        <div className="mb-6">
          <AnalogClock elapsedSeconds={elapsedSeconds} color={label.color} />
          <div className="mt-2 font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
            {formatDuration(elapsedSeconds)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setMode(mode === "digital" ? "analog" : "digital")}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <GaugeIcon className="h-3.5 w-3.5" />
          {mode === "digital" ? "Analog view" : "Digital view"}
        </button>
        <button
          onClick={() => onStop(entry._id)}
          disabled={busy || retrying}
          className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {retrying ? "Retrying..." : "Stop"}
        </button>
      </div>
    </div>
  );
}

function toDateInputValue(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function toTimeInputValue(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function ManualEntryForm({
  projects,
  onCreated,
}: {
  projects: Project[];
  onCreated: (entry: TimeEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?._id ?? "");
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [date, setDate] = useState(toDateInputValue(now));
  const [startTime, setStartTime] = useState(toTimeInputValue(hourAgo));
  const [endTime, setEndTime] = useState(toTimeInputValue(now));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setNote("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log time");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <PlusIcon className="h-4 w-4" />
        Log time manually
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Log time manually</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Start</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">End</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !projectId}
        className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save entry"}
      </button>
    </form>
  );
}

function RecentEntriesDrawer({
  open,
  onClose,
  entries,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  entries: TimeEntry[];
  projects: Project[];
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] transition-opacity duration-300 dark:bg-black/50 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-label="Recent entries"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm transform flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent entries</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No time tracked yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {entries.map((entry) => {
                const label = projectLabel(entry, projects);
                return (
                  <li
                    key={entry._id}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-700 dark:text-slate-200">{label.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(entry.startTime).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {entry.endTime ? formatHoursMinutes(entry.durationSeconds) : "running"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [pendingStopIds, setPendingStopIds] = useState<Set<string>>(
    () => new Set(readPendingStops().map((s) => s.entryId)),
  );

  async function loadAll() {
    const [projectsRes, activeRes, entriesRes] = await Promise.all([
      api.get<{ projects: Project[] }>("/projects"),
      api.get<{ entries: TimeEntry[] }>("/timer/active"),
      api.get<{ entries: TimeEntry[] }>("/entries?limit=10"),
    ]);
    setProjects(projectsRes.projects.filter((p) => !p.archived));
    setActiveEntries(activeRes.entries);
    setRecentEntries(entriesRes.entries);
    if (!selectedProjectId && projectsRes.projects.length > 0) {
      setSelectedProjectId(projectsRes.projects[0]._id);
    }
  }

  useEffect(() => {
    loadAll()
      .then(() => flushPendingStops())
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeEntries.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeEntries.length]);

  // A stop that failed to save (dead server, dropped connection) keeps
  // retrying on its own — whenever the browser comes back online, and as a
  // periodic fallback — so the user never has to notice or intervene.
  useEffect(() => {
    function onOnline() {
      flushPendingStops();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingStopIds.size === 0) return;
    const id = setInterval(() => flushPendingStops(), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStopIds.size]);

  const availableProjects = useMemo(() => {
    const runningProjectIds = new Set(activeEntries.map(projectIdOf));
    return projects.filter((p) => !runningProjectIds.has(p._id));
  }, [projects, activeEntries]);

  useEffect(() => {
    if (availableProjects.length === 0) {
      setSelectedProjectId("");
      return;
    }
    if (!availableProjects.some((p) => p._id === selectedProjectId)) {
      setSelectedProjectId(availableProjects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableProjects]);

  async function handleStart() {
    if (!selectedProjectId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ entry: TimeEntry }>("/timer/start", { projectId: selectedProjectId });
      setActiveEntries((prev) => [...prev, res.entry]);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setBusy(false);
    }
  }

  async function attemptStop(entryId: string, endTime: string): Promise<boolean> {
    try {
      await api.post("/timer/stop", { entryId, endTime });
      removePendingStop(entryId);
      return true;
    } catch (err) {
      // A 409 here means the entry is no longer running — most likely this
      // exact stop already landed on an earlier attempt and only the
      // response was lost. Treat it as resolved rather than retrying forever.
      if (err instanceof ApiError && err.status === 409) {
        removePendingStop(entryId);
        return true;
      }
      return false;
    }
  }

  async function refreshRecentEntries() {
    try {
      const entriesRes = await api.get<{ entries: TimeEntry[] }>("/entries?limit=10");
      setRecentEntries(entriesRes.entries);
    } catch {
      // Non-critical: the stop itself already succeeded.
    }
  }

  async function flushPendingStops() {
    const stops = readPendingStops();
    if (stops.length === 0) return;

    const resolvedIds: string[] = [];
    for (const stop of stops) {
      if (await attemptStop(stop.entryId, stop.endTime)) resolvedIds.push(stop.entryId);
    }

    if (resolvedIds.length > 0) {
      setPendingStopIds((prev) => {
        const next = new Set(prev);
        resolvedIds.forEach((id) => next.delete(id));
        return next;
      });
      setActiveEntries((prev) => prev.filter((e) => !resolvedIds.includes(e._id)));
      await refreshRecentEntries();
    }
  }

  async function handleStop(entryId: string) {
    setError(null);
    // Capture the stop moment before the network call and persist it
    // immediately, so a crash or dropped connection right after this click
    // can't lose the real stop time — only how long it takes to actually save.
    const endTime = new Date().toISOString();
    addPendingStop({ entryId, endTime });
    setPendingStopIds((prev) => new Set(prev).add(entryId));
    setBusy(true);
    const ok = await attemptStop(entryId, endTime);
    setBusy(false);

    if (ok) {
      setPendingStopIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      setActiveEntries((prev) => prev.filter((e) => e._id !== entryId));
      await refreshRecentEntries();
    } else {
      setError("Couldn't reach the server. Your stop time was saved on this device and will keep retrying.");
    }
  }

  function handleManualEntryCreated(entry: TimeEntry) {
    setRecentEntries((prev) =>
      [entry, ...prev].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0, 10),
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
        <FolderIcon className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
        <p className="mb-4 text-slate-600 dark:text-slate-300">You don't have any projects yet.</p>
        <Link
          to="/projects"
          className="inline-block rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Create your first project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {activeEntries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeEntries.map((entry) => (
            <ActiveTimerCard
              key={entry._id}
              entry={entry}
              projects={projects}
              now={now}
              busy={busy}
              retrying={pendingStopIds.has(entry._id)}
              onStop={handleStop}
            />
          ))}
        </div>
      )}

      {availableProjects.length > 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-center gap-2 font-mono text-5xl font-semibold tabular-nums text-slate-200 dark:text-slate-700">
            <ClockIcon className="h-8 w-8" />
            00:00:00
          </div>
          <div className="mx-auto mb-4 max-w-xs">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {availableProjects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleStart}
            disabled={busy}
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            Start{activeEntries.length > 0 ? " another" : ""}
          </button>
        </div>
      )}

      <div className="mx-auto w-full max-w-md">
        <ManualEntryForm projects={projects} onCreated={handleManualEntryCreated} />
      </div>

      <button
        onClick={() => setEntriesOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-card transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <HistoryIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          Recent entries
          {recentEntries.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {recentEntries.length}
            </span>
          )}
        </span>
        <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>

      <RecentEntriesDrawer
        open={entriesOpen}
        onClose={() => setEntriesOpen(false)}
        entries={recentEntries}
        projects={projects}
      />
    </div>
  );
}
