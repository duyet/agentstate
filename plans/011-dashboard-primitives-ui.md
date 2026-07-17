# Plan 011: Dashboard UI for States, Leases, Claims, Capability Tokens

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**:
> ```
> git diff --stat ce9a1fa..HEAD -- packages/api/src/routes/projects.ts packages/api/src/routes/domains.ts packages/api/src/routes/states/index.ts packages/api/src/routes/leases/index.ts packages/api/src/routes/claims/index.ts packages/api/src/routes/capability-tokens/index.ts packages/api/src/services/leases.ts packages/api/src/services/claims.ts packages/api/src/services/capability-tokens.ts packages/api/src/services/states.ts packages/dashboard/src/components/dashboard/project/project-content.tsx packages/dashboard/src/pages/docs.astro
> ```
> On change, re-read the "Current state" excerpts below against live code before
> proceeding — this plan is grounded in exact file:line citations and a
> mismatch invalidates the phase touching that file.

## Status

- **Priority**: P2 (product gap, not a regression)
- **Effort**: L overall, split into 4 independently-shippable phases (each ~S–M)
- **Risk**: MEDIUM — each phase adds a small, real slice of new backend surface (see "The two API surfaces" below); this is not a pure frontend task
- **Depends on**: none (see "Corrected assumption" below re: issue #348)
- **Category**: feature / product
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

Per `ROADMAP.md`, leases (coordination), claims (verifiability), and
capability tokens (scoped delegation) — plus state itself — are AgentState's
actual differentiation over generic "agent memory" tools. Confirmed by direct
search: **zero** dashboard source references any of the four primitives.

```
$ find packages/dashboard/src -iname "*lease*" -o -iname "*claim*" -o -iname "*capability*" -o -iname "*state*"
(no matches related to these primitives — only "state" hits are React `useState` calls)
```

`packages/dashboard/src/components/dashboard/project/` has tabs for
Conversations (`_data-tab.tsx` + `data-tab/`), API Keys (`_keys-tab.tsx`), and
Settings only (confirmed via `project-content.tsx:108-112`, the `TabDef`
union `"data" | "keys" | "settings"`). A signed-up user has no way to see
whether a lease was acquired, a claim was verified, or which capability
tokens are live, without leaving the product.

## The two API surfaces (read this before writing any route)

This is the single highest-risk unknown the team lead flagged, and it changes
the shape of every phase below. **GitHub issue #284's "suggested approach"
(wire the dashboard directly to the existing `/api/v1/{states,leases,claims,
capability-tokens}/*` REST endpoints, "no backend work needed") is factually
wrong.** Those endpoints are bearer-API-key routes; the dashboard never sends
an `Authorization: Bearer` header — it authenticates via a same-origin Clerk
session cookie (`credentials: "include"`, see
`packages/dashboard/src/lib/api.ts:18-28`).

Confirmed by reading `packages/api/src/index.ts:80-88`: the app registers a
**second, parallel set of routes** at `/api/v1/projects/:id/*` — analytics
(`analyticsRouter`), traces (`projectTracesRouter`), custom domains
(`domainsRouter`), and project CRUD/conversations/keys itself
(`projectsRouter`) — all gated by `clerkDashboardAuth` (session cookie,
fail-closed if `CLERK_SECRET_KEY` unset). Every one of those router files
repeats the same two-function idiom (not extracted to a shared helper —
duplicated per file, e.g. `packages/api/src/routes/projects.ts:37-67` and
`packages/api/src/routes/domains.ts:34-67` are near-identical copies):

```ts
async function resolveSessionOrgId(c: AppContext): Promise<string | null> { /* Clerk org id -> internal org id */ }
async function authorizeProjectOrg(c: AppContext, projectId: string): Promise<Response | null> {
  // 404 (not 403) if the project doesn't belong to the session's org
}
```

Every dashboard-facing handler calls `authorizeProjectOrg(c, projectId)` first,
then calls the **same service-layer function** the bearer-key route uses
directly — bypassing `scopedAuth`/`apiKeyAuth`/scope checks entirely, because
a verified Clerk session already proves "org owner of this project," which is
a superset of any key scope. This is explicit at
`packages/api/src/routes/projects.ts:239-241`:
> "Dashboard key creation is authenticated by a verified Clerk session (org
> owner), so any scopes may be granted — no subset restriction here."

