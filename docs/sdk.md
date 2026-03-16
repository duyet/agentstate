# TypeScript SDK

The `@agentstate/sdk` package provides a typed client for the AgentState API. It wraps all REST endpoints in async methods with full TypeScript types.

## Installation

```bash
npm install @agentstate/sdk
# or
bun add @agentstate/sdk
```

## Configuration

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
  baseUrl: "https://agentstate.app/api", // optional, this is the default
});
```

## Runtime Compatibility

The SDK uses the standard `fetch` API with no platform-specific dependencies. It works in:

- Node.js 18+
- Bun
- Deno
- Cloudflare Workers
- Browsers

## Methods Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `createConversation(data)` | `ConversationWithMessages` | Create with optional title, external_id, metadata, messages |
| `getConversation(id)` | `ConversationWithMessages` | Get conversation with all messages |
| `getConversationByExternalId(eid)` | `ConversationWithMessages` | Lookup by your external ID |
| `listConversations(params?)` | `ListResponse<Conversation>` | List with cursor pagination |
| `updateConversation(id, data)` | `Conversation` | Update title and/or metadata |
| `deleteConversation(id)` | `void` | Delete conversation and all messages |
| `appendMessages(id, messages)` | `{ messages: Message[] }` | Append messages to conversation |
| `listMessages(id, params?)` | `ListResponse<Message>` | List messages with pagination |
| `generateTitle(id)` | `{ title: string }` | AI-generated title from message content |
| `generateFollowUps(id)` | `{ questions: string[] }` | AI-generated follow-up questions |
| `exportConversations(ids?)` | `{ data: ConversationWithMessages[], count: number }` | Bulk export (all or by IDs) |

### Parameter Details

**`listConversations(params?)`**

- `limit` — number of results (default: server-defined)
- `cursor` — pagination cursor from a previous response
- `order` — `"asc"` or `"desc"`

**`listMessages(conversationId, params?)`**

- `limit` — number of results
- `after` — message ID cursor for forward pagination

**`createConversation(data)`**

- `external_id` — your own ID for idempotent lookups
- `title` — conversation title
- `metadata` — arbitrary JSON object
- `messages` — initial messages (each with `role`, `content`, optional `metadata` and `token_count`)

## Error Handling

All API errors throw `AgentStateError` with structured fields:

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

try {
  await client.getConversation("nonexistent");
} catch (err) {
  if (err instanceof AgentStateError) {
    console.log(err.code);    // "NOT_FOUND"
    console.log(err.status);  // 404
    console.log(err.message); // "Conversation not found"
  }
}
```

Common error codes:

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `BAD_REQUEST` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 404 | `NOT_FOUND` | Resource does not exist |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

## Usage Examples

### Conversation Lifecycle

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

// Create a conversation with initial messages
const conv = await client.createConversation({
  title: "Support chat",
  metadata: { agent: "helpdesk-v2" },
  messages: [
    { role: "user", content: "How do I reset my password?" },
    { role: "assistant", content: "Go to Settings > Security > Reset Password." },
  ],
});

// Append more messages
await client.appendMessages(conv.id, [
  { role: "user", content: "Thanks, that worked!" },
]);

// Get the full conversation
const full = await client.getConversation(conv.id);
console.log(full.messages.length); // 3

// Update metadata
await client.updateConversation(conv.id, {
  metadata: { agent: "helpdesk-v2", resolved: true },
});

// Delete when done
await client.deleteConversation(conv.id);
```

### Cursor-Based Pagination

```typescript
let cursor: string | undefined;

do {
  const page = await client.listConversations({ limit: 50, cursor });
  for (const conv of page.data) {
    console.log(conv.id, conv.title);
  }
  cursor = page.pagination.next_cursor ?? undefined;
} while (cursor);
```

### External IDs for Idempotent Lookups

```typescript
// Create with your own ID
await client.createConversation({
  external_id: "thread_abc123",
  title: "Slack thread",
});

// Later, look it up by that ID
const conv = await client.getConversationByExternalId("thread_abc123");
```

### AI Features

```typescript
// Generate a title from the conversation content
const { title } = await client.generateTitle(conv.id);
console.log(title); // "Password Reset Help"

// Get follow-up question suggestions
const { questions } = await client.generateFollowUps(conv.id);
console.log(questions);
// ["Would you like to enable two-factor authentication?", ...]
```

### Bulk Export

```typescript
// Export all conversations
const all = await client.exportConversations();
console.log(`Exported ${all.count} conversations`);

// Export specific conversations
const subset = await client.exportConversations(["id1", "id2"]);
```

## SDK Coverage Gaps

The following operations are available through the [REST API](./api-reference.md) but not yet wrapped in the SDK:

- **Search conversations** — `GET /v1/conversations/search`
- **Bulk delete** — `POST /v1/conversations/bulk-delete`
- **Tags management** — all tag endpoints
- **Analytics** — `GET /v1/projects/:id/analytics`

Use the REST API directly for these. See the [API Reference](./api-reference.md) for details.

## Related Docs

- [API Reference](./api-reference.md) — full REST API documentation
- [Integration Guide](./integration.md) — framework-specific examples (LangChain, Vercel AI SDK, etc.)
