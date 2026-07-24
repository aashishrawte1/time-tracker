import { FormEvent, MouseEvent, ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api, ApiError } from "../api/client";
import { Logo } from "../components/Logo";
import { BarChartIcon, CheckIcon, ClockIcon, FolderIcon, MoonIcon, SunIcon, TableIcon, XIcon } from "../components/icons";

const NAVIGATE_DELAY_MS = 450;

function LoadingLink({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setTimeout(() => navigate(to), NAVIGATE_DELAY_MS);
  }

  return (
    <a href={to} onClick={handleClick} aria-busy={loading} className={className}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          Loading
        </span>
      ) : (
        children
      )}
    </a>
  );
}

const FEATURES = [
  {
    icon: ClockIcon,
    title: "One-click time tracking",
    description: "Start and stop timers per project, with automatic duration tracking and a live running clock.",
  },
  {
    icon: TableIcon,
    title: "Visual timesheet",
    description:
      "See your whole day as a colored timeline, spot unlogged gaps at a glance, and fill them in without leaving the page.",
  },
  {
    icon: BarChartIcon,
    title: "Daily, weekly & monthly summaries",
    description: "Breakdown of time spent per project, with totals and percentages for any range you pick.",
  },
  {
    icon: FolderIcon,
    title: "Unlimited projects",
    description: "Color-code as many projects as you need, archive old ones, and keep every entry organized.",
  },
];

const COMMUNITY_FEATURES = [
  "Free forever for individual use",
  "Unlimited projects & time entries",
  "Timesheet, summaries & timers",
  "Manual time entry & gap-filling",
  "Email support",
];

const BUSINESS_FEATURES = [
  "Everything in Community",
  "Multiple team members & shared projects",
  "Team & organization management",
  "Single sign-on (SSO)",
  "Priority support & onboarding",
];

function NavThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}

function MockTimelineCard() {
  const blocks = [
    { left: 8, width: 14, color: "#6366f1" },
    { left: 24, width: 8, color: "#f59e0b" },
    { left: 44, width: 20, color: "#6366f1" },
    { left: 68, width: 6, color: "#10b981" },
  ];
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Thursday, July 23</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">5h 40m logged</p>
        </div>
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          TIMER
        </span>
      </div>
      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{ left: `${b.left}%`, width: `${b.width}%`, backgroundColor: b.color }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>12A</span>
        <span>6A</span>
        <span>12P</span>
        <span>6P</span>
        <span>12A</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Deep Work
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Admin
        </span>
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function ContactSalesModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/leads", { name, email, company, teamSize, message });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] dark:bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contact sales"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact sales</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
            Thanks — we'll be in touch soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={fieldClass}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              className={fieldClass}
            />
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className={fieldClass}
            />
            <input
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              placeholder="Team size (e.g. 10-50)"
              className={fieldClass}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What are you looking for? (optional)"
              rows={3}
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  features,
  cta,
  ctaTo,
  ctaOnClick,
  highlighted,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaTo?: string;
  ctaOnClick?: () => void;
  highlighted?: boolean;
}) {
  const ctaClass = `rounded-lg px-4 py-2.5 text-center text-sm font-medium shadow-sm transition-colors ${
    highlighted
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

  return (
    <div
      className={`flex flex-1 flex-col rounded-2xl border p-6 shadow-card ${
        highlighted
          ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{name}</h3>
        {highlighted && (
          <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Recommended
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{tagline}</p>
      <p className="mb-5 text-3xl font-bold text-slate-900 dark:text-white">{price}</p>

      <ul className="mb-6 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            {f}
          </li>
        ))}
      </ul>

      {ctaTo ? (
        <LoadingLink to={ctaTo} className={ctaClass}>
          {cta}
        </LoadingLink>
      ) : (
        <button onClick={ctaOnClick} className={ctaClass}>
          {cta}
        </button>
      )}
    </div>
  );
}

export function Landing() {
  const { user } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {contactOpen && <ContactSalesModal onClose={() => setContactOpen(false)} />}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="rounded-lg"
          >
            <Logo className="text-xl" />
          </button>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white">
              Features
            </a>
            <a href="#plans" className="hover:text-slate-900 dark:hover:text-white">
              Community vs Business
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <NavThemeToggle />
            {user ? (
              <LoadingLink
                to="/app"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Go to Dashboard
              </LoadingLink>
            ) : (
              <>
                <LoadingLink
                  to="/login"
                  className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:block dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Log in
                </LoadingLink>
                <LoadingLink
                  to="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Get started free
                </LoadingLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
          <span className="mb-4 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            Free for individuals. Built for teams.
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Time tracking that gets out of your way
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Track time against your projects, see your day as a visual timesheet, and never lose an
            hour to a forgotten timer again. Free for individual use, with a Business plan when your
            whole team needs it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LoadingLink
              to={user ? "/app" : "/register"}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {user ? "Go to Dashboard" : "Get started free"}
            </LoadingLink>
            <a
              href="#plans"
              className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              See plans
            </a>
          </div>

          <div className="mt-16 flex w-full justify-center">
            <MockTimelineCard />
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-white">
              Everything you need to track time, nothing you don't
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Community or Business</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Free for individuals, paid plans for teams and companies. Same product — upgrade whenever
              you're ready.
            </p>
          </div>

          <div className="mx-auto mt-10 flex max-w-4xl flex-col gap-6 px-6 sm:flex-row">
            <PlanCard
              name="Community"
              price="Free"
              tagline="For individuals tracking their own time."
              features={COMMUNITY_FEATURES}
              cta="Get started free"
              ctaTo="/register"
            />
            <PlanCard
              name="Business"
              price="Contact us"
              tagline="Team management and admin controls for companies."
              features={BUSINESS_FEATURES}
              cta="Contact sales"
              ctaOnClick={() => setContactOpen(true)}
              highlighted
            />
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Ready to track your time?</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Create a free account and start your first timer in under a minute.
            </p>
            <LoadingLink
              to={user ? "/app" : "/register"}
              className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {user ? "Go to Dashboard" : "Get started free"}
            </LoadingLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-10 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="rounded-lg"
          >
            <Logo className="text-lg" />
          </button>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <LoadingLink to="/login" className="hover:text-slate-900 dark:hover:text-white">
              Log in
            </LoadingLink>
            <button onClick={() => setContactOpen(true)} className="hover:text-slate-900 dark:hover:text-white">
              Contact sales
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} timetrack. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
