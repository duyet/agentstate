# Integration Guide

Integration guides for using AgentState with popular AI frameworks.
For API details see [API Reference](./api-reference.md). For SDK docs see [SDK Guide](./sdk.md).

---

## Vercel AI SDK

Use `@agentstate/sdk` alongside the [Vercel AI SDK](https://sdk.vercel.ai/) to persist multi-turn conversations.

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AgentState } from "@agentstate/sdk";

const agentState = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

async function chat(conversationId: string | null, userMessage: string) {
  // Load existing conversation or start fresh
  let messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
  if (conversationId) {
    const conv = await agentState.getConversation(conversationId);
    messages = conv.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));
  }

  messages.push({ role: "user", content: userMessage });

  // Generate response
  const result = await generateText({
    model: openai("gpt-4o"),
    messages,
  });

  // Persist to AgentState
  if (!conversationId) {
    const conv = await agentState.createConversation({
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: result.text },
      ],
    });
    return { conversationId: conv.id, response: result.text };
  }

  await agentState.appendMessages(conversationId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: result.text },
  ]);
  return { conversationId, response: result.text };
}

// Usage
const first = await chat(null, "What is the capital of France?");
console.log(first.conversationId); // "abc123nanoid"

const second = await chat(first.conversationId, "What about Germany?");
// Full history is preserved across calls
```

---

## Cloudflare Workers AI

A Cloudflare Worker using the Workers AI binding with `@agentstate/sdk` for conversation persistence.

```typescript
import { AgentState } from "@agentstate/sdk";

interface Env {
  AI: Ai;
  AGENTSTATE_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const agentState = new AgentState({ apiKey: env.AGENTSTATE_API_KEY });

    const { message, conversation_id } = await request.json<{
      message: string;
      conversation_id?: string;
    }>();

    // Load conversation history
    let messages: Array<{ role: string; content: string }> = [];
    if (conversation_id) {
      const conv = await agentState.getConversation(conversation_id);
      messages = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    }
    messages.push({ role: "user", content: message });

    // Generate with Workers AI
    const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages,
    });

    const assistantText = aiResponse.response;

    // Persist conversation
    if (!conversation_id) {
      const conv = await agentState.createConversation({
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: assistantText },
        ],
      });
      return Response.json({
        conversation_id: conv.id,
        response: assistantText,
      });
    }

    await agentState.appendMessages(conversation_id, [
      { role: "user", content: message },
      { role: "assistant", content: assistantText },
    ]);
    return Response.json({
      conversation_id,
      response: assistantText,
    });
  },
};
```

---

## Cloudflare Agents SDK

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

---

## LangGraph (Python)

Use a custom checkpointer class with raw HTTP requests (no Python SDK yet).

```python
import httpx

AGENTSTATE_URL = "https://agentstate.app/api"


class AgentStateSaver:
    """LangGraph-compatible saver that persists conversations to AgentState."""

    def __init__(self, api_key: str, base_url: str = AGENTSTATE_URL):
        self.client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    def save(self, conversation_id: str | None, messages: list[dict]) -> str:
        if conversation_id is None:
            resp = self.client.post("/v1/conversations", json={"messages": messages})
            return resp.json()["id"]
        self.client.post(
            f"/v1/conversations/{conversation_id}/messages",
            json={"messages": messages},
        )
        return conversation_id

    def load(self, conversation_id: str) -> list[dict]:
        resp = self.client.get(f"/v1/conversations/{conversation_id}")
        return resp.json()["messages"]

    def delete(self, conversation_id: str):
        self.client.delete(f"/v1/conversations/{conversation_id}")


# Usage with LangGraph
saver = AgentStateSaver(api_key="as_live_...")

# Save after each agent step
conv_id = saver.save(None, [
    {"role": "user", "content": "Plan a trip to Tokyo"},
    {"role": "assistant", "content": "I'll help you plan a trip to Tokyo..."},
])

# Resume later
history = saver.load(conv_id)
```

---

## Generic TypeScript / Raw fetch

For frameworks without a specific guide, use `@agentstate/sdk` directly.

```typescript
import { AgentState } from "@agentstate/sdk";

const agentState = new AgentState({
  apiKey: "as_live_...",
});

// Create a conversation
const conv = await agentState.createConversation({
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
const loaded = await agentState.getConversation(conv.id);
// loaded.messages contains the full conversation history

// Append new messages
await agentState.appendMessages(conv.id, [
  { role: "user", content: "What's the weather?" },
  { role: "assistant", content: "Let me check..." },
]);
```

---

## AI Prompt Template

Add this to your AI assistant's system prompt so it can use AgentState directly:

```
You have access to AgentState for persistent conversation storage.

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header

Conversation operations:
- POST /v1/conversations — Create conversation with optional messages
- GET /v1/conversations — List conversations (params: limit, cursor, order)
- GET /v1/conversations/:id — Get conversation with all messages
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

Message format:
{ role: "user"|"assistant"|"system"|"tool", content: "...", metadata?: {...}, token_count?: number }

Use external_id to map your own IDs to AgentState conversations.
Use metadata to store model info, user IDs, tags, or any structured data.
All responses include X-Request-Id header for traceability.
```
