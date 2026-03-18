# AgentState

Conversation history database-as-a-service for AI agents.

You're building AI agents — not a conversation database. Stop reinventing storage, analytics, and history management. Just call an API.

Built for vibe coders. No SDK needed — give your coding agent the [API docs](https://agentstate.app/dashboard/docs/) and let it wire things up. Or use the REST API directly with any language, any framework.

## Features

- **Conversation CRUD** — Create, read, update, delete conversations with messages
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

Or use the REST API directly (V2):

```bash
# Create a conversation
curl -X POST https://agentstate.app/api/v2/conversations \
  -H "Authorization: Bearer as_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  }'

# Retrieve it later
curl https://agentstate.app/api/v2/conversations/:id \
  -H "Authorization: Bearer as_live_your_key"
```

**Note**: V1 API is deprecated. See [V2 Migration Guide](https://agentstate.app/dashboard/docs/v2-migration) for details.

## API Endpoints

**V1 (Deprecated — sunset December 31, 2026):**

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
| GET | `/v1/conversations/search` | Full-text search |
| POST | `/v1/conversations/bulk-delete` | Bulk delete |
| POST | `/v1/conversations/export` | Bulk export |
| GET | `/v1/tags` | List project tags |
| POST | `/v1/conversations/:id/tags` | Add tags |
| DELETE | `/v1/conversations/:id/tags/:tag` | Remove tag |

**V2 (Current):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/conversations` | Create conversation |
| GET | `/api/v2/conversations` | List conversations (with total count) |
| GET | `/api/v2/conversations/:id` | Get conversation (messages optional) |
| GET | `/api/v2/conversations/:id?include=messages` | Get with messages |
| PATCH | `/api/v2/conversations/:id` | Update title/metadata |
| DELETE | `/api/v2/conversations/:id` | Delete with messages |
| POST | `/api/v2/conversations/:id/messages` | Append messages |
| GET | `/api/v2/conversations/:id/messages` | List messages |
| POST | `/api/v2/conversations/:id/generate-title` | AI title generation |
| POST | `/api/v2/conversations/:id/follow-ups` | AI follow-up questions |
| GET | `/api/v2/conversations/search` | Full-text search |
| GET | `/api/v2/projects` | List projects (with pagination) |
| GET | `/api/v2/projects/:id` | Get project details |
| POST | `/api/v2/projects` | Create project |
| PATCH | `/api/v2/projects/:id` | Update project |
| DELETE | `/api/v2/projects/:id` | Delete project |
| GET | `/api/v2/keys` | List API keys |
| POST | `/api/v2/keys` | Create API key |
| DELETE | `/api/v2/keys/:id` | Revoke API key |
| GET | `/api/v2/analytics/summary` | Usage summary |
| GET | `/api/v2/analytics/timeseries` | Time series data |
| GET | `/api/v2/analytics/tags` | Tag statistics |
| GET | `/api/v2/organizations` | List organizations |
| POST | `/api/v2/organizations` | Create organization |
| POST | `/v1/projects/:id/domains` | Add custom domain |
| GET | `/v1/projects/:id/domains` | List custom domains |
| DELETE | `/v1/projects/:id/domains/:id` | Remove domain |
| POST | `/v1/projects/:id/domains/:id/verify` | Verify domain ownership |

## Tech Stack

- **Runtime**: Cloudflare Workers (single Worker)
- **Database**: Cloudflare D1 (SQLite at edge)
- **API Framework**: Hono
- **ORM**: Drizzle ORM
- **Dashboard**: Next.js + Clerk + shadcn/ui
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
| [Getting Started](docs/getting-started.md) | Zero to working in 2 minutes |
| [API Reference](docs/api-reference.md) | Complete REST API documentation |
| [V2 Migration Guide](docs/v2-migration.md) | Migrate from V1 to V2 API |
| [TypeScript SDK](docs/sdk.md) | SDK installation, methods, and examples |
| [Python SDK](https://pypi.org/project/agentstate/) | Python package for AgentState |
| [Framework Integration](docs/integration.md) | Vercel AI SDK, Cloudflare Workers AI, LangGraph |
| [Environment Variables](docs/environment-variables.md) | All env vars and Cloudflare bindings |

See [CLAUDE.md](CLAUDE.md) for development guide and conventions.

## License

MIT
