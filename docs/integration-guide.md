# Integration Guide

How to integrate AgentState with different types of applications.

For API details see [API Reference](./api-reference.md). For SDK methods see [SDK Guide](./sdk.md).

---

## 1. Quick Start

```bash
npm install @agentstate/sdk
```

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!, // from agentstate.app dashboard
});

// Create a conversation
const conv = await client.createConversation({
  title: "Quick start",
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi! How can I help?" },
  ],
});

// Retrieve it
const loaded = await client.getConversation(conv.id);
console.log(loaded.messages.length); // 2
```

---

## 2. Chat Applications

### Store user/assistant message pairs

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function chat(userId: string, userMessage: string) {
  // Look up an existing session by your own ID
  let convId: string | null = null;
  try {
    const existing = await client.getConversationByExternalId(`session:${userId}`);
    convId = existing.id;
  } catch {
    // First message — create a new conversation
    const conv = await client.createConversation({
      external_id: `session:${userId}`,
      metadata: { user_id: userId },
    });
    convId = conv.id;
  }

  // Call your LLM...
  const assistantReply = await callLLM(userMessage);

  // Persist both messages
  await client.appendMessages(convId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantReply },
  ]);

  return { conversationId: convId, reply: assistantReply };
}
```

### Retrieve conversation history

```typescript
const conv = await client.getConversation(convId);

for (const msg of conv.messages) {
  console.log(`[${msg.role}] ${msg.content}`);
}
```

### Paginate through conversations

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

---

## 3. AI Agent Frameworks

### Vercel AI SDK

Hook into `onFinish` to persist conversations without blocking the stream.

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    onFinish: async ({ text, usage }) => {
      const userMessage = messages[messages.length - 1].content;

      if (!conversationId) {
        const conv = await client.createConversation({
          messages: [
            { role: "user", content: userMessage },
            {
              role: "assistant",
              content: text,
              token_count: usage.promptTokens + usage.completionTokens,
              model: "gpt-4o",
              input_tokens: usage.promptTokens,
              output_tokens: usage.completionTokens,
            },
          ],
        });
        // Store conv.id in client state for subsequent turns
      } else {
        await client.appendMessages(conversationId, [
          { role: "user", content: userMessage },
          { role: "assistant", content: text },
        ]);
      }
    },
  });

  return result.toDataStreamResponse();
}
```

### LangChain / LangGraph (JavaScript)

Use the built-in checkpoint saver to persist LangGraph state.

```typescript
import { AgentState } from "@agentstate/sdk";
import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });
const checkpointer = new AgentStateCheckpointSaver(client);

// Pass to your LangGraph graph
const graph = compileGraph({ checkpointer });

// Each thread_id maps to a separate conversation
const result = await graph.invoke(
  { messages: [{ role: "user", content: "Hello" }] },
  { configurable: { thread_id: "user-42" } },
);
```

### LangChain / LangGraph (Python)

```python
from agentstate import AgentStateClient
from agentstate.langgraph import AgentStateCheckpointSaver

client = AgentStateClient(api_key="as_live_...")
checkpointer = AgentStateCheckpointSaver(client)

graph = compile_graph(checkpointer=checkpointer)
result = graph.invoke(
    {"messages": [{"role": "user", "content": "Hello"}]},
    config={"configurable": {"thread_id": "user-42"}},
)
```

### OpenAI SDK

Wrap chat completion calls to persist every turn.

```typescript
import OpenAI from "openai";
import { AgentState } from "@agentstate/sdk";

const openai = new OpenAI();
const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function tracedChat(convId: string | null, userMessage: string) {
  const t0 = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: userMessage }],
  });

  const assistantText = response.choices[0]?.message?.content ?? "";
  const usage = response.usage;

  if (!convId) {
    const conv = await client.createConversation({
      title: "OpenAI chat",
      messages: [
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content: assistantText,
          model: "gpt-4o",
          input_tokens: usage?.prompt_tokens,
          output_tokens: usage?.completion_tokens,
          token_count: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
        },
      ],
      metadata: { model: "gpt-4o", latency_ms: Date.now() - t0 },
    });
    return { conversationId: conv.id, reply: assistantText };
  }

  await client.appendMessages(convId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantText },
  ]);
  return { conversationId: convId, reply: assistantText };
}
```

### Cloudflare Workers AI

```typescript
import { AgentState } from "@agentstate/sdk";

