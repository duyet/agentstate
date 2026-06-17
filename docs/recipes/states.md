# States — Versioned Key/Value Storage for Agents

Use states when you need durable, versioned storage for agent data — task progress, scratchpad context, configuration, or any value that changes over time and must survive restarts. Every write is appended to an immutable event log, giving you full history and time-travel reads.

## Core flow

1. **Write** — call `PUT /api/v1/states/:state_key` with `agent_id` and `data`. Creates the record if new, replaces it if it exists. Returns the current snapshot with a monotonically increasing `latest_sequence`.
2. **Read** — `GET /api/v1/states/:state_key` returns the latest snapshot. Add `?at_sequence=` or `?at_time=` to travel back to any earlier version.
3. **Query** — `POST /api/v1/states/query` finds states by `agent_id`, tags, JSON path predicates, or time range across your whole project.
4. **Watch** — `GET /api/v1/states/watch` opens an SSE stream. The client receives every write and delete event in real time.
5. **Delete** — `DELETE /api/v1/states/:state_key` soft-deletes the record and appends a `delete` event to the log.
6. **Audit** — `GET /api/v1/states/:state_key/events` pages through the full append-only event log.

> Writes are idempotent when you pass an `Idempotency-Key` header. Retrying the same key with the same payload replays the original response without a second write.

---

## curl examples

### Write (upsert) a state

```bash
curl -s -X PUT https://agentstate.app/api/v1/states/agent:pipeline-7/progress \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: run-2024-06-18-step-3" \
  -d '{
    "agent_id": "pipeline-worker-1",
    "data": { "step": 3, "completed": ["ingest", "parse", "validate"], "next": "transform" },
    "metadata": { "run_id": "run-2024-06-18" },
    "tags": ["pipeline", "active"]
  }'
```

**200 — state written:**
```json
{
  "state_key": "agent:pipeline-7/progress",
  "agent_id": "pipeline-worker-1",
  "data": { "step": 3, "completed": ["ingest", "parse", "validate"], "next": "transform" },
  "metadata": { "run_id": "run-2024-06-18" },
  "tags": ["pipeline", "active"],
  "latest_sequence": 3,
  "created_at": 1718700000000,
  "updated_at": 1718700120000,
  "deleted_at": null
}
```

### Read the latest state

```bash
curl -s https://agentstate.app/api/v1/states/agent:pipeline-7/progress \
  -H "Authorization: Bearer as_live_..."
```

### Time-travel read — state as it was at sequence 2

```bash
curl -s "https://agentstate.app/api/v1/states/agent:pipeline-7/progress?at_sequence=2" \
  -H "Authorization: Bearer as_live_..."
```

### Time-travel read — state as it was at a given timestamp

```bash
curl -s "https://agentstate.app/api/v1/states/agent:pipeline-7/progress?at_time=1718700060000" \
  -H "Authorization: Bearer as_live_..."
```

### Query states by agent, tag, and JSON field

```bash
curl -s -X POST https://agentstate.app/api/v1/states/query \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "pipeline-worker-1",
    "tags": ["active"],
    "json_path": "$.next",
    "json_equals": "transform",
    "limit": 20
  }'
```

**200 — query result:**
```json
{
  "data": [
    {
      "state_key": "agent:pipeline-7/progress",
      "agent_id": "pipeline-worker-1",
      "data": { "step": 3, "next": "transform" },
      "latest_sequence": 3,
      "created_at": 1718700000000,
      "updated_at": 1718700120000,
      "deleted_at": null
    }
  ],
  "pagination": {
    "limit": 1,
    "next_cursor": null
  }
}
```

### List the event log (immutable history)

```bash
curl -s "https://agentstate.app/api/v1/states/agent:pipeline-7/progress/events?after=0&limit=50" \
  -H "Authorization: Bearer as_live_..."
```

**200 — event log:**
```json
{
  "data": [
    {
      "sequence": 1,
      "id": "evt_MDEyMzQ1Njc4OTAxMjM0NQ",
      "state_key": "agent:pipeline-7/progress",
      "agent_id": "pipeline-worker-1",
      "event_type": "upsert",
      "data": { "step": 1, "completed": [], "next": "ingest" },
      "metadata": null,
      "tags": ["pipeline", "active"],
      "idempotency_key": null,
      "created_at": 1718700000000
    }
  ],
  "pagination": {
    "limit": 1,
    "next_cursor": "1"
  }
}
```

