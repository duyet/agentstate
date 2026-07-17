import { env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import { apiKeys } from "../src/db/schema";
import { buildApiKey } from "../src/lib/api-key";
import { effectiveKeyScopes, scopeSatisfies, scopesSatisfyAll } from "../src/lib/scopes";
import { createApiKey } from "../src/services/keys";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

function bearer(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function createKey(scopes?: string[]): Promise<string> {
  const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
    method: "POST",
    headers: authHeaders(), // full-access seeded key
    body: JSON.stringify({ name: "scoped", ...(scopes ? { scopes } : {}) }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { key: string; scopes: string[] | null };
  return body.key;
}

describe("scope helpers", () => {
  it("scopeSatisfies honors exact, global, and resource wildcards", () => {
    expect(scopeSatisfies(["conversations:read"], "conversations:read")).toBe(true);
    expect(scopeSatisfies(["conversations:read"], "conversations:write")).toBe(false);
    expect(scopeSatisfies(["*"], "anything:read")).toBe(true);
    expect(scopeSatisfies(["state:*"], "state:write")).toBe(true);
    expect(scopeSatisfies(["state:*"], "conversations:write")).toBe(false);
  });

  it("scopesSatisfyAll enforces subset/delegation", () => {
    expect(scopesSatisfyAll(["*"], ["conversations:write", "state:read"])).toBe(true);
    expect(scopesSatisfyAll(["conversations:read"], ["conversations:read"])).toBe(true);
    expect(scopesSatisfyAll(["conversations:read"], ["conversations:write"])).toBe(false);
    // Cannot widen a concrete grant into a resource wildcard.
    expect(scopesSatisfyAll(["state:read"], ["state:*"])).toBe(false);
  });

  it("effectiveKeyScopes: null/undefined → full access, explicit list honored", () => {
    expect(effectiveKeyScopes(null)).toEqual(["*"]);
    expect(effectiveKeyScopes(undefined)).toEqual(["*"]);
    // An explicit empty list grants nothing — it never silently becomes full access.
    expect(effectiveKeyScopes("[]")).toEqual([]);
    expect(effectiveKeyScopes('["conversations:read"]')).toEqual(["conversations:read"]);
  });
});

describe("buildApiKey / createApiKey: undefined vs. explicit [] scopes", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("buildApiKey: omitted (undefined) scopes persist as null (legacy full access)", async () => {
    const key = await buildApiKey(TEST_PROJECT_ID, "legacy", undefined);
    expect(key.values.scopes).toBeNull();
  });

  it("buildApiKey: an explicit empty array persists as '[]', never null", async () => {
    // Regression: this used to collapse to null, which effectiveKeyScopes(null)
    // resolves to full access ("*") — the opposite of "no permissions".
    const key = await buildApiKey(TEST_PROJECT_ID, "no-access", []);
    expect(key.values.scopes).toBe("[]");
    expect(key.values.scopes).not.toBeNull();
    expect(effectiveKeyScopes(key.values.scopes)).toEqual([]);
  });

  it("buildApiKey: a non-empty list persists as-is", async () => {
    const key = await buildApiKey(TEST_PROJECT_ID, "scoped", ["conversations:read"]);
    expect(key.values.scopes).toBe('["conversations:read"]');
  });

  it("createApiKey: explicit empty scopes are stored and reported as [] (not full access)", async () => {
    const db = drizzle(env.DB);
    const created = await createApiKey(db, TEST_PROJECT_ID, "no-access-key", []);
    expect(created.scopes).toEqual([]);

    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, created.id));
    expect(row?.scopes).toBe("[]");
    expect(effectiveKeyScopes(row?.scopes)).toEqual([]);
  });

  it("createApiKey: omitted scopes remain full access (null), not conflated with []", async () => {
    const db = drizzle(env.DB);
    const created = await createApiKey(db, TEST_PROJECT_ID, "full-access-key", undefined);
    expect(created.scopes).toBeNull();

    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, created.id));
    expect(row?.scopes).toBeNull();
    expect(effectiveKeyScopes(row?.scopes)).toEqual(["*"]);
  });
});

