import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_API_KEY } from "./setup";

// ---------------------------------------------------------------------------
// Rate limiting on the coordination surface (states, leases, claims, MCP).
// These routers previously had no limiter; this suite confirms the limiter
// is wired in and triggers a 429 with the standard error envelope once the
// per-key window is exceeded, mirroring the assertions in rate-limit.test.ts
// but exercised against the newly-wired routes instead of /v1/conversations.
// ---------------------------------------------------------------------------

const TEST_RATE_LIMIT = 10000;

async function computeSHA256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Seed the rate_limits table so the key is already at the limit for the current window. */
async function exhaustRateLimit(): Promise<void> {
  await env.DB.prepare("DELETE FROM rate_limits").run();
  const keyHash = await computeSHA256Hex(TEST_API_KEY);
  const now = Date.now();
  const windowStart = now - (now % 60_000);
  await env.DB.prepare(
    `INSERT INTO rate_limits (id, api_key_hash, window_start, request_count, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind("rl_coord_test", keyHash, windowStart, TEST_RATE_LIMIT, now)
    .run();
}

describe("Coordination routes rate limiting", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("PUT /api/v1/states/:state_key returns 429 past the limit", async () => {
    await exhaustRateLimit();

    const res = await SELF.fetch("http://localhost/api/v1/states/rate-limit-test", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ agent_id: "agent-a", data: { status: "draft" } }),
    });

    expect(res.status).toBe(429);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("PUT /api/v1/states/:state_key succeeds when under the limit", async () => {
    await env.DB.prepare("DELETE FROM rate_limits").run();

    const res = await SELF.fetch("http://localhost/api/v1/states/rate-limit-ok", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ agent_id: "agent-a", data: { status: "draft" } }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });

  it("POST /api/v1/leases/:id/renew returns 429 past the limit", async () => {
    await exhaustRateLimit();

    const res = await SELF.fetch("http://localhost/api/v1/leases/some-lease-id/renew", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ttl_ms: 30_000 }),
    });

    expect(res.status).toBe(429);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("POST /api/v1/claims returns 429 past the limit", async () => {
    await exhaustRateLimit();

    const res = await SELF.fetch("http://localhost/api/v1/claims", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        subject_type: "test",
        subject_id: "subject-1",
        statement: "test statement",
        evidence: [{ kind: "text_hash", source: "test", data: "x", hash: "0".repeat(64) }],
      }),
    });

    expect(res.status).toBe(429);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("POST /api/mcp tools/call returns the JSON-RPC result with a 429 HTTP status past the limit", async () => {
    await exhaustRateLimit();

    const res = await SELF.fetch("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });

    expect(res.status).toBe(429);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
