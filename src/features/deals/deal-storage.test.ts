// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import {
  DEAL_STORAGE_KEY,
  createDeal,
  loadDeals,
  saveDeals,
} from "./deal-storage";

describe("deal persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds connected deals only when storage is empty", () => {
    const seeded = loadDeals(clients, properties);
    expect(seeded.length).toBeGreaterThan(0);
    expect(clients.some((client) => client.id === seeded[0].clientId)).toBe(
      true,
    );
    expect(
      properties.some((property) => property.id === seeded[0].propertyId),
    ).toBe(true);

    window.localStorage.setItem(DEAL_STORAGE_KEY, "[]");
    expect(loadDeals(clients, properties)).toEqual([]);
  });

  it("round-trips typed deals through localStorage", () => {
    const deal = createDeal(
      {
        title: "Connected deal",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Lead",
        expectedValueMinor: 200_000_00,
        currency: "USD",
        probability: 25,
        assignedAgent: "Mohammed",
        nextAction: "Call buyer",
        nextActionAt: "2026-07-24T10:00",
        expectedCloseDate: "2026-08-15",
        notes: "Persistent note",
      },
      [],
    );
    expect(saveDeals([deal])).toEqual({ ok: true });
    expect(loadDeals(clients, properties)).toEqual([deal]);
  });

  it("drops malformed records during migration", () => {
    window.localStorage.setItem(
      DEAL_STORAGE_KEY,
      JSON.stringify([{ id: "broken" }]),
    );
    expect(loadDeals(clients, properties)).toEqual([]);
  });
});