interface Env {
  AI: Ai;
  AGENTSTATE_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const client = new AgentState({ apiKey: env.AGENTSTATE_API_KEY });
    const { message, conversation_id } = await request.json<{
      message: string;
      conversation_id?: string;
    }>();

    // Load history
    let history: Array<{ role: string; content: string }> = [];
    if (conversation_id) {
      const conv = await client.getConversation(conversation_id);
      history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    }
    history.push({ role: "user", content: message });

    // Generate with Workers AI
    const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: history });

    // Persist
    if (!conversation_id) {
      const conv = await client.createConversation({
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: aiResponse.response },
        ],
      });
      return Response.json({ conversation_id: conv.id, response: aiResponse.response });
    }

    await client.appendMessages(conversation_id, [
      { role: "user", content: message },
      { role: "assistant", content: aiResponse.response },
    ]);
    return Response.json({ conversation_id, response: aiResponse.response });
  },
};
```

---

## 4. LLM Tracing

### What is tracing

AgentState models LLM tracing as a **Trace** containing an **Observation** tree:

- A **Trace** is a conversation that contains at least one observation.
- An **Observation** is a message with an `observation_type` and optional parent reference, forming a tree.
- **Observation types**: `generation`, `tool`, `agent`, `chain`, `span`, `event`.
- Each observation tracks `start_time`, `end_time`, `status`, `level`, token usage, and cost.

```
Trace: "Multi-step agent run"
├── chain (agent pipeline)
│   ├── generation (LLM call — decide which tool)
│   ├── tool (execute web search)
│   └── generation (LLM call — synthesize answer)
```

### Ingest API

Send a complete trace in one request. The `POST /v1/conversations/traces/ingest` endpoint creates the trace and all observations atomically.

```bash
curl -X POST https://agentstate.app/api/v1/conversations/traces/ingest \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "trace": {
      "title": "Research agent run",
      "metadata": { "agent_version": "2.1.0" }
    },
    "observations": [
      {
        "content": "Planning research steps",
        "observation_type": "chain",
        "start_time": 1710500000000,
        "end_time": 1710500005000,
        "status": "success"
      },
      {
        "content": "Which sources should I search?",
        "observation_type": "generation",
        "model": "gpt-4o",
        "parent_message_id": "$1",
        "input_tokens": 150,
        "output_tokens": 45,
        "start_time": 1710500000100,
        "end_time": 1710500002000,
        "status": "success"
      },
      {
        "content": "Searched web for \"climate data 2024\"",
        "observation_type": "tool",
        "parent_message_id": "$1",
        "metadata": { "tool_name": "web_search", "results_count": 5 },
        "start_time": 1710500002100,
        "end_time": 1710500003500,
        "status": "success"
      },
      {
        "content": "Based on my research, here is a summary...",
        "observation_type": "generation",
        "model": "gpt-4o",
        "parent_message_id": "$1",
        "input_tokens": 2000,
        "output_tokens": 500,
        "cost_microdollars": 1500,
        "start_time": 1710500003600,
        "end_time": 1710500004800,
        "status": "success"
      }
    ]
  }'
