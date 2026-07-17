# Plan 007: Guard lease renew/release UPDATEs against races

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/services/leases.ts`
> On change, compare "Current state" excerpts to live code; mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

`renewLease` and `releaseLease` do check-then-act: SELECT the lease, branch on `releasedAt`/`expiresAt` in JS, then `UPDATE ... WHERE id = ?` with **no state guard in the WHERE**. Between select and update, a concurrent release or an expiry-driven re-acquire can change the row. `renewLease` then stamps a fresh `expiresAt` onto an already-released lease (it never clears `releasedAt`) and returns success with a future `expires_at` for a lease the caller no longer holds — a misleading success on a coordination primitive. Mutual exclusion itself stays safe (acquire is protected by the partial unique index `state_leases_active_unique_idx`), so this is a correctness-of-response fix, not a lock-safety hole.

## Current state

- `packages/api/src/services/leases.ts:120-165`:
  ```ts
  export async function renewLease(db, projectId, leaseId, ttlMs = LEASE_DEFAULT_TTL_MS) {
    const now = Date.now();
    const [lease] = await db.select().from(stateLeases)
      .where(and(eq(stateLeases.id, leaseId), eq(stateLeases.projectId, projectId))).limit(1);
    if (!lease || lease.releasedAt !== null)
      return { error: { code: "NOT_FOUND", message: "Lease not found", status: 404 } };
    if (lease.expiresAt <= now)
      return { error: { code: "LEASE_EXPIRED", message: "Lease has expired", status: 409 } };
    const updates = { expiresAt: now + ttlMs, renewedAt: now };
    await db.update(stateLeases).set(updates).where(eq(stateLeases.id, leaseId));  // ← unguarded
    return { lease: toResponse({ ...lease, ...updates }) };
  }

  export async function releaseLease(db, projectId, leaseId) {
    // same select/branch shape, then:
    await db.update(stateLeases).set({ releasedAt: now }).where(eq(stateLeases.id, leaseId));  // ← unguarded
  }
  ```
- Drizzle D1 UPDATE result exposes changed-row count via `.run()`/result meta — check how other services in this repo read update counts (grep `meta.changes` or `.returning(` under `packages/api/src/services/`) and match that idiom. `.returning()` is supported on D1 and is the cleanest: 0 rows returned = lost the race.
- Error envelope + `LeaseError` shape as in the excerpt. Contention tests exist: `packages/api/test/v2-leases-contention.test.ts` — the exemplar for race-style tests.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests | `cd packages/api && bunx vitest run leases` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/services/leases.ts` (`renewLease`, `releaseLease` only)
- Lease tests (extend `v2-leases-contention.test.ts` or the main leases suite)

**Out of scope**:
- `createLease` / acquire logic and the partial unique index — already race-safe.
- Route handlers in `routes/leases/index.ts` and `routes/states/index.ts` — the service return shapes don't change.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `fix(api): guard lease renew/release updates with state predicates`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Guard `renewLease`

Add the state predicates to the UPDATE and detect 0-row updates:

```ts
const rows = await db.update(stateLeases).set(updates)
  .where(and(
    eq(stateLeases.id, leaseId),
    eq(stateLeases.projectId, projectId),
    isNull(stateLeases.releasedAt),
    gt(stateLeases.expiresAt, now),
  ))
  .returning({ id: stateLeases.id });
if (rows.length === 0) {
  // re-select to return the accurate error (released → NOT_FOUND, expired → LEASE_EXPIRED)
}
```

Keep the pre-select (it produces the right error codes and the response payload); the guard makes the final write correct. On 0-row update, re-select once and map to the same 404/409 codes as the existing branches.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: Guard `releaseLease`

Same pattern: `isNull(stateLeases.releasedAt)` in the WHERE; 0 rows → re-select → `NOT_FOUND` (matching current semantics where an already-released lease is a 404).

### Step 3: Tests

- Renew after release (sequentially: acquire → release → renew) → 404, and the row's `releasedAt` remains set / `expiresAt` NOT extended (assert via a direct select).
- Renew after expiry → 409 `LEASE_EXPIRED`.
- Happy-path renew/release unchanged.
- Race-shaped test (pattern: `v2-leases-contention.test.ts`): fire release and renew concurrently; assert the final row is never `releasedAt IS NOT NULL` **with** a renewed future `expiresAt` from a success response — i.e. no client got `lease.expires_at > now` while `releasedAt` is set.

**Verify**: `cd packages/api && bunx vitest run leases` → all pass; then full `bunx vitest run` → all pass

## Test plan

As Step 3; model after `packages/api/test/v2-leases-contention.test.ts`.

## Done criteria

- [ ] Both UPDATEs carry `releasedAt IS NULL` guards (grep `isNull(stateLeases.releasedAt)` shows 2+ hits in `leases.ts` update paths)
- [ ] Typecheck, lint, full vitest run exit 0; new tests pass
- [ ] Public error codes/status unchanged (existing lease tests pass unmodified)
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- `.returning()` on UPDATE misbehaves under vitest-pool-workers D1 (fall back to the repo's `meta.changes` idiom; if neither works, STOP).
- Existing tests depend on renew succeeding for an expired-but-unreleased lease (would contradict the guard).

## Maintenance notes

- If lease "steal on expiry" semantics are added later, the `gt(expiresAt, now)` guard here is the line to revisit.
- Reviewer: confirm the 0-row re-select maps to the *same* error codes clients already handle.
