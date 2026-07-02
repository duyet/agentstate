# Integration Guide

How to integrate AgentState with different types of applications and popular AI frameworks.

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

### Vercel AI SDK (streaming)

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

### Vercel AI SDK (non-streaming)

Use `generateText` when you don't need to stream tokens to the client.

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function chat(conversationId: string | null, userMessage: string) {
  // Load existing conversation or start fresh
  let messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
  if (conversationId) {
    const conv = await client.getConversation(conversationId);
    messages = conv.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));
  }
  messages.push({ role: "user", content: userMessage });

  const result = await generateText({ model: openai("gpt-4o"), messages });

  // Persist to AgentState
  if (!conversationId) {
    const conv = await client.createConversation({
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: result.text },
      ],
    });
    return { conversationId: conv.id, response: result.text };
  }

  await client.appendMessages(conversationId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: result.text },
  ]);
  return { conversationId, response: result.text };
}
```

### AI SDK UI chat store

Persist full `UIMessage[]` payloads directly in AgentState V2 state.

```typescript
import { AgentState } from "@agentstate/sdk";
import { createAISDKChatStore } from "@agentstate/sdk/ai-sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

const chatStore = createAISDKChatStore(client, {
  stateKeyPrefix: "agentstate/ai-sdk/chat",
});

const chatId = await chatStore.createChat();
await chatStore.saveChat({
  chatId,
  messages: [{ id: "m1", role: "user", content: "Hi there" }],
});
```

### AI SDK RSC state store

Use `@agentstate/sdk/ai-sdk` in Vercel AI RSC flows to persist full UI state and UI messages as V2 state payloads.

```typescript
import { createAISDKRSCStateStore } from "@agentstate/sdk/ai-sdk";
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

const rscStore = createAISDKRSCStateStore(client, {
  stateKeyPrefix: "agentstate/ai-sdk/rsc",
  stateKey: "thread-1",
  mapAIStateToUIMessages: (state) => {
    if (!state) return [];
    const lastAiMessage = state?.lastMessage;
    return lastAiMessage
      ? [{ id: "state-msg", role: "assistant", content: String(lastAiMessage) }]
      : [];
  },
});

export const saveAIState = async () => {
  await rscStore.onSetAIState({
    state: { step: "next" },
    done: true,
  });
};
```

### LangChain (JavaScript)

LangChain itself has no checkpointer, so persist each turn manually: load history from
AgentState, run the model, then append the new messages. (For LangGraph, use the built-in
checkpoint saver shown below instead.)

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState } from "@agentstate/sdk";

const model = new ChatOpenAI({ model: "gpt-4o" });
const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function chat(conversationId: string | null, userMessage: string) {
  // Rebuild LangChain message objects from stored history
  const history: Array<HumanMessage | AIMessage | SystemMessage> = [];
  if (conversationId) {
    const conv = await client.getConversation(conversationId);
    for (const m of conv.messages) {
      if (m.role === "user") history.push(new HumanMessage(m.content));
      else if (m.role === "assistant") history.push(new AIMessage(m.content));
      else if (m.role === "system") history.push(new SystemMessage(m.content));
    }
  }
  history.push(new HumanMessage(userMessage));

  const response = await model.invoke(history);
  const assistantText = String(response.content);

  // Persist the turn
  if (!conversationId) {
    const conv = await client.createConversation({
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantText },
      ],
    });
    return { conversationId: conv.id, response: assistantText };
  }

  await client.appendMessages(conversationId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantText },
  ]);
  return { conversationId, response: assistantText };
}
```

### LangChain (Python)

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from agentstate import AgentStateClient

model = ChatOpenAI(model="gpt-4o")
client = AgentStateClient(api_key="as_live_...")


def chat(conversation_id: str | None, user_message: str):
    # Rebuild LangChain message objects from stored history
    history = []
    if conversation_id:
        conv = client.get_conversation(conversation_id)
        for m in conv.messages:
            if m.role == "user":
                history.append(HumanMessage(m.content))
            elif m.role == "assistant":
                history.append(AIMessage(m.content))
            elif m.role == "system":
                history.append(SystemMessage(m.content))
    history.append(HumanMessage(user_message))

    response = model.invoke(history)
    assistant_text = response.content

    # Persist the turn
    if not conversation_id:
        conv = client.create_conversation(
            messages=[
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_text},
            ]
        )
        return conv.id, assistant_text

    client.append_messages(
        conversation_id,
        [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_text},
        ],
    )
    return conversation_id, assistant_text
