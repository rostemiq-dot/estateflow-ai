import { supabase } from "./supabase";

// The React app is deployed on Vercel, while the Express API runs on Railway.
// VITE_API_URL is injected by Vercel at build time for production.
const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/$/, "");

const API_URL = configuredApiUrl || "http://localhost:3000";

const CACHE_FRESH_MS = 15_000;
const CACHE_MAX_STALE_MS = 5 * 60_000;

type CacheEntry = {
  value: unknown;
  storedAt: number;
};

const getCache = new Map<string, CacheEntry>();
const inFlightGets = new Map<string, Promise<unknown>>();

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

function isGetRequest(init: RequestInit) {
  return (init.method ?? "GET").toUpperCase() === "GET";
}

function cacheKey(userId: string, path: string) {
  return `${userId}:${buildApiUrl(path)}`;
}

function invalidateGetCache() {
  getCache.clear();
}

export function clearApiCache() {
  invalidateGetCache();
}

async function getSession() {
  const sessionPromise = supabase?.auth.getSession();
  return sessionPromise
    ? await Promise.race([
        sessionPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Authentication session timed out")), 8000),
        ),
      ])
    : { data: { session: null } };
}

async function fetchFromNetwork<T>(
  path: string,
  init: RequestInit,
  sessionResult: Awaited<ReturnType<typeof getSession>>,
  key?: string,
): Promise<T> {
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
      clearApiCache();
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

    const value = (await response.json()) as T;
    if (key) {
      getCache.set(key, { value, storedAt: Date.now() });
    }
    return value;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The API request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGet<T>(
  path: string,
  init: RequestInit,
  sessionResult: Awaited<ReturnType<typeof getSession>>,
): Promise<T> {
  const userId = sessionResult.data.session?.user?.id ?? "anonymous";
  const key = cacheKey(userId, path);
  const cached = getCache.get(key);
  const age = cached ? Date.now() - cached.storedAt : Number.POSITIVE_INFINITY;

  if (cached && age <= CACHE_MAX_STALE_MS) {
    // The UI gets the last confirmed database response immediately. A fresh
    // request runs in the background so the next render has current data.
    if (age > CACHE_FRESH_MS && !inFlightGets.has(key)) {
      const refresh = fetchFromNetwork<T>(path, { ...init, signal: undefined }, sessionResult, key)
        .finally(() => inFlightGets.delete(key));
      inFlightGets.set(key, refresh);
    }
    return cached.value as T;
  }

  const existing = inFlightGets.get(key);
  if (existing) return existing as Promise<T>;

  const request = fetchFromNetwork<T>(path, init, sessionResult, key)
    .finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, request);
  return request;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sessionResult = await getSession();

  if (isGetRequest(init)) {
    return fetchGet<T>(path, init, sessionResult);
  }

  // Mutations always go to the database first. Once they succeed, discard all
  // cached GET results so the next read cannot present stale application data.
  const result = await fetchFromNetwork<T>(path, init, sessionResult);
  invalidateGetCache();
  return result;
}
