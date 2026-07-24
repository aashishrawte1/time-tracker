import { useState } from "react";
import { Outlet } from "react-router-dom";
import { MobileTopBar, Sidebar } from "./Sidebar";
import { NetworkSpeedWidget } from "./NetworkSpeedWidget";
import { LofiFooter } from "./LofiFooter";

export function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <MobileTopBar onOpen={() => setMobileNavOpen(true)} />
      <div className="flex flex-1">
        <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-6 py-6 sm:px-8">
            <div className="max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <NetworkSpeedWidget />
      <LofiFooter />
    </div>
  );
}
