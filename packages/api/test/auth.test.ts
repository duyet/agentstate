import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, TEST_API_KEY, TEST_PROJECT_ID, TEST_KEY_ID } from "./setup";

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
    const startNoHeader = performance.now();
    await SELF.fetch("http://localhost/v1/conversations");
    const durationNoHeader = performance.now() - startNoHeader;

    const startInvalidKey = performance.now();
    await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: "Bearer invalid_key_12345" },
    });
    const durationInvalidKey = performance.now() - startInvalidKey;

    const startEmptyKey = performance.now();
    await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: "Bearer " },
    });
    const durationEmptyKey = performance.now() - startEmptyKey;

    // All auth failures should take approximately the same time (within 20ms tolerance)
    // This prevents attackers from enumerating valid key prefixes via timing
    const maxDiff = 20;
    expect(Math.abs(durationNoHeader - durationInvalidKey)).toBeLessThan(maxDiff);
    expect(Math.abs(durationNoHeader - durationEmptyKey)).toBeLessThan(maxDiff);
    expect(Math.abs(durationInvalidKey - durationEmptyKey)).toBeLessThan(maxDiff);

    // Successful auth should be faster (no delay)
    const startValidKey = performance.now();
    await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    const durationValidKey = performance.now() - startValidKey;

    // Valid request should be significantly faster than failed auth
    expect(durationValidKey).toBeLessThan(durationNoHeader - 30);
  });
});
