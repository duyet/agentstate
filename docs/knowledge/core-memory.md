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
- Recent state-platform maintenance should cover sparse `/api/v2/states/query` filters. Tag and JSON-path queries must keep scanning past nonmatching rows instead of stopping at the first capped candidate page.
- Sparse state-query cap tests seed enough D1 rows to run close to Vitest's default timeout under full-suite load; keep an explicit per-test timeout on that coverage instead of changing production scan behavior.
- The TypeScript LangGraph adapter should extend `BaseCheckpointSaver` from `@langchain/langgraph-checkpoint`; keep the optional peer and dev dependency aligned so SDK type/build checks verify that contract.
- Current CI coverage is broader than the older root-guide snippets: it now runs API lint/typecheck/tests plus TypeScript SDK typecheck/build/tests, Python SDK tests, SDK example validation, and a full dashboard build. Sync agent docs to `.github/workflows/ci.yml` when these steps change.
- Production deploys should prepare `wrangler.deploy.jsonc` through `packages/api/scripts/prepare-wrangler-deploy-config.sh` before `npx wrangler deploy`, because the generated config can safely drop unavailable Vectorize bindings or cron triggers for the deploy token/account.
- In the Codex workspace sandbox, Bun tooling can fail with `bun is unable to write files to tempdir: PermissionDenied`; try a writable `TMPDIR` and `XDG_CACHE_HOME` before treating that as a project failure.
