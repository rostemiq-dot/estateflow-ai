import { describe, expect, it } from "vitest";
import { normalizeClient } from "./client-storage";

describe("client migration", () => {
  it("upgrades a legacy free-text requirement into typed match fields", () => {
    const client = normalizeClient({
      id: "CLI-LEGACY",
      name: "Legacy Client",
      phone: "+964 750 000 0000",
      purpose: "Buy",
      budgetMin: 100000,
      budgetMax: 200000,
      currency: "USD",
      preferredAreas: ["Ankawa"],
      propertyNeeds: "Need a 3-bedroom villa with parking",
      stage: "Qualified",
      leadScore: 80,
    });

    expect(client).not.toBeNull();
    expect(client?.propertyTypes).toEqual(["Villa"]);
    expect(client?.minBedrooms).toBe(3);
    expect(client?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves explicit property types over free-text inference", () => {
    const client = normalizeClient({
      id: "CLI-TYPED",
      name: "Typed Client",
      purpose: "Rent",
      budgetMin: 500,
      budgetMax: 1000,
      currency: "USD",
      preferredAreas: [],
      propertyTypes: ["Apartment", "House"],
      minBedrooms: 2,
      propertyNeeds: "Flexible home",
      stage: "New Lead",
    });

    expect(client?.propertyTypes).toEqual(["Apartment", "House"]);
    expect(client?.minBedrooms).toBe(2);
  });
});