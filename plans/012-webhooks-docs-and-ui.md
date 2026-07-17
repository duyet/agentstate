# Plan 012: Document webhooks and add a dashboard management UI

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/services/webhooks.ts packages/api/src/lib/webhook.ts packages/api/src/lib/validation.ts packages/api/src/services/conversations.ts`
> This plan was written while three other agents were actively changing these
> exact files (issues #351, #344, and the dead-code/parallelization cleanup in
> `plans/002-webhook-event-exact-match.md` / `plans/003-webhook-delivery-parallel.md`).
> **Expect non-empty diff output.** Do not treat that as drift-failure by
> itself — re-read the live file, confirm the specific excerpt quoted in
> "Current state" below still matches the *behavior* described (function
> signatures, response shapes, the signature header name), and only STOP if
> something this plan depends on (see "Depends on") contradicts what's written
> here — most importantly the wire format in Step 7.

## Status

- **Priority**: P2
- **Effort**: L (spans backend, dashboard, docs)
- **Risk**: LOW (additive — no existing endpoint's request/response shape changes)
- **Depends on**: **hard blocker** — `plans/002-webhook-event-exact-match.md` (#351) and `plans/003-webhook-delivery-parallel.md` must be merged to main, **and** issue #344 (timestamped HMAC signatures) must be merged to main, before Step 7 (docs) is written. See "Why a hard dependency" below.
- **Category**: product / docs / dashboard
- **Planned at**: commit `ce9a1fa`, 2026-07-17
- **Source**: GitHub issue #285

## Why this matters

Webhooks are a fully implemented, production feature — create/list/get/update/delete, HMAC-signed delivery with retry — but they are invisible to a user evaluating or using the product:

- Not in `README.md`'s "Supporting capabilities" list.
- Not documented anywhere in `docs/api-reference.md` (only one incidental mention of the `webhooks:write` scope name, no endpoint docs).
- **No dashboard UI at all** — there is no way to create, view, or delete a webhook except by hand-crafting authenticated HTTP requests with a `webhooks:write`-scoped API key.

That last point is sharper than the issue text suggests. It's not just "no UI exists" — **there is no backend route the dashboard could even call**. Every webhook CRUD route (`packages/api/src/routes/webhooks/index.ts`) is gated by `apiKeyAuth` + `requireScope("webhooks:write")` (API-key bearer auth), but the dashboard authenticates via a Clerk session, not an API key. Compare to Custom Domains, which is architecturally identical to webhooks (a project-scoped child resource, no CRUD elsewhere) and solved this by adding a **second**, Clerk-session-authenticated router (`packages/api/src/routes/domains.ts`, mounted at `/api/v1/projects/:projectId/domains`) that calls the same service functions. Webhooks needs the same treatment — this plan is not purely additive docs/UI, it requires one new backend route file.

## Why a hard dependency on #351 / #344 / plan 003

Three other in-flight changes touch the exact files this plan reads to write "Current state" and the docs recipe:

- **#351** (already has `plans/002-webhook-event-exact-match.md`): changes `getActiveWebhooksForEvent` in `services/webhooks.ts` from substring `LIKE` to exact membership. Does not touch the CRUD functions this plan's new route calls, but confirms `services/webhooks.ts` is under active edit.
- **plan 003** (`plans/003-webhook-delivery-parallel.md`): parallelizes delivery in `conversations.ts` and **deletes** the dead `deliverWebhooks` from `lib/webhook.ts`. Not touched by this plan's Steps, but the drift-check above will show it.
- **#344**: changes the signed material and adds `X-AgentState-Timestamp`. **This one is a real content dependency**: Step 7 (docs) writes the HMAC verification recipe a user pastes into their webhook receiver. Documenting today's scheme (`HMAC(secret, body)`, no timestamp) would ship a recipe that's wrong the moment #344 merges, and receivers built against it would break silently. Step 7 is explicitly blocked until #344 is on `main`.

Steps 1-6 (backend route + dashboard UI + shared types) do **not** depend on any of the three — they call the untouched CRUD functions (`createWebhook`, `listWebhooks`, `getWebhookById`, `updateWebhook`, `deleteWebhook`) and can land first. Only Step 7 is gated.

## Current state

### The API-key-gated CRUD router (already complete, do not change)

`packages/api/src/routes/webhooks/index.ts:1-122` — full CRUD, mounted at `/api/v1/webhooks` (`packages/api/src/index.ts:200`), gated by:
```ts
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);
router.use("*", requireScope("webhooks:write"));
```
Routes: `POST /`, `GET /`, `GET /:id`, `PUT /:id` (update — the issue text omits this one; it exists and must be documented), `DELETE /:id`.

Backing service, `packages/api/src/services/webhooks.ts`:
- `createWebhook(db, projectId, { url, events })` → `WebhookWithSecret` (secret shown once, `:73-104`)
- `listWebhooks(db, projectId)` → `WebhookListItem[]`, secret never included (`:110-121`)
- `getWebhookById(db, projectId, webhookId)` → `WebhookListItem | null` (`:127-143`)
- `updateWebhook(db, projectId, webhookId, { url?, events?, active? })` → `WebhookListItem | null` (`:149-189`)
- `deleteWebhook(db, projectId, webhookId)` → `boolean` (`:195-213`)

These five functions already take `projectId` as an explicit parameter and do not read auth context — they can be called from a new, differently-authenticated route with zero changes.

Validation, `packages/api/src/lib/validation.ts:160-186`:
```ts
export const WEBHOOK_EVENT_TYPES = ["conversation.created"] as const;
export const WebhookEventSchema = z.enum(WEBHOOK_EVENT_TYPES);
const WebhookUrlSchema = z.string().url("Invalid webhook URL").refine(isSafeWebhookUrl, { ... }); // SSRF guard
export const CreateWebhookSchema = z.object({ url: WebhookUrlSchema, events: z.array(WebhookEventSchema).min(1).max(10) });
export const UpdateWebhookSchema = z.object({ url: WebhookUrlSchema.optional(), events: z.array(WebhookEventSchema).min(1).max(10).optional(), active: z.boolean().optional() });
```

**Non-obvious existing bug to note, not fix here**: there are **two separate copies** of the same event-name constant — `WEBHOOK_EVENT_TYPES` in `lib/validation.ts:161` and `WEBHOOK_EVENTS` in `lib/webhook.ts:7` — both currently `["conversation.created"]`. Anyone adding a new event type must update both or they'll drift. Flag this in Step 8 (the follow-up phase), do not fix it as a drive-by in this plan (out of scope, touches files #351/#344 are editing).

### The pattern to copy: Custom Domains (Clerk-session-authed, project-scoped sibling resource)

`packages/api/src/routes/domains.ts` (full file, 192 lines) is the template. Key shape:
```ts
async function resolveSessionOrgId(c: AppContext): Promise<string | null> { /* clerk org id -> internal org id, via organizations table */ }
async function authorizeProjectOrg(c: AppContext, projectId: string): Promise<Response | null> { /* 404 if project doesn't belong to session org */ }

