# Coordinating a fleet of agents with leases (zero double-writes)

_Published 2026-06-18_

---

You deploy five agents to chew through a queue of work items. Each agent pulls from the same list. Without coordination, two agents will race to the same item and process it twice — you get double-charged API calls, duplicate database rows, or a corrupted pipeline state.

This is the classic **exactly-once processing** problem. Queues solve it with acknowledgements and visibility timeouts. But what if you want a minimal dependency, or you're already storing agent state somewhere?

AgentState has a primitive built for exactly this: **leases**.

---

## The problem: N agents, M tasks, zero protection

Imagine a document-indexing fleet. Each agent iterates through a batch of document IDs and calls an embedding API:

```
agent-1: [doc-001, doc-002, doc-003, …]
agent-2: [doc-001, doc-002, doc-003, …]   ← same list
agent-3: [doc-001, doc-002, doc-003, …]
```

Without a lock, `doc-001` gets indexed three times. At $0.0001 per embedding call, and a million docs, that's a $200 waste — and a corrupted index if writes are not idempotent.

---

## The solution: a lease (distributed lock with TTL)

A **lease** is an exclusive, time-bounded claim on a named key. The rules are:

1. The first agent to call `POST /api/v1/states/:key/lease` wins — it gets HTTP 201 and the lease object.
2. Every other agent racing for the same key gets HTTP **409 Conflict** while the lease is active.
3. The winner works, then calls `DELETE /api/v1/leases/:id` to release.
4. If the winner crashes, the lease expires after its TTL and the slot opens to the next agent. No manual cleanup.

Each lease also carries a monotonically increasing **fencing token** (`fencing_token` field). Pass this token with any downstream write — your storage layer can reject any write whose token is lower than the highest it has seen, so a slow formerly-expired holder can never overwrite the work of its successor.

---

## Worked example

### The queue

```
tasks = [doc-001, doc-002, …, doc-100]
agents = [agent-1, agent-2, agent-3]
```

Each agent iterates the full list and races to claim each document. The lease is the only thing that serialises them.

### Step 1 — Acquire with curl

```bash
curl -s -X POST https://agentstate.app/api/v1/states/task:doc-001/lease \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{"holder": "agent-1", "ttl_ms": 30000}'
```

**201 — lease granted to agent-1:**

```json
{
  "id": "MDEyMzQ1Njc4OTAxMjM0NQ",
  "state_key": "task:doc-001",
  "holder": "agent-1",
  "fencing_token": 1,
  "expires_at": 1718700030000,
  "created_at": 1718700000000,
  "renewed_at": null,
  "released_at": null
}
```

Meanwhile, agent-2 races for the same key and gets:

**409 — lease already held:**

```json
{
  "error": {
    "code": "LEASE_CONFLICT",
    "message": "State already has an active lease"
  }
}
```

agent-2 skips `doc-001` and moves to `doc-002`. No retry loop needed.

### Step 2 — Renew if the work is long-running

```bash
curl -s -X POST https://agentstate.app/api/v1/leases/MDEyMzQ1Njc4OTAxMjM0NQ/renew \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{"ttl_ms": 30000}'
```

**200 — lease extended:**

```json
{
  "id": "MDEyMzQ1Njc4OTAxMjM0NQ",
  "state_key": "task:doc-001",
  "holder": "agent-1",
  "fencing_token": 1,
  "expires_at": 1718700060000,
  "renewed_at": 1718700030000
}
```

Renew at roughly 50 % of the TTL (every 15 s for a 30 s TTL). If you try to renew an already-expired lease, you get 404 — a clear signal to stop and let another agent reclaim the slot.

### Step 3 — Release when done

```bash
curl -s -X DELETE https://agentstate.app/api/v1/leases/MDEyMzQ1Njc4OTAxMjM0NQ \
  -H "Authorization: Bearer as_live_..."
# → 204 No Content
```

The slot is immediately available to the next agent. Without an explicit release, the lease would free after its TTL — that's the safety net.

---

## TypeScript SDK

