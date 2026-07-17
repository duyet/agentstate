import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { effectiveKeyScopes, scopeSatisfies, scopesSatisfyAll } from "../src/lib/scopes";
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

async function createKeyWithId(scopes?: string[]): Promise<{ id: string; key: string }> {
  const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: "scoped-cache", ...(scopes ? { scopes } : {}) }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { id: string; key: string };
  return body;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
});

describe("scopedAuth timing (plan 009: pad scope-denied like auth failures)", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("pads a scope-denied 403 to the same ~300ms floor as an auth failure, and stays faster on success", async () => {
    const limited = await createKey(["conversations:read"]); // lacks lease:write
    const leaseKey = await createKey(["lease:write"]);

    const measure = async (init: RequestInit, stateKey: string): Promise<number> => {
      const start = performance.now();
      await SELF.fetch(`http://localhost/api/v1/states/${stateKey}/lease`, init);
      return performance.now() - start;
    };

    const scopeDeniedDurations: number[] = [];
    for (let i = 0; i < 3; i++) {
      scopeDeniedDurations.push(
        await measure(
          {
            method: "POST",
            headers: bearer(limited),
            body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
          },
          `timing-scope-denied-${i}`,
        ),
      );
    }
    scopeDeniedDurations.sort((a, b) => a - b);
    const medianScopeDenied = scopeDeniedDurations[1];

    // Same floor as auth.test.ts asserts for authFailure (AUTH_FAILURE_MIN_MS = 300).
    expect(medianScopeDenied).toBeGreaterThanOrEqual(200);

    const successDuration = await measure(
      {
        method: "POST",
        headers: bearer(leaseKey),
        body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
      },
      "timing-scope-allowed",
    );
    expect(successDuration).toBeLessThan(medianScopeDenied);
  }, 10_000);
});

describe("scopedAuth shares the AUTH_CACHE with apiKeyAuth (issue #343)", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("populates the shared auth:hash:<hash> cache entry after a scopedAuth request", async () => {
    const created = await createKeyWithId();
    const hash = await sha256Hex(created.key);
    if (env.AUTH_CACHE) await env.AUTH_CACHE.delete(`auth:hash:${hash}`);

    const res = await SELF.fetch("http://localhost/api/v1/states/cache-populate-check/lease", {
      method: "POST",
      headers: bearer(created.key),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect([200, 201]).toContain(res.status);

    const cached = await env.AUTH_CACHE.get(`auth:hash:${hash}`, "text");
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached as string);
    expect(parsed.projectId).toBe(TEST_PROJECT_ID);
  });

  it("a cache-hit request via scopedAuth still respects the granted scopes", async () => {
    // Regression guard for the cache-hit branch added for issue #343: caching
    // must not bypass scope enforcement (only the DB round-trip is skipped).
    const limited = await createKeyWithId(["conversations:read"]);

    // First request (DB path) populates the cache with the limited scope set.
    const first = await SELF.fetch("http://localhost/api/v1/states/cache-scope-check/lease", {
      method: "POST",
      headers: bearer(limited.key),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect(first.status).toBe(403);

    // Second request (cache-hit path) must still be denied for the same reason.
    const second = await SELF.fetch("http://localhost/api/v1/states/cache-scope-check-2/lease", {
      method: "POST",
      headers: bearer(limited.key),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect(second.status).toBe(403);
  });

  it("revoking a key via the route invalidates the cache entry scopedAuth wrote", async () => {
    const created = await createKeyWithId();

    // First request via the scoped-auth code path populates AUTH_CACHE.
    const first = await SELF.fetch("http://localhost/api/v1/states/cache-revoke-check/lease", {
      method: "POST",
      headers: bearer(created.key),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect([200, 201]).toContain(first.status);

    // Revoke through the route — this calls invalidateAuthCacheEntries, which
    // must clear the entry scopedAuth (not just apiKeyAuth) wrote.
    const revokeRes = await SELF.fetch(
      `http://localhost/api/projects/${TEST_PROJECT_ID}/keys/${created.id}`,
      { method: "DELETE", headers: authHeaders() },
    );
    expect(revokeRes.status).toBe(204);

    const second = await SELF.fetch("http://localhost/api/v1/states/cache-revoke-check-2/lease", {
      method: "POST",
      headers: bearer(created.key),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 30_000 }),
    });
    expect(second.status).toBe(401);
  });
});
