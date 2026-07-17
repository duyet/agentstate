# Plan 008: Fix SSE hub event ordering during backlog replay

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/state-stream-hub.ts`
> On change, compare "Current state" excerpt to live code; mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — Durable Object streaming logic; regressions surface as live-stream stalls
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

`StateStreamHub.watch()` adds the client's writer to the broadcast set **before** replaying the backlog. A `/notify` broadcast arriving during the (awaited, D1-backed) backlog drain writes to that same writer, interleaving a new event among — possibly ahead of — older backlog events, and an event present in both the backlog query and the concurrent broadcast is delivered twice. This breaks the ordered, gap-free replay contract implied by `after`/`Last-Event-ID` (`id: <sequence>` lines). Clients tracking `sequence` see regressions or duplicates.

## Current state

- `packages/api/src/state-stream-hub.ts` (105 lines, whole file relevant):
  ```ts
  private async watch(projectId: string, after: number, signal: AbortSignal): Promise<Response> {
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();
    this.writers.add(writer);                       // :47 — registered BEFORE backlog
    const heartbeat = setInterval(...);             // :49 — 15s pings
    signal.addEventListener("abort", () => { ...clearInterval, writers.delete, writer.close... }); // :55
    await this.writeBacklog(writer, projectId, after);  // :61 — D1 SELECT ... WHERE sequence > ? LIMIT 1000
    return new Response(stream.readable, { headers: { "Content-Type": "text/event-stream", ... } });
  }
  private async broadcast(event: StateEventResponse) {   // :93
    const payload = this.encoder.encode(formatSse(event));
    for (const writer of this.writers) { writer.write(payload).catch(() => this.writers.delete(writer)); }
  }
  // formatSse: `id: ${event.sequence}\nevent: state.${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`
  ```
- Callers: `routes/states/index.ts:35-44` (`notifyStateEvent` POSTs `/notify` to the DO via `waitUntil`); `:56-63` forwards `/watch` to the DO. `StateEventResponse` and `mapStateEventRow` come from `services/states.ts`.
- Events carry a monotonically increasing `sequence` (per project) — this is the total order to preserve.
- No tests exist for this DO (also fix that here).

## Target design

Buffer-then-drain, sequence-deduped:

1. In `watch`, do **not** add the writer to `this.writers` immediately. Instead create a pending entry that buffers events: `const pending: StateEventResponse[] = []` registered in a `pendingWatchers` set that `broadcast` appends to.
2. Run `writeBacklog` and track the highest sequence written (`lastSeq`).
3. After backlog completes, flush `pending` entries with `event.sequence > lastSeq` (in order — broadcasts arrive in sequence order from the single-threaded DO, but sort defensively), updating `lastSeq`.
4. Atomically (same microtask — the DO is single-threaded, so no await between flush-end and registration) move the writer into `this.writers` and remove the pending entry.
5. Keep heartbeat/abort cleanup working for both phases (abort during backlog must remove the pending entry too).

Simpler alternative if buffering feels heavy: after backlog, re-run the backlog query with `after = lastSeq` once, then register the writer — accepting a smaller (single-await) window. Prefer the buffer design; it closes the window completely because the DO is single-threaded between awaits.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests | `cd packages/api && bunx vitest run state-stream` | all pass |
| Full suite | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/state-stream-hub.ts`
- New test `packages/api/test/state-stream-hub.test.ts`

**Out of scope**:
- `routes/states/index.ts` — the `/watch` fallback path (non-DO SSE) and `notifyStateEvent` are unchanged.
- SSE wire format (`formatSse`) and heartbeat interval.
- Backpressure/slow-client handling beyond what exists.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `fix(api): buffer live events during SSE backlog replay for ordered delivery`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Implement buffer-then-drain in `watch`/`broadcast`

As per Target design. Keep the public `fetch` routing (`/notify`, `/watch`) identical.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: DO tests

`@cloudflare/vitest-pool-workers` exposes DO bindings in tests (see how existing tests get `env` — grep `env.` in `packages/api/test/e2e.test.ts` for the pattern; the binding name is `STATE_STREAM_HUB` per `routes/states/index.ts:30`). Tests:

1. Backlog only: seed `state_events` rows, GET `/watch?after=0`, read the stream → events arrive in ascending `sequence`, all seeded rows present.
2. Broadcast to a live watcher: connect (empty backlog), POST `/notify` → event arrives.
3. **The regression case**: seed a backlog large enough to keep replay busy (or stub `writeBacklog` timing), POST `/notify` mid-replay, then assert the client's received `id:` sequence numbers are strictly ascending with no duplicates.
4. Abort during replay: cancel the request → no writer leaked (subsequent `/notify` doesn't throw; if writer-set size isn't observable, assert via behavior).

If driving a streaming Response + concurrent notify inside the pool proves impossible (see STOP conditions), restructure the ordering logic into a pure, testable function (event-source merge given backlog rows + live events) and unit-test that instead, keeping a smoke test for the DO endpoints.

**Verify**: `cd packages/api && bunx vitest run state-stream` → all pass; full suite green

## Test plan

As Step 2. Strictly-ascending-sequence assertion in test 3 is the contract.

## Done criteria

- [ ] `this.writers.add(writer)` no longer occurs before `writeBacklog` completes (code inspection + test 3)
- [ ] New DO test file exists; full vitest run exits 0
- [ ] Lint + typecheck exit 0
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- vitest-pool-workers cannot exercise this DO (binding missing in test env config, or streaming reads hang) after one honest attempt at the documented approach — report with the config details and fall back per Step 2's last paragraph only if that fallback was approved in your dispatch.
- The current-state excerpt doesn't match (file drifted).
- Fixing ordering appears to require changing `formatSse` or the route contract.

## Maintenance notes

- The 1000-row backlog LIMIT means a client further behind than 1000 events silently gaps — pre-existing, out of scope, but worth a follow-up finding if pagination of backlog is desired.
- Reviewer: check the abort path during the pending phase (no leaked buffer entries), and that no `await` sits between buffer-flush completion and writer registration.
