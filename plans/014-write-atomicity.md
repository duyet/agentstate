# Plan 014: Write atomicity via `db.batch()`

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/services/messages.ts packages/api/src/services/conversations.ts packages/api/src/services/traces.ts`
> On change, compare "Current state" excerpts below to live code before
> proceeding; mismatch → STOP. **Expect `services/conversations.ts` to have
> drifted**: plans 002/003/004 (branch `claude/w2-webhooks-core`) are editing
> the webhook trigger and removing the dead `getConversation()` stub (#353) in
> this same file, concurrently with this plan being drafted. See "Depends on"
> below — do not start Step 2 until that work has landed on `main`.

## Status

- **Priority**: P2
- **Effort**: S (Steps 1 and 3), M overall (Step 2 carries the only real risk — see STOP conditions)
- **Risk**: MEDIUM (Step 2 changes error-handling behavior around a caught exception; Steps 1 and 3 are low risk, straight-line batches)
- **Depends on**: plans 002/003/004 (`claude/w2-webhooks-core`) must merge to `main` first — they are actively editing `services/conversations.ts` (webhook delivery parallelization + `getActiveWebhooksForEvent` exact-match fix + dead `getConversation()` removal per #353). Re-read the file after that merge; the line numbers and possibly the webhook-trigger call shape in "Current state" below will have moved.
- **Category**: bug (data integrity)
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

Three write paths issue multiple independent D1 statements without wrapping them in `db.batch(...)`. A failure between statements leaves the database permanently inconsistent, and none of the three paths has a reconciliation mechanism:

- **`appendMessages`** (`packages/api/src/services/messages.ts:20-66`) inserts message rows, then in a *separate* awaited call increments the conversation's `message_count`/`token_count`/`total_cost_microdollars`/`total_tokens`. If the process is evicted, the Worker throws, or the second D1 round-trip fails after the first succeeds, the messages exist but the counters silently under-count forever. This is the highest-priority case: the drift is persistent, cumulative, silent, and directly visible to users in analytics (`GET /v1/analytics`, `GET /v1/conversations/:id`).
- **`createConversation`** (`packages/api/src/services/conversations.ts:167-272`) inserts the conversation row, then separately inserts the initial messages (if any were supplied). A failure on the second insert leaves a conversation with `message_count > 0` and zero actual message rows — an orphan-counter conversation, discoverable by clients but never containing what it claims to.
- **`ingestTrace`** (`packages/api/src/services/traces.ts:34-127`) has the identical shape: conversation insert, then a separate observations (messages) insert.

The codebase already has the correct idiom for this: `deleteConversation` (`packages/api/src/services/conversations.ts:461-471`) and `bulkDeleteConversations` (`packages/api/src/services/bulk.ts:20-38`) wrap their multi-table writes in `db.batch([...])`. This plan brings the three insert paths in line with that existing pattern — it does not invent a new one.

## D1 `batch()` semantics (confirmed via Cloudflare docs, Context7 `/llmstxt/developers_cloudflare_d1_llms-full_txt` and `/cloudflare/cloudflare-docs`, 2026-07-17)

> "D1 operates in auto-commit. Our implementation guarantees that each statement in the list will execute and commit, sequentially, non-concurrently. **Batched statements are SQL transactions.** If a statement in the sequence fails, then an error is returned for that specific statement, and it aborts or rolls back the entire sequence."

Concretely, this means:

1. **All-or-nothing**: `db.batch([a, b, c])` commits `a`, `b`, and `c` together as one transaction, or none of them. This is exactly the guarantee all three call sites need.
2. **Statements must be fully prepared before the call.** `db.batch()` takes an array of already-built (but not-yet-executed) `D1PreparedStatement` / Drizzle query-builder objects. **You cannot read a value from statement `a`'s result and use it to decide what statement `b` should be** — there is no mid-batch branching. Any read that a later statement depends on must happen in a separate `await db.select(...)` *before* the `db.batch([...])` call, exactly as `bulkDeleteConversations` already does (`db.select(...)` to get `existingIds`, *then* `db.batch([...])` using those ids — read-before-batch, not read-inside-batch).
3. Blind relative SQL updates (`sql\`${col} + ${n}\``) are unaffected by point 2 — they don't need to read anything, they just need the delta values, which are already computed in JS from the request payload in all three call sites here.

**Verdict for each call site** (this determines Step effort, not just Step order):

