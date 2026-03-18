const API_BASE = "/api";

export async function api<T>(
  path: string,
  options?: RequestInit & {
    orgId?: string;
  },
): Promise<T> {
  const { orgId, ...restOptions } = options ?? {};
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (orgId) {
    url.searchParams.set("org_id", orgId);
  }

  const res = await fetch(url.toString(), {
    ...restOptions,
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
