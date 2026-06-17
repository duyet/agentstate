# Conversations — The Agent Memory Primitive

Use conversations when you need to record, retrieve, search, and export the full message history of an AI agent or chatbot. Conversations are the core storage primitive of AgentState — a durable, queryable log of `(role, content)` turns that any agent can write to and read from.

## Core flow

1. **Create** — `POST /api/v1/conversations` with an optional list of seed messages, an external ID, and metadata. Returns the conversation with its system-assigned `id`.
2. **Append** — `POST /api/v1/conversations/:id/messages` streams new turns into the conversation as the agent runs.
3. **Read** — `GET /api/v1/conversations/:id` returns the conversation and all messages. Filter fields with `?fields=`.
4. **List** — `GET /api/v1/conversations` pages through all conversations with cursor-based pagination. Filter by tag.
5. **Search** — `GET /api/v1/conversations/search?q=` runs full-text search across message content.
6. **Export** — `POST /api/v1/conversations/export` bulk-exports conversations with messages so you always own your data.
7. **Generate** — `POST /api/v1/conversations/:id/generate-title` and `/follow-ups` run AI inference to enrich conversations automatically.

---

## curl examples

### Create a conversation with seed messages

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "session-abc-123",
    "title": "Q3 planning session",
    "metadata": { "user_id": "user-42", "channel": "web" },
    "messages": [
      { "role": "user", "content": "What were our Q2 highlights?" },
      { "role": "assistant", "content": "Q2 highlights: 22% revenue growth, launched v2 API, hired 8 engineers." }
    ]
  }'
```

**201 — conversation created:**
```json
{
  "id": "conv_MDEyMzQ1Njc4OTAxMjM0NQ",
  "project_id": "proj_xyz",
  "external_id": "session-abc-123",
  "title": "Q3 planning session",
  "metadata": { "user_id": "user-42", "channel": "web" },
  "message_count": 2,
  "token_count": 0,
  "total_cost_microdollars": 0,
  "total_tokens": 0,
  "created_at": 1718700000000,
  "updated_at": 1718700000000,
  "messages": [
    { "id": "msg_aaa", "role": "user", "content": "What were our Q2 highlights?", "created_at": 1718700000000 },
    { "id": "msg_bbb", "role": "assistant", "content": "Q2 highlights: 22% revenue growth...", "created_at": 1718700000000 }
  ]
}
```

### Append messages

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/messages \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "What should we focus on in Q3?" },
      {
        "role": "assistant",
        "content": "Three priorities: international expansion, infra reliability, and SDK adoption.",
        "model": "claude-3-5-sonnet-20241022",
        "input_tokens": 120,
        "output_tokens": 45,
        "cost_microdollars": 1800
      }
    ]
  }'
```

**201 — messages appended:**
```json
{
  "messages": [
    { "id": "msg_ccc", "role": "user", "content": "What should we focus on in Q3?", "created_at": 1718700060000 },
    { "id": "msg_ddd", "role": "assistant", "content": "Three priorities...", "model": "claude-3-5-sonnet-20241022", "input_tokens": 120, "output_tokens": 45, "cost_microdollars": 1800, "created_at": 1718700060000 }
  ]
}
```

### List conversations (cursor-based pagination, newest first)

```bash
curl -s "https://agentstate.app/api/v1/conversations?limit=20&order=desc" \
  -H "Authorization: Bearer as_live_..."

# Next page:
curl -s "https://agentstate.app/api/v1/conversations?limit=20&order=desc&cursor=<next_cursor>" \
  -H "Authorization: Bearer as_live_..."

# Filter by tag:
curl -s "https://agentstate.app/api/v1/conversations?tag=production" \
  -H "Authorization: Bearer as_live_..."
```

**200:**
```json
{
  "data": [{ "id": "conv_MDEyMzQ1Njc4OTAxMjM0NQ", "title": "Q3 planning session", "message_count": 4, "..." : "..." }],
  "pagination": { "limit": 20, "next_cursor": "1718699900000" }
}
```

### Get a single conversation (with optional field selection)

```bash
# All fields including messages (default)
curl -s https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ \
  -H "Authorization: Bearer as_live_..."

# Only conversation metadata — no messages fetched
curl -s "https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ?fields=id,title,message_count" \
  -H "Authorization: Bearer as_live_..."
```

### Look up by your own external ID

```bash
curl -s https://agentstate.app/api/v1/conversations/by-external-id/session-abc-123 \
  -H "Authorization: Bearer as_live_..."
```

### List messages in a conversation (paginated)

