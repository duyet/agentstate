# AgentState

Conversation history database-as-a-service for AI agents.

Store, retrieve, and manage AI conversations via a simple REST API. Works with any AI framework — Vercel AI SDK, LangGraph, Cloudflare Agents SDK, and more.

## Features

- **Conversation CRUD** — Create, read, update, delete conversations with messages
- **API Key Auth** — SHA-256 hashed keys with project scoping
- **AI-Powered** — Auto-generate titles and follow-up questions
- **Cursor Pagination** — Efficient, stable pagination for large datasets
- **Bulk Export** — Export conversations with messages in one call
- **External ID Lookup** — Map your own IDs to AgentState conversations
- **Request Tracing** — X-Request-Id header on every response

## Quick Start

```bash
# Create a conversation
curl -X POST https://agentstate.app/api/v1/conversations \
  -H "Authorization: Bearer as_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  }'

# Retrieve it later
curl https://agentstate.app/api/v1/conversations/:id \
  -H "Authorization: Bearer as_live_your_key"
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/conversations` | Create conversation |
| GET | `/v1/conversations` | List conversations |
| GET | `/v1/conversations/:id` | Get with messages |
| GET | `/v1/conversations/by-external-id/:eid` | Lookup by your ID |
| PUT | `/v1/conversations/:id` | Update title/metadata |
| DELETE | `/v1/conversations/:id` | Delete with messages |
| POST | `/v1/conversations/:id/messages` | Append messages |
| GET | `/v1/conversations/:id/messages` | List messages |
| POST | `/v1/conversations/:id/generate-title` | AI title generation |
| POST | `/v1/conversations/:id/follow-ups` | AI follow-up questions |
| POST | `/v1/conversations/export` | Bulk export |

## Tech Stack

- **Runtime**: Cloudflare Workers (single Worker)
- **Database**: Cloudflare D1 (SQLite at edge)
- **API Framework**: Hono
- **ORM**: Drizzle ORM
- **Dashboard**: Next.js + Clerk + shadcn/ui
- **Package Manager**: Bun
- **Linter**: Biome
- **Tests**: Vitest (42 tests)

## Development

```bash
bun install

# API (port 8787)
cd packages/api && bunx wrangler dev

# Dashboard (port 3000, separate dev server)
cd packages/dashboard && bun run dev
```

See [CLAUDE.md](CLAUDE.md) for full dev commands and conventions.

## Docs

- [Integration Guide](docs/integration.md) — API reference + framework examples
- [CLAUDE.md](CLAUDE.md) — Development guide

## License

MIT
