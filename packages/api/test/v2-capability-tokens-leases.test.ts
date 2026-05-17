import { env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashApiKey } from "../src/lib/crypto";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

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

const CAPABILITY_DDL = [
  `CREATE TABLE IF NOT EXISTS capability_tokens (
    id text PRIMARY KEY NOT NULL,
    project_id text NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    scopes text NOT NULL,
    expires_at integer,
    created_at integer NOT NULL,
    last_used_at integer,
    revoked_at integer
  )`,
  `CREATE INDEX IF NOT EXISTS capability_tokens_key_hash_idx ON capability_tokens (key_hash)`,
  `CREATE INDEX IF NOT EXISTS capability_tokens_project_id_idx ON capability_tokens (project_id)`,
  `CREATE TABLE IF NOT EXISTS state_leases (
    id text PRIMARY KEY NOT NULL,
    project_id text NOT NULL,
    state_key text NOT NULL,
    holder text NOT NULL,
    fencing_token integer NOT NULL,
    expires_at integer NOT NULL,
    created_at integer NOT NULL,
    renewed_at integer NOT NULL,
    released_at integer
  )`,
  `CREATE INDEX IF NOT EXISTS state_leases_project_id_state_key_idx ON state_leases (project_id, state_key)`,
  `CREATE INDEX IF NOT EXISTS state_leases_project_id_expires_at_idx ON state_leases (project_id, expires_at)`,
];

async function applyCapabilityTables(): Promise<void> {
  for (const stmt of CAPABILITY_DDL) {
    await env.DB.prepare(stmt).run();
  }
}

async function resetCapabilityTables(): Promise<void> {
  await env.DB.prepare("DELETE FROM state_leases").run();
  await env.DB.prepare("DELETE FROM capability_tokens").run();
  await env.DB.prepare("DELETE FROM rate_limits").run();
}

async function createCapabilityToken(body: Record<string, unknown>) {
  return SELF.fetch("http://localhost/api/v2/capability-tokens", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

async function createCapabilityTokenBody(body: Record<string, unknown>) {
  const res = await createCapabilityToken(body);
  expect(res.status).toBe(201);
  return res.json<CapabilityTokenResponse>();
}

async function insertLease(input: { id: string; stateKey: string; expiresAt?: number }) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO state_leases (
      id,
      project_id,
      state_key,
      holder,
      fencing_token,
      expires_at,
      created_at,
      renewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      TEST_PROJECT_ID,
      input.stateKey,
      "test-worker",
      1,
      input.expiresAt ?? now + 60_000,
      now,
      now,
    )
    .run();
}

describe("V2 Capability Tokens", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
    await applyCapabilityTables();
  });

  beforeEach(async () => {
    await resetCapabilityTables();
  });

  it("creates a scoped capability token and stores only its hash", async () => {
    const body = await createCapabilityTokenBody({
      name: "state writer",
      scopes: ["state:read", "state:write", "lease:write"],
      expires_at: Date.now() + 300_000,
    });

    expect(body.token).toMatch(/^as_cap_[A-Za-z0-9]{40}$/);
    expect(body.key_prefix).toMatch(/^as_cap_/);
    expect(body.scopes).toEqual(["lease:write", "state:read", "state:write"]);
    expect(body.expires_at).toBeTypeOf("number");

    const row = await env.DB.prepare("SELECT key_hash, scopes FROM capability_tokens WHERE id = ?")
      .bind(body.id)
      .first<{ key_hash: string; scopes: string }>();

    expect(row?.key_hash).toBe(await hashApiKey(body.token));
    expect(row?.key_hash).not.toBe(body.token);
    expect(JSON.parse(row?.scopes ?? "[]")).toEqual(body.scopes);
  });

  it("rejects unknown token scopes", async () => {
    const res = await createCapabilityToken({
      name: "bad scope",
      scopes: ["state:read", "admin:write"],
    });

    expect(res.status).toBe(400);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects duplicate token scopes", async () => {
    const res = await createCapabilityToken({
      name: "duplicate scope",
      scopes: ["state:read", "state:read"],
    });

    expect(res.status).toBe(400);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toContain("unique");
  });

  it("does not return raw tokens when listing capability tokens", async () => {
    await createCapabilityTokenBody({
      name: "reader",
      scopes: ["state:read"],
    });

    const res = await SELF.fetch("http://localhost/api/v2/capability-tokens", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ data: Array<Record<string, unknown>> }>();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].key_prefix).toMatch(/^as_cap_/);
    expect("token" in body.data[0]).toBe(false);
  });
});

describe("V2 Leases", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
    await applyCapabilityTables();
  });

  beforeEach(async () => {
    await resetCapabilityTables();
  });

  it("renews an active lease with a lease:write capability token", async () => {
    const token = await createCapabilityTokenBody({
      name: "lease writer",
      scopes: ["lease:write"],
    });
    await insertLease({
      id: "lease_renew_test",
      stateKey: "session:lease",
    });

    const res = await SELF.fetch("http://localhost/api/v2/leases/lease_renew_test/renew", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_ms: 120_000 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<LeaseResponse>();
    expect(body.id).toBe("lease_renew_test");
    expect(body.state_key).toBe("session:lease");
    expect(body.expires_at).toBeGreaterThan(Date.now() + 100_000);
    expect(body.renewed_at).toBeTypeOf("number");
    expect(body.fencing_token).toBe(1);
  });

  it("releases an active lease with a lease:write capability token", async () => {
    const token = await createCapabilityTokenBody({
      name: "lease releaser",
      scopes: ["lease:write"],
    });
    await insertLease({
      id: "lease_release_test",
      stateKey: "session:release",
    });

    const res = await SELF.fetch("http://localhost/api/v2/leases/lease_release_test", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    });

    expect(res.status).toBe(204);

    const row = await env.DB.prepare("SELECT released_at FROM state_leases WHERE id = ?")
      .bind("lease_release_test")
      .first<{ released_at: number | null }>();
    expect(row?.released_at).toBeTypeOf("number");
  });

  it("rejects lease renewal when token lacks lease:write", async () => {
    const token = await createCapabilityTokenBody({
      name: "state reader",
      scopes: ["state:read"],
    });
    await insertLease({
      id: "lease_forbidden_test",
      stateKey: "session:no-lease",
    });

    const res = await SELF.fetch("http://localhost/api/v2/leases/lease_forbidden_test/renew", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_ms: 120_000 }),
    });

    expect(res.status).toBe(403);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("does not renew an expired lease", async () => {
    const token = await createCapabilityTokenBody({
      name: "lease writer",
      scopes: ["lease:write"],
    });
    await insertLease({
      id: "lease_expired_test",
      stateKey: "session:expired",
      expiresAt: Date.now() - 1_000,
    });

    const res = await SELF.fetch("http://localhost/api/v2/leases/lease_expired_test/renew", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_ms: 120_000 }),
    });

    expect(res.status).toBe(409);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("LEASE_EXPIRED");
  });
});
