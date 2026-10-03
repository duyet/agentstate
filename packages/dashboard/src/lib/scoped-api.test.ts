import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";
import { ApiError } from "./api";
import { apiScoped, clearDebugKey, getDebugKey, maskKey, setDebugKey } from "./scoped-api";

const PROJECT_ID = "proj_test";

let window: Window;
let fetchMock: ReturnType<typeof mock>;

beforeEach(() => {
  window = new Window({ url: "http://localhost:4321/dashboard/" });
  Object.assign(globalThis, {
    window,
    document: window.document,
    localStorage: window.localStorage,
  });
  fetchMock = mock(async () => new Response("{}", { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  clearDebugKey(PROJECT_ID);
  mock.restore();
});

describe("debug key storage", () => {
  it("round-trips a key per project and clears it", () => {
    expect(getDebugKey(PROJECT_ID)).toBeNull();
    setDebugKey(PROJECT_ID, "  as_live_abc123  ");
    // stored trimmed
    expect(getDebugKey(PROJECT_ID)).toBe("as_live_abc123");
    setDebugKey("proj_other", "as_live_other");
    expect(getDebugKey("proj_other")).toBe("as_live_other");
    clearDebugKey(PROJECT_ID);
    expect(getDebugKey(PROJECT_ID)).toBeNull();
    // clearing one project leaves the other intact
    expect(getDebugKey("proj_other")).toBe("as_live_other");
    clearDebugKey("proj_other");
  });

  it("returns null without a project id", () => {
    expect(getDebugKey(null)).toBeNull();
    expect(getDebugKey(undefined)).toBeNull();
    expect(getDebugKey("")).toBeNull();
  });

  it("masks keys keeping prefix and tail", () => {
    expect(maskKey("as_live_abcdefghijklmnop")).toBe("as_live_…mnop");
    expect(maskKey("short")).toBe("••••••");
  });
});

describe("apiScoped", () => {
  it("attaches the stored key as a Bearer header", async () => {
    setDebugKey(PROJECT_ID, "as_live_secret");
    await apiScoped<object>(PROJECT_ID, "/v1/states?limit=10");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("/api/v1/states?limit=10");
    expect(init.headers.Authorization).toBe("Bearer as_live_secret");
    expect(init.credentials).toBe("include");
  });

  it("throws a guidance error when no key is connected", async () => {
    let thrown: unknown;
    try {
      await apiScoped<object>(PROJECT_ID, "/v1/claims");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).message).toMatch(/Connect an API key/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the server error message and status", async () => {
    setDebugKey(PROJECT_ID, "as_live_bad");
    fetchMock = mock(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "FORBIDDEN", message: "Missing required scope: state:read" },
          }),
          { status: 403 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let thrown: unknown;
    try {
      await apiScoped<object>(PROJECT_ID, "/v1/states/query", {
        method: "POST",
        body: JSON.stringify({ limit: 10 }),
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(403);
    expect((thrown as ApiError).message).toBe("Missing required scope: state:read");
  });
});
