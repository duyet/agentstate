# Plan 005: Test conversation search (LIKE-escaping + cursor pagination)

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/routes/conversations/search.ts packages/api/src/services/conversation-search.ts`
> On any in-scope change, compare "Current state" excerpts to live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (additive tests only)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

`GET /api/v1/conversations/search` is a user-facing query path with security-relevant LIKE-wildcard escaping and composite-cursor pagination — and it has **zero tests** (no test in `packages/api/test/` references `searchConversations` or `/search`). Escaping regressions would reintroduce wildcard injection; cursor regressions cause skipped/duplicated results. Characterize the behavior now.

## Current state

- Route — `packages/api/src/routes/conversations/search.ts:16`:
  ```ts
  router.get("/search", requireScope("conversations:read"), async (c) => {
    // requires non-empty q, parses limit (default 20), validates cursor:
    // composite "<updatedAt>.<id>" with bare "<updatedAt>" accepted for back-compat
  ```
- Escaping — `packages/api/src/services/conversation-search.ts`:
  ```ts
  export function escapeLikePattern(input: string): string {
    return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }
  // used as: sql`${messages.content} LIKE ${`%${escapedQuery}%`} ESCAPE '\\'`
  // NOTE: '[' is intentionally NOT escaped (SQLite LIKE treats it as literal).
  ```
- `buildSnippet(content, query)` in the same file returns a ≤SNIPPET_MAX_LEN snippet with `…` where truncated; falls back to the content head when no exact match.
- Pagination mirrors `listConversations`: composite `(updated_at, id)` comparison for deterministic ordering across shared timestamps.
- Test harness exemplar: `packages/api/test/conversations.test.ts` — it seeds conversations/messages through the API/service layer and asserts response shapes; mirror its setup (auth key, app instance, D1 bindings).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run new suite | `cd packages/api && bunx vitest run search` | all pass |
| Full suite | `cd packages/api && bunx vitest run` | all pass |

## Scope

**In scope**:
- New file `packages/api/test/conversation-search.test.ts`

**Out of scope**:
- Any change to `search.ts` or `conversation-search.ts`. If a test reveals a real bug, STOP and report it — don't fix here.
- FTS or search-behavior improvements.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `test(api): cover conversation search escaping and cursor pagination`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Harness + happy path

Copy the setup pattern from `packages/api/test/conversations.test.ts`. Seed 3 conversations whose messages contain distinct markers. Assert `GET /api/v1/conversations/search?q=<marker>` returns only the matching conversation, with a snippet containing the marker.

**Verify**: `cd packages/api && bunx vitest run search` → passes

### Step 2: Wildcard-literal tests (the security-relevant ones)

- Seed a message containing a literal `100%` and another containing `100x`. Search `q=100%` (URL-encoded `100%25`) must match only the literal-`%` message — proving `%` is escaped.
- Same for `_`: seed `a_b` and `axb`; `q=a_b` matches only `a_b`.
- Seed a message containing `[`; `q=[` must match it (the not-escaped-on-purpose case documented in `escapeLikePattern`).

### Step 3: Validation + cursor tests

- Empty/missing `q` → 400 with `{ error: { code: "BAD_REQUEST" } }`.
- Seed >limit matching conversations; page 1 with `limit=2`, follow the returned cursor, assert no overlap and no gap across pages (union of pages = full match set, intersection empty).
- Bare-timestamp legacy cursor (`<updatedAt>` without `.id`) is accepted (200, sane results).
- Malformed cursor (e.g. `abc`) → the route's documented error response (read the validation branch in `search.ts:35+` and assert what it actually returns).

**Verify (final)**: `cd packages/api && bunx vitest run` → all pass; ≥8 new tests

## Test plan

Steps 1–3 constitute it. Pattern file: `packages/api/test/conversations.test.ts`.

## Done criteria

- [ ] `packages/api/test/conversation-search.test.ts` exists with ≥8 tests incl. `%`, `_`, and `[` literal cases and a two-page cursor walk
- [ ] `cd packages/api && bunx vitest run` exits 0
- [ ] No files under `packages/api/src/` modified (`git status`)
- [ ] `plans/README.md` row updated

## STOP conditions

- A wildcard test fails against current behavior (real injection/escaping bug) — report as a finding, do not patch source.
- The search route requires scopes/harness setup materially different from `conversations.test.ts` and you cannot authenticate within the existing test utilities.

## Maintenance notes

- If search ever moves to FTS5, keep these tests as the behavioral contract (literal-wildcard semantics must survive the migration).
- Reviewer: confirm the `%`/`_` tests assert *exclusion* of the non-literal rows, not just inclusion.
