/**
 * Coordination primitives — additional edge-case coverage (QUAL-3)
 *
 * Covers three genuinely-missing cases identified after auditing:
 *   - v2-leases-contention.test.ts
 *   - v2-claims.test.ts
 *   - v2-capability-tokens-leases.test.ts
 *
 * Missing cases added here:
 *
 * 1. LEASE TTL EVICTION → RE-ACQUISITION
 *    An expired (but not explicitly released) lease must be treated as free.
 *    createLease filters `expiresAt > now` so a new holder can win the key;
 *    the new fencing_token must be strictly greater than the prior holder's.
 *
 * 2. EXPIRED CAPABILITY TOKEN → 401
 *    scopedAuth checks `expiresAt > now`; a token past its expiry is silently
 *    excluded by the DB query and returns 401 UNAUTHORIZED — identical to a
 *    revoked token from the caller's perspective, but a distinct code branch.
 *
 * 3. RELEASE ALREADY-RELEASED LEASE → 404
 *    releaseLease guards against double-release (releasedAt IS NOT NULL → NOT_FOUND).
 *    Without this test a double-DELETE could silently return 204 and confuse the
 *    holder into thinking it still controls the key when it doesn't.
 *
 * WHY these matter for fleet correctness:
 *   - Case 1: if expired leases block re-acquisition, any crashed worker permanently
 *     locks a state key until manual intervention.
 *   - Case 2: if expired tokens remain valid, short-lived delegation tokens become
 *     permanent credentials once issued — the entire token expiry security model breaks.
 *   - Case 3: if double-release silently returns 204, a split-brain scenario where two
 *     workers both believe they released and the second acquired is undetectable.
 */

