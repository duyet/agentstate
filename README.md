# AgentState

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Open source (MIT), self-host anytime, free to start — no credit card.

State and coordination layer for AI agent fleets.

You're building AI agents — not a distributed systems backend. Stop reinventing state management, locking, delegation, and history storage. Just call an API.

AgentState gives agent fleets five primitives — everything needed to coordinate work, track decisions, and share state across many concurrent agents.

Built for vibe coders. No SDK needed — give your coding agent the [API docs](https://agentstate.app/dashboard/docs/) and let it wire things up. Or use the REST API directly with any language, any framework.

## Features

### Five primitives

- **States** — Versioned key/value state with an append-only event log; query across all agents in a fleet
- **Leases** — Distributed locks for exactly-one-writer coordination across N concurrent agents ([recipe](docs/recipes/leases.md))
- **Claims** — Verifiable assertions with attached evidence you can audit later ([recipe](docs/recipes/claims.md))
- **Capability Tokens** — Scoped, revocable delegation so sub-agents get only the access they need ([recipe](docs/recipes/capability-tokens.md))
- **Conversations** — Full message history with CRUD, search, tags, bulk export, and AI-generated titles

### Supporting capabilities

- **API Key Auth** — SHA-256 hashed keys with project scoping
- **AI-Powered** — Auto-generate titles and follow-up questions
- **Cursor Pagination** — Efficient, stable pagination for large datasets
- **Bulk Export** — Export conversations with messages in one call
- **External ID Lookup** — Map your own IDs to AgentState conversations
- **Full-Text Search** — Search across message content with snippets
- **Tags** — Organize conversations with tags and filter by tag
- **Bulk Operations** — Bulk delete and export conversations
- **Request Tracing** — X-Request-Id header on every response

## Quick Start

```bash
npm install @agentstate/sdk
```

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: "as_live_..." });
const conv = await client.createConversation({
  messages: [{ role: "user", content: "Hello" }],
});
```

Or use the REST API directly:

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

All endpoints are served under `/api/v1/`. See the [API Reference](docs/api-reference.md) for full details.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/conversations` | Create conversation |
| GET | `/api/v1/conversations` | List conversations (cursor pagination) |
| GET | `/api/v1/conversations/:id` | Get conversation (messages optional) |
| GET | `/api/v1/conversations/:id?include=messages` | Get with messages |
| PATCH | `/api/v1/conversations/:id` | Update title/metadata |
| DELETE | `/api/v1/conversations/:id` | Delete with messages |
| POST | `/api/v1/conversations/:id/messages` | Append messages |
| GET | `/api/v1/conversations/:id/messages` | List messages |
| POST | `/api/v1/conversations/:id/generate-title` | AI title generation |
| POST | `/api/v1/conversations/:id/follow-ups` | AI follow-up questions |
| GET | `/api/v1/conversations/search` | Full-text search |
| POST | `/api/v1/conversations/export` | Bulk export with messages |
| GET | `/api/v1/tags` | List project tags |
| POST | `/api/v1/conversations/:id/tags` | Add tags |
| DELETE | `/api/v1/conversations/:id/tags/:tag` | Remove tag |
| GET | `/api/v1/analytics/summary` | Usage summary |
| GET | `/api/v1/analytics/timeseries` | Time series data |
| GET | `/api/v1/analytics/tags` | Tag statistics |
| PUT | `/api/v1/states/:stateKey` | Create or replace state |
| GET | `/api/v1/states/:stateKey` | Read state |
| POST | `/api/v1/states/query` | Query states |
| DELETE | `/api/v1/states/:stateKey` | Delete state |
| GET | `/api/v1/states/:stateKey/events` | List state events |
| POST | `/api/v1/states/:stateKey/lease` | Create lease |
| POST | `/api/v1/leases/:id/renew` | Renew lease |
| DELETE | `/api/v1/leases/:id` | Release lease |
| POST | `/api/v1/capability-tokens` | Create capability token |
| GET | `/api/v1/capability-tokens` | List capability tokens |
| DELETE | `/api/v1/capability-tokens/:id` | Revoke capability token |
| POST | `/api/v1/claims` | Create claim |
| GET | `/api/v1/claims` | List claims |
| GET | `/api/v1/claims/:id` | Get claim with evidence |
| POST | `/api/v1/claims/:id/verify` | Verify claim |

## Tech Stack

- **Runtime**: Cloudflare Workers (single Worker)
- **Database**: Cloudflare D1 (SQLite at edge)
- **API Framework**: Hono
- **ORM**: Drizzle ORM
- **Dashboard**: Astro + React islands + Clerk + Tailwind v4
- **Package Manager**: Bun
- **Linter**: Biome
- **Tests**: Vitest (276 tests)

## Development

```bash
bun install

# API (port 8787)
cd packages/api && bunx wrangler dev

# Dashboard (port 3000, separate dev server)
cd packages/dashboard && bun run dev
```

See [CLAUDE.md](CLAUDE.md) for full dev commands and conventions.

## Documentation

| Guide | Description |
|-------|-------------|
| [Documentation Index](docs/INDEX.md) | Complete docs index |
| [Getting Started](docs/getting-started.md) | Zero to working in 2 minutes |
| [API Reference](docs/api-reference.md) | Complete REST API documentation |
| [V2 Migration Guide](docs/v2-migration.md) | Migrate from V1 to V2 API |
| [TypeScript SDK](docs/sdk.md) | SDK installation, methods, and examples |
| [Python SDK](https://pypi.org/project/agentstate/) | Python package for AgentState |
| [Framework Integration](docs/integration.md) | Vercel AI SDK, Cloudflare Workers AI, LangGraph |
| [Environment Variables](docs/environment-variables.md) | All env vars and Cloudflare bindings |
| [Core Memory](docs/knowledge/core-memory.md) | Durable maintenance notes for future agents |
| [Roadmap](ROADMAP.md) | What's shipped, what's next, and how to influence direction |
| [Contributing](CONTRIBUTING.md) | How to contribute, branch conventions, and PR template |

See [CLAUDE.md](CLAUDE.md) for development guide and conventions.

## License

MIT
