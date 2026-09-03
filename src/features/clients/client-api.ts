import { apiFetch } from "../../lib/api";
import type { Client, ClientPurpose, ClientStage } from "./client-data";
import type { PropertyCurrency, PropertyType } from "../properties/property-data";

type BackendClient = {
  id: string;
  assignedAgentId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string;
  leadStatus: "NEW" | "CONTACTED" | "QUALIFIED" | "NURTURING" | "CONVERTED" | "LOST";
  leadSource: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  rating: number | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  tags: unknown[];
};

type ClientListResponse = {
  data: BackendClient[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type ClientWriteResponse = { data: BackendClient };

type ClientMetadata = {
  version: 1;
  purpose: ClientPurpose;
  budgetMin: number;
  budgetMax: number;
  currency: PropertyCurrency;
  preferredAreas: string[];
  propertyTypes: PropertyType[];
  minBedrooms: number;
  propertyNeeds: string;
  leadScore: number;
  smartSummary: string;
  recommendedAction: string;
};

function readMetadata(notes: string | null): ClientMetadata {
  const fallback: ClientMetadata = {
    version: 1,
    purpose: "Buy",
    budgetMin: 0,
    budgetMax: 0,
    currency: "USD",
    preferredAreas: [],
    propertyTypes: [],
    minBedrooms: 0,
    propertyNeeds: "",
    leadScore: 50,
    smartSummary: "",
    recommendedAction: "Contact the client and qualify their requirements.",
  };
  if (!notes) return fallback;
  try {
    const parsed = JSON.parse(notes) as Partial<ClientMetadata>;
    if (parsed.version !== 1) return fallback;
    return {
      ...fallback,
      ...parsed,
      preferredAreas: Array.isArray(parsed.preferredAreas) ? parsed.preferredAreas : [],
      propertyTypes: Array.isArray(parsed.propertyTypes) ? parsed.propertyTypes : [],
    };
  } catch {
    return fallback;
  }
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "Client", lastName: parts.slice(1).join(" ") || "Client" };
}

function toStage(status: BackendClient["leadStatus"]): ClientStage {
  switch (status) {
    case "CONTACTED": return "Contacted";
    case "QUALIFIED": return "Qualified";
    case "NURTURING": return "Viewing";
    case "CONVERTED": return "Closed";
    case "LOST": return "Closed";
    default: return "New Lead";
  }
}

function toLeadStatus(stage: ClientStage): BackendClient["leadStatus"] {
  switch (stage) {
    case "Contacted": return "CONTACTED";
    case "Qualified": return "QUALIFIED";
    case "Viewing": return "NURTURING";
    case "Negotiating": return "QUALIFIED";
    case "Closed": return "CONVERTED";
    default: return "NEW";
  }
}

function fromBackend(client: BackendClient): Client {
  const metadata = readMetadata(client.notes);
  return {
    id: client.id,
    name: client.fullName,
    phone: client.phone,
    email: client.email ?? "",
    purpose: metadata.purpose,
    budgetMin: metadata.budgetMin,
    budgetMax: metadata.budgetMax,
    currency: metadata.currency,
    preferredAreas: metadata.preferredAreas,
    propertyTypes: metadata.propertyTypes,
    minBedrooms: metadata.minBedrooms,
    propertyNeeds: metadata.propertyNeeds,
    stage: toStage(client.leadStatus),
    leadScore: metadata.leadScore,
    assignedAgent: client.assignedAgentId ?? "Unassigned",
    followUp: client.nextFollowUpAt ? new Date(client.nextFollowUpAt).toLocaleString() : "Set follow-up time",
    followUpAt: client.nextFollowUpAt ?? "",
    smartSummary: metadata.smartSummary,
    recommendedAction: metadata.recommendedAction,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function toPayload(client: Client) {
  const { firstName, lastName } = splitName(client.name);
  const notes: ClientMetadata = {
    version: 1,
    purpose: client.purpose,
    budgetMin: client.budgetMin,
    budgetMax: client.budgetMax,
    currency: client.currency,
    preferredAreas: client.preferredAreas,
    propertyTypes: client.propertyTypes,
    minBedrooms: client.minBedrooms,
    propertyNeeds: client.propertyNeeds,
    leadScore: client.leadScore,
    smartSummary: client.smartSummary,
    recommendedAction: client.recommendedAction,
  };
  return {
    firstName,
    lastName,
    email: client.email.trim() || null,
    phone: client.phone.trim(),
    leadStatus: toLeadStatus(client.stage),
    leadSource: "OTHER",
    priority: client.leadScore >= 90 ? "URGENT" : client.leadScore >= 80 ? "HIGH" : client.leadScore >= 60 ? "MEDIUM" : "LOW",
    rating: client.leadScore >= 90 ? 5 : client.leadScore >= 80 ? 4 : client.leadScore >= 60 ? 3 : 2,
    notes: JSON.stringify(notes),
    nextFollowUpAt: client.followUpAt || null,
    lastContactAt: null,
  };
}

export async function listClientsFromDatabase() {
  const response = await apiFetch<ClientListResponse>("/api/clients?page=1&pageSize=100&sortBy=updatedAt&sortOrder=desc");
  return response.data.map(fromBackend);
}

export async function createClientInDatabase(client: Client) {
  const response = await apiFetch<ClientWriteResponse>("/api/clients", { method: "POST", body: JSON.stringify(toPayload(client)) });
  return fromBackend(response.data);
}

export async function updateClientInDatabase(client: Client) {
  const response = await apiFetch<ClientWriteResponse>(`/api/clients/${client.id}`, { method: "PATCH", body: JSON.stringify(toPayload(client)) });
  return fromBackend(response.data);
}

export async function deleteClientFromDatabase(clientId: string) {
  await apiFetch<void>(`/api/clients/${clientId}`, { method: "DELETE" });
}
