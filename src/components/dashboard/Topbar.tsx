import { CalendarDays, Menu, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

type TopbarProps = {
  onOpenNavigation: () => void;
};

export function Topbar({ onOpenNavigation }: TopbarProps) {
  const navigate = useNavigate();
  const currentDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 py-2.5 sm:px-6 lg:px-8 backdrop-blur-md transition-colors">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          aria-label="Open navigation"
          type="button"
          onClick={onOpenNavigation}
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 lg:hidden"
        >
          <Menu aria-hidden="true" size={20} />
        </button>

        <div className="min-w-0">
          <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
            {currentDate}
          </p>
          <h2 className="truncate text-base font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-xl">
            {greeting}, Mohammed
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <NotificationBell />

        <button
          aria-label="Open viewing calendar"
          type="button"
          onClick={() => navigate("/viewings")}
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 sm:px-3"
        >
          <CalendarDays aria-hidden="true" size={18} />
          <span className="hidden sm:inline sm:ms-2 sm:text-sm sm:font-semibold">
            Viewings
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/properties?add=true")}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 text-xs sm:text-sm font-bold transition shadow-sm"
        >
          <Plus aria-hidden="true" size={18} />
          <span className="hidden sm:inline">Add property</span>
        </button>
      </div>
    </header>
  );
}