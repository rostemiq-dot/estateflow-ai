export type NotificationState = {
  key: string;
  signature: string;
  read: boolean;
  dismissed: boolean;
  updatedAt: string;
};
const KEY = "estateflow-notification-state";
export function loadNotificationState(): NotificationState[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v)
      ? v.filter(
          (x): x is NotificationState =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as NotificationState).key === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function saveNotificationState(v: readonly NotificationState[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
export function mergeNotificationState(
  previous: readonly NotificationState[],
  events: readonly { key: string; signature: string }[],
) {
  return events.map((event) => {
    const old = previous.find((x) => x.key === event.key);
    return old && old.signature === event.signature
      ? old
      : {
          ...event,
          read: false,
          dismissed: false,
          updatedAt: new Date().toISOString(),
        };
  });
}