```

Response (201):

```json
{
  "conversation": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "title": "Research agent run",
    "message_count": 4,
    "token_count": 2695,
    "total_cost_microdollars": 1500
  },
  "observations": [
    { "id": "abc123", "observation_type": "chain", "parent_message_id": null, ... },
    { "id": "def456", "observation_type": "generation", "parent_message_id": "abc123", ... },
    { "id": "ghi789", "observation_type": "tool", "parent_message_id": "abc123", ... },
    { "id": "jkl012", "observation_type": "generation", "parent_message_id": "abc123", ... }
  ]
}
```

### Parent references with `$N` syntax

Within a single ingest request, use `"$N"` to reference the Nth observation (1-indexed). The server resolves these to real IDs before persisting. This lets you send an entire tree in one request without knowing IDs in advance.

```json
{
  "observations": [
    { "content": "Root", "observation_type": "chain" },
    { "content": "Child of root", "observation_type": "generation", "parent_message_id": "$1" },
    { "content": "Also child of root", "observation_type": "tool", "parent_message_id": "$1" }
  ]
}
```

### Observation types

| Type | Use for |
|------|---------|
| `generation` | An LLM call (prompt in, completion out) |
| `tool` | A tool/function execution |
| `agent` | A sub-agent invocation |
| `chain` | A grouping of related steps |
| `span` | A timed unit of work |
| `event` | A point-in-time event (no duration) |

### Observation fields

| Field | Type | Description |
|-------|------|-------------|
| `content` | string (required) | Description or content of the observation |
| `observation_type` | string (required) | One of: `generation`, `tool`, `agent`, `chain`, `span`, `event` |
| `parent_message_id` | string | Parent observation ID or `$N` reference |
| `role` | string | Message role (default: `"assistant"`) |
| `model` | string | Model name for `generation` types |
| `input_tokens` | integer | Tokens sent to the model |
| `output_tokens` | integer | Tokens received from the model |
| `token_count` | integer | Total tokens (auto-summed if omitted) |
| `cost_microdollars` | integer | Cost in microdollars (1 USD = 1,000,000) |
| `start_time` | integer | Unix ms when the observation started |
| `end_time` | integer | Unix ms when the observation ended |
| `status` | string | `"success"` or `"error"` |
| `level` | string | `"debug"`, `"default"`, `"warning"`, or `"error"` |
| `metadata` | object | Arbitrary JSON |

### List and retrieve traces

```bash
# List traces (cursor-based pagination)
curl "https://agentstate.app/api/v1/conversations/traces?limit=20&order=desc" \
  -H "Authorization: Bearer as_live_..."

# Get a trace with its observation tree
curl "https://agentstate.app/api/v1/conversations/traces/V1StGXR8_Z5jdHi6B-myT" \
  -H "Authorization: Bearer as_live_..."
```

The `GET /traces/:id` response includes a nested `observations` tree:

```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "title": "Research agent run",
  "observations": [
    {
      "id": "abc123",
      "observation_type": "chain",
      "content": "Planning research steps",
      "children": [
        { "id": "def456", "observation_type": "generation", "children": [] },
        { "id": "ghi789", "observation_type": "tool", "children": [] },
        { "id": "jkl012", "observation_type": "generation", "children": [] }
      ]
    }
  ]
}
```

### Example: trace a multi-step agent with fetch

The SDK does not yet wrap trace endpoints. Use `fetch` directly:

```typescript
const API_BASE = "https://agentstate.app/api";
const API_KEY = process.env.AGENTSTATE_API_KEY!;