**Conclusion for this plan**: every phase adds a new `packages/api/src/routes/
project-<resource>.ts` file, following this exact idiom (duplicate the
`resolveSessionOrgId`/`authorizeProjectOrg` pair — do not "improve" it into a
shared helper; that's an unrelated refactor and three other files already
chose to duplicate it), mounted via `app.route("/api/v1/projects",
project<Resource>Router)` in `index.ts` next to the analytics/traces/domains
mounts (`index.ts:189-203`). These new routes call the **existing** service
functions in `services/{leases,claims,capability-tokens,states}.ts` — so the
core read/write logic really is reused, just not through the bearer-key
routers the issue pointed at.

**Corrected assumption about issue #348**: the team lead's brief flagged
`#348` (adding a `claim:read` scope) as a dependency. It is not — #348 only
affects the bearer-API-key surface (`scopedAuth({ scope: "claim:write" })` in
`packages/api/src/routes/claims/index.ts:86`). The new Clerk-session claims
routes in this plan bypass scope checks the same way `projects.ts` does, so
they need no scope at all and are unaffected by whether #348 ships first.
Flagging this so nobody blocks Phase "Claims" waiting on it.

**docs.astro documents the *other* surface.** The existing "Conversations"
section in `docs.astro` documents `/api/v1/conversations` (the public
bearer-key API), not the internal `/api/v1/projects/:id/conversations` the
dashboard actually calls. Keep that convention: the new docs sections in each
phase below document the public `/api/v1/{states,leases,claims,
capability-tokens}/*` endpoints (for SDK/agent authors), which are unrelated
to (and already fully built, per "Current state" below) the new
dashboard-internal routes this plan adds.

## Current state

### Backend: what's already built (bearer-key surface, reusable service layer)

- `packages/api/src/routes/states/index.ts`: `POST /query` (rich query, scope
  `state:read`), `GET/PUT/DELETE /:state_key` (scope `state:read`/`state:write`),
  `GET /:state_key/events` (WAL log, scope `state:read`), `POST /:state_key/lease`
  (scope `lease:write`), `GET /watch` (SSE, scope `state:watch`, also accepts
  `as_cap_` capability tokens via `?token=`).
- `packages/api/src/routes/leases/index.ts`: **only** `POST /:id/renew` and
  `DELETE /:id` (release), both scope `lease:write`. Confirmed by full-file
  read and repo-wide grep — **there is no list-leases endpoint anywhere**
  (not in the router, not as a service function in
  `packages/api/src/services/leases.ts`, not via any join from
  `queryStates`). This is a real, small backend gap that phase "Leases" below
  must fill — it is not addressed by any other open plan or issue.
- `packages/api/src/routes/claims/index.ts`: `router.use("*", scopedAuth({
  scope: "claim:write" }))` at line 86 gates **all** routes including the two
  GETs — this is exactly what issue #348 is about, and (per the surface
  analysis above) irrelevant to this plan.
  `POST /` (create), `GET /` (list), `GET /:id` (get + evidence),
  `POST /:id/verify` (run verification) — all fully implemented in
  `packages/api/src/services/claims.ts`.
- `packages/api/src/routes/capability-tokens/index.ts`: `apiKeyAuth` +
  `requireScope("keys:read"/"keys:write")`. `POST /` (create, with a
  caller-scope subset check via `scopesSatisfyAll`), `GET /` (list), `DELETE
  /:id` (revoke) — all implemented in `services/capability-tokens.ts`.

### Backend: the stateLeases schema supports a list query

