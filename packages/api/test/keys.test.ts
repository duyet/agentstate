import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

describe("Key management (/projects/:projectId/keys)", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("returns 401 without authorization", async () => {
    const response = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`);
    expect(response.status).toBe(401);
  });

  it("returns 403 when accessing a different project's keys", async () => {
    const response = await SELF.fetch(`http://localhost/api/projects/other_project_id/keys`, {
      headers: authHeaders(),
    });
    expect(response.status).toBe(403);

    const body = await response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("creates a new key and returns the full key value", async () => {
    const response = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "my-new-key" }),
    });
    expect(response.status).toBe(201);

    const body = await response.json<{
      id: string;
      name: string;
      key_prefix: string;
      key: string;
      created_at: number;
      last_used_at: null;
      revoked_at: null;
    }>();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("my-new-key");
    expect(body.key).toMatch(/^as_live_/);
    expect(body.key_prefix).toBe(body.key.substring(0, 12));
    expect(body.last_used_at).toBeNull();
    expect(body.revoked_at).toBeNull();
  });

  it("returns 400 when name is missing on create", async () => {
    const response = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it("lists keys for the project", async () => {
    const response = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      headers: authHeaders(),
    });
    expect(response.status).toBe(200);

    const body = await response.json<{
      data: Array<{ id: string; name: string; key_prefix: string }>;
    }>();
    expect(Array.isArray(body.data)).toBe(true);
    // At minimum the seed key plus the one created above should be present
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    // Each item should NOT expose the raw key
    for (const key of body.data) {
      expect((key as unknown as Record<string, unknown>).key).toBeUndefined();
      expect(key.key_prefix).toBeTruthy();
    }
  });

  it("revokes a key and returns 204", async () => {
    // Create a key to revoke
    const createRes = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "key-to-revoke" }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json<{ id: string }>();

    // Revoke it
    const revokeRes = await SELF.fetch(
      `http://localhost/api/projects/${TEST_PROJECT_ID}/keys/${created.id}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    expect(revokeRes.status).toBe(204);

    // Verify it appears as revoked in the list
    const listRes = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      headers: authHeaders(),
    });
    const list = await listRes.json<{
      data: Array<{ id: string; revoked_at: number | null }>;
    }>();
    const revokedKey = list.data.find((k) => k.id === created.id);
    expect(revokedKey).toBeDefined();
    expect(revokedKey!.revoked_at).not.toBeNull();
  });
});