| Call site | Shape today | Batchable as a straight-line array? |
|---|---|---|
| `appendMessages` | insert messages → **blind** `sql\`col + n\`` update on conversations (no intermediate read) | **Yes**, trivially. This is the textbook case: a computed delta, not a read-then-write. |
| `createConversation` | insert conversation (try/catch for unique-constraint) → conditional insert messages → fire webhook | **Yes**, with one caveat: the unique-constraint catch must be verified to still fire correctly when the failing statement is inside a batch (see Step 2 and STOP conditions). |
| `ingestTrace` | insert conversation → JS-only parent-ref (`$N`) resolution using pre-generated IDs (no DB read) → insert messages | **Yes**, trivially. The parent-ref resolution never touches the database — it's pure JS over pre-generated ids, so it can run before the batch is assembled exactly as it does today. |

None of the three requires reading a database value mid-sequence to decide the next statement, so all three are straight-line batches. This is what makes this an S/M job rather than a rearchitecture.

## Current state

### `packages/api/src/services/messages.ts:20-66` (`appendMessages`)

```ts
await db.insert(messages).values(messageRows);

const addedTokens = inputMessages.reduce((sum, m) => sum + (m.token_count ?? 0), 0);
const addedCost = inputMessages.reduce((sum, m) => sum + (m.cost_microdollars ?? 0), 0);
const addedInputOutputTokens = inputMessages.reduce(
  (sum, m) => sum + (m.input_tokens ?? 0) + (m.output_tokens ?? 0),
  0,
);

await updateConversationMessageCount(
  db,
  conversationId,
  inputMessages.length,
  addedTokens,
  addedCost,
  addedInputOutputTokens,
);

return messageRows;
```

and `updateConversationMessageCount` (`messages.ts:111-129`), confirmed to have exactly one caller (grep `updateConversationMessageCount` under `packages/api/src/` returns only its definition and this one call site):

```ts
export async function updateConversationMessageCount(
  db: DrizzleD1Database,
  conversationId: string,
  addedCount: number,
  addedTokens: number,
  addedCost = 0,
  addedTotalTokens = 0,
): Promise<void> {
  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + ${addedCount}`,
      tokenCount: sql`${conversations.tokenCount} + ${addedTokens}`,
      totalCostMicrodollars: sql`${conversations.totalCostMicrodollars} + ${addedCost}`,
      totalTokens: sql`${conversations.totalTokens} + ${addedTotalTokens}`,
      updatedAt: Date.now(),
    })
    .where(eq(conversations.id, conversationId));
}
```

This is a **blind** update — no read of the current counters happens in JS. It is already expressed as a relative SQL update, which is exactly what's batchable.

### `packages/api/src/services/conversations.ts:167-272` (`createConversation`)

```ts
try {
  await db.insert(conversations).values({ id: conversationId, projectId, /* ... */ });
} catch (err) {
  if (externalId && isUniqueConstraintError(err)) {
    return { conversation: {} as ..., messages: [], error: { code: "CONFLICT", ..., status: 409 as const } };
  }
  throw err;
}

let messageRows: (typeof messages.$inferSelect)[] = [];
if (inputMessages && inputMessages.length > 0) {
  const rows = inputMessages.map((m) => ({ id: generateId(), conversationId, /* ... */ }));
  await db.insert(messages).values(rows);
  messageRows = rows as (typeof messages.$inferSelect)[];
}

// Trigger webhooks for conversation.created event
await triggerConversationCreatedWebhook(
  db, executionCtx, projectId, conversationId, externalId ?? null, title ?? null,
  msgCount, tokenCount, now,
);

return { conversation: { /* ... */ }, messages: messageRows };
```

`triggerConversationCreatedWebhook` (`conversations.ts:481-538`) does its own DB reads/writes (`getActiveWebhooksForEvent`, `updateWebhookLastTriggered`) inside `executionCtx.waitUntil(...)`, fully decoupled from the insert statements above — it already only runs after the two awaited inserts resolve without throwing. **This ordering must be preserved**: the webhook trigger call must stay textually and behaviorally after the batch, not be folded into it.

**Drift risk**: this exact block is where plans 002/003/004 (`claude/w2-webhooks-core`) are working — they touch `triggerConversationCreatedWebhook`'s internals (parallelizing the delivery loop, exact-match event lookup) but, as of this writing, have not changed the call site or its argument list in `createConversation` itself. Re-diff before executing Step 2.

### `packages/api/src/services/traces.ts:34-127` (`ingestTrace`)

```ts
await db.insert(conversations).values({ id: conversationId, projectId, /* ... */ });

