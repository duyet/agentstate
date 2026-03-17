# API Reference

Base URL: `https://agentstate.app/api`

Backward-compatible base: `https://agentstate.app` (routes under `/v1/*` mirror `/api/v1/*`).

## Authentication

All `/v1/conversations/*` and `/v1/tags` endpoints require a valid API key.

Pass the key as a Bearer token:

```
Authorization: Bearer as_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Key format**: `as_live_` prefix followed by 40 base62 characters.
Only the SHA-256 hash of the key is stored. The raw key is shown once at creation time.

Requests with a missing, malformed, or revoked key receive:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid API key" } }
```

Status: **401**

## Rate Limiting

All authenticated endpoints enforce a fixed-window rate limit per API key.

| Parameter | Value |
|-----------|-------|
| Limit | 100 requests per minute |
| Window | 60 seconds (UTC-minute boundary) |

Every response includes rate-limit headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window (100) |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the window resets |
| `Retry-After` | Seconds until the window resets (only on 429) |

When exceeded:

```json
{ "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded. Maximum 100 requests per minute. Retry after N seconds." } }
```

Status: **429**

## Request Tracing

Every response includes an `X-Request-Id` header. You can pass your own `X-Request-Id` on the request (alphanumeric, hyphens, underscores, 1-64 chars); otherwise the server generates one. Use this value when reporting issues.

## Error Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "MACHINE_CODE",
    "message": "Human-readable description"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid JSON body or validation failure |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Key valid but not authorized for this resource |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., external_id already exists) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Conventions

- **Field names**: snake_case in all request and response bodies.
- **IDs**: nanoid, 21 characters (e.g., `V1StGXR8_Z5jdHi6B-myT`).
- **Timestamps**: Unix milliseconds (`Date.now()` format), stored as integers.
- **Pagination**: Cursor-based. Never offset-based. Pass `cursor` to get the next page; when `next_cursor` is `null`, there are no more results.
- **Metadata**: Arbitrary JSON object. Stored as serialized TEXT, parsed on read.

---

## Conversations API

All conversation endpoints require API key authentication.

### Create Conversation

```
POST /v1/conversations
```

Creates a new conversation, optionally with initial messages.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `external_id` | string | No | Caller-provided identifier. Must be unique within the project. |
| `title` | string | No | Conversation title. |
| `metadata` | object | No | Arbitrary key-value pairs. |
| `messages` | array | No | Initial messages to attach. |

Each message object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | One of: `system`, `user`, `assistant`, `tool`. |
| `content` | string | Yes | Message content (min 1 character). |
| `metadata` | object | No | Arbitrary key-value pairs. |
| `token_count` | integer | No | Non-negative integer. Defaults to 0. |

**Response:** `201 Created`

```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "external_id": null,
  "title": null,
  "metadata": null,
  "message_count": 1,
  "token_count": 0,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    {
      "id": "xYz789_AbCdEfGhIjKlM",
      "role": "user",
      "content": "Hello",
      "metadata": null,
      "token_count": 0,
      "created_at": 1710000000000
    }
  ]
}
```

**Errors:**
- `400 BAD_REQUEST` -- Invalid body or validation failure.
- `409 CONFLICT` -- A conversation with the given `external_id` already exists.

### List Conversations

```
GET /v1/conversations
```

Returns conversations for the authenticated project, ordered by `updated_at`.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (1-100). |
| `cursor` | string | -- | `updated_at` timestamp from `next_cursor` of a previous response. |
| `order` | string | `desc` | Sort direction: `asc` or `desc`. |
| `tag` | string | -- | Filter to conversations that have this tag. |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "project_id": "abc123",
      "external_id": null,
      "title": "My conversation",
      "metadata": null,
      "message_count": 5,
      "token_count": 120,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "pagination": {
    "limit": 50,
    "next_cursor": "1710000000000"
  }
}
```

`next_cursor` is `null` when there are no more pages.

### Get Conversation

```
GET /v1/conversations/:id
```

Returns a single conversation with all its messages.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fields` | string | all | Comma-separated field names to include. Special: `!messages` excludes messages array. |

**Valid fields**: `id`, `project_id`, `external_id`, `title`, `metadata`, `message_count`, `token_count`, `created_at`, `updated_at`, `messages`