```

### LangGraph (JavaScript)

Use the built-in checkpoint saver to persist LangGraph state. Each `thread_id` maps to a
separate conversation.

```typescript
import { AgentState } from "@agentstate/sdk";
import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });
const saver = new AgentStateCheckpointSaver(client);

await saver.put(
  { configurable: { thread_id: "thread-1", checkpoint_ns: "" } },
  { id: "cp-1", values: {} },
  { step: 0 },
  {},
);

await saver.putWrites(
  { configurable: { thread_id: "thread-1", checkpoint_id: "cp-1" } },
  [["messages", [{ role: "assistant", content: "hello" }]]],
  "main",
);
```

Wire the saver into a compiled graph and each invocation is checkpointed automatically:

```typescript
const checkpointer = new AgentStateCheckpointSaver(client);
const graph = compileGraph({ checkpointer });

const result = await graph.invoke(
  { messages: [{ role: "user", content: "Hello" }] },
  { configurable: { thread_id: "user-42" } },
);
```

### LangGraph (Python)

```python
from agentstate import AgentStateClient
from agentstate.langgraph import AgentStateCheckpointSaver

client = AgentStateClient(api_key="as_live_...")
saver = AgentStateCheckpointSaver(client)

config = {"configurable": {"thread_id": "thread-1", "checkpoint_ns": ""}}
checkpoint = {"id": "cp-1", "values": {}}
metadata = {"step": 0}
new_config = saver.put(config, checkpoint, metadata, {})
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

### Cloudflare Agents SDK

Extend the `Agent` class from the [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/) and use `@agentstate/sdk` for cross-session persistence.

```typescript
import { Agent } from "agents";
import { AgentState } from "@agentstate/sdk";

interface Env {
  AGENTSTATE_API_KEY: string;
  AI: Ai;
}

export class ChatAgent extends Agent<Env> {
  private agentState!: AgentState;
  private conversationId: string | null = null;

  async onStart() {
    this.agentState = new AgentState({
      apiKey: this.env.AGENTSTATE_API_KEY,
    });
  }

  async onMessage(connection: Connection, message: string) {
    // Load history if resuming
    let history: Array<{ role: string; content: string }> = [];
    if (this.conversationId) {
      const conv = await this.agentState.getConversation(this.conversationId);
      history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    }
    history.push({ role: "user", content: message });

    // Generate response (using Workers AI or any provider)
    const aiResponse = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: history,
    });

    const reply = aiResponse.response;

    // Persist to AgentState
    if (!this.conversationId) {
      const conv = await this.agentState.createConversation({
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: reply },
        ],
      });
      this.conversationId = conv.id;
    } else {
      await this.agentState.appendMessages(this.conversationId, [
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ]);
    }

    connection.send(reply);
  }
}
```

### Generic TypeScript / Raw fetch

For frameworks without a specific guide, use `@agentstate/sdk` directly.

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({
  apiKey: "as_live_...",
});

// Create a conversation
const conv = await client.createConversation({
  external_id: "my-chat-123",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi! How can I help?" },
  ],
  metadata: { model: "gpt-4o", user_id: "user_456" },
});

console.log(conv.id); // Use this ID to append messages later

// Retrieve later
const loaded = await client.getConversation(conv.id);
// loaded.messages contains the full conversation history

// Append new messages
await client.appendMessages(conv.id, [
  { role: "user", content: "What's the weather?" },
  { role: "assistant", content: "Let me check..." },
]);
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

Base URL: `https://agentstate.app/api/v1` (the `api.agentstate.app` subdomain also works)
Auth: `Authorization: Bearer as_live_...` — keys are `as_live_` + 40 base62 characters.

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

Webhook endpoints are scoped to the project of the API key you authenticate with.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks` | Create webhook |
| GET | `/webhooks` | List webhooks |
| GET | `/webhooks/:id` | Get webhook |
| PUT | `/webhooks/:id` | Update webhook |
| DELETE | `/webhooks/:id` | Delete webhook |

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

## 7. AI Prompt Template

Add this to your AI assistant's system prompt so it can use AgentState directly:

```
You have access to AgentState for persistent conversation history and durable agent state.

