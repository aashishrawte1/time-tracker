import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Project } from "../types";
import { ArchiveIcon, FolderIcon, PlusIcon, TrashIcon } from "../components/icons";

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
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">New project</h2>
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client A - Website"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Color</label>
            <div className="flex gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Choose color ${c}`}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Add project
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          Your projects
        </h2>
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <FolderIcon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No projects yet. Create one above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {projects.map((project) => (
              <li
                key={project._id}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span
                    className={
                      project.archived
                        ? "text-slate-400 line-through dark:text-slate-600"
                        : "font-medium text-slate-700 dark:text-slate-200"
                    }
                  >
                    {project.name}
                  </span>
                  {project.archived && (
                    <span className="text-xs text-slate-400 dark:text-slate-600">(archived)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleArchive(project)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ArchiveIcon className="h-3.5 w-3.5" />
                    {project.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
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
