# Leases — Distributed Locking for Agent Fleets

Use leases when multiple agents compete for the same work unit and you need exactly-one-writer semantics — task assignment, database migration slots, leader election, or any critical section that must not run concurrently.

## Core flow

1. **Acquire** — each competing agent calls `POST /api/v1/states/:state_key/lease`. The first one gets HTTP 201. All others get HTTP 409 while that lease is active.
2. **Do the work** — only the holder proceeds. Others skip this item or wait.
3. **Renew** (optional) — call `POST /api/v1/leases/:id/renew` before the TTL expires if the work is long-running.
4. **Release** — call `DELETE /api/v1/leases/:id` when done. The slot is now available to the next worker.

> If the holder crashes, the lease expires automatically after its TTL. No manual cleanup needed.

---

## curl examples

### Acquire a lease

```bash
curl -s -X POST https://agentstate.app/api/v1/states/task:order-42/lease \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{"holder": "worker-1", "ttl_ms": 30000}'
```

**201 — lease granted:**
```json
{
  "id": "MDEyMzQ1Njc4OTAxMjM0NQ",
  "state_key": "task:order-42",
  "holder": "worker-1",
  "fencing_token": 7,
  "expires_at": 1718700030000,
  "created_at": 1718700000000,
  "renewed_at": null,
  "released_at": null
}
```

**409 — lease already held (contention):**
```json
{
  "error": {
    "code": "LEASE_CONFLICT",
    "message": "State already has an active lease"
  }
}
```

### Renew before expiry

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
  "state_key": "task:order-42",
  "holder": "worker-1",
  "fencing_token": 7,
  "expires_at": 1718700060000,
  "renewed_at": 1718700030000
}
```

### Release when done

```bash
curl -s -X DELETE https://agentstate.app/api/v1/leases/MDEyMzQ1Njc4OTAxMjM0NQ \
  -H "Authorization: Bearer as_live_..."
# → 204 No Content
```

---

## TypeScript SDK

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

const client = new AgentState({ apiKey: "as_live_..." });

async function processTask(taskId: string, workerId: string) {
  const stateKey = `task:${taskId}`;

  // Try to acquire the lease
  let lease;
  try {
    lease = await client.createStateLease(stateKey, {
      holder: workerId,
      ttl_ms: 30_000,
    });
  } catch (err) {
    if (err instanceof AgentStateError && err.status === 409) {
      // Another worker holds the lease — skip this task
      console.log(`[${workerId}] Task ${taskId} already claimed, skipping`);
      return;
    }
    throw err;
  }

  console.log(`[${workerId}] Acquired lease ${lease.id} (fencing_token=${lease.fencing_token})`);

  try {
    // Renew halfway through if the work takes longer than expected
    const renewTimer = setInterval(async () => {
      await client.renewStateLease(lease.id, { ttl_ms: 30_000 });
    }, 15_000);

    await doWork(taskId, lease.fencing_token);
    clearInterval(renewTimer);
  } finally {
    // Always release — even on failure
    await client.releaseStateLease(lease.id);
    console.log(`[${workerId}] Released lease ${lease.id}`);
  }
}

async function doWork(taskId: string, fencingToken: number) {
  // Pass fencing_token to downstream storage so stale holders are rejected
  console.log(`Processing task ${taskId} with fence=${fencingToken}`);
}
```

---

## Python SDK

```python
import httpx
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

def process_task(task_id: str, worker_id: str):
    state_key = f"task:{task_id}"

    # Try to acquire the lease. A contended key returns HTTP 409, which the
    # SDK surfaces as httpx.HTTPStatusError (only 401/404/422/429 map to
    # typed AgentState exceptions today).
    try:
        lease = client.create_state_lease(state_key, worker_id, ttl_ms=30_000)
    except httpx.HTTPStatusError as err:
        if err.response.status_code == 409:
            print(f"[{worker_id}] Task {task_id} already claimed, skipping")
            return
        raise

    lease_id = lease["id"]
    fencing_token = lease["fencing_token"]
    print(f"[{worker_id}] Acquired lease {lease_id} (fencing_token={fencing_token})")

    try:
        do_work(task_id, fencing_token)
    finally:
        client.release_state_lease(lease_id)
        print(f"[{worker_id}] Released lease {lease_id}")

def do_work(task_id: str, fencing_token: int):
    # Pass fencing_token to downstream storage so stale holders are rejected
    print(f"Processing task {task_id} with fence={fencing_token}")
```

---

## Key concepts

### TTL and automatic expiry

Every lease has a `ttl_ms` (time-to-live in milliseconds). If the holder crashes or hangs without releasing the lease, it expires automatically and the next worker can acquire it. Choose a TTL that is:
- **Long enough** that renewing in the normal case is comfortable (rule of thumb: renew at 50% of TTL).
- **Short enough** that a crashed worker is evicted quickly.

A `ttl_ms` of 30 000 ms (30 s) with a renew interval of 15 s is a reasonable starting point for most tasks.

### Renew before expiry

Call `POST /api/v1/leases/:id/renew` while the lease is still valid. Renewing an already-expired lease returns 404. Set a timer to renew at roughly half the TTL.

### Contention and the 409 pattern

When `POST /api/v1/states/:state_key/lease` returns **409**, the state key is already locked. The correct response is to **skip** that task and move to the next one — not to retry in a tight loop. This is the exact pattern that eliminates double-processing in fan-out agent fleets:

```
for task_id in queue:
    try:
        acquire lease for task_id
    except 409:
        continue          # another worker has it
    process task_id
    release lease
```

### Fencing tokens

Each new lease issued for a state key increments a monotonically increasing `fencing_token`. Pass this token to your downstream storage (database, object store, external API) when writing the task result. The storage layer should reject any write with a fencing token lower than the highest it has seen — this prevents a slow, formerly-expired holder from overwriting work done by its successor.

### Coordinate N workers with one state key per task

Create one lease per logical work unit (e.g., `task:<id>`, `job:<batch>:<shard>`). Workers race to acquire; the winner processes; all others move on. No queue service needed.

---

[Get a free API key at agentstate.app](https://agentstate.app) or see [getting-started.md](../getting-started.md) for a two-minute setup guide.
