# API Historical Reference: v1/v2 Proposal

> **Note (June 2026):** The API is now unified — all endpoints are under `/api/v1/`. The v2 proposal described in this document was consolidated into v1, so the improvements (PATCH method, `?include=messages`, `pagination.total`, etc.) are available directly at `/api/v1/` paths. **There is nothing to migrate.** This document is kept for historical reference only.

There is no `/api/v2/` base path in production. All `/api/v2/` URLs in the examples below are the original v2 *proposal*; the equivalent live endpoint is the `/api/v1/` path.

**Current API:** Use `/api/v1/` for all requests. See the [API Reference](./api-reference.md) for the full live specification.

---

## What Was Proposed (Historical)

The v2 proposal aimed to improve consistency over v1. The improvements were eventually merged into v1 directly. This section documents those changes for context.

### Summary of Changes Adopted into v1

| Area | Old v1 behavior | Adopted improvement |
|------|-----------------|---------------------|
| **HTTP Method** | `PUT` for updates | `PATCH` for updates |
| **Response Fields** | `id` | `{resource}_id` (e.g., `conversation_id`) |
| **List Responses** | No total count | `pagination.total` added |
| **Create Response** | Included messages | Excludes messages by default |
| **Get Conversation** | Included messages by default | Excludes by default; use `?include=messages` |
| **Field Selection** | `?fields=...` | `?include=...` |

---

## Deprecation Headers

The codebase contains a `setDeprecationHeaders` utility (`packages/api/src/lib/deprecation.ts`) that can emit `X-API-Deprecation`, `Sunset`, and `Link` response headers. **As of June 2026, no routes call this function** — no deprecation or sunset headers are emitted in production responses.

---

## Historical Endpoint Examples

The examples below document the original v2 proposal. Replace any `/api/v2/` prefix with `/api/v1/` to call the live API.

### Conversations API

#### Create Conversation

**Proposed v2 path:** `POST /api/v2/conversations`  
**Live path:** `POST /api/v1/conversations`

```bash
POST /api/v1/conversations
Authorization: Bearer as_live_...

{
  "external_id": "my-conversation-123",
  "title": "Chat about pricing",
  "metadata": { "source": "web" },
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi!" }
  ]
}
```

Response:
```json
{
  "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "external_id": "my-conversation-123",
  "title": "Chat about pricing",
  "metadata": { "source": "web" },
  "message_count": 2,
  "token_count": 0,
  "created_at": 1710000000000,
  "updated_at": 1710000000000
}
```

Messages are not included in the create response. Fetch separately if needed:
```bash
GET /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT?include=messages
```

---

#### List Conversations

**Live path:** `GET /api/v1/conversations`

```bash
GET /api/v1/conversations?limit=50&cursor=1710000000000&order=desc
Authorization: Bearer as_live_...
```

Response:
```json
{
  "data": [
    {
      "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
      "project_id": "abc123",
      "title": "Chat about pricing",
      "message_count": 5,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "pagination": {
    "limit": 50,
    "next_cursor": "1709999900000",
    "total": 150
  }
}
```

---

#### Get Conversation

**Live path:** `GET /api/v1/conversations/:id`

```bash
# Metadata only (default)
GET /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...

# With messages
GET /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT?include=messages
Authorization: Bearer as_live_...
```

---

#### Update Conversation

**Live path:** `PATCH /api/v1/conversations/:id`

```bash
PATCH /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...

{
  "title": "Updated title",
  "metadata": { "category": "sales" }
}
```

---

#### Delete Conversation

**Live path:** `DELETE /api/v1/conversations/:id`

```bash
DELETE /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...
```

---

#### Search Conversations

**Live path:** `GET /api/v1/conversations/search`

```bash
GET /api/v1/conversations/search?q=pricing&limit=20
Authorization: Bearer as_live_...
```

---

### Messages API

#### Append Messages

**Live path:** `POST /api/v1/conversations/:id/messages`

```bash
POST /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT/messages
Authorization: Bearer as_live_...

{
  "messages": [
    { "role": "user", "content": "What's new?" },
    { "role": "assistant", "content": "Lots of things!" }
  ]
}
```

---

#### List Messages

**Live path:** `GET /api/v1/conversations/:id/messages`

```bash
GET /api/v1/conversations/V1StGXR8_Z5jdHi6B-myT/messages?limit=100&after=msg123
Authorization: Bearer as_live_...
```

---

### Projects API

**Live paths:** `GET|POST /api/v1/projects`, `GET|PATCH|DELETE /api/v1/projects/:id`

```bash
# Create
POST /api/v1/projects
Authorization: Bearer as_live_...

{
  "name": "My App",
  "slug": "my-app",
  "org_id": "org_123"
}
```

Response:
```json
{
  "project": {
    "project_id": "proj_abc123",
    "org_id": "org_xyz",
    "name": "My App",
    "slug": "my-app",
    "created_at": 1710000000000,
    "updated_at": 1710000000000
  },
  "api_key": {
    "key_id": "key_abc123",
    "name": "Default",
    "key_prefix": "as_live_xxxx",
    "key": "as_live_full_key...",
    "created_at": 1710000000000
  }
}
```

---

### API Keys

**Live paths:** `POST|GET /api/projects/:projectId/keys`, `DELETE /api/projects/:projectId/keys/:keyId`

```bash
# Create key
POST /api/projects/proj_abc/keys
Authorization: Bearer as_live_...

{ "name": "Production Key" }

# List keys
GET /api/projects/proj_abc/keys
Authorization: Bearer as_live_...

# Revoke key
DELETE /api/projects/proj_abc/keys/key_xyz
Authorization: Bearer as_live_...
```

---

### Analytics API

**Live paths:** `/api/v1/analytics/*`

```bash
GET /api/v1/analytics/summary?project_id=proj_abc&start=1710000000000&end=1710086400000
GET /api/v1/analytics/timeseries?project_id=proj_abc&metric=conversations&granularity=day
GET /api/v1/analytics/tags?project_id=proj_abc
```

---

## Code Examples

### TypeScript

```typescript
// Current live API (api/v1)
const response = await fetch("https://agentstate.app/api/v1/conversations", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello" }]
  })
});

const { conversation_id } = await response.json();
console.log("Conversation ID:", conversation_id);

// Fetch with messages when needed
const withMessages = await fetch(
  `https://agentstate.app/api/v1/conversations/${conversation_id}?include=messages`,
  { headers: { "Authorization": `Bearer ${apiKey}` } }
);
const { messages } = await withMessages.json();
```

### Python

```python
import httpx

client = httpx.Client(
    base_url="https://agentstate.app/api/v1",
    headers={"Authorization": f"Bearer {api_key}"}
)

# Create conversation
response = client.post("/conversations", json={
    "messages": [{"role": "user", "content": "Hello"}]
})
conversation_id = response.json()["conversation_id"]

# Fetch with messages if needed
response = client.get(f"/conversations/{conversation_id}?include=messages")
messages = response.json()["messages"]

# Update with PATCH
client.patch(f"/conversations/{conversation_id}", json={
    "title": "New Title"
})
```

---

## Additional Resources

- [API Reference](./api-reference.md) — Complete live API documentation
- [Integration Guide](./integration.md) — Framework-specific examples

---

**Last Updated:** June 2026  
**Status:** Historical reference — v2 proposal merged into v1
