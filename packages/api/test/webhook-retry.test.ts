import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendWebhookWithRetry } from "../src/lib/webhook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sendWebhookWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("succeeds on the first attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendWebhookWithRetry("https://example.com/hook", "test-secret", '{"a":1}');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["User-Agent"]).toBe("AgentState-Webhooks/1.0");
    expect(init.headers["X-AgentState-Signature"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retries once then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendWebhookWithRetry("https://example.com/hook", "test-secret", "{}");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries on persistent 5xx responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(500));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendWebhookWithRetry("https://example.com/hook", "test-secret", "{}");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe("HTTP 500");
    expect(result.attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("exhausts retries on a thrown network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendWebhookWithRetry("https://example.com/hook", "test-secret", "{}");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toBe("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("short-circuits for an unsafe URL without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWebhookWithRetry("http://127.0.0.1/hook", "test-secret", "{}");

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
