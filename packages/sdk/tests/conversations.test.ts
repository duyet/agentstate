import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentState } from "../src/index";

type CapturedRequest = {
  method: string;
  url: string;
};

function createFetchMock(captured: CapturedRequest[]) {
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    captured.push({
      method: (request.method || "GET").toUpperCase(),
      url: request.url,
    });
    return new Response(
      JSON.stringify({ data: [], pagination: { limit: 0, next_cursor: null } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
}

describe("listConversations", () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: CapturedRequest[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = createFetchMock(captured) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("forwards the tag filter as a query param", async () => {
    const client = new AgentState({ apiKey: "as_live_test123" });

    await client.listConversations({ tag: "user:abc" });

    expect(captured).toHaveLength(1);
    const url = new URL(captured[0]!.url);
    expect(url.pathname).toBe("/api/v1/conversations");
    // URLSearchParams percent-encodes the ":" in the raw query string.
    expect(url.search).toContain("tag=user%3Aabc");
    // Decoded value round-trips to the exact tag.
    expect(url.searchParams.get("tag")).toBe("user:abc");
  });

  it("omits the tag param when not provided", async () => {
    const client = new AgentState({ apiKey: "as_live_test123" });

    await client.listConversations({ limit: 10 });

    const url = new URL(captured[0]!.url);
    expect(url.searchParams.has("tag")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("issues a plain request with no query when called without params", async () => {
    const client = new AgentState({ apiKey: "as_live_test123" });

    await client.listConversations();

    const url = new URL(captured[0]!.url);
    expect(url.search).toBe("");
  });
});
