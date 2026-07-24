import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  BarChartIcon,
  ClockIcon,
  FolderIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  TableIcon,
  UsersIcon,
  XIcon,
} from "./icons";
import { Logo } from "./Logo";
import { SponsorButton } from "./SponsorButton";

const navItems = [
  { to: "/app", end: true, label: "Dashboard", icon: ClockIcon },
  { to: "/app/projects", end: false, label: "Projects", icon: FolderIcon },
  { to: "/app/summary", end: false, label: "Summary", icon: BarChartIcon },
  { to: "/app/timesheet", end: false, label: "Timesheet", icon: TableIcon },
  { to: "/app/team", end: false, label: "Team", icon: UsersIcon },
];

const MOBILE_TRIGGER_ID = "mobile-nav-trigger";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
  }`;

function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-full min-w-[14rem] rounded-lg border border-slate-200 bg-white p-1.5 shadow-card dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <SponsorButton variant="menu" />

          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <LogOutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {user?.name?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
        </span>
      </button>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Logo className="text-xl" />

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={onNavigate}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <UserMenu />
    </div>
  );
}

export function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <Logo className="text-xl" />
      <button
        id={MOBILE_TRIGGER_ID}
        onClick={onOpen}
        aria-controls="mobile-sidebar-panel"
        aria-label="Open navigation menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <MenuIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMobileOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      panelRef.current?.focus();
    } else {
      document.getElementById(MOBILE_TRIGGER_ID)?.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 sm:block dark:border-slate-800">
        <div style={{ paddingBottom: "var(--footer-height, 52px)" }} className="h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        onClick={() => onMobileOpenChange(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] transition-opacity duration-300 sm:hidden dark:bg-black/50 ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id="mobile-sidebar-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-xs transform flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:hidden dark:border-slate-800 dark:bg-slate-900 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end p-2">
          <button
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
        </div>
      </div>
    </>
  );
}
