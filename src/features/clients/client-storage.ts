import {
  PROPERTY_CURRENCIES,
  PROPERTY_TYPES,
  type PropertyCurrency,
  type PropertyType,
} from "../properties/property-data";
import {
  CLIENT_PURPOSES,
  CLIENT_STAGES,
  clients,
  type Client,
  type ClientPurpose,
  type ClientStage,
} from "./client-data";

const CLIENT_STORAGE_KEY = "estateflow-clients";
const LEGACY_DATE_BASE = Date.parse("2026-07-01T09:00:00.000Z");

export type ClientSaveResult = { ok: true } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function getEnumArray<T extends string>(value: unknown, options: readonly T[]) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is T =>
          typeof item === "string" && options.includes(item as T),
      )
    : [];
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function inferPropertyTypes(propertyNeeds: string): PropertyType[] {
  const normalizedNeeds = propertyNeeds.toLowerCase();

  return PROPERTY_TYPES.filter((propertyType) =>
    normalizedNeeds.includes(propertyType.toLowerCase()),
  );
}

function inferBedrooms(propertyNeeds: string) {
  const match = propertyNeeds.match(/(\d+)\s*-?\s*bed/i);
  return match ? Number(match[1]) : 0;
}

function cloneDemoClients() {
  return clients.map((client) => ({
    ...client,
    preferredAreas: [...client.preferredAreas],
    propertyTypes: [...client.propertyTypes],
  }));
}

export function normalizeClient(value: unknown, index = 0): Client | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getString(value.id).trim();
  const name = getString(value.name).trim();

  if (!id || !name) {
    return null;
  }

  const propertyNeeds = getString(
    value.propertyNeeds,
    "Property needs not added yet",
  ).trim();
  const fallbackDate = new Date(
    LEGACY_DATE_BASE - index * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAt = isValidDate(value.createdAt)
    ? value.createdAt
    : fallbackDate;
  const updatedAt = isValidDate(value.updatedAt) ? value.updatedAt : createdAt;
  const explicitPropertyTypes = getEnumArray<PropertyType>(
    value.propertyTypes,
    PROPERTY_TYPES,
  );

  return {
    id,
    name,
    phone: getString(value.phone).trim(),
    email: getString(value.email, "No email added").trim(),
    purpose: getEnumValue<ClientPurpose>(value.purpose, CLIENT_PURPOSES, "Buy"),
    budgetMin: getNumber(value.budgetMin),
    budgetMax: getNumber(value.budgetMax),
    currency: getEnumValue<PropertyCurrency>(
      value.currency,
      PROPERTY_CURRENCIES,
      "USD",
    ),
    preferredAreas: getStringArray(value.preferredAreas),
    propertyTypes:
      explicitPropertyTypes.length > 0
        ? explicitPropertyTypes
        : inferPropertyTypes(propertyNeeds),
    minBedrooms: getNumber(value.minBedrooms) || inferBedrooms(propertyNeeds),
    propertyNeeds,
    stage: getEnumValue<ClientStage>(value.stage, CLIENT_STAGES, "New Lead"),
    leadScore: Math.min(100, getNumber(value.leadScore, 50)),
    assignedAgent: getString(value.assignedAgent, "Mohammed").trim(),
    followUp: getString(value.followUp, "Set follow-up time").trim(),
    followUpAt: isValidDate(value.followUpAt) ? value.followUpAt : "",
    smartSummary: getString(value.smartSummary, "Client profile ready").trim(),
    recommendedAction: getString(
      value.recommendedAction,
      "Confirm the client requirements and next action.",
    ).trim(),
    createdAt,
    updatedAt,
  };
}

export function loadClients(): Client[] {
  if (typeof window === "undefined") {
    return cloneDemoClients();
  }

  try {
    const savedClients = window.localStorage.getItem(CLIENT_STORAGE_KEY);

    if (savedClients === null) {
      return cloneDemoClients();
    }

    const parsedClients: unknown = JSON.parse(savedClients);

    if (!Array.isArray(parsedClients)) {
      return cloneDemoClients();
    }

    return parsedClients
      .map((client, index) => normalizeClient(client, index))
      .filter((client): client is Client => client !== null);
  } catch {
    return cloneDemoClients();
  }
}

export function saveClients(clientList: readonly Client[]): ClientSaveResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      message: "Client saving is only available in the browser.",
    };
  }

  try {
    window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clientList));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "This client change could not be saved. Please try again.",
    };
  }
}

export function createClientId(clientList: readonly Pick<Client, "id">[]) {
  const existingIds = new Set(clientList.map((client) => client.id));

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const randomNumber =
      typeof crypto !== "undefined" && "getRandomValues" in crypto
        ? crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
        : (Date.now() + attempt * 7919) % 1_000_000;
    const id = `CLI-${String(randomNumber).padStart(6, "0")}`;

    if (!existingIds.has(id)) {
      return id;
    }
  }

  return `CLI-${Date.now().toString().slice(-6)}`;
}

export function clearSavedClients() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CLIENT_STORAGE_KEY);
  }
}
