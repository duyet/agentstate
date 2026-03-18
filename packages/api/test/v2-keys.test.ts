import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface ApiKey {
  key_id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key?: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

interface ListResponse<T> {
  data: T[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createKeyV2(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/api/v2/keys", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

async function listKeysV2() {
  const res = await SELF.fetch("http://localhost/api/v2/keys", {
    headers: authHeaders(),
  });
  return res;
}

async function revokeKeyV2(keyId: string) {
  const res = await SELF.fetch(`http://localhost/api/v2/keys/${keyId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("V2 Keys", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create API key
  // -------------------------------------------------------------------------

  describe("POST /api/v2/keys", () => {
    it("creates a new API key", async () => {
      const res = await createKeyV2({ name: "Test Key" });
      expect(res.status).toBe(201);

      const body = await res.json<ApiKey>();
      expect(body.key_id).toBeTruthy();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.name).toBe("Test Key");
      expect(body.key_prefix).toMatch(/^as_live_/);
      expect(body.key).toMatch(/^as_live_[A-Za-z0-9]{40}$/);
      expect(body.created_at).toBeTypeOf("number");
      expect(body.last_used_at).toBeNull();
      expect(body.revoked_at).toBeNull();
    });

    it("creates a key with a long name", async () => {
      const longName = "A".repeat(255);
      const res = await createKeyV2({ name: longName });
      expect(res.status).toBe(201);

      const body = await res.json<ApiKey>();
      expect(body.name).toBe(longName);
    });

    it("returns 400 when name is missing", async () => {
      const res = await createKeyV2({});
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 when name is empty string", async () => {
      const res = await createKeyV2({ name: "" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when name exceeds max length", async () => {
      const res = await createKeyV2({ name: "A".repeat(256) });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      });
      expect(res.status).toBe(401);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await createKeyV2({ name: "No Deprecation" });
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List API keys
  // -------------------------------------------------------------------------

  describe("GET /api/v2/keys", () => {
    it("lists all API keys for the project", async () => {
      // Create a test key first
      await createKeyV2({ name: "List Test Key" });

      const res = await listKeysV2();
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<ApiKey>>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Verify response shape
      const key = body.data.find((k) => k.name === "List Test Key");
      expect(key).toBeDefined();
      expect(key?.key_id).toBeTruthy();
      expect(key?.project_id).toBe(TEST_PROJECT_ID);
      expect(key?.key_prefix).toMatch(/^as_live_/);
      expect(key?.created_at).toBeTypeOf("number");
      // List should NOT include the raw key
      expect("key" in key!).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/keys");
      expect(res.status).toBe(401);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await listKeysV2();
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Revoke API key
  // -------------------------------------------------------------------------

  describe("DELETE /api/v2/keys/:id", () => {
    it("revokes an API key", async () => {
      // Create a key to revoke
      const createRes = await createKeyV2({ name: "Revoke Me" });
      const created = await createRes.json<ApiKey>();

      const res = await revokeKeyV2(created.key_id);
      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
    });

    it("returns 404 for a non-existent key", async () => {
      const res = await revokeKeyV2("does_not_exist_id");
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/keys/any_id", {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // V1 deprecation headers
  // -------------------------------------------------------------------------

  describe("V1 Deprecation Headers", () => {
    it("adds deprecation headers to V1 keys endpoints", async () => {
      const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
      expect(res.headers.get("Sunset")).toBe("2026-12-31");
      expect(res.headers.get("Link")).toContain("deprecation");
    });
  });
});
