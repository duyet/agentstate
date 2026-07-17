# Plan 003: Parallelize webhook delivery, batch timestamp writes, delete the dead `deliverWebhooks`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving on. On any "STOP condition", stop and
> report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/services/conversations.ts packages/api/src/lib/webhook.ts`
> On any in-scope change, compare "Current state" excerpts to live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf (+ dead-code correctness trap)
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

The live webhook delivery path awaits each webhook **sequentially** inside one `waitUntil`. `sendWebhookWithRetry` can take ~37 s worst case per webhook (3 attempts × 10 s timeout + 1 s + 2 s backoff), so a few slow endpoints serialize and can exceed the Worker's background-work budget — later webhooks silently never fire. It also issues one `last_triggered_at` D1 write per webhook where a single batch suffices. Separately, `lib/webhook.ts` contains a near-duplicate `deliverWebhooks` that is **uncalled anywhere** and fire-and-forgets without `waitUntil` — a landmine for any future caller (background work not registered with `waitUntil` is not guaranteed to run in Workers). Delete it.

## Current state

- Live path — `packages/api/src/services/conversations.ts:515-537`:
  ```ts
  // Fire-and-forget webhook delivery
  executionCtx.waitUntil(
    (async () => {
      for (const webhook of webhookConfigs) {
        try {
          const result = await sendWebhookWithRetry(webhook.url, webhook.secret, webhookPayload);
          result.webhookId = webhook.id;
          console.info(`[webhook] delivered conversation.created to ${webhook.url} success=${result.success} attempts=${result.attempts} status=${result.status ?? "N/A"}`);
          // Update last_triggered_at for each webhook
          await webhooksService.updateWebhookLastTriggered(db, webhook.id, timestamp);
        } catch (err) {
          console.error(`[webhook] error delivering to ${webhook.url}:`, err instanceof Error ? err.message : String(err));
        }
      }
    })(),
  );
  ```
- Dead duplicate — `packages/api/src/lib/webhook.ts:152-187`: `export function deliverWebhooks(...)` — serial loop + `db.batch` timestamp update inside an un-awaited IIFE, no `waitUntil`. Confirm it is uncalled: `grep -rn "deliverWebhooks" packages/api/src packages/*/src` must show only its definition. The file ends with `import { sql } from "drizzle-orm";` at the bottom ("avoid circular dependency") — that import exists only for `deliverWebhooks` and its `SQL` type import at the top of the file; both go away with it.
- `updateWebhookLastTriggered` is in `packages/api/src/services/webhooks.ts:250-256` (single UPDATE by id).
- `sendWebhookWithRetry` (`lib/webhook.ts:58-144`) is the per-webhook retry primitive — unchanged by this plan (tests for it are plan 004).

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Lint      | `bunx biome check packages/api/src/` | exit 0 |
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests     | `cd packages/api && bunx vitest run` | all pass |

## Scope

**In scope**:
- `packages/api/src/services/conversations.ts` (only the `triggerConversationCreatedWebhook` delivery IIFE)
- `packages/api/src/lib/webhook.ts` (delete `deliverWebhooks`, its `SQL` type import, and the bottom `sql` import)
- Tests under `packages/api/test/` if you add coverage for concurrent delivery (optional here; plan 004 owns retry tests)

**Out of scope**:
- `sendWebhookWithRetry` internals — retry counts/timeouts stay as-is.
- Webhook matching (`getActiveWebhooksForEvent`) — plan 002.
- Any new delivery features (per-webhook concurrency caps, queues).

## Git workflow

- Branch: `claude/improvement-<timestamp>`; semantic commits (this is naturally two: `perf(api): deliver webhooks concurrently with batched timestamps` and `refactor(api): remove dead deliverWebhooks`); co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Delete `deliverWebhooks`

Remove `packages/api/src/lib/webhook.ts:152-187` (the function + doc comment), the now-unused `import type { SQL } from "drizzle-orm";` at the top, and the `import { sql } from "drizzle-orm";` at the bottom of the file.

**Verify**: `grep -rn "deliverWebhooks\|drizzle-orm" packages/api/src/lib/webhook.ts` → no matches; `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: Parallelize the live path

Rewrite the IIFE body in `conversations.ts` to:

```ts
const results = await Promise.allSettled(
  webhookConfigs.map(async (webhook) => {
    const result = await sendWebhookWithRetry(webhook.url, webhook.secret, webhookPayload);
    result.webhookId = webhook.id;
    console.info(`[webhook] delivered conversation.created to ${webhook.url} success=${result.success} attempts=${result.attempts} status=${result.status ?? "N/A"}`);
    return webhook.id;
  }),
);
const deliveredIds = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
// one write per delivered webhook, batched — or a single UPDATE ... WHERE id IN (...)
```

For the timestamp update, either loop `updateWebhookLastTriggered` inside the same `waitUntil` (acceptable) or better, add a `updateWebhooksLastTriggered(db, ids, timestamp)` batch variant in `services/webhooks.ts` using `inArray(webhooks.id, ids)` — match the existing single-row function's style directly below it. Keep the per-webhook `console.error` on rejection (iterate rejected results and log).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; `cd packages/api && bunx vitest run` → all pass (existing conversation/webhook suites green)

## Test plan

- Existing suites must stay green; delivery behavior per webhook is unchanged (same retry primitive, same signature header).
- If a batch `updateWebhooksLastTriggered` is added, unit-test it: two webhooks → both rows get the timestamp, a third untouched row does not. Model after existing tests in `packages/api/test/webhooks.test.ts`.

## Done criteria

- [ ] `grep -rn "deliverWebhooks" packages/api/` returns no matches (src or test)
- [ ] `conversations.ts` delivery uses `Promise.allSettled` (grep confirms) and contains no `await` inside a `for` loop over `webhookConfigs`
- [ ] Lint, typecheck, full vitest run all exit 0
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- `grep -rn "deliverWebhooks"` finds a real caller — the "dead" assumption is false; report before deleting.
- The current-state excerpt of `conversations.ts:515-537` doesn't match the live code.
- `inArray` batch update misbehaves under vitest-pool-workers D1.

## Maintenance notes

- If webhook fan-out grows large (>20 per project), add a concurrency cap (e.g. chunked `allSettled`) — unbounded parallel fetches from one Worker invocation have their own limits (6 simultaneous connections per invocation); note this in review.
- Plan 004 adds retry-logic tests; land this first so those tests target the surviving implementation only.
