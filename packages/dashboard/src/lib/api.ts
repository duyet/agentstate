const API_BASE = "/api";

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
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
