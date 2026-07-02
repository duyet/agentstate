# API Reference

Base URL: `https://agentstate.app/api`

Backward-compatible base: `https://agentstate.app` (routes under `/v1/*` mirror `/api/v1/*`).

## Version Overview

### API (`/api/v1/*`)

- **Snake_case field names**: All request and response fields use snake_case.
- **Timestamps in milliseconds**: All timestamps are Unix milliseconds (`Date.now()` format).
- **Cursor-based pagination**: List endpoints page with `cursor` / `next_cursor`. (The State Platform query endpoints additionally return a `total` count; conversation, message, and project lists do not.)
- **Field selection**: `GET /api/v1/conversations/:id` returns its messages by default. Use the `fields` query param to project or exclude fields (for example `?fields=!messages` to skip the messages array).
- **Update semantics**: Conversations are updated with `PUT`; projects are updated with `PATCH`.

### Path aliases (`/v1/*`)

Conversations, tags, and public analytics are also served under the legacy `/v1/*` prefix (without `/api`). These map to the **same handlers** as `/api/v1/*` with identical behavior — the `/v1/*` prefix is a deprecated alias. Prefer `/api/v1/*`. Projects, keys, and the State Platform are only available under `/api/v1/*`.

---

## Conventions

- **Field names**: snake_case in all request and response bodies.
- **IDs**: nanoid, 21 characters (e.g., `V1StGXR8_Z5jdHi6B-myT`).
- **Timestamps**: Unix milliseconds (`Date.now()` format), stored as integers.
- **Pagination**: Cursor-based. Never offset-based. Pass `cursor` to get the next page; when `next_cursor` is `null`, there are no more results.
- **Metadata**: Arbitrary JSON object. Stored as serialized TEXT, parsed on read.

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

## Caching Behavior

Several endpoints use caching to improve performance and reduce database load. Cached responses may be served for a period of time after the initial request.

### Auth Cache

API key lookups are cached for 60 seconds. This reduces database load on frequently-used keys while maintaining near-real-time updates when keys are created or revoked.

### Analytics Endpoints

Analytics endpoints use aggressive caching with time-based TTLs:

| Time Range | Cache TTL |
|------------|-----------|
| 1-7 days | 60 seconds |
| 8-30 days | 180 seconds |
| 30+ days | 300 seconds |

