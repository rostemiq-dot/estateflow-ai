import { CalendarDays, Menu, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    <header className="flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          type="button"
          onClick={onOpenNavigation}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu aria-hidden="true" size={20} />
        </button>

        <div className="min-w-0">
          <p className="hidden text-sm font-medium text-slate-500 sm:block">
            {currentDate}
          </p>
          <h2 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:mt-1 sm:text-2xl">
            {greeting}, Mohammed
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          aria-label="Open viewing calendar"
          type="button"
          onClick={() => navigate("/viewings")}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
        >
          <CalendarDays aria-hidden="true" size={18} />
          <span className="sr-only sm:not-sr-only sm:ms-2 sm:text-sm sm:font-semibold">
            Viewings
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/properties?add=true")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-4"
        >
          <Plus aria-hidden="true" size={18} />
          <span className="hidden sm:inline">Add property</span>
        </button>
      </div>
    </header>
  );
}