API Base: https://agentstate.app/api  (the api.agentstate.app subdomain also works)
Auth: Bearer token in the Authorization header — keys start with as_live_
Prefer an SDK over raw HTTP: @agentstate/sdk (TypeScript, class AgentState) or
agentstate (Python, class AgentStateClient). Both cover everything below.
Machine-readable docs: https://agentstate.app/agents.md and https://agentstate.app/llms.txt

Conversation operations:
- POST /v1/conversations — Create conversation with optional messages
- GET /v1/conversations — List conversations (params: limit, cursor, order)
- GET /v1/conversations/:id — Get conversation with all messages (default)
- GET /v1/conversations/:id?fields=!messages — Metadata only (omit messages)
- GET /v1/conversations/by-external-id/:eid — Lookup by your external ID
- PUT /v1/conversations/:id — Update title/metadata
- DELETE /v1/conversations/:id — Delete conversation and messages
- POST /v1/conversations/:id/messages — Append messages to conversation
- GET /v1/conversations/:id/messages — List messages (params: limit, after)
- POST /v1/conversations/:id/generate-title — Auto-generate title via AI
- POST /v1/conversations/:id/follow-ups — Get AI-suggested follow-up questions
- GET /v1/conversations/search?q=term — Full-text search across message content
- POST /v1/conversations/bulk-delete — Delete multiple conversations (body: {ids: [...]})
- POST /v1/conversations/export — Bulk export conversations with messages
- GET /v1/tags — List all tags for the project
- POST /v1/conversations/:id/tags — Add tags (body: {tags: [...]})
- DELETE /v1/conversations/:id/tags/:tag — Remove a tag

State operations:
- PUT /v1/states/:stateKey — Create or replace state (body: {agent_id, data, tags?, lease_id?})
- GET /v1/states/:stateKey — Read latest or historical state (params: at_sequence, at_time)
- POST /v1/states/query — Query states (body: {agent_id?, tags?, predicates?, ...})
- DELETE /v1/states/:stateKey — Delete state (params: lease_id)
- GET /v1/states/:stateKey/events — List state events (params: after, limit)
- POST /v1/states/:stateKey/lease — Create write lease (body: {holder, ttl_ms?})
- POST /v1/leases/:id/renew — Renew active lease
- DELETE /v1/leases/:id — Release active lease

Capability tokens & claims (scoped delegation + verifiable facts):
- POST /v1/capability-tokens — Mint scoped token (body: {name, scopes, expires_at?})
  scopes: state:read, state:write, state:watch, lease:write, claim:write
- GET /v1/capability-tokens — List · DELETE /v1/capability-tokens/:id — Revoke
- Use a capability token in place of the API key (Authorization: Bearer <token>) to act with reduced scope.
- POST /v1/claims — Create claim (body: {subject_type, subject_id, statement, evidence})
- GET /v1/claims · GET /v1/claims/:id · POST /v1/claims/:id/verify — Re-verify evidence

Message format:
{ role: "user"|"assistant"|"system"|"tool", content: "...", metadata?: {...}, token_count?: number }

Conventions (follow exactly):
- JSON fields are snake_case. IDs are 21-char nanoids. Timestamps are Unix milliseconds (integers).
- Conversation update is PUT, not PATCH.
- Errors: { "error": { "code", "message" } } — branch on code (BAD_REQUEST, UNAUTHORIZED,
  FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR), not on message text.
- Pagination is cursor-based with two shapes:
  - conversations/messages -> { data, has_more, next_cursor }
  - state/claims queries   -> { data, pagination: { limit, next_cursor, total? } }
- Set an Idempotency-Key header on writes so retries don't duplicate.
- Use external_id to map your own session IDs to conversations (and dedupe via /by-external-id/:eid).
- Use metadata to store model info, user IDs, tags, or any structured data.
- All responses include an X-Request-Id header for traceability.
```

---

## Related Docs

- [Getting Started](./getting-started.md) — Zero to working in 2 minutes
- [API Reference](./api-reference.md) — Full endpoint documentation
- [TypeScript SDK](./sdk.md) — SDK methods and error handling
- [V2 Migration](./v2-migration.md) — Migrate from V1 to V2 API
