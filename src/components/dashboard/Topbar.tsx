import { CalendarDays, LogOut, Menu, Plus, UserCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../../features/auth/AuthContext";

type TopbarProps = {
  onOpenNavigation: () => void;
};

export function Topbar({ onOpenNavigation }: TopbarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
      setAccountOpen(false);
    }
  }

  const email = user?.email ?? "Account";

  return (
    <header className="relative flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
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
        <NotificationBell />
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

        <div className="relative">
          <button
            type="button"
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 sm:min-w-0 sm:px-3"
          >
            <UserCircle aria-hidden="true" size={20} />
            <span className="hidden max-w-32 truncate sm:ms-2 sm:block sm:text-sm sm:font-semibold">
              Account
            </span>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-950">Signed in</p>
                <p className="mt-1 truncate text-xs text-slate-500" title={email}>
                  {email}
                </p>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut aria-hidden="true" size={18} />
                {signingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