### Delete a state (optionally under a held lease)

```bash
curl -s -X DELETE https://agentstate.app/api/v1/states/agent:pipeline-7/progress \
  -H "Authorization: Bearer as_live_..." \
  -H "X-Lease-Id: MDEyMzQ1Njc4OTAxMjM0NQ"
# → 200 with { "deleted": true, "event": { ... } }
```

### Watch — SSE stream of all state events for the project

```bash
# Reconnect from last-seen sequence with Last-Event-ID
curl -s -N -H "Authorization: Bearer as_live_..." \
  -H "Last-Event-ID: 42" \
  "https://agentstate.app/api/v1/states/watch"

# Or with a capability token via query param (no custom header support in some SSE clients)
curl -s -N "https://agentstate.app/api/v1/states/watch?token=as_cap_...&after=42"
```

**SSE events:**
```
id: 3
event: state.upsert
data: {"sequence":3,"state_key":"agent:pipeline-7/progress","agent_id":"pipeline-worker-1","event_type":"upsert","data":{"step":3},...}
```

---

## TypeScript SDK

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

const client = new AgentState({ apiKey: "as_live_..." });

// Write state with idempotency key
const state = await client.upsertState(
  "agent:pipeline-7/progress",
  {
    agent_id: "pipeline-worker-1",
    data: { step: 3, completed: ["ingest", "parse"], next: "transform" },
    metadata: { run_id: "run-2024-06-18" },
    tags: ["pipeline", "active"],
  },
  { idempotencyKey: "run-2024-06-18-step-3" },
);
console.log(`Sequence: ${state.latest_sequence}`);

// Read latest state
const latest = await client.getState("agent:pipeline-7/progress");

// Time-travel reads
const atSeq = await client.getState("agent:pipeline-7/progress", { at_sequence: 2 });
const atTime = await client.getState("agent:pipeline-7/progress", { at_time: 1718700060000 });

// Query across all states in the project
const results = await client.queryStates({
  agent_id: "pipeline-worker-1",
  tags: ["active"],
  json_path: "$.next",
  json_equals: "transform",
  limit: 20,
});
for (const s of results.data) {
  console.log(`${s.state_key}  seq=${s.latest_sequence}`);
}

// List the append-only event log
const events = await client.listStateEvents("agent:pipeline-7/progress", { after: 0, limit: 50 });
for (const evt of events.data) {
  console.log(`seq=${evt.sequence}  type=${evt.event_type}  at=${evt.created_at}`);
}

// Delete (optionally guarded by a lease)
const del = await client.deleteState("agent:pipeline-7/progress");
console.log(`Deleted: ${del.deleted}, event seq=${del.event.sequence}`);

// Acquire a lease before writing (to ensure exactly-one-writer)
// See leases.md for the full lease recipe.
const lease = await client.createStateLease("agent:pipeline-7/progress", {
  holder: "pipeline-worker-1",
  ttl_ms: 30_000,
});

// Write under the lease, then release
await client.upsertState(
  "agent:pipeline-7/progress",
  { agent_id: "pipeline-worker-1", data: { step: 4 }, lease_id: lease.id },
);
await client.releaseStateLease(lease.id);
```

---

## Python SDK

```python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

# Write state with idempotency key
state = client.upsert_state(
    "agent:pipeline-7/progress",
    {
        "agent_id": "pipeline-worker-1",
        "data": {"step": 3, "completed": ["ingest", "parse"], "next": "transform"},
        "metadata": {"run_id": "run-2024-06-18"},
        "tags": ["pipeline", "active"],
    },
    idempotency_key="run-2024-06-18-step-3",
)
print(f"Sequence: {state['latest_sequence']}")

# Read latest state
latest = client.get_state("agent:pipeline-7/progress")

# Time-travel reads
at_seq = client.get_state("agent:pipeline-7/progress", at_sequence=2)
at_time = client.get_state("agent:pipeline-7/progress", at_time=1718700060000)

