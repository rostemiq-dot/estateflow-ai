import { supabase } from "./supabase";

// Production APIs live on the same Vercel origin as the React app.
// Never let an old VITE_API_URL send production requests to a stale backend.
const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
const API_URL = import.meta.env.PROD ? "" : configuredApiUrl || "http://localhost:3000";

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
  const sessionPromise = supabase?.auth.getSession();
  const sessionResult = sessionPromise
    ? await Promise.race([
        sessionPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Authentication session timed out")), 8000),
        ),
      ])
    : { data: { session: null } };

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (sessionResult.data.session?.access_token) {
    headers.set("Authorization", `Bearer ${sessionResult.data.session.access_token}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    });

    if (response.status === 401) {
      await supabase?.auth.signOut();
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const payload = (await response.json()) as {
          error?: { message?: string };
          message?: string;
        };
        message = payload.error?.message || payload.message || message;
      } catch {
        // Keep the status-based message when the server did not return JSON.
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The API request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
