# Plan 006: Make state Idempotency-Key safe under concurrency (claim-first)

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/routes/states/index.ts packages/api/src/services/states.ts`
> On any in-scope change, compare "Current state" excerpts to live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — reorders the hot state-write path; replay semantics must be preserved exactly
- **Depends on**: none (but land plan 001 first if both touch `routes/states/index.ts` in the same period, to avoid merge conflicts)
- **Category**: bug
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

The `Idempotency-Key` flow on state PUT/DELETE is read → mutate → store. Two identical concurrent requests both miss the read, both run `upsertState` (each appending a `state_events` row — two sequences, two snapshots), and then `INSERT OR IGNORE` silently drops the second idempotency record. Idempotency currently protects only *sequential* retries — not the concurrent-retry case (client timeout + retry racing the original) it exists for. Fix: atomically **claim** the key before mutating; a loser of the claim race replays or gets a clear conflict, never a second mutation.

## Current state

- Route flow — `packages/api/src/routes/states/index.ts:173-212` (PUT; DELETE at :240+ is identical in shape):
  ```ts
  const requestHash = await buildIdempotencyHash("PUT", stateKey, data);      // :180
  const cached = await readIdempotency(d1, projectId, idempotencyKey, requestHash); // :181
  if (cached.error) return errorResponse(...);   // 409 IDEMPOTENCY_CONFLICT on hash mismatch
  if (cached.replay) return cached.replay;       // replays stored response
  const result = await upsertState(...);          // :191 — the mutation
  await storeIdempotency(d1, projectId, idempotencyKey, requestHash, status, body); // :202
  ```
- Service — `packages/api/src/services/states.ts:118-169`:
  ```ts
  // readIdempotency: SELECT request_hash, response_status, response_body FROM idempotency_keys
  //   WHERE project_id = ? AND key = ?  → {} | {error: IDEMPOTENCY_CONFLICT} | {replay: Response}
  // storeIdempotency: INSERT OR IGNORE INTO idempotency_keys
  //   (id, project_id, key, request_hash, response_status, response_body, created_at)
  ```
- Schema: `idempotency_keys` table — check `packages/api/src/db/schema.ts` for its unique constraint. The claim-first design REQUIRES a unique index on `(project_id, key)`; verify it exists (the `INSERT OR IGNORE` semantics imply it). If absent, a migration is needed — see STOP conditions.
- D1 supports `INSERT ... ON CONFLICT DO NOTHING` and `.run()` returns `meta.changes` — use changes to detect claim-lost.
- Error envelope convention: `{ error: { code: "MACHINE_CODE", message } }` via `errorResponse` in `lib/helpers.ts`.

## Target design (claim-first)

1. New service function `claimIdempotency(d1, projectId, key, requestHash)`:
   - `INSERT OR IGNORE` a **pending** row (`response_status = 0`, `response_body = ''` or NULL sentinel) BEFORE the mutation. `meta.changes === 1` → claimed, proceed.
   - `changes === 0` → row exists: SELECT it. If `request_hash` differs → 409 `IDEMPOTENCY_CONFLICT` (unchanged semantics). If it's a completed row → replay stored response (unchanged semantics). If it's a *pending* row (another request in flight) → return 409 `IDEMPOTENCY_IN_FLIGHT` ("A request with this Idempotency-Key is already in progress; retry shortly").
2. After the mutation succeeds, `UPDATE idempotency_keys SET response_status = ?, response_body = ? WHERE project_id = ? AND key = ?` (completes the claim).
3. If the mutation **fails**, delete the pending row (so the client's retry isn't stuck behind a dead claim). Wrap in try/finally.
4. `readIdempotency`'s replay logic must skip pending rows (status 0) — fold it into `claimIdempotency` and delete the now-unused route-level pre-read, or keep `readIdempotency` solely for internal reuse.

Pick `response_status = 0` as the pending sentinel (no real HTTP status is 0); if you find NULL is cleaner given the column's nullability in schema.ts, use NULL — but be consistent and comment it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests | `cd packages/api && bunx vitest run states` | all pass |
| Full suite | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/services/states.ts` (claim/complete/release functions; adjust `readIdempotency`)
- `packages/api/src/routes/states/index.ts` (PUT `:state_key` and DELETE `:state_key` handlers only)
- `packages/api/test/` — extend the states suite (find it via `grep -l idempotency packages/api/test/*.ts`)
- `packages/api/drizzle/` + `db/schema.ts` ONLY IF the unique index on `(project_id, key)` is missing (STOP first and confirm — see below)

