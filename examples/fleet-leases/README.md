# Fleet Leases — coordinate N agents with zero double-writes

This example shows how to use AgentState leases to coordinate a fleet of concurrent workers so each work item is processed **exactly once**. Five workers race over twenty tasks: the first to call `createStateLease` wins the item; every other worker racing for that same key receives a `409 Conflict` and skips it. After all workers finish, the script asserts the invariant — zero double-processing — and prints a PASS or FAIL summary.

## Prerequisites

- An AgentState API key (free at [agentstate.app](https://agentstate.app))
- [Bun](https://bun.sh) ≥ 1.0 or Node.js ≥ 18

## Setup

Install dependencies from the repo root (this example imports the SDK directly from the monorepo):

```bash
bun install
```

## Running

```bash
AGENTSTATE_API_KEY=as_live_... bun run examples/fleet-leases/index.ts
```

Or using the package script:

```bash
cd examples/fleet-leases
AGENTSTATE_API_KEY=as_live_... bun run start
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGENTSTATE_API_KEY` | Yes | — | Your AgentState API key |
| `AGENTSTATE_BASE_URL` | No | `https://agentstate.app/api` | Override for local dev or staging |
| `TASK_COUNT` | No | `20` | Number of work items |
| `WORKER_COUNT` | No | `5` | Number of concurrent workers |
| `LEASE_TTL_MS` | No | `30000` | Lease time-to-live in milliseconds |

## Expected output

```
AgentState — Fleet Leases Example
  API base : https://agentstate.app/api
  Tasks    : 20
  Workers  : 5
  Lease TTL: 30000 ms

Starting workers...

  worker-1 → fleet-task-001: PROCESSING (lease=MDEy...)
  worker-2 → fleet-task-002: PROCESSING (lease=MDEy...)
  worker-3 → fleet-task-003: PROCESSING (lease=MDEy...)
  ...
  worker-1 → fleet-task-001: DONE (released)
  ...

═══════════════════════════════════════════════════════
  FLEET LEASES — RESULTS
═══════════════════════════════════════════════════════
  Tasks total       : 20
  Workers           : 5
  Tasks processed   : 20
  Unique tasks done : 20
  Unprocessed       : 0
  Double-processed  : 0

  ─────────────────────────────────────────────────────
  ✔  PASS — every task processed exactly once.
═══════════════════════════════════════════════════════
```

Exit code 0 on PASS, 1 on any double-processing or unprocessed tasks.

## How it works

1. **Acquire** — each worker calls `createStateLease(stateKey, { holder, ttl_ms })`. The first to reach any given key gets back a `StateLease` (HTTP 201).
2. **409 Contention** — if a second worker races for the same key while the first holds the lease, `AgentStateError` is thrown with `.status === 409`. The worker skips that item and moves to the next.
3. **Process** — the lease holder does the work (recording the result in a shared map).
4. **Release** — `releaseStateLease(lease.id)` frees the slot immediately rather than waiting for TTL expiry.
5. **TTL as safety net** — if a worker crashes mid-task, the lease expires automatically after `LEASE_TTL_MS`. No orphaned locks.

The lease ID also serves as a **fencing token**: if you pass it with a state write (`upsertState(..., { lease_id })`) the API will reject any write from a holder whose lease has already expired or been superseded — preventing stale writes even in split-brain scenarios.

For the full lease API reference and more patterns (leader election, migration slots, rate-limited critical sections), see [`docs/recipes/leases.md`](../../docs/recipes/leases.md).
