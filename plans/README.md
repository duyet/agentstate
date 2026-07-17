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
| 006 | [Idempotency-Key safe under concurrency](006-idempotency-claim-first.md) | #365 | P1 | In progress | `claude/w4-concurrency-guards` |
| 007 | [Guard lease renew/release UPDATEs](007-lease-update-guards.md) | #367 | P2 | In progress | `claude/w4-concurrency-guards` |
| 008 | [Fix SSE hub backlog ordering](008-sse-backlog-ordering.md) | #366 #360 | P2 | **Superseded** — see note | `claude/w5-sse-backlog-ordering` |
| 009 | [Pad scope-denied auth timing](009-scope-denied-timing.md) | #368 | P3 | In progress | `claude/w6-auth-timing-csp` |
| 010 | [Dashboard CSP (report-only first)](010-dashboard-csp.md) | #369 | P2 | In progress | `claude/w6-auth-timing-csp` |
| 011 | [Dashboard UI for the 4 unexposed primitives](011-dashboard-primitives-ui.md) | #284 | — | Planning | — |
| 012 | [Webhooks docs + dashboard UI](012-webhooks-docs-and-ui.md) | #285 | — | Planning | — |
| 013 | [Demo sandbox / pre-signup try-it](013-demo-sandbox.md) | #287 | — | Planning | — |
| 014 | [Write atomicity via db.batch()](014-write-atomicity.md) | #342 | P2 | Planning | — |

Plans 001–010 were written against `ce9a1fa`; 011–014 are being drafted against
the same commit.

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
