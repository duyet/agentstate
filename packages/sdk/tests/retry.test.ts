import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentState, AgentStateError } from "../src/index";

type MockResponse = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

function makeSequencedFetch(responses: MockResponse[]) {
  let call = 0;
  return vi.fn(async () => {
    const spec = responses[Math.min(call, responses.length - 1)]!;
    call += 1;
    return new Response(JSON.stringify(spec.body ?? {}), {
      status: spec.status,
      headers: { "content-type": "application/json", ...(spec.headers ?? {}) },
    });
  });
}

describe("SDK retry policy", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("retries idempotent GET requests on 5xx until success", async () => {
    const fetchMock = makeSequencedFetch([
      { status: 500 },
      { status: 500 },
      { status: 200, body: { id: "conv_1", messages: [] } },
    ]);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", retryDelayMs: 1 });
    const result = await client.getConversation("conv_1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ id: "conv_1" });
  });

  it("retries idempotent PUT (upsertState) on 5xx", async () => {
    const fetchMock = makeSequencedFetch([
      { status: 500 },
      { status: 200, body: { state_key: "k", agent_id: "a", data: {} } },
    ]);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", retryDelayMs: 1 });
    await client.upsertState("k", { agent_id: "a", data: {} });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-idempotent POST without an idempotency key", async () => {
    const fetchMock = makeSequencedFetch([
      { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    ]);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", retryDelayMs: 1 });

    await expect(client.createConversation({ title: "x" })).rejects.toBeInstanceOf(AgentStateError);
    // POST is not replayed — a single attempt only.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("honors Retry-After on 429 and eventually succeeds for GET", async () => {
    const fetchMock = makeSequencedFetch([
      { status: 429, headers: { "Retry-After": "0" } },
      { status: 200, body: { id: "conv_1", messages: [] } },
    ]);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", retryDelayMs: 1 });
    const result = await client.getConversation("conv_1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ id: "conv_1" });
  });
});
