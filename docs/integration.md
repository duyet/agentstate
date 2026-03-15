# AgentState Integration Guide

AgentState stores and retrieves AI agent conversations via a simple REST API.

**Base URL**: `https://agentstate.app/api`

## Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer as_live_your_api_key_here" \
  https://agentstate.app/api/v1/conversations
```

---

## API Reference

### Create Conversation

```http
POST /v1/conversations
```

```json
{
  "external_id": "chat_abc123",
  "title": "Optional title",
  "metadata": { "user_id": "u_123", "model": "claude-sonnet-4-20250514" },
  "messages": [
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi there! How can I help?" }
  ]
}
```

**Response** `201`:
```json
{
  "id": "abc123nanoid",
  "external_id": "chat_abc123",
  "title": "Optional title",
  "metadata": { "user_id": "u_123" },
  "message_count": 2,
  "token_count": 0,
  "created_at": 1710500000000,
  "updated_at": 1710500000000,
  "messages": [...]
}
```

### List Conversations

```http
GET /v1/conversations?limit=50&cursor=1710500000000&order=desc
```

### Get Conversation (with messages)

```http
GET /v1/conversations/:id
```

### Update Conversation

```http
PUT /v1/conversations/:id
```

```json
{
  "title": "New title",
  "metadata": { "tags": ["support"] }
}
```

### Delete Conversation

```http
DELETE /v1/conversations/:id
```

### Append Messages

```http
POST /v1/conversations/:id/messages
```

```json
{
  "messages": [
    { "role": "user", "content": "What's the weather?" },
    { "role": "assistant", "content": "Let me check...", "token_count": 15 }
  ]
}
```

### List Messages

```http
GET /v1/conversations/:id/messages?limit=100&after=msg_id
```

### Get by External ID

Look up a conversation by your own ID (the `external_id` you set on creation):

```http
GET /v1/conversations/by-external-id/:externalId
```

Returns the conversation with all messages, same as `GET /v1/conversations/:id`.

### Generate Title (AI)

```http
POST /v1/conversations/:id/generate-title
```

**Response** `200`:
```json
{
  "title": "Weather inquiry and greeting"
}
```

### Get Follow-up Questions (AI)

```http
POST /v1/conversations/:id/follow-ups
```

**Response** `200`:
```json
{
  "questions": [
    "What's the forecast for tomorrow?",
    "Can you check the weather in another city?",
    "What should I wear today?"
  ]
}
```

### Export Conversations

```http
POST /v1/conversations/export
```

```json
{
  "ids": ["conv_id_1", "conv_id_2"]
}
```

Omit `ids` to export the most recent 100 conversations.

**Response** `200`:
```json
{
  "data": [{ "id": "...", "messages": [...] }],
  "count": 2
}
```

---

## Framework Integration Examples

### Vercel AI SDK

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const AGENTSTATE_URL = "https://agentstate.app/api";
const AGENTSTATE_KEY = process.env.AGENTSTATE_API_KEY!;

// Helper to interact with AgentState
async function agentState(path: string, options?: RequestInit) {
  const res = await fetch(`${AGENTSTATE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${AGENTSTATE_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`AgentState error: ${res.status}`);
  return res.json();
}

// Create or continue a conversation
async function chat(conversationId: string | null, userMessage: string) {
  // Load existing messages if continuing
  let messages: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    const conv = await agentState(`/v1/conversations/${conversationId}`);
    messages = conv.messages.map((m: any) => ({ role: m.role, content: m.content }));
  }

  messages.push({ role: "user", content: userMessage });

  // Generate response
  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages,
  });

  const assistantMessage = result.text;

  // Save to AgentState
  if (!conversationId) {
    const conv = await agentState("/v1/conversations", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantMessage },
        ],
      }),
    });
    return { conversationId: conv.id, response: assistantMessage };
  } else {
    await agentState(`/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantMessage },
        ],
      }),
    });
    return { conversationId, response: assistantMessage };
  }
}
```

### LangGraph

```python
import httpx

AGENTSTATE_URL = "https://agentstate.app/api"
AGENTSTATE_KEY = "as_live_..."

class AgentStateSaver:
    """LangGraph checkpointer that saves to AgentState."""

    def __init__(self, api_key: str, base_url: str = AGENTSTATE_URL):
        self.client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    def save(self, conversation_id: str | None, messages: list[dict]) -> str:
        if conversation_id is None:
            resp = self.client.post("/v1/conversations", json={"messages": messages})
            return resp.json()["id"]
        else:
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
```

### Cloudflare Agents SDK

```typescript
import { Agent } from "agents-sdk";

// Inside your Agent class, save state to AgentState
export class MyAgent extends Agent {
  async onMessage(message: string) {
    const response = await this.generateResponse(message);

    // Persist to AgentState
    await fetch(`${env.AGENTSTATE_URL}/v1/conversations/${this.conversationId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.AGENTSTATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: response },
        ],
      }),
    });

    return response;
  }
}
```

### Generic (any framework)

```typescript
// Store a conversation
const res = await fetch("https://agentstate.app/api/v1/conversations", {
  method: "POST",
  headers: {
    "Authorization": "Bearer as_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    external_id: "my-chat-123",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi! How can I help?" },
    ],
    metadata: {
      model: "gpt-4",
      user_id: "user_456",
    },
  }),
});

const conversation = await res.json();
console.log(conversation.id); // Use this ID to append messages later

// Retrieve later
const history = await fetch(`https://agentstate.app/api/v1/conversations/${conversation.id}`, {
  headers: { "Authorization": "Bearer as_live_..." },
});
const data = await history.json();
// data.messages contains the full conversation history
```

---

## AI Prompt for Integration

Add this to your AI assistant's system prompt to let it integrate with AgentState:

```
You have access to AgentState for persistent conversation storage.

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header

Available operations:
- POST /v1/conversations - Create conversation with optional messages
- GET /v1/conversations - List conversations (params: limit, cursor, order)
- GET /v1/conversations/:id - Get conversation with all messages
- GET /v1/conversations/by-external-id/:eid - Lookup by your external ID
- PUT /v1/conversations/:id - Update title/metadata
- DELETE /v1/conversations/:id - Delete conversation and messages
- POST /v1/conversations/:id/messages - Append messages to conversation
- GET /v1/conversations/:id/messages - List messages (params: limit, after)
- POST /v1/conversations/:id/generate-title - Auto-generate title via AI
- POST /v1/conversations/:id/follow-ups - Get AI-suggested follow-up questions
- POST /v1/conversations/export - Bulk export conversations with messages

Message format: { role: "user"|"assistant"|"system"|"tool", content: "...", metadata?: {...}, token_count?: number }

Use external_id to map your own IDs to AgentState conversations.
Use metadata to store model info, user IDs, tags, or any structured data.

All responses include X-Request-Id header for traceability.
```
