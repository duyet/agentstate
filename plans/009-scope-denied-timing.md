# Plan 009: Pad scope-denied auth responses to match auth-failure timing

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/middleware/scoped-auth.ts`
> On change, compare "Current state" excerpts; mismatch → STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

Auth failures in this codebase are deliberately padded to a 300 ms minimum (see `AUTH_FAILURE_MIN_MS` in `middleware/auth.ts:14` and the same pattern in `scoped-auth.ts`) so invalid credentials are indistinguishable by timing. But the **scope-denied** branch returns a fast 403 immediately: a caller holding a token can distinguish "valid credential, insufficient scope" (fast 403) from "invalid credential" (padded 401), confirming credential validity and enabling scope probing. Minor severity (they already hold the token), but the fix is one helper call per branch — cheap consistency with the existing defense.

## Current state

- `packages/api/src/middleware/scoped-auth.ts`:
  ```ts
  // capability-token branch (:58-63)
  if (!token) return authFailure(c, startedAt);            // padded 401
  const scopes = parseScopesJson(token.scopes);
  if (!scopeSatisfies(scopes, options.scope)) {
    return errorResponse(c, "FORBIDDEN", "Capability token does not have required scope", 403);  // FAST — no padding
  }
  // API-key branch (:87-93)
  if (!apiKey) return authFailure(c, startedAt);           // padded 401
  const scopes = effectiveKeyScopes(apiKey.scopes);
  if (!scopeSatisfies(scopes, options.scope)) {
    return errorResponse(c, "FORBIDDEN", `Missing required scope: ${options.scope}`, 403);        // FAST — no padding
  }
  ```
- The padding helper pattern (from `middleware/auth.ts:17-22`): compute `remainingMs = max(0, AUTH_FAILURE_MIN_MS - (performance.now() - startedAt))`, `await setTimeout`, then return. `scoped-auth.ts` has its own `authFailure`-style helper — locate it in the same file and reuse its delay logic.
- Also check `middleware/require-scope.ts` and `middleware/mcp-auth.ts` for the same fast-403 pattern; if present, apply the identical fix there (they are in scope).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/middleware/scoped-auth.ts`
- `packages/api/src/middleware/require-scope.ts`, `packages/api/src/middleware/mcp-auth.ts` (only if they contain the same fast-403 scope-denied pattern)
- Existing middleware tests (adjust timing expectations if any assert response speed)

**Out of scope**:
- Changing the 403 status or `FORBIDDEN` code — keep the distinct status; pad the timing only. (Clients depend on 403-vs-401 semantics.)
- `middleware/auth.ts` — already correct.

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `fix(api): apply constant-time padding to scope-denied responses`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Extract/reuse a delay helper and pad the 403 branches

In `scoped-auth.ts`, before returning the 403 in both branches, await the same minimum-elapsed delay used by its `authFailure` (e.g. factor a `padAuthTiming(startedAt)` helper). Keep messages and status codes byte-identical.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: Sweep the other scope-checking middlewares

Grep `403` in `require-scope.ts` and `mcp-auth.ts`; apply the same padding where a scope check can reject a *valid* credential fast. Skip any branch that runs after full auth on cache hits without a `startedAt` — if no timing baseline exists in that middleware, note it in the report rather than restructuring.

### Step 3: Tests

Existing suites already assert 403s for underscoped credentials (grep `FORBIDDEN` in `packages/api/test/`) — they must pass unchanged. Add one test asserting a scope-denied response takes ≥ the padding minimum **only if** the test runtime's timers make that reliable; otherwise assert behavior (403 + code) and note timing is untestable in the report.

**Verify**: `cd packages/api && bunx vitest run` → all pass

## Done criteria

- [ ] Both 403 branches in `scoped-auth.ts` await the padding before returning (code inspection)
- [ ] Typecheck, lint, full vitest run exit 0; no 403 codes/messages changed
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- Padding the 403 breaks latency-sensitive tests or the vitest pool's fake-timer behavior in ways not fixable by advancing timers.
- `scoped-auth.ts` has no `startedAt`/delay helper to reuse (drift).

## Maintenance notes

- Any future middleware that rejects a *valid* credential (expiry, revocation, scope) should route through the same padding helper — worth a comment on the helper saying so.