# Query across all states in the project
results = client.query_states({
    "agent_id": "pipeline-worker-1",
    "tags": ["active"],
    "json_path": "$.next",
    "json_equals": "transform",
    "limit": 20,
})
for s in results["data"]:
    print(f"{s['state_key']}  seq={s['latest_sequence']}")

# List the append-only event log
events = client.list_state_events("agent:pipeline-7/progress", after=0, limit=50)
for evt in events["data"]:
    print(f"seq={evt['sequence']}  type={evt['event_type']}  at={evt['created_at']}")

# Delete (optionally guarded by a lease)
result = client.delete_state("agent:pipeline-7/progress")
print(f"Deleted: {result['deleted']}")

# Acquire a lease before writing (to ensure exactly-one-writer)
# See leases.md for the full lease recipe.
lease = client.create_state_lease(
    "agent:pipeline-7/progress",
    holder="pipeline-worker-1",
    ttl_ms=30_000,
)

# Write under the lease, then release
client.upsert_state(
    "agent:pipeline-7/progress",
    {"agent_id": "pipeline-worker-1", "data": {"step": 4}, "lease_id": lease["id"]},
)
client.release_state_lease(lease["id"])
```

---

## Key concepts

### Key/value model with an append-only event log

Each state is a key/value record identified by a `state_key` you choose (e.g., `agent:run-42/checkpoint`). Every `PUT` or `DELETE` appends an immutable event to the state's log and increments `latest_sequence`. The event log is permanent; you can always replay history or audit past values.

### Idempotency keys

Pass `Idempotency-Key: <string>` on `PUT` or `DELETE`. If the server has already processed that key, it returns the original response without performing a second write. This makes retries safe across network failures or timeouts. The key is scoped to your project.

### Time-travel reads

`GET /api/v1/states/:state_key?at_sequence=N` returns the state snapshot as it existed when sequence `N` was written. `?at_time=<unix_ms>` returns the last snapshot written at or before that timestamp. Both parameters are exclusive — supply at most one per request.

### SSE watch — real-time event stream

`GET /api/v1/states/watch` opens a `text/event-stream` connection. Every `PUT` and `DELETE` across your whole project emits an SSE event with `event: state.upsert` or `event: state.delete`. Resume from a checkpoint using `Last-Event-ID: <sequence>` or `?after=<sequence>`. Pass `?token=as_cap_...` to authenticate via query string when your SSE client cannot set custom headers. Requires scope `state:watch`.

### Allowed scopes

| Scope | Routes permitted |
|-------|-----------------|
| `state:read` | `GET /:state_key`, `GET /:state_key/events`, `POST /query` |
| `state:write` | `PUT /:state_key`, `DELETE /:state_key` |
| `state:watch` | `GET /watch` |
| `lease:write` | `POST /:state_key/lease` |

Project API keys (`as_live_...`) have implicit access to all routes. Capability tokens (`as_cap_...`) are restricted to the scopes listed at mint time. See [capability-tokens.md](capability-tokens.md) for how to delegate scoped access to sub-agents.

### Lease-guarded writes

Pass `lease_id` in the `PUT` or `DELETE` body, or pass it as `?lease_id=` (DELETE only) or `X-Lease-Id` header (DELETE only), to bind the mutation to a held lease. If the lease has expired or was released, the request is rejected. This prevents stale agents from overwriting work done by the current lease holder. See [leases.md](leases.md) for the full lease recipe.

### QueryStates — filter options

The `POST /api/v1/states/query` body accepts:

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Exact-match filter on the writing agent |
| `tags` | string[] | States that carry all listed tags |
| `updated_after` | number (ms) | States updated after this Unix timestamp |
| `updated_before` | number (ms) | States updated before this Unix timestamp |
| `json_path` | string | JSONPath expression evaluated against `data` |
| `json_equals` | any | Value `json_path` must equal |
| `predicates` | `{path, equals}[]` | Up to 10 additional JSON predicates |
| `at_sequence` | number | Return each state as it appeared at this global sequence |
| `at_time` | number (ms) | Return each state as it appeared at this time |
| `limit` | number | Max records per page (default 50, max 100) |
| `cursor` | string | Pagination cursor from previous response |

---

[Get a free API key at agentstate.app](https://agentstate.app) or see [getting-started.md](../getting-started.md) for a two-minute setup guide.
