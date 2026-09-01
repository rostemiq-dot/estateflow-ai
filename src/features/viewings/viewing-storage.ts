import type { Property } from "../properties/property-data";
import {
  VIEWING_OUTCOMES,
  VIEWING_STATUSES,
  type Viewing,
  type ViewingDraft,
  type ViewingOutcome,
  type ViewingStatus,
} from "./viewing-data";

const VIEWINGS_STORAGE_KEY = "estateflow-viewings";
const LEGACY_VIEWINGS_STORAGE_KEY = "estateflow-client-viewings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function normalizeViewing(value: unknown): Viewing | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";
  const clientId = typeof value.clientId === "string" ? value.clientId : "";
  const propertyId =
    typeof value.propertyId === "string" ? value.propertyId : "";
  const date = typeof value.date === "string" ? value.date : "";
  const time = typeof value.time === "string" ? value.time : "";

  if (!id || !clientId || !propertyId || !date || !time) {
    return null;
  }

  const createdAt =
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : createdAt;
  const outcome =
    typeof value.outcome === "string" &&
    VIEWING_OUTCOMES.includes(value.outcome as ViewingOutcome)
      ? (value.outcome as ViewingOutcome)
      : undefined;

  return {
    id,
    clientId,
    propertyId,
    date,
    time,
    location: typeof value.location === "string" ? value.location : "",
    status: getEnumValue<ViewingStatus>(
      value.status,
      VIEWING_STATUSES,
      "Scheduled",
    ),
    outcome,
    outcomeNotes:
      typeof value.outcomeNotes === "string" ? value.outcomeNotes : undefined,
    createdAt,
    updatedAt,
  };
}

function migrateLegacyViewings(properties: readonly Property[]) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedLegacyViewings = window.localStorage.getItem(
      LEGACY_VIEWINGS_STORAGE_KEY,
    );

    if (!savedLegacyViewings) {
      return [];
    }

    const parsedLegacyViewings: unknown = JSON.parse(savedLegacyViewings);

    if (!isRecord(parsedLegacyViewings)) {
      return [];
    }

    return Object.entries(parsedLegacyViewings)
      .map(([clientId, legacyViewing], index) => {
        if (!isRecord(legacyViewing)) {
          return null;
        }

        const propertyName =
          typeof legacyViewing.property === "string"
            ? legacyViewing.property
            : "";
        const matchedProperty = properties.find(
          (property) =>
            property.id === propertyName ||
            property.title.toLowerCase() === propertyName.toLowerCase(),
        );

        if (!matchedProperty) {
          return null;
        }

        const now = new Date(Date.now() - index * 1000).toISOString();

        return normalizeViewing({
          id: `VIEW-LEGACY-${index + 1}`,
          clientId,
          propertyId: matchedProperty.id,
          date: legacyViewing.date,
          time: legacyViewing.time,
          location: legacyViewing.location,
          status: "Scheduled",
          createdAt: now,
          updatedAt: now,
        });
      })
      .filter((viewing): viewing is Viewing => viewing !== null);
  } catch {
    return [];
  }
}

export function loadViewings(properties: readonly Property[] = []): Viewing[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedViewings = window.localStorage.getItem(VIEWINGS_STORAGE_KEY);

    if (savedViewings === null) {
      return migrateLegacyViewings(properties);
    }

    const parsedViewings: unknown = JSON.parse(savedViewings);

    if (!Array.isArray(parsedViewings)) {
      return [];
    }

    return parsedViewings
      .map(normalizeViewing)
      .filter((viewing): viewing is Viewing => viewing !== null);
  } catch {
    return [];
  }
}

export function saveViewings(viewings: readonly Viewing[]) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(VIEWINGS_STORAGE_KEY, JSON.stringify(viewings));
    return true;
  } catch {
    return false;
  }
}

export function createViewing(
  draft: ViewingDraft,
  existingViewings: readonly Viewing[],
): Viewing {
  const existingIds = new Set(existingViewings.map((viewing) => viewing.id));
  let id = "";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `VIEW-${String(
      (Date.now() + attempt * 3571) % 1_000_000,
    ).padStart(6, "0")}`;

    if (!existingIds.has(candidate)) {
      id = candidate;
      break;
    }
  }

  const now = new Date().toISOString();

  return {
    ...draft,
    id: id || `VIEW-${Date.now()}`,
    status: "Scheduled",
    createdAt: now,
    updatedAt: now,
  };
}
