import { apiFetch } from "../../lib/api";

export type DatabaseViewing = {
  id: string;
  propertyId: string;
  clientId: string;
  dealId: string | null;
  assignedAgentId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string | null;
  status: "SCHEDULED" | "CONFIRMED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  outcome: string | null;
  cancellationReason: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { data: DatabaseViewing[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type WriteResponse = { data: DatabaseViewing };

export async function listViewingsFromDatabase() {
  const response = await apiFetch<ListResponse>("/api/viewings?page=1&pageSize=100&sortBy=startAt&sortOrder=asc");
  return response.data;
}

export async function createViewingInDatabase(input: {
  propertyId: string;
  clientId: string;
  assignedAgentId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string | null;
}) {
  const response = await apiFetch<WriteResponse>("/api/viewings", { method: "POST", body: JSON.stringify(input) });
  return response.data;
}

export async function updateViewingInDatabase(id: string, input: Partial<DatabaseViewing>) {
  const response = await apiFetch<WriteResponse>(`/api/viewings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  return response.data;
}

export async function deleteViewingFromDatabase(id: string) {
  await apiFetch<void>(`/api/viewings/${id}`, { method: "DELETE" });
}
