import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api, ApiError } from "../api/client";
import { MoonIcon, SunIcon } from "../components/icons";
import { Logo } from "../components/Logo";
import { SponsorButton } from "../components/SponsorButton";
import type { OrgRole, Organization } from "../types";

export function AcceptInvite() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading, applySession } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!token || !user || status !== "idle") return;
    setStatus("accepting");
    api
      .post<{ token: string; organization: Organization; role: OrgRole }>("/orgs/invite/accept", { token })
      .then((res) => {
        applySession({ token: res.token, user, organization: res.organization, role: res.role });
        setOrgName(res.organization.name);
        setStatus("done");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong");
        setStatus("error");
      });
  }, [token, user, status, applySession]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 dark:bg-slate-950">
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <Logo className="text-3xl" />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Join your team</p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            This invite link is missing its token.
          </div>
        ) : authLoading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : !user ? (
          <div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Log in or create an account using the email address this invite was sent to, then open this link
              again to accept.
            </p>
            <div className="flex gap-2">
              <Link
                to="/login"
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Register
              </Link>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        ) : status === "done" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
            You've joined {orgName}.{" "}
            <Link to="/app" className="font-medium underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">Accepting invite...</p>
        )}
      </div>

      <div className="flex w-full max-w-sm items-center justify-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Free and open for everyone.
        <SponsorButton />
      </div>
    </div>
  );
}
