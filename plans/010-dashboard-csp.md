# Plan 010: Ship a Content-Security-Policy for the dashboard (report-only first)

> **Executor instructions**: Follow step by step; run every verification
> command. On any "STOP condition", stop and report. Update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ce9a1fa..HEAD -- packages/api/src/middleware/security-headers.ts packages/api/src/index.ts`
> On change, compare "Current state" excerpts; mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — a wrong policy breaks the dashboard; mitigated by starting Report-Only
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ce9a1fa`, 2026-07-17

## Why this matters

The same Worker that serves the API also serves the Clerk-authenticated dashboard (static Astro/React assets via the `ASSETS` binding). The dashboard holds a Clerk session; with no CSP, any injected script has no second defense layer — an XSS becomes full session compromise. `security-headers.ts` already sets nosniff/frame/referrer/HSTS and explicitly defers CSP "for human review". This plan does that review's legwork: a Clerk-and-Astro-compatible policy, shipped **Report-Only first** so nothing breaks, with the enforcement flip as an explicit final step gated on verification.

## Current state

- `packages/api/src/middleware/security-headers.ts` (entire file, 27 lines):
  ```ts
  /** ...
   * Intentionally excluded (deferred for human review):
   * - Content-Security-Policy — needs careful tuning to avoid breaking the dashboard
   * - COOP/COEP/CORP — can break legitimate cross-origin API fetches
   */
  export const securityHeaders = createMiddleware<...>(async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  });
  ```
- Dashboard stack: Astro static export + React islands, Clerk (`@clerk/*`, live instance on `clerk.agentstate.app` — verify the actual Clerk frontend-API domain from `packages/dashboard/.env.production` / `astro.config.*` **without quoting any key values**), Tailwind v4, echarts. Clerk loads remote script from the instance's frontend API domain and uses workers/frames — consult the shadcn/Astro build output for inline styles/scripts (Astro inlines small scripts by default).
- Serving path: `packages/api/src/index.ts` — API routes under `/api/*`; everything else falls through to `ASSETS` (SPA mode). The middleware runs on Hono responses; **verify whether asset responses served by the `ASSETS` binding pass through Hono middleware at all** (look at how `index.ts` wires assets — if assets bypass Hono, CSP must be attached wherever the asset response is produced/proxied, or via a wrapper).
- No CSP report endpoint exists.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `bunx tsc --noEmit -p packages/api/tsconfig.json` | exit 0 |
| Tests | `cd packages/api && bunx vitest run` | all pass |
| Dashboard build | `cd packages/dashboard && PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build` | clean static export |
| Local check | `cd packages/api && bunx wrangler dev` then `curl -sI http://localhost:8787/dashboard \| grep -i content-security` | header present |

## Scope

**In scope**:
- `packages/api/src/middleware/security-headers.ts`
- `packages/api/src/index.ts` (only if asset responses need the header attached there)
- A minimal report endpoint (optional; logging-only) under `packages/api/src/routes/` if you wire `report-uri`/`report-to` — keep it unauthenticated-safe (accept, log count, 204; no body persistence)
- `packages/api/test/` — header-presence tests

**Out of scope**:
- COOP/COEP/CORP — still deferred, per the file's comment.
- Any dashboard source changes to satisfy the policy (if the policy can't be satisfied without changing dashboard code, STOP and report what violates).
- Flipping to enforcing mode — this plan ends at Report-Only + a documented flip procedure (see Step 4).

## Git workflow

- Branch: `claude/improvement-<timestamp>`; commit `feat(api): add report-only Content-Security-Policy for dashboard responses`; co-author trailers per CLAUDE.md. No push/PR unless instructed.

## Steps

### Step 1: Determine where asset responses get headers

Read `packages/api/src/index.ts` end to end. Establish whether HTML asset responses flow through `securityHeaders`. Record the answer in your report. If they don't, attach headers at the asset fall-through point (clone the Response, add headers) — headers on API JSON responses alone are useless for CSP.

**Verify**: `bunx wrangler dev` + `curl -sI` on an HTML route shows the existing headers (e.g. `X-Frame-Options`) — proving you found the right attachment point.

### Step 2: Draft the policy (Report-Only)

Start strict and widen only for what the dashboard actually uses. Baseline draft — adjust the Clerk domain to the real one found in Step 1's recon:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://<clerk-frontend-api-domain>;
connect-src 'self' https://<clerk-frontend-api-domain>;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
frame-src https://<clerk-frontend-api-domain>;
worker-src 'self' blob:;
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

Apply as `Content-Security-Policy-Report-Only` on **HTML/asset responses only** (API responses may get a trivial `default-src 'none'` enforcing policy — safe for JSON and standard hardening; include it if simple, skip if the routing makes it noisy). `'unsafe-inline'` for script-src is a pragmatic Astro/Clerk starting point; note in the code comment that nonce-based tightening is the follow-up.

**Verify**: `bunx tsc --noEmit -p packages/api/tsconfig.json` → exit 0

### Step 3: Manually exercise the dashboard locally

`bunx wrangler dev` (serving the built dashboard per CLAUDE.md dev commands), open the main routes (landing, /dashboard, sign-in), and check the browser console for CSP-Report-Only violation warnings. Iterate the policy until zero violations on: landing page, sign-in (Clerk widget renders), dashboard shell, analytics page (echarts canvas renders).

**Verify**: zero `Content-Security-Policy-Report-Only` violations in the console on those four routes (report the checklist).

### Step 4: Tests + document the flip

- Test: HTML response carries `Content-Security-Policy-Report-Only` with `frame-ancestors 'none'`; API JSON response headers unchanged (or carry the strict API policy if you added it).
- Add a short "flip to enforcing" note in the middleware comment: after N days of clean reports in production, rename the header to `Content-Security-Policy`.

**Verify**: `cd packages/api && bunx vitest run` → all pass; dashboard build clean

## Test plan

Header-presence assertions as in Step 4, in whichever suite already asserts security headers (grep `X-Frame-Options` in `packages/api/test/` — extend that file).

## Done criteria

- [ ] `Content-Security-Policy-Report-Only` present on dashboard HTML responses (curl check + test)
- [ ] Zero console CSP violations on landing / sign-in / dashboard / analytics locally
- [ ] Typecheck, lint, API tests, dashboard build all green
- [ ] No dashboard source files modified; `plans/README.md` row updated

## STOP conditions

- Asset responses cannot get headers without restructuring `index.ts` routing beyond adding headers to the fall-through response.
- Clerk requires a directive that would gut the policy (e.g. `script-src 'unsafe-eval'`) — report; a human should weigh it.
- The dashboard visibly breaks under Report-Only (it shouldn't — that's the point of report-only; if it does, something else is wrong: STOP).

## Maintenance notes

- Every new third-party origin the dashboard adopts (fonts, analytics, CDN) must be added to the policy — reviewers should watch dashboard-dep PRs for new origins.
- Follow-ups deliberately deferred: nonce-based `script-src` (drop `'unsafe-inline'`), enforcing flip, COOP/COEP.
