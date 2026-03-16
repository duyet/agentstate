# Getting Started

Store and retrieve AI agent conversations with AgentState in under 2 minutes.

## Prerequisites

- **Node.js 18+** or **Bun**
- An **AgentState API key** (see Step 1)

## Step 1: Get an API key

Create a project at [agentstate.app](https://agentstate.app) to get your API key.

You can also create one via the API:

```bash
curl -X POST https://agentstate.app/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project"}'
```

The response includes your API key (format: `as_live_` + 40 characters). Save it -- the full key is only shown once.

## Step 2: Install the SDK

```bash
npm install @agentstate/sdk
# or
bun add @agentstate/sdk
```

Set your API key as an environment variable:

```bash
export AGENTSTATE_API_KEY="as_live_your_api_key_here"
```

## Step 3: Store your first conversation

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const conversation = await client.createConversation({
  title: "My first conversation",
  messages: [
    { role: "user", content: "Hello, world!" },
    { role: "assistant", content: "Hi there! How can I help?" },
  ],
});

console.log(conversation.id); // nanoid, e.g. "V1StGXR8_Z5jdHi6B-myT"
```

## Step 4: Retrieve it

```typescript
const conv = await client.getConversation(conversation.id);

console.log(conv.title);           // "My first conversation"
console.log(conv.messages.length);  // 2
console.log(conv.created_at);       // Unix ms timestamp, e.g. 1710500000000
```

## Step 5: Append messages

```typescript
await client.appendMessages(conversation.id, [
  { role: "user", content: "What can you do?" },
  { role: "assistant", content: "I can help with all sorts of tasks!" },
]);
```

## Step 6: List conversations

```typescript
const result = await client.listConversations();

for (const conv of result.data) {
  console.log(`${conv.id} — ${conv.title} (${conv.message_count} messages)`);
}

// Pagination: use the cursor to fetch the next page
if (result.pagination.next_cursor) {
  const nextPage = await client.listConversations({
    cursor: result.pagination.next_cursor,
  });
}
```

## SDK configuration

```typescript
const client = new AgentState({
  apiKey: "as_live_...",          // Required
  baseUrl: "https://agentstate.app/api", // Optional, this is the default
});
```

## Self-hosting

AgentState can run on your own Cloudflare account:

```bash
git clone https://github.com/duyet/agentstate.git
cd agentstate
bun install
cp .env.example .env.local   # Fill in your Cloudflare credentials
bunx wrangler d1 create agentstate-db
bunx wrangler dev             # Local dev on port 8787
```

See [Environment Variables](./environment-variables.md) for the full list of configuration options.

## Next steps

- [API Reference](./api-reference.md) -- Full endpoint documentation
- [SDK Guide](./sdk.md) -- Advanced SDK usage and error handling
- [Framework Integration](./integration.md) -- Vercel AI SDK, Cloudflare Agents, LangGraph
- [Environment Variables](./environment-variables.md) -- Configuration reference
