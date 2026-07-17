# Webhooks

Register an HTTPS endpoint to receive events as they happen, instead of polling
the API.

## Managing webhooks

```
POST   /api/v1/webhooks       Create a webhook
GET    /api/v1/webhooks       List webhooks for the project
GET    /api/v1/webhooks/:id   Get a webhook
PUT    /api/v1/webhooks/:id   Update url, events, or active
DELETE /api/v1/webhooks/:id   Delete a webhook
```

```bash
curl -X POST https://agentstate.app/api/v1/webhooks \
  -H "Authorization: Bearer $AGENTSTATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/hooks/agentstate", "events": ["conversation.created"]}'
```

The response includes a `secret` — a 64-character hex string. It is only
returned on creation; store it, it's needed to verify deliveries.

The webhook URL must be `https://` and must not resolve to a private,
loopback, link-local, or cloud metadata host (checked both at registration and
again immediately before each delivery).

## Events

| Event | Fires when |
|-------|------------|
| `conversation.created` | A conversation is created |

## Delivery payload

```json
{
  "event": "conversation.created",
  "timestamp": 1737100000000,
  "data": {
    "conversation_id": "conv_abc123",
    "project_id": "proj_xyz789",
    "external_id": null,
    "title": "Support chat",
    "message_count": 2,
    "token_count": 42,
    "created_at": 1737100000000
  }
}
```

Delivery is fire-and-forget from AgentState's side: it does not block the API
response that triggered it, and a failing endpoint does not fail that request.
Each webhook is delivered independently — a slow or failing endpoint doesn't
delay delivery to your other webhooks.

## Verifying deliveries

Every delivery carries two headers:

| Header | Value |
|--------|-------|
| `X-AgentState-Signature` | `HMAC-SHA256(secret, "${timestamp}.${body}")`, hex-encoded |
| `X-AgentState-Timestamp` | Unix milliseconds when the delivery was signed |

The timestamp is part of the signed content specifically so a captured
delivery (proxy logs, a compromised intermediary) can't be replayed
indefinitely — verification must check the timestamp's age, not just the
signature.

To verify a delivery:

1. Read the raw request body (verify against the exact bytes received, before
   any JSON parsing/re-serialization).
2. Reject if `X-AgentState-Timestamp` is more than **5 minutes** from your own
   clock, in either direction.
3. Recompute `HMAC-SHA256(secret, "${timestamp}.${body}")` and compare it to
   `X-AgentState-Signature` using a constant-time comparison.
4. Reject the request if either check fails.

```js
import { timingSafeEqual, createHmac } from "node:crypto";

const TOLERANCE_MS = 5 * 60 * 1000;

function verifyAgentStateWebhook(secret, rawBody, timestampHeader, signatureHeader) {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > TOLERANCE_MS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHeader ?? "", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

## Retries

Delivery attempts have a 10-second timeout per attempt and retry up to 3 times
total, with 1s/2s exponential backoff between attempts. Retries reuse the same
`X-AgentState-Timestamp` and signature as the original attempt — receivers
that dedupe on `(timestamp, signature)` will treat retries of the same
delivery as one event.