```bash
curl -s "https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/messages?limit=50" \
  -H "Authorization: Bearer as_live_..."

# Page from a specific message ID
curl -s "https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/messages?after=msg_bbb&limit=50" \
  -H "Authorization: Bearer as_live_..."
```

### Full-text search across message content

```bash
curl -s "https://agentstate.app/api/v1/conversations/search?q=international+expansion&limit=10" \
  -H "Authorization: Bearer as_live_..."
```

### Update a conversation's title or metadata

```bash
curl -s -X PUT https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "title": "Q3 planning — final" }'
```

### Delete a conversation

```bash
curl -s -X DELETE https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ \
  -H "Authorization: Bearer as_live_..."
# → 204 No Content
```

### Bulk delete (up to 100 IDs)

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations/bulk-delete \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "ids": ["conv_MDEyMzQ1Njc4OTAxMjM0NQ", "conv_YWJjZGVmZ2hpams"] }'
```

**200:**
```json
{ "deleted": 2 }
```

### Export conversations with messages

```bash
# Export specific IDs
curl -s -X POST https://agentstate.app/api/v1/conversations/export \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "ids": ["conv_MDEyMzQ1Njc4OTAxMjM0NQ"] }'

# Export all (omit ids)
curl -s -X POST https://agentstate.app/api/v1/conversations/export \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

**200:**
```json
{ "data": [{ "id": "conv_...", "messages": [...] }], "count": 1 }
```

### AI — generate a title

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/generate-title \
  -H "Authorization: Bearer as_live_..."
```

**200:**
```json
{ "title": "Q3 planning session: priorities and goals" }
```

### AI — generate follow-up questions

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/follow-ups \
  -H "Authorization: Bearer as_live_..."
```

**200:**
```json
{ "questions": ["Which markets should we enter first?", "What does infra reliability mean in practice?", "How do we measure SDK adoption success?"] }
```

### AI — generate title and follow-ups in one call

```bash
curl -s -X POST https://agentstate.app/api/v1/conversations/conv_MDEyMzQ1Njc4OTAxMjM0NQ/generate-all \
  -H "Authorization: Bearer as_live_..."
```

**200:**
```json
{ "title": "Q3 planning session: priorities and goals", "follow_ups": ["Which markets should we enter first?"] }
```

---

## TypeScript SDK

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: "as_live_..." });

// Create a conversation with seed messages
const conv = await client.createConversation({
  external_id: "session-abc-123",
  title: "Q3 planning session",
  metadata: { user_id: "user-42" },
  messages: [
    { role: "user", content: "What were our Q2 highlights?" },
    { role: "assistant", content: "Q2 highlights: 22% revenue growth, launched v2 API." },
  ],
});
console.log(`Created: ${conv.id}`);

// Append messages as the conversation continues
const { messages } = await client.appendMessages(conv.id, [
  { role: "user", content: "What should we focus on in Q3?" },
  {
    role: "assistant",
    content: "Three priorities: international expansion, reliability, SDK adoption.",
    model: "claude-3-5-sonnet-20241022",
    input_tokens: 120,
    output_tokens: 45,
  },
]);

// Read back the full conversation
const full = await client.getConversation(conv.id);
console.log(`Messages: ${full.messages.length}`);

// Look up by your own ID
const byExternal = await client.getConversationByExternalId("session-abc-123");

// List with pagination
let cursor: string | null = null;
do {
  const page = await client.listConversations({ limit: 20, order: "desc", cursor: cursor ?? undefined });
  for (const c of page.data) {
    console.log(`${c.id}  ${c.title}`);
  }
  cursor = page.pagination.next_cursor;
} while (cursor);

// List messages in a conversation
const msgPage = await client.listMessages(conv.id, { limit: 50 });

// Update title or metadata
await client.updateConversation(conv.id, { title: "Q3 planning — final" });

// AI enrichment
const { title } = await client.generateTitle(conv.id);
const { questions } = await client.generateFollowUps(conv.id);
console.log(`Generated title: ${title}`);
console.log(`Follow-ups: ${questions.join(", ")}`);

// Bulk export — your data is yours
const exported = await client.exportConversations(["conv_MDEyMzQ1Njc4OTAxMjM0NQ"]);
console.log(`Exported ${exported.count} conversation(s)`);

// Delete
await client.deleteConversation(conv.id); // → void (204)
```

---

## Python SDK

```python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

