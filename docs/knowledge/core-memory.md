# AgentState Core Memory

Durable notes for recurring maintenance. Keep this file small and update it instead of adding dated AI review reports.

## Maintenance Workflow

- `CLAUDE.md` is the main repo guide; root `AGENTS.md` carries the same guidance for Codex and other agents.
- Use `PLAN.md` as the autonomous maintenance playbook, but store recurring lessons here.
- Do not create new snapshot files like `docs/API_DOCS_REVIEW.md`, `docs/test-coverage-analysis.md`, or `docs/reviews/code-smell-dead-code-*.md`.
- For code-smell automation, read `$CODEX_HOME/automations/code-smell-detector/memory.md` first, scan commits since that timestamp, then fall back to the last 24 hours or 7 days only when needed.
- When refreshing `/agents.md`, edit `packages/api/src/content/agents.md` and regenerate `packages/api/src/content/static.ts`.
- In sandboxed maintenance runs, set Bun and Wrangler writable paths when needed: `BUN_TMPDIR=/private/tmp/codex-bun-tmp`, `BUN_INSTALL_CACHE_DIR=/private/tmp/codex-bun-cache`, and `XDG_CONFIG_HOME=/private/tmp/codex-wrangler-config`.
- Root `bun run deploy` should delegate to `cd packages/api && bun run deploy`, and the API deploy script must prepare `wrangler.deploy.jsonc` first so deploys can omit unavailable Vectorize or cron bindings without editing `wrangler.jsonc`.
- Validate dashboard changes with `cd packages/dashboard && bun run build`; raw `bunx tsc --noEmit` can fail in fresh checkouts before Next generates route type files.

## Review Memory

- Historical API-doc review notes from March 2026 were folded into the live docs. Keep API endpoint coverage current in `docs/api-reference.md`, `docs/sdk.md`, and `docs/integration.md`.
- Historical test-coverage notes were stale after the test suite expanded. Use current `packages/api/test/` coverage and CI output as the source of truth before adding tests.
- Recent state-platform maintenance should cover sparse `/api/v1/states/query` filters. Tag and JSON-path queries must keep scanning past nonmatching rows instead of stopping at the first capped candidate page.
- Sparse state-query cap tests seed enough D1 rows to run close to Vitest's default timeout under full-suite load; keep an explicit per-test timeout on that coverage instead of changing production scan behavior.
- The TypeScript LangGraph adapter should extend `BaseCheckpointSaver` from `@langchain/langgraph-checkpoint`; keep the optional peer and dev dependency aligned so SDK type/build checks verify that contract.
- Current CI coverage is broader than the older root-guide snippets: it now runs API lint/typecheck/tests plus TypeScript SDK typecheck/build/tests, Python SDK tests, SDK example validation, and a full dashboard build. Sync agent docs to `.github/workflows/ci.yml` when these steps change.
- Production deploys should prepare `wrangler.deploy.jsonc` through `packages/api/scripts/prepare-wrangler-deploy-config.sh` before `npx wrangler deploy`, because the generated config can safely drop unavailable Vectorize bindings or cron triggers for the deploy token/account.
- In the Codex workspace sandbox, Bun tooling can fail with `bun is unable to write files to tempdir: PermissionDenied`; try a writable `TMPDIR` and `XDG_CACHE_HOME` before treating that as a project failure.
- The dashboard is served by the API Worker via the `ASSETS` binding (`packages/api/wrangler.jsonc` → `../dashboard/out`, SPA mode). `ci.yml` is the single deploy path: it builds the dashboard on PRs and on push to `main`, then deploys the Worker. The old Cloudflare Pages workflows (`dashboard-deploy.yml`, `preview-deploy.yml`) were removed because their `agentstate-dashboard` Pages project never existed (`Project not found [8000007]`), so they only produced false-red checks. Builds require `PUBLIC_CLERK_PUBLISHABLE_KEY` (Astro exposes `PUBLIC_`-prefixed vars to client code; in CI it is mapped from the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` GitHub secret); use Bun (this repo ships `bun.lock` only).

## Critical Security & Deploy Gates

- **✅ RESOLVED 2026-06-15 — dashboard-management routes are now Clerk-authenticated (PR #132, merged).** `/api/v1/projects*`, `/api/v1/organizations*`, `/api/v/projects*`, `/api/v/organizations*` were previously completely unauthenticated (anyone could list all projects, read tenants' data, mint/delete keys — confirmed live). Fixed with `clerkDashboardAuth` (fail-closed `@clerk/backend` `verifyToken`); `org_id` comes from the verified Clerk session. `CLERK_SECRET_KEY` is set on the Worker (`wrangler secret put`, persists across deploys — no GitHub Actions secret needed). **Verified live: unauthenticated → 401 across all dashboard-management routes; public routes (`/api`, `/llms.txt`) still 200; agent API-key routes intact.** The dashboard uses the matching live Clerk instance (`pk_live_Y2xlcmsuYWdlbnRzdGF0ZS5hcHAk`). NOTE: the `sk_live` secret was once pasted in chat during setup — rotate it in Clerk if that transcript exposure is a concern.
- **Release Please fails with `Bad credentials`** on every main push: `release-please.yml` uses `secrets.DUYETBOT_GITHUB_TOKEN` which is unset/expired. Needs the user to set that GitHub secret. Not fixable without the token.
