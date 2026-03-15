// Auto-generated from llms.txt and agents.md

export const LLMS_TXT = `# AgentState

> Conversation history database-as-a-service for AI agents.

AgentState provides a simple REST API to store, retrieve, and manage AI agent conversations. Any AI framework can integrate in minutes.

## API Base URL

https://agentstate.app/api

## Authentication

All requests require a Bearer token:
Authorization: Bearer as_live_your_api_key

## Core Endpoints

### Project Management
- POST /api/v1/projects — Create project (body: name, slug)
- GET /api/v1/projects — List projects
- GET /api/v1/projects/:id — Get project with API keys
- POST /api/v1/projects/:id/keys — Generate API key
- DELETE /api/v1/projects/:id/keys/:keyId — Revoke API key

### Conversations
- POST /api/v1/conversations — Create conversation with optional messages
- GET /api/v1/conversations — List conversations (cursor pagination)
- GET /api/v1/conversations/:id — Get conversation with all messages
- GET /api/v1/conversations/by-external-id/:eid — Lookup by your ID
- PUT /api/v1/conversations/:id — Update title/metadata
- DELETE /api/v1/conversations/:id — Delete conversation and messages
- POST /api/v1/conversations/:id/messages — Append messages
- GET /api/v1/conversations/:id/messages — List messages (cursor pagination)
- POST /api/v1/conversations/:id/generate-title — AI title generation
- POST /api/v1/conversations/:id/follow-ups — AI follow-up suggestions
- POST /api/v1/conversations/export — Bulk export

## Message Format

{ "role": "user|assistant|system|tool", "content": "...", "metadata": {...}, "token_count": 0 }

## SDK

SDK: npm install @agentstate/sdk — typed TypeScript client

## Full Agent Integration Guide

See: https://agentstate.app/agents.md
`;