**Examples:**

```bash
# Get only conversation metadata (no messages)
GET /v1/conversations/:id?fields=id,title,updated_at

# Exclude messages array
GET /v1/conversations/:id?fields=!messages

# Get all fields (default behavior)
GET /v1/conversations/:id
```

**Performance**: When `messages` is excluded, the database query for messages is skipped entirely, significantly reducing response time and bandwidth for conversations with many messages.

**Response:** `200 OK`

```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "external_id": null,
  "title": "My conversation",
  "metadata": null,
  "message_count": 2,
  "token_count": 50,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello",
      "metadata": null,
      "token_count": 5,
      "created_at": 1710000000000
    }
  ]
}
```

**Errors:**
- `400 BAD_REQUEST` -- Invalid field name specified.
- `404 NOT_FOUND` -- Conversation not found.

### Lookup by External ID

```
GET /v1/conversations/by-external-id/:externalId
```

Find a conversation by the caller-provided `external_id`. Returns the conversation with all messages.

Response shape is identical to [Get Conversation](#get-conversation).

**Errors:** `404 NOT_FOUND`

### Search Conversations

```
GET /v1/conversations/search
```

Full-text search across message content. Returns matching conversations with a text snippet showing the match context.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | -- | **Required.** Search query. |
| `limit` | integer | 20 | Results per page (1-100). |
| `cursor` | string | -- | `updated_at` timestamp from `next_cursor` of a previous response. |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "title": "My conversation",
      "snippet": "...matching text around the query...",
      "message_count": 5,
      "created_at": 1710000000000,
      "updated_at": 1710000000000
    }
  ],
  "next_cursor": null
}
```

**Errors:** `400 BAD_REQUEST` -- Missing or empty `q` parameter.

### Conversation Analytics

```
GET /v1/conversations/:id/analytics
```

Returns analytics data for a specific conversation, including message counts, token counts, role breakdown, tag usage, and duration.

**Response:** `200 OK`

```json
{
  "conversation_id": "V1StGXR8_Z5jdHi6B-myT",
  "title": "My conversation",
  "message_count": 15,
  "token_count": 1250,
  "tags": ["support", "sales"],
  "duration_ms": 1800000,
  "messages_by_role": {
    "user": {
      "count": 10,
      "tokens": 850
    },
    "assistant": {
      "count": 5,
      "tokens": 400
    }
  },
  "created_at": 1710000000000,
  "updated_at": 1710086400000
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | string | Conversation ID |
| `title` | string | Conversation title |
| `message_count` | integer | Total number of messages |
| `token_count` | integer | Total tokens across all messages |
| `tags` | array of strings | Tags attached to this conversation |
| `duration_ms` | integer | Conversation duration in milliseconds |
| `messages_by_role` | object | Breakdown of messages and tokens by role |
| `created_at` | integer | Creation timestamp (unix ms) |
| `updated_at` | integer | Last update timestamp (unix ms) |

**Errors:**
- `404 NOT_FOUND` — Conversation not found

### Update Conversation

```
PUT /v1/conversations/:id
```

Update a conversation's title and/or metadata.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | New title. |
| `metadata` | object | No | Replaces existing metadata entirely. |

**Response:** `200 OK`

Returns the updated conversation object (same shape as list items, without messages).

**Errors:** `404 NOT_FOUND`

### Delete Conversation

```
DELETE /v1/conversations/:id
```

Deletes a conversation and all its messages.

**Response:** `204 No Content`

**Errors:** `404 NOT_FOUND`

### Bulk Delete

```
POST /v1/conversations/bulk-delete
```

Delete multiple conversations and their messages in a single request.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | string[] | Yes | Conversation IDs to delete (1-100 items). |

**Response:** `200 OK`

```json
{ "deleted": 3 }
```

The `deleted` count reflects only conversations that existed and belonged to the authenticated project.

### Export Conversations

```
POST /v1/conversations/export
```

Export conversations with their full message history.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | string[] | No | Specific conversation IDs to export (max 100). Omit to export the most recent 100. |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "project_id": "abc123",
      "external_id": null,
      "title": "My conversation",
      "metadata": null,
      "message_count": 2,
      "token_count": 50,
      "created_at": 1710000000000,
      "updated_at": 1710000000000,
      "messages": [
        {
          "id": "msg_001",
          "role": "user",
          "content": "Hello",
          "metadata": null,
          "token_count": 5,
          "created_at": 1710000000000
        }
      ]
    }
  ],
  "count": 1
}
```

Messages are capped at 5000 total across all exported conversations.

---

## Messages API

Manage messages within an existing conversation. All endpoints require API key authentication.

### Append Messages

```
POST /v1/conversations/:id/messages
```

Add one or more messages to an existing conversation. Automatically updates the conversation's `message_count`, `token_count`, and `updated_at`.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | array | Yes | At least 1 message. Same schema as [Create Conversation](#create-conversation) messages. |

**Response:** `201 Created`

```json
{
  "messages": [
    {
      "id": "xYz789_AbCdEfGhIjKlM",
      "role": "assistant",
      "content": "Hi there!",
      "metadata": null,
      "token_count": 10,
      "created_at": 1710000000000
    }
  ]
}
```

**Errors:** `404 NOT_FOUND` -- Conversation does not exist.

### List Messages

```
GET /v1/conversations/:id/messages
```

Paginate through messages in chronological order.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 100 | Results per page (1-500). |
| `after` | string | -- | Message ID to start after (cursor). |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello",
      "metadata": null,
      "token_count": 5,
      "created_at": 1710000000000
    }
  ],
  "pagination": {
    "limit": 100,
    "next_cursor": "msg_001"
  }
}
```

