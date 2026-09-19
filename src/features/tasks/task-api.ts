import { apiFetch } from "../../lib/api";

export type DatabaseTask = {
  id: string;
  agencyId: string;
  assignedUserId: string;
  createdById: string;
  clientId: string | null;
  propertyId: string | null;
  dealId: string | null;
  viewingId: string | null;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  data: DatabaseTask[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type WriteResponse = { data: DatabaseTask };

export async function listTasksFromDatabase(params: {
  status?: DatabaseTask["status"];
  priority?: DatabaseTask["priority"];
  search?: string;
} = {}) {
  const query = new URLSearchParams({ page: "1", pageSize: "100", sortBy: "dueAt", sortOrder: "asc" });
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const response = await apiFetch<ListResponse>(`/api/tasks?${query.toString()}`);
  return response.data;
}

export async function createTaskInDatabase(input: {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: DatabaseTask["priority"];
  clientId?: string | null;
  propertyId?: string | null;
  dealId?: string | null;
  viewingId?: string | null;
}) {
  const response = await apiFetch<WriteResponse>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateTaskInDatabase(id: string, input: Partial<{
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: DatabaseTask["priority"];
  status: DatabaseTask["status"];
  clientId: string | null;
  propertyId: string | null;
  dealId: string | null;
  viewingId: string | null;
}>) {
  const response = await apiFetch<WriteResponse>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function deleteTaskFromDatabase(id: string) {
  await apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" });
}
