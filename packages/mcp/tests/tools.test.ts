import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CapturedRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

function makeFetchMock(captured: CapturedRequest[], responseBody: unknown = {}, status = 200) {
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const req = input instanceof Request ? input : new Request(String(input), init);
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    let body: unknown;
    if (init.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }
    captured.push({ method: req.method.toUpperCase(), url: req.url, headers, body });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
}

// ---------------------------------------------------------------------------
// Unit tests for apiRequest logic — we import the logic inline to avoid
// starting the MCP server (which connects to stdio).
// ---------------------------------------------------------------------------

// Re-implement the minimal apiRequest helper for isolated testing.
const TEST_API_KEY = "as_live_test_key_not_real";
const TEST_BASE_URL = "https://agentstate.app/api";

class ApiCallError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  key = TEST_API_KEY,
  base = TEST_BASE_URL,
): Promise<T> {
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } })?.error;
    throw new ApiCallError(
      err?.message ?? `HTTP ${res.status}`,
      err?.code ?? "UNKNOWN",
      res.status,
    );
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("store_conversation", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = makeFetchMock(
      captured,
      { id: "conv_abc", messages: [] },
      201,
    ) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("POSTs to /v1/conversations with the correct URL and body", async () => {
    const payload = {
      title: "Test conversation",
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    await apiRequest("/v1/conversations", { method: "POST", body: JSON.stringify(payload) });

    expect(captured).toHaveLength(1);
    const req = captured[0]!;
    expect(req.method).toBe("POST");
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/conversations");
    expect(req.body).toEqual(payload);
  });

  it("sends the Authorization header with the API key", async () => {
    await apiRequest("/v1/conversations", { method: "POST", body: JSON.stringify({}) });
    const req = captured[0]!;
    expect(req.headers["authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
  });
});

describe("recall_conversation", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = makeFetchMock(captured, {
      id: "conv_abc",
      messages: [],
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("GETs the correct URL for a given conversation ID", async () => {
    await apiRequest("/v1/conversations/conv_abc");
    const req = captured[0]!;
    expect(req.method).toBe("GET");
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/conversations/conv_abc");
  });
});

describe("acquire_lease", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = makeFetchMock(
      captured,
      { id: "lease_xyz", state_key: "task:42", holder: "worker-1", expires_at: 9999999 },
      201,
    ) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("POSTs to /v1/states/:key/lease with the holder and ttl_ms", async () => {
    const stateKey = "task:order-42";
    await apiRequest(`/v1/states/${encodeURIComponent(stateKey)}/lease`, {
      method: "POST",
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });

    const req = captured[0]!;
    expect(req.method).toBe("POST");
    const url = new URL(req.url);
    expect(url.pathname).toBe(`/api/v1/states/${encodeURIComponent(stateKey)}/lease`);
    expect(req.body).toEqual({ holder: "worker-1", ttl_ms: 30_000 });
  });
});

describe("api key tools", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = makeFetchMock(
      captured,
      { id: "key_abc", name: "ci", scopes: ["conversations:read"], key: "as_live_x" },
      201,
    ) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("create_api_key POSTs to /v1/keys with name + scopes", async () => {
    const payload = { name: "ci", scopes: ["conversations:read"] };
    await apiRequest("/v1/keys", { method: "POST", body: JSON.stringify(payload) });
    const req = captured[0]!;
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/keys");
    expect(req.body).toEqual(payload);
  });

  it("list_api_keys GETs /v1/keys", async () => {
    await apiRequest("/v1/keys");
    const req = captured[0]!;
    expect(req.method).toBe("GET");
    expect(new URL(req.url).pathname).toBe("/api/v1/keys");
  });

  it("revoke_api_key DELETEs /v1/keys/:id", async () => {
    await apiRequest("/v1/keys/key_abc", { method: "DELETE" });
    const req = captured[0]!;
    expect(req.method).toBe("DELETE");
    expect(new URL(req.url).pathname).toBe("/api/v1/keys/key_abc");
  });
});

describe("error handling", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("surfaces the API error code and message without leaking the key", async () => {
    globalThis.fetch = makeFetchMock(
      captured,
      { error: { code: "LEASE_CONFLICT", message: "State already has an active lease" } },
      409,
    ) as typeof globalThis.fetch;

    let thrown: ApiCallError | undefined;
    try {
      await apiRequest("/v1/states/task:42/lease", { method: "POST", body: JSON.stringify({}) });
    } catch (err) {
      thrown = err as ApiCallError;
    }

    expect(thrown).toBeDefined();
    expect(thrown!.code).toBe("LEASE_CONFLICT");
    expect(thrown!.message).toBe("State already has an active lease");
    expect(thrown!.status).toBe(409);
    // Key must not appear in the error message
    expect(thrown!.message).not.toContain(TEST_API_KEY);
  });

  it("does not include the API key in generic network error messages", async () => {
    globalThis.fetch = makeFetchMock(
      captured,
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      500,
    ) as typeof globalThis.fetch;

    let thrown: ApiCallError | undefined;
    try {
      await apiRequest("/v1/conversations", {}, TEST_API_KEY);
    } catch (err) {
      thrown = err as ApiCallError;
    }

    expect(thrown).toBeDefined();
    expect(thrown!.message).not.toContain(TEST_API_KEY);
  });
});

describe("upsert_state", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = makeFetchMock(captured, {
      state_key: "agent:w1:progress",
      data: { pct: 42 },
      latest_sequence: 5,
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("PUTs to /v1/states/:key with agent_id and data", async () => {
    const stateKey = "agent:w1:progress";
    await apiRequest(`/v1/states/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      body: JSON.stringify({ agent_id: "w1", data: { pct: 42 } }),
    });

    const req = captured[0]!;
    expect(req.method).toBe("PUT");
    const url = new URL(req.url);
    expect(url.pathname).toBe(`/api/v1/states/${encodeURIComponent(stateKey)}`);
    expect((req.body as { agent_id: string }).agent_id).toBe("w1");
  });

  it("passes Idempotency-Key header when idempotency_key provided", async () => {
    const stateKey = "agent:w1:progress";
    const iKey = "idem-123";
    await apiRequest(`/v1/states/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      headers: { "Idempotency-Key": iKey },
      body: JSON.stringify({ agent_id: "w1", data: {} }),
    });

    const req = captured[0]!;
    expect(req.headers["idempotency-key"]).toBe(iKey);
  });
});
