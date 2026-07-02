import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Scope enforcement for the keyless key-management route (routes/v1-keys.ts,
// mounted at /api/v1/keys). This is the live route a caller uses to create,
// list, and revoke API keys without a projectId in the path — the natural
// target for "can a low-privilege key manage other keys?" (Finding 1: v2
// keys route missing scope enforcement — that unmounted routes/v2/keys/
// router was removed entirely in #228; this is its still-mounted successor).
// ---------------------------------------------------------------------------

function bearer(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function createScopedKey(scopes: string[]): Promise<string> {
  const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
    method: "POST",
    headers: authHeaders(), // full-access seeded key
    body: JSON.stringify({ name: "scoped", scopes }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { key: string };
  return body.key;
}

describe("/api/v1/keys — scope enforcement", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("POST / requires keys:write", async () => {
    const noScope = await createScopedKey(["conversations:read"]);
    const res = await SELF.fetch("http://localhost/api/v1/keys", {
      method: "POST",
      headers: bearer(noScope),
      body: JSON.stringify({ name: "child" }),
    });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("POST / succeeds with keys:write", async () => {
    const withScope = await createScopedKey(["keys:write"]);
    const res = await SELF.fetch("http://localhost/api/v1/keys", {
      method: "POST",
      headers: bearer(withScope),
      body: JSON.stringify({ name: "child" }),
    });
    expect(res.status).toBe(201);
  });

  it("GET / requires keys:read", async () => {
    const noScope = await createScopedKey(["conversations:read"]);
    const res = await SELF.fetch("http://localhost/api/v1/keys", { headers: bearer(noScope) });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("GET / succeeds with keys:read", async () => {
    const withScope = await createScopedKey(["keys:read"]);
    const res = await SELF.fetch("http://localhost/api/v1/keys", { headers: bearer(withScope) });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id requires keys:write", async () => {
    const writer = await createScopedKey(["keys:write"]);
    const created = await SELF.fetch("http://localhost/api/v1/keys", {
      method: "POST",
      headers: bearer(writer),
      body: JSON.stringify({ name: "to-delete" }),
    });
    const { id } = (await created.json()) as { id: string };

    const noScope = await createScopedKey(["conversations:read"]);
    const res = await SELF.fetch(`http://localhost/api/v1/keys/${id}`, {
      method: "DELETE",
      headers: bearer(noScope),
    });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("DELETE /:id succeeds with keys:write", async () => {
    const writer = await createScopedKey(["keys:write"]);
    const created = await SELF.fetch("http://localhost/api/v1/keys", {
      method: "POST",
      headers: bearer(writer),
      body: JSON.stringify({ name: "to-delete" }),
    });
    const { id } = (await created.json()) as { id: string };

    const res = await SELF.fetch(`http://localhost/api/v1/keys/${id}`, {
      method: "DELETE",
      headers: bearer(writer),
    });
    expect(res.status).toBe(204);
  });

  it("keys:read alone cannot create or delete keys (read/write are separate scopes)", async () => {
    const reader = await createScopedKey(["keys:read"]);
    const postRes = await SELF.fetch("http://localhost/api/v1/keys", {
      method: "POST",
      headers: bearer(reader),
      body: JSON.stringify({ name: "x" }),
    });
    expect(postRes.status).toBe(403);

    const deleteRes = await SELF.fetch("http://localhost/api/v1/keys/some_key_id", {
      method: "DELETE",
      headers: bearer(reader),
    });
    expect(deleteRes.status).toBe(403);
  });
});
