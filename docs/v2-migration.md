# API v2 Migration Guide

This guide helps you migrate from API v1 to v2. V2 introduces improved consistency, better performance, and clearer semantics.

**Deprecation Timeline:**
- **Sunset Date**: December 31, 2026
- **Status**: V1 remains fully functional until sunset
- **Action Required**: Plan your migration before the sunset date

**Deprecation Headers:**
All V1 responses include these headers:
```
Deprecation: true
Sunset: Fri, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.agentstate.app/api/v2/migration>; rel="deprecation"
```

---

## Quick Reference: What Changed?

| Area | V1 | V2 | Change |
|------|----|----|--------|
| **Base URL** | `/v1/*` | `/api/v2/*` | New base path |
| **HTTP Method** | `PUT` for updates | `PATCH` for updates | Semantic correctness |
| **Response Fields** | `id` | `{resource}_id` | Explicit resource names |
| **List Responses** | No total count | Includes `total` | Better pagination info |
| **Create Response** | Includes messages | Excludes messages | Performance optimization |
| **Get Conversation** | Includes messages by default | Excludes by default | Use `?include=messages` |
| **Field Selection** | `?fields=...` | `?include=...` | More intuitive syntax |

---

## Endpoint Changes

### Base URL

**V1:**
```
https://agentstate.app/api/v1/...
https://agentstate.app/v1/...
```

**V2:**
```
https://agentstate.app/api/v2/...
```

All V2 endpoints use `/api/v2/` as the base path.

---

## Conversations API

### Create Conversation

**V1 Request:**
```bash
POST /v1/conversations
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

**V1 Response:**
```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "external_id": "my-conversation-123",
  "title": "Chat about pricing",
  "metadata": { "source": "web" },
  "message_count": 2,
  "token_count": 0,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    { "id": "msg1", "role": "user", "content": "Hello", ... },
    { "id": "msg2", "role": "assistant", "content": "Hi!", ... }
  ]
}
```

**V2 Request:**
```bash
POST /api/v2/conversations
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

**V2 Response:**
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

**Key Changes:**
- Response field `id` → `conversation_id`
- Messages array NOT included in response (performance optimization)
- If you need messages, fetch via `GET /api/v2/conversations/:id?include=messages`

---

### List Conversations

**V1 Request:**
```bash
GET /v1/conversations?limit=50&cursor=1710000000000&order=desc
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "data": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "project_id": "abc123",
      "title": "Chat about pricing",
      "message_count": 5,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "pagination": {
    "limit": 50,
    "next_cursor": "1709999900000"
  }
}
```

**V2 Request:**
```bash
GET /api/v2/conversations?limit=50&cursor=1710000000000&order=desc
Authorization: Bearer as_live_...
```

**V2 Response:**
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

**Key Changes:**
- Response field `id` → `conversation_id`
- New `pagination.total` field for total conversation count

---

### Get Conversation

**V1 Request:**
```bash
GET /v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...
```

**V1 Response (includes messages by default):**
```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "title": "Chat about pricing",
  "message_count": 2,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    { "id": "msg1", "role": "user", "content": "Hello", ... }
  ]
}
```

**V1 Alternative (exclude messages):**
```bash
GET /v1/conversations/V1StGXR8_Z5jdHi6B-myT?fields=!messages
```

**V2 Request (conversation metadata only):**
```bash
GET /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "title": "Chat about pricing",
  "message_count": 2,
  "created_at": 1710000000000,
  "updated_at": 1710000000000
}
```

**V2 Request (include messages):**
```bash
GET /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT?include=messages
```

**V2 Response (with messages):**
```json
{
  "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "title": "Chat about pricing",
  "message_count": 2,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    { "id": "msg1", "role": "user", "content": "Hello", ... }
  ]
}
```

**Key Changes:**
- Response field `id` → `conversation_id`
- Messages excluded by default (use `?include=messages` to include)
- V1's `?fields=!messages` → V2's default behavior (no param needed)

---

### Update Conversation

**V1 Request:**
```bash
PUT /v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...

{
  "title": "Updated title",
  "metadata": { "category": "sales" }
}
```

**V2 Request:**
```bash
PATCH /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...

{
  "title": "Updated title",
  "metadata": { "category": "sales" }
}
```