router.get("/api/v1/projects/:projectId/domains", async (c) => {
  const unauthorized = await authorizeProjectOrg(c, c.req.param("projectId"));
  if (unauthorized) return unauthorized;
  const domains = await listDomains(c.get("db"), c.req.param("projectId"));
  return c.json({ data: domains });
});
// ... POST, GET/:id, DELETE/:id follow the same guard-then-delegate shape
```
Note the routes are registered with their **full path** (`/api/v1/projects/:projectId/domains`), not a relative path — that's intentional and matches how the router is mounted (see below), not a bug to "fix" when copying the pattern.

Mounting, `packages/api/src/index.ts`:
```ts
app.use("/api/v1/projects", clerkDashboardAuth);      // :87
app.use("/api/v1/projects/*", clerkDashboardAuth);    // :88
...
app.route("/api/v1/projects", domainsRouter);          // :203
```
`resolveSessionOrgId`/`authorizeProjectOrg` are **already duplicated** verbatim between `routes/projects.ts:37-67` and `routes/domains.ts:33-62` — this plan will duplicate them a third time in the new file, matching the established (if imperfect) local convention. Extracting a shared helper is optional cleanup, not in scope here (touching `routes/projects.ts` risks conflicting with unrelated in-flight work).

### The dashboard tab pattern to copy: API Keys tab

`packages/dashboard/src/components/dashboard/project/project-content.tsx:1-186` renders three tabs (`data`, `keys`, `settings`) via a `TabDef` union and `activeTab` state; `_KeysTab` (from `./_keys-tab.tsx`) is rendered when `activeTab === "keys"`, fed `apiKeys={project.api_keys}` (**keys are embedded in the project response** — webhooks are not, and embedding them would require changing `services/projects.ts`'s response shape, which this plan avoids; webhooks will be loaded independently, like domains).

Domains — architecturally the better template since it's a standalone list, not embedded — uses this loading shape (`packages/dashboard/src/components/dashboard/domains/_use-domains-list.ts`):
```ts
export function useDomainsList(projectId: string | null) {
  const [domains, setDomains] = useState<CustomDomainResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const loadDomainsData = useCallback(async () => {
    if (!projectId) return;
    try { setDomains(await loadDomains(projectId)); }
    catch (e) { toast.error(...); } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { if (projectId) loadDomainsData(); }, [projectId, loadDomainsData]);
  return { domains, loading, loadDomainsData, setDomains };
}
```
and a thin fetch-only service file, `_domains-service.ts`:
```ts
export async function loadDomains(projectId: string): Promise<CustomDomain[]> {
  const res = await api<{ data: CustomDomain[] }>(`/v1/projects/${projectId}/domains`);
  return res.data ?? [];
}
export async function addDomain(projectId: string, domain: string) { return api(...POST...); }
export async function deleteDomain(projectId: string, domainId: string) { return api(...DELETE...); }
```

Secret-reveal-once display to copy: `packages/dashboard/src/components/dashboard/project/_created-key-display.tsx` (`_CreatedKeyDisplay`) — masked/monospace box, "shown once" badge, copy button, `sessionStorage`-backed persistence across the post-create redirect via `_use-new-key-storage.ts` (`sessionStorage.getItem/setItem("new_key_" + slug)`).

### Shared types

`packages/shared/src/index.ts` has **no webhook response types yet** (only the `webhooks:write` scope string at `:163`). The closest existing model, `CustomDomainResponse` / `CreateCustomDomainResponse` (`:364-395`), is the pattern: a base response type, and a `Create*Response extends *Response` for the create-only fields (here: `secret`).

### Docs insertion point

`docs/api-reference.md` has no `Webhooks` heading (`grep -n "^###\|^##" docs/api-reference.md | grep -i webhook` returns nothing). The `### Keys API` section ends at line 929, immediately followed by `### Permissions & scopes` at line 931 — insert `### Webhooks API` between them. `README.md:25-35` is the "Supporting capabilities" bullet list to extend. `docs/INDEX.md` and `docs/getting-started.md` are **not** touched by this plan (see Scope) — see "Why INDEX.md and getting-started.md are out of scope" below.

### Why INDEX.md and getting-started.md are out of scope

`docs/INDEX.md`'s "All Guides" table indexes whole *pages* (API Reference, SDK, MCP, etc.), not individual resources within `api-reference.md` — there's no existing row for "Keys API" or "Projects API" either, so adding one for webhooks specifically would be inconsistent with the page's own convention. `docs/getting-started.md`'s "Next steps" section already links `[API Reference](./api-reference.md)` generically, which will include the new Webhooks section once Step 7 lands. Judgment call: don't touch either file. If the user disagrees after reading this, it's a one-line addition to reconsider, not a blocker.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck (API) | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Lint (API) | `bunx biome check packages/api/src/` | exit 0 |
| API tests | `cd packages/api && bunx vitest run` | all pass |
| Dashboard build | `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` | exit 0 |
| Dashboard lint | `bunx biome check packages/dashboard/src/` | exit 0 |
| Shared typecheck | `cd packages/shared && bun run typecheck` (or `bunx tsc --noEmit` if no script) | exit 0 |

## Scope

**In scope**:
- New file `packages/api/src/routes/webhooks-dashboard.ts` (Clerk-session-authed CRUD, delegates to existing `services/webhooks.ts`)
- One-line mount + import in `packages/api/src/index.ts`
- New webhook response types in `packages/shared/src/index.ts`
- New dashboard components/hooks under `packages/dashboard/src/components/dashboard/project/` (webhooks tab, list-loading hook, actions hook, secret-reveal display) and their wiring into `project-content.tsx` + `_components.tsx`
- `docs/api-reference.md` — new `### Webhooks API` section (blocked on #344, see Step 7)
- `README.md` — one new bullet in "Supporting capabilities"
- Tests: new route file (`packages/api/test/webhooks-dashboard.test.ts`), any new dashboard hook logic worth unit testing

**Out of scope**:
- Any change to `packages/api/src/routes/webhooks/index.ts` or `services/webhooks.ts`'s CRUD functions — they're correct and untouched.
- `getActiveWebhooksForEvent`, `sendWebhookWithRetry`, `deliverWebhooks`, the `conversations.ts` delivery path — owned by #351 / plan 003 / #344.
- Expanding `WEBHOOK_EVENT_TYPES` beyond `conversation.created` — see Step 8 (explicitly deferred).
- Embedding webhooks into the project GET response (`services/projects.ts`) — avoided by loading webhooks independently, domains-style.
- `docs/INDEX.md`, `docs/getting-started.md` — see "Why out of scope" above.
- Editing existing webhooks from the UI (the `PUT /:id` route) — documented in Step 7 for API completeness, but the UI in Step 5 only needs create/list/delete per the issue's suggested approach; toggling `active` or editing `url`/`events` is a natural fast-follow, not required here.

## Git workflow

- Do not start until the drift-check confirms #351, plan 003, and #344 are all merged to `main`.
- Branch: `claude/improvement-<timestamp>`.
- Commit granularly, one logical change per commit, e.g.:
  1. `feat(api): add Clerk-session-authed webhook management routes`
  2. `feat(shared): add webhook response types`
  3. `feat(dashboard): add Webhooks tab to project page`
  4. `docs: document Webhooks API and add to README`
- Co-author trailers per CLAUDE.md on every commit. PR + CI + merge + deploy per the standard Autonomous Maintenance workflow in `CLAUDE.md` if running unattended; otherwise stop after Step 7 for review.

## Steps

### Step 1: Add webhook response types to `packages/shared`

In `packages/shared/src/index.ts`, near the existing scope list / `CustomDomainResponse` (`:364-395`) add:
```ts
export interface WebhookResponse {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: number;
  last_triggered_at: number | null;
}

export interface CreateWebhookResponse extends WebhookResponse {
  secret: string; // only present on create — never returned by list/get
}
```
Match field names 1:1 with `WebhookListItem`/`WebhookWithSecret` in `packages/api/src/services/webhooks.ts:16-28` (already snake_case, no mapping needed — the service already returns the wire shape).

**Verify**: `cd packages/shared && bunx tsc --noEmit` → exit 0

### Step 2: Add the Clerk-session-authed dashboard route

Create `packages/api/src/routes/webhooks-dashboard.ts`, copying the structure of `packages/api/src/routes/domains.ts` verbatim (including the duplicated `resolveSessionOrgId`/`authorizeProjectOrg` helpers — see "Current state" for why duplicating is the local convention here). Routes, all under `/api/v1/projects/:projectId/webhooks`:

- `GET /api/v1/projects/:projectId/webhooks` → `authorizeProjectOrg` then `webhooksService.listWebhooks(db, projectId)`, `c.json({ data })`
- `POST /api/v1/projects/:projectId/webhooks` → `authorizeProjectOrg`, parse body with `CreateWebhookSchema` (import from `../lib/validation`, same schema the API-key router uses), `webhooksService.createWebhook(db, projectId, parsed.data)`, `c.json(webhook, 201)`
- `GET /api/v1/projects/:projectId/webhooks/:webhookId` → `authorizeProjectOrg`, `webhooksService.getWebhookById`, 404 via `errorResponse(c, "NOT_FOUND", "Webhook not found", 404)` if null
- `DELETE /api/v1/projects/:projectId/webhooks/:webhookId` → `authorizeProjectOrg`, `webhooksService.deleteWebhook`, `c.body(null, 204)` or 404

Skip `PUT` for the dashboard route in this plan (UI doesn't need it yet — see Scope); add it trivially later by mirroring `GET /:webhookId` if a follow-up wants edit support.

Wire it into `packages/api/src/index.ts`:
```ts
import webhooksDashboardRouter from "./routes/webhooks-dashboard";
...
app.route("/api/v1/projects", webhooksDashboardRouter); // near domainsRouter, :203
```
No change needed to `app.use("/api/v1/projects*", clerkDashboardAuth)` (`:87-88`) — it already covers this new path.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 3: Route tests

New file `packages/api/test/webhooks-dashboard.test.ts`, modeled on `packages/api/test/clerk-dashboard-auth.test.ts` (imports `SELF`, `sessionCookie`/`signTestSessionToken` from `./clerk-jwt`, `applyMigrations`/`seedProject` from `./setup`). Cover:
1. Unauthenticated (no session cookie) → 401 on GET/POST/DELETE.
2. Authenticated session for a **different** org, project belongs to the seeded org → 404 (not 403 — matches `authorizeProjectOrg`'s intentional non-leaking behavior).
3. Happy path: create → 201 with `secret` present; list → 200, secret **absent** from list items; delete → 204; get-after-delete → 404.
4. Create with an invalid URL (http, not https, or a private/loopback host per `isSafeWebhookUrl`) → 400 validation error (reuses `CreateWebhookSchema`, so this should just work — confirm it does).

**Verify**: `cd packages/api && bunx vitest run webhooks-dashboard` → all pass; then full `bunx vitest run` → all pass

### Step 4: Dashboard service + hooks

New files under `packages/dashboard/src/components/dashboard/project/`, modeled on `domains/_domains-service.ts` + `domains/_use-domains-list.ts` + `domains/_use-domain-actions.ts`:

- `_webhooks-service.ts`:
  ```ts
  export async function loadWebhooks(projectId: string): Promise<WebhookResponse[]> {
    const res = await api<{ data: WebhookResponse[] }>(`/v1/projects/${projectId}/webhooks`);
    return res.data ?? [];
  }
  export async function createWebhook(projectId: string, url: string, events: string[]): Promise<CreateWebhookResponse> {
    return api(`/v1/projects/${projectId}/webhooks`, { method: "POST", body: JSON.stringify({ url, events }) });
  }
  export async function deleteWebhook(projectId: string, webhookId: string): Promise<void> {
    await api(`/v1/projects/${projectId}/webhooks/${webhookId}`, { method: "DELETE" });
  }
  ```
- `_use-webhooks-list.ts` — mirror `useDomainsList`: `{ webhooks, loading, loadWebhooksData, setWebhooks }`, loads on `projectId` change.
- `_use-webhook-actions.ts` — mirror `useDomainActions`: `handleCreateWebhook(url, events, onCreated)` (calls the service, prepends to list, toasts, hands the one-time `secret` to a callback so the tab can show `_CreatedKeyDisplay`-style reveal), `handleDeleteWebhook(webhookId)` (confirm dialog like domains' `confirm(...)`, then delete + filter list + toast).

**Verify**: no build yet (component below needs to exist first) — proceed to Step 5, then verify both together.

### Step 5: Webhooks tab component + wiring

- `_webhooks-tab-state.ts` — mirror `_keys-tab-state.ts`: `{ showCreateWebhook, setShowCreateWebhook, newWebhookUrl, setNewWebhookUrl, resetWebhookForm }`. Event selection can default to `["conversation.created"]` (the only valid value today per `WEBHOOK_EVENT_TYPES`) with no picker UI yet — a multi-event picker is premature until Step 8 ships more event types.
- `_webhooks-table.tsx` — mirror `_api-keys-table.tsx`: columns URL, Events (badges), Last triggered (`formatDate` from `./_utils`, "Never" if null), Active/Inactive badge, delete button (trash icon, same hover styling `hover:bg-neg/10 hover:text-neg`). Empty state mirrors `_api-keys-table.tsx`'s empty-state Card (swap the `Key` icon for a webhook-appropriate Phosphor icon, e.g. `WebhooksLogo` or `Lightning` — check `@phosphor-icons/react`'s available exports before picking one).
- `_webhooks-tab.tsx` — mirror `_keys-tab.tsx`'s `KeysTab`: header text ("Manage webhook endpoints for this project."), "New Webhook" button revealing an inline form (URL input + submit/cancel), table below. On successful create, render `_CreatedKeyDisplay`-equivalent secret reveal (reuse `_CreatedKeyDisplay` directly if its copy ("Your API key") is generalized, or add a thin `_created-webhook-secret-display.tsx` — prefer reusing `_CreatedKeyDisplay` with a `label`/`title` prop if that's a small, surgical change; otherwise duplicate the ~40-line component rather than over-abstracting a single call site).
- Wire into `project-content.tsx`:
  - `TabDef["value"]` union: add `"webhooks"`.
  - `tabs` array: add `{ value: "webhooks", icon: <chosen icon>, label: "Webhooks", count: webhooks.length }`.
  - Call `useWebhooksList(project?.id ?? null)` and `useWebhookActions(...)` alongside the existing `useKeysTabState`/`useKeyActions` calls.
  - Render `<_WebhooksTab .../>` when `activeTab === "webhooks"`, same pattern as the `keys` branch at `:141-154`.
- Add all new exports to `_components.tsx` barrel, alphabetically grouped like the existing entries.

**Verify**: `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` → exit 0; `bunx biome check packages/dashboard/src/` → exit 0

### Step 6: Manual smoke check

Local dev: `cd packages/api && bunx wrangler dev` + `cd packages/dashboard && bun run dev`. Sign in, open a project, click the new Webhooks tab, create a webhook pointing at a real https endpoint (e.g. a webhook.site URL), confirm the secret is shown once, confirm it disappears on reload, confirm the row appears in the list with no secret visible, delete it, confirm it's gone.

### Step 7: Document the Webhooks API — BLOCKED on #344 landing

**Before starting this step**, run `gh issue view 344` and confirm it's closed/merged. If not, STOP here and report — do not write the pre-#344 signature scheme into permanent docs.

Once #344 has landed, re-read the **live** `packages/api/src/lib/webhook.ts` (`signWebhookPayload`, the delivery headers in `sendWebhookWithRetry`) to get the actual final header names and signed-string format (expected shape per #344's suggested fix: `X-AgentState-Timestamp` header, signed string `"${timestamp}.${body}"`, tolerance-window verification guidance — but confirm against the merged code, not this plan's guess).

Add a `### Webhooks API` section to `docs/api-reference.md` between `### Keys API` (ends line 929) and `### Permissions & scopes` (line 931), matching the surrounding sections' style (endpoint, request/response JSON blocks, error list). Cover:
- `POST /api/v1/webhooks` — create, request `{ url, events }`, response includes `secret` (shown once — call this out explicitly, same wording style as the Keys section's "The full key is never returned after creation").
- `GET /api/v1/webhooks` — list, secret never included.
- `GET /api/v1/webhooks/:id` — get one.
- `PUT /api/v1/webhooks/:id` — update `url`/`events`/`active`.
- `DELETE /api/v1/webhooks/:id` — delete, `204`.
- Auth: requires an API key with `webhooks:write` scope (link to `permissions.md`, already documents the scope).
- Payload shape delivered to the receiver: `{ event, timestamp, data: { conversation_id, project_id, external_id, title, message_count, token_count, created_at } }` (from `conversations.ts`'s `triggerConversationCreatedWebhook`) — note today only `conversation.created` fires this.
- **Signature verification recipe** — the post-#344 scheme, with a worked example (recompute HMAC-SHA256 over the signed string using the webhook's `secret`, compare to the header, reject if the timestamp is outside the tolerance window). Do not describe today's pre-#344 `HMAC(secret, body)`-only scheme even as a "legacy" note unless #344 itself documents a migration/compat period — check its merged PR description for that detail.
- Retry behavior: 3 attempts, 1s/2s/4s backoff, 10s timeout per attempt (from `sendWebhookWithRetry` — confirm these numbers are unchanged by #344/plan 003 before quoting them).

Add one bullet to `README.md`'s "Supporting capabilities" list (`:25-35`), matching the terse style of the existing bullets, e.g.:
```
- **Webhook Notifications** — HMAC-signed HTTP callbacks on conversation events, with automatic retry
```

**Verify**: `grep -n "^### Webhooks" docs/api-reference.md` → one match; manually confirm the doc's header names and signed-string description match the live `lib/webhook.ts` code, not this plan's draft text.

### Step 8: Flag, don't build, the event-type expansion

Do not implement this — write it down as a recommendation only (e.g. in the plan's final report, or as a new GitHub issue if running unattended with `gh issue create`).

The product markets general "Webhook notifications" but `WEBHOOK_EVENT_TYPES`/`WEBHOOK_EVENTS` (duplicated, see "Current state") only ever contains `conversation.created`. Expanding to e.g. `claim.verified`, `lease.expired` is materially larger than this plan:
- `claim.verified` has an obvious trigger site (wherever claims get verified — find and confirm it exists) but needs the same `getActiveWebhooksForEvent` + fire-and-forget wiring `conversations.ts` already has, duplicated or extracted into a shared trigger helper.
- `lease.expired` has **no natural write-path trigger** — leases expire by TTL elapsing, not by an API call, so firing this event requires either a scheduled sweep (there's already a `scheduled.ts` — check if it's a fit) or lazy detection on next read, which changes when/whether the event fires in ways worth designing deliberately.
- Both require fixing the `WEBHOOK_EVENT_TYPES`/`WEBHOOK_EVENTS` duplication first (single source of truth) so the zod enum and the delivery-matching logic can't drift.

Recommendation: separate issue, not a phase of this plan. State this explicitly in the final report rather than silently expanding or silently dropping it.

## Test plan

- Step 3's route tests are the primary coverage (auth boundary, cross-org 404, secret exposure only on create).
- Existing `packages/api/test/webhooks.test.ts` (URL safety, HMAC helper) must stay green — this plan doesn't touch what it covers, but the full suite run in Step 3's verify catches any accidental collision.
- Dashboard: no existing test harness for project-tab components in this repo (confirm via `find packages/dashboard -iname "*.test.tsx"` before assuming none needed) — if one exists, add a smoke test for the new tab rendering with an empty webhook list and the empty-state copy; otherwise the manual smoke check (Step 6) is the verification for this layer, matching how the Keys/Domains tabs shipped.

## Done criteria

- [ ] `packages/api/src/routes/webhooks-dashboard.ts` exists, mounted in `index.ts`, mirrors `domains.ts`'s auth pattern
- [ ] `packages/shared/src/index.ts` has `WebhookResponse`/`CreateWebhookResponse`
- [ ] New route tests pass; full `bunx vitest run` passes; `bunx tsc --noEmit -p packages/api/tsconfig.json` exits 0; `bunx biome check packages/api/src/` exits 0
- [ ] Dashboard Webhooks tab renders, wired into `project-content.tsx` and `_components.tsx`; `bun run build` and `bunx biome check packages/dashboard/src/` exit 0
- [ ] Manual smoke check (Step 6) done: create shows secret once, list never shows secret, delete works
- [ ] `docs/api-reference.md` has a `### Webhooks API` section documenting the **post-#344** signature scheme — only after confirming #344 merged
- [ ] `README.md` has a Webhook Notifications bullet in Supporting capabilities
- [ ] Event-type expansion (Step 8) explicitly flagged as a separate follow-up, not silently built or silently dropped
- [ ] No files outside scope modified; `plans/README.md` row updated

## STOP conditions

- #351, plan 003, or #344 are not yet merged when this plan is picked up — wait, or execute Steps 1-6 only and STOP before Step 7 with a note that docs are pending #344.
- The live `lib/webhook.ts` post-#344 signature scheme differs from what's assumed above (e.g. a different header name, no tolerance-window guidance) — write the docs from the actual merged code, not this plan's guess; if genuinely ambiguous, STOP and ask.
- `authorizeProjectOrg`/`resolveSessionOrgId` in `domains.ts` no longer matches the excerpt above (e.g. refactored into a shared module by unrelated work) — use whatever the current shared/duplicated form is, don't reintroduce a third copy if a shared helper now exists.
- Embedding webhooks in the project response turns out to already be planned/started elsewhere — check before adding a parallel independent-fetch path that would need reconciling.

## Maintenance notes

- The `resolveSessionOrgId`/`authorizeProjectOrg` pair is now tripled across `routes/projects.ts`, `routes/domains.ts`, and this plan's new `routes/webhooks-dashboard.ts`. Worth extracting to a shared module (e.g. `lib/dashboard-auth.ts`) the next time any of the three is touched — flagged here, not fixed, to keep this plan's diff minimal and merge-conflict-free against the in-flight work in the same directory.
- `WEBHOOK_EVENT_TYPES` (`lib/validation.ts`) and `WEBHOOK_EVENTS` (`lib/webhook.ts`) are duplicate sources of truth — see Step 8's blocker note. Whoever picks up event-type expansion should collapse these first.
- If the dashboard later wants to let users edit a webhook's `url`/`events`/`active` (not just create/delete), the `PUT /api/v1/webhooks/:id` route already exists server-side — only the dashboard-facing `PUT /api/v1/projects/:projectId/webhooks/:webhookId` route and its UI form need adding, mirroring Step 2/5 exactly.
