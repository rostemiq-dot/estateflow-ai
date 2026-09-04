import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-3 z-[100] flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-5 sm:w-auto">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        <WifiOff size={18} aria-hidden="true" />
      </span>
      <span>You're offline. Changes will sync when the connection returns.</span>
    </div>
  );
}