The SDK exposes `createStateLease`, `renewStateLease`, and `releaseStateLease`:

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function processDoc(docId: string, agentId: string): Promise<void> {
  const stateKey = `task:${docId}`;

  // Race to claim. 409 means another agent has it — skip.
  let lease;
  try {
    lease = await client.createStateLease(stateKey, {
      holder: agentId,
      ttl_ms: 30_000,
    });
  } catch (err) {
    if (err instanceof AgentStateError && err.status === 409) {
      console.log(`[${agentId}] ${docId} already claimed — skipping`);
      return;
    }
    throw err;
  }

  console.log(`[${agentId}] Acquired lease ${lease.id} (fencing_token=${lease.fencing_token})`);

  // Renew halfway through the TTL so a slow embedding call doesn't expire us.
  const renewTimer = setInterval(async () => {
    try {
      await client.renewStateLease(lease.id, { ttl_ms: 30_000 });
    } catch {
      clearInterval(renewTimer); // expired or released — stop renewing
    }
  }, 15_000);

  try {
    await embedAndIndex(docId, lease.fencing_token); // your work here
  } finally {
    clearInterval(renewTimer);
    // Always release — even on failure — so the slot frees immediately.
    await client.releaseStateLease(lease.id).catch(() => {
      // If release fails, the TTL will clean it up.
    });
    console.log(`[${agentId}] Released lease ${lease.id}`);
  }
}

async function embedAndIndex(docId: string, fencingToken: number): Promise<void> {
  // Pass fencingToken to your downstream storage so stale holders are rejected.
  console.log(`Indexing ${docId} with fence=${fencingToken}`);
}

// Spawn three agents racing over the same task list
const tasks = ["doc-001", "doc-002", "doc-003", "doc-004", "doc-005"];
await Promise.all(
  ["agent-1", "agent-2", "agent-3"].map(async (agentId) => {
    for (const docId of tasks) {
      await processDoc(docId, agentId);
    }
  }),
);
```

The key pattern is the **skip on 409**: do not retry in a loop. Move to the next task. The agent that holds the lease will finish and release; any unclaimed tasks will be available on your next pass.

---

## Why fencing tokens matter

Leases can expire while the holder is still mid-flight (network partition, slow GC pause). Without a fencing token, the formerly-expired agent might still write its result after a new agent has already done the same work.

The `fencing_token` is a monotonically increasing integer: each new lease issued for a state key bumps it by one. Attach it to every downstream write:

```typescript
// When upserting state alongside a held lease, pass lease_id so the
// API rejects writes from any holder whose lease has been superseded.
await client.upsertState(stateKey, {
  agent_id: agentId,
  data: { status: "indexed", docId },
  lease_id: lease.id,   // write rejected if lease is no longer valid
});
```

If the lease expired before this write arrives, the API returns an error instead of letting stale data land.

---

## Runnable example

The [`examples/fleet-leases`](../../examples/fleet-leases/) directory contains a self-contained script that proves the guarantee: five workers race over twenty tasks and the final assertion verifies **zero double-processing**.

```bash
AGENTSTATE_API_KEY=as_live_... bun run examples/fleet-leases/index.ts
```

Expected output:

```
AgentState — Fleet Leases Example
  Tasks    : 20
  Workers  : 5
  Lease TTL: 30000 ms

Starting workers...

  worker-1 → fleet-task-001: PROCESSING (lease=MDEy...)
  worker-2 → fleet-task-002: PROCESSING (lease=MDEy...)
  …

═══════════════════════════════════════════════════════
  FLEET LEASES — RESULTS
═══════════════════════════════════════════════════════
  Tasks processed   : 20
  Unique tasks done : 20
  Double-processed  : 0

  ✔  PASS — every task processed exactly once.
═══════════════════════════════════════════════════════
```

---

## Choosing your TTL

| Scenario | TTL | Renew interval |
|----------|-----|----------------|
| Fast task (< 5 s) | 10 000 ms | — (no renewal needed) |
| Medium task (< 30 s) | 30 000 ms | 15 000 ms |
| Long task (minutes) | 60 000 ms | 30 000 ms |

Rule of thumb: renew at 50 % of TTL. A crashed worker is evicted after at most one full TTL; keep TTLs short enough that the wait is acceptable.

---

## Other patterns leases enable

- **Leader election** — one agent holds `leader:my-service`; all others poll and take over if the TTL lapses.
- **Migration slots** — a single schema migration runs while N deploys race to start it.
- **Rate-limited critical sections** — issue a lease only after an external budget check; the lease TTL bounds how long the budget is held.

See [`docs/recipes/leases.md`](../recipes/leases.md) for the full reference with Python SDK examples and edge-case guidance.

---

## Get started

A free API key gets you started — no credit card required.

**[Get your free key at agentstate.app](https://agentstate.app)**

Then wire up coordination in under five minutes:

```bash
npm install @agentstate/sdk
# or: pip install agentstate
```

```typescript
import { AgentState } from "@agentstate/sdk";
const client = new AgentState({ apiKey: "as_live_..." });
const lease = await client.createStateLease("my-task", { holder: "worker-1", ttl_ms: 30_000 });
// … do work …
await client.releaseStateLease(lease.id);
```

No queue broker. No Redis. No Zookeeper. Just an HTTP call.
