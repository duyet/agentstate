# Plan 002: Match webhook events by exact array membership, not substring LIKE

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/services/webhooks.ts packages/api/test/webhooks.test.ts`
> On any in-scope change, compare "Current state" excerpts to live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

`getActiveWebhooksForEvent` decides which webhooks receive an event by running a substring `LIKE` over the JSON-serialized events array. Substring matching cross-matches overlapping event names: an event `state.update` would match a webhook subscribed only to `["state.updated"]`, and a webhook subscribed to `["conversation.created"]` would match a hypothetical `conversation.create` query. Only one event type exists today (`conversation.created`), so the bug is latent — but it fires the moment a second overlapping event name ships, delivering webhooks to endpoints that never subscribed. Fix it now while it's cheap and testable.

## Current state

- `packages/api/src/services/webhooks.ts:219-244` — the matcher:
  ```ts
  export async function getActiveWebhooksForEvent(
    db: DrizzleD1Database,
    projectId: string,
    event: string,
  ): Promise<Array<{ id: string; url: string; secret: string }>> {
    const pattern = `%${escapeLikePattern(event)}%`;
    const rows = await db
      .select({ id: webhooks.id, url: webhooks.url, secret: webhooks.secret })
      .from(webhooks)
      .where(
        and(
          eq(webhooks.projectId, projectId),
          eq(webhooks.active, true),
          sql`json_extract(${webhooks.events}, '$') LIKE ${pattern}`,
        ),
      );
    return rows;
  }
  ```
- `webhooks.events` is a TEXT column holding a JSON array (see `serializeEvents`/`parseEvents` in the same file, lines 48-63).
- The DB is D1 (SQLite) — `json_each` is available.
- Valid event names: `WEBHOOK_EVENTS = ["conversation.created"]` in `packages/api/src/lib/webhook.ts:7`.
- Tests live in `packages/api/test/webhooks.test.ts` (currently covers URL safety + HMAC helpers).
- Convention: Drizzle with raw `sql` fragments for JSON functions is already the local pattern (see the excerpt) — keep using bound parameters, never string interpolation of user input.

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Lint      | `bunx biome check packages/api/src/` | exit 0 |
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests     | `cd packages/api && bunx vitest run webhooks` | all pass |

## Scope

**In scope**:
- `packages/api/src/services/webhooks.ts` (only `getActiveWebhooksForEvent`; the `escapeLikePattern` import becomes unused — remove the import if nothing else in the file uses it)
- `packages/api/test/webhooks.test.ts` (add matcher tests)

**Out of scope**:
- `packages/api/src/services/conversation-search.ts` — `escapeLikePattern`'s home; still used by search. Do not touch.
- Webhook delivery/retry logic (`lib/webhook.ts`) — covered by plans 003/004.
- The events column format — do not migrate the schema.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; semantic commit, e.g. `fix(api): exact-match webhook event subscriptions via json_each`; include both co-author trailers from CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Replace the LIKE predicate with json_each membership

Target shape (bound parameter for the event string):

```ts
sql`EXISTS (SELECT 1 FROM json_each(${webhooks.events}) WHERE json_each.value = ${event})`
```

Remove the `pattern` variable; drop the now-unused `escapeLikePattern` import if unused elsewhere in the file.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: Add matcher tests

In `packages/api/test/webhooks.test.ts`, using the existing test setup pattern in that file (or `conversations.test.ts` if webhooks.test.ts lacks a DB harness), insert webhooks rows and assert:

1. Subscribed `["conversation.created"]` + event `conversation.created` → matched.
2. Subscribed `["state.updated"]` + event `state.update` → **not** matched (the regression this plan fixes).
3. Subscribed `["a.b","conversation.created"]` + event `conversation.created` → matched (multi-entry arrays).
4. Inactive webhook with matching subscription → not matched.

**Verify**: `cd packages/api && bunx vitest run webhooks` → all pass, 4 new tests

## Test plan

As Step 2. Structural pattern: whichever existing suite in `packages/api/test/` seeds D1 rows directly (grep for `db.insert(webhooks)` or raw INSERT usage) — mirror it.

## Done criteria

- [ ] `bunx biome check packages/api/src/` exits 0
- [ ] `bunx tsc --noEmit -p packages/api/tsconfig.json` exits 0
- [ ] `cd packages/api && bunx vitest run` exits 0, incl. the substring-negative test
- [ ] `grep -n "LIKE" packages/api/src/services/webhooks.ts` returns no matches
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- `json_each` with a Drizzle column reference fails to compile/execute against the vitest-pool-workers D1 — report the error rather than reverting to LIKE.
- `escapeLikePattern` turns out to be used elsewhere in `webhooks.ts` beyond the matcher.
- The webhooks test file has no DB harness and adding one would require touching shared test setup files not listed in scope.

## Maintenance notes

- When a second webhook event type is added (e.g. `state.updated`), add it to `WEBHOOK_EVENTS` in `lib/webhook.ts` and extend test case 2's overlap coverage.
- Reviewer should confirm the event string is passed as a bound parameter, not interpolated.
