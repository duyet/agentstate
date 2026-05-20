# AgentState Core Memory

Durable notes for recurring maintenance. Keep this file small and update it instead of adding dated AI review reports.

## Maintenance Workflow

- `CLAUDE.md` is the main repo guide; root `AGENTS.md` carries the same guidance for Codex and other agents.
- Use `PLAN.md` as the autonomous maintenance playbook, but store recurring lessons here.
- Do not create new snapshot files like `docs/API_DOCS_REVIEW.md`, `docs/test-coverage-analysis.md`, or `docs/reviews/code-smell-dead-code-*.md`.
- When refreshing `/agents.md`, edit `packages/api/src/content/agents.md` and regenerate `packages/api/src/content/static.ts`.

## Review Memory

- Historical API-doc review notes from March 2026 were folded into the live docs. Keep API endpoint coverage current in `docs/api-reference.md`, `docs/sdk.md`, and `docs/integration.md`.
- Historical test-coverage notes were stale after the test suite expanded. Use current `packages/api/test/` coverage and CI output as the source of truth before adding tests.
- Recent state-platform maintenance should cover sparse `/api/v2/states/query` filters. Tag and JSON-path queries must keep scanning past nonmatching rows instead of stopping at the first capped candidate page.
- The TypeScript LangGraph adapter should extend `BaseCheckpointSaver` from `@langchain/langgraph-checkpoint`; keep the optional peer and dev dependency aligned so SDK type/build checks verify that contract.
