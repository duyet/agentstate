# @agentstate/sdk

TypeScript SDK for AgentState — conversation history database-as-a-service for AI agents.

## Installation

```bash
npm install @agentstate/sdk
```

Install optional LangGraph support when using the checkpoint adapter:

```bash
npm install @agentstate/sdk @langchain/langgraph-checkpoint
```

## Quick Start

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

// Store a conversation
const conv = await client.createConversation({
  messages: [
    { role: "user", content: "What is AgentState?" },
    { role: "assistant", content: "A conversation history database for AI agents." },
  ],
});

// Retrieve it later
const saved = await client.getConversation(conv.id);
console.log(saved.messages);
```

## Available Methods

### Conversations

- `createConversation(data)` — Create a conversation with optional messages, title, and metadata
- `getConversation(id)` — Get a conversation with all its messages
- `getConversationByExternalId(externalId)` — Look up a conversation by your own external ID
- `listConversations(params?)` — List conversations with cursor-based pagination
- `updateConversation(id, data)` — Update title or metadata
- `deleteConversation(id)` — Delete a conversation

### Messages

- `appendMessages(conversationId, messages)` — Append messages to an existing conversation
- `listMessages(conversationId, params?)` — List messages with pagination

### AI Features

- `generateTitle(conversationId)` — Auto-generate a title from conversation content
- `generateFollowUps(conversationId)` — Generate follow-up questions

### Export

- `exportConversations(ids?)` — Export all or selected conversations with messages

### State Platform

These helpers target `/v2/states`:

- `upsertState(stateKey, data, options?)` — Create or replace state for a key
- `getState(stateKey, params?)` — Read latest or historical state
- `queryStates(query?)` — Query by agent, tags, timestamps, JSON path, or cursor
- `deleteState(stateKey, params?)` — Delete state with optional lease and idempotency
- `listStateEvents(stateKey, params?, options?)` — Read event history or watch with a capability token
- `createStateLease(stateKey, data)` / `renewStateLease(id, data, options?)` / `releaseStateLease(id, options?)` — Manage write leases
- `createCapabilityToken(data)` / `listCapabilityTokens()` / `revokeCapabilityToken(id)` — Manage scoped state tokens
- `createClaim(data)` / `listClaims(params?)` / `getClaim(id)` / `verifyClaim(id)` — Create and verify deterministic claims

```typescript
const state = await client.upsertState("assistant/session-123", {
  agent_id: "assistant",
  data: { step: "collecting_requirements" },
  tags: ["session"],
}, {
  idempotencyKey: "session-123-step-1",
});

const capability = await client.createCapabilityToken({
  name: "session watcher",
  state_key: state.state_key,
  scopes: ["state:watch", "lease:write"],
  expires_at: Date.now() + 60 * 60 * 1000,
});

const events = await client.listStateEvents(state.state_key, { after: 0 }, {
  capabilityToken: capability.token,
});

const claim = await client.createClaim({
  subject_type: "state",
  subject_id: state.state_key,
  statement: "Session reached planning step",
  evidence: [{
    kind: "json_value",
    source: state.state_key,
    data: events.data.at(-1)?.data ?? {},
    json_path: "$.step",
    expected_value: "planning",
  }],
});

await client.verifyClaim(claim.id);
```

## AI SDK and LangGraph state adapters

### `@agentstate/sdk/ai-sdk`

```ts
import {
  createAISDKChatStore,
  createAISDKRSCStateStore,
} from "@agentstate/sdk/ai-sdk";

const chatStore = createAISDKChatStore(client, {
  stateKeyPrefix: "agentstate/ai-sdk/chat",
});

const rscStore = createAISDKRSCStateStore(client, {
  stateKey: "thread-1",
});
```

### `@agentstate/sdk/langgraph`

```ts
import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";

const saver = new AgentStateCheckpointSaver(client);
await saver.put(
  { configurable: { thread_id: "thread-1", checkpoint_ns: "" } },
  { id: "cp-1" },
  {},
  {},
);
```

See [agentstate LangGraph runtime docs](../../docs/integration.md) for example usage.

## Error Handling

All API errors throw an `AgentStateError` with `code`, `status`, and `message` fields:

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

try {
  await client.getConversation("nonexistent-id");
} catch (err) {
  if (err instanceof AgentStateError) {
    console.error(err.code);    // e.g. "NOT_FOUND"
    console.error(err.status);  // e.g. 404
    console.error(err.message); // Human-readable message
  }
}
```

## Documentation

- [SDK Guide](../../docs/sdk.md)
- [API Reference](../../docs/api-reference.md)
- [Integration Guide](../../docs/integration.md)

## License

MIT