`next_cursor` is the ID of the last message in the page. Pass it as the `after` parameter for the next page. `null` when there are no more results.

**Errors:** `404 NOT_FOUND` -- Conversation does not exist.

---

## Tags API

All tag endpoints require API key authentication.

### List Project Tags

```
GET /v1/tags
```

Returns all unique tags used across the authenticated project's conversations.

**Response:** `200 OK`

```json
{
  "data": {
    "tags": ["bug", "feature", "support"]
  }
}
```

### Get Conversation Tags

```
GET /v1/conversations/:id/tags
```

Returns tags attached to a specific conversation.

**Response:** `200 OK`

```json
{
  "data": {
    "tags": ["bug", "urgent"]
  }
}
```

**Errors:** `404 NOT_FOUND`

### Add Tags

```
POST /v1/conversations/:id/tags
```

Add tags to a conversation. Duplicate tags are silently ignored.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tags` | string[] | Yes | Tag names (1-50 items, each 1-64 characters). |

**Response:** `201 Created`

Returns the full list of tags now on the conversation (including previously existing ones):

```json
{
  "data": {
    "tags": ["bug", "feature", "urgent"]
  }
}
```

**Errors:** `404 NOT_FOUND`

### Remove Tag

```
DELETE /v1/conversations/:id/tags/:tag
```

Remove a single tag from a conversation. No error if the tag was not present.

**Response:** `204 No Content`

**Errors:** `404 NOT_FOUND` -- Conversation does not exist.

---

## Public Analytics

Public analytics endpoints for project-wide statistics. All endpoints require API key authentication.

### Summary Statistics

```
GET /v1/analytics/summary
```

Returns summary statistics for a project, including total conversations, messages, tokens, and averages over a specified time period. Supports tag filtering.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | string | — | **Required.** Project ID (from API key) |
| `start` | integer | — | **Required.** Start timestamp (unix ms, inclusive) |
| `end` | integer | — | **Required.** End timestamp (unix ms, exclusive) |
| `tag` | string | — | Filter to conversations with this tag (can specify multiple times) |

**Response:** `200 OK`

```json
{
  "total_conversations": 150,
  "total_messages": 2250,
  "total_tokens": 180000,
  "avg_messages_per_conversation": 15.0,
  "avg_tokens_per_conversation": 1200.0,
  "period": {
    "start": 1704067200000,
    "end": 1704153600000
  }
}
```

### Time Series Data

```
GET /v1/analytics/timeseries
```

Returns time-series data for conversations, messages, or tokens grouped by the specified granularity.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | string | — | **Required.** Project ID (from API key) |
| `metric` | string | "conversations" | Metric to aggregate: `conversations`, `messages`, or `tokens` |
| `granularity` | string | "day" | Time grouping: `day`, `week`, or `month` |
| `start` | integer | — | **Required.** Start timestamp (unix ms, inclusive) |
| `end` | integer | — | **Required.** End timestamp (unix ms, exclusive) |
| `tag` | string | — | Filter to conversations with this tag (can specify multiple times) |

**Response:** `200 OK`

```json
{
  "metric": "conversations",
  "granularity": "day",
  "period": {
    "start": 1704067200000,
    "end": 1704153600000
  },
  "data": [
    {"bucket": "2024-01-01", "value": 15},
    {"bucket": "2024-01-02", "value": 18},
    {"bucket": "2024-01-03", "value": 12}
  ]
}
```

### Tag Statistics

```
GET /v1/analytics/tags
```

Returns usage statistics for tags within a specified time period.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | string | — | **Required.** Project ID (from API key) |
| `start` | integer | — | **Required.** Start timestamp (unix ms, inclusive) |
| `end` | integer | — | **Required.** End timestamp (unix ms, exclusive) |
| `limit` | integer | 50 | Maximum number of tags to return (1-200) |

**Response:** `200 OK`

```json
{
  "period": {
    "start": 1704067200000,
    "end": 1704153600000
  },
  "data": [
    {"tag": "support", "conversation_count": 45, "message_count": 675, "token_count": 54000},
    {"tag": "sales", "conversation_count": 32, "message_count": 480, "token_count": 38400},
    {"tag": "feedback", "conversation_count": 18, "message_count": 270, "token_count": 21600}
  ]
}
```

**Caching**

These endpoints use aggressive caching to reduce database load. Cached responses are served for:
- 1-7 day ranges: 60 seconds
- 8-30 day ranges: 180 seconds
- 30+ day ranges: 300 seconds

---

## AI Features

AI-powered endpoints using Cloudflare Workers AI. Require API key authentication.

### Generate Title

```
POST /v1/conversations/:id/generate-title
```

Generates a title from the conversation's first 20 messages and saves it to the conversation.

**Request body:** None.

**Response:** `200 OK`

```json
{ "title": "Discussion about API design" }
```

**Errors:** `404 NOT_FOUND`

### Generate Follow-up Questions

```
POST /v1/conversations/:id/follow-ups
```

Generates suggested follow-up questions based on the conversation's last 20 messages.

**Request body:** None.

**Response:** `200 OK`

```json
{ "questions": ["What are the performance implications?", "How does this handle errors?"] }
```

**Errors:** `404 NOT_FOUND`

---

## Projects API

Dashboard-internal endpoints for project management. These routes do **not** require API key authentication (they are called from the dashboard frontend, authenticated via Clerk session).

### Create Project

```
POST /v1/projects
```

Creates a new project and auto-generates a default API key.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project display name. |
| `slug` | string | Yes | URL-safe identifier. Lowercase alphanumeric and hyphens only. Must be unique within the organization. |
| `org_id` | string | No | Clerk organization ID. Defaults to `"default"`. |

**Response:** `201 Created`

```json
{
  "project": {
    "id": "proj_abc123",
    "org_id": "org_xyz",
    "name": "My Project",
    "slug": "my-project",
    "created_at": 1710000000000
  },
  "api_key": {
    "id": "key_abc123",
    "name": "Default",
    "key_prefix": "as_live_xxxx",
    "key": "as_live_full_key_shown_only_once",
    "created_at": 1710000000000
  }
}
```

**Errors:**
- `400 BAD_REQUEST` -- Validation failure.
- `409 CONFLICT` -- Slug already taken in this organization.

### List Projects

```
GET /v1/projects
```

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `org_id` | string | `"default"` | Clerk organization ID to filter by. |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "proj_abc123",
      "org_id": "org_xyz",
      "name": "My Project",
      "slug": "my-project",
      "created_at": 1710000000000,
      "key_count": 2
    }
  ]
}
```

