import { supabase } from "./supabase";

const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
const API_URL = configuredApiUrl || (import.meta.env.PROD ? "" : "http://localhost:3000");

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_URL.endsWith("/api") && normalizedPath === "/api") {
    return API_URL;
  }
  if (API_URL.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${API_URL}${normalizedPath.slice(4)}`;
  }

  return `${API_URL}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  if (response.status === 401) {
    await supabase?.auth.signOut();
  }

  if (!response.ok) {
    throw new Error("Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
