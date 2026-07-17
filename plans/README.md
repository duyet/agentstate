# Plans

Executable implementation plans. Each plan is self-contained: an executor
(agent or human) should be able to follow it top to bottom without prior
context on why it exists.

Every plan opens with a **drift check** pinned to the commit it was planned
against. Run it first. If in-scope files have moved on, compare the plan's
"Current state" excerpts against live code before proceeding — on a mismatch,
treat it as a STOP condition rather than improvising.

When you finish a plan, update its row below.

## Status

| # | Plan | Issues | Priority | Status | Branch / PR |
|---|------|--------|----------|--------|-------------|
| 001 | [Rate-limit the states/leases/claims/MCP routers](001-rate-limit-coordination-routes.md) | #340 #349 #350 | P1 | In progress | `claude/w1-rate-limit-coordination` |
| 002 | [Match webhook events by exact array membership](002-webhook-event-exact-match.md) | #351 | P1 | In progress | `claude/w2-webhooks-core` |
| 003 | [Parallelize webhook delivery](003-webhook-delivery-parallel.md) | #362 | P1 | In progress | `claude/w2-webhooks-core` |
| 004 | [Test webhook retry/backoff/timeout](004-webhook-retry-tests.md) | #363 | P1 | In progress | `claude/w2-webhooks-core` |
| 005 | [Test conversation search](005-conversation-search-tests.md) | #364 | P1 | In progress | `claude/w3-conversation-search-tests` |
| 006 | [Idempotency-Key safe under concurrency](006-idempotency-claim-first.md) | ~~#365~~ | P1 | **Superseded** — see note | `aaf05ac` (#355) |
| 007 | [Guard lease renew/release UPDATEs](007-lease-update-guards.md) | #367 | P2 | In review | `claude/w4-lease-renew-release-guards` (PR #382) |
| 008 | [Fix SSE hub backlog ordering](008-sse-backlog-ordering.md) | #366 #360 | P2 | **Superseded** — see note | `claude/w5-sse-backlog-ordering` |
| 009 | [Pad scope-denied auth timing](009-scope-denied-timing.md) | #368, #343 | P3 | In review | `claude/w6-auth-timing-csp` (PR #383) |
| 010 | [Dashboard CSP (report-only first)](010-dashboard-csp.md) | #369 | P2 | In review | `claude/w6-auth-timing-csp` (PR #383) |
| 011 | [Dashboard UI for the 4 unexposed primitives](011-dashboard-primitives-ui.md) | #284 | — | Ready | — |
| 012 | [Webhooks docs + dashboard UI](012-webhooks-docs-and-ui.md) | #285 | — | **Docs done in #380** — UI only | — |
| 013 | [Demo sandbox / pre-signup try-it](013-demo-sandbox.md) | #287 | — | Ready — needs a human decision first | — |
| 014 | [Write atomicity via db.batch()](014-write-atomicity.md) | #342 | P2 | Ready | — |

