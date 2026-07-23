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
  const navigate = useNavigate(),
    [open, setOpen] = useState(false);
  const [events] = useState(() => {
    const clients = loadClients(),
      properties = loadProperties();
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
    ),
    unread = visible.filter(
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
    <div className="relative">
      <button
        aria-label={`Notifications, ${unread} unread`}
        onClick={() => setOpen(!open)}
        className="relative grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-[min(90vw,380px)] rounded-2xl border bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Notifications</h3>
            <button
              aria-label="Mark all as read"
              onClick={() => {
                const next = state.map((s) => ({ ...s, read: true }));
                saveNotificationState(next);
                setState(next);
              }}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
            >
              <CheckCheck size={18} />
            </button>
          </div>
          <div className="mt-2 max-h-96 space-y-2 overflow-auto">
            {visible.map((e) => (
              <div
                key={e.key}
                className="flex gap-2 rounded-xl bg-slate-50 p-3"
              >
                <button
                  onClick={() => {
                    update(e.key, { read: true });
                    setOpen(false);
                    navigate(e.href);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-bold">{e.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {e.detail}
                  </p>
                </button>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => update(e.key, { dismissed: true, read: true })}
                  className="grid min-h-11 min-w-11 place-items-center"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {!visible.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                You are all caught up.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
