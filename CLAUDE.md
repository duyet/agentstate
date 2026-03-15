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

When running autonomously (via `/loop` or cron), pick ONE action per iteration:

1. **Lint** — `bunx biome check packages/api/src/` and auto-fix
2. **Test** — `cd packages/api && bunx vitest run` — fix any failures
3. **Typecheck** — `bunx tsc --noEmit -p packages/api/tsconfig.json`
4. **CI check** — `gh run list --repo duyet/agentstate --workflow CI --limit 1` — investigate failures
5. **Deploy verify** — `curl -s https://agentstate.app/api` — confirm live
6. **Code review** — read a source file, check for bugs/security/quality issues
7. **Refactor** — extract duplicated patterns, simplify complex functions
8. **UI polish** — review dashboard pages for UX issues, fix spacing/alignment
9. **Test coverage** — add tests for untested endpoints or edge cases
10. **Dependency update** — check for outdated/vulnerable deps
11. **Docs sync** — ensure CLAUDE.md, README, agents.md match actual code
12. **Plan next** — create tasks for upcoming features (Clerk org management, SDK packages, etc.)

Rules:
- Always commit + push after making changes
- Run lint + typecheck before committing
- Build dashboard before deploying: `cd packages/dashboard && bun run build`
- Deploy: `cd packages/api && bunx wrangler deploy`
- Never skip tests
- One focused action per iteration, not everything at once

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
