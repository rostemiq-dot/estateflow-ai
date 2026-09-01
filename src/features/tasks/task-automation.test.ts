import { describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import { createDeal } from "../deals/deal-storage";
import type { Viewing } from "../viewings/viewing-data";
import { generateAutomatedTasks } from "./task-automation";
import { taskTiming } from "./task-storage";
describe("task automation", () => {
  it("creates connected reminders once", () => {
    const viewing: Viewing = {
      id: "V1",
      clientId: clients[0].id,
      propertyId: properties[0].id,
      date: "2026-07-25",
      time: "10:00",
      location: "",
      status: "Scheduled",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };
    const deal = createDeal(
      {
        title: "D",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Offer Made",
        expectedValueMinor: 1,
        currency: "USD",
        probability: 1,
        assignedAgent: "M",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    deal.offers = [
      {
        id: "O1",
        amountMinor: 1,
        date: "",
        expirationDate: "2026-07-27",
        conditions: "",
        notes: "",
        status: "Sent",
        createdAt: viewing.createdAt,
        updatedAt: viewing.updatedAt,
      },
    ];
    const first = generateAutomatedTasks(
      [],
      [viewing],
      [deal],
      [],
      clients,
      properties,
      new Date("2026-07-23T00:00:00Z"),
    );
    expect(first).toHaveLength(2);
    expect(first[0].automatic).toBe(true);
    expect(first[0].clientId).toBe(clients[0].id);
    expect(
      generateAutomatedTasks(
        first,
        [viewing],
        [deal],
        [],
        clients,
        properties,
        new Date("2026-07-23T00:00:00Z"),
      ),
    ).toHaveLength(2);
  });
  it("classifies overdue, today, and upcoming due dates", () => {
    const base = {
      id: "T",
      automatic: false,
      title: "T",
      description: "",
      priority: "Normal" as const,
      status: "To Do" as const,
      responsibleAgent: "M",
      notes: "",
      archived: false,
      history: [],
      createdAt: "",
      updatedAt: "",
    };
    expect(
      taskTiming(
        { ...base, dueAt: "2026-07-22T10:00" },
        new Date("2026-07-23T12:00"),
      ).overdue,
    ).toBe(true);
    expect(
      taskTiming(
        { ...base, dueAt: "2026-07-23T14:00" },
        new Date("2026-07-23T12:00"),
      ).today,
    ).toBe(true);
  });
});
