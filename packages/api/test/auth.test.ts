import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, seedProject, TEST_API_KEY, TEST_KEY_ID } from "./setup";

describe("Authentication", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const response = await SELF.fetch("http://localhost/v1/conversations");
    expect(response.status).toBe(401);

    const body = await response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Bearer token is empty", async () => {
    const response = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: "Bearer " },
    });
    expect(response.status).toBe(401);

    const body = await response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Bearer token is invalid", async () => {
    const response = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: "Bearer sk_live_invalid_key_that_does_not_exist" },
    });
    expect(response.status).toBe(401);

    const body = await response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when key has been revoked", async () => {
    // Revoke the key directly in D1
    await env.DB.exec(
      `UPDATE api_keys SET revoked_at = ${Date.now()} WHERE id = '${TEST_KEY_ID}';`,
    );

    const response = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(response.status).toBe(401);

    // Restore the key for subsequent tests in this file
    await env.DB.exec(`UPDATE api_keys SET revoked_at = NULL WHERE id = '${TEST_KEY_ID}';`);
  });

  it("returns 200 with a valid API key", async () => {
    const response = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(response.status).toBe(200);
  });

  it("returns 401 when key has been revoked and was previously cached", async () => {
    // First, make a successful request to populate the cache
    const firstResponse = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(firstResponse.status).toBe(200);

    // Now revoke the key
    await env.DB.exec(
      `UPDATE api_keys SET revoked_at = ${Date.now()} WHERE id = '${TEST_KEY_ID}';`,
    );

    // The next request should fail even though the key was cached
    // This tests that the cache poisoning fix is working
    const secondResponse = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(secondResponse.status).toBe(401);

    // Restore the key for subsequent tests
    await env.DB.exec(`UPDATE api_keys SET revoked_at = NULL WHERE id = '${TEST_KEY_ID}';`);
  });

  it("prevents timing attacks by adding constant delay to auth failures", async () => {
    const measure = async (init?: RequestInit): Promise<number> => {
      const start = performance.now();
      await SELF.fetch("http://localhost/v1/conversations", init);
      return performance.now() - start;
    };

    const fastest = async (init?: RequestInit): Promise<number> => {
      const samples = [];
      for (let i = 0; i < 5; i++) {
        samples.push(await measure(init));
      }
      return Math.min(...samples);
    };

    const durationNoHeader = await fastest();
    const durationInvalidKey = await fastest({
      headers: { Authorization: "Bearer invalid_key_12345" },
    });
    const durationEmptyKey = await fastest({
      headers: { Authorization: "Bearer " },
    });

    // All auth failures should take approximately the same time (within 100ms tolerance)
    // This prevents attackers from enumerating valid key prefixes via timing
    // Tolerance accounts for random jitter (0-50ms) + system load variance
    const maxDiff = 100;
    expect(Math.abs(durationNoHeader - durationInvalidKey)).toBeLessThan(maxDiff);
    expect(Math.abs(durationNoHeader - durationEmptyKey)).toBeLessThan(maxDiff);
    expect(Math.abs(durationInvalidKey - durationEmptyKey)).toBeLessThan(maxDiff);

    // Successful auth should be faster (no delay)
    const durationValidKey = await measure({
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });

    // Valid request should be significantly faster than failed auth
    // Failed auth has 50-100ms delay, valid auth has none
    // Just verify valid auth is faster by at least 10ms (allowing for CI timing variance)
    expect(durationValidKey).toBeLessThan(durationNoHeader - 10);
  });
});
