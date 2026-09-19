import { Bell, CheckCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteNotificationFromDatabase,
  listNotificationsFromDatabase,
  markAllNotificationsRead,
  markNotificationRead,
  type DatabaseNotification,
} from "../../features/notifications/notification-api";
import { useToast } from "../ui/ToastProvider";

function hrefFor(notification: DatabaseNotification) {
  if (notification.taskId) return "/tasks";
  if (notification.viewingId) return "/viewings";
  if (notification.dealId) return "/deals";
  if (notification.propertyId) return "/properties";
  if (notification.clientId) return "/clients";
  return "/tasks";
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DatabaseNotification[]>([]);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setItems(await listNotificationsFromDatabase());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const unread = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  async function markRead(item: DatabaseNotification) {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark notification as read.");
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark notifications as read.");
    }
  }

  async function dismiss(item: DatabaseNotification) {
    try {
      await deleteNotificationFromDatabase(item.id);
      setItems((current) => current.filter((value) => value.id !== item.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not dismiss notification.");
    }
  }

  return (
    <div className="relative shrink-0">
      <button type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50">
        <Bell aria-hidden="true" size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-xs font-bold leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 bg-transparent md:hidden" onClick={() => setOpen(false)} />
          <section aria-label="Notifications panel" className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:top-20 sm:w-[min(90vw,380px)] md:absolute md:right-0 md:top-14 md:max-h-[min(32rem,calc(100dvh-6rem))] md:w-[380px]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div><h3 className="font-bold text-slate-950">Notifications</h3><p className="mt-0.5 text-xs text-slate-500">{unread ? `${unread} unread` : "All caught up"}</p></div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Mark all as read" disabled={!unread} onClick={() => void markAllRead()} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"><CheckCheck size={18} /></button>
                <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 md:hidden"><X size={18} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {loading && !items.length && <p className="py-10 text-center text-sm text-slate-500">Loading notifications...</p>}
              {!loading && !items.length && <p className="py-10 text-center text-sm text-slate-500">You are all caught up.</p>}
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className={`flex min-w-0 gap-2 rounded-xl p-3 ${item.readAt ? "bg-slate-50" : "bg-amber-50"}`}>
                    <button type="button" onClick={() => { void markRead(item); setOpen(false); navigate(hrefFor(item)); }} className="min-w-0 flex-1 text-left">
                      <p className="break-words text-sm font-bold text-slate-900">{item.title}</p>
                      {item.message && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{item.message}</p>}
                      <p className="mt-2 text-[11px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</p>
                    </button>
                    <button type="button" aria-label="Dismiss notification" onClick={() => void dismiss(item)} className="grid min-h-10 min-w-10 shrink-0 place-items-center self-start rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