`packages/api/src/db/schema.ts:451-476` — `state_leases` has
`index("state_leases_project_id_expires_at_idx").on(table.projectId,
table.expiresAt)`, so a paginated "list leases for this project" query is
cheap to add (no migration needed).

### Type drift: shared `StateLeaseResponse` does not match the real API response

`packages/shared/src/index.ts:397` — the block is literally commented
`// Planned state platform types`. Its `StateLeaseResponse` (line 497-507) has
`project_id`, `capability_token_id`, `released_at`, and a nullable `holder` —
**none of which the real `toResponse()` in
`packages/api/src/services/leases.ts` (lines ~38-48) returns.** The real
shape is `{ id, state_key, holder /* not null */, fencing_token, expires_at,
created_at, renewed_at }` — no `project_id`, no `capability_token_id`, no
`released_at`. Do not import `StateLeaseResponse` for the new UI/route
without fixing it or introducing a correct dashboard-facing type — see Phase
"Leases", Step 1.

### Frontend: existing patterns to reuse (do not invent new ones)

- `packages/dashboard/src/components/dashboard/project/_api-keys-table.tsx` —
  the exact `Card` + `Table`/`TableRow`/`TableCell` + row-action-button
  pattern to copy for Leases / Claims / Capability Tokens list tabs.
- `packages/dashboard/src/components/dashboard/project/_keys-tab.tsx` — the
  `ScopeSelector` / `KeyNameForm` pattern to copy for the Capability Token
  create form (name + scope checkboxes + optional expiry).
- `packages/dashboard/src/components/dashboard/project/_data-tab.tsx` +
  `data-tab/` — the expandable-row list pattern (`ConversationsContent` /
  `ConversationsHeader`) to copy for the States key/value browser + event log.
- `packages/dashboard/src/components/dashboard/project/project-content.tsx` —
  tab wiring: `TabDef` union type (line 26), `Tabs` component, per-tab
  `use<X>TabState`/`use<X>Actions` hooks, all composed in `ProjectContent()`.
  New tabs extend the union and follow the identical hook/component split.
- `packages/dashboard/src/components/dashboard/project/_use-new-key-storage.ts`
  + `_created-key-display.tsx` — the "show the secret exactly once" pattern.
  Capability tokens also return a bearer secret only on creation
  (`CapabilityTokenCreatedResponse.token`, `shared/src/index.ts:528-530`) —
  reuse this pattern verbatim, don't build a new one.
- `packages/dashboard/src/lib/api.ts` — the `api<T>()` fetch helper every hook
  uses; new hooks call it the same way, no changes needed to this file.

### Design system constraints (from PR #339 — do not violate)

- Never Anthropic-branded; no `brand-guidelines` skill, no Anthropic colors/fonts.
- `--color-accent` is the vermilion brand accent, not a hover state — use
  `muted`/`panel2` for hovers (see `hover:bg-panel2` in `_api-keys-table.tsx`).
- Dashboard shell spacing: `px-6 py-6 gap-6` / `gap-component` (see
  `project-content.tsx:115,127`).
- Reuse `@/components/ui/table`, `@/components/ui/card`, `@/components/ui/button`
  — do not add a new table primitive.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| API typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| API lint | `bunx biome check packages/api/src/` | exit 0 |
| API tests | `cd packages/api && bunx vitest run` | all pass |
| Dashboard build | `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` | exit 0 |
| Dashboard typecheck | `cd packages/dashboard && bunx tsc --noEmit` (check `package.json` for the actual script name first) | exit 0 |
| Local API smoke test | `curl http://localhost:8787/api/v1/projects/<id>/leases -H "Cookie: __session=<dev session>"` | 200 with `{ data: [] }` shape once implemented |

## Scope

**In scope** (across all 4 phases):
- New route files: `packages/api/src/routes/project-leases.ts`,
  `project-claims.ts`, `project-capability-tokens.ts`, `project-states.ts`.