**Key Changes:**
- HTTP method `PUT` → `PATCH` (semantic correctness for partial updates)
- Request/response field `id` → `conversation_id`

---

### Delete Conversation

**V1 Request:**
```bash
DELETE /v1/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...
```

**V2 Request:**
```bash
DELETE /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT
Authorization: Bearer as_live_...
```

**Key Changes:**
- Base URL change only (behavior identical)

---

### Search Conversations

**V1 Request:**
```bash
GET /v1/conversations/search?q=pricing&limit=20
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "data": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "title": "Chat about pricing",
      "snippet": "...matching text...",
      "message_count": 5,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "next_cursor": null
}
```

**V2 Request:**
```bash
GET /api/v2/conversations/search?q=pricing&limit=20
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "data": [
    {
      "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
      "title": "Chat about pricing",
      "snippet": "...matching text...",
      "message_count": 5,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "pagination": {
    "limit": 20,
    "next_cursor": null
  }
}
```

**Key Changes:**
- Response field `id` → `conversation_id`
- Pagination wrapped in `pagination` object (consistent with list endpoint)

---

## Messages API

### Append Messages

**V1 Request:**
```bash
POST /v1/conversations/V1StGXR8_Z5jdHi6B-myT/messages
Authorization: Bearer as_live_...

{
  "messages": [
    { "role": "user", "content": "What's new?" },
    { "role": "assistant", "content": "Lots of things!" }
  ]
}
```

**V2 Request:**
```bash
POST /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT/messages
Authorization: Bearer as_live_...

{
  "messages": [
    { "role": "user", "content": "What's new?" },
    { "role": "assistant", "content": "Lots of things!" }
  ]
}
```

**Key Changes:**
- Base URL change only (behavior identical)

---

### List Messages

**V1 Request:**
```bash
GET /v1/conversations/V1StGXR8_Z5jdHi6B-myT/messages?limit=100&after=msg123
Authorization: Bearer as_live_...
```

**V2 Request:**
```bash
GET /api/v2/conversations/V1StGXR8_Z5jdHi6B-myT/messages?limit=100&after=msg123
Authorization: Bearer as_live_...
```

**Key Changes:**
- Base URL change only (behavior identical)

---

## Projects API

### Create Project

**V1 Request:**
```bash
POST /v1/projects
Authorization: Bearer as_live_...

{
  "name": "My App",
  "slug": "my-app",
  "org_id": "org_123"
}
```

**V1 Response:**
```json
{
  "project": {
    "id": "proj_abc123",
    "org_id": "org_xyz",
    "name": "My App",
    "slug": "my-app",
    "created_at": 1710000000000
  },
  "api_key": {
    "id": "key_abc123",
    "name": "Default",
    "key_prefix": "as_live_xxxx",
    "key": "as_live_full_key...",
    "created_at": 1710000000000
  }
}
```

**V2 Request:**
```bash
POST /api/v2/projects
Authorization: Bearer as_live_...

{
  "name": "My App",
  "slug": "my-app",
  "org_id": "org_123"
}
```

**V2 Response:**
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

**Key Changes:**
- `project.id` → `project.project_id`
- `project.updated_at` added (for consistency)
- `api_key.id` → `api_key.key_id`

---

### List Projects

**V1 Request:**
```bash
GET /v1/projects?org_id=default
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "data": [
    {
      "id": "proj_abc123",
      "org_id": "org_xyz",
      "name": "My App",
      "slug": "my-app",
      "created_at": 1710000000000,
      "key_count": 2
    }
  ]
}
```

**V2 Request:**
```bash
GET /api/v2/projects?org_id=default&limit=50&cursor=1710000000000
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "data": [
    {
      "project_id": "proj_abc123",
      "org_id": "org_xyz",
      "name": "My App",
      "slug": "my-app",
      "created_at": 1710000000000,
      "key_count": 2
    }
  ],
  "pagination": {
    "limit": 50,
    "next_cursor": null,
    "total": 5
  }
}
```

**Key Changes:**
- `id` → `project_id`
- Now supports pagination (`limit`, `cursor` params)
- Includes `pagination.total` for total project count

---

### Get Project

