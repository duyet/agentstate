import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentState, AgentStateError } from "../src/index";

/** Mock global fetch to return a fixed status/body (optionally non-JSON). */
function mockFetchReturning(status: number, body: string, contentType?: string) {
  return vi.fn(async () => {
    const headers: Record<string, string> = {};
    if (contentType) headers["content-type"] = contentType;
    return new Response(body, { status, headers });
  });
}

/** Await a promise that must reject, returning the thrown error. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

describe("non-JSON error bodies (#331)", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("surfaces raw text when the error body is not JSON", async () => {
    const html = "<html><body>Bad Gateway</body></html>";
    globalThis.fetch = mockFetchReturning(502, html, "text/html") as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", maxRetries: 0 });
    const error = (await captureError(client.getConversation("conv_1"))) as AgentStateError;

    expect(error).toBeInstanceOf(AgentStateError);
    expect(error.message).toBe(`API error 502: ${html}`);
    expect(error.code).toBe("UNKNOWN");
    expect(error.status).toBe(502);
  });

  it("keeps the plain status message for an empty error body", async () => {
    globalThis.fetch = mockFetchReturning(502, "") as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", maxRetries: 0 });
    const error = (await captureError(client.getConversation("conv_1"))) as AgentStateError;

    expect(error).toBeInstanceOf(AgentStateError);
    expect(error.message).toBe("API error 502");
    expect(error.code).toBe("UNKNOWN");
    expect(error.status).toBe(502);
  });

  it("still prefers the JSON envelope when present", async () => {
    globalThis.fetch = mockFetchReturning(
      404,
      JSON.stringify({
        error: { code: "CONVERSATION_NOT_FOUND", message: "conv_1 missing" },
      }),
      "application/json",
    ) as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", maxRetries: 0 });
    const error = (await captureError(client.getConversation("conv_1"))) as AgentStateError;

    expect(error).toBeInstanceOf(AgentStateError);
    expect(error.message).toBe("conv_1 missing");
    expect(error.code).toBe("CONVERSATION_NOT_FOUND");
    expect(error.status).toBe(404);
  });

  it("falls back to defaults for JSON bodies without an error envelope", async () => {
    globalThis.fetch = mockFetchReturning(
      500,
      JSON.stringify({ detail: "upstream unavailable" }),
      "application/json",
    ) as typeof globalThis.fetch;

    const client = new AgentState({ apiKey: "as_live_test", maxRetries: 0 });
    const error = (await captureError(client.getConversation("conv_1"))) as AgentStateError;

    expect(error).toBeInstanceOf(AgentStateError);
    expect(error.message).toBe("API error 500");
    expect(error.code).toBe("UNKNOWN");
    expect(error.status).toBe(500);
  });
});
