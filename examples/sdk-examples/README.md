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
console.log(`URL: https://agentstate.app/d/${conv.id}`);
```

### 2. AI-Powered Title Generation

```typescript
// After the conversation has some messages
const { title } = await client.generateTitle(conv.id);
console.log(`AI-generated title: ${title}`);
```

### 3. Cursor-Based Pagination

```typescript
// List conversations with pagination
let cursor: string | undefined;

do {
  const page = await client.listConversations({
    limit: 50,
    cursor,
  });

  for (const conv of page.data) {
    console.log(`${conv.id}: ${conv.title || 'Untitled'}`);
  }

  cursor = page.pagination.next_cursor ?? undefined;
} while (cursor);
```

### 4. State Management

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

// Create/replace a state record
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

// Query states
const results = await client.queryStates({
  agent_id: "api-server",
  tags: ["user-prefs"],
});

console.log(`Found ${results.data.length} matching states`);
```

### 5. LangGraph Integration

```typescript
import { AgentStateScraper } from "@agentstate/sdk/langgraph";
import { z } from "zod";

// Create a checkpoint saver using AgentState
const saver = new AgentStateScraper({
  apiKey: process.env.AGENTSTATE_API_KEY!,
  agentId: "langgraph-agent",
});

// Use in LangGraph app
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph({ channels: { messages: z.string() } })
  .addNode("agent", async (state) => {
    // Your agent logic here
    return { messages: state.messages + " processed" };
  })
  .compile({ checkpointer: saver });
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
node examples/basic-conversation.ts

# Using Bun
bun run examples/basic-conversation.ts
```

## API Reference

For full API documentation, see [docs/sdk.md](../docs/sdk.md).

## Contributing

Contributions welcome! Please submit a pull request.