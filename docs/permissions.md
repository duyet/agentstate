# Permissions & Scopes

API keys, capability tokens, and OAuth access tokens carry **scopes** that decide which
endpoints they can call. Scopes give you least-privilege keys: a key for a read-only
dashboard can be limited to `conversations:read`, a key handed to an untrusted worker can
be limited to `state:write`, and so on.

## Scope taxonomy

| Scope | What it grants |
|-------|----------------|
| `conversations:read` | Read conversations and messages, list, search, export. |
| `conversations:write` | Create conversations, append messages, update, delete, tag. |
| `state:read` | Read state records, list events, run state queries. |
| `state:write` | Create, replace, and delete state records. |
| `state:watch` | Watch state events over SSE. |
| `lease:write` | Acquire, renew, and release write leases. |
| `claim:write` | Create claims and run verification. |
| `analytics:read` | Read analytics summaries, time-series, and tag stats. |
| `webhooks:write` | Create, update, and delete webhooks. |
| `domains:write` | Manage custom domains. |
| `keys:read` | List API keys for the project. |
| `keys:write` | Create and revoke API keys. |

### Wildcards

| Scope | What it grants |
|-------|----------------|
| `*` | Full access — every scope above. |
| `state:*` | Every `state:` scope (`state:read`, `state:write`, `state:watch`). |
| `conversations:*` | Every `conversations:` scope. |
| `keys:*` | Every `keys:` scope. |

A per-resource wildcard (`state:*`) covers all current and future actions on that resource.

## Legacy and unscoped keys are full access

A key created **without** a `scopes` array — and any key created before scopes existed — has
**full access** (equivalent to `*`). The `scopes` field on these keys is `null`. You only
narrow a key by explicitly passing a `scopes` array at creation time.

## Create a scoped key

Use the keyless `POST /api/v1/keys` endpoint with a `scopes` array. The project is taken
from the API key you authenticate with.

```bash
curl -X POST https://agentstate.app/api/v1/keys \
  -H "Authorization: Bearer as_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read-only dashboard",
    "scopes": ["conversations:read", "analytics:read"]
  }'
```

Response (the `key` value is shown only once):

```json
{
  "key_id": "key_abc123",
  "project_id": "proj_abc123",
  "name": "read-only dashboard",
  "key_prefix": "as_live_xxxx",
  "key": "as_live_full_key_shown_only_once",
  "scopes": ["conversations:read", "analytics:read"],
  "created_at": 1710000000000,
  "last_used_at": null,
  "revoked_at": null
}
```

The `scopes` field is also returned when you list keys (`GET /api/v1/keys`). It is `null`
for full-access keys.

To grant full access, omit `scopes` (or pass `["*"]`).

## Subset rule (delegation)

A key can only mint child keys whose scopes are a **subset of its own**. This keeps
delegation safe: a worker holding a `state:write` key can hand out a narrower key but never
a broader one.

- A full-access key (`null` scopes or `*`) can mint a key with any scopes.
- A key scoped to `["state:read", "state:write"]` can mint `["state:read"]` but **not**
  `["conversations:write"]`.
- A per-resource wildcard counts: a `state:*` key can mint `["state:write"]`.

Dashboard key creation (`POST /api/v1/projects/:id/keys`, authenticated with a Clerk
session) is **not** restricted by the subset rule — a signed-in project member may grant any
scopes. The subset rule applies to API/MCP key creation, where you authenticate with a key
or token rather than a session.

## Out-of-scope requests return 403

When a key, token, or OAuth access token calls an endpoint outside its scopes, the request
is rejected with HTTP **403**:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "This key does not have the required scope: state:write"
  }
}
```

Branch on `error.code`, not the message text.

## Where scopes apply

- **API keys** (`as_live_...`) — set scopes at creation; see above.
- **Capability tokens** (`as_cap_...`) — minted with explicit scopes for sub-agent
  delegation. See [Recipe: Capability Tokens](recipes/capability-tokens.md).
- **OAuth access tokens** — the user approves a set of scopes on the
  [consent screen](oauth.md) when an MCP client connects.

## Related docs

- [OAuth 2.1](oauth.md) — browser auth flow where users approve scopes
- [Remote MCP server](mcp.md#remote-mcp-server-hosted) — connect MCP clients with scoped tokens
- [API Reference](api-reference.md) — the `/api/v1/keys` endpoints
- [Recipe: Capability Tokens](recipes/capability-tokens.md) — scoped delegation tokens
