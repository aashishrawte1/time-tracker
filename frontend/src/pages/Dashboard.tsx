import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Project, TimeEntry } from "../types";
import { formatDuration, formatHoursMinutes } from "../utils/format";

function projectLabel(entry: TimeEntry, projects: Project[]): { name: string; color: string } {
  if (typeof entry.projectId === "object") {
    return { name: entry.projectId.name, color: entry.projectId.color };
  }
  const project = projects.find((p) => p._id === entry.projectId);
  return { name: project?.name ?? "Unknown", color: project?.color ?? "#94a3b8" };
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const [projectsRes, activeRes, entriesRes] = await Promise.all([
      api.get<{ projects: Project[] }>("/projects"),
      api.get<{ entry: TimeEntry | null }>("/timer/active"),
      api.get<{ entries: TimeEntry[] }>("/entries?limit=10"),
    ]);
    setProjects(projectsRes.projects.filter((p) => !p.archived));
    setActiveEntry(activeRes.entry);
    setRecentEntries(entriesRes.entries);
    if (!selectedProjectId && projectsRes.projects.length > 0) {
      setSelectedProjectId(projectsRes.projects[0]._id);
    }
  }

  useEffect(() => {
    loadAll()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeEntry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const elapsedSeconds = useMemo(() => {
    if (!activeEntry) return 0;
    return Math.floor((now - new Date(activeEntry.startTime).getTime()) / 1000);
  }, [activeEntry, now]);

  async function handleStart() {
    if (!selectedProjectId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ entry: TimeEntry }>("/timer/start", { projectId: selectedProjectId });
      setActiveEntry(res.entry);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/timer/stop");
      setActiveEntry(null);
      const entriesRes = await api.get<{ entries: TimeEntry[] }>("/entries?limit=10");
      setRecentEntries(entriesRes.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="mb-4 text-slate-600">You don't have any projects yet.</p>
        <Link to="/projects" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Create your first project
        </Link>
      </div>
    );
  }

  const activeLabel = activeEntry ? projectLabel(activeEntry, projects) : null;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="rounded-lg border bg-white p-6 text-center">
        {activeEntry && activeLabel ? (
          <>
            <div className="mb-2 flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeLabel.color }} />
              Tracking <span className="font-medium text-slate-700">{activeLabel.name}</span>
            </div>
            <div className="mb-6 font-mono text-5xl font-semibold text-slate-900">
              {formatDuration(elapsedSeconds)}
            </div>
            <button
              onClick={handleStop}
              disabled={busy}
              className="rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Stop
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 font-mono text-5xl font-semibold text-slate-300">00:00:00</div>
            <div className="mx-auto mb-4 max-w-xs">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStart}
              disabled={busy}
              className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Start
            </button>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <h2 className="border-b px-4 py-3 text-sm font-semibold text-slate-700">Recent entries</h2>
        {recentEntries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No time tracked yet.</p>
        ) : (
          <ul className="divide-y">
            {recentEntries.map((entry) => {
              const label = projectLabel(entry, projects);
              return (
                <li key={entry._id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="font-medium text-slate-700">{label.name}</span>
                    <span className="text-slate-400">
                      {new Date(entry.startTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className="font-mono text-slate-600">
                    {entry.endTime ? formatHoursMinutes(entry.durationSeconds) : "running"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