export const AGENTS_MD = `# AgentState — Agent Integration Guide

You are reading the integration guide for AgentState, a conversation history database-as-a-service. This document is designed for AI agents to read and self-implement the integration.

## Quick Start

To integrate AgentState into your project, you need:
1. An API key (starts with \`as_live_\`)
2. HTTP client (fetch, axios, httpx, etc.)

## SDK Installation (recommended)

Install the official SDK for a typed client:

\`\`\`bash
npm install @agentstate/sdk
\`\`\`

\`\`\`typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: "as_live_your_key" });

// Create a conversation
const conv = await client.createConversation({
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there!" },
  ],
});

// Append messages later
await client.appendMessages(conv.id, [
  { role: "user", content: "What's next?" },
  { role: "assistant", content: "Let me help!" },
]);

// Retrieve conversation
const history = await client.getConversation(conv.id);

// Generate title
const { title } = await client.generateTitle(conv.id);
\`\`\`

The SDK works in Node.js, Deno, Bun, Cloudflare Workers, and browsers.

## Authentication

Include your API key as a Bearer token in every request:

\`\`\`
Authorization: Bearer as_live_your_api_key_here
\`\`\`

## Base URL

\`\`\`
https://agentstate.app/api
\`\`\`

## Step-by-Step Integration

### Step 1: Store a conversation

When your agent completes a conversation turn, save it:

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/conversations", {
  method: "POST",
  headers: {
    "Authorization": "Bearer as_live_your_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    external_id: "your-session-id",   // optional: your own ID
    metadata: {                        // optional: any structured data
      user_id: "user_123",
      model: "claude-sonnet-4-20250514",
      agent: "my-agent",
    },
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi! How can I help?" },
    ],
  }),
});

const conversation = await response.json();
// Save conversation.id for later use
\`\`\`

### Step 2: Append messages to existing conversation

As the conversation continues, append new messages:

\`\`\`typescript
await fetch(\`https://agentstate.app/api/v1/conversations/\${conversationId}/messages\`, {
  method: "POST",
  headers: {
    "Authorization": "Bearer as_live_your_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "What's the weather?" },
      { role: "assistant", content: "Let me check for you..." },
    ],
  }),
});
\`\`\`

### Step 3: Retrieve conversation history

Load previous messages to maintain context:

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}\`,
  { headers: { "Authorization": "Bearer as_live_your_key" } }
);

const data = await response.json();
// data.messages contains the full conversation history
// Pass these as context to your LLM
\`\`\`

### Step 4: Lookup by your own ID

If you use your own session IDs:

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/by-external-id/\${yourSessionId}\`,
  { headers: { "Authorization": "Bearer as_live_your_key" } }
);
\`\`\`

### Step 5: Generate title (optional)

Auto-generate a title for the conversation using AI:

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}/generate-title\`,
  {
    method: "POST",
    headers: { "Authorization": "Bearer as_live_your_key" },
  }
);
const { title } = await response.json();
\`\`\`

### Step 6: Get follow-up suggestions (optional)

Get AI-suggested follow-up questions:

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}/follow-ups\`,
  {
    method: "POST",
    headers: { "Authorization": "Bearer as_live_your_key" },
  }
);
const { questions } = await response.json();
// questions = ["What about...", "Can you also...", "How does..."]
\`\`\`

## Complete API Reference

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/conversations\` | Create conversation |
| GET | \`/api/v1/conversations\` | List (params: \`limit\`, \`cursor\`, \`order\`) |
| GET | \`/api/v1/conversations/:id\` | Get with all messages |
| GET | \`/api/v1/conversations/by-external-id/:eid\` | Lookup by external ID |
| PUT | \`/api/v1/conversations/:id\` | Update title/metadata |
| DELETE | \`/api/v1/conversations/:id\` | Delete with all messages |
| POST | \`/api/v1/conversations/export\` | Bulk export (body: \`{ids: [...]}\`) |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/conversations/:id/messages\` | Append messages |
| GET | \`/api/v1/conversations/:id/messages\` | List (params: \`limit\`, \`after\`) |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/conversations/:id/generate-title\` | Auto-generate title |
| POST | \`/api/v1/conversations/:id/follow-ups\` | Suggest follow-ups |

## Request/Response Format

### Create Conversation Request
\`\`\`json
{
  "external_id": "optional-your-id",
  "title": "optional title",
  "metadata": { "any": "structured data" },
  "messages": [
    {
      "role": "system|user|assistant|tool",
      "content": "message text",
      "metadata": { "optional": "per-message data" },
      "token_count": 0
    }
  ]
}
\`\`\`

### Conversation Response
\`\`\`json
{
  "id": "nanoid-21-chars",
  "project_id": "...",
  "external_id": "your-id-or-null",
  "title": "conversation title",
  "metadata": { "your": "data" },
  "message_count": 5,
  "token_count": 1200,
  "created_at": 1710500000000,
  "updated_at": 1710500000000,
  "messages": [
    {
      "id": "...",
      "role": "user",
      "content": "Hello!",
      "metadata": null,
      "token_count": 0,
      "created_at": 1710500000000
    }
  ]
}
\`\`\`

### Error Response
\`\`\`json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Conversation not found"
  }
}
\`\`\`

Error codes: \`BAD_REQUEST\`, \`UNAUTHORIZED\`, \`FORBIDDEN\`, \`NOT_FOUND\`, \`INTERNAL_ERROR\`

## Framework-Specific Examples

### Vercel AI SDK (TypeScript)

\`\`\`typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const AGENTSTATE = "https://agentstate.app/api";
const API_KEY = process.env.AGENTSTATE_API_KEY;

async function chat(conversationId: string | null, userMessage: string) {
  let messages = [];

  // Load history if continuing
  if (conversationId) {
    const res = await fetch(\`\${AGENTSTATE}/v1/conversations/\${conversationId}\`, {
      headers: { Authorization: \`Bearer \${API_KEY}\` },
    });
    const conv = await res.json();
    messages = conv.messages.map((m: any) => ({ role: m.role, content: m.content }));
  }

  messages.push({ role: "user", content: userMessage });

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages,
  });

  // Save to AgentState
  const endpoint = conversationId
    ? \`\${AGENTSTATE}/v1/conversations/\${conversationId}/messages\`
    : \`\${AGENTSTATE}/v1/conversations\`;

  const body = conversationId
    ? { messages: [{ role: "user", content: userMessage }, { role: "assistant", content: result.text }] }
    : { messages: [{ role: "user", content: userMessage }, { role: "assistant", content: result.text }] };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: \`Bearer \${API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const saved = await res.json();

  return { conversationId: saved.id || conversationId, response: result.text };
}
\`\`\`

### LangGraph (Python)

\`\`\`python
import httpx

class AgentStateSaver:
    def __init__(self, api_key: str):
        self.client = httpx.Client(
            base_url="https://agentstate.app/api",
            headers={"Authorization": f"Bearer {api_key}"},
        )

    def save(self, conversation_id: str | None, messages: list[dict]) -> str:
        if conversation_id is None:
            resp = self.client.post("/v1/conversations", json={"messages": messages})
            return resp.json()["id"]
        self.client.post(f"/v1/conversations/{conversation_id}/messages", json={"messages": messages})
        return conversation_id

    def load(self, conversation_id: str) -> list[dict]:
        resp = self.client.get(f"/v1/conversations/{conversation_id}")
        return resp.json()["messages"]

    def delete(self, conversation_id: str):
        self.client.delete(f"/v1/conversations/{conversation_id}")
\`\`\`

### Claude Code / Any AI Agent

Add this to your agent's system prompt or CLAUDE.md:

\`\`\`
You have access to AgentState for persistent conversation storage.

API Base: https://agentstate.app/api
Auth: Bearer token in Authorization header
Full docs: https://agentstate.app/agents.md

Store conversations: POST /api/v1/conversations
Retrieve history: GET /api/v1/conversations/:id
Append messages: POST /api/v1/conversations/:id/messages
Lookup by your ID: GET /api/v1/conversations/by-external-id/:eid
\`\`\`

## Pagination

All list endpoints use cursor-based pagination:

\`\`\`typescript
// First page
const res = await fetch("/api/v1/conversations?limit=50");
const { data, pagination } = await res.json();

// Next page
if (pagination.next_cursor) {
  const next = await fetch(\`/api/v1/conversations?limit=50&cursor=\${pagination.next_cursor}\`);
}
\`\`\`

## Rate Limits

- No hard rate limits currently enforced
- Be reasonable: batch messages when possible
- Use \`external_id\` to avoid duplicate conversations

## Project Management

Before using conversation endpoints, you must have a project. Create and manage projects with these endpoints:

### Create Project

Create a new project for organizing conversations:

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/projects", {
  method: "POST",
  headers: {
    "Authorization": "Bearer as_live_your_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My AI Agent",
    slug: "my-ai-agent",  // unique URL-friendly identifier
  }),
});

const project = await response.json();
// project.id = your project ID
\`\`\`

### List Projects

Get all projects under your account:

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/projects", {
  headers: { "Authorization": "Bearer as_live_your_key" },
});

const { data } = await response.json();
// data = [{ id, name, slug, created_at, updated_at }, ...]
\`\`\`

### Get Project Details

Retrieve a project with its API keys:

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/projects/:id", {
  headers: { "Authorization": "Bearer as_live_your_key" },
});

const project = await response.json();
// project.keys = [{ id, key, created_at, last_used_at }, ...]
\`\`\`

### Generate API Key

Create a new API key for a project:

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/projects/:id/keys", {
  method: "POST",
  headers: { "Authorization": "Bearer as_live_your_key" },
});

const { key } = await response.json();
// key = "as_live_..." — store this securely immediately
\`\`\`

### Revoke API Key

Deactivate an API key:

\`\`\`typescript
await fetch("https://agentstate.app/api/v1/projects/:id/keys/:keyId", {
  method: "DELETE",
  headers: { "Authorization": "Bearer as_live_your_key" },
});
\`\`\`

### Project Management Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/projects\` | Create project (body: \`name\`, \`slug\`) |
| GET | \`/api/v1/projects\` | List projects |
| GET | \`/api/v1/projects/:id\` | Get project with keys |
| POST | \`/api/v1/projects/:id/keys\` | Generate API key |
| DELETE | \`/api/v1/projects/:id/keys/:keyId\` | Revoke API key |

## Support

- GitHub: https://github.com/duyet/agentstate
- Issues: https://github.com/duyet/agentstate/issues
`;