All 14 plans were written against `ce9a1fa`. **`main` has since moved past it**
(`aaf05ac` / PR #355, then `5e6abe4`), which is exactly how plan 006 got
superseded — read the notes below before trusting any plan's "Current state".

## Plan 006 is superseded

While executing plan 006, the executor found that `main` had already shipped a
fix for the identical issue (#289/#290) in commit `aaf05ac` (PR #355, merged
after this plan's `ce9a1fa` planning commit): the Idempotency-Key claim is
embedded atomically in the *same* `d1.batch()` as the mutation itself, with a
60s orphan-reservation reclaim for crashed requests.

This is a **stronger** guarantee than plan 006's claim-then-mutate-then-complete
design — true single-transaction atomicity, rather than a separate claim step
with a try/finally release. The same commit also added a write-time lease guard
(#289) inside `upsertState`/`deleteState`, a different code path from plan 007's
target (`renewLease`/`releaseLease`), so plan 007 was unaffected and still ships.

Lesson: a plan's drift check only guards against drift *before* an executor
starts, and only if the executor's baseline is the pinned commit. A plan can be
overtaken by unrelated concurrent work landing on `main` mid-execution. Re-run a
scope-relevant `git log origin/main` check before opening a PR, not just at the
start.

## Plan 012's docs step is already done

Plan 012 was written with a hard blocker: *don't write the webhooks docs until
#344 lands, or you'll document the obsolete pre-timestamp HMAC recipe.* That
blocker **has dissolved**. PR #380 implemented #344 and wrote `docs/webhooks.md`
(events, payload, verification with the timestamped scheme, retries) in the same
PR — so the docs were written against the correct signature format, by the agent
that changed it.

**Plan 012 is now UI-only.** Skip its Step 7 and re-read `docs/webhooks.md` on
main before assuming the rest of its docs section still applies.

## Plan 008 is superseded

While implementing plan 008, the executor found that the `/watch` DO path
**deadlocks forever whenever the backlog is non-empty** (#360). `writer.write()`
on a `TransformStream` cannot resolve until a reader attaches to
`stream.readable`, but `watch()` awaits `writeBacklog(...)` *before* returning
the `Response` — so the reader can never attach. An empty backlog never writes,
which is why it went unnoticed; the one existing test uses `once=true` and
bypasses the DO entirely.

Plan 008's target design (Steps 1–5) preserves that same await-before-return
structure, so **the plan cannot be implemented or tested as written** — its own
Step 2 test would hang. The corrected shape returns the `Response` immediately
and does backlog-write, pending-flush, and writer-registration as background
work. The ordering fix (#366) and the deadlock fix (#360) ship together, since
the former is unreachable without the latter.

Lesson for future plans: a plan derived from reading code can encode the same
structural assumption the bug lives in. The drift check catches *code* that
moved — it cannot catch a plan that was wrong on arrival. Executors should treat
"the plan's own test would hang/fail" as a STOP condition.

## The general hazard: a plan is a snapshot, not a source of truth

Three of these plans went stale within hours of being written, each differently:

- **008** was wrong *on arrival* — it misread the code and encoded the same
  structural assumption the bug lives in.
- **006** was overtaken by *unrelated work* landing on `main` mid-flight.
- **012** was overtaken by its *own* dependency being solved better elsewhere.

The drift-check header guards only the first, and only when the executor's
baseline actually is the pinned commit. Treat these plans as well-researched
starting points, not instructions to follow on faith.

## Merge order matters

Two open PRs edit the same functions in `packages/api/src/services/conversations.ts`
(`createConversation` / `deleteConversation`) and **will conflict**:

- **#370** (analytics cache invalidation) adds `invalidateAnalyticsCache(...)` to both.
- **#380** (webhooks) parallelizes the delivery loop in the same region.

Whichever lands first, the other must rebase. Neither is wrong; they're just
neighbours. Plan **014** batches those *same* functions, so execute it only after
both land — that's the reason for its 002/003/004 dependency.

Suggested order:

1. **#373** (biome baseline red on unmodified `main`) — so every later PR
   verifies against green.
2. **#371** — tracks `plans/`.
3. Independent API PRs: #357, #359, #376, #381, #382.
4. **#370 → #380** (or the reverse), rebasing the second.
5. Dashboard/docs: #356, #358, #377, #379.
6. **#361** (SSE) last — it carries the #360 deadlock fix and deserves unhurried
   review.

## Plan 009 bundled issue #343

While executing plan 009, the AUTH_CACHE-bypass issue (#343 —
`scopedAuth` re-queries D1 on every request instead of sharing the
`apiKeyAuth` KV cache) was implemented alongside it in the same PR: both
touch `scoped-auth.ts`'s regular-API-key branch, and the padding helper
added for #368 is reused by the new cache-hit 403 path. See PR body for
details.

## Known dependencies between plans

- **003 → 004**: plan 003 deletes `deliverWebhooks` from `lib/webhook.ts`. Plan
  004's drift check treats that as expected drift.
- **012 → 002/003/004 + #344**: the webhooks docs cannot be written until the
  webhook subsystem settles. #344 changes the `X-AgentState-Signature` wire
  format to include a timestamp, so any HMAC verification recipe written before
  it lands will document an obsolete scheme.
- **014 → 002/003/004**: plan 014 batches writes in `services/conversations.ts`,
  which the webhook stream is editing concurrently. Webhook firing must happen
  only *after* a successful commit.
- **011 → #348**: the primitives UI needs a `claim:read` scope for read-only
  claim views; #348 is adding it.
- **013 → 001**: a public sandbox is only safe once the coordination routes are
  rate limited, and it needs per-IP limits on top.

## Work not covered by a plan

Tracked as issues, deliberately left out of the current batch:

- **#309** — OG/Twitter card needs a real 1200×630 design (asset work).
- **#312** — README screenshot / demo GIF (asset work).

## Conventions

- Branch per stream; one logical change per commit; semantic messages.
- Both co-author trailers per [CLAUDE.md](../CLAUDE.md). No `Claude-Session:` trailer.
- Never push directly to `main` — always via PR.
- The pre-commit hook runs `bunx biome check --write packages/*/src/` and can
  autofix files outside your stream. Check `git status` after committing.
