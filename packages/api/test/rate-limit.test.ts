import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders, TEST_API_KEY } from "./setup";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Rate Limiting", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // Rate limit headers
  // -------------------------------------------------------------------------

  it("includes rate limit headers in the response", async () => {
    const res = await SELF.fetch("http://localhost/v1/conversations", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);

    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("X-RateLimit-Remaining decrements on each request", async () => {
    // Clear rate limit table to get a clean state
    await env.DB.prepare("DELETE FROM rate_limits").run();

    const res1 = await SELF.fetch("http://localhost/v1/conversations", {
      headers: authHeaders(),
    });
    const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining"));

    const res2 = await SELF.fetch("http://localhost/v1/conversations", {
      headers: authHeaders(),
    });
    const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining"));

    // The second request should have fewer remaining than the first
    expect(remaining2).toBeLessThan(remaining1);
    expect(remaining1 - remaining2).toBe(1);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    // Clear rate limit table for a clean test
    await env.DB.prepare("DELETE FROM rate_limits").run();

    // Compute the key hash to seed the rate_limits table directly.
    // This avoids making 100+ real requests.
    const keyHash = await computeSHA256Hex(TEST_API_KEY);
    const now = Date.now();
    const windowStart = now - (now % 60_000);

    // Insert a rate limit row at the limit (100 requests already consumed)
    await env.DB.prepare(
      `INSERT INTO rate_limits (id, api_key_hash, window_start, request_count, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind("rl_test_429", keyHash, windowStart, 100, now)
      .run();

    // The next request should be over the limit (count becomes 101 > 100)
    const res = await SELF.fetch("http://localhost/v1/conversations", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(429);

    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("resets rate limit in a new window", async () => {
    // Clear rate limit table
    await env.DB.prepare("DELETE FROM rate_limits").run();

    // Insert a stale rate limit row from a past window (2 minutes ago)
    const keyHash = await computeSHA256Hex(TEST_API_KEY);
    const pastWindow = Date.now() - 120_000;
    const pastWindowStart = pastWindow - (pastWindow % 60_000);

    await env.DB.prepare(
      `INSERT INTO rate_limits (id, api_key_hash, window_start, request_count, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind("rl_test_reset", keyHash, pastWindowStart, 100, pastWindow)
      .run();

    // Request in the current window should succeed (new window, count = 1)
    const res = await SELF.fetch("http://localhost/v1/conversations", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    expect(Number(res.headers.get("X-RateLimit-Remaining"))).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

async function computeSHA256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
