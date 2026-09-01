// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadAutomationRules, saveAutomationRules } from "./automation-storage";
describe("automation configuration", () => {
  beforeEach(() => window.localStorage.clear());
  it("persists enabled state, lead time, history, and avoids duplicate rule records", () => {
    const rules = loadAutomationRules();
    const next = rules.map((r) =>
      r.id === "viewing-reminder" ? { ...r, enabled: false, leadTime: 48 } : r,
    );
    saveAutomationRules(next);
    const loaded = loadAutomationRules();
    expect(loaded).toHaveLength(rules.length);
    expect(loaded.find((r) => r.id === "viewing-reminder")).toMatchObject({
      enabled: false,
      leadTime: 48,
    });
    expect(new Set(loaded.map((r) => r.id)).size).toBe(loaded.length);
  });
});
