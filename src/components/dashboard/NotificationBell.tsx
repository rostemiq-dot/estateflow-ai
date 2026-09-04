import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadClients } from "../../features/clients/client-storage";
import { loadContracts } from "../../features/contracts/contract-storage";
import { loadDeals } from "../../features/deals/deal-storage";
import { buildNotifications } from "../../features/notifications/notification-utils";
import {
  loadNotificationState,
  mergeNotificationState,
  saveNotificationState,
} from "../../features/notifications/notification-storage";
import { loadProperties } from "../../features/properties/property-storage";
import { loadTasks } from "../../features/tasks/task-storage";
import { loadViewings } from "../../features/viewings/viewing-storage";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [events] = useState(() => {
    const clients = loadClients();
    const properties = loadProperties();
    return buildNotifications(
      loadTasks(),
      loadViewings(properties),
      loadDeals(clients, properties),
      loadContracts(),
    );
  });
  const [state, setState] = useState(() =>
    mergeNotificationState(loadNotificationState(), events),
  );

  const visible = events.filter(
    (e) => !state.find((s) => s.key === e.key)?.dismissed,
  );
  const unread = visible.filter(
    (e) => !state.find((s) => s.key === e.key)?.read,
  ).length;

  const update = (
    key: string,
    patch: { read?: boolean; dismissed?: boolean },
  ) => {
    const next = state.map((s) => (s.key === key ? { ...s, ...patch } : s));
    saveNotificationState(next);
    setState(next);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
      >
        <Bell aria-hidden="true" size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-xs font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default bg-transparent md:hidden"
            onClick={() => setOpen(false)}
          />
          <section
            aria-label="Notifications panel"
            className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:top-20 sm:w-[min(90vw,380px)] md:absolute md:right-0 md:top-14 md:max-h-[min(32rem,calc(100dvh-6rem))] md:w-[380px]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="font-bold text-slate-950">Notifications</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {unread ? `${unread} unread` : "All caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mark all as read"
                  onClick={() => {
                    const next = state.map((s) => ({ ...s, read: true }));
                    saveNotificationState(next);
                    setState(next);
                  }}
                  className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                >
                  <CheckCheck aria-hidden="true" size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 md:hidden"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <div className="space-y-2">
                {visible.map((e) => (
                  <div
                    key={e.key}
                    className="flex min-w-0 gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        update(e.key, { read: true });
                        setOpen(false);
                        navigate(e.href);
                      }}
                      className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <p className="break-words text-sm font-bold text-slate-900">
                        {e.title}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                        {e.detail}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      onClick={() => update(e.key, { dismissed: true, read: true })}
                      className="grid min-h-11 min-w-11 shrink-0 place-items-center self-start rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                      <X aria-hidden="true" size={16} />
                    </button>
                  </div>
                ))}
                {!visible.length && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    You are all caught up.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
