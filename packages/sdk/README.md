# @agentstate/sdk

TypeScript SDK for AgentState — conversation history database-as-a-service for AI agents.

## Installation

```bash
npm install @agentstate/sdk
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
