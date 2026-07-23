import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { BarChartIcon, ClockIcon, FolderIcon, LogOutIcon, MoonIcon, SunIcon, TableIcon } from "./icons";
import { Logo } from "./Logo";
import { SponsorButton } from "./SponsorButton";
import { NetworkSpeedWidget } from "./NetworkSpeedWidget";
import { LofiFooter } from "./LofiFooter";

const navItems = [
  { to: "/", end: true, label: "Dashboard", icon: ClockIcon },
  { to: "/projects", end: false, label: "Projects", icon: FolderIcon },
  { to: "/summary", end: false, label: "Summary", icon: BarChartIcon },
  { to: "/timesheet", end: false, label: "Timesheet", icon: TableIcon },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60">
        <div className="flex w-full items-center justify-between gap-6 px-8 py-3.5">
          <div className="flex items-center gap-8">
            <Logo className="text-xl" />
            <nav className="flex gap-1.5">
              {navItems.map(({ to, end, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={end} className={navLinkClass}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <SponsorButton className="hidden sm:flex" />

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex dark:border-slate-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user?.name}</span>
            </div>

            <button
              onClick={logout}
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-6">
        <Outlet />
      </main>
      <NetworkSpeedWidget />
      <LofiFooter />
    </div>
  );
}
