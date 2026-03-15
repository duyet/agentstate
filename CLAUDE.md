# AgentState

Conversation history database-as-a-service for AI agents.

## Project Structure

```
packages/
  api/          Hono API on Cloudflare Workers + D1
  shared/       Shared TypeScript types (public API contract)
  dashboard/    Next.js + Clerk + shadcn/ui (future)
docs/           Integration guides
scripts/        Setup and deployment scripts
```

## Dev Commands

```bash
# Install
bun install

# Local dev (API)
cd packages/api
bunx wrangler dev

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
- **Auth (Dashboard)**: Clerk (orgs, users, JWT)
- **AI**: Workers AI for title generation and follow-up questions

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
