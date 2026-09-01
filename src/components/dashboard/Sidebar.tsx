import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { dashboardNav } from "../../features/dashboard/dashboard-nav";
import {
  loadSettings,
  saveSettings,
} from "../../features/settings/settings-storage";

type SidebarProps = {
  isMobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(
    () => loadSettings().sidebarCollapsed,
  );
  const [agencyName, setAgencyName] = useState(() => {
    const s = loadSettings();
    return s.agencyName?.trim() || "Real Estate OS";
  });

  useEffect(() => {
    const updateAgencyName = () => {
      const s = loadSettings();
      setAgencyName(s.agencyName?.trim() || "Real Estate OS");
    };

    window.addEventListener("estateflow_settings_updated", updateAgencyName);
    window.addEventListener("storage", updateAgencyName);

    return () => {
      window.removeEventListener("estateflow_settings_updated", updateAgencyName);
      window.removeEventListener("storage", updateAgencyName);
    };
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    const settings = loadSettings();
    saveSettings({ ...settings, sidebarCollapsed: next });
  }

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 px-5 py-6 shadow-2xl transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none ${collapsed ? "lg:w-20 lg:px-3" : "lg:w-72"} ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className={collapsed ? "lg:hidden" : ""}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
            EstateFlow
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white truncate max-w-[200px]" title={agencyName}>
            {agencyName}
          </h1>
        </div>

        <button
          aria-label="Close navigation"
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mb-4 hidden min-h-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white lg:flex"
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>

      <nav className="sidebar-scroll min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain">
        {dashboardNav.map((group) => (
          <div key={group.label}>
            <p
              className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${collapsed ? "lg:sr-only" : ""}`}
            >
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/"}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    [
                      `flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${collapsed ? "lg:justify-center lg:px-1" : ""}`,
                      isActive
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    ].join(" ")
                  }
                >
                  <span className={collapsed ? "lg:sr-only" : ""}>
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`mt-5 shrink-0 rounded-2xl border border-slate-800 bg-slate-900 p-4 ${collapsed ? "lg:hidden" : ""}`}
      >
        <p className="text-sm font-semibold text-white truncate">
          {agencyName} AI
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Your smart workspace for properties, clients, and deals.
        </p>
      </div>
    </aside>
  );
}