import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../api/client";
import { MoonIcon, SunIcon } from "../components/icons";
import { Logo } from "../components/Logo";
import { SponsorButton } from "../components/SponsorButton";

export function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 dark:bg-slate-950">
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-card dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6">
          <Logo className="text-2xl" />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Welcome back</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No account?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Register
          </Link>
        </p>
      </form>

      <div className="flex w-full max-w-sm items-center justify-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Free and open for everyone.
        <SponsorButton />
      </div>
    </div>
  );
}
