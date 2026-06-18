// Auto-generated from llms.txt and agents.md by scripts/generate-content.mjs.
// Do not edit by hand — edit the source files and run `bun run gen:content`.

export const LLMS_TXT = `# AgentState

> Conversation history and durable state database-as-a-service for AI agents.

AgentState provides a simple REST API to store, retrieve, and manage AI agent
conversations and durable agent state. Any AI framework can integrate in minutes.

## API Base URL

https://agentstate.app/api   (the api.agentstate.app subdomain also works)

All endpoints below are under this base. Example: POST https://agentstate.app/api/v1/conversations

## Authentication

Every request requires a Bearer token (API keys start with \`as_live_\`):
Authorization: Bearer as_live_your_api_key

## SDKs (recommended over raw HTTP)

- TypeScript/JavaScript: \`npm install @agentstate/sdk\` — class \`AgentState\`, base URL \`https://agentstate.app/api\`
- Python: \`pip install agentstate\` — class \`AgentStateClient\`, base URL \`https://api.agentstate.app\`

Both SDKs cover the full surface below with the same method names (TS camelCase, Python snake_case).

## Conversation Endpoints

- POST   /api/v1/conversations — Create conversation with optional messages
- GET    /api/v1/conversations — List conversations (cursor pagination)
- GET    /api/v1/conversations/:id — Get conversation with all messages
- GET    /api/v1/conversations/by-external-id/:eid — Lookup by your own ID
- PUT    /api/v1/conversations/:id — Update title/metadata
- DELETE /api/v1/conversations/:id — Delete conversation and messages
- POST   /api/v1/conversations/:id/messages — Append messages
- GET    /api/v1/conversations/:id/messages — List messages (cursor pagination)
- POST   /api/v1/conversations/:id/generate-title — AI title generation
- POST   /api/v1/conversations/:id/follow-ups — AI follow-up suggestions
- POST   /api/v1/conversations/export — Bulk export (body: {ids: [...]} or {} for all)

## State Platform Endpoints (durable key/value state with history)

- PUT    /api/v1/states/:key — Create or replace state (body: {agent_id, data, tags?, metadata?, lease_id?})
- GET    /api/v1/states/:key — Get latest (or historical via ?at_sequence= / ?at_time=)
- POST   /api/v1/states/query — Query states (body: {agent_id?, tags?, json_path?, json_equals?, predicates?, limit?, cursor?})
- DELETE /api/v1/states/:key — Delete state (optional ?lease_id=)
- GET    /api/v1/states/:key/events — Event history (params: after, limit)
- POST   /api/v1/states/:key/lease — Acquire a write lease (body: {holder, ttl_ms?})
- POST   /api/v1/leases/:id/renew — Renew a lease (body: {ttl_ms?})
- DELETE /api/v1/leases/:id — Release a lease
- POST   /api/v1/capability-tokens — Mint a scoped token (body: {name, scopes, expires_at?})
- GET    /api/v1/capability-tokens — List capability tokens
- DELETE /api/v1/capability-tokens/:id — Revoke a capability token
- POST   /api/v1/claims — Create a verifiable claim (body: {subject_type, subject_id, statement, evidence})
- GET    /api/v1/claims — List claims
- GET    /api/v1/claims/:id — Get a claim
- POST   /api/v1/claims/:id/verify — Re-verify a claim's evidence

## Project Management

- POST   /api/v1/projects — Create project (body: name, slug)
- GET    /api/v1/projects — List projects
- GET    /api/v1/projects/:id — Get project with API keys
- POST   /api/v1/projects/:id/keys — Generate API key (body: name, scopes?)
- DELETE /api/v1/projects/:id/keys/:keyId — Revoke API key

## API Key Management (keyless — project taken from the authenticating key)

- POST   /api/v1/keys — Create API key (body: {name, scopes?}); scopes must be a subset of the calling key's
- GET    /api/v1/keys — List API keys (each has a scopes field: string[] | null, null = full access)
- DELETE /api/v1/keys/:id — Revoke an API key

## Permissions / Scopes

Keys, capability tokens, and OAuth access tokens carry scopes. A key created without scopes
(or any legacy key) has full access (scopes = null). Scopes: conversations:read,
conversations:write, state:read, state:write, state:watch, leases:write, claims:write,
analytics:read, webhooks:write, domains:write, keys:read, keys:write. \`*\` = full access;
per-resource wildcards like state:* cover all actions on a resource. A key can only mint
child keys whose scopes are a subset of its own. Out-of-scope requests return 403 FORBIDDEN.

## Remote MCP server + OAuth

- POST /api/mcp — Hosted MCP server (Streamable HTTP JSON-RPC: initialize, tools/list, tools/call, ping).
  Auth: Authorization: Bearer <token> where token is an API key (as_live_), capability token
  (as_cap_), or OAuth access token. Each tool requires a scope.
- OAuth 2.1 + PKCE discovery: GET /.well-known/oauth-protected-resource (RFC 9728),
  GET /.well-known/oauth-authorization-server (RFC 8414), POST /api/oauth/register (RFC 7591),
  GET /api/oauth/authorize (consent screen), POST /api/oauth/token (exchange + refresh rotation).

## Message Format

{ "role": "user|assistant|system|tool", "content": "...", "metadata": {...}, "token_count": 0 }

## Conventions (read before implementing)

- IDs are nanoid strings (21 chars). Timestamps are Unix milliseconds (integers).
- All field names are snake_case. Send and expect snake_case JSON.
- Errors: { "error": { "code": "MACHINE_CODE", "message": "Human message" } }.
  Codes include BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR.
- Pagination is cursor-based, never offset. Two response shapes:
  - Conversations/messages: { data: [...], has_more: bool, next_cursor: string|null }
  - State/claims queries:    { data: [...], pagination: { limit, next_cursor, total? } }
- Writes (create conversation, append messages, upsert/delete state) accept an
  \`Idempotency-Key\` header to make retries safe.
- Use \`external_id\` on conversations to dedupe against your own session IDs.

## Full Agent Integration Guide

See: https://agentstate.app/agents.md
`;