const idMap = new Map<string, string>();
const messageRows = observations.map((o) => { /* pre-generate id, build row */ });
observations.forEach((_o, i) => { idMap.set(`$${i + 1}`, messageRows[i].id); });
for (let i = 0; i < observations.length; i++) {
  const parentId = observations[i].parent_message_id;
  if (parentId && idMap.has(parentId)) {
    messageRows[i].parentMessageId = idMap.get(parentId)!;
  }
}

await db.insert(messages).values(messageRows);
```

The `idMap` resolution loop never touches the database — it only reads `messageRows`, which was built entirely in JS from the request payload. Safe to run before assembling the batch.

### The exemplar to follow: `deleteConversation` (`conversations.ts:461-471`)

```ts
export async function deleteConversation(
  db: DrizzleD1Database,
  conversationId: string,
): Promise<void> {
  // Batch delete: tags → messages → conversation (order respects FK constraints)
  await db.batch([
    db.delete(conversationTags).where(eq(conversationTags.conversationId, conversationId)),
    db.delete(messages).where(eq(messages.conversationId, conversationId)),
    db.delete(conversations).where(eq(conversations.id, conversationId)),
  ]);
}
```

And `bulkDeleteConversations` (`bulk.ts:20-38`) shows the correct **read-before-batch** pattern when a batch's statements depend on data that must be looked up first (existence check), reinforcing point 2 of the D1 semantics above — the read happens *before* `db.batch(...)` is called, never inside it:

```ts
const existing = await db
  .select({ id: conversations.id })
  .from(conversations)
  .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)));
const existingIds = existing.map((r) => r.id);
if (existingIds.length > 0) {
  await db.batch([
    db.delete(conversationTags).where(inArray(conversationTags.conversationId, existingIds)),
    db.delete(messages).where(inArray(messages.conversationId, existingIds)),
    db.delete(conversations).where(inArray(conversations.id, existingIds)),
  ]);
}
```

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests (targeted) | `cd packages/api && bunx vitest run messages conversations traces` | all pass |
| Tests (full) | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/services/messages.ts` (`appendMessages`, `updateConversationMessageCount`)
- `packages/api/src/services/conversations.ts` (`createConversation` only — not `deleteConversation`/`bulkDeleteConversations`, already correct; not the webhook trigger internals, owned by plans 002/003/004)
- `packages/api/src/services/traces.ts` (`ingestTrace` only)
- New/extended tests for all three

