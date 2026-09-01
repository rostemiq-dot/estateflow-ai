import type { Contract } from "../contracts/contract-data";
import type { Deal } from "../deals/deal-data";
import { derivePaymentStatus } from "../deals/deal-utils";
import type { Task } from "../tasks/task-data";
import { taskTiming } from "../tasks/task-storage";
import type { Viewing } from "../viewings/viewing-data";
export type NotificationEvent = {
  key: string;
  signature: string;
  title: string;
  detail: string;
  href: string;
};
export function buildNotifications(
  tasks: readonly Task[],
  viewings: readonly Viewing[],
  deals: readonly Deal[],
  contracts: readonly Contract[],
  now = new Date(),
): NotificationEvent[] {
  const events: NotificationEvent[] = [];
  tasks
    .filter((t) => !t.archived && taskTiming(t, now).overdue)
    .forEach((t) =>
      events.push({
        key: `task-overdue:${t.id}`,
        signature: t.updatedAt,
        title: "Overdue task",
        detail: t.title,
        href: "/tasks",
      }),
    );
  tasks
    .filter(
      (t) =>
        !t.archived &&
        taskTiming(t, now).today &&
        !["Completed", "Cancelled"].includes(t.status),
    )
    .forEach((t) =>
      events.push({
        key: `task-today:${t.id}`,
        signature: t.updatedAt,
        title: "Task due today",
        detail: t.title,
        href: "/tasks",
      }),
    );
  viewings
    .filter((v) => ["Scheduled", "Confirmed"].includes(v.status))
    .forEach((v) =>
      events.push({
        key: `viewing:${v.id}`,
        signature: v.updatedAt,
        title: "Upcoming viewing",
        detail: `${v.date} at ${v.time}`,
        href: "/viewings",
      }),
    );
  deals.forEach((d) => {
    d.offers
      .filter((o) => o.status === "Sent" && o.expirationDate)
      .forEach((o) =>
        events.push({
          key: `offer:${o.id}`,
          signature: o.updatedAt,
          title: "Offer awaiting response",
          detail: `Expires ${o.expirationDate}`,
          href: "/deals",
        }),
      );
    d.payments
      .filter((p) => derivePaymentStatus(p, now) === "Overdue")
      .forEach((p) =>
        events.push({
          key: `payment:${p.id}`,
          signature: p.updatedAt,
          title: "Overdue payment",
          detail: p.label,
          href: "/deals",
        }),
      );
  });
  contracts
    .filter((c) => ["Ready to Sign", "Under Review"].includes(c.status))
    .forEach((c) =>
      events.push({
        key: `contract:${c.id}`,
        signature: c.updatedAt,
        title: "Unsigned contract",
        detail: c.contractNumber,
        href: "/contracts",
      }),
    );
  return events;
}
