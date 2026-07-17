# Plan 004: Test the webhook retry/backoff/timeout logic

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/lib/webhook.ts packages/api/test/webhooks.test.ts`
> Note: plan 003 intentionally edits `lib/webhook.ts` (deletes `deliverWebhooks`).
> That change is expected drift — proceed. Any change to `sendWebhookWithRetry`
> itself (lines 58-144 at planning time) is a STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (additive tests only)
- **Depends on**: plans/003-webhook-delivery-parallel.md (land first so tests target the surviving implementation)
- **Category**: tests
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

`sendWebhookWithRetry` is the outbound-delivery core: 3 attempts, 1 s/2 s backoff, 10 s per-attempt timeout, HMAC signing, SSRF re-check. It has **zero tests** — `packages/api/test/webhooks.test.ts` covers only the URL-safety guard and the HMAC helper. Retry-heavy async code is exactly where silent regressions happen (retry-on-success, wrong attempt counts, swallowed errors). This plan adds unit tests with a mocked `fetch`.

## Current state

- `packages/api/src/lib/webhook.ts:58-144` — `sendWebhookWithRetry(url, secret, payload)`:
  - Re-validates the URL first: `if (!isSafeWebhookUrl(url)) return { ..., success: false, error: "Webhook URL blocked...", attempts: 0 }`.
  - Signs payload via `signWebhookPayload` and sends POST with headers `Content-Type: application/json`, `X-AgentState-Signature: <hex hmac>`, `User-Agent: AgentState-Webhooks/1.0`, `signal: AbortSignal.timeout(10000)`.
  - `response.ok` → returns `{ success: true, status, attempts: attempt + 1 }` immediately.
  - Non-OK → retries; after final attempt returns `{ success: false, status, error: "HTTP <status>", attempts }`.
  - Thrown fetch error/timeout → retries; after final attempt returns failure; final fall-through returns `{ success: false, error: "Max retries exceeded", attempts: maxAttempts }`.
  - Backoff delays `[1000, 2000, 4000]` — check the code for exactly where the sleep happens before writing timing assertions.
- Existing test file: `packages/api/test/webhooks.test.ts` — has `describe` blocks for `isSafeWebhookUrl` (~line 93+) and signature verification (~line 428). Follow its imports/structure.
- Test runner: `@cloudflare/vitest-pool-workers` (see `packages/api/vitest.config.ts`). `vi.stubGlobal("fetch", ...)` and `vi.useFakeTimers()` are the standard mocking tools; note `AbortSignal.timeout` + fake timers interact — prefer resolving/rejecting mock fetch promptly and asserting `attempts`, rather than simulating real 10 s timeouts. If fake timers prove incompatible with the workers pool, use short real delays only if total test time stays under ~2 s; otherwise assert attempt counts without timing.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run just this suite | `cd packages/api && bunx vitest run webhooks` | all pass |
| Full suite | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 (tests dir: `bunx biome check packages/api/test/` if configured) |

## Scope

**In scope**:
- `packages/api/test/webhooks.test.ts` (extend) — or a new `packages/api/test/webhook-retry.test.ts` if the existing file's setup doesn't suit global-fetch stubbing.

**Out of scope**:
- Any change to `packages/api/src/lib/webhook.ts` behavior. If a test reveals a real bug, STOP and report the bug — do not fix it inside this plan.
- Delivery orchestration in `services/conversations.ts` (plan 003's territory).

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `test(api): cover sendWebhookWithRetry retry/backoff/timeout paths`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Success short-circuit

Mock fetch → 200 on first call. Assert: `success: true`, `attempts: 1`, fetch called exactly once, request had the three expected headers and the exact payload body.

**Verify**: `cd packages/api && bunx vitest run webhooks` → passes

### Step 2: Retry then succeed

Mock fetch → 500, then 200. Assert `success: true`, `attempts: 2`, fetch called twice.

### Step 3: Exhaustion on persistent 5xx

Mock fetch → 500 × 3. Assert `success: false`, `status: 500`, `error: "HTTP 500"`, `attempts: 3`, fetch called exactly 3 times.

### Step 4: Thrown network error path

Mock fetch → rejects (e.g. `new TypeError("fetch failed")`) × 3. Assert `success: false`, `attempts: 3`, error message propagated or "Max retries exceeded" per the code's actual branch (read the catch block and assert what it really returns).

### Step 5: Unsafe URL short-circuit

Call with an http:// or loopback URL. Assert `success: false`, `attempts: 0`, fetch never called.

**Verify (final)**: `cd packages/api && bunx vitest run` → all pass, ≥5 new tests

## Test plan

Steps 1–5 are the test plan. Structural pattern: the existing `describe`/`it` style in `webhooks.test.ts`. Restore the real fetch in `afterEach` (`vi.unstubAllGlobals()`).

## Done criteria

- [ ] ≥5 new tests exist covering: first-try success, retry-then-success, 5xx exhaustion, thrown-error exhaustion, unsafe-URL short-circuit
- [ ] `cd packages/api && bunx vitest run` exits 0
- [ ] No source files under `packages/api/src/` modified (`git status`)
- [ ] `plans/README.md` row updated

## STOP conditions

- A test exposes an actual behavior bug in `sendWebhookWithRetry` (e.g. it retries on success, or attempt counts are off) — report the bug; don't patch source here.
- Fake timers or global-fetch stubbing fundamentally don't work under vitest-pool-workers and tests would need real multi-second sleeps (>2 s each).
- `sendWebhookWithRetry`'s code no longer matches the description above (drift from plan 003 exceeding the expected `deliverWebhooks` deletion).

## Maintenance notes

- If retry counts/delays become configurable later, parameterize these tests rather than duplicating them.
- Reviewer: check the mocks assert call *counts*, not just final results — that's the regression net.