**Out of scope**:
- `upsertState`/`deleteState` internals and event sequencing.
- Conversations idempotency (if any) — this plan is states only.
- The `/query`, `/watch`, `/events`, lease routes in the same file.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `fix(api): claim idempotency keys before state mutations`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Verify the unique constraint

Inspect `packages/api/src/db/schema.ts` for the `idempotency_keys` table definition and confirm a unique index/constraint on `(project_id, key)`.

**Verify**: quote the schema lines in your report. If absent → STOP.

### Step 2: Implement `claimIdempotency` + completion/release in `services/states.ts`

As per Target design. Keep the same exported error shape (`StateServiceError`) and Response-replay shape the route already consumes.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 3: Rewire PUT and DELETE handlers

Replace the read→mutate→store sequence with claim→mutate→complete (release on failure). Preserve: 409 `IDEMPOTENCY_CONFLICT` on hash mismatch, replay with `Idempotency-Replayed: true` header, no-key requests bypassing idempotency entirely (`if (!key) return {}` fast path must remain).

**Verify**: `cd packages/api && bunx vitest run states` → existing tests pass

### Step 4: Tests

- Sequential replay still works: PUT with key → 200; identical PUT with same key → same body + `Idempotency-Replayed: true`, and only ONE `state_events` row exists for it.
- Hash mismatch → 409 `IDEMPOTENCY_CONFLICT`.
- Concurrent duplicates: fire two identical PUTs with the same key via `Promise.all`. Assert exactly one `state_events` row is created and the other request gets either the replayed response or 409 `IDEMPOTENCY_IN_FLIGHT` (both acceptable; assert the event count strictly).
- Failure release: force a mutation failure (e.g. invalid body that passes claim but fails upsert — if not constructible, unit-test the release function directly) → a subsequent retry with the same key succeeds.

**Verify**: `cd packages/api && bunx vitest run` → all pass

## Test plan

As Step 4. Pattern: the existing states/idempotency tests (locate via `grep -rn "Idempotency" packages/api/test/`).

## Done criteria

- [ ] Typecheck, lint, full vitest run exit 0
- [ ] Concurrent-duplicate test asserts exactly 1 `state_events` row
- [ ] `grep -n "storeIdempotency" packages/api/src/routes/states/index.ts` returns no matches (route uses claim/complete instead)
- [ ] Replay + conflict semantics unchanged (existing idempotency tests pass unmodified, except any that asserted the old double-write behavior)
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- No unique constraint on `idempotency_keys (project_id, key)` — a migration is required; report with the schema excerpt and wait for a decision.
- Existing tests encode the read→store order in a way that makes "unchanged replay semantics" ambiguous.
- D1 `meta.changes` is unavailable/unreliable under vitest-pool-workers for `INSERT OR IGNORE`.
- The DELETE handler's flow differs materially from the PUT excerpt (drift).

## Maintenance notes

- Pending-claim rows from crashed requests: a claim with status 0 older than a few minutes is garbage. `scheduled.ts` (cron) is the natural home for pruning; explicitly deferred — note it in the PR description.
- Reviewer: scrutinize the failure-release path (try/finally) — a leaked pending claim blocks all retries for that key.
- If conversations later gain idempotency keys, reuse `claimIdempotency` rather than reimplementing.