describe("API key scope enforcement", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("legacy/unscoped key has full access", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/conversations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "full access" }),
    });
    expect(res.status).toBe(201);
  });

  it("scoped key is allowed in-scope and forbidden out-of-scope", async () => {
    const readOnly = await createKey(["conversations:read"]);

    const listRes = await SELF.fetch("http://localhost/api/v1/conversations", {
      headers: bearer(readOnly),
    });
    expect(listRes.status).toBe(200);

    const writeRes = await SELF.fetch("http://localhost/api/v1/conversations", {
      method: "POST",
      headers: bearer(readOnly),
      body: JSON.stringify({ title: "should fail" }),
    });
    expect(writeRes.status).toBe(403);
    await expect(writeRes.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("a key cannot mint a child key beyond its own scopes", async () => {
    // This key can read conversations and manage keys, but cannot write conversations.
    const limited = await createKey(["conversations:read", "keys:write"]);

    const overReach = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: bearer(limited),
      body: JSON.stringify({ name: "child", scopes: ["conversations:write"] }),
    });
    expect(overReach.status).toBe(403);

    const inBounds = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: bearer(limited),
      body: JSON.stringify({ name: "child", scopes: ["conversations:read"] }),
    });
    expect(inBounds.status).toBe(201);
    const created = (await inBounds.json()) as { scopes: string[] | null };
    expect(created.scopes).toEqual(["conversations:read"]);
  });

  it("omitting scopes makes a child inherit the caller's scopes (no escalation)", async () => {
    const limited = await createKey(["conversations:read", "keys:write"]);

    const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: bearer(limited),
      body: JSON.stringify({ name: "inherited" }), // no scopes field
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { key: string; scopes: string[] | null };
    // Inherits the caller's scopes rather than escalating to full access (null).
    expect(created.scopes).toEqual(["conversations:read", "keys:write"]);

    // The inherited child cannot write conversations (a scope it never had).
    const writeRes = await SELF.fetch("http://localhost/api/v1/conversations", {
      method: "POST",
      headers: bearer(created.key),
      body: JSON.stringify({ title: "should fail" }),
    });
    expect(writeRes.status).toBe(403);
  });

  it("a key without keys:write cannot create keys", async () => {
    const noKeyScope = await createKey(["conversations:read"]);
    const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
      method: "POST",
      headers: bearer(noKeyScope),
      body: JSON.stringify({ name: "nope" }),
    });
    expect(res.status).toBe(403);
  });

  it("a key scoped to lease:write can use the leases route (singular scope alignment)", async () => {
    // Regression: the lease/claim scopes are singular (lease:write/claim:write)
    // across keys, capability tokens, and the v2 route guards. A key granted
    // lease:write must NOT be rejected by scopedAuth({ scope: "lease:write" }).
    const leaseKey = await createKey(["lease:write"]);
    const res = await SELF.fetch("http://localhost/api/v1/states/regression-lock/lease", {
      method: "POST",
      headers: bearer(leaseKey),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect(res.status).not.toBe(403);
    expect([200, 201]).toContain(res.status);
  });

  describe("/api/v1/claims — claim:read / claim:write separation (#348)", () => {
    async function createClaimWithFullAccessKey(): Promise<string> {
      const transcript = `claim-scope-test-${Date.now()}`;
      const encoded = new TextEncoder().encode(transcript);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res = await SELF.fetch("http://localhost/api/v1/claims", {
        method: "POST",
        headers: authHeaders(), // full-access seeded key
        body: JSON.stringify({
          subject_type: "conversation",
          subject_id: "claim-scope-subject",
          statement: "Scope test claim",
          evidence: [{ kind: "text_hash", source: "transcript:1", data: transcript, hash }],
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string };
      return body.id;
    }

    it("a key scoped only to claim:read can list and get claims", async () => {
      const claimId = await createClaimWithFullAccessKey();
      const readOnly = await createKey(["claim:read"]);

      const listRes = await SELF.fetch("http://localhost/api/v1/claims", {
        headers: bearer(readOnly),
      });
      expect(listRes.status).toBe(200);

      const getRes = await SELF.fetch(`http://localhost/api/v1/claims/${claimId}`, {
        headers: bearer(readOnly),
      });
      expect(getRes.status).toBe(200);
    });

    it("a key scoped only to claim:read cannot create or verify claims", async () => {
      const claimId = await createClaimWithFullAccessKey();
      const readOnly = await createKey(["claim:read"]);

      const createRes = await SELF.fetch("http://localhost/api/v1/claims", {
        method: "POST",
        headers: bearer(readOnly),
        body: JSON.stringify({
          subject_type: "conversation",
          subject_id: "should-fail",
          statement: "Should fail",
          evidence: [{ kind: "text_hash", source: "s", data: "d", hash: "0".repeat(64) }],
        }),
      });
      expect(createRes.status).toBe(403);

      const verifyRes = await SELF.fetch(`http://localhost/api/v1/claims/${claimId}/verify`, {
        method: "POST",
        headers: bearer(readOnly),
      });
      expect(verifyRes.status).toBe(403);
    });

    it("a key scoped only to claim:write can still create and verify claims", async () => {
      // Regression guard: introducing claim:read must not regress the
      // existing claim:write-only workflow (create + verify).
      const writeOnly = await createKey(["claim:write"]);
      const transcript = "write-only-claim-workflow";
      const encoded = new TextEncoder().encode(transcript);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const createRes = await SELF.fetch("http://localhost/api/v1/claims", {
        method: "POST",
        headers: bearer(writeOnly),
        body: JSON.stringify({
          subject_type: "conversation",
          subject_id: "write-only-subject",
          statement: "Write-only workflow still works",
          evidence: [{ kind: "text_hash", source: "transcript:1", data: transcript, hash }],
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };

      const verifyRes = await SELF.fetch(`http://localhost/api/v1/claims/${created.id}/verify`, {
        method: "POST",
        headers: bearer(writeOnly),
      });
      expect(verifyRes.status).toBe(201);
    });

    it("claim:write does NOT imply claim:read (explicit design decision)", async () => {
      // Decision: claim:write and claim:read are independent, mirroring how
      // conversations:write/state:write do not imply their :read counterparts
      // elsewhere in this scope set. A caller needing both must request both
      // scopes (or claim:*) explicitly.
      const claimId = await createClaimWithFullAccessKey();
      const writeOnly = await createKey(["claim:write"]);

      const listRes = await SELF.fetch("http://localhost/api/v1/claims", {
        headers: bearer(writeOnly),
      });
      expect(listRes.status).toBe(403);

      const getRes = await SELF.fetch(`http://localhost/api/v1/claims/${claimId}`, {
        headers: bearer(writeOnly),
      });
      expect(getRes.status).toBe(403);
    });

    it("a key without any claim scope cannot access claim routes", async () => {
      const noScope = await createKey(["conversations:read"]);
      const res = await SELF.fetch("http://localhost/api/v1/claims", {
        headers: bearer(noScope),
      });
      expect(res.status).toBe(403);
    });
  });
});
