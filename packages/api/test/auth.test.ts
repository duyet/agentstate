import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
  applyMigrations,
  authHeaders,
  seedProject,
  TEST_API_KEY,
  TEST_KEY_ID,
  TEST_PROJECT_ID,
} from "./setup";

/**
 * Clear any cached auth entry for the test key. Tests that revoke the key
 * directly via env.DB (bypassing the route layer) must call this so the
 * cache-hit path does not authorize a revoked key.
 */
async function clearAuthCache(): Promise<void> {
  if (env.AUTH_CACHE) {
    const encoded = new TextEncoder().encode(TEST_API_KEY);
    const buf = await crypto.subtle.digest("SHA-256", encoded);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await env.AUTH_CACHE.delete(`auth:hash:${hash}`);
  }
}

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
    // Clear any cached entry first so we exercise the DB-check path.
    await clearAuthCache();

    // Revoke the key directly in D1 (bypasses the route, so clear cache manually)
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
    // Create a dedicated key so revoking it does not disturb the shared test key.
    const createRes = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "cache-invalidation-test" }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json<{ id: string; key: string }>();

    // Seed the auth cache with a successful request using the new key.
    const firstResponse = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${created.key}` },
    });
    expect(firstResponse.status).toBe(200);

    // Revoke the key VIA THE ROUTE — this must invalidate the cache entry.
    const revokeRes = await SELF.fetch(
      `http://localhost/api/projects/${TEST_PROJECT_ID}/keys/${created.id}`,
      { method: "DELETE", headers: authHeaders() },
    );
    expect(revokeRes.status).toBe(204);

    // The next request should be 401 even though the key's cache entry existed.
    const secondResponse = await SELF.fetch("http://localhost/v1/conversations", {
      headers: { Authorization: `Bearer ${created.key}` },
    });
    expect(secondResponse.status).toBe(401);
  });

  it("prevents timing attacks by adding constant delay to auth failures", async () => {
    const measure = async (init?: RequestInit): Promise<number> => {
      const start = performance.now();
      await SELF.fetch("http://localhost/v1/conversations", init);
      return performance.now() - start;
    };

    const median = async (init?: RequestInit): Promise<number> => {
      const samples = [];
      for (let i = 0; i < 3; i++) {
        samples.push(await measure(init));
      }
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    };

    const durationNoHeader = await median();
    const durationInvalidKey = await median({
      headers: { Authorization: "Bearer invalid_key_12345" },
    });
    const durationEmptyKey = await median({
      headers: { Authorization: "Bearer " },
    });

    const failureDurations = [durationNoHeader, durationInvalidKey, durationEmptyKey];
    const minFailureDuration = Math.min(...failureDurations);
    const maxFailureDuration = Math.max(...failureDurations);

    // The middleware currently pads auth failures to 300ms. Keep the assertion far enough
    // below the exact floor for CI/workerd timer variance while still catching a missing delay.
    expect(minFailureDuration).toBeGreaterThanOrEqual(200);

    // Failure paths should stay close enough that missing, empty, and invalid keys
    // cannot be cleanly separated by request duration. CI can still add noise, so this
    // checks for broad regressions instead of assuming a precise wall-clock envelope.
    expect(maxFailureDuration - minFailureDuration).toBeLessThan(200);

    // Successful auth should be faster (no delay)
    const durationValidKey = await measure({
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });

    // Valid request should be faster because it does not take the failure-delay path.
    expect(durationValidKey).toBeLessThan(minFailureDuration);
  }, 10_000);
});
