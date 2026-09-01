import type { Viewing } from "./viewing-data";

export function getViewingTimestamp(viewing: Pick<Viewing, "date" | "time">) {
  const timestamp = Date.parse(`${viewing.date}T${viewing.time}:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortViewings(viewings: readonly Viewing[]) {
  return [...viewings].sort(
    (first, second) => getViewingTimestamp(first) - getViewingTimestamp(second),
  );
}

export function getUpcomingViewings(
  viewings: readonly Viewing[],
  now = new Date(),
) {
  return sortViewings(viewings).filter(
    (viewing) =>
      viewing.status !== "Cancelled" &&
      viewing.status !== "Completed" &&
      getViewingTimestamp(viewing) >= now.getTime(),
  );
}

export function getViewingsForClient(
  viewings: readonly Viewing[],
  clientId: string,
) {
  return sortViewings(
    viewings.filter((viewing) => viewing.clientId === clientId),
  );
}

export function getViewingsForProperty(
  viewings: readonly Viewing[],
  propertyId: string,
) {
  return sortViewings(
    viewings.filter((viewing) => viewing.propertyId === propertyId),
  );
}

export function isViewingToday(viewing: Viewing, now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return viewing.date === `${year}-${month}-${day}`;
}

export function formatViewingDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

export function formatViewingTime(time: string) {
  const parsedTime = new Date(`2026-01-01T${time}:00`);

  if (Number.isNaN(parsedTime.getTime())) {
    return time;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedTime);
}
