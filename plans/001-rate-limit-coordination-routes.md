# Plan 001: Rate-limit the states/leases/claims/MCP routers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/routes/states packages/api/src/routes/leases packages/api/src/routes/claims packages/api/src/routes/mcp packages/api/src/middleware/rate-limit.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

Every conversation-facing router (`conversations`, `tags`, `keys`, `v1-keys`, `ai`, `webhooks`, `capability-tokens`, `analytics-public`) chains `rateLimitMiddleware`, but the write-heavy coordination surface — states, leases, claims, and the MCP endpoint — has **no rate limiting at all**. Each `PUT /api/v1/states/:key` inserts a `state_events` row and fans out a Durable Object notify, so one authenticated key (or a leaked capability token) can drive unlimited D1 writes and DO traffic: cost abuse and a noisy-neighbor path across the shared database.

## Current state

- `packages/api/src/middleware/rate-limit.ts` — the existing limiter. Default path is an atomic D1 fixed-window (100 req / 60 s per `apiKeyHash`); an opt-in KV sliding window sits behind `USE_SLIDING_WINDOW`. It only needs `apiKeyHash` in the Hono context, which the auth middlewares below already set.
- `packages/api/src/routes/states/index.ts` — routes attach auth per-route, no limiter:
  ```ts
  // states/index.ts:50
  router.get("/watch", scopedAuth({ scope: "state:watch", allowQueryToken: true }), async (c) => {
  // :101  router.post("/query", scopedAuth({ scope: "state:read" }), ...)
  // :125  router.post("/:state_key/lease", scopedAuth({ scope: "lease:write" }), ...)
  // :173  router.put("/:state_key", scopedAuth({ scope: "state:write" }), ...)
  // :240  router.delete("/:state_key", scopedAuth({ scope: "state:write" }), ...)
  ```
- `packages/api/src/routes/leases/index.ts:16,29` — `POST /:id/renew` and `DELETE /:id`, per-route `scopedAuth`, no limiter.
- `packages/api/src/routes/claims/index.ts:86` — `router.use("*", scopedAuth({ scope: "claim:write" }))`, no limiter.
- `packages/api/src/routes/mcp/index.ts:57` — `router.use("*", mcpAuth)`, no limiter.
- Convention exemplar — `packages/api/src/routes/conversations/index.ts:16`:
  ```ts
  import { rateLimitMiddleware } from "../../middleware/rate-limit";
  router.use("*", rateLimitMiddleware);
  ```
- `scopedAuth` (`packages/api/src/middleware/scoped-auth.ts`) sets `c.set("apiKeyHash", hash)` for both API keys and capability tokens; `mcpAuth` (`packages/api/src/middleware/mcp-auth.ts`) — verify it also sets `apiKeyHash` before relying on it (see STOP conditions).
- Ordering constraint: the limiter keys on `apiKeyHash`, so it must run **after** auth. Because states/leases attach auth per-route (not `router.use`), a bare `router.use("*", rateLimitMiddleware)` at the top would run *before* auth with no `apiKeyHash`. Read how `rateLimitMiddleware` behaves when `apiKeyHash` is unset before choosing placement — the safe pattern is to add the limiter as a second per-route middleware after `scopedAuth(...)`, or convert the router to `router.use("*", scopedAuth-equivalent)` where all routes share a scope (claims already does this).

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Lint      | `bunx biome check packages/api/src/` | exit 0 |
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests     | `cd packages/api && bunx vitest run` | all pass |

## Scope

**In scope** (the only files you should modify):
- `packages/api/src/routes/states/index.ts`
- `packages/api/src/routes/leases/index.ts`
- `packages/api/src/routes/claims/index.ts`
- `packages/api/src/routes/mcp/index.ts`
- New/extended tests under `packages/api/test/` (e.g. `rate-limit.test.ts` or a new `states-rate-limit.test.ts`)

**Out of scope** (do NOT touch):
- `packages/api/src/middleware/rate-limit.ts` — do not change limits or algorithm; wiring only. (Exception: if a per-router limit override is truly required for MCP, STOP and report instead of refactoring the middleware.)
- All other routers — they already have the limiter.
- The SSE `/watch` route's streaming behavior: the limiter must count the connection request once, not per event. Do not wrap the stream.

## Git workflow

- Branch: `claude/improvement-<timestamp>` (repo convention, see CLAUDE.md)
- Semantic commits, e.g. `fix(api): rate-limit states/leases/claims/mcp routers`
- Include both co-author trailers from CLAUDE.md. Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wire the limiter into the states router

In `packages/api/src/routes/states/index.ts`, import `rateLimitMiddleware` and add it after `scopedAuth(...)` on every route (or as a `router.use` placed so it runs after auth — only if you verify auth runs first). Example target shape:

```ts
router.put("/:state_key", scopedAuth({ scope: "state:write" }), rateLimitMiddleware, async (c) => {
```

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: Wire leases, claims, MCP

- `leases/index.ts`: same per-route pattern on both routes.
- `claims/index.ts`: add `router.use("*", rateLimitMiddleware)` on the line **after** the existing `router.use("*", scopedAuth(...))` at :86.
- `mcp/index.ts`: add `router.use("*", rateLimitMiddleware)` after `router.use("*", mcpAuth)` at :57 — only after confirming `mcpAuth` sets `apiKeyHash` (STOP if it doesn't).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 3: Add tests

Model after the existing rate-limit assertions in `packages/api/test/` (grep for `429` / `RATE_LIMIT` to find the pattern; `packages/api/test/conversations.test.ts` and any `rate-limit` suite are exemplars). Add, for at least the states PUT route and one MCP call: after exceeding the limit within a window, the route returns 429 with the standard error envelope `{ error: { code, message } }`.

**Verify**: `cd packages/api && bunx vitest run` → all pass, including new tests

## Test plan

- New: states PUT returns 429 past the limit; a request under the limit still succeeds; MCP endpoint returns 429 past the limit (or its JSON-RPC error equivalent — match how other middleware errors surface on the MCP route).
- Existing suites must stay green — especially `states`, `leases`, `claims`, `mcp` test files, which will now pass through the limiter (if existing tests hammer an endpoint >100 times in one window, raise the per-test key variety rather than the limit).

## Done criteria

- [ ] `bunx biome check packages/api/src/` exits 0
- [ ] `bunx tsc --noEmit -p packages/api/tsconfig.json` exits 0
- [ ] `cd packages/api && bunx vitest run` exits 0, new 429 tests pass
- [ ] `grep -L rateLimitMiddleware packages/api/src/routes/states/index.ts packages/api/src/routes/leases/index.ts packages/api/src/routes/claims/index.ts packages/api/src/routes/mcp/index.ts` prints nothing (all four files reference it)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `mcpAuth` does not set `apiKeyHash` in context — the limiter would key on undefined; report instead of inventing a key.
- `rateLimitMiddleware` errors or behaves unexpectedly when placed per-route rather than via `router.use` (e.g. relies on being registered once).
- Existing test suites fail with 429s that can't be resolved by varying test keys — a design decision on limits is needed.
- The SSE `/watch` route breaks (stream closed early / limiter counts events).

## Maintenance notes

- Any new router added under `/api/v1/*` must chain `rateLimitMiddleware` after its auth — reviewers should check this on every new-route PR.
- Follow-up deliberately deferred: a separate (lower) limit bucket for MCP tool calls, and migrating the limiter to a Durable Object / Cloudflare rate-limiting binding (noted in the middleware's own comments).