# Create a conversation with seed messages
conv = client.create_conversation(
    messages=[
        {"role": "user", "content": "What were our Q2 highlights?"},
        {"role": "assistant", "content": "Q2 highlights: 22% revenue growth, launched v2 API."},
    ],
    external_id="session-abc-123",
    title="Q3 planning session",
    metadata={"user_id": "user-42"},
)
conv_id = conv["id"]
print(f"Created: {conv_id}")

# Append messages as the conversation continues
result = client.append_messages(
    conv_id,
    messages=[
        {"role": "user", "content": "What should we focus on in Q3?"},
        {
            "role": "assistant",
            "content": "Three priorities: international expansion, reliability, SDK adoption.",
            "model": "claude-3-5-sonnet-20241022",
            "input_tokens": 120,
            "output_tokens": 45,
        },
    ],
)
print(f"Appended {len(result['messages'])} message(s)")

# Read back the full conversation
full = client.get_conversation(conv_id)
print(f"Messages: {len(full['messages'])}")

# Look up by your own ID
by_external = client.get_conversation_by_external_id("session-abc-123")

# List with pagination
cursor = None
while True:
    page = client.list_conversations(limit=20, cursor=cursor, order="desc")
    for c in page["data"]:
        print(f"{c['id']}  {c['title']}")
    cursor = page["pagination"]["next_cursor"]
    if not cursor:
        break

# List messages in a conversation
msg_page = client.list_messages(conv_id, limit=50)

# Update title or metadata
client.update_conversation(conv_id, title="Q3 planning — final")

# AI enrichment
title_result = client.generate_title(conv_id)
follow_ups = client.generate_follow_ups(conv_id)
print(f"Generated title: {title_result['title']}")
print(f"Follow-ups: {follow_ups['questions']}")

# Bulk export — your data is yours
exported = client.export_conversations(ids=["conv_MDEyMzQ1Njc4OTAxMjM0NQ"])
print(f"Exported {exported['count']} conversation(s)")

# Delete
client.delete_conversation(conv_id)  # → None (204)
```

---

## Key concepts

### Conversation and message model

A conversation is a top-level container with an `id`, optional `external_id`, `title`, `metadata`, and aggregate counters (`message_count`, `token_count`, `total_tokens`, `total_cost_microdollars`). Messages are ordered by `created_at` ascending, with a stable tie-breaker on insertion order when multiple messages share the same timestamp.

Each message carries: `role` (one of `user`, `assistant`, `system`, `tool`), `content`, and optional observability fields: `model`, `input_tokens`, `output_tokens`, `token_count`, `cost_microdollars`, `observation_type`, `start_time`, `end_time`, `status`, and `level`. These fields let you log full LLM tracing metadata alongside the message content.

### External ID — map your sessions to AgentState IDs

Pass `external_id` at creation time to map your own session or thread identifier to the AgentState conversation ID. Retrieve it later via `GET /api/v1/conversations/by-external-id/:externalId` without maintaining a lookup table on your side.

### Cursor-based pagination

All list endpoints use cursor pagination — never offset. The `next_cursor` field in `pagination` is an opaque token (a Unix timestamp in milliseconds); pass it as `?cursor=` on the next request. Omit it for the first page. Cursor pagination is stable under concurrent writes: new conversations added after the first page request do not shift earlier pages.

### Full-text search

`GET /api/v1/conversations/search?q=<query>` searches message content across all conversations in your project. Matches return the parent conversation, not individual messages. Supports cursor pagination for large result sets.

### Bulk export — your data is yours

`POST /api/v1/conversations/export` returns full conversation objects with their messages embedded. Omit `ids` to export everything. Use this to feed downstream analytics, migrate between systems, or produce audit logs. The response includes `count` and a `data` array — no pagination; all requested conversations are returned in one response.

### AI title and follow-up generation

`POST /api/v1/conversations/:id/generate-title` sends the conversation's first 20 messages to Workers AI and writes the returned title back to the conversation record. `POST /api/v1/conversations/:id/follow-ups` sends the last 20 messages and returns a `questions` array of suggested follow-up prompts. Both operations are idempotent and can be called at any point after messages are present. `POST /api/v1/conversations/:id/generate-all` runs both in a single round-trip and returns `{ title, follow_ups }`.

### One of five primitives

Conversations are one of the five core primitives of AgentState. The other four are **states** (versioned key/value), **leases** (distributed locking), **capability tokens** (scoped delegation), and **claims** (verifiable agent output). See the sibling recipes for each.

---

[Get a free API key at agentstate.app](https://agentstate.app) or see [getting-started.md](../getting-started.md) for a two-minute setup guide.
