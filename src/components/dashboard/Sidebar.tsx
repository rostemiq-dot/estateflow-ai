import { NavLink } from "react-router-dom";
import { dashboardNav } from "../../features/dashboard/dashboard-nav";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
          EstateFlow
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Real Estate OS</h1>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto">
        {dashboardNav.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    [
                      "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-white">EstateFlow AI</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Your smart workspace for properties, clients, and deals.
        </p>
      </div>
    </aside>
  );
}
