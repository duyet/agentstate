# Webhook Notifications Implementation Plan

## Overview

Webhook notifications enable real-time event delivery to external systems when conversations are created, updated, or have messages appended. This is critical for users who need to trigger downstream workflows, integrate with external tools, or build real-time dashboards.

**Why this matters**: Users currently need to poll for updates, which is inefficient and delayed. Webhooks push events immediately, enabling reactive workflows and reducing unnecessary API load.

## System Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Webhook Flow                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. EVENT OCCURS                                                        │
│     └─> Conversation created/message appended                          │
│         └─> Trigger point identified in routes/conversations/*          │
│                                                                         │
│  2. FIND WEBHOOKS                                                       │
│     └─> Query webhooks table by project_id + event_type                 │
│     └─> Filter active (not revoked) webhooks                            │
│                                                                         │
│  3. FIRE-AND-FORGET DELIVERY                                            │
│     └─> Use ctx.waitUntil() for non-blocking delivery                  │
│     └─> Parallel delivery to all webhook URLs                          │
│     └─> Immediate response to user (webhook delivery async)            │
│                                                                         │
│  4. SIGNATURE CALCULATION                                               │
│     └─> HMAC-SHA256(payload_json, webhook_secret)                      │
│     └─> Send in X-Webhook-Signature header                             │
│                                                                         │
│  5. RETRY LOGIC (on failure)                                            │
│     └─> Store failed attempts in webhook_deliveries table               │
│     └─> Cron job processes retries with exponential backoff            │
│     └─> Max 3 attempts per webhook event                                │
│                                                                         │
│  6. DLQ (Dead Letter Queue)                                             │
│     └─> After max retries, mark as failed                              │
│     └─> Store in webhook_deliveries for debugging/inspection           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### webhooks table

```sql
CREATE TABLE `webhooks` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `url` text NOT NULL,
  `secret` text NOT NULL,  -- HMAC signing secret
  `event_types` text NOT NULL,  -- JSON array: ["conversation.created", "message.appended"]
  `active` integer NOT NULL DEFAULT 1,  -- Boolean: 1 = active, 0 = disabled
  `created_at` integer NOT NULL,
  `revoked_at` integer,  -- NULL if active
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);

-- Indexes for fast webhook lookup
CREATE INDEX `webhooks_project_id_idx` ON `webhooks` (`project_id`);
CREATE INDEX `webhooks_project_id_active_idx` ON `webhooks` (`project_id`, `active`);
```

### webhook_deliveries table (delivery attempts & audit log)

```sql
CREATE TABLE `webhook_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `webhook_id` text NOT NULL,
  `event_type` text NOT NULL,
  `payload` text NOT NULL,  -- JSON payload
  `status` text NOT NULL,  -- "pending", "success", "failed", "retrying"
  `http_status` integer,  -- HTTP response code (NULL if not delivered yet)
  `attempt_count` integer NOT NULL DEFAULT 0,
  `next_retry_at` integer,  -- Unix ms for next retry attempt
  `last_error` text,  -- Error message if failed
  `delivered_at` integer,  -- Timestamp of successful delivery
  `created_at` integer NOT NULL,
  FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON DELETE CASCADE
);

-- Indexes for retry processing
CREATE INDEX `webhook_deliveries_status_idx` ON `webhook_deliveries` (`status`);
CREATE INDEX `webhook_deliveries_next_retry_at_idx` ON `webhook_deliveries` (`next_retry_at`);
CREATE INDEX `webhook_deliveries_webhook_id_idx` ON `webhook_deliveries` (`webhook_id`);
```

## API Endpoints

### POST /api/v1/webhooks — Register webhook

**Request**:
```json
{
  "url": "https://example.com/webhooks",
  "event_types": ["conversation.created", "message.appended"]
}
```

**Response** (201):
```json
{
  "id": "webhook_abc123",
  "project_id": "proj_xyz",
  "url": "https://example.com/webhooks",
  "event_types": ["conversation.created", "message.appended"],
  "secret": "whsec_xxx...",  // Generated secret (show only once!)
  "active": true,
  "created_at": 1710123456789
}
```

**Authentication**: API key auth (inherits project_id from key)

### GET /api/v1/webhooks — List webhooks

**Response** (200):
```json
{
  "data": [
    {
      "id": "webhook_abc123",
      "project_id": "proj_xyz",
      "url": "https://example.com/webhooks",
      "event_types": ["conversation.created"],
      "active": true,
      "created_at": 1710123456789
    }
  ]
}
```

**Security**: Secret is NEVER returned in list responses

### GET /api/v1/webhooks/:id — Get webhook details

**Response** (200):
```json
{
  "id": "webhook_abc123",
  "project_id": "proj_xyz",
  "url": "https://example.com/webhooks",
  "event_types": ["conversation.created", "message.appended"],
  "active": true,
  "created_at": 1710123456789
}
```

### DELETE /api/v1/webhooks/:id — Revoke webhook

**Response** (204):
- Sets `revoked_at = Date.now()`, `active = 0`
- Webhook is soft-deleted (retained for audit)

### POST /api/v1/webhooks/:id/rotate-secret — Rotate signing secret

**Request**:
```json
{}

// OR
{
  "secret": "user_provided_secret"  // Optional: allow custom secret
}
```

**Response** (200):
```json
{
  "id": "webhook_abc123",
  "secret": "whsec_new_secret_..."  // NEW secret (show only once!)
}
```

**Note**: Old secret remains valid for 5 minutes to allow graceful rotation

### GET /api/v1/webhooks/:id/deliveries — List delivery attempts

**Query params**: `?status=failed&limit=50&cursor=xxx`

**Response** (200):
```json
{
  "data": [
    {
      "id": "delivery_xyz",
      "event_type": "conversation.created",
      "status": "success",
      "http_status": 200,
      "attempt_count": 1,
      "delivered_at": 1710123456789,
      "created_at": 1710123456000
    }
  ],
  "pagination": {
    "limit": 50,
    "next_cursor": "..."
  }
}
```

### POST /api/v1/webhooks/:id/deliveries/:delivery_id/retry — Manual retry

**Response** (202):
- Immediately retry the failed webhook delivery
- Resets attempt_count to 0

## Event Types

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `conversation.created` | New conversation created | Full conversation object |
| `conversation.updated` | Conversation metadata updated | Updated fields only |
| `conversation.deleted` | Conversation deleted | Deleted conversation ID |
| `message.appended` | Message(s) added to conversation | Conversation ID + new messages |
| `message.updated` | Message content changed | Message object |
| `message.deleted` | Message deleted | Message ID |

**Initial scope (MVP)**: `conversation.created`, `message.appended`

## Webhook Payload Format

All webhook payloads follow this structure:

```json
{
  "id": "evt_abc123",           // Event ID (unique per delivery)
  "event_type": "conversation.created",
  "timestamp": 1710123456789,   // Unix ms
  "project_id": "proj_xyz",
  "data": {                     // Event-specific data
    "conversation": {
      "id": "conv_123",
      "external_id": "ext_456",
      "title": "My Conversation",
      "metadata": { "key": "value" },
      "message_count": 2,
      "token_count": 150,
      "created_at": 1710123450000,
      "updated_at": 1710123450000
    }
  }
}
```

**message.appended payload**:
```json
{
  "id": "evt_def456",
  "event_type": "message.appended",
  "timestamp": 1710123456789,
  "project_id": "proj_xyz",
  "data": {
    "conversation_id": "conv_123",
    "messages": [
      {
        "id": "msg_789",
        "role": "user",
        "content": "Hello!",
        "metadata": null,
        "token_count": 5,
        "created_at": 1710123456000
      }
    ]
  }
}
```

## Security

### HMAC Signature Verification

**Signature calculation** (AgentState side):
```typescript
import { signWebhookPayload } from "./lib/crypto";

const payload = JSON.stringify(webhookPayload);
const signature = await signWebhookPayload(payload, webhook.secret);
// Sends: X-Webhook-Signature: sha256=<signature>
```

**Signature verification** (Consumer side):
```typescript
// Example code for webhook consumers
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Headers sent with every webhook**:
- `X-Webhook-Signature`: `sha256=<hex_signature>`
- `X-Webhook-Id`: Event delivery ID
- `X-Webhook-Timestamp`: Unix ms timestamp
- `User-Agent`: `AgentState-Webhooks/1.0`
- `Content-Type`: `application/json`

**Secret format**: `whsec_` + 40 random base62 chars (similar to API keys)

### URL Validation

- Must be HTTPS (reject HTTP in dev/prod except localhost)
- Must resolve to a valid IP (DNS check on registration)
- Max 2048 characters
- Reject private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)

## Retry Strategy

### Exponential Backoff Formula

```
delay_seconds = min(2^attempt, 3600)  // Max 1 hour
```

| Attempt | Delay |
|---------|-------|
| 1 (immediate) | 0s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s |
| ... | ... |
| 12+ | 3600s (1 hour cap) |

**Max attempts**: 3 (configurable per webhook in future)

**Success criteria**:
- HTTP 2xx status code
- Response received within 30 seconds

**Failure criteria**:
- HTTP 4xx (except 429) → Permanent failure, no retry
- HTTP 5xx or 429 (rate limit) → Retry with backoff
- Network error → Retry with backoff
- Timeout → Retry with backoff

### Scheduled Retry Job (Cron)

```typescript
// wrangler.jsonc
{
  "triggers": [{ "crons": ["* * * * *"] }]  // Every minute
}
```

**Retry processor** (`src/services/webhook-retry.ts`):
1. Query `webhook_deliveries` where `status = 'retrying' AND next_retry_at <= now`
2. Fetch corresponding webhooks
3. Attempt delivery with fetch()
4. Update delivery record based on result
5. Use `ctx.waitUntil()` for async processing

## Implementation Steps

### Phase 1: Database & Schema (Day 1)
1. [ ] Add `webhooks` table to `packages/api/src/db/schema.ts`
2. [ ] Add `webhook_deliveries` table to schema
3. [ ] Generate migration: `bunx drizzle-kit generate`
4. [ ] Test migration locally: `bunx wrangler d1 migrations apply agentstate-db --local`
5. [ ] Add TypeScript types for webhook operations

### Phase 2: Webhook CRUD API (Day 1-2)
1. [ ] Create `src/routes/webhooks/index.ts` router
2. [ ] Implement POST /webhooks (register)
3. [ ] Implement GET /webhooks (list)
4. [ ] Implement GET /webhooks/:id (details)
5. [ ] Implement DELETE /webhooks/:id (revoke)
6. [ ] Implement POST /webhooks/:id/rotate-secret
7. [ ] Implement GET /webhooks/:id/deliveries
8. [ ] Add webhook routes to `src/index.ts`
9. [ ] Add validation schemas to `lib/validation.ts`

### Phase 3: Signature & Security (Day 2)
1. [ ] Implement `signWebhookPayload()` in `lib/crypto.ts`
2. [ ] Add `generateWebhookSecret()` helper
3. [ ] Add URL validation helper (HTTPS check, DNS check)
4. [ ] Implement webhook authentication middleware
5. [ ] Add rate limiting for webhook endpoints

### Phase 4: Event Triggers (Day 3)
1. [ ] Create `src/services/webhooks.ts` (trigger logic)
2. [ ] Hook `conversation.created` into `routes/conversations/crud.ts`
3. [ ] Hook `message.appended` into `routes/conversations/messages.ts`
4. [ ] Use `ctx.waitUntil()` for fire-and-forget delivery
5. [ ] Create `webhook_deliveries` records on trigger

### Phase 5: Retry System (Day 4)
1. [ ] Create `src/services/webhook-retry.ts`
2. [ ] Implement exponential backoff logic
3. [ ] Add scheduled event handler in `src/index.ts`
4. [ ] Configure cron trigger in `wrangler.jsonc`
5. [ ] Test retry flow manually

### Phase 6: Testing (Day 5)
1. [ ] Unit tests for signature generation/verification
2. [ ] Unit tests for retry backoff calculation
3. [ ] Integration test: register → trigger → receive
4. [ ] Integration test: failure → retry → success
5. [ ] Test with webhook.site (local testing)
6. [ ] Load test: 100 concurrent webhooks

### Phase 7: Documentation (Day 5)
1. [ ] Update `docs/integration.md` with webhook section
2. [ ] Add webhook examples to docs
3. [ ] Create webhook verification guide (consumer side)
4. [ ] Update OpenAPI spec (`src/content/openapi.ts`)
5. [ ] Add troubleshooting guide

## Testing Plan

### Local Development Testing

**Tool**: Use webhook.site or ngrok for testing

```bash
# 1. Get a test webhook URL from webhook.site
# 2. Register webhook
curl -X POST http://localhost:8787/api/v1/webhooks \
  -H "Authorization: Bearer $TEST_KEY" \
  -d '{"url":"https://webhook.site/test-uuid","event_types":["conversation.created"]}'

# 3. Trigger event
curl -X POST http://localhost:8787/api/v1/conversations \
  -H "Authorization: Bearer $TEST_KEY" \
  -d '{"messages":[{"role":"user","content":"Test"}]}'

# 4. Check webhook.site for delivery
```

### Unit Tests

```typescript
// test/webhooks/crypto.test.ts
describe('signWebhookPayload', () => {
  it('should generate consistent HMAC signatures', async () => {
    const payload = '{"test":"data"}';
    const secret = 'test_secret';

    const sig1 = await signWebhookPayload(payload, secret);
    const sig2 = await signWebhookPayload(payload, secret);

    expect(sig1).toBe(sig2);
  });
});

// test/webhooks/retry.test.ts
describe('calculateRetryDelay', () => {
  it('should use exponential backoff', () => {
    expect(calculateRetryDelay(1)).toBe(2);
    expect(calculateRetryDelay(2)).toBe(4);
    expect(calculateRetryDelay(12)).toBe(3600);  // Max cap
  });
});
```

### Integration Tests

```typescript
// test/webhooks/integration.test.ts
describe('Webhook Integration', () => {
  it('should deliver conversation.created event', async () => {
    // 1. Register webhook
    const webhook = await registerWebhook({ url: mockServer.url });

    // 2. Create conversation (triggers webhook)
    await createConversation({ messages: [{ role: 'user', content: 'Hi' }] });

    // 3. Wait for delivery
    await waitFor(mockServer, 'receivedRequest');

    // 4. Verify payload
    const payload = await mockServer.getLastPayload();
    expect(payload.event_type).toBe('conversation.created');
    expect(payload.data.conversation.id).toBeDefined();
  });
});
```

## Estimated Effort

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1: Database | 5 tasks | 2-3 hours |
| Phase 2: CRUD API | 9 tasks | 4-5 hours |
| Phase 3: Security | 5 tasks | 3-4 hours |
| Phase 4: Triggers | 5 tasks | 3-4 hours |
| Phase 5: Retries | 5 tasks | 4-5 hours |
| Phase 6: Testing | 6 tasks | 5-6 hours |
| Phase 7: Docs | 5 tasks | 2-3 hours |
| **Total** | **38 tasks** | **~24-30 hours** |

**Parallelization opportunities**:
- Phase 2 (CRUD) + Phase 3 (Security) can be done in parallel
- Phase 4 (Triggers) + Phase 5 (Retries) can be done sequentially
- Phase 6 (Testing) can overlap with Phase 7 (Docs)

**Critical path**: 5-6 days for a single developer

## Dependencies

- **None** — Pure additive feature
- Does not break existing API
- Does not require database migration for existing tables
- Works with existing auth/rate-limiting middleware

## Future Enhancements (Out of Scope for MVP)

1. **Event filtering**: Filter webhooks by metadata or tag conditions
2. **Batch delivery**: Send multiple events in one webhook payload
3. **Webhook logs UI**: Dashboard page for inspecting webhook deliveries
4. **Custom retry config**: Per-webhook max_attempts and backoff settings
5. **Event replay**: Manually replay past events to webhook URLs
6. **Pausing webhooks**: Temporary disable without revoking
7. **Signature versioning**: Support multiple signature algorithms
8. **Webhook playground**: Test webhooks from dashboard UI

## References

- Cloudflare Workers scheduled events: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Cloudflare Workers waitUntil: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- HMAC signature verification (Laravel example): https://github.com/spatie/laravel-webhook-server
- Webhook best practices (Svix): https://www.svix.com/docs/
