import { describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import {
  calculatePropertyClientMatch,
  getAllSmartMatches,
  getMatchesForClient,
  getMatchesForProperty,
} from "./matching";

describe("smart matching engine", () => {
  it("awards a transparent 100 score when all five criteria match", () => {
    const match = calculatePropertyClientMatch(clients[0], properties[0]);

    expect(match.score).toBe(100);
    expect(match.strength).toBe("Excellent");
    expect(match.criteria).toHaveLength(5);
    expect(match.criteria.every((criterion) => criterion.matched)).toBe(true);
  });

  it("explains purpose, budget, area, type, and bedroom points", () => {
    const match = calculatePropertyClientMatch(clients[1], properties[1]);

    expect(match.criteria.map((criterion) => criterion.key)).toEqual([
      "purpose",
      "budget",
      "district",
      "propertyType",
      "bedrooms",
    ]);
    expect(
      match.criteria.reduce((total, criterion) => total + criterion.earned, 0),
    ).toBe(match.score);
  });

  it("gives partial budget credit when a property is close to the range", () => {
    const client = {
      ...clients[1],
      budgetMin: 900,
      budgetMax: 1650,
    };
    const match = calculatePropertyClientMatch(client, properties[1]);
    const budgetCriterion = match.criteria.find(
      (criterion) => criterion.key === "budget",
    );

    expect(budgetCriterion?.matched).toBe(false);
    expect(budgetCriterion?.earned).toBe(13);
    expect(budgetCriterion?.detail).toContain("close");
  });

  it("only returns available properties in a client match list", () => {
    const matches = getMatchesForClient(clients[2], properties, true);

    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every((match) => match.property.status === "Available"),
    ).toBe(true);
  });

  it("uses the same score in client, property, and global directions", () => {
    const fromClient = getMatchesForClient(clients[0], properties, true).find(
      (match) => match.property.id === properties[0].id,
    );
    const fromProperty = getMatchesForProperty(
      properties[0],
      clients,
      true,
    ).find((match) => match.client.id === clients[0].id);
    const fromGlobal = getAllSmartMatches(clients, properties).find(
      (match) =>
        match.client.id === clients[0].id &&
        match.property.id === properties[0].id,
    );

    expect(fromClient?.score).toBe(100);
    expect(fromProperty?.score).toBe(fromClient?.score);
    expect(fromGlobal?.score).toBe(fromClient?.score);
  });
});
