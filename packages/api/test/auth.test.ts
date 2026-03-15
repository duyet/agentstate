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
});
