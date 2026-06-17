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
| `upsertState(stateKey, data, options?)` | `StateRecord` | Create/replace `/v1/states/{state_key}` |
| `getState(stateKey, params?)` | `StateRecord` | Read latest or historical state |
| `queryStates(query?)` | `StateListResponse<StateRecord>` | Query states with tags/filters |
| `deleteState(stateKey, params?)` | `{ deleted: true; event: StateEvent }` | Delete state |
| `listStateEvents(stateKey, params?, options?)` | `StateListResponse<StateEvent>` | Read state event stream |
| `createStateLease(stateKey, data)` | `StateLease` | Create state lease |
| `renewStateLease(id, data, options?)` | `StateLease` | Renew lease with `ttl_ms` |
| `releaseStateLease(id, options?)` | `void` | Release lease |
| `createCapabilityToken(data)` | `CapabilityTokenCreated` | Create capability token |
| `listCapabilityTokens()` | `CapabilityTokenListResponse` | List tokens |
| `revokeCapabilityToken(id)` | `void` | Revoke token |
| `createClaim(data)` | `Claim` | Create a verifiable claim |
| `listClaims(params?)` | `StateListResponse<Claim>` | List claims |
| `getClaim(id)` | `Claim` | Get claim with evidence |
| `verifyClaim(id)` | `ClaimVerificationRun` | Run deterministic verification |

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

## Python SDK

Install the Python package:

```bash
pip install agentstate
```

The Python SDK (`AgentStateClient`) has feature parity with the TypeScript SDK. All method names follow Python's `snake_case` convention:

| Python method | TS equivalent |
|---------------|---------------|
| `create_conversation(messages, external_id?, metadata?)` | `createConversation` |
| `get_conversation(conversation_id)` | `getConversation` |
| `list_conversations(limit?, cursor?)` | `listConversations` |
| `upsert_state(state_key, state, idempotency_key?)` | `upsertState` |
| `get_state(state_key, at_sequence?, at_time?)` | `getState` |
| `query_states(query?)` | `queryStates` |
| `delete_state(state_key, lease_id?, idempotency_key?)` | `deleteState` |
| `list_state_events(state_key, after?, limit?)` | `listStateEvents` |

State endpoints are served under `/v1/states/` (same base path as the TS SDK).

```python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

# Create a conversation
conv = client.create_conversation(
    messages=[{"role": "user", "content": "Hello!"}],
    metadata={"agent": "my-bot"},
)

# Store agent state
client.upsert_state(
    "my-agent/session-1",
    {"agent_id": "my-agent", "data": {"step": "planning"}},
)
```

See [Framework Integration](./integration.md) for a LangGraph Python example.

## SDK Coverage Gaps

The following operations are available through the [REST API](./api-reference.md) but not yet wrapped in the TypeScript SDK:

- **Search conversations** — `GET /v1/conversations/search`
- **Bulk delete** — `POST /v1/conversations/bulk-delete`
- **Tags management** — all tag endpoints
- **Analytics** — `GET /v1/projects/:id/analytics`
- **Conversation analytics** — `GET /v1/conversations/:id/analytics`
- **Public analytics summary** — `GET /v1/analytics/summary`
- **Public analytics timeseries** — `GET /v1/analytics/timeseries`
- **Public analytics tags** — `GET /v1/analytics/tags`

The following state-framework adapters are available in subpaths:

- `@agentstate/sdk/ai-sdk` — `createAISDKChatStore`, `createAISDKRSCStateStore`
- `@agentstate/sdk/langgraph` — `AgentStateCheckpointSaver`

Use the REST API directly for these. See the [API Reference](./api-reference.md) for details.

## Related Docs

- [API Reference](./api-reference.md) — full REST API documentation
- [Integration Guide](./integration.md) — framework-specific examples (LangChain, Vercel AI SDK, etc.)