### Get Project by ID

```
GET /v1/projects/:id
```

Returns the project with its API keys.

**Response:** `200 OK`

```json
{
  "id": "proj_abc123",
  "org_id": "org_xyz",
  "name": "My Project",
  "slug": "my-project",
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

**Errors:** `404 NOT_FOUND`

### Get Project by Slug

```
GET /v1/projects/by-slug/:slug
```

Same response shape as [Get Project by ID](#get-project-by-id).

**Errors:** `404 NOT_FOUND`

### List Project Conversations (Dashboard)

```
GET /v1/projects/:id/conversations
```

Returns conversations for a specific project (for dashboard display).

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (1-100). |

**Response:** `200 OK`

Same shape as [List Conversations](#list-conversations) `data` array, wrapped in `{ "data": [...] }`.

### List Conversation Messages (Dashboard)

```
GET /v1/projects/:id/conversations/:convId/messages
```

Returns up to 500 messages for a conversation within a project. Returns an empty array if the conversation is not found (does not 404).

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello",
      "metadata": null,
      "token_count": 5,
      "created_at": 1710000000000
    }
  ]
}
```

### Project Analytics

```
GET /v1/projects/:id/analytics
```

Usage analytics for a project.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `"30d"` | Time range: `7d`, `30d`, or `90d`. |