- New service function: `listLeases` in `packages/api/src/services/leases.ts`.
- New dashboard components/hooks under
  `packages/dashboard/src/components/dashboard/project/` (one set per phase,
  named `_leases-*`, `_claims-*`, `_capability-tokens-*`, `_states-*`).
- Edits to `packages/dashboard/src/components/dashboard/project/project-content.tsx`
  (extend `TabDef` union + add tab render blocks, one small edit per phase).
- Edits to `packages/dashboard/src/pages/docs.astro` (`navGroups`,
  `onThisPage`, one new endpoint-table array + `<h2>` section per phase).
- Edits to `packages/api/src/index.ts` (mount each new router, one line per
  phase, placed in the "dashboard-management" block per the existing
  analytics/traces/domains grouping at lines 189-203).

**Out of scope** (explicitly, for all phases — flag if you find yourself
doing any of these):
- Any change to the bearer-key routes (`routes/{states,leases,claims,
  capability-tokens}/index.ts`) or their scope middleware — this plan only
  adds new Clerk-session routes alongside them.
- Issue #348 (`claim:read` scope) — unrelated, do not bundle.
- Live SSE / `EventSource` state-watch UI in the dashboard (Phase "States"
  explicitly defers this — see that phase's notes).
- State mutation (upsert/delete) from the dashboard — States phase is
  view-only (browse + event log), matching the issue's suggested approach.
- Creating claims from the dashboard — Claims phase is view + verify only
  (claims are created by agents with evidence payloads, not humans).
- Any change to `packages/shared/src/index.ts` types beyond what's strictly
  needed to fix the `StateLeaseResponse` drift (Phase "Leases", Step 1) —
  don't do a speculative types cleanup pass.

## Git workflow

Each phase is its own branch + PR (independently mergeable, per the team
lead's brief):
- Branch: `claude/dashboard-<resource>-ui` (e.g. `claude/dashboard-leases-ui`)
- Commits: semantic, e.g. `feat(api): add project-scoped leases routes for dashboard`,
  `feat(dashboard): add Leases tab`, `docs: add Leases reference section`
- Co-author trailers per `CLAUDE.md`
- PR body should link issue #284 and note "Phase N of 4" so reviewers see the sequence

## Steps

### Phase 1 — Leases (flagship differentiator #1; establishes the pattern)

Do this phase first: it's the smallest resource (one table, three actions:
list/renew/release) and it's where you validate the
`project-<resource>.ts` route pattern before repeating it three more times.

#### Step 1.1: Fix the type drift, add `listLeases`

In `packages/shared/src/index.ts`, either correct `StateLeaseResponse` to
match the real API shape or add a new `ProjectLeaseResponse` type matching
`toResponse()` in `services/leases.ts` **plus** `released_at` (the list view
needs it to distinguish active vs. historical leases — the DB column exists,
`toResponse()` just never mapped it because no route needed it before now).
Prefer fixing `StateLeaseResponse` in place unless something else in the repo
already depends on its current (wrong) shape — grep for
`StateLeaseResponse` usage first.

In `packages/api/src/services/leases.ts`, add:
```ts
export async function listLeases(
  db: DrizzleD1Database,
  projectId: string,
  opts: { limit?: number; cursor?: string; activeOnly?: boolean },
): Promise<{ rows: LeaseResponse[]; nextCursor: string | null }>
```
Use the existing `state_leases_project_id_expires_at_idx` index (order by
`expiresAt` desc or `createdAt` desc — pick whichever the dashboard needs;
default `activeOnly: true` filters `releasedAt IS NULL`). Follow the same
cursor-pagination idiom as `listClaims` in `services/claims.ts:153-225` (read
it for the exact cursor-encoding convention before writing this).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

#### Step 1.2: New route file `project-leases.ts`

Create `packages/api/src/routes/project-leases.ts` following the
`resolveSessionOrgId`/`authorizeProjectOrg` idiom copied from
`packages/api/src/routes/domains.ts:34-67` (duplicate it verbatim into this
file — do not import from `domains.ts` or `projects.ts`, matching how those
two files already independently duplicate it):

- `GET /:id/leases` → `authorizeProjectOrg` → `listLeases`
- `POST /:id/leases/:leaseId/renew` → `authorizeProjectOrg` → `renewLease`
- `DELETE /:id/leases/:leaseId` → `authorizeProjectOrg` → `releaseLease`

Mount in `packages/api/src/index.ts`: add
`app.route("/api/v1/projects", projectLeasesRouter);` next to the
analytics/traces/domains mounts (lines ~189-203), with an import at the top
alongside the other route imports (match the existing alphabetized-ish
grouping in that file).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0; `cd packages/api && bunx vitest run` → all pass

#### Step 1.3: API tests

New test file (follow the existing test-file location convention — check
`packages/api/test/` for the naming pattern used by `projects`/`domains`
route tests) covering: list returns only same-org leases (404 for
cross-org project id, matching `authorizeProjectOrg`'s 404-not-403
convention), renew/release via the new routes update the same rows the
bearer-key routes would, pagination cursor round-trips.

**Verify**: `cd packages/api && bunx vitest run` → all pass

#### Step 1.4: Dashboard — Leases tab

- `_leases-table.tsx`: copy `_api-keys-table.tsx`'s Card+Table structure.
  Columns: state key, holder, fencing token, expires at (use
  `formatDate`/relative-time from `_utils.ts`), status badge (active/expired/
  released, derived client-side from `expires_at`/`released_at`), row actions
  (Renew, Release — Release only shown/enabled while active).
- `_use-leases-data.ts`: fetch `GET /v1/projects/:id/leases` **lazily when
  the tab is first activated**, not eagerly on project mount (avoid loading
  4 extra resources for every dashboard visit when most users only look at
  Conversations) — cache the result in state so switching tabs back doesn't
  re-fetch.
- `_use-lease-actions.ts`: `handleRenewLease`, `handleReleaseLease` calling
  the new endpoints via `api()`, then refresh the leases list.
- Wire into `project-content.tsx`: extend `TabDef["value"]` to add
  `"leases"`, add a tab button (pick an icon — `Timer` or `LockKey` from
  `@phosphor-icons/react`, whichever the icon set has), add the render block.

**Verify**: `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` → exit 0

#### Step 1.5: Docs

`packages/dashboard/src/pages/docs.astro`:
- Add `["leases", "Leases"]` to the "Reference" `navGroups` item (line ~19-25)
  and to `onThisPage` (line ~42-52).
- Add a `leaseEndpoints` array (model on `conversationEndpoints`,
  lines 62-68) documenting the **public bearer-key** endpoints:
  `POST /api/v1/states/:state_key/lease`, `POST /api/v1/leases/:id/renew`,
  `DELETE /api/v1/leases/:id`.
- Add a matching `<h2 id="leases">` section (model on the `conversations`
  section around line 300) rendering that endpoint table.
- Update the `sections` array used for scroll-spy (grep
  `const sections = [` — currently line ~457) to include `"leases"`.

**Verify**: manual — build the dashboard and visually confirm `/docs` shows
the new nav entry and section; `bun run build` still exits 0.

**Phase 1 done when**: leases list/renew/release work end-to-end from the
dashboard for a project that has a lease created via the SDK/API; typecheck +
lint + full vitest run + dashboard build all pass; PR merged.

---

### Phase 2 — Claims (flagship differentiator #2)

#### Step 2.1: New route file `project-claims.ts`

Same idiom as Phase 1. Routes:
- `GET /:id/claims` → `authorizeProjectOrg` → `listClaims` (pass through
  `subject_type`/`subject_id`/`cursor`/`limit`/`order` query params, matching
  the bearer-key route's query handling in `routes/claims/index.ts:104-124`)
- `GET /:id/claims/:claimId` → `authorizeProjectOrg` → `getClaim` (includes evidence)
- `POST /:id/claims/:claimId/verify` → `authorizeProjectOrg` → `verifyClaim`

No create route in this phase (out of scope, see above).

Mount alongside Phase 1's router in `index.ts`.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

#### Step 2.2: API tests

Cross-org 404, list + filter by subject_type/subject_id, verify-claim
transitions `status` from `pending` to `verified`/`failed` and the response
includes `details.results` per evidence item (see
`ClaimVerificationRunResponse` shape, `shared/src/index.ts:604-613`).

**Verify**: `cd packages/api && bunx vitest run` → all pass

#### Step 2.3: Dashboard — Claims tab

- `_claims-table.tsx`: list view — subject_type/subject_id, statement
  (truncated), status badge (`pending`/`verified`/`failed` — use
  `pos`/`warn`/`neg` tone tokens the way `docs.astro`'s `methodTone` map does
  at line 54-59, for visual consistency).
- `_claim-detail.tsx`: expandable row or drawer showing full evidence list
  (`ClaimEvidenceResponse[]` — kind/source/hash or json_path+expected_value)
  and, once verified, the verification run's per-evidence pass/fail results.
- `_use-claims-data.ts`: same lazy-fetch-on-tab-activate pattern as leases.
- `_use-claim-actions.ts`: `handleVerifyClaim`.
- Wire into `project-content.tsx` (extend `TabDef` union again).

**Verify**: dashboard build passes.

#### Step 2.4: Docs

Same shape as Phase 1 Step 1.5: `["claims", "Claims"]` in nav/onThisPage,
`claimEndpoints` array documenting `POST /api/v1/claims`, `GET
/api/v1/claims`, `GET /api/v1/claims/:id`, `POST /api/v1/claims/:id/verify`,
new `<h2 id="claims">` section, add `"claims"` to the scroll-spy `sections` array.

**Phase 2 done when**: claims list/detail/verify work end-to-end from the
dashboard for a project with claims created via the SDK/API; full check
suite passes; PR merged.

---

### Phase 3 — Capability Tokens (cheapest phase — full service reuse)

#### Step 3.1: New route file `project-capability-tokens.ts`

Routes, all delegating to the **already-complete** `services/capability-tokens.ts`
(no new service code needed — this phase is route + frontend only):
- `GET /:id/capability-tokens` → `authorizeProjectOrg` → `listCapabilityTokens`
- `POST /:id/capability-tokens` → `authorizeProjectOrg` → `createCapabilityToken`
  — unlike the bearer-key route (`routes/capability-tokens/index.ts:36-46`),
  do **not** apply the `scopesSatisfyAll` caller-subset check: a Clerk
  session is the org owner, so (mirroring `projects.ts:239-241`'s stated
  rationale for API keys) it may grant any scope in `CAPABILITY_SCOPES`
  directly.
- `DELETE /:id/capability-tokens/:tokenId` → `authorizeProjectOrg` → `revokeCapabilityToken`

Import `CAPABILITY_SCOPES`/`CreateCapabilityTokenSchema` from
`lib/validation.ts` for request validation (same schema the bearer-key route
uses).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

#### Step 3.2: API tests

Cross-org 404, create with an arbitrary scope subset succeeds (no
subset-of-caller check), revoke marks `revoked_at`, list excludes revoked
appropriately (check what `listCapabilityTokens` currently returns —
revoked or not — and match the dashboard's expectation to that, don't guess).

**Verify**: `cd packages/api && bunx vitest run` → all pass

#### Step 3.3: Dashboard — Capability Tokens tab

- `_capability-tokens-table.tsx`: copy `_api-keys-table.tsx` almost exactly
  — name, `token_prefix`, scope badges (reuse `scopeLabel()` from
  `@/lib/scopes`, note `CapabilityTokenScope` is a narrower union than
  `ApiScope` — check `SCOPE_GROUPS` covers all `CAPABILITY_SCOPES` values or
  filter accordingly), expires_at, last_used_at, revoke action.
- Create form: copy `_keys-tab.tsx`'s `KeyNameForm`/`ScopeSelector` pattern,
  scoped to `CAPABILITY_SCOPES` only, plus an optional expiry date input
  (`CreateCapabilityTokenRequest.expires_at`).
- Reuse `_use-new-key-storage.ts` + `_created-key-display.tsx`'s "show
  secret once" pattern for the returned `CapabilityTokenCreatedResponse.token`
  — do not build a new reveal-once component.
- `_use-capability-tokens-data.ts` (lazy fetch), `_use-capability-token-actions.ts`
  (create/revoke).
- Wire into `project-content.tsx`.

**Verify**: dashboard build passes.

#### Step 3.4: Docs

Same shape: `["capability-tokens", "Capability Tokens"]` in nav/onThisPage,
endpoint table for `POST/GET /api/v1/capability-tokens`, `DELETE
/api/v1/capability-tokens/:id`, new `<h2>` section, scroll-spy array update.

**Phase 3 done when**: create/list/revoke capability tokens works end-to-end
from the dashboard; full check suite passes; PR merged.

---

### Phase 4 — States (largest phase; view-only)

#### Step 4.1: New route file `project-states.ts`

- `POST /:id/states/query` → `authorizeProjectOrg` → `queryStates` (exposes
  `agent_id`/`tags`/`updated_after`/`updated_before`/`json_path`+`json_equals`/
  `predicates` filters already supported by `QueryStatesSchema` — the
  dashboard UI can start with just `agent_id`/`tags` filters and grow later)
- `GET /:id/states/:key` → `authorizeProjectOrg` → `getLatestState` (support
  `at_sequence`/`at_time` query params via `getHistoricalState`, matching the
  bearer-key route's behavior at `routes/states/index.ts:218-234`)
- `GET /:id/states/:key/events` → `authorizeProjectOrg` → `listStateEvents`
  (the WAL/version log)

No upsert/delete route in this phase (out of scope — view-only).

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

#### Step 4.2: API tests

Cross-org 404, query filters, historical lookup via `at_sequence`/`at_time`,
events list ordering/pagination (`after` cursor, ascending — note this is the
**opposite** direction from the claims/leases `cursor` convention, per the
comment at `routes/states/index.ts:93-98`; don't copy the wrong pagination
shape from Phase 1-3 into this one).

**Verify**: `cd packages/api && bunx vitest run` → all pass

#### Step 4.3: Dashboard — States tab

- `_states-table.tsx` / `_state-row.tsx`: list of state keys (from a query
  with sensible defaults, e.g. recently updated first) with expand-to-detail,
  modeled on the `data-tab/` conversation row/expand pattern.
- `_state-detail.tsx`: renders `data`/`metadata`/`tags`/`latest_sequence` for
  the current version, plus an expandable event log table (`_state-events-table.tsx`)
  showing `sequence`/`event_type`/`agent_id`/`created_at` per WAL entry.
- `_use-states-data.ts` (lazy fetch), following the same tab-activation
  pattern as the other three phases.
- Wire into `project-content.tsx` — this is the 4th and final `TabDef` union
  extension, giving the full set: `"data" | "keys" | "settings" | "leases" |
  "claims" | "capability-tokens" | "states"`.

**Explicitly out of scope for this phase**: live updates via the `/watch` SSE
endpoint. That endpoint is scope-gated (`state:watch`) and accepts a
capability token via `?token=as_cap_...` for browser `EventSource` (which
can't set an `Authorization` header) — wiring it into the dashboard means
either minting and exposing a capability token to client JS (a real security
decision, not a UI task) or building a server-side proxy that re-streams SSE
through the Clerk-session surface (undesigned, non-trivial on Workers). If a
future iteration wants live state updates in the dashboard, that's a
follow-up plan, not a sub-task hidden in this one — flag it as a STOP
condition below if you're tempted to build it as part of this phase.

**Verify**: dashboard build passes.

#### Step 4.4: Docs

Same shape: `["states", "States"]` in nav/onThisPage, endpoint table for
`PUT/GET/DELETE /api/v1/states/:key`, `POST /api/v1/states/query`, `GET
/api/v1/states/:key/events`, new `<h2>` section, scroll-spy array update.
At this point all five primitives (conversations, analytics, states, leases,
claims, capability-tokens... — six counting analytics) are represented in
`docs.astro`.

**Phase 4 done when**: states browse + event log works end-to-end from the
dashboard for a project with state written via the SDK/API; full check suite
passes; PR merged.

## Test plan

Per phase: new vitest file(s) under `packages/api/test/` covering the new
route file's cross-org isolation (404, not 403 — matching
`authorizeProjectOrg`'s existing convention) and each new/reused service call.
Dashboard: no existing component test harness was found for the project tabs
during this investigation (verify at execution time — grep for `*.test.tsx`
under `packages/dashboard/src/components/dashboard/project/`; if none exist,
match that convention rather than introducing one unprompted, but flag it as
an observation in the PR description). Manual verification: build the
dashboard, sign in, seed a project with a lease/claim/capability-token/state
via `curl` + the test API key from `CLAUDE.md`, confirm each new tab renders
the seeded data and each action (renew/release/verify/revoke/create) works.

## Done criteria

- [ ] Phase 1 (Leases): merged, deployed, `listLeases` + 3 new routes + tab live
- [ ] Phase 2 (Claims): merged, deployed, 3 new routes + tab live
- [ ] Phase 3 (Capability Tokens): merged, deployed, 3 new routes + tab live
- [ ] Phase 4 (States): merged, deployed, 3 new routes + tab live
- [ ] `docs.astro` nav/onThisPage/sections include all four primitives
- [ ] No changes to the bearer-key routers or their scope middleware in any phase
- [ ] Each phase's typecheck + lint + vitest + dashboard build all exit 0
- [ ] `plans/README.md` row for 011 updated after each phase (or once, if all four ship together)

## STOP conditions

- `authorizeProjectOrg`'s duplicated-per-file pattern has changed shape (e.g.
  been extracted to a shared helper) since this plan was written — re-read
  `projects.ts` and `domains.ts` live before assuming the idiom above.
- `clerkDashboardAuth` requires anything beyond the session cookie (e.g. an
  org-role check beyond membership) that isn't visible in the excerpt at
  `middleware/clerk-dashboard-auth.ts:50-65` — read the full file before
  Step 1.2, since only the first 15 lines were inspected during planning.
- The dashboard's `TabDef` union / `Tabs` component in `project-content.tsx`
  has been refactored to a different pattern (e.g. router-based tabs) since
  `ce9a1fa` — the "extend the union" instructions above assume the current
  `useState`-driven tab switcher.
- Any phase's new list endpoint turns out to need pagination/perf work beyond
  what the existing indexes support (checked for leases only — verify claims/
  capability-tokens/states list queries against their existing indexes before
  assuming they're equally cheap).
- You find yourself wanting to build the States `/watch` SSE UI as part of
  Phase 4 — stop, this is explicitly deferred (see Step 4.3).

## Maintenance notes

- If a future plan adds write actions to the States tab (upsert/delete from
  the dashboard), it should follow the exact same `project-states.ts` +
  `authorizeProjectOrg` pattern established here, not invent a new one.
- If live state-watch in the dashboard becomes a priority, the capability-token-
  in-query-string approach the bearer API already supports
  (`allowQueryToken: true` in `routes/states/index.ts:50`) is the natural
  building block — but the security tradeoff of exposing a capability token
  to browser JS needs its own review, not a bolt-on here.
- Reviewer: confirm no phase accidentally routes through the bearer-key
  routers (`apiKeyAuth`/`scopedAuth`) instead of `clerkDashboardAuth` — that
  would silently require end users to have an API key just to view their own
  project's data, defeating the point of this plan.