This applies to:
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/timeseries`
- `GET /api/v1/analytics/tags`
- `GET /api/v1/conversations/:id/analytics`
- `GET /api/v1/projects/:id/analytics`

### Data Freshness

Cached responses may reflect data from up to the TTL ago. For most use cases, this delay is acceptable and provides significant performance benefits:

- **Reduced database load**: Fewer queries for expensive aggregations
- **Faster responses**: Cached data is served directly from memory
- **Lower latency**: Especially beneficial for analytics over large time ranges

If you need absolutely real-time data, consider:
- Using shorter time ranges for analytics queries (lower TTL)
- Making individual conversation fetches instead of aggregate analytics

## Conventions

- **Field names**: snake_case in all request and response bodies.
- **IDs**: nanoid, 21 characters (e.g., `V1StGXR8_Z5jdHi6B-myT`).
- **Timestamps**: Unix milliseconds (`Date.now()` format), stored as integers.
- **Pagination**: Cursor-based. Never offset-based. Pass `cursor` to get the next page; when `next_cursor` is `null`, there are no more results.
- **Metadata**: Arbitrary JSON object. Stored as serialized TEXT, parsed on read.

---

## API Reference

All endpoints require API key authentication and are located at `/api/v1/*`.

### Authentication

Pass the key as a Bearer token:

```
Authorization: Bearer as_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Key format**: `as_live_` prefix followed by 40 base62 characters.
Only the SHA-256 hash of the key is stored. The raw key is shown once at creation time.

### Rate Limiting

All endpoints enforce a fixed-window rate limit per API key.

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

### Error Format

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
| `INVALID_CURSOR` | 400 | Invalid cursor parameter |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Key valid but not authorized for this resource |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., external_id already exists) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

### Conversations API

All conversation endpoints require API key authentication.

#### Create Conversation

```
POST /api/v1/conversations
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
  "total_cost_microdollars": 0,
  "total_tokens": 0,
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

The response includes the initial `messages` array (any messages passed in the request body). Each message follows the [Message Object](#message-object) shape (abbreviated above).

**Errors:**
- `400 BAD_REQUEST` -- Invalid body or validation failure.
- `409 CONFLICT` -- A conversation with the given `external_id` already exists.

#### List Conversations

```
GET /api/v1/conversations
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
      "total_cost_microdollars": 0,
      "total_tokens": 120,
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

#### Get Conversation

```
GET /api/v1/conversations/:id
```

Returns a single conversation with its messages. Messages are included by default.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fields` | string | all | Comma-separated field names to include. Prefix a name with `!` to exclude it — e.g. `!messages` skips the (potentially large) messages array. |

**Valid fields**: `id`, `project_id`, `external_id`, `title`, `metadata`, `message_count`, `token_count`, `total_cost_microdollars`, `total_tokens`, `created_at`, `updated_at`, `messages`.

**Examples:**

```bash
# Get all fields including messages (default)
GET /api/v1/conversations/:id

# Exclude the messages array
GET /api/v1/conversations/:id?fields=!messages

# Return only specific fields
GET /api/v1/conversations/:id?fields=id,title,updated_at
```

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
  "total_cost_microdollars": 0,
  "total_tokens": 50,
  "created_at": 1710000000000,
  "updated_at": 1710000000000,
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello",
      "metadata": null,
      "token_count": 5,
      "model": null,
      "input_tokens": null,
      "output_tokens": null,
      "cost_microdollars": null,
      "parent_message_id": null,
      "observation_type": null,
      "start_time": null,
      "end_time": null,
      "status": null,
      "level": null,
      "created_at": 1710000000000
    }
  ]
}
```

**Performance**: When `messages` is excluded (`?fields=!messages`), the messages query is skipped entirely, reducing response time and bandwidth for conversations with many messages.

**Errors:**
- `400 INVALID_FIELD` -- Unknown field name in `fields`.
- `404 NOT_FOUND` -- Conversation not found.

#### Lookup by External ID

```
GET /api/v1/conversations/by-external-id/:externalId
```

Find a conversation by the caller-provided `external_id`. Messages are included by default.

Response shape is identical to [Get Conversation](#get-conversation), and the same `fields` query param is supported.

**Errors:** `404 NOT_FOUND`

#### Update Conversation

```
PUT /api/v1/conversations/:id
```

Update a conversation's title and/or metadata.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | New title. |
| `metadata` | object | No | Replaces existing metadata entirely. |

**Response:** `200 OK`

```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "project_id": "abc123",
  "external_id": null,
  "title": "Updated title",
  "metadata": { "key": "value" },
  "message_count": 2,
  "token_count": 50,
  "total_cost_microdollars": 0,
  "total_tokens": 50,
  "created_at": 1710000000000,
  "updated_at": 1710000080000
}
```

The response is the conversation object without the `messages` array.

**Errors:** `404 NOT_FOUND`

#### Delete Conversation

```
DELETE /api/v1/conversations/:id
```

Deletes a conversation and all its messages.

**Response:** `204 No Content`

**Errors:** `404 NOT_FOUND`

---

### Messages API

Manage messages within an existing conversation. All endpoints require API key authentication.

#### Message Object

Every message returned by the API (from any endpoint that includes messages) has the following shape. Fields appear in this order:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID (nanoid). |
| `role` | string | One of `system`, `user`, `assistant`, `tool`. |
| `content` | string | Message content. |
| `metadata` | object \| null | Arbitrary key-value pairs, or `null`. |
| `token_count` | integer | Total tokens for the message. Defaults to `0`. |
| `model` | string \| null | Model that produced the message. `null` unless recorded. |
| `input_tokens` | integer \| null | Prompt/input tokens. `null` unless recorded. |
| `output_tokens` | integer \| null | Completion/output tokens. `null` unless recorded. |
| `cost_microdollars` | integer \| null | Message cost in micro-dollars (millionths of a USD). `null` unless recorded. |
| `parent_message_id` | string \| null | Parent message ID for trace/observation trees. `null` for regular chat messages. |
| `observation_type` | string \| null | One of `generation`, `tool`, `agent`, `chain`, `span`, `event`. `null` for regular chat messages. |
| `start_time` | integer \| null | Observation start timestamp (unix ms). `null` for regular chat messages. |
| `end_time` | integer \| null | Observation end timestamp (unix ms). `null` for regular chat messages. |
| `status` | string \| null | One of `success`, `error`. `null` for regular chat messages. |
| `level` | string \| null | One of `debug`, `default`, `warning`, `error`. `null` for regular chat messages. |
| `created_at` | integer | Creation timestamp (unix ms). |

The `model`, `input_tokens`, `output_tokens`, and `cost_microdollars` fields capture LLM usage and cost. The `parent_message_id`, `observation_type`, `start_time`, `end_time`, `status`, and `level` fields support tracing/observation trees. All ten default to `null` for ordinary chat messages and are present on every message response.

#### Append Messages

```
POST /api/v1/conversations/:id/messages
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

Returns the created messages (each following the [Message Object](#message-object) shape, abbreviated above).

**Errors:** `404 NOT_FOUND` -- Conversation does not exist.

#### List Messages

```
GET /api/v1/conversations/:id/messages
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
      "model": null,
      "input_tokens": null,
      "output_tokens": null,
      "cost_microdollars": null,
      "parent_message_id": null,
      "observation_type": null,
      "start_time": null,
      "end_time": null,
      "status": null,
      "level": null,
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

### Analytics API

Analytics endpoints for project-wide statistics. All endpoints require API key authentication and use caching for performance.

#### Usage Summary

```
GET /api/v1/analytics/summary
```

Returns summary statistics for a project, including total conversations, messages, tokens, and averages over a specified time period. Supports tag filtering.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | integer | — | Start timestamp (unix ms, inclusive). Defaults to 30 days ago. |
| `end` | integer | — | End timestamp (unix ms, exclusive). Defaults to now. |
| `tag` | string | — | Filter to conversations with this tag (can specify multiple times). |

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

The project is derived from the API key — there is no `project_id` query parameter.

**Caching:**
- 1-7 day ranges: 60 seconds
- 8-30 day ranges: 180 seconds
- 30+ day ranges: 300 seconds

#### Time Series Data

```
GET /api/v1/analytics/timeseries
```

Returns time-series data for conversations, messages, or tokens grouped by the specified granularity.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `metric` | string | "conversations" | Metric to aggregate: `conversations`, `messages`, or `tokens`. |
| `granularity` | string | "day" | Time grouping: `day`, `week`, or `month`. |
| `start` | integer | — | Start timestamp (unix ms, inclusive). Defaults to 30 days ago. |
| `end` | integer | — | End timestamp (unix ms, exclusive). Defaults to now. |
| `tag` | string | — | Filter to conversations with this tag (can specify multiple times). |

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

**Caching:** Same as summary endpoint.

#### Tag Statistics

```
GET /api/v1/analytics/tags
```

Returns usage statistics for tags within a specified time period.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | integer | — | Start timestamp (unix ms, inclusive). Defaults to 30 days ago. |
| `end` | integer | — | End timestamp (unix ms, exclusive). Defaults to now. |
| `limit` | integer | 50 | Maximum number of tags to return (1-200). |

**Response:** `200 OK`

```json
{
  "period": {
    "start": 1704067200000,
    "end": 1704153600000
  },
  "data": [
    {
      "tag": "support",
      "conversation_count": 45,
      "message_count": 675,
      "token_count": 54000
    },
    {
      "tag": "sales",
      "conversation_count": 32,
      "message_count": 480,
      "token_count": 38400
    }
  ]
}
```

**Caching:** Same as summary endpoint.

---

### Projects API

Project management endpoints. These are dashboard routes authenticated by a **Clerk session** (not an API key); the project's organization is taken from the session. They are served under `/api/v1/projects` only (no `/v1/*` alias).

#### Create Project

```
POST /api/v1/projects
```

Creates a new project and auto-generates a default API key.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project display name. |
| `slug` | string | Yes | URL-safe identifier. Lowercase alphanumeric and hyphens only. Must be unique within the organization. |
| `org_id` | string | No | Ignored. The organization is taken from the authenticated Clerk session (defaults to `"default"`). |

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

#### List Projects

```
GET /api/v1/projects
```

Returns all projects in the authenticated Clerk organization (taken from the session). This endpoint is not paginated.

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

#### Get Project by ID

```
GET /api/v1/projects/:id
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

#### Update Project

```
PATCH /api/v1/projects/:id
```

Update a project's name and/or data-retention window.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | New project name. |
| `retention_days` | integer | No | Data-retention window in days. |

**Response:** `200 OK`

Returns the updated project with the same shape as [Get Project by ID](#get-project-by-id).

**Errors:** `404 NOT_FOUND`

#### Delete Project

```
DELETE /api/v1/projects/:id
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

---

### Keys API

API key management endpoints. All endpoints require API key authentication.

#### Create API Key

```
POST /api/v1/keys
```

Creates a new API key for the authenticated project. The project is taken from the
authenticating key.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Key display name (1-255 characters). |
| `scopes` | string[] | No | Permission scopes for the new key. Omit for full access. Must be a subset of the authenticating key's scopes. See [Permissions & scopes](#permissions--scopes). |

**Response:** `201 Created`

```json
{
  "id": "key_abc123",
  "name": "Production",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key_shown_only_once",
  "scopes": ["conversations:read", "conversations:write"],
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

The `key` field contains the full API key and is only returned at creation time. Store it securely.

The `scopes` field is `null` for full-access keys (created without a `scopes` array, and any legacy key).

**Errors:**
- `400 BAD_REQUEST` -- Validation failure.
- `403 FORBIDDEN` -- Requested `scopes` are not a subset of the authenticating key's scopes.

#### List API Keys

```
GET /api/v1/keys
```

Lists all API keys for the authenticated project (including revoked ones). The project is
taken from the authenticating key.

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "key_abc123",
      "name": "Default",
      "key_prefix": "as_live_xxxx",
      "scopes": null,
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

The full key is never returned after creation. `scopes` is `null` for full-access keys.

#### Revoke API Key

```
DELETE /api/v1/keys/:id
```

Soft-deletes an API key by setting `revoked_at`. The key immediately becomes invalid for authentication.

**Response:** `204 No Content`

**Errors:**
- `404 NOT_FOUND` -- API key not found.

### Permissions & scopes

API keys, capability tokens, and OAuth access tokens carry **scopes** that limit which
endpoints they can call. A key created without a `scopes` array — and any legacy key — has
full access (`scopes` is `null`).

Available scopes: `conversations:read`, `conversations:write`, `state:read`, `state:write`,
`state:watch`, `lease:write`, `claim:write`, `analytics:read`, `webhooks:write`,
`domains:write`, `keys:read`, `keys:write`. The `*` wildcard grants full access and
per-resource wildcards like `state:*` cover all actions on a resource.

A key can only mint child keys whose scopes are a subset of its own. Out-of-scope requests
return `403 FORBIDDEN`. Dashboard key creation (Clerk session) may grant any scopes.

See the [Permissions & Scopes guide](permissions.md) for the full taxonomy, the delegation
rule, and examples.

---

## Versioning & path aliases

There is a single API, served under `/api/v1/*`. Conversations, tags, and public analytics are **also** reachable under the legacy `/v1/*` prefix (no `/api`) — these are the same handlers with identical behavior, kept as a deprecated alias scheduled for removal on **2027-01-01**. There is no separate "v2" API and no behavioral migration between prefixes; prefer `/api/v1/*` for new code. Projects, keys, and the State Platform are served under `/api/v1/*` only.

---

## Additional Conversation Endpoints

These conversation endpoints are not covered above. All require API key authentication and are served under both `/api/v1/*` and the deprecated `/v1/*` alias.

### Search Conversations

```
GET /api/v1/conversations/search
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
GET /api/v1/conversations/:id/analytics
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

### Bulk Delete

```
POST /api/v1/conversations/bulk-delete
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
POST /api/v1/conversations/export
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
          "model": null,
          "input_tokens": null,
          "output_tokens": null,
          "cost_microdollars": null,
          "parent_message_id": null,
          "observation_type": null,
          "start_time": null,
          "end_time": null,
          "status": null,
          "level": null,
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

## Tags API

All tag endpoints require API key authentication.

### List Project Tags

```
GET /api/v1/tags
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
GET /api/v1/conversations/:id/tags
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
POST /api/v1/conversations/:id/tags
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
DELETE /api/v1/conversations/:id/tags/:tag
```

Remove a single tag from a conversation. No error if the tag was not present.

**Response:** `204 No Content`

**Errors:** `404 NOT_FOUND` -- Conversation does not exist.

---

## AI Features

AI-powered endpoints using Cloudflare Workers AI. Require API key authentication.

### Generate Title

```
POST /api/v1/conversations/:id/generate-title
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
POST /api/v1/conversations/:id/follow-ups
```

Generates suggested follow-up questions based on the conversation's last 20 messages.

**Request body:** None.

**Response:** `200 OK`

```json
{ "questions": ["What are the performance implications?", "How does this handle errors?"] }
```

**Errors:** `404 NOT_FOUND`

---

## Dashboard Project Endpoints

These project routes are used by the dashboard frontend and are authenticated via **Clerk session** (not an API key). They are served under `/api/v1/projects` only. Core project CRUD is documented in [Projects API](#projects-api) above; the endpoints below are additional dashboard views.

### Get Project by Slug

```
GET /api/v1/projects/by-slug/:slug
```

Same response shape as [Get Project by ID](#get-project-by-id).

**Errors:** `404 NOT_FOUND`

### List Project Conversations (Dashboard)

```
GET /api/v1/projects/:id/conversations
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
GET /api/v1/projects/:id/conversations/:convId/messages
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
      "model": null,
      "input_tokens": null,
      "output_tokens": null,
      "cost_microdollars": null,
      "parent_message_id": null,
      "observation_type": null,
      "start_time": null,
      "end_time": null,
      "status": null,
      "level": null,
      "created_at": 1710000000000
    }
  ]
}
```

### Project Analytics

```
GET /api/v1/projects/:id/analytics
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

---

## State Platform

State CRUD, queries, tokens, and claims are live under `/api/v1/*`. The TypeScript and Python SDKs expose these as first-class methods.

State CRUD, queries, tokens, and claims use project API key authentication. Lease renew/release and state event watch reads may use scoped capability tokens.

### State Records

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/v1/states/:stateKey` | Create or replace state |
| `GET` | `/api/v1/states/:stateKey` | Read latest or historical state |
| `POST` | `/api/v1/states/query` | Query state records |
| `DELETE` | `/api/v1/states/:stateKey` | Delete state |

State records use:

| Field | Type | Description |
|-------|------|-------------|
| `state_key` | string | Caller-defined state key |
| `agent_id` | string | Agent that last wrote the state |
| `data` | object | State payload |
| `metadata` | object \| null | Optional metadata |
| `tags` | string[] | Query tags |
| `latest_sequence` | integer | Last state event sequence |
| `created_at`, `updated_at` | integer | Unix milliseconds timestamps |
| `deleted_at` | integer \| null | Soft-delete timestamp |

Upsert body:

```json
{
  "agent_id": "assistant",
  "data": { "step": "planning" },
  "metadata": { "owner": "worker-c" },
  "tags": ["session"],
  "lease_id": "lease_abc123"
}
```

`Idempotency-Key` may be supplied on mutations. Query body supports `agent_id`, `tags`, `updated_after`, `updated_before`, `json_path`, `json_equals`, `predicates`, `at_sequence`, `at_time`, `limit`, and `cursor`. Responses use:

```json
{
  "data": [],
  "pagination": { "limit": 50, "next_cursor": null, "total": 0 }
}
```

### Events and Leases

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/states/:stateKey/events` | List events after a sequence |
| `POST` | `/api/v1/states/:stateKey/lease` | Create a write lease |
| `POST` | `/api/v1/leases/:id/renew` | Renew an active lease |
| `DELETE` | `/api/v1/leases/:id` | Release an active lease |

State events use `event_type` values `upsert` and `delete`:

```json
{
  "sequence": 42,
  "id": "evt_abc123",
  "state_key": "assistant/session-123",
  "agent_id": "assistant",
  "event_type": "upsert",
  "data": { "step": "planning" },
  "metadata": null,
  "tags": ["session"],
  "idempotency_key": "session-123-step-1",
  "created_at": 1710000000000
}
```

Lease create body:

```json
{
  "holder": "worker-c",
  "ttl_ms": 30000
}
```

### Tokens and Claims

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/capability-tokens` | Create a scoped state token |
| `GET` | `/api/v1/capability-tokens` | List capability tokens |
| `DELETE` | `/api/v1/capability-tokens/:id` | Revoke a capability token |
| `POST` | `/api/v1/claims` | Create a deterministic claim |
| `GET` | `/api/v1/claims` | List claims |
| `GET` | `/api/v1/claims/:id` | Read claim with evidence |
| `POST` | `/api/v1/claims/:id/verify` | Run deterministic verification |

Capability scopes are `state:read`, `state:write`, `state:watch`, `lease:write`, and `claim:write`. The raw `token` is returned only on create.

Claim create body:

```json
{
  "subject_type": "state",
  "subject_id": "assistant/session-123",
  "statement": "Session reached planning step",
  "evidence": [
    {
      "kind": "json_value",
      "source": "assistant/session-123",
      "data": { "step": "planning" },
      "json_path": "$.step",
      "expected_value": "planning"
    }
  ]
}
```

Evidence kinds are `state_event`, `text_hash`, and `json_value`.

---

## API Key Management

Two sets of key management endpoints exist:

1. **Authenticated** (`/api/projects/:projectId/keys`) -- requires a valid API key. The caller can only manage keys for the project their key belongs to.
2. **Dashboard** (`/api/v1/projects/:id/keys`) -- used by the dashboard frontend. Authenticated via Clerk session, not API key.

Both sets share the same request/response shapes.

### Create API Key

```
POST /api/projects/:projectId/keys       # Authenticated
POST /api/v1/projects/:id/keys           # Dashboard
```

Creates a new API key for the project.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Key display name (1-255 characters). |
| `scopes` | string[] | No | Permission scopes for the new key. Omit for full access. See [Permissions & scopes](#permissions--scopes). On the authenticated route the scopes must be a subset of the authenticating key's; the dashboard route (Clerk session) may grant any scopes. |

**Response:** `201 Created`

```json
{
  "id": "key_abc123",
  "name": "Production",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key_shown_only_once",
  "scopes": ["conversations:read"],
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

The `key` field contains the full API key and is only returned at creation time. Store it securely. `scopes` is `null` for full-access keys.

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
      "scopes": null,
      "created_at": 1710000000000,
      "last_used_at": 1710000000000,
      "revoked_at": null
    }
  ]
}
```

The full key is never returned after creation. `scopes` is `null` for full-access keys.

**Errors:**
- `403 FORBIDDEN` -- Attempting to list keys for a different project.

### Revoke API Key

```
DELETE /api/projects/:projectId/keys/:keyId    # Authenticated
DELETE /api/v1/projects/:id/keys/:keyId        # Dashboard
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

## Remote MCP Server

```
POST /api/mcp
```

A hosted MCP (Model Context Protocol) server over Streamable HTTP. Authenticate with
`Authorization: Bearer <token>`, where the token is an API key (`as_live_...`), a capability
token (`as_cap_...`), or an OAuth access token. Supports the standard MCP methods
(`initialize`, `tools/list`, `tools/call`, `ping`); each tool requires a scope. A `401`
returns `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource"`.

See the [MCP guide](mcp.md#remote-mcp-server-hosted) and [OAuth 2.1 guide](oauth.md).

### OAuth Discovery

No authentication required:

```
GET /.well-known/oauth-protected-resource     # RFC 9728 resource metadata
GET /.well-known/oauth-authorization-server   # RFC 8414 authorization server metadata
POST /api/oauth/register                       # RFC 7591 Dynamic Client Registration
GET /api/oauth/authorize                        # Authorization-code + PKCE flow → consent screen
POST /api/oauth/token                           # Token exchange and refresh-token rotation
```

## Machine-Readable Endpoints

```
GET /llms.txt        # LLM-readable project summary
GET /agents.md       # Agent-readable documentation
GET /openapi.json    # OpenAPI 3.x specification
```

No authentication required. These endpoints return plain text, markdown, and JSON respectively.
