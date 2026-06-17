# AgentState SDK Examples

Examples demonstrating how to use the @agentstate/sdk package.

## Installation

```bash
npm install @agentstate/sdk
```

Or use with Bun:

```bash
bun add @agentstate/sdk
```

## Examples

### 1. Basic Conversation Management

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
  baseUrl: "https://agentstate.app/api",
});

// Create a conversation with initial messages
const conv = await client.createConversation({
  title: "Support chat",
  messages: [
    { role: "user", content: "Help with my account" },
    { role: "assistant", content: "I'd be happy to help! What seems to be the issue?" },
  ],
});

console.log(`Created conversation: ${conv.id}`);
```

### 2. Append Messages

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const conv = await client.createConversation({
  title: "Chat session",
  messages: [{ role: "user", content: "Hello" }],
});

// Append more messages to the conversation
const { messages } = await client.appendMessages(conv.id, [
  { role: "assistant", content: "Hi there! How can I help?" },
  { role: "user", content: "Tell me about AgentState" },
]);

console.log(`Appended ${messages.length} messages`);
```

### 3. AI-Powered Title and Follow-Up Generation

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const conv = await client.createConversation({
  messages: [
    { role: "user", content: "How do I set up CORS in my API?" },
    { role: "assistant", content: "Here's how to configure CORS..." },
  ],
});

// AI-generated title from message content
const { title } = await client.generateTitle(conv.id);
console.log(`AI title: ${title}`);

// AI-generated follow-up questions
const { questions } = await client.generateFollowUps(conv.id);
console.log("Follow-ups:", questions);
```

### 4. Cursor-Based Pagination

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

// List conversations with cursor-based pagination
let cursor: string | undefined;

do {
  const page = await client.listConversations({
    limit: 50,
    cursor,
  });

  for (const conv of page.data) {
    console.log(`${conv.id}: ${conv.title ?? "Untitled"}`);
  }

  cursor = page.pagination.next_cursor ?? undefined;
} while (cursor);
```

### 5. List Messages

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const conv = await client.createConversation({
  messages: [{ role: "user", content: "First message" }],
});

// List messages with pagination
const { data: msgs, pagination } = await client.listMessages(conv.id, { limit: 20 });
console.log(`${msgs.length} messages, next_cursor: ${pagination.next_cursor}`);
```

### 6. Update and Delete

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const conv = await client.createConversation({ title: "Draft" });

// Update title and metadata
const updated = await client.updateConversation(conv.id, {
  title: "Final title",
  metadata: { reviewed: true },
});

console.log(`Updated: ${updated.title}`);

// Delete the conversation
await client.deleteConversation(conv.id);
console.log("Deleted");
```

### 7. Export Conversations

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

// Export all conversations with their messages
const { data, count } = await client.exportConversations();
console.log(`Exported ${count} conversations`);

// Or export a specific subset
const conv = await client.createConversation({
  messages: [{ role: "user", content: "Export me" }],
});
const subset = await client.exportConversations([conv.id]);
console.log(`Subset export: ${subset.count}`);
```

### 8. Look Up by External ID

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

// Create with an external ID from your own system
await client.createConversation({
  external_id: "session-abc123",
  messages: [{ role: "user", content: "Hi" }],
});

// Retrieve later by that external ID
const conv = await client.getConversationByExternalId("session-abc123");
console.log(`Found: ${conv.id}`);
```

### 9. State Management

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

// Create or replace a state record
const state = await client.upsertState("user:123:preferences", {
  agent_id: "api-server",
  data: {
    theme: "dark",
    notifications: true,
    language: "en",
  },
  metadata: {
    user_id: "123",
    app_version: "1.0.0",
  },
  tags: ["user-prefs", "production"],
});

console.log(`State updated: ${state.state_key}`);

// Query states by tag
const results = await client.queryStates({
  agent_id: "api-server",
  tags: ["user-prefs"],
});

console.log(`Found ${results.data.length} matching states`);
```

## Error Handling

```typescript
import { AgentState, AgentStateError } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

try {
  await client.getConversation("non-existent-id");
} catch (err) {
  if (err instanceof AgentStateError) {
    console.error(`Error code: ${err.code}`);
    console.error(`Status: ${err.status}`);
    console.error(`Message: ${err.message}`);
  }
}
```

## Testing

Run the examples:

```bash
# Using Node.js 18+
node examples/sdk-examples/basic-conversation.ts

# Using Bun
bun run examples/sdk-examples/basic-conversation.ts
```

## API Reference

For full API documentation, see [docs/sdk.md](../docs/sdk.md).