async function ingestTrace(trace: object) {
  const res = await fetch(`${API_BASE}/v1/conversations/traces/ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trace),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}

// Trace a full agent run
async function runAgent(userQuery: string) {
  const t0 = Date.now();

  // Step 1: LLM decides what to do
  const plan = await callLLM(`Plan steps for: ${userQuery}`);
  const t1 = Date.now();

  // Step 2: Execute a tool
  const toolResult = await executeTool("web_search", { query: userQuery });
  const t2 = Date.now();

  // Step 3: LLM synthesizes the answer
  const answer = await callLLM(`Based on: ${toolResult}, answer: ${userQuery}`);
  const t3 = Date.now();

  // Send the whole trace
  const result = await ingestTrace({
    trace: { title: userQuery, metadata: { agent: "research-v1" } },
    observations: [
      {
        content: "Full agent pipeline",
        observation_type: "chain",
        start_time: t0,
        end_time: t3,
        status: "success",
      },
      {
        content: plan,
        observation_type: "generation",
        model: "gpt-4o",
        parent_message_id: "$1",
        start_time: t0,
        end_time: t1,
        status: "success",
      },
      {
        content: `web_search: ${JSON.stringify({ query: userQuery })}`,
        observation_type: "tool",
        parent_message_id: "$1",
        metadata: { tool_name: "web_search" },
        start_time: t1,
        end_time: t2,
        status: "success",
      },
      {
        content: answer,
        observation_type: "generation",
        model: "gpt-4o",
        parent_message_id: "$1",
        start_time: t2,
        end_time: t3,
        status: "success",
      },
    ],
  });

  console.log("Trace ID:", result.conversation.id);
  return answer;
}
```

---

## 5. Multi-tenant SaaS

### Project-based isolation

Each API key is scoped to a project. Create a project per tenant:

```bash
# Create a project
curl -X POST https://agentstate.app/api/v1/projects \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme-corp"}'
```

### API key per project

```bash
# Create an API key for the project
curl -X POST https://agentstate.app/api/v1/projects/{project_id}/keys \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "acme-production"}'
```

The response returns the full key once. Distribute one key per tenant — all data is automatically isolated.

### External ID linking

Use `external_id` to map your own identifiers to AgentState conversations:

```typescript
// Create with your tenant's ID
const conv = await client.createConversation({
  external_id: `tenant:${tenantId}:thread:${threadId}`,
  metadata: { tenant_id: tenantId, thread_id: threadId },
});

// Look up later
const existing = await client.getConversationByExternalId(
  `tenant:${tenantId}:thread:${threadId}`,
);
```

---

## 6. REST API Reference

Base URL: `https://agentstate.app/api/v1`
Auth: `Authorization: Bearer as_live_...`

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations` | Create conversation |
| GET | `/conversations` | List conversations |
| GET | `/conversations/:id` | Get conversation with messages |
| GET | `/conversations/by-external-id/:eid` | Lookup by external ID |
| PUT | `/conversations/:id` | Update title/metadata |
| DELETE | `/conversations/:id` | Delete conversation |
| POST | `/conversations/:id/messages` | Append messages |
| GET | `/conversations/:id/messages` | List messages (paginated) |
| GET | `/conversations/search?q=term` | Full-text search |
| POST | `/conversations/bulk-delete` | Delete multiple (`{ids: [...]}`) |
| POST | `/conversations/export` | Bulk export |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations/:id/generate-title` | AI-generated title |
| POST | `/conversations/:id/follow-ups` | AI follow-up questions |

### Tracing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations/traces/ingest` | Ingest trace with observations |
| GET | `/conversations/traces` | List traces |
| GET | `/conversations/traces/:id` | Get trace with observation tree |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List all tags |
| POST | `/conversations/:id/tags` | Add tags (`{tags: [...]}`) |
| DELETE | `/conversations/:id/tags/:tag` | Remove a tag |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create project |
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Get project with keys |
| GET | `/projects/by-slug/:slug` | Lookup by slug |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/keys` | Create API key |
| GET | `/projects/:id/keys` | List keys |
| DELETE | `/projects/:id/keys/:key_id` | Revoke key |
| GET | `/projects/:id/analytics` | Project analytics |
| GET | `/projects/:id/conversations` | Project conversations |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:id/webhooks` | Create webhook |
| GET | `/projects/:id/webhooks` | List webhooks |
| PATCH | `/projects/:id/webhooks/:id` | Update webhook |
| DELETE | `/projects/:id/webhooks/:id` | Delete webhook |

### State (V2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/states/:key` | Upsert state |
| GET | `/states/:key` | Read state |
| POST | `/states/query` | Query states |
| DELETE | `/states/:key` | Delete state |
| GET | `/states/:key/events` | List state events |
| POST | `/states/:key/lease` | Create lease |
| POST | `/leases/:id/renew` | Renew lease |
| DELETE | `/leases/:id` | Release lease |

### Capability Tokens

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/capability-tokens` | Create token |
| GET | `/capability-tokens` | List tokens |
| DELETE | `/capability-tokens/:id` | Revoke token |

### Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/claims` | Create claim |
| GET | `/claims` | List claims |
| GET | `/claims/:id` | Get claim |
| POST | `/claims/:id/verify` | Verify claim |

---

## Related Docs

- [Getting Started](./getting-started.md) -- Zero to working in 2 minutes
- [API Reference](./api-reference.md) -- Full endpoint documentation
- [TypeScript SDK](./sdk.md) -- SDK methods and error handling
- [V2 Migration](./v2-migration.md) -- Migrate from V1 to V2 API
