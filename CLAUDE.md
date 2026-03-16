# AgentState

Conversation history database-as-a-service for AI agents.

## Project Structure

```
packages/
  api/          Hono API on Cloudflare Workers + D1
  shared/       Shared TypeScript types (public API contract)
  dashboard/    Next.js + Clerk + shadcn/ui (served as static assets by API Worker)
docs/           Integration guides
scripts/        Setup and deployment scripts
```

**Architecture**: Single Cloudflare Worker serves both the REST API (`/api/v1/*`) and dashboard static assets.

## Dev Commands

```bash
# Install
bun install

# Local dev — API (port 8787)
cd packages/api
bunx wrangler dev

# Local dev — Dashboard (port 3000, separate dev server)
cd packages/dashboard
bun run dev

# Database
bunx drizzle-kit generate                                      # Generate migrations
bunx wrangler d1 migrations apply agentstate-db --local        # Apply locally
bunx wrangler d1 execute agentstate-db --local --file=scripts/seed.sql  # Seed

# Lint + Format
bunx biome check packages/api/src/          # Check
bunx biome check --write packages/api/src/  # Auto-fix

# Type check
bunx tsc --noEmit -p packages/api/tsconfig.json

# Test
cd packages/api && bunx vitest run

# Deploy
bunx wrangler deploy -c packages/api/wrangler.jsonc
```

## Architecture

- **Package manager**: Bun
- **Linter/Formatter**: Biome
- **API Framework**: Hono (ultrafast, Workers-native)
- **ORM**: Drizzle ORM (type-safe, D1/SQLite)
- **Database**: Cloudflare D1 (SQLite at edge)
- **Auth (API)**: Bearer token with SHA-256 hashed API keys
- **Auth (Dashboard)**: Clerk (client-side keyless mode for dev; prod keys in `.env.production`)
- **AI**: Workers AI for title generation and follow-up questions
- **Deployment**: Single Cloudflare Worker serves both API and dashboard static assets

## Conventions

- **IDs**: nanoid (21 chars), auto-generated via Drizzle `$defaultFn`
- **Timestamps**: Unix milliseconds (Date.now()), stored as INTEGER in SQLite
- **API responses**: snake_case field names
- **API keys**: Format `as_live_` + 40 base62 chars. Only SHA-256 hash stored.
- **Metadata**: JSON serialized as TEXT column, parsed on read
- **Pagination**: Cursor-based (never offset-based)
- **Error format**: `{ error: { code: "MACHINE_CODE", message: "Human message" } }`

## Key Files

- `packages/api/src/db/schema.ts` — Single source of truth for DB schema
- `packages/api/src/middleware/auth.ts` — API key auth (critical security path)
- `packages/api/src/routes/conversations.ts` — Core CRUD operations
- `packages/api/drizzle/` — Generated SQL migrations (committed to git)

## Testing

```bash
# Run all tests
cd packages/api && bunx vitest run

# Local test API key (from seed.sql):
as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab

# Health check
curl http://localhost:8787/

# Create conversation
curl -X POST http://localhost:8787/v1/conversations \
  -H "Authorization: Bearer as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Git Conventions

- **Semantic commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **Co-authors** (always include both):

```
Co-Authored-By: Duyet Le <me@duyet.net>
Co-Authored-By: duyetbot <bot@duyet.net>
```

## Autonomous Maintenance

See **[PLAN.md](PLAN.md)** for the full maintenance playbook, quality benchmarks, scenario tables, and backlog. Keep PLAN.md up to date after every iteration.

### Continuous Improvement Loop (every 15 min via cron)

When the cron fires, run this full cycle:

#### Phase 0 — Benchmark
Run all quality checks in parallel. If any regress, fix before proceeding.
```bash
bunx biome check packages/api/src/
bunx tsc --noEmit -p packages/api/tsconfig.json
cd packages/api && bunx vitest run
cd packages/dashboard && bunx tsc --noEmit
git status --short
```

#### Phase 1 — Plan & Brainstorm
1. **Read current state**: Check PLAN.md backlog, memory files, recent git log
2. **Brainstorm**: What has the biggest impact right now?
   - Next unchecked backlog item ready to build
   - Quality gaps (test coverage, type safety, accessibility)
   - Architectural improvements that unlock future work
   - Dashboard UX gaps users would expect
   - Developer experience — docs accuracy, SDK completeness
3. **Plan**: For non-trivial items, use Agent (Plan) to design approach. Write plan to memory if it spans multiple iterations.
4. **Prioritize**: Pick 2-4 concrete tasks for parallel execution without file conflicts. Prefer high-impact items.

#### Phase 2 — Execute (batch parallel agents)
Spawn 2-4 parallel agents in a single message (`run_in_background: true`):
- Use PLAN.md scenario tables as menu
- Mix categories: feature + quality + dashboard + docs
- Agents touch **different files** — no conflicts
- senior-engineer for features/refactors, junior-engineer for lint/format/dead-code, code-reviewer for audits

#### Phase 3 — Collect & Verify
1. Review agent outputs — reject anything that breaks existing behavior
2. Full quality suite: lint → typecheck → test
3. If anything fails, fix before continuing

#### Phase 4 — PR, Monitor, Merge & Deploy
1. Create feature branch: `git checkout -b claude/improvement-<timestamp>`
2. Commit each logical change separately with semantic messages + co-authors
3. Push branch and create PR: `gh pr create --title "..." --body "..."`
4. Monitor CI: poll `gh pr checks <pr-number>` until all checks pass or fail
5. If CI passes → merge: `gh pr merge <pr-number> --squash --delete-branch`
6. If CI fails → fix issues, push again, re-check
7. After merge → deploy: `bunx wrangler deploy -c packages/api/wrangler.jsonc`
8. Verify: `curl -s -o /dev/null -w '%{http_code}' https://agentstate.app/api`
9. Update memory benchmark scores + PLAN.md

#### Phase 5 — Reflect
- What was accomplished?
- What should the NEXT iteration focus on?
- Any blockers or decisions needing user input?
- Save insights to memory for continuity

#### Rules
- Always use PR workflow — never push directly to main
- One commit per logical change
- Skip iteration if working tree is dirty from user work
- Save progress to memory after each run
- Don't repeat work from previous iterations — check memory first
- If a brainstormed idea is too large, break into phases and save plan to memory

## Deployment

```bash
# 1. Fill in credentials
cp .env.example .env.local
# Edit .env.local with your Cloudflare credentials

# 2. Set GitHub secrets
./scripts/setup-secrets.sh

# 3. Create D1 database
bunx wrangler d1 create agentstate-db
# Update database_id in packages/api/wrangler.jsonc

# 4. Push to main → auto-deploys via GitHub Actions
git push origin main
```
