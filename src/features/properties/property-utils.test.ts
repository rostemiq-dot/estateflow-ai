import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { properties } from "./property-data";
import {
  loadProperties,
  normalizeProperty,
  saveProperties,
} from "./property-storage";
import {
  createPropertyId,
  duplicateProperty,
  filterAndSortProperties,
  getPropertyStats,
  type PropertyFilters,
} from "./property-utils";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const defaultFilters: PropertyFilters = {
  search: "",
  purpose: "All",
  status: "All",
  propertyType: "All",
  district: "All",
  sort: "recently-updated",
};

describe("property foundation", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: createMemoryStorage(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searches owner phone and combines filters", () => {
    const result = filterAndSortProperties(properties, {
      ...defaultFilters,
      search: "0002",
      purpose: "Rent",
      propertyType: "Apartment",
      district: "Empire World",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("PROP-002");
  });

  it("sorts mixed USD and IQD prices in comparable values", () => {
    const usdProperty = {
      ...properties[0],
      id: "PROP-USD",
      price: 2000,
      currency: "USD" as const,
    };
    const iqdProperty = {
      ...properties[1],
      id: "PROP-IQD",
      price: 2_000_000,
      currency: "IQD" as const,
    };
    const result = filterAndSortProperties([iqdProperty, usdProperty], {
      ...defaultFilters,
      sort: "highest-price",
    });

    expect(result.map((property) => property.id)).toEqual([
      "PROP-USD",
      "PROP-IQD",
    ]);
  });

  it("creates unique six-digit property IDs", () => {
    const id = createPropertyId(properties);

    expect(id).toMatch(/^PROP-\d{6}$/);
    expect(properties.some((property) => property.id === id)).toBe(false);
  });

  it("duplicates safely with a new ID and reset activity", () => {
    const source = {
      ...properties[2],
      images: ["data:image/jpeg;base64,example"],
    };
    const copy = duplicateProperty(source, properties);

    expect(copy.id).not.toBe(source.id);
    expect(copy.title).toBe(`${source.title} Copy`);
    expect(copy.status).toBe("Available");
    expect(copy.inquiriesThisWeek).toBe(0);
    expect(copy.viewingsThisWeek).toBe(0);
    expect(copy.images).toEqual(source.images);
    expect(copy.images).not.toBe(source.images);
  });

  it("calculates dashboard property totals from saved data", () => {
    expect(getPropertyStats(properties)).toEqual({
      total: 4,
      available: 2,
      forSale: 2,
      forRent: 2,
      closed: 0,
    });
  });

  it("preserves uploaded photos and an intentionally empty property list", () => {
    const savedProperty = {
      ...properties[0],
      images: ["data:image/jpeg;base64,persisted-photo"],
    };

    expect(saveProperties([savedProperty])).toEqual({ ok: true });
    expect(loadProperties()[0].images).toEqual(savedProperty.images);

    expect(saveProperties([])).toEqual({ ok: true });
    expect(loadProperties()).toEqual([]);
  });

  it("upgrades legacy saved properties with missing timestamps", () => {
    const legacyProperty: Record<string, unknown> = {
      ...properties[0],
    };

    delete legacyProperty.createdAt;
    delete legacyProperty.updatedAt;

    const normalizedProperty = normalizeProperty(legacyProperty);

    expect(normalizedProperty).not.toBeNull();
    expect(normalizedProperty?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(normalizedProperty?.updatedAt).toBe(normalizedProperty?.createdAt);
  });
});
