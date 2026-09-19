import { apiFetch } from "../../lib/api";

export type DatabaseTeamMember = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listTeamFromDatabase() {
  const response = await apiFetch<{ data: DatabaseTeamMember[] }>("/api/team");
  return response.data;
}
