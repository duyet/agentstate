const API_BASE = "/api";

/** Dispatched on `window` whenever an API call fails with 401 (expired/invalid session). */
export const SESSION_EXPIRED_EVENT = "agentstate:session-expired";

/** Thrown for any non-2xx API response. Carries the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit & {
    orgId?: string;
  },
): Promise<T> {
  const { orgId, ...restOptions } = options ?? {};
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  // org_id is now taken from the verified Clerk session server-side, but we
  // keep the helper for any legacy callers. It is ignored by the API for scoping.
  if (orgId) {
    url.searchParams.set("org_id", orgId);
  }

  const res = await fetch(url.toString(), {
    ...restOptions,
    // Same-origin: send the Clerk session cookie (__session) so dashboard-management
    // routes can verify the session. Without this, some browsers/envs may omit
    // cookies on programmatic fetch; "include" guarantees the cookie is sent.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...restOptions?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `API error ${res.status}`;
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