export const AGENTS_MD = `# AgentState — Agent Integration Guide

You are reading the integration guide for AgentState, a conversation history and
durable-state database-as-a-service. This document is written for AI agents to read
and self-implement the integration. Follow it literally — the field names, paths, and
response shapes below are exact.

## What AgentState gives you

1. **Conversations** — store/retrieve message history so your agent keeps context across turns.
2. **State platform** — durable, versioned key/value state per agent, with event history,
   write leases (mutual exclusion), scoped capability tokens, and verifiable claims.
3. **AI helpers** — auto-generate conversation titles and follow-up suggestions.

If you only need to persist chat history, use the Conversations API. Reach for the State
platform when your agent needs durable working memory, coordination, or auditable facts.

## Quick Start

To integrate AgentState you need:
1. An API key (starts with \`as_live_\`).
2. An HTTP client — or, preferred, one of the official SDKs.

## Use an SDK (recommended)

Prefer the typed SDK over raw HTTP. Both SDKs cover the full surface; method names match
(TypeScript camelCase, Python snake_case).

### TypeScript / JavaScript

\`\`\`bash
npm install @agentstate/sdk
\`\`\`

\`\`\`typescript
import { AgentState } from "@agentstate/sdk";

// Default base URL is https://agentstate.app/api — no need to set it.
const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

const conv = await client.createConversation({
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there!" },
  ],
});

await client.appendMessages(conv.id, [
  { role: "user", content: "What's next?" },
  { role: "assistant", content: "Let me help!" },
]);

const history = await client.getConversation(conv.id);
const { title } = await client.generateTitle(conv.id);
\`\`\`

The TypeScript SDK class is \`AgentState\`. It runs in Node.js, Deno, Bun, Cloudflare
Workers, and browsers.

### Python

\`\`\`bash
pip install agentstate
\`\`\`

\`\`\`python
from agentstate import AgentStateClient

# Python SDK default base URL is https://api.agentstate.app
client = AgentStateClient(api_key="as_live_your_key")

conv = client.create_conversation(messages=[
    {"role": "user", "content": "Hello!"},
    {"role": "assistant", "content": "Hi there!"},
])

client.append_messages(conv["id"], [
    {"role": "user", "content": "What's next?"},
    {"role": "assistant", "content": "Let me help!"},
])

history = client.get_conversation(conv["id"])
title = client.generate_title(conv["id"])["title"]
\`\`\`

The Python SDK class is \`AgentStateClient\`. It has full feature parity with the
TypeScript SDK (conversations, messages, AI helpers, export, states, leases, capability
tokens, and claims).

## Authentication

Include your API key as a Bearer token on every request:

\`\`\`
Authorization: Bearer as_live_your_api_key_here
\`\`\`

## Base URL

\`\`\`
https://agentstate.app/api
\`\`\`

The \`https://api.agentstate.app\` subdomain resolves to the same API (the TypeScript SDK
defaults to \`agentstate.app/api\`, the Python SDK to \`api.agentstate.app\`). Both work —
pick one and be consistent. Every path below is relative to the base URL.

## Step-by-Step: Conversations over raw HTTP

If you are not using an SDK, here is the exact request flow.

### Step 1: Store a conversation

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/conversations", {
  method: "POST",
  headers: {
    "Authorization": "Bearer as_live_your_key",
    "Content-Type": "application/json",
    "Idempotency-Key": "your-session-id",   // optional: makes retries safe
  },
  body: JSON.stringify({
    external_id: "your-session-id",   // optional: your own ID, for later lookup/dedup
    metadata: { user_id: "user_123", model: "claude-sonnet-4-6", agent: "my-agent" },
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi! How can I help?" },
    ],
  }),
});

const conversation = await response.json(); // save conversation.id
\`\`\`

### Step 2: Append messages

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

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}\`,
  { headers: { "Authorization": "Bearer as_live_your_key" } }
);
const data = await response.json();
// data.messages is the full history — pass it back to your LLM as context.
\`\`\`

### Step 4: Lookup by your own ID

\`\`\`typescript
const response = await fetch(
  \`https://agentstate.app/api/v1/conversations/by-external-id/\${yourSessionId}\`,
  { headers: { "Authorization": "Bearer as_live_your_key" } }
);
\`\`\`

### Step 5 & 6: AI title and follow-ups (optional)

\`\`\`typescript
// Title
const t = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}/generate-title\`,
  { method: "POST", headers: { "Authorization": "Bearer as_live_your_key" } }
);
const { title } = await t.json();

// Follow-up suggestions
const f = await fetch(
  \`https://agentstate.app/api/v1/conversations/\${conversationId}/follow-ups\`,
  { method: "POST", headers: { "Authorization": "Bearer as_live_your_key" } }
);
const { questions } = await f.json(); // ["What about...", "Can you also...", ...]
\`\`\`

## Complete API Reference

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/conversations\` | Create conversation |
| GET | \`/api/v1/conversations\` | List (params: \`limit\`, \`cursor\`, \`order\`) |
| GET | \`/api/v1/conversations/:id\` | Get with all messages |
| GET | \`/api/v1/conversations/by-external-id/:eid\` | Lookup by external ID |
| PUT | \`/api/v1/conversations/:id\` | Update title/metadata (use PUT, not PATCH) |
| DELETE | \`/api/v1/conversations/:id\` | Delete with all messages |
| POST | \`/api/v1/conversations/export\` | Bulk export (body: \`{ids: [...]}\` or \`{}\` for all) |

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

### State Platform

Durable, versioned per-agent state. Every write appends an event; reads can return the
latest snapshot or a historical one. Use leases for mutual exclusion, capability tokens to
delegate scoped access, and claims for verifiable, evidence-backed assertions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | \`/api/v1/states/:key\` | Create/replace state — body \`{agent_id, data, tags?, metadata?, lease_id?}\` |
| GET | \`/api/v1/states/:key\` | Latest, or historical via \`?at_sequence=\` / \`?at_time=\` |
| POST | \`/api/v1/states/query\` | Query — body \`{agent_id?, tags?, json_path?, json_equals?, predicates?, limit?, cursor?}\` |
| DELETE | \`/api/v1/states/:key\` | Delete (optional \`?lease_id=\`) |
| GET | \`/api/v1/states/:key/events\` | Event history (params: \`after\`, \`limit\`) |
| POST | \`/api/v1/states/:key/lease\` | Acquire write lease — body \`{holder, ttl_ms?}\` |
| POST | \`/api/v1/leases/:id/renew\` | Renew lease — body \`{ttl_ms?}\` |
| DELETE | \`/api/v1/leases/:id\` | Release lease |
| POST | \`/api/v1/capability-tokens\` | Mint scoped token — body \`{name, scopes, expires_at?}\` |
| GET | \`/api/v1/capability-tokens\` | List capability tokens |
| DELETE | \`/api/v1/capability-tokens/:id\` | Revoke capability token |
| POST | \`/api/v1/claims\` | Create claim — body \`{subject_type, subject_id, statement, evidence}\` |
| GET | \`/api/v1/claims\` | List claims |
| GET | \`/api/v1/claims/:id\` | Get a claim |
| POST | \`/api/v1/claims/:id/verify\` | Re-verify a claim's evidence |

Capability token scopes: \`state:read\`, \`state:write\`, \`state:watch\`, \`lease:write\`,
\`claim:write\`. Pass a capability token in place of the API key (\`Authorization: Bearer <token>\`)
to act with exactly those scopes. Claim evidence items have a \`kind\` of \`text_hash\`,
\`json_value\`, or \`state_event\`.

### State example (raw HTTP)

\`\`\`typescript
// Upsert durable state for an agent
await fetch("https://agentstate.app/api/v1/states/user:123:prefs", {
  method: "PUT",
  headers: {
    "Authorization": "Bearer as_live_your_key",
    "Content-Type": "application/json",
    "Idempotency-Key": "prefs-write-1",
  },
  body: JSON.stringify({
    agent_id: "my-agent",
    data: { theme: "dark", language: "en" },
    tags: ["preferences"],
  }),
});

// Read it back
const res = await fetch("https://agentstate.app/api/v1/states/user:123:prefs", {
  headers: { "Authorization": "Bearer as_live_your_key" },
});
const record = await res.json(); // { key, agent_id, data, sequence, created_at, ... }
\`\`\`

## Request / Response Formats

### Create Conversation (request)

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

Messages also accept optional observability/cost fields when you have them:
\`model\`, \`input_tokens\`, \`output_tokens\`, \`cost_microdollars\`, \`parent_message_id\`.

### Conversation (response)

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

### Error (response)

\`\`\`json
{ "error": { "code": "NOT_FOUND", "message": "Conversation not found" } }
\`\`\`

Error codes: \`BAD_REQUEST\`, \`UNAUTHORIZED\`, \`FORBIDDEN\`, \`NOT_FOUND\`, \`CONFLICT\`,
\`RATE_LIMITED\`, \`INTERNAL_ERROR\`. Always branch on \`error.code\`, not on the message text.

## Pagination (read carefully — two shapes)

All list endpoints are cursor-based (never offset). There are **two** response shapes:

**Conversations and messages** return \`next_cursor\`/\`has_more\` at the top level:

\`\`\`typescript
const res = await fetch("https://agentstate.app/api/v1/conversations?limit=50", {
  headers: { Authorization: "Bearer as_live_your_key" },
});
const { data, has_more, next_cursor } = await res.json();
if (has_more && next_cursor) {
  await fetch(\`https://agentstate.app/api/v1/conversations?limit=50&cursor=\${next_cursor}\`, {
    headers: { Authorization: "Bearer as_live_your_key" },
  });
}
\`\`\`

**State and claim queries** nest the cursor under a \`pagination\` object:

\`\`\`typescript
const { data, pagination } = await queryStatesResponse.json();
// pagination = { limit: 50, next_cursor: "..."|null, total?: number }
if (pagination.next_cursor) { /* fetch next page with this cursor */ }
\`\`\`

## Conventions & Gotchas

- **IDs** are nanoid strings (21 chars). Do not assume numeric IDs.
- **Timestamps** are Unix milliseconds (integers), e.g. \`1710500000000\`. Not ISO strings.
- **All JSON fields are snake_case** in both requests and responses.
- **Conversation update is \`PUT\`**, not \`PATCH\`.
- **Idempotency:** writes accept an \`Idempotency-Key\` header — set it so retries don't duplicate.
- **Dedup:** set \`external_id\` on a conversation to tie it to your own session ID and look
  it up later via \`/by-external-id/:eid\`.
- **Capability tokens** replace the API key in the \`Authorization\` header to act with reduced scope.
- Prefer an SDK; it handles retries (429/5xx with backoff), 204 responses, and types for you.

## Framework Examples

### Vercel AI SDK (TypeScript)

\`\`\`typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const AGENTSTATE = "https://agentstate.app/api";
const API_KEY = process.env.AGENTSTATE_API_KEY;

async function chat(conversationId: string | null, userMessage: string) {
  let messages: { role: string; content: string }[] = [];

  if (conversationId) {
    const res = await fetch(\`\${AGENTSTATE}/v1/conversations/\${conversationId}\`, {
      headers: { Authorization: \`Bearer \${API_KEY}\` },
    });
    const conv = await res.json();
    messages = conv.messages.map((m: any) => ({ role: m.role, content: m.content }));
  }

  messages.push({ role: "user", content: userMessage });

  const result = await generateText({ model: anthropic("claude-sonnet-4-6"), messages });

  const endpoint = conversationId
    ? \`\${AGENTSTATE}/v1/conversations/\${conversationId}/messages\`
    : \`\${AGENTSTATE}/v1/conversations\`;
  const body = {
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: result.text },
    ],
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: \`Bearer \${API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const saved = await res.json();
  return { conversationId: saved.id || conversationId, response: result.text };
}
\`\`\`

### Python (official SDK)

\`\`\`python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_your_key")

def chat_turn(conversation_id, user_message, assistant_message):
    msgs = [
        {"role": "user", "content": user_message},
        {"role": "assistant", "content": assistant_message},
    ]
    if conversation_id is None:
        return client.create_conversation(messages=msgs)["id"]
    client.append_messages(conversation_id, msgs)
    return conversation_id

def load_history(conversation_id):
    return client.get_conversation(conversation_id)["messages"]
\`\`\`

### LangGraph

Both SDKs ship a LangGraph checkpoint saver:
- TypeScript: \`import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";\`
- Python: \`from agentstate.langgraph import AgentStateCheckpointSaver\`

### Claude Code / Any AI Agent — system prompt block

Add this to your agent's system prompt or CLAUDE.md so it integrates AgentState correctly:

\`\`\`
You can persist conversations and durable state in AgentState.

Base URL: https://agentstate.app/api   (auth: header \`Authorization: Bearer as_live_...\`)
Prefer the SDK: \`@agentstate/sdk\` (TS, class AgentState) or \`agentstate\` (Python, class AgentStateClient).
Full machine-readable docs: https://agentstate.app/agents.md and https://agentstate.app/llms.txt

Conventions: JSON is snake_case; IDs are 21-char nanoids; timestamps are Unix ms; errors are
{ "error": { "code", "message" } } — branch on code. Conversation update is PUT. Set an
Idempotency-Key header on writes; set external_id to dedupe by your own session id.

Common operations:
- Create conversation:  POST   /api/v1/conversations            { messages: [...] }
- Append messages:      POST   /api/v1/conversations/:id/messages { messages: [...] }
- Get history:          GET    /api/v1/conversations/:id          -> { messages: [...] }
- Lookup by your id:    GET    /api/v1/conversations/by-external-id/:eid
- List (paginate):      GET    /api/v1/conversations?limit=50&cursor=... -> { data, has_more, next_cursor }
- Durable state upsert:  PUT   /api/v1/states/:key                { agent_id, data, tags? }
- Read state:           GET    /api/v1/states/:key
\`\`\`

## Pagination, Rate Limits, Retries

- Lists are cursor-based; see the two shapes above.
- Be reasonable with request volume; batch messages when possible. On HTTP 429 or 5xx,
  retry with exponential backoff (the SDKs do this automatically).

## Project Management

Conversations and state live under a project. Create and manage projects with:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/projects\` | Create project (body: \`name\`, \`slug\`) |
| GET | \`/api/v1/projects\` | List projects |
| GET | \`/api/v1/projects/:id\` | Get project with keys |
| POST | \`/api/v1/projects/:id/keys\` | Generate API key (body: \`name\`, \`scopes?\`) |
| DELETE | \`/api/v1/projects/:id/keys/:keyId\` | Revoke API key |

You can also manage keys with just an API key (no project ID — it's taken from the calling key):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/keys\` | Create API key — body \`{name, scopes?}\` |
| GET | \`/api/v1/keys\` | List API keys (each has a \`scopes\` field) |
| DELETE | \`/api/v1/keys/:id\` | Revoke an API key |

## Permissions / Scopes

Keys, capability tokens, and OAuth access tokens carry scopes that limit which endpoints they
can call. A key created **without** a \`scopes\` array — and any legacy key — has full access
(\`scopes\` is \`null\`). Pass \`scopes\` on key creation to narrow it.

Scopes: \`conversations:read\`, \`conversations:write\`, \`state:read\`, \`state:write\`,
\`state:watch\`, \`leases:write\`, \`claims:write\`, \`analytics:read\`, \`webhooks:write\`,
\`domains:write\`, \`keys:read\`, \`keys:write\`. \`*\` is full access; per-resource wildcards like
\`state:*\` cover all actions on a resource.

A key can only mint child keys whose scopes are a **subset** of its own. Out-of-scope
requests return \`403 FORBIDDEN\` — branch on \`error.code\`.

## Remote MCP server + OAuth

A hosted MCP server is available at \`POST /api/mcp\` (Streamable HTTP JSON-RPC: \`initialize\`,
\`tools/list\`, \`tools/call\`, \`ping\`). Authenticate with \`Authorization: Bearer <token>\`, where
the token is an API key (\`as_live_...\`), a capability token (\`as_cap_...\`), or an OAuth access
token. Each tool requires a scope.

For browser auth, AgentState is both the authorization and resource server (OAuth 2.1 + PKCE):
discovery at \`/.well-known/oauth-protected-resource\` and \`/.well-known/oauth-authorization-server\`,
Dynamic Client Registration at \`POST /api/oauth/register\`, the authorize → consent → token
flow at \`GET /api/oauth/authorize\` and \`POST /api/oauth/token\`, with refresh-token rotation.
A \`401\` from the API or MCP endpoint returns
\`WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource"\`.

\`\`\`typescript
const response = await fetch("https://agentstate.app/api/v1/projects", {
  method: "POST",
  headers: { "Authorization": "Bearer as_live_your_key", "Content-Type": "application/json" },
  body: JSON.stringify({ name: "My AI Agent", slug: "my-ai-agent" }),
});
const project = await response.json(); // project.id
\`\`\`

When you GET a project, \`project.keys\` lists its API keys; a freshly generated key is
returned once at creation (\`{ key: "as_live_..." }\`) — store it securely immediately.

## Support

- GitHub: https://github.com/duyet/agentstate
- Issues: https://github.com/duyet/agentstate/issues
`;
