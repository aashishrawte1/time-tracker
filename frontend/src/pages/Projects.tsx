import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Project } from "../types";

const COLOR_PALETTE = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ projects: Project[] }>("/projects")
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ project: Project }>("/projects", { name, color });
      setProjects((prev) => [...prev, res.project]);
      setName("");
      setColor(COLOR_PALETTE[(projects.length + 1) % COLOR_PALETTE.length]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArchive(project: Project) {
    const res = await api.put<{ project: Project }>(`/projects/${project._id}`, { archived: !project.archived });
    setProjects((prev) => prev.map((p) => (p._id === project._id ? res.project : p)));
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}" and all its tracked time? This can't be undone.`)) return;
    await api.del(`/projects/${project._id}`);
    setProjects((prev) => prev.filter((p) => p._id !== project._id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">New project</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client A - Website"
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Color</label>
            <div className="flex gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add project
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white">
        <h2 className="border-b px-4 py-3 text-sm font-semibold text-slate-700">Your projects</h2>
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No projects yet. Create one above.</p>
        ) : (
          <ul className="divide-y">
            {projects.map((project) => (
              <li key={project._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className={project.archived ? "text-slate-400 line-through" : "font-medium text-slate-700"}>
                    {project.name}
                  </span>
                  {project.archived && <span className="text-xs text-slate-400">(archived)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleArchive(project)}
                    className="rounded-md border px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {project.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