**Out of scope**:
- `deleteConversation`, `bulkDeleteConversations` — already batched correctly.
- `triggerConversationCreatedWebhook` internals — owned by plans 002/003/004; this plan only requires that the call site keep firing strictly after the batch resolves.
- Backfilling/repairing counter drift already present in production data from *before* this fix — see "Reconciliation" below; recommend a separate, follow-up issue rather than folding a repair script into this atomicity fix.
- `getConversation()` dead stub (#353) — separate cleanup, unrelated to write paths.

## Git workflow

- Branch: `claude/improvement-<timestamp>` (or a stream-named branch if run as part of the parallel maintenance loop); commit per step; semantic messages (`fix(api): batch appendMessages insert+counter update`, etc.); both co-author trailers per `CLAUDE.md`. PR required — do not push directly to `main` (repo convention, see `plans/README.md`).

## Steps

### Step 1: Batch `appendMessages` (highest priority — do this first)

This is the straight-line, no-risk case: a blind relative-SQL update with no intermediate read.

1. Change `updateConversationMessageCount` to **build and return** the update query object instead of awaiting it, so it can be handed to `db.batch()`. Since it has exactly one caller, this is a safe signature change — no other call site to update.
   ```ts
   export function buildMessageCountUpdate(
     db: DrizzleD1Database,
     conversationId: string,
     addedCount: number,
     addedTokens: number,
     addedCost = 0,
     addedTotalTokens = 0,
   ) {
     return db
       .update(conversations)
       .set({
         messageCount: sql`${conversations.messageCount} + ${addedCount}`,
         tokenCount: sql`${conversations.tokenCount} + ${addedTokens}`,
         totalCostMicrodollars: sql`${conversations.totalCostMicrodollars} + ${addedCost}`,
         totalTokens: sql`${conversations.totalTokens} + ${addedTotalTokens}`,
         updatedAt: Date.now(),
       })
       .where(eq(conversations.id, conversationId));
   }
   ```
   Keep the old exported name if anything outside `packages/api/src` (SDK, docs snippets) imports it directly — grep first: `grep -rn "updateConversationMessageCount" packages/ docs/`. If nothing outside `services/messages.ts` references it, rename freely; otherwise keep both (thin wrapper) to avoid an unrelated public-surface break.
2. In `appendMessages`, replace the two sequential awaits with one batch:
   ```ts
   await db.batch([
     db.insert(messages).values(messageRows),
     buildMessageCountUpdate(db, conversationId, inputMessages.length, addedTokens, addedCost, addedInputOutputTokens),
   ]);
   ```
3. `db.batch()` requires a non-empty array with at least one element — `messageRows` is always non-empty here (grep the route handler in `routes/conversations/messages.ts` to confirm it 400s on an empty message array before calling `appendMessages`; if it doesn't, add that guard, since a zero-length batch is out of scope for this fix but worth flagging as a STOP if found).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; `cd packages/api && bunx vitest run messages` → all pass (or the route-level test file that covers it if no dedicated `messages.test.ts` exists — confirmed there is none yet; see Test plan).

### Step 2: Batch `createConversation` (depends on plans 002/003/004 landing first)

Do not start this step until `claude/w2-webhooks-core` has merged to `main` — re-run the drift check and re-read `conversations.ts:167-272` before touching it, since the webhook-trigger internals in this same file are being edited concurrently.

1. Build (don't await) the conversation insert and, conditionally, the messages insert:
   ```ts
   const conversationInsert = db.insert(conversations).values({ /* unchanged payload */ });
   const messageRows = inputMessages?.length ? inputMessages.map((m) => ({ /* unchanged row-building */ })) : [];
   const statements = messageRows.length > 0
     ? [conversationInsert, db.insert(messages).values(messageRows)]
     : [conversationInsert];

   try {
     await db.batch(statements);
   } catch (err) {
     if (externalId && isUniqueConstraintError(err)) {
       return { conversation: {} as ..., messages: [], error: { code: "CONFLICT", ..., status: 409 as const } };
     }
     throw err;
   }
   ```
2. Leave `triggerConversationCreatedWebhook(...)` exactly where it is textually — immediately after the batch, still a plain `await`, still outside the batch array. This preserves "webhook fires only after a successful commit": if `db.batch` throws, the function returns/rethrows before reaching the webhook call, identical to today's control flow.
3. **Verify the unique-constraint catch still works when the failing statement is inside a batch**, not a standalone call. `isUniqueConstraintError` (`conversations.ts:125-161`) walks `err.message`/`err.cause` looking for the substring `"unique"`. D1's batch-abort error should surface the same underlying SQLite constraint message, but this has not been empirically confirmed for this codebase's Miniflare/`vitest-pool-workers` setup — write the regression test in Step 4 (duplicate `external_id` via a batched `createConversation` call) *before* trusting this; if the caught error's shape differs (e.g., wrapped batch-level error without the original message surfaced), STOP and report rather than loosening the string match speculatively.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; `cd packages/api && bunx vitest run conversations` → all pass, including the new duplicate-`external_id` regression test.

### Step 3: Batch `ingestTrace`

Straight-line, same shape as Step 1.

1. Keep the `idMap`/parent-ref resolution loop exactly as-is (pure JS, runs before batching).
2. Replace the two sequential awaits:
   ```ts
   await db.batch([
     db.insert(conversations).values({ /* unchanged */ }),
     db.insert(messages).values(messageRows),
   ]);
   ```

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; `cd packages/api && bunx vitest run traces` → all pass.

### Step 4: Tests

- **`appendMessages`**: assert `message_count`/`token_count`/`total_cost_microdollars`/`total_tokens` land in one commit with the message rows. If there's no way to force a mid-batch failure against the local D1/Miniflare test harness (check `vitest-pool-workers` config for any fault-injection hook first — if none exists, don't build one from scratch here, that's a bigger investment than this plan's scope), settle for a behavioral assertion: call `appendMessages`, then assert both the inserted rows *and* the updated counters are visible in the same read, and add a code-level assertion (not just behavior) that `db.batch` is the call used — e.g. a `vi.spyOn(db, "batch")` assertion that it was called exactly once with 2 statements, and that `db.insert`/`db.update` were not separately awaited outside of it.
- **`createConversation`**:
  - Happy path with initial messages: conversation + messages committed together (existing coverage in `conversations.test.ts` likely already exercises this — extend, don't duplicate).
  - Duplicate `external_id` → still returns `409 CONFLICT` with the existing error shape, now going through the batched path (this is the critical regression test from Step 2.3).
  - No initial messages → single-statement batch, no messages inserted, conversation created with `message_count: 0` (this exercises the batch array being length 1, confirm D1 doesn't reject that).
- **`ingestTrace`**: existing tests in `traces.test.ts` covering parent-ref resolution (`$N`) must still pass unmodified — the resolution logic doesn't change, only the DB write shape.
- Model any "does the write really commit atomically" assertions after how `deleteConversation`/`bulkDeleteConversations` are tested today (grep `deleteConversation` in `conversations.test.ts` for the existing pattern) rather than inventing a new fault-injection harness.

**Verify**: `cd packages/api && bunx vitest run` → all pass (full suite, not just the three targeted files — `appendMessages`/`createConversation`/`ingestTrace` are called from routes exercised by other test files too, per the earlier grep of `analytics.test.ts`, `analytics-public.test.ts`, `mcp.test.ts`, `retention.test.ts`, `e2e.test.ts`, `projects.test.ts`).

## Test plan

As Step 4. No dedicated `messages.test.ts` exists today (confirmed via `ls packages/api/test/`) — `appendMessages` is presently only exercised indirectly through route-level tests. Decide during Step 4 whether to add a focused `messages.test.ts` (preferred, matches the per-service test file convention seen for `conversations.test.ts`/`traces.test.ts`) or extend the route test that already covers `POST /v1/conversations/:id/messages`. Prefer the dedicated file — it's the smaller, more surgical addition and matches existing structure.

## Done criteria

- [ ] `appendMessages` issues exactly one `db.batch([...])` call covering both the message insert and the counter update (grep confirms no standalone `await db.insert(messages)` / `await db.update(conversations)` remain in `messages.ts`'s `appendMessages`)
- [ ] `createConversation` issues exactly one `db.batch([...])` call covering the conversation insert and (when present) the message insert; webhook trigger still fires strictly after, unchanged in position
- [ ] `ingestTrace` issues exactly one `db.batch([...])` call covering the conversation insert and message insert
- [ ] Duplicate-`external_id` regression test passes with the batched `createConversation` (Step 2.3 — this is the one place behavior could have silently changed)
- [ ] Typecheck, lint, full `vitest run` all exit 0
- [ ] No files outside scope modified; `plans/README.md` row for 014 updated to "Done" with the branch/PR
- [ ] Public error codes/response shapes for all three endpoints unchanged (existing tests for `POST /v1/conversations`, `POST /v1/conversations/:id/messages`, `POST /v1/traces` pass unmodified except where Step 4 intentionally extends them)

## STOP conditions

- The unique-constraint error thrown out of a D1 `batch()` call doesn't preserve the message substring `isUniqueConstraintError` checks for (i.e., the Step 2.3 regression test fails and the fix isn't a straightforward adjustment to the same string-matching approach) — report the actual error shape observed rather than guessing at a workaround.
- `db.batch([singleStatement])` (a length-1 array, exercised by `createConversation` with no initial messages) behaves differently from a plain `await` of that same statement under `vitest-pool-workers`.
- Any existing test asserts on the *number* of D1 round-trips or on `message_count`/counters being updated *before* messages are visible in a read (i.e., any test depends on the old two-step timing) — that would mean the two-phase behavior was load-bearing somewhere unexpected.

## Reconciliation (recommendation, not in scope for this plan)

The issue notes drift is "silent and cumulative with no reconciliation path." This plan stops the *forward* drift (new writes commit atomically) but does nothing about counters that may already be wrong in production from writes that happened before this fix landed. Recommend filing a **separate** follow-up issue for a one-off repair: a script that recomputes `message_count`/`token_count`/`total_cost_microdollars`/`total_tokens` per conversation from an aggregate `SELECT` over `messages` and corrects any conversation row that disagrees, run once via `wrangler d1 execute` against production. Do not fold this into the current plan — it's an operational/data task with a different risk profile (needs a dry-run/diff-report mode before writing), and per `CLAUDE.md` ("Early, no users. No backward compatibility concerns"), the actual blast radius of existing drift is probably small; confirm that assumption with a read-only diff query before deciding whether the repair is even worth building.

## Maintenance notes

- If a fourth write path is added later that touches both `messages` and `conversations` in sequence (e.g., a future bulk-import endpoint), it should be built batched from day one — use `appendMessages` post-Step-1 as the template.
- Reviewer: confirm the webhook trigger call in `createConversation` was not accidentally pulled into the `db.batch([...])` array — it must remain a separate, subsequent `await` (or `waitUntil`), never a batch member, since webhook delivery is not a database statement and batching it would silently change delivery semantics.
- If plans 002/003/004 change `triggerConversationCreatedWebhook`'s signature or move it out of `services/conversations.ts` before Step 2 runs, re-read "Current state" for `createConversation` and adjust the excerpt/line numbers accordingly rather than assuming they're stale.