**Response:** `200 OK`

```json
{
  "summary": {
    "total_conversations": 150,
    "total_messages": 3200,
    "total_tokens": 450000,
    "active_api_keys": 2
  },
  "conversations_per_day": [
    { "date": "2026-03-15", "count": 12 }
  ],
  "messages_per_day": [
    { "date": "2026-03-15", "count": 45 }
  ],
  "tokens_per_day": [
    { "date": "2026-03-15", "total": 6800 }
  ],
  "recent_conversations": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "title": "Latest chat",
      "message_count": 10,
      "token_count": 1500,
      "updated_at": 1710000000000
    }
  ]
}
```

### Delete Project

```
DELETE /v1/projects/:id
```

Permanently deletes a project and all associated data, including:
- All conversations in the project
- All messages in those conversations
- All API keys for the project
- All tags on conversations

**Caution**: This operation is irreversible. All data will be permanently deleted.

**Response:** `204 No Content`

**Errors:**
- `404 NOT_FOUND` — Project not found

**Cascading Deletes**:
- When a project is deleted, all conversations are deleted
- When conversations are deleted, all their messages are deleted
- API keys and tags are also deleted
- Foreign key constraints handle the cleanup automatically

---

## API Key Management

Two sets of key management endpoints exist:

1. **Authenticated** (`/api/projects/:projectId/keys`) -- requires a valid API key. The caller can only manage keys for the project their key belongs to.
2. **Dashboard** (`/v1/projects/:id/keys`) -- used by the dashboard frontend. Authenticated via Clerk session, not API key.

Both sets share the same request/response shapes.

### Create API Key

```
POST /api/projects/:projectId/keys       # Authenticated
POST /v1/projects/:id/keys               # Dashboard
```

Creates a new API key for the project.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Key display name (1-255 characters). |

**Response:** `201 Created`

```json
{
  "id": "key_abc123",
  "name": "Production",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key_shown_only_once",
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

The `key` field contains the full API key and is only returned at creation time. Store it securely.

**Errors:**
- `403 FORBIDDEN` -- Attempting to create a key for a different project (authenticated route only).
- `404 NOT_FOUND` -- Project does not exist (dashboard route only).

### List API Keys

```
GET /api/projects/:projectId/keys        # Authenticated
```

Lists all API keys for the project (including revoked ones).

**Response:** `200 OK`

```json
{
  "data": [
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

The full key is never returned after creation.

**Errors:**
- `403 FORBIDDEN` -- Attempting to list keys for a different project.

### Revoke API Key

```
DELETE /api/projects/:projectId/keys/:keyId    # Authenticated
DELETE /v1/projects/:id/keys/:keyId            # Dashboard
```

Soft-deletes an API key by setting `revoked_at`. The key immediately becomes invalid for authentication.

**Response:** `204 No Content`

**Errors:**
- `403 FORBIDDEN` -- Attempting to revoke a key for a different project (authenticated route only).

---

## Health Check

```
GET /api
```

No authentication required.

**Response:** `200 OK`

```json
{ "name": "agentstate", "version": "0.1.0", "status": "ok" }
```

## Machine-Readable Endpoints

```
GET /llms.txt        # LLM-readable project summary
GET /agents.md       # Agent-readable documentation
GET /openapi.json    # OpenAPI 3.x specification
```

No authentication required. These endpoints return plain text, markdown, and JSON respectively.
