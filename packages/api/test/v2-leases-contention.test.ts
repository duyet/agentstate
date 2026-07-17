/**
 * Coordination edge-case regression tests — QUAL-3
 *
 * Focuses on the "exactly-one-writer" lease guarantee (acquire → contention → release →
 * re-acquire with higher fencing token), scope-denial enforcement, and isolated
 * json_value claim verification (pass and fail paths).
 *
 * WHY these tests matter:
 *   - Lease acquisition was completely untested before QUAL-3. The 409 LEASE_CONFLICT
 *     path is the core concurrency guarantee: if two workers race to acquire the same
 *     state key, only one wins. A regression here silently corrupts distributed state.
 *   - Monotonic fencing tokens prevent split-brain writes after a release: a re-acquired
 *     lease must have a strictly higher token than any previous holder, so stale writers
 *     can be detected and rejected.
 *   - Scope denial tests ensure capability tokens cannot escape their declared scope;
 *     without them a single `lease:write` token would silently gain `claim:write` access.
 *   - The isolated json_value verify tests pin the exact success/failure message strings
 *     that upstream consumers parse to determine claim disposition.
 */

import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Types
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

interface Claim {
  id: string;
  project_id: string;
  subject_type: string;
  subject_id: string;
  statement: string;
  status: "pending" | "verified" | "failed";
  created_at: number;
  updated_at: number;
  evidence?: Array<{
    id: string;
    kind: string;
    source: string;
    data: unknown;
    json_path: string | null;
    expected_value: unknown;
  }>;
}

interface VerificationRun {
  id: string;
  project_id: string;
  claim_id: string;
  status: "verified" | "failed";
  details: {
    results: Array<{
      evidence_id: string;
      kind: string;
      source: string;
      passed: boolean;
      message: string;
    }>;
  };
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mint a capability token via the real API (so it's stored in the test DB and
 * its hash is resolvable by scopedAuth).  Returns the full response including
 * the raw token string needed for Authorization headers.
 */
async function mintCapabilityToken(
  scopes: string[],
  name = "test-token",
): Promise<CapabilityTokenResponse> {
  const res = await SELF.fetch("http://localhost/api/v1/capability-tokens", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, scopes }),
  });
  expect(res.status, `mintCapabilityToken(${scopes.join(",")})`).toBe(201);
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

async function releaseLease(leaseId: string, token: string): Promise<Response> {
  return SELF.fetch(`http://localhost/api/v1/leases/${leaseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function createClaim(token: string, body: Record<string, unknown>): Promise<Response> {
  return SELF.fetch("http://localhost/api/v1/claims", {
    method: "POST",
    headers: capTokenHeaders(token),
    body: JSON.stringify(body),
  });
}

async function verifyClaim(claimId: string, token: string): Promise<Response> {
  return SELF.fetch(`http://localhost/api/v1/claims/${claimId}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await applyMigrations();
  await seedProject();
});

beforeEach(async () => {
  // Reset only the tables touched by this file; applyMigrations/seedProject run once.
  // The DB is wiped in seedProject (beforeAll), but since we share the DB across
  // tests in this file we must clean per-test to avoid cross-contamination.
  // We rely on applyMigrations having created these tables already.
  const { env } = await import("cloudflare:test");
  await env.DB.prepare("DELETE FROM state_leases").run();
  await env.DB.prepare("DELETE FROM capability_tokens").run();
  await env.DB.prepare("DELETE FROM claim_verification_runs").run();
  await env.DB.prepare("DELETE FROM claim_evidence").run();
  await env.DB.prepare("DELETE FROM claims").run();
  await env.DB.prepare("DELETE FROM rate_limits").run();
});

// ---------------------------------------------------------------------------
// Lease: acquire
// ---------------------------------------------------------------------------

