import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { TeamMember } from "../types";
import { PlusIcon, TrashIcon, UsersIcon } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";

export function Team() {
  const { organization, role } = useAuth();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isOwner = role === "owner";
  const isBusiness = organization?.plan === "business";

  useEffect(() => {
    api
      .get<{ members?: TeamMember[] }>("/orgs/me")
      .then((res) => setMembers(res.members ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team"))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviting(true);
    try {
      const res = await api.post<{ member: TeamMember }>("/orgs/invite", { email: inviteEmail.trim() });
      setMembers((prev) => [...(prev ?? []), res.member]);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Remove ${member.email} from ${organization?.name}?`)) return;
    await api.del(`/orgs/members/${member.id}`);
    setMembers((prev) => (prev ?? []).filter((m) => m.id !== member.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="Manage who has access to your organization's projects." />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!isBusiness && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 text-center shadow-card dark:border-indigo-900 dark:bg-indigo-950/30">
          <UsersIcon className="mx-auto mb-3 h-8 w-8 text-indigo-500 dark:text-indigo-400" />
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">Invite teammates on the Business plan</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {organization?.name} is currently on the Community plan, which is limited to one member. Upgrade to
            Business to invite your team and share projects.
          </p>
        </div>
      )}

      {isBusiness && isOwner && (
        <form
          onSubmit={handleInvite}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Invite a teammate</h2>
          {inviteError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {inviteError}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              {inviting ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      )}

      {isBusiness && isOwner && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            Members
          </h2>
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {(members ?? []).map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{member.email}</span>
                    <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {member.role}
                    </span>
                    {member.status === "invited" && (
                      <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        Invited
                      </span>
                    )}
                  </div>
                  {member.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(member)}
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
