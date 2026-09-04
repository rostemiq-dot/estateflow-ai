import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  applySettingsTheme,
  loadSettings,
  SETTINGS_UPDATED_EVENT,
} from "../../features/settings/settings-storage";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OfflineIndicator } from "../ui/OfflineIndicator";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const syncWorkspaceSettings = () => {
      const settings = loadSettings();
      applySettingsTheme(settings);
      const agencyName = settings.agencyName.trim() || "EstateFlow";
      document.title = `${agencyName} | Real Estate OS`;
    };

    syncWorkspaceSettings();
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncWorkspaceSettings);
    window.addEventListener("storage", syncWorkspaceSettings);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, syncWorkspaceSettings);
      window.removeEventListener("storage", syncWorkspaceSettings);
    };
  }, []);

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

  useEffect(() => {
    setIsNavigationOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

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
        <main key={location.pathname} className="page-enter p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <OfflineIndicator />
    </div>
  );
}