describe("Lease acquisition", () => {
  it("acquires a lease for a new state key and returns the full lease shape", async () => {
    // WHY: acquisition itself was never tested — this pins the happy-path contract
    // so regressions (wrong status code, missing fields) are caught immediately.
    const token = await mintCapabilityToken(["lease:write"], "acquire-happy");

    const res = await acquireLease("state:acquire-happy", token.token, {
      holder: "worker-a",
      ttl_ms: 60_000,
    });

    expect(res.status).toBe(201);
    const body = await res.json<LeaseResponse>();
    expect(body.id).toBeTruthy();
    expect(body.state_key).toBe("state:acquire-happy");
    expect(body.holder).toBe("worker-a");
    expect(body.fencing_token).toBeTypeOf("number");
    expect(body.expires_at).toBeGreaterThan(Date.now());
    expect(body.created_at).toBeTypeOf("number");
    expect(body.renewed_at).toBeTypeOf("number");
  });

  it("returns 409 LEASE_CONFLICT when a second worker tries to acquire an active lease (exactly-one-writer guarantee)", async () => {
    // WHY: This is the core distributed-locking invariant. If two workers can both
    // receive 201, they both believe they own the state and will overwrite each other's
    // writes without knowing it.  The fencing_token mechanism only helps if acquisition
    // is exclusive — a broken 409 path silently destroys that guarantee.
    const token = await mintCapabilityToken(["lease:write"], "contention");

    const first = await acquireLease("state:contention", token.token, { holder: "worker-1" });
    expect(first.status).toBe(201);

    const second = await acquireLease("state:contention", token.token, { holder: "worker-2" });
    expect(second.status).toBe(409);

    const body = await second.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("LEASE_CONFLICT");
    expect(body.error.message).toBe("State already has an active lease");
  });

  it("allows re-acquisition after release, with a strictly higher fencing token (monotonic guarantee)", async () => {
    // WHY: After a release, the new holder must receive a fencing_token strictly greater
    // than the previous one.  Monotonic tokens let storage backends reject stale writes
    // (e.g. compare-and-swap on the token value).  If re-acquired with the same or lower
    // token, a lagging first worker could silently overwrite the new holder's data.
    const token = await mintCapabilityToken(["lease:write"], "reacquire");

    const first = await acquireLease("state:reacquire", token.token, { holder: "worker-1" });
    expect(first.status).toBe(201);
    const firstLease = await first.json<LeaseResponse>();

    const release = await releaseLease(firstLease.id, token.token);
    expect(release.status).toBe(204);

    const second = await acquireLease("state:reacquire", token.token, { holder: "worker-2" });
    expect(second.status).toBe(201);
    const secondLease = await second.json<LeaseResponse>();

    expect(secondLease.fencing_token).toBeGreaterThan(firstLease.fencing_token);
  });

  it("returns 403 FORBIDDEN when a capability token lacks lease:write scope", async () => {
    // WHY: A token minted for state:read only must not be able to acquire locks.
    // If scope enforcement is broken, any capability token becomes a lease:write token.
    const readOnlyToken = await mintCapabilityToken(["state:read"], "no-lease-scope");

    const res = await acquireLease("state:scope-denied", readOnlyToken.token, {
      holder: "worker-x",
    });

    expect(res.status).toBe(403);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// Claims: json_value verification (isolated cases)
// ---------------------------------------------------------------------------

describe("Claim json_value evidence verification", () => {
  it("verifies a claim as 'verified' when json_value evidence matches (pass)", async () => {
    // WHY: The existing verify tests cover mixed-evidence scenarios.
    // This test isolates the json_value path so a regression in readJsonPath or
    // JSON serialisation is pinpointed to this evidence kind specifically.
    const token = await mintCapabilityToken(["claim:write"], "json-verify-pass");

    const createRes = await createClaim(token.token, {
      subject_type: "task",
      subject_id: "json-value-pass-1",
      statement: "Task completed with status ok",
      evidence: [
        {
          kind: "json_value",
          source: "task-result:1",
          data: { status: "ok", retries: 0 },
          json_path: "$.status",
          expected_value: "ok",
        },
      ],
    });
    expect(createRes.status).toBe(201);
    const claim = await createRes.json<Claim>();

    const verifyRes = await verifyClaim(claim.id, token.token);
    expect(verifyRes.status).toBe(201);
    const run = await verifyRes.json<VerificationRun>();

    expect(run.status).toBe("verified");
    expect(run.details.results).toHaveLength(1);
    expect(run.details.results[0].passed).toBe(true);
    expect(run.details.results[0].kind).toBe("json_value");
    // Pin the success message so any change to the message string is caught.
    expect(run.details.results[0].message).toBe("json value matched");

    // Claim status must also have been updated to 'verified'.
    const { env } = await import("cloudflare:test");
    const row = await env.DB.prepare("SELECT status FROM claims WHERE id = ?")
      .bind(claim.id)
      .first<{ status: string }>();
    expect(row?.status).toBe("verified");
  });

  it("verifies a claim as 'failed' when json_value evidence does not match (fail)", async () => {
    // WHY: The json_value fail path is exercised in isolation here. The existing
    // verify-fail test uses text_hash mismatch.  A separate json_value mismatch test
    // ensures the JSON comparison code (readJsonPath + JSON.stringify equality) is
    // covered as a distinct code branch.
    const token = await mintCapabilityToken(["claim:write"], "json-verify-fail");

    const createRes = await createClaim(token.token, {
      subject_type: "task",
      subject_id: "json-value-fail-1",
      statement: "Task should have failed status",
      evidence: [
        {
          kind: "json_value",
          source: "task-result:2",
          data: { status: "ok" },
          json_path: "$.status",
          expected_value: "nope", // does not match the actual "ok"
        },
      ],
    });
    expect(createRes.status).toBe(201);
    const claim = await createRes.json<Claim>();

    const verifyRes = await verifyClaim(claim.id, token.token);
    expect(verifyRes.status).toBe(201);
    const run = await verifyRes.json<VerificationRun>();

    expect(run.status).toBe("failed");
    expect(run.details.results).toHaveLength(1);
    expect(run.details.results[0].passed).toBe(false);
    expect(run.details.results[0].kind).toBe("json_value");
    // Pin the failure message so downstream parsers aren't silently broken.
    expect(run.details.results[0].message).toBe("json value mismatch");

    // Claim status must also have been updated to 'failed'.
    const { env } = await import("cloudflare:test");
    const row = await env.DB.prepare("SELECT status FROM claims WHERE id = ?")
      .bind(claim.id)
      .first<{ status: string }>();
    expect(row?.status).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// Claims: scope denial
// ---------------------------------------------------------------------------

describe("Claim scope denial", () => {
  it("returns 403 FORBIDDEN when a capability token lacks claim:write scope", async () => {
    // WHY: The claims router guards all routes with scopedAuth({ scope: "claim:write" }).
    // If that guard regresses, any capability token could create or verify claims
    // regardless of what it was minted for.
    const stateOnlyToken = await mintCapabilityToken(["state:read"], "no-claim-scope");

    const res = await createClaim(stateOnlyToken.token, {
      subject_type: "task",
      subject_id: "scope-denied",
      statement: "should not be created",
      evidence: [
        {
          kind: "json_value",
          source: "state:1",
          data: { x: 1 },
          json_path: "$.x",
          expected_value: 1,
        },
      ],
    });

    expect(res.status).toBe(403);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// Capability token revocation
// ---------------------------------------------------------------------------

describe("Capability token revocation", () => {
  it("returns 401 UNAUTHORIZED when a revoked capability token is used on a scoped route", async () => {
    // WHY: After DELETE /api/v1/capability-tokens/:id sets revokedAt, the token's
    // hash is no longer found by the scopedAuth DB query (isNull(revokedAt) filter).
    // The middleware then falls through to the api_key path, finds nothing, and must
    // return 401. If revocation is broken, a compromised token remains valid forever.
    const token = await mintCapabilityToken(["lease:write"], "revoke-me");

    // Confirm the token works before revocation.
    const beforeRevoke = await acquireLease("state:revoke-before", token.token, {
      holder: "pre-revoke-worker",
    });
    expect(beforeRevoke.status).toBe(201);

    // Revoke via the management API (requires the master API key, not the cap token).
    const revokeRes = await SELF.fetch(
      `http://localhost/api/v1/capability-tokens/${token.id}`,
      { method: "DELETE", headers: authHeaders() },
    );
    expect(revokeRes.status).toBe(204);

    // After revocation the token must be rejected.
    const afterRevoke = await acquireLease("state:revoke-after", token.token, {
      holder: "post-revoke-worker",
    });
    expect(afterRevoke.status).toBe(401);
    const body = await afterRevoke.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// Lease-gated writes: atomic guard (#289)
// ---------------------------------------------------------------------------

describe("Lease-gated state writes (atomic guard, #289)", () => {
  it("rejects a delayed write presenting a stale lease id after an expiry hand-off (TOCTOU regression)", async () => {
    // WHY: The exactly-one-writer guarantee must hold AT WRITE TIME, not just at
    // an earlier check time. Scenario: worker-1 holds L1, L1 expires, worker-2
    // acquires L2 (higher fencing token). Worker-1's delayed write replays with
    // the stale L1 id — it must be rejected by the guard evaluated inside the
    // same transaction as the write, and must leave zero rows behind.
    const { env } = await import("cloudflare:test");
    const token = await mintCapabilityToken(["lease:write"], "stale-writer");
    const stateKey = "state:stale-write";

    const l1Res = await acquireLease(stateKey, token.token, { holder: "worker-1", ttl_ms: 1000 });
    expect(l1Res.status).toBe(201);
    const l1 = await l1Res.json<LeaseResponse>();

    // Let L1 expire, then hand the key off to worker-2.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const l2Res = await acquireLease(stateKey, token.token, { holder: "worker-2" });
    expect(l2Res.status).toBe(201);
    const l2 = await l2Res.json<LeaseResponse>();
    expect(l2.fencing_token).toBeGreaterThan(l1.fencing_token);

    // Worker-1's delayed write with the stale (expired, superseded) lease id.
    const staleWrite = await SELF.fetch(`http://localhost/api/v1/states/${stateKey}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ agent_id: "worker-1", data: { winner: "worker-1" }, lease_id: l1.id }),
    });
    expect(staleWrite.status).toBe(409);
    const staleBody = await staleWrite.json<{ error: { code: string } }>();
    expect(staleBody.error.code).toBe("LEASE_CONFLICT");

    // The rejected write left nothing behind — no event, no state, no snapshot.
    for (const table of ["state_events", "agent_states", "state_snapshots"]) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE state_key = ?`)
        .bind(stateKey)
        .first<{ n: number }>();
      expect(row?.n, table).toBe(0);
    }

    // The current holder's write goes through.
    const freshWrite = await SELF.fetch(`http://localhost/api/v1/states/${stateKey}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ agent_id: "worker-2", data: { winner: "worker-2" }, lease_id: l2.id }),
    });
    expect(freshWrite.status).toBe(200);
    const freshBody = await freshWrite.json<{ data: { winner: string } }>();
    expect(freshBody.data.winner).toBe("worker-2");
  });

  it("rejects a lease-gated DELETE presenting a stale lease id", async () => {
    // WHY: deleteState shares the same guard; a stale holder must not be able
    // to tombstone state owned by the new lease holder.
    const { env } = await import("cloudflare:test");
    const token = await mintCapabilityToken(["lease:write"], "stale-deleter");
    const stateKey = "state:stale-delete";

    // Seed state (no lease yet), then set up an L1 → L2 hand-off.
    const seed = await SELF.fetch(`http://localhost/api/v1/states/${stateKey}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ agent_id: "worker-1", data: { keep: true } }),
    });
    expect(seed.status).toBe(200);

    const l1Res = await acquireLease(stateKey, token.token, { holder: "worker-1", ttl_ms: 1000 });
    expect(l1Res.status).toBe(201);
    const l1 = await l1Res.json<LeaseResponse>();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const l2Res = await acquireLease(stateKey, token.token, { holder: "worker-2" });
    expect(l2Res.status).toBe(201);

    const staleDelete = await SELF.fetch(
      `http://localhost/api/v1/states/${stateKey}?lease_id=${l1.id}`,
      { method: "DELETE", headers: authHeaders() },
    );
    expect(staleDelete.status).toBe(409);
    const body = await staleDelete.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("LEASE_CONFLICT");

    // State is still live — no tombstone landed.
    const row = await env.DB.prepare(
      "SELECT deleted_at FROM agent_states WHERE state_key = ? LIMIT 1",
    )
      .bind(stateKey)
      .first<{ deleted_at: number | null }>();
    expect(row?.deleted_at).toBeNull();
  });
});
