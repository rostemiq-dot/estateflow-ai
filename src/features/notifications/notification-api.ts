import { apiFetch } from "../../lib/api";

export type DatabaseNotification = {
  id: string;
  agencyId: string;
  recipientId: string;
  clientId: string | null;
  propertyId: string | null;
  dealId: string | null;
  viewingId: string | null;
  taskId: string | null;
  type: "SYSTEM" | "TASK" | "GENERAL";
  title: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  deletedAt: string | null;
};

type ListResponse = { data: DatabaseNotification[] };
type WriteResponse = { data: DatabaseNotification };
type CountResponse = { data: { count: number } };

export async function listNotificationsFromDatabase() {
  const response = await apiFetch<ListResponse>("/api/notifications");
  return response.data;
}

export async function createNotificationInDatabase(input: {
  recipientId: string;
  title: string;
  message?: string | null;
  type?: DatabaseNotification["type"];
  taskId?: string | null;
  clientId?: string | null;
  propertyId?: string | null;
  dealId?: string | null;
  viewingId?: string | null;
}) {
  const response = await apiFetch<WriteResponse>("/api/notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function markNotificationRead(id: string) {
  const response = await apiFetch<CountResponse>(`/api/notifications/${id}/read`, { method: "PATCH" });
  return response.data.count;
}

export async function markAllNotificationsRead() {
  const response = await apiFetch<CountResponse>("/api/notifications/read-all", { method: "PATCH" });
  return response.data.count;
}

export async function deleteNotificationFromDatabase(id: string) {
  await apiFetch<void>(`/api/notifications/${id}`, { method: "DELETE" });
}
