import { apiFetch } from "../../lib/api";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

export async function loginUser(credentials: { email: string; password: string }): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  localStorage.setItem("estateflow_token", data.token);
  return data;
}

export async function registerUser(details: { email: string; password: string; name: string }): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
  });

  localStorage.setItem("estateflow_token", data.token);
  return data;
}

export function logoutUser(): void {
  localStorage.removeItem("estateflow_token");
}