import { env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Types (mirrors existing test files)
// ---------------------------------------------------------------------------

interface CapabilityTokenResponse {
  id: string;
  name: string;
  key_prefix: string;
  token: string;
  scopes: string[];
  expires_at: number | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

interface LeaseResponse {
  id: string;
  state_key: string;
  holder: string;
  fencing_token: number;
  expires_at: number;
  created_at: number;
  renewed_at: number;
}

// ---------------------------------------------------------------------------
// Helpers — match patterns from v2-capability-tokens-leases.test.ts and
//           v2-leases-contention.test.ts exactly.
// ---------------------------------------------------------------------------

async function mintCapabilityToken(
  scopes: string[],
  name = "test-token",
  expiresAt?: number,
): Promise<CapabilityTokenResponse> {
  const body: Record<string, unknown> = { name, scopes };
  if (expiresAt !== undefined) body.expires_at = expiresAt;
  const res = await SELF.fetch("http://localhost/api/v1/capability-tokens", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  expect(res.status, `mintCapabilityToken(${scopes.join(",")}) failed`).toBe(201);
  return res.json<CapabilityTokenResponse>();
}

function capTokenHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function acquireLease(
  stateKey: string,
  token: string,
  opts: { holder?: string; ttl_ms?: number } = {},
): Promise<Response> {
  return SELF.fetch(`http://localhost/api/v1/states/${stateKey}/lease`, {
    method: "POST",
    headers: capTokenHeaders(token),
    body: JSON.stringify({ holder: opts.holder ?? "worker-1", ttl_ms: opts.ttl_ms ?? 30_000 }),
  });
}

/**
 * Insert a lease row directly into the DB — mirrors insertLease() in
 * v2-capability-tokens-leases.test.ts.  Allows setting expiresAt to a past
 * timestamp to simulate TTL expiry without real sleeps.
 */
async function insertLeaseRow(input: {
  id: string;
  stateKey: string;
  fencingToken?: number;
  expiresAt?: number;
  releasedAt?: number | null;
}): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO state_leases (
      id, project_id, state_key, holder, fencing_token,
      expires_at, created_at, renewed_at, released_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      TEST_PROJECT_ID,
      input.stateKey,
      "original-holder",
      input.fencingToken ?? 5,
      input.expiresAt ?? now + 60_000,
      now,
      now,
      input.releasedAt ?? null,
    )
    .run();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await applyMigrations();
  await seedProject();
});

beforeEach(async () => {
  // Clean coordination tables between tests; mirrors v2-leases-contention.test.ts
  await env.DB.prepare("DELETE FROM state_leases").run();
  await env.DB.prepare("DELETE FROM capability_tokens").run();
  await env.DB.prepare("DELETE FROM claim_verification_runs").run();
  await env.DB.prepare("DELETE FROM claim_evidence").run();
  await env.DB.prepare("DELETE FROM claims").run();
  await env.DB.prepare("DELETE FROM rate_limits").run();
});

// ---------------------------------------------------------------------------
// 1. Lease TTL eviction: expired lease can be re-acquired by a new holder
// ---------------------------------------------------------------------------

describe("Lease TTL eviction and re-acquisition", () => {
  it("allows a new holder to acquire a state key whose lease has expired (TTL eviction)", async () => {
    // WHY: createLease filters `expiresAt > now` — a lease that has passed its TTL
    // without being explicitly released must be treated as free, otherwise crashed
    // workers permanently lock their state keys.
    const token = await mintCapabilityToken(["lease:write"], "ttl-reacquire");

    // Plant an expired lease for the target state key directly in the DB.
    // fencing_token = 7 so we can verify the new holder gets a strictly higher token.
    await insertLeaseRow({
      id: "lease_expired_for_reacquire",
      stateKey: "state:ttl-eviction",
      fencingToken: 7,
      expiresAt: Date.now() - 5_000, // 5 seconds in the past
    });

    // A new worker should be able to acquire despite the un-released expired lease.
    const res = await acquireLease("state:ttl-eviction", token.token, {
      holder: "new-holder-after-expiry",
      ttl_ms: 30_000,
    });

    expect(res.status).toBe(201);
    const lease = await res.json<LeaseResponse>();
    expect(lease.holder).toBe("new-holder-after-expiry");
    expect(lease.state_key).toBe("state:ttl-eviction");

    // Fencing token must be strictly greater than the expired lease's token.
    // WHY: monotonic fencing tokens let storage reject stale writes from the old holder.
    expect(lease.fencing_token).toBeGreaterThan(7);
    expect(lease.expires_at).toBeGreaterThan(Date.now());
  });

  it("blocks acquisition when an active (non-expired) lease exists on the same key", async () => {
    // WHY: counterpart to the expiry test — ensures the expiry eviction logic does NOT
    // evict leases that are still within their TTL window.
    const token = await mintCapabilityToken(["lease:write"], "ttl-still-active");

    await insertLeaseRow({
      id: "lease_still_active",
      stateKey: "state:ttl-still-active",
      fencingToken: 3,
      expiresAt: Date.now() + 60_000, // still valid
    });

    const res = await acquireLease("state:ttl-still-active", token.token, {
      holder: "intruder-worker",
    });

    expect(res.status).toBe(409);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("LEASE_CONFLICT");
  });
});

// ---------------------------------------------------------------------------
// 2. Expired capability token → 401
// ---------------------------------------------------------------------------

describe("Expired capability token denial", () => {
  it("returns 401 UNAUTHORIZED when a capability token's expires_at is in the past", async () => {
    // WHY: scopedAuth queries `OR(expiresAt IS NULL, expiresAt > now)`.
    // If the token's expiry has passed, the DB returns no row and scopedAuth falls
    // through to authFailure → 401.  Without this test, a regression in the expiry
    // filter would silently make time-limited delegation tokens permanent.
    //
    // We mint a token with expires_at in the past via the management API (which does
    // not validate that expires_at is in the future), then immediately try to use it.
    const expiredToken = await mintCapabilityToken(
      ["lease:write"],
      "expired-token-test",
      Date.now() - 1_000, // already expired when minted
    );

    // Attempt to acquire a lease using the expired token.
    const res = await acquireLease("state:expired-token-attempt", expiredToken.token, {
      holder: "expired-holder",
    });

    expect(res.status).toBe(401);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows a non-expired capability token to authenticate normally", async () => {
    // WHY: negative control — ensures the expiry check only rejects actually-expired
    // tokens and does not accidentally exclude valid tokens.
    const validToken = await mintCapabilityToken(
      ["lease:write"],
      "valid-token-test",
      Date.now() + 600_000, // 10 minutes from now
    );

    const res = await acquireLease("state:valid-token-attempt", validToken.token, {
      holder: "valid-holder",
    });

    expect(res.status).toBe(201);
    const lease = await res.json<LeaseResponse>();
    expect(lease.holder).toBe("valid-holder");
  });
});

// ---------------------------------------------------------------------------
// 3. Double-release of a lease → 404
// ---------------------------------------------------------------------------

describe("Double-release lease protection", () => {
  it("returns 404 NOT_FOUND when attempting to release an already-released lease", async () => {
    // WHY: releaseLease guards against double-release via `releasedAt IS NOT NULL → NOT_FOUND`.
    // Without this test a regression could let a worker silently think it released a lease
    // it no longer holds, creating a split-brain scenario: the second DELETE returns 204,
    // the worker believes it transferred ownership cleanly, but the key may already be held
    // by someone else.
    const token = await mintCapabilityToken(["lease:write"], "double-release");

    // Acquire legitimately via the API to get a real lease ID.
    const acquireRes = await acquireLease("state:double-release", token.token, {
      holder: "sole-holder",
      ttl_ms: 30_000,
    });
    expect(acquireRes.status).toBe(201);
    const lease = await acquireRes.json<LeaseResponse>();

    // First release — must succeed.
    const firstRelease = await SELF.fetch(`http://localhost/api/v1/leases/${lease.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.token}` },
    });
    expect(firstRelease.status).toBe(204);

    // Second release of the same lease — must return 404.
    const secondRelease = await SELF.fetch(`http://localhost/api/v1/leases/${lease.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.token}` },
    });
    expect(secondRelease.status).toBe(404);
    const body = await secondRelease.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
