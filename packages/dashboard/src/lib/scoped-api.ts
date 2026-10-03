import { ApiError } from "./api";

const API_BASE = "/api";

/**
 * Scoped-resource API client for the coordination primitives
 * (States, Leases, Claims, Capability Tokens).
 *
 * Unlike the session-authenticated `api()` helper, these endpoints
 * authenticate with a Bearer API key (scopedAuth middleware) — the
 * dashboard never sees one automatically. Each page therefore lets the
 * user paste a project key once per project; it is stored in
 * localStorage (never sent anywhere except the same-origin API) and
 * attached as `Authorization: Bearer <key>` on every call.
 *
 * The full key is only ever present client-side: the Keys page reveals
 * it once at creation, so a user can copy it from that reveal or from
 * their environment.
 */

const KEY_PREFIX = "agentstate:debug-key:";

export function debugKeyStorageKey(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

export function getDebugKey(projectId: string | null | undefined): string | null {
  if (!projectId || typeof localStorage === "undefined") return null;
  return localStorage.getItem(debugKeyStorageKey(projectId));
}

export function setDebugKey(projectId: string, key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(debugKeyStorageKey(projectId), key.trim());
}

export function clearDebugKey(projectId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(debugKeyStorageKey(projectId));
}

/** Mask a key for display, keeping just the prefix + tail. */
export function maskKey(key: string): string {
  if (key.length <= 12) return "••••••";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export interface ScopedApiOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

/**
 * Same-origin fetch against /api/v1/* with a Bearer debug key.
 * Throws ApiError with the server's message on non-2xx. A 401 means
 * the *API key* was rejected (bad/revoked/expired) — deliberately not
 * the SESSION_EXPIRED_EVENT, which is reserved for expired Clerk
 * sessions and would sign the user out.
 */
export async function apiScoped<T>(
  projectId: string,
  path: string,
  options?: ScopedApiOptions,
): Promise<T> {
  const key = getDebugKey(projectId);
  if (!key) {
    throw new ApiError("Connect an API key to browse this resource", 0);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `API error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
