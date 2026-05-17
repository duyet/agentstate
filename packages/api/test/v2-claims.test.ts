import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

interface ClaimEvidence {
  id: string;
  project_id: string;
  claim_id: string;
  kind: "state_event" | "text_hash" | "json_value";
  source: string;
  data: unknown;
  hash: string | null;
  json_path: string | null;
  expected_value: unknown;
  created_at: number;
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
  evidence?: ClaimEvidence[];
}

interface ClaimListResponse {
  data: Claim[];
  pagination: { limit: number; next_cursor: string | null };
}

interface VerificationRun {
  id: string;
  project_id: string;
  claim_id: string;
  status: "verified" | "failed";
  details: {
    results: Array<{
      evidence_id: string;
      kind: "state_event" | "text_hash" | "json_value";
      source: string;
      passed: boolean;
      message: string;
    }>;
  };
  created_at: number;
}

const CLAIM_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS state_events (
    sequence integer PRIMARY KEY AUTOINCREMENT,
    id text NOT NULL,
    project_id text NOT NULL,
    state_key text NOT NULL,
    agent_id text NOT NULL,
    event_type text NOT NULL,
    data text,
    metadata text,
    tags text DEFAULT '[]' NOT NULL,
    idempotency_key text,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS state_events_id_idx ON state_events (id)`,
  `CREATE INDEX IF NOT EXISTS state_events_project_id_sequence_idx ON state_events (project_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS state_events_project_id_state_key_idx ON state_events (project_id, state_key)`,
  `CREATE INDEX IF NOT EXISTS state_events_project_id_created_at_idx ON state_events (project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS claims (
    id text PRIMARY KEY NOT NULL,
    project_id text NOT NULL,
    subject_type text NOT NULL,
    subject_id text NOT NULL,
    statement text NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS claims_project_id_created_at_idx ON claims (project_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS claims_project_id_subject_idx ON claims (project_id, subject_type, subject_id)`,
  `CREATE TABLE IF NOT EXISTS claim_evidence (
    id text PRIMARY KEY NOT NULL,
    project_id text NOT NULL,
    claim_id text NOT NULL,
    kind text NOT NULL,
    source text NOT NULL,
    data text,
    hash text,
    json_path text,
    expected_value text,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS claim_evidence_project_id_claim_id_idx ON claim_evidence (project_id, claim_id)`,
  `CREATE TABLE IF NOT EXISTS claim_verification_runs (
    id text PRIMARY KEY NOT NULL,
    project_id text NOT NULL,
    claim_id text NOT NULL,
    status text NOT NULL,
    details text NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS claim_verification_runs_project_id_claim_id_idx ON claim_verification_runs (project_id, claim_id)`,
];

async function applyClaimTables(): Promise<void> {
  for (const stmt of CLAIM_DDL_STATEMENTS) {
    await env.DB.prepare(stmt).run();
  }
}

async function createClaim(body: Record<string, unknown>) {
  return SELF.fetch("http://localhost/api/v2/claims", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

async function seedStateEvent(id: string, data: Record<string, unknown>) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO state_events (id, project_id, state_key, agent_id, event_type, data, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      TEST_PROJECT_ID,
      `state-${id}`,
      "agent-test",
      "upsert",
      JSON.stringify(data),
      "[]",
      Date.now(),
    )
    .run();
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

describe("V2 Claims", () => {
  beforeAll(async () => {
    await applyMigrations();
    await applyClaimTables();
    await seedProject();
  });

  it("creates a claim with deterministic evidence", async () => {
    const transcript = "assistant confirmed order 42";
    const res = await createClaim({
      subject_type: "conversation",
      subject_id: "claim-create-1",
      statement: "Order 42 was confirmed",
      evidence: [
        {
          kind: "text_hash",
          source: "transcript:1",
          data: transcript,
          hash: await sha256Hex(transcript),
        },
      ],
    });

    expect(res.status).toBe(201);
    const body = await res.json<Claim>();
    expect(body.id).toBeTruthy();
    expect(body.project_id).toBe(TEST_PROJECT_ID);
    expect(body.subject_type).toBe("conversation");
    expect(body.subject_id).toBe("claim-create-1");
    expect(body.statement).toBe("Order 42 was confirmed");
    expect(body.status).toBe("pending");
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence?.[0].kind).toBe("text_hash");
  });

  it("lists claims for the authenticated project", async () => {
    const transcript = "list claim evidence";
    const createRes = await createClaim({
      subject_type: "conversation",
      subject_id: "claim-list-1",
      statement: "Listable claim",
      evidence: [
        {
          kind: "text_hash",
          source: "transcript:1",
          data: transcript,
          hash: await sha256Hex(transcript),
        },
      ],
    });
    expect(createRes.status).toBe(201);

    const res = await SELF.fetch(
      "http://localhost/api/v2/claims?subject_type=conversation&subject_id=claim-list-1",
      { headers: authHeaders() },
    );

    expect(res.status).toBe(200);
    const body = await res.json<ClaimListResponse>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((claim) => claim.subject_id === "claim-list-1")).toBe(true);
    expect(body.pagination.limit).toBe(body.data.length);
  });

  it("gets a claim with evidence", async () => {
    const res = await createClaim({
      subject_type: "conversation",
      subject_id: "claim-get-1",
      statement: "JSON field matches",
      evidence: [
        {
          kind: "json_value",
          source: "state:summary",
          data: { outcome: { status: "done" } },
          json_path: "$.outcome.status",
          expected_value: "done",
        },
      ],
    });
    const created = await res.json<Claim>();

    const getRes = await SELF.fetch(`http://localhost/api/v2/claims/${created.id}`, {
      headers: authHeaders(),
    });

    expect(getRes.status).toBe(200);
    const body = await getRes.json<Claim>();
    expect(body.id).toBe(created.id);
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence?.[0].data).toEqual({ outcome: { status: "done" } });
    expect(body.evidence?.[0].expected_value).toBe("done");
  });

  it("verifies a claim when all evidence passes", async () => {
    await seedStateEvent("state-event-pass-1", { final: { approved: true } });
    const transcript = "all evidence is deterministic";
    const res = await createClaim({
      subject_type: "conversation",
      subject_id: "claim-verify-pass-1",
      statement: "The final state was approved",
      evidence: [
        {
          kind: "text_hash",
          source: "transcript:1",
          data: transcript,
          hash: await sha256Hex(transcript),
        },
        {
          kind: "json_value",
          source: "snapshot:1",
          data: { final: { approved: true } },
          json_path: "$.final.approved",
          expected_value: true,
        },
        {
          kind: "state_event",
          source: "state-event-pass-1",
          json_path: "$.final.approved",
          expected_value: true,
        },
      ],
    });
    const created = await res.json<Claim>();

    const verifyRes = await SELF.fetch(`http://localhost/api/v2/claims/${created.id}/verify`, {
      method: "POST",
      headers: authHeaders(),
    });

    expect(verifyRes.status).toBe(201);
    const run = await verifyRes.json<VerificationRun>();
    expect(run.claim_id).toBe(created.id);
    expect(run.status).toBe("verified");
    expect(run.details.results).toHaveLength(3);
    expect(run.details.results.every((result) => result.passed)).toBe(true);

    const getRes = await SELF.fetch(`http://localhost/api/v2/claims/${created.id}`, {
      headers: authHeaders(),
    });
    const verified = await getRes.json<Claim>();
    expect(verified.status).toBe("verified");
  });

  it("fails verification when evidence does not match", async () => {
    const res = await createClaim({
      subject_type: "conversation",
      subject_id: "claim-verify-fail-1",
      statement: "The transcript matches a known hash",
      evidence: [
        {
          kind: "text_hash",
          source: "transcript:1",
          data: "actual transcript",
          hash: await sha256Hex("different transcript"),
        },
      ],
    });
    const created = await res.json<Claim>();

    const verifyRes = await SELF.fetch(`http://localhost/api/v2/claims/${created.id}/verify`, {
      method: "POST",
      headers: authHeaders(),
    });

    expect(verifyRes.status).toBe(201);
    const run = await verifyRes.json<VerificationRun>();
    expect(run.status).toBe("failed");
    expect(run.details.results).toHaveLength(1);
    expect(run.details.results[0].passed).toBe(false);
    expect(run.details.results[0].message).toBe("hash mismatch");
  });
});
