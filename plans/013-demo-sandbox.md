# Plan 013: Public demo sandbox — try the API before signing up

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat ce9a1fa..HEAD -- packages/api/src/middleware/auth.ts packages/api/src/middleware/rate-limit.ts packages/api/src/middleware/project-creation-rate-limit.ts packages/api/src/lib/scopes.ts packages/api/src/routes/ai.ts packages/api/src/routes/conversations/ packages/api/src/services/retention.ts packages/api/src/index.ts packages/dashboard/src/pages/index.astro packages/dashboard/src/pages/docs.astro docs/getting-started.md README.md`
> On change, compare "Current state" excerpts below to live code before
> proceeding; mismatch → STOP. Several other agents in this session
> (`w10-docs`, `w11-seo`, `w12-dashboard`, `w13-landing`) may be actively
> editing the dashboard/docs/landing files listed above — re-read them fresh
> immediately before Step 6, not just at plan-drafting time.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MEDIUM (introduces a deliberately-public credential with write access; every mitigation below exists to bound that risk, not eliminate it)
- **Depends on**: None for the v1 scope in this plan (conversations only). **Hard dependency for the Phase 2 extension** (states/leases, i.e. the issue's "watch a lease" idea): plan `001-rate-limit-coordination-routes.md` (#340/#349/#350) must be merged and deployed first. See "Why this matters" and "Maintenance notes."
- **Category**: feature / product
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

Issue #287: every path to seeing AgentState work today requires signup → org → project → API key. `docs/getting-started.md` Step 1 and the README's own Quick Start curl are illustrative only (`Bearer as_live_your_key` is not a real key), so a prospective user cannot verify the product works without an account. The validation bar in the issue is explicit: *"A user with no account should be able to copy a curl command from the docs/README and get a real (not just illustrative) 2xx response back."*

This is also, by construction, the most security-sensitive of the product-audit issues: a public demo means **a credential is published to the internet**. Anyone can read it from `docs.astro`, `README.md`, or a search-engine cache, and use it from a script, not just a browser. Every design decision below follows from taking that seriously rather than hand-waving it.

## Architecture options considered

| Option | How it works | Rejected because |
|---|---|---|
| **(a) Fixed public demo API key** against a real, permanently-seeded sandbox project | One `as_live_...` key, published in docs, scoped down, project has aggressive retention | **Recommended** — see below |
| (b) Unauthenticated `/api/v1/demo/*` namespace | New router, no Bearer token required, hardcoded to a fixed project server-side | Duplicates CRUD logic already in `routes/conversations/` (a second surface to keep in sync with the real API — violates DRY and the "single source of truth" schema/services convention this repo already follows); doesn't exercise the real Bearer-auth flow, so it doesn't actually validate "the API works" for an integrator; still needs the exact same per-IP throttling, scope-equivalent write limits, and cost guardrails as (a), so it buys zero risk reduction for strictly more code |
| (c) In-browser "Try it" panel proxying through the Worker | New React/Astro island issues same-origin requests through a backend proxy route | Does not satisfy the issue's own validation bar — nothing is copy-pasteable as a standalone `curl`, so it doesn't prove the public REST API itself works; meaningfully more frontend engineering (new island, proxy route, CSRF/session handling for an unauthenticated proxy) for a task that still needs identical backend guardrails underneath; can be layered on top of (a) later, additively, if wanted — not mutually exclusive, just not the MVP |
| (d) Ephemeral, auto-issued short-TTL key per visitor | Unauthenticated "mint a demo key" endpoint issues a fresh `as_live_`-style key with a TTL per visitor | `apiKeys` has no `expiresAt`/TTL column or enforcement path today (only `capabilityTokens` does); adding expiry semantics that `middleware/auth.ts` must check on **every** request — not just demo ones — touches the single most security-critical file in the codebase for 100% of production auth traffic to serve a feature 0% of paying customers use. Minting a key is itself a new unauthenticated endpoint that needs the *same* per-IP abuse throttling as (a)'s write path — it relocates the per-IP problem rather than removing it, while adding a second unauth entry point to reason about. The issue's own suggested approach explicitly accepts a *shared* sandbox ("clearly labeled as a shared/ephemeral sandbox... to avoid needing per-user infra") — the isolation (d) buys is explicitly not required |

**Recommendation: (a) — a fixed public demo API key against a real, permanently-seeded "Public Demo" project**, scoped to `conversations:read` + `conversations:write` only, with four concrete guardrails (Steps 1–4) that this plan specifies precisely rather than hand-waving:

1. **Per-IP rate limiting**, because the existing per-key limiter (`rate-limit.ts`) is keyed on `apiKeyHash` — every demo visitor shares one hash, so the "100 req/min" cap is a *global* budget shared by every visitor combined, not a per-visitor one. This is the exact flaw the team-lead brief called out, confirmed by reading `rate-limit.ts` (see excerpt below): a public key makes per-key limits nearly useless as an abuse control.
2. **Explicit Workers AI cost block**, because `routes/ai.ts`'s three generation endpoints are gated on `requireScope("conversations:write")` — the *same* scope the demo key needs for normal writes. Verified in source: there is no separate `ai:generate` scope, so scoping the key down does **not** stop it from triggering paid Workers AI calls (`generateTitle`/`generateFollowUps`/`generateTitleAndFollowUps` in `services/ai.ts`). This must be blocked explicitly, not assumed away by scopes.
3. **A hard row cap** on the demo project's conversation count, as a blast-radius backstop independent of rate limiting.
4. **Reuse of the existing retention cron** (`scheduled.ts` → `cleanupExpiredConversations`) for the "resets periodically" requirement — zero new scheduling code, just a low `retentionDays` value on the seeded project.

Deliberately **out of scope for v1**: state/lease/claim demo access (the issue's "watch a lease" phrasing). Per `plans/README.md`'s own tracked dependency note ("013 → 001: a public sandbox is only safe once the coordination routes are rate limited, and it needs per-IP limits on top") and confirmed directly in issues #340/#349/#350: those routers currently have **zero** rate limiting of any kind. Handing a public credential write access to the single most-unthrottled, most write-amplified surface in the system (`states`/`leases`/`claims`, 5+ D1 statements per write) would be reckless. Ship conversations-only now; extend to state/lease demo only after plan 001 lands (see "Maintenance notes").

If, after reading this, the reviewer's judgment is that even the scoped-down conversations-only demo is not worth the residual risk (a real write-capable public credential, however bounded), that is a legitimate call — the alternative is a read-only demo (drop `conversations:write` from the seeded key's scopes, pre-seed a handful of example conversations, and demo only `GET`s). That satisfies the issue's "see it work" goal with materially less risk than any write-capable option, at the cost of not letting a visitor prove `POST` works for themselves. Flagging this explicitly as a fallback rather than deciding it unilaterally — see "STOP conditions."

## Current state

- `packages/api/src/middleware/rate-limit.ts:189-235` — `rateLimitMiddleware` reads `c.get("apiKeyHash")` and increments a D1 counter keyed by that hash alone. A shared demo key means every visitor's requests land in the same counter row.
- `packages/api/src/middleware/auth.ts:49-122` — `apiKeyAuth`. Sets `capabilityScopes` from the DB `scopes` column (`effectiveKeyScopes`), or `["*"]` for legacy/unscoped keys. Has a hardcoded `DUMMY_API_KEY` constant (line 15) used for constant-time auth-failure padding — the precedent for hardcoding a known key literal in this file's neighborhood.
- `packages/api/src/lib/scopes.ts:16-29` — `API_SCOPES` is the full grantable set: `conversations:read`, `conversations:write`, `state:read`, `state:write`, `state:watch`, `lease:write`, `claim:write`, `analytics:read`, `webhooks:write`, `domains:write`, `keys:read`, `keys:write`. `scopeSatisfies` (line 64) honors `*` and `resource:*`; a key scoped to exactly `["conversations:read","conversations:write"]` will fail every other scope check — this is what naturally confines the demo key, verified against every router's `requireScope(...)` call (`tags.ts`, `v1-keys.ts`, `keys.ts`, `conversations/analytics.ts`, `conversations/bulk.ts`, `conversations/traces.ts` all gate correctly).
- `packages/api/src/routes/ai.ts:13-14,17,45,71` — `router.use("*", apiKeyAuth); router.use("*", rateLimitMiddleware);` then three handlers each `requireScope("conversations:write")` before calling into `c.env.AI` (Workers AI). No separate scope exists to gate AI spend independent of write access.
- `packages/api/src/routes/conversations/index.ts:14-16` — the mount point for the whole conversations router: `router.use("*", apiKeyAuth); router.use("*", rateLimitMiddleware);` before routing to `crud.ts`, `messages.ts`, etc. This is where a demo-specific middleware must be inserted.
- `packages/api/src/routes/conversations/crud.ts:33` — `router.post("/", requireScope("conversations:write"), ...)` — the create-conversation handler; this is where a row-count cap for the demo project needs to slot in, before the insert.
- `packages/api/src/middleware/project-creation-rate-limit.ts:29-80` + `packages/api/src/services/projects.ts:617-654` — **the exact precedent to copy** for per-IP throttling: `CF-Connecting-IP` header, hashed via `hashIdentifier()`, a fixed-window counter in the generic `rateLimits` table keyed `pc:${identifier}:${windowStart}`, configurable via an env var (`PROJECT_CREATION_RATE_LIMIT_MAX`). This already proves CF-Connecting-IP-based limiting works in this codebase — extend the pattern with a new `demo:` prefix rather than modifying the existing `pc:` one.
- `packages/api/src/db/schema.ts:23-45` (`projects`) has a `retentionDays` column (1–3650, checked constraint) already enforced by a **daily cron** (`packages/api/wrangler.jsonc:71` → `"crons": ["0 3 * * *"]` → `scheduled.ts` → `services/retention.ts: cleanupExpiredConversations`, which deletes conversations/messages/tags in FK order once `updatedAt` exceeds `retentionDays`). Setting `retentionDays = 1` on the seeded demo project gives the "auto-reset periodically" requirement for free — no new cron code.
- `packages/api/scripts/seed.sql:1-21` — the exact pattern for seeding a project + API key: `INSERT OR IGNORE`, a comment documenting the plaintext key next to its precomputed SHA-256 hash. Local-only today (`--local` flag); this plan needs an equivalent applied to **production** D1 (`--remote`), which is a one-time, reviewed, manual step — not a CI action.
- Docs/marketing surfaces with illustrative (non-runnable) keys, verified by direct read:
  - `README.md:43-68` — Quick Start SDK snippet (`apiKey: "as_live_..."`) and two curl blocks (`Bearer as_live_your_key`).
  - `docs/getting-started.md:11` — "Sign up... copy the API key" is the *only* Step 1.
  - `packages/dashboard/src/pages/docs.astro:78-90` — `quickCode` and `authCode` template strings, both `as_live_...` / `as_live_your_key` placeholders; also line 130 (MCP config header) and line 295 (key-format description prose).
  - `packages/dashboard/src/pages/index.astro:110-146` — the hero's tabbed code sample (TS/LangGraph/Python/REST), each using placeholder keys; REST tab is lines 140-146.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| API tests | `cd packages/api && bunx vitest run demo` | all pass |
| Full API suite | `cd packages/api && bunx vitest run` | all pass |
| Lint | `bunx biome check packages/api/src/` | exit 0 |
| Dashboard build | `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` | exit 0 |
| Local seed (dev only) | `bunx wrangler d1 execute agentstate-db --local --file=scripts/seed-demo.sql` | rows inserted |
| Manual curl check (local dev, after seeding) | `curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8787/api/v1/conversations -H "Authorization: Bearer <seeded demo key>" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hi"}]}'` | `201` |

## Scope

**In scope**:
- New `packages/api/src/services/demo.ts` (constants + `isDemoProject()` + `checkDemoIpRateLimit()`)
- New `packages/api/src/middleware/demo-rate-limit.ts`
- `packages/api/src/routes/ai.ts` (deny-demo guard)
- `packages/api/src/routes/conversations/index.ts` (mount the new middleware)
- `packages/api/src/routes/conversations/crud.ts` (row-count cap on create, demo project only)
- New `packages/api/scripts/seed-demo.sql`
- New `packages/api/test/demo-sandbox.test.ts`
- `README.md`, `docs/getting-started.md`, `packages/dashboard/src/pages/docs.astro`, `packages/dashboard/src/pages/index.astro` (additive doc/marketing changes only)

**Out of scope**:
- Any change to `middleware/auth.ts` or `middleware/scoped-auth.ts` internals (the demo mechanism must not touch the critical auth path's core query logic — it only reads `projectId`/`apiKeyHash` already set by it)
- States/leases/claims demo access (Phase 2, gated on plan 001 — see "Maintenance notes")
- An in-browser "Try it" panel (option (c) — not part of this plan; could be layered on later)
- Any change to `rate-limit.ts`'s existing per-key logic, or `project-creation-rate-limit.ts`'s existing `pc:` behavior

## Git workflow

- Branch: `claude/improvement-<timestamp>`; separate commits per logical change (service+middleware, ai.ts guard, crud.ts cap, seed script, docs); co-author trailers per CLAUDE.md. PR required — do not merge without review given the security surface (per CLAUDE.md's "always use PR workflow").

## Steps

### Step 1: `services/demo.ts` — constants and per-IP limiter

Create `packages/api/src/services/demo.ts`:
- `DEMO_PROJECT_ID` and `DEMO_KEY_HASH` constants — placeholders (`"CHANGEME_..."`) until Step 5's seed produces real values; a code comment must say these two constants and the seeded rows **must** match, or the demo mechanism silently no-ops.
- `isDemoProject(projectId: string | undefined): boolean` — `projectId === DEMO_PROJECT_ID`.
- `checkDemoIpRateLimit(db, ip, limit = DEMO_RATE_LIMIT_PER_IP)` — copy the shape of `checkProjectCreationRateLimit` (`services/projects.ts:635`) exactly, but keyed `demo:ip:${await hashIdentifier(ip)}:${windowStart}` (reuse the existing `hashIdentifier` export, don't duplicate it) against the same `rateLimits` table. Default `DEMO_RATE_LIMIT_PER_IP = 20` per 60s window, overridable via `DEMO_RATE_LIMIT_MAX` env var (mirrors the `RATE_LIMIT_MAX` / `PROJECT_CREATION_RATE_LIMIT_MAX` pattern already used in this codebase).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 2: `middleware/demo-rate-limit.ts`

New middleware, modeled on `project-creation-rate-limit.ts`: if `isDemoProject(c.get("projectId"))`, pull `CF-Connecting-IP` (fallback `"unknown"`), call `checkDemoIpRateLimit`, attach `X-RateLimit-Limit-Demo` / `X-RateLimit-Remaining-Demo` headers, 429 with `Retry-After` on exceed (same JSON error envelope shape as `rate-limit.ts`). If not the demo project, no-op and call `next()` immediately — this must be a true no-op for all real traffic, verify this is the first thing the middleware checks.

Mount it in `routes/conversations/index.ts` right after `apiKeyAuth` (needs `projectId` set) and before the existing `rateLimitMiddleware`:
```ts
router.use("*", apiKeyAuth);
router.use("*", demoRateLimit);       // no-op unless projectId === DEMO_PROJECT_ID
router.use("*", rateLimitMiddleware); // existing per-key limiter still applies too (defense in depth)
```
Mount identically in `routes/ai.ts` after its `apiKeyAuth`.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; existing conversation tests still pass unmodified (`cd packages/api && bunx vitest run conversations` — headers added must not break existing response-shape assertions)

### Step 3: Block Workers AI spend on the demo project

In `routes/ai.ts`, add one middleware (in the same file or imported from `services/demo.ts`) mounted with `router.use("*", ...)` alongside the existing two, that returns `403 FORBIDDEN` with a message like `"AI generation is not available on the public demo project — sign up for a real project to use this feature."` when `isDemoProject(c.get("projectId"))` is true, before any handler reaches `c.env.AI`. This must run for all three routes (`generate-title`, `follow-ups`, `generate-all`) — a single router-level middleware, not three copy-pasted checks, so it can't be missed if a fourth AI endpoint is added later.

**Verify**: manual — with a demo-scoped test key, `POST /api/v1/conversations/:id/generate-title` → `403`, not `200`/`500` from a real Workers AI call.

### Step 4: Hard row cap on the demo project

In `routes/conversations/crud.ts`'s `POST "/"` handler (line 33), before the insert: if `isDemoProject(projectId)`, `SELECT COUNT(*) FROM conversations WHERE project_id = ?` (uses the existing `conversations_project_id_idx`) and if `>= DEMO_MAX_CONVERSATIONS` (default 2000, in `services/demo.ts`), return `403` with a message pointing at signup instead of inserting. This is a backstop independent of rate limiting (bounds total stored rows even under a slow-and-steady abuse pattern that stays under the per-IP rate limit).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 5: Seed the demo project (production)

Create `packages/api/scripts/seed-demo.sql`, modeled exactly on `scripts/seed.sql`: `INSERT OR IGNORE` an org, a project named e.g. `"Public Demo"` with `retention_days = 1`, and one `api_keys` row with `scopes = '["conversations:read","conversations:write"]'`. Document the plaintext key value and its precomputed SHA-256 hash in a comment, same as `seed.sql:10-11`.

Then:
1. Run it locally first for dev/test verification: `bunx wrangler d1 execute agentstate-db --local --file=packages/api/scripts/seed-demo.sql`.
2. **STOP and hand off to the user** before running against production (`--remote`) — seeding prod D1 with a row whose credential will be published in docs is a one-way, outward-facing action per CLAUDE.md's confirmation rule. Do not run the `--remote` variant autonomously.
3. Once seeded (locally or in prod), update the `DEMO_PROJECT_ID`/`DEMO_KEY_HASH` placeholders from Step 1 with the real seeded values.

**Verify**: `bunx wrangler d1 execute agentstate-db --local --file=packages/api/scripts/seed-demo.sql` → rows inserted; `curl` command from the Commands table → `201`

### Step 6: Tests

New `packages/api/test/demo-sandbox.test.ts` (seed a demo-shaped project+key fixture in the test DB, matching `v2-leases-contention.test.ts`'s style of DB-fixture setup):
- Demo key can `POST` then `GET` a conversation → `201`/`200`.
- Demo key gets `403` on any `ai.ts` route (`generate-title`, `follow-ups`, `generate-all`).
- Demo key gets `403 FORBIDDEN` on out-of-scope routes it was never granted (`keys:write`, `webhooks:write`, `domains:write`, `analytics:read`, `state:*`, `lease:*`, `claim:*`) — this should already pass given the existing scope-enforcement tests' pattern, add one assertion set specific to the demo key's exact scope list as a regression guard.
- Per-IP limiter: simulate `DEMO_RATE_LIMIT_PER_IP + 1` requests with the same `CF-Connecting-IP` header and the demo key → the last one is `429` with `Retry-After`, while a *different* `CF-Connecting-IP` in the same window is still allowed (proves per-IP, not per-key).
- Row cap: with `DEMO_MAX_CONVERSATIONS` set low via env override for the test, confirm creates beyond the cap return `403` rather than inserting.

**Verify**: `cd packages/api && bunx vitest run demo` → all pass; then `bunx vitest run` (full suite) → all pass

### Step 7: Docs and marketing surfaces

Re-read `README.md`, `docs/getting-started.md`, `packages/dashboard/src/pages/docs.astro`, `packages/dashboard/src/pages/index.astro` fresh before editing (other agents in this session may be mid-edit on these files — drift-check first, per the header). Additive changes only, do not remove the existing signup-first path:

- `docs/getting-started.md`: add a "Try it now — no signup required" callout above (not replacing) Step 1, with a real runnable curl using the seeded demo key, and a one-line label: *"Shared public sandbox — data is not private and is purged daily. Do not send real data. Sign up for your own project below."*
- `README.md:52-68`: replace `Bearer as_live_your_key` in both curl blocks with the real demo key, wrapped in the same labeled callout.
- `docs.astro:78-90`: update `quickCode`/`authCode` to use the real demo key; add the same labeled callout near where `authCode` renders (check the render site around line 295 for exact placement).
- `index.astro:140-146`: update the REST tab's curl to use the real demo key; add a small inline label (e.g. a badge) near the code tabs so a first-time visitor knows this is a live, working example — not just cosmetic realism.

**Verify**: `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` → exit 0; manually confirm the curl printed in each doc page, copy-pasted verbatim against local dev (Step 5's local seed), returns `2xx`.

## Test plan

As Step 6, plus the manual curl checks in Steps 3 and 5/7. No load/soak testing required for this plan — the per-IP limiter and row cap are the load-bearing safety mechanisms and are unit-tested directly; a full soak test of the public demo endpoint is out of scope (flag as a post-launch monitoring task, not a pre-merge gate).

## Done criteria

- [ ] `services/demo.ts` exists with real (non-placeholder) `DEMO_PROJECT_ID`/`DEMO_KEY_HASH` matching a seeded row
- [ ] Demo project's API key scopes are exactly `["conversations:read","conversations:write"]` (verify by querying the seeded row — no wildcard, no state/lease/claim/keys/webhooks/domains/analytics scopes)
- [ ] Per-IP rate limiting on the demo project verified functionally distinct from the per-key limiter (two different IPs sharing the demo key are limited independently)
- [ ] All three `routes/ai.ts` endpoints return `403` for the demo project, verified by test, not just by inspection
- [ ] Row cap on demo project conversations enforced and tested
- [ ] `retention_days = 1` set on the seeded demo project (confirms into the existing daily cron, no new scheduling code added)
- [ ] Typecheck, lint, full API vitest run, dashboard build all exit 0
- [ ] README/getting-started/docs.astro/index.astro all show a real, curl-copyable demo key with an explicit "shared/ephemeral, not for real data" label — not silently swapped in without the label
- [ ] No changes to `middleware/auth.ts` or `middleware/scoped-auth.ts` core logic
- [ ] `plans/README.md` row for 013 updated to reflect status/branch

## STOP conditions

- Running the seed against **production** D1 — this is an irreversible, outward-facing action (a real credential goes live and gets published in docs) and must be confirmed by the user, not run autonomously by an executor agent.
- If `w10-docs`, `w11-seo`, `w12-dashboard`, or `w13-landing` have already substantially rewritten `docs.astro`/`index.astro`/`getting-started.md` by the time Step 7 runs, re-derive the exact insertion points against the live files rather than applying this plan's line numbers blindly — treat a structural mismatch as a STOP, not a merge-through-conflict.
- If the reviewer decides the write-capable demo (scopes including `conversations:write`) is not an acceptable risk even with all four guardrails, fall back to a **read-only** demo (drop `conversations:write`, pre-seed example conversations in Step 5, cut Steps 3–4 which become moot) rather than shipping the write-capable version over an unresolved objection.
- If `plan 001` (#340/#349/#350) has not landed and there is pressure to also demo states/leases/claims (matching the issue's literal "watch a lease" phrasing) — do not extend demo scopes to `state:*`/`lease:*`/`claim:*` under any circumstance until plan 001 is merged and deployed. Ship conversations-only and say so explicitly to whoever is asking.

## Maintenance notes

- **Phase 2** (tracked here, not built now): once plan 001 lands and states/leases/claims routers carry rate limiting, revisit widening the demo key's scopes to `state:read` + a narrow, read-only lease-watch capability, to fulfill the issue's original "watch a lease" framing. This should be its own small follow-up plan, not folded into this one.
- The demo API key is **public by design** — it does not need "leak" incident response. If per-IP throttling is defeated by IP rotation at volume, the response is to lower `DEMO_RATE_LIMIT_MAX`/`DEMO_MAX_CONVERSATIONS` via env vars first; only rotate the key itself (revoke + reseed + update all four doc surfaces + update `DEMO_KEY_HASH`) if the project needs a clean slate.
- `retentionDays` is whole-days only (schema check constraint 1–3650) — if a sub-day reset cadence is ever wanted, that requires a new purge path, not a fractional `retentionDays` value. Don't build that speculatively; only if asked.
- If Workers AI pricing or the account-level spend model changes such that per-request cost is no longer a concern, Step 3's block can be revisited — but the *scope model gap* it works around (no `ai:generate` scope distinct from `conversations:write`) is a real gap worth fixing generally, independent of this plan; consider filing it as its own small backlog item.
