import type { Contract } from "../contracts/contract-data";
import type { Client } from "../clients/client-data";
import type { Deal } from "../deals/deal-data";
import type { Property } from "../properties/property-data";
import type { Viewing } from "../viewings/viewing-data";
import type { Task } from "./task-data";
const iso = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 16);
};
export function generateAutomatedTasks(
  existing: readonly Task[],
  viewings: readonly Viewing[],
  deals: readonly Deal[],
  contracts: readonly Contract[],
  clients: readonly Client[],
  properties: readonly Property[],
  now = new Date(),
): Task[] {
  const keys = new Set(existing.map((t) => t.automationKey));
  const generated: Task[] = [];
  const add = (
    key: string,
    title: string,
    dueAt: string,
    links: Partial<Task>,
    agent = "Mohammed",
  ) => {
    if (keys.has(key) || !dueAt) return;
    keys.add(key);
    const createdAt = now.toISOString();
    generated.push({
      id: `TASK-AUTO-${key.replace(/[^a-z0-9]/gi, "-")}`,
      automationKey: key,
      automatic: true,
      title,
      description: "Automatically created from saved EstateFlow activity.",
      dueAt,
      priority: "High",
      status: "To Do",
      responsibleAgent: agent,
      ...links,
      notes: "",
      archived: false,
      history: [{ id: `H-${key}`, text: "Automatic task created.", createdAt }],
      createdAt,
      updatedAt: createdAt,
    });
  };
  viewings
    .filter((v) => ["Scheduled", "Confirmed"].includes(v.status))
    .forEach((v) => {
      const c = clients.find((x) => x.id === v.clientId),
        p = properties.find((x) => x.id === v.propertyId);
      add(
        `viewing:${v.id}:${v.updatedAt}`,
        `Prepare for viewing · ${c?.name ?? "Client"} · ${p?.title ?? "Property"}`,
        iso(`${v.date}T${v.time}`, -1),
        { clientId: v.clientId, propertyId: v.propertyId },
        c?.assignedAgent,
      );
    });
  deals.forEach((d) => {
    d.offers
      .filter((o) => o.status === "Sent" && o.expirationDate)
      .forEach((o) =>
        add(
          `offer:${o.id}:${o.updatedAt}`,
          `Follow up on offer · ${d.title}`,
          iso(`${o.expirationDate}T12:00`, -1),
          { dealId: d.id, clientId: d.clientId, propertyId: d.propertyId },
          d.assignedAgent,
        ),
      );
    d.offers
      .filter((o) => o.status === "Accepted")
      .forEach((o) =>
        add(
          `accepted:${o.id}:${o.updatedAt}`,
          `Prepare contract · ${d.title}`,
          iso(o.updatedAt, 1),
          { dealId: d.id, clientId: d.clientId, propertyId: d.propertyId },
          d.assignedAgent,
        ),
      );
    d.payments
      .filter((p) => p.status !== "Cancelled")
      .forEach((p) =>
        add(
          `payment:${p.id}:${p.dueDate}`,
          `Collect payment · ${p.label}`,
          `${p.dueDate}T09:00`,
          { dealId: d.id, clientId: d.clientId, propertyId: d.propertyId },
          d.assignedAgent,
        ),
      );
  });
  contracts
    .filter((c) => c.status === "Ready to Sign")
    .forEach((c) =>
      add(
        `sign:${c.id}:${c.updatedAt}`,
        `Arrange contract signing · ${c.contractNumber}`,
        iso(c.updatedAt, 1),
        {
          contractId: c.id,
          dealId: c.dealId,
          clientId: c.clientId,
          propertyId: c.propertyId,
        },
        c.responsibleAgent,
      ),
    );
  return [...existing, ...generated];
}
