import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  useEffect(() => {
    if (!isNavigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNavigationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isNavigationOpen]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {isNavigationOpen && (
        <button
          aria-label="Close navigation"
          type="button"
          onClick={() => setIsNavigationOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar
        isMobileOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <Topbar onOpenNavigation={() => setIsNavigationOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
