import {
  PROPERTY_CURRENCIES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type Property,
  type PropertyCurrency,
  type PropertyPurpose,
  type PropertyStatus,
  type PropertyType,
} from "./property-data";

const PROPERTY_STORAGE_KEY = "estateflow-properties";
const LEGACY_DATE_BASE = Date.parse("2026-07-01T09:00:00.000Z");
const DEMO_PROPERTY_IDS = new Set(["PROP-001", "PROP-002", "PROP-003", "PROP-004"]);

export type PropertySaveResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function getEnumValue<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
) {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : fallback;
}

export function normalizeProperty(value: unknown, index = 0): Property | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getString(value.id).trim();
  const title = getString(value.title).trim();

  if (!id || !title) {
    return null;
  }

  const fallbackDate = new Date(
    LEGACY_DATE_BASE - index * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAt = isValidDate(value.createdAt)
    ? value.createdAt
    : fallbackDate;
  const updatedAt = isValidDate(value.updatedAt) ? value.updatedAt : createdAt;

  return {
    id,
    referenceCode: getString(value.referenceCode).trim() || undefined,
    title,
    district: getString(value.district, "Erbil").trim(),
    location: getString(value.location, "Erbil, Kurdistan Region").trim(),
    purpose: getEnumValue<PropertyPurpose>(
      value.purpose,
      PROPERTY_PURPOSES,
      "Sale",
    ),
    status: getEnumValue<PropertyStatus>(
      value.status,
      PROPERTY_STATUSES,
      "Available",
    ),
    propertyType: getEnumValue<PropertyType>(
      value.propertyType,
      PROPERTY_TYPES,
      "House",
    ),
    price: getNumber(value.price),
    currency: getEnumValue<PropertyCurrency>(
      value.currency,
      PROPERTY_CURRENCIES,
      "USD",
    ),
    bedrooms: getNumber(value.bedrooms),
    bathrooms: getNumber(value.bathrooms),
    areaSqm: getNumber(value.areaSqm),
    ownerName: getString(value.ownerName, "Owner not added").trim(),
    ownerPhone: getString(value.ownerPhone).trim(),
    description: getString(value.description).trim(),
    features: getStringArray(value.features),
    images: getStringArray(value.images).slice(0, 6),
    matchScore: Math.min(100, getNumber(value.matchScore)),
    inquiriesThisWeek: getNumber(value.inquiriesThisWeek),
    viewingsThisWeek: getNumber(value.viewingsThisWeek),
    updatedLabel: getString(value.updatedLabel, "Previously saved"),
    createdAt,
    updatedAt,
  };
}

export function loadProperties(): Property[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedProperties = window.localStorage.getItem(PROPERTY_STORAGE_KEY);

    if (savedProperties === null) {
      return [];
    }

    const parsedProperties: unknown = JSON.parse(savedProperties);

    if (!Array.isArray(parsedProperties)) {
      return [];
    }

    return parsedProperties
      .map((property, index) => normalizeProperty(property, index))
      .filter(
        (property): property is Property =>
          property !== null && !DEMO_PROPERTY_IDS.has(property.id),
      );
  } catch {
    return [];
  }
}

export function saveProperties(
  propertyList: readonly Property[],
): PropertySaveResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      message: "Property saving is only available in the browser.",
    };
  }

  try {
    window.localStorage.setItem(
      PROPERTY_STORAGE_KEY,
      JSON.stringify(propertyList),
    );

    return { ok: true };
  } catch (error) {
    const isStorageFull =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");

    return {
      ok: false,
      message: isStorageFull
        ? "Browser storage is full. Remove a few property photos and try again."
        : "This property could not be saved. Please try again.",
    };
  }
}

export function clearSavedProperties() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PROPERTY_STORAGE_KEY);
  }
}
