// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyBackup, createBackup, validateBackup } from "./backup";
import {
  deleteCustomOption,
  loadSettings,
  migrateCustomList,
  saveSettings,
} from "./settings-storage";
describe("settings and backup safety", () => {
  beforeEach(() => window.localStorage.clear());
  it("persists settings and safely migrates custom lists", () => {
    const settings = loadSettings();
    saveSettings({ ...settings, agencyName: "Rostemiq Realty" });
    expect(loadSettings().agencyName).toBe("Rostemiq Realty");
    const migrated = migrateCustomList(
      ["Villa", "Farm"],
      [{ id: "1", label: "Villa", archived: false }],
    );
    expect(migrated.map((x) => x.label)).toEqual(["Villa", "Farm"]);
  });
  it("blocks deletion of used options without replacement", () => {
    const options = [{ id: "1", label: "Villa", archived: false }];
    expect(deleteCustomOption(options, "1", ["Villa"]).ok).toBe(false);
    expect(deleteCustomOption(options, "1", ["Villa"], "House").ok).toBe(true);
  });
  it("validates, merges, and replaces backups without touching unrelated keys", () => {
    window.localStorage.setItem("estateflow-one", "old");
    window.localStorage.setItem("unrelated", "keep");
    const backup = createBackup();
    expect(validateBackup(backup)).toBe(true);
    const incoming = { ...backup, localStorage: { "estateflow-two": "new" } };
    expect(applyBackup(incoming, "merge")).toBe(true);
    expect(window.localStorage.getItem("estateflow-one")).toBe("old");
    expect(applyBackup(incoming, "replace")).toBe(true);
    expect(window.localStorage.getItem("estateflow-one")).toBeNull();
    expect(window.localStorage.getItem("unrelated")).toBe("keep");
    expect(validateBackup({ version: 99, localStorage: {} })).toBe(false);
  });
});
