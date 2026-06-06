import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject } from "./setup";

async function putState(
  stateKey: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return SELF.fetch(`http://localhost/api/v1/states/${stateKey}`, {
    method: "PUT",
    headers: { ...authHeaders(), ...headers },
    body: JSON.stringify(body),
  });
}

describe("State platform", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("writes state, records WAL events, and reads historical state", async () => {
    const first = await putState("run-1", {
      agent_id: "agent-a",
      data: { status: "draft", step: 1 },
      metadata: { source: "test" },
      tags: ["alpha", "review"],
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json<any>();
    expect(firstBody.latest_sequence).toBeGreaterThan(0);
    expect(firstBody.data.status).toBe("draft");

    const second = await putState("run-1", {
      agent_id: "agent-a",
      data: { status: "done", step: 2 },
      tags: ["alpha", "done"],
    });
    expect(second.status).toBe(200);
    const secondBody = await second.json<any>();
    expect(secondBody.latest_sequence).toBeGreaterThan(firstBody.latest_sequence);

    const latest = await SELF.fetch("http://localhost/api/v1/states/run-1", {
      headers: authHeaders(),
    });
    expect(latest.status).toBe(200);
    expect((await latest.json<any>()).data.status).toBe("done");

    const historical = await SELF.fetch(
      `http://localhost/api/v1/states/run-1?at_sequence=${firstBody.latest_sequence}`,
      { headers: authHeaders() },
    );
    expect(historical.status).toBe(200);
    expect((await historical.json<any>()).data.status).toBe("draft");

    const events = await SELF.fetch("http://localhost/api/v1/states/run-1/events?after=0", {
      headers: authHeaders(),
    });
    expect(events.status).toBe(200);
    const eventBody = await events.json<any>();
    expect(eventBody.data).toHaveLength(2);
    expect(eventBody.data[0].sequence).toBe(firstBody.latest_sequence);
    expect(eventBody.data[1].sequence).toBe(secondBody.latest_sequence);
  });

  it("replays matching idempotent writes and rejects conflicting reuse", async () => {
    const key = "state-idempotency-test";
    const body = { agent_id: "agent-b", data: { status: "ok" } };

    const first = await putState("idempotent-run", body, { "Idempotency-Key": key });
    expect(first.status).toBe(200);
    const firstBody = await first.json<any>();

    const second = await putState("idempotent-run", body, { "Idempotency-Key": key });
    expect(second.status).toBe(200);
    expect(second.headers.get("Idempotency-Replayed")).toBe("true");
    expect((await second.json<any>()).latest_sequence).toBe(firstBody.latest_sequence);

    const conflict = await putState(
      "idempotent-run",
      { agent_id: "agent-b", data: { status: "changed" } },
      { "Idempotency-Key": key },
    );
    expect(conflict.status).toBe(409);
    expect((await conflict.json<any>()).error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("queries by tags and JSON path", async () => {
    await putState("query-run-a", {
      agent_id: "query-agent",
      data: { status: "done", nested: { priority: "high" } },
      tags: ["queryable", "high"],
    });
    await putState("query-run-b", {
      agent_id: "query-agent",
      data: { status: "pending", nested: { priority: "low" } },
      tags: ["queryable"],
    });

    const res = await SELF.fetch("http://localhost/api/v1/states/query", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        agent_id: "query-agent",
        tags: ["queryable", "high"],
        json_path: "$.nested.priority",
        json_equals: "high",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body.data.map((row: any) => row.state_key)).toContain("query-run-a");
    expect(body.data.map((row: any) => row.state_key)).not.toContain("query-run-b");
  });

  it("continues scanning sparse query matches beyond the first candidate page", async () => {
    await putState("sparse-match", {
      agent_id: "query-agent-sparse",
      data: { status: "done", nested: { priority: "high" } },
      tags: ["sparse-match"],
    });

    for (let index = 0; index < 6; index++) {
      await putState(`sparse-miss-${index}`, {
        agent_id: "query-agent-sparse",
        data: { status: "pending", nested: { priority: "low" } },
        tags: ["sparse-miss"],
      });
    }

    const res = await SELF.fetch("http://localhost/api/v1/states/query", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        agent_id: "query-agent-sparse",
        tags: ["sparse-match"],
        json_path: "$.nested.priority",
        json_equals: "high",
        limit: 1,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body.data.map((row: any) => row.state_key)).toEqual(["sparse-match"]);
  });

  it(
    "returns a cursor when sparse query scanning reaches the per-request cap",
    async () => {
      await putState("sparse-capped-match", {
        agent_id: "query-agent-sparse-capped",
        data: { status: "done", nested: { priority: "high" } },
        tags: ["sparse-capped-match"],
      });

      await Promise.all(
        Array.from({ length: 55 }, (_, index) =>
          putState(`sparse-capped-miss-${index}`, {
            agent_id: "query-agent-sparse-capped",
            data: { status: "pending", nested: { priority: "low" } },
            tags: ["sparse-capped-miss"],
          }),
        ),
      );

      const first = await SELF.fetch("http://localhost/api/v1/states/query", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          agent_id: "query-agent-sparse-capped",
          tags: ["sparse-capped-match"],
          limit: 1,
        }),
      });

      expect(first.status).toBe(200);
      const firstBody = await first.json<any>();
      expect(firstBody.data).toEqual([]);
      expect(firstBody.pagination.next_cursor).toEqual(expect.any(String));

      const second = await SELF.fetch("http://localhost/api/v1/states/query", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          agent_id: "query-agent-sparse-capped",
          tags: ["sparse-capped-match"],
          limit: 1,
          cursor: firstBody.pagination.next_cursor,
        }),
      });

      expect(second.status).toBe(200);
      const secondBody = await second.json<any>();
      expect(secondBody.data.map((row: any) => row.state_key)).toEqual(["sparse-capped-match"]);
    },
    15_000,
  );

  it("enforces leases for protected writes", async () => {
    await putState("leased-run", { agent_id: "lease-agent", data: { value: 1 } });

    const leaseRes = await SELF.fetch("http://localhost/api/v1/states/leased-run/lease", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ holder: "worker-1", ttl_ms: 60_000 }),
    });
    expect(leaseRes.status).toBe(201);
    const lease = await leaseRes.json<any>();

    const blocked = await putState("leased-run", { agent_id: "lease-agent", data: { value: 2 } });
    expect(blocked.status).toBe(409);
    expect((await blocked.json<any>()).error.code).toBe("LEASE_REQUIRED");

    const allowed = await putState("leased-run", {
      agent_id: "lease-agent",
      data: { value: 2 },
      lease_id: lease.id,
    });
    expect(allowed.status).toBe(200);

    const renew = await SELF.fetch(`http://localhost/api/v1/leases/${lease.id}/renew`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ttl_ms: 60_000 }),
    });
    expect(renew.status).toBe(200);

    const release = await SELF.fetch(`http://localhost/api/v1/leases/${lease.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    expect(release.status).toBe(204);
  });

  it("uses scoped capability tokens without granting unrelated scopes", async () => {
    await putState("token-run", { agent_id: "token-agent", data: { value: true } });

    const createToken = await SELF.fetch("http://localhost/api/v1/capability-tokens", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Read only", scopes: ["state:read", "state:watch"] }),
    });
    expect(createToken.status).toBe(201);
    const tokenBody = await createToken.json<any>();

    const read = await SELF.fetch("http://localhost/api/v1/states/token-run", {
      headers: { Authorization: `Bearer ${tokenBody.token}` },
    });
    expect(read.status).toBe(200);

    const write = await SELF.fetch("http://localhost/api/v1/states/token-run", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenBody.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: "token-agent", data: { value: false } }),
    });
    expect(write.status).toBe(403);

    const watch = await SELF.fetch(
      `http://localhost/api/v1/states/watch?after=0&once=true&token=${tokenBody.token}`,
    );
    expect(watch.status).toBe(200);
    expect(watch.headers.get("Content-Type")).toContain("text/event-stream");
    await watch.body?.cancel();
  });

  it("verifies deterministic claim evidence", async () => {
    const create = await SELF.fetch("http://localhost/api/v1/claims", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        subject_type: "state",
        subject_id: "claim-run",
        statement: "Status is ok",
        evidence: [
          {
            kind: "json_value",
            source: "inline",
            data: { status: "ok" },
            json_path: "$.status",
            expected_value: "ok",
          },
        ],
      }),
    });
    expect(create.status).toBe(201);
    const claim = await create.json<any>();

    const verify = await SELF.fetch(`http://localhost/api/v1/claims/${claim.id}/verify`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect(verify.status).toBe(201);
    expect((await verify.json<any>()).status).toBe("verified");

    const failed = await SELF.fetch("http://localhost/api/v1/claims", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        subject_type: "state",
        subject_id: "claim-run",
        statement: "Status is not ok",
        evidence: [
          {
            kind: "json_value",
            source: "inline",
            data: { status: "ok" },
            json_path: "$.status",
            expected_value: "nope",
          },
        ],
      }),
    });
    const failedClaim = await failed.json<any>();
    const failedVerify = await SELF.fetch(`http://localhost/api/v1/claims/${failedClaim.id}/verify`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect((await failedVerify.json<any>()).status).toBe("failed");
  });
});