**V1 Request:**
```bash
GET /v1/projects/proj_abc123
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "id": "proj_abc123",
  "org_id": "org_xyz",
  "name": "My App",
  "slug": "my-app",
  "created_at": 1710000000000,
  "api_keys": [
    {
      "id": "key_abc123",
      "name": "Default",
      "key_prefix": "as_live_xxxx",
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

**V2 Request:**
```bash
GET /api/v2/projects/proj_abc123
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "project_id": "proj_abc123",
  "org_id": "org_xyz",
  "name": "My App",
  "slug": "my-app",
  "created_at": 1710000000000,
  "api_keys": [
    {
      "key_id": "key_abc123",
      "name": "Default",
      "key_prefix": "as_live_xxxx",
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

**Key Changes:**
- `id` → `project_id`
- `api_keys[].id` → `api_keys[].key_id`

---

### Update Project

**V1 Request:**
```bash
PATCH /v1/projects/proj_abc123
Authorization: Bearer as_live_...

{
  "name": "Updated App Name"
}
```

**V2 Request:**
```bash
PATCH /api/v2/projects/proj_abc123
Authorization: Bearer as_live_...

{
  "name": "Updated App Name"
}
```

**Key Changes:**
- Base URL change only
- Response includes `updated_at` field

---

### Delete Project

**V1 Request:**
```bash
DELETE /v1/projects/proj_abc123
Authorization: Bearer as_live_...
```

**V2 Request:**
```bash
DELETE /api/v2/projects/proj_abc123
Authorization: Bearer as_live_...
```

**Key Changes:**
- Base URL change only (behavior identical)

---

## Analytics API

### Summary Statistics

**V1 Request:**
```bash
GET /v1/analytics/summary?project_id=proj_abc&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "total_conversations": 150,
  "total_messages": 2250,
  "total_tokens": 180000,
  "avg_messages_per_conversation": 15.0,
  "avg_tokens_per_conversation": 1200.0,
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  }
}
```

**V2 Request:**
```bash
GET /api/v2/analytics/summary?project_id=proj_abc&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "project_id": "proj_abc",
  "total_conversations": 150,
  "total_messages": 2250,
  "total_tokens": 180000,
  "avg_messages_per_conversation": 15.0,
  "avg_tokens_per_conversation": 1200.0,
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  }
}
```

**Key Changes:**
- Added `project_id` field to response

---

### Time Series Data

**V1 Request:**
```bash
GET /v1/analytics/timeseries?project_id=proj_abc&metric=conversations&granularity=day&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "metric": "conversations",
  "granularity": "day",
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  },
  "data": [
    { "bucket": "2024-01-01", "value": 15 },
    { "bucket": "2024-01-02", "value": 18 }
  ]
}
```

**V2 Request:**
```bash
GET /api/v2/analytics/timeseries?project_id=proj_abc&metric=conversations&granularity=day&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "project_id": "proj_abc",
  "metric": "conversations",
  "granularity": "day",
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  },
  "data": [
    { "bucket": "2024-01-01", "value": 15 },
    { "bucket": "2024-01-02", "value": 18 }
  ]
}
```

**Key Changes:**
- Added `project_id` field to response

---

### Tag Statistics

**V1 Request:**
```bash
GET /v1/analytics/tags?project_id=proj_abc&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  },
  "data": [
    { "tag": "support", "conversation_count": 45, "message_count": 675, "token_count": 54000 }
  ]
}
```

**V2 Request:**
```bash
GET /api/v2/analytics/tags?project_id=proj_abc&start=1710000000000&end=1710086400000
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "project_id": "proj_abc",
  "period": {
    "start": 1710000000000,
    "end": 1710086400000
  },
  "data": [
    { "tag": "support", "conversation_count": 45, "message_count": 675, "token_count": 54000 }
  ]
}
```

**Key Changes:**
- Added `project_id` field to response

---

## API Keys API

### Create API Key

**V1 Request:**
```bash
POST /api/projects/proj_abc/keys
Authorization: Bearer as_live_...

{
  "name": "Production Key"
}
```

**V1 Response:**
```json
{
  "id": "key_xyz",
  "name": "Production Key",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key...",
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

**V2 Request:**
```bash
POST /api/v2/keys
Authorization: Bearer as_live_...

{
  "name": "Production Key"
}
```

**V2 Response:**
```json
{
  "key_id": "key_xyz",
  "project_id": "proj_abc",
  "name": "Production Key",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key...",
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

**Key Changes:**
- URL path: `/api/projects/:id/keys` → `/api/v2/keys` (project inferred from API key)
- `id` → `key_id`
- Added `project_id` field

---

### List API Keys

**V1 Request:**
```bash
GET /api/projects/proj_abc/keys
Authorization: Bearer as_live_...
```

**V1 Response:**
```json
{
  "data": [
    {
      "id": "key_xyz",
      "name": "Default",
      "key_prefix": "as_live_xxxx",
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

**V2 Request:**
```bash
GET /api/v2/keys
Authorization: Bearer as_live_...
```

**V2 Response:**
```json
{
  "data": [
    {
      "key_id": "key_xyz",
      "project_id": "proj_abc",
      "name": "Default",
      "key_prefix": "as_live_xxxx",
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

**Key Changes:**
- URL path: `/api/projects/:id/keys` → `/api/v2/keys`
- `id` → `key_id`
- Added `project_id` field

---

### Revoke API Key

**V1 Request:**
```bash
DELETE /api/projects/proj_abc/keys/key_xyz
Authorization: Bearer as_live_...
```

**V2 Request:**
```bash
DELETE /api/v2/keys/key_xyz
Authorization: Bearer as_live_...
```

**Key Changes:**
- URL path: `/api/projects/:id/keys/:keyId` → `/api/v2/keys/:id`
- Project inferred from API key (can only revoke keys for your own project)

---

## Migration Checklist

Use this checklist to ensure a complete migration:

### Step 1: Update Base URLs
- [ ] Replace `/v1/` with `/api/v2/` in all API calls
- [ ] Update `/api/` (conversations, keys) with `/api/v2/` prefix
- [ ] Verify all requests use the new base URL

### Step 2: Update Field Names
- [ ] `id` → `conversation_id` (conversation responses)
- [ ] `id` → `project_id` (project responses)
- [ ] `id` → `key_id` (API key responses)
- [ ] Update any code that references these fields

### Step 3: Handle HTTP Method Changes
- [ ] `PUT /v1/conversations/:id` → `PATCH /api/v2/conversations/:id`
- [ ] Update any HTTP client configurations

### Step 4: Update Message Fetching
- [ ] `GET /v1/conversations/:id` → `GET /api/v2/conversations/:id?include=messages`
- [ ] Remove `?fields=!messages` parameters (no longer needed)
- [ ] Add `?include=messages` when messages are needed

### Step 5: Update Create Response Handling
- [ ] Remove code expecting `messages` in create conversation response
- [ ] Add separate call to `GET ?include=messages` if needed

### Step 6: Handle Pagination Changes
- [ ] Add support for `pagination.total` field (new in V2)
- [ ] Update pagination UI/logic to use total count

### Step 7: Update Projects API Calls
- [ ] Project keys API: `/api/projects/:id/keys` → `/api/v2/keys`
- [ ] List projects: Add pagination support (`limit`, `cursor`)
- [ ] Update `api_keys` array to `api_keys[].key_id`

### Step 8: Update Analytics Response Handling
- [ ] Add support for `project_id` field in analytics responses

### Step 9: Test
- [ ] Test create conversation flow
- [ ] Test list conversations pagination
- [ ] Test get conversation with/without messages
- [ ] Test update conversation (PATCH method)
- [ ] Test all project operations
- [ ] Test analytics endpoints
- [ ] Test API key operations

### Step 10: Monitor
- [ ] Check for deprecation headers in V1 responses
- [ ] Monitor error rates during migration
- [ ] Have rollback plan ready if issues arise

---

## Code Examples

### TypeScript Example

**Before (V1):**
```typescript
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

const { id, messages } = await response.json();
console.log("Conversation ID:", id);
console.log("Messages:", messages); // Available in V1 response
```

**After (V2):**
```typescript
const response = await fetch("https://agentstate.app/api/v2/conversations", {
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
// Messages not included - fetch separately if needed

// Fetch with messages
const withMessages = await fetch(
  `https://agentstate.app/api/v2/conversations/${conversation_id}?include=messages`,
  {
    headers: { "Authorization": `Bearer ${apiKey}` }
  }
);
const { messages } = await withMessages.json();
console.log("Messages:", messages);
```

---

### Python Example

**Before (V1):**
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
data = response.json()
conversation_id = data["id"]
messages = data["messages"]  # Available in V1

# Update with PUT
client.put(f"/conversations/{conversation_id}", json={
    "title": "New Title"
})
```

**After (V2):**
```python
import httpx

client = httpx.Client(
    base_url="https://agentstate.app/api/v2",
    headers={"Authorization": f"Bearer {api_key}"}
)

# Create conversation
response = client.post("/conversations", json={
    "messages": [{"role": "user", "content": "Hello"}]
})
data = response.json()
conversation_id = data["conversation_id"]
# Messages not included

# Fetch with messages if needed
response = client.get(f"/conversations/{conversation_id}?include=messages")
messages = response.json()["messages"]

# Update with PATCH
client.patch(f"/conversations/{conversation_id}", json={
    "title": "New Title"
})
```

---

## Common Migration Patterns

### Pattern 1: Migrating Field Name Access

**Problem:** Code accesses `id` field directly from responses.

**Solution:** Create a helper function to normalize responses during migration:

```typescript
// Migration helper
function normalizeConversation(response: any) {
  // Handle both V1 and V2 responses
  return {
    ...response,
    id: response.conversation_id || response.id
  };
}

// Use in code
const raw = await fetchConversation();
const conv = normalizeConversation(raw);
console.log(conv.id); // Works with both V1 and V2
```

### Pattern 2: Conditional Message Fetching

**Problem:** Need messages only in certain code paths.

**Solution:** Use the `include` parameter:

```typescript
// Only conversation metadata
const metadata = await fetch(
  `/api/v2/conversations/${id}`,
  { headers: auth }
);

// Conversation with messages
const withMessages = await fetch(
  `/api/v2/conversations/${id}?include=messages`,
  { headers: auth }
);
```

### Pattern 3: Backward-Compatible Update Method

**Problem:** Supporting both V1 (PUT) and V2 (PATCH) during migration.

**Solution:** Detect version and use appropriate method:

```typescript
const apiVersion = "v2"; // Toggle during migration
const method = apiVersion === "v1" ? "PUT" : "PATCH";

await fetch(`${BASE_URL}/${apiVersion}/conversations/${id}`, {
  method,
  headers: auth,
  body: JSON.stringify({ title: "New title" })
});
```

---

## Breaking Changes Summary

| Category | Change | Impact |
|----------|--------|--------|
| **Base URL** | `/v1/` → `/api/v2/` | All API calls |
| **HTTP Method** | `PUT` → `PATCH` | Update operations |
| **Field Names** | `id` → `{resource}_id` | Response parsing |
| **Create Response** | Messages excluded | Create conversation flow |
| **Get Response** | Messages excluded by default | Fetch conversation flow |
| **Pagination** | Added `total` field | List operations |
| **Keys API** | Path changed to `/api/v2/keys` | Key management |

---

## Sunset and Deprecation

**V1 Sunset Date:** December 31, 2026

**What happens at sunset:**
- V1 endpoints will return `410 Gone` status
- All V1 traffic must be migrated to V2

**Deprecation Headers (current):**
```
Deprecation: true
Sunset: Fri, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.agentstate.app/api/v2/migration>; rel="deprecation"
```

**Recommended Migration Timeline:**
- **Now**: Start planning migration
- **Q1 2026**: Begin migration work
- **Q2 2026**: Complete migration and testing
- **Q3 2026**: Monitor and optimize
- **Q4 2026**: Sunset preparation

---

## Need Help?

If you encounter issues during migration:

1. Check this guide for relevant sections
2. Verify request/response formats match V2 specifications
3. Ensure all field names are updated
4. Confirm HTTP methods are correct (PATCH vs PUT)

For additional support, refer to:
- [API Reference](./api-reference.md) - Complete V1 documentation
- [Integration Guide](./integration.md) - Framework-specific examples

---

**Last Updated:** March 18, 2026
**API Version:** v2.0.0
