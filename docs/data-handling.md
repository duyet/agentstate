# Data Handling & Ownership

> This is a developer-facing guide to how AgentState stores, exports, and deletes your data, and what controls you have over it. It is **not** a substitute for a formal privacy policy.

---

## 1. What we store

All data is scoped to a **project**. Projects belong to an **organization**. The following categories of data are stored in Cloudflare D1 (SQLite at the edge):

| Category | What it contains |
|---|---|
| **Organizations & projects** | Organization name, project names and slugs, per-project retention settings |
| **Conversations** | Messages (role, content, token counts, cost metadata, tracing fields), tags, aggregate counters |
| **Agent states** | Versioned key/value blobs (`state_key → data`), per-state metadata and tags, full event log (`upsert` / `delete` events), snapshots for time-travel reads |
| **Leases** | Distributed lock records: holder, TTL, fencing token, acquired/released timestamps |
| **Claims & evidence** | Verifiable agent assertions and their attached evidence items and verification run results |
| **Capability tokens** | Scoped sub-agent delegation records — name, scope list, expiry, last-used timestamp. The raw token value is never persisted; only its SHA-256 hash is stored. |
| **API keys** | Name, key prefix (for display), SHA-256 hash. The raw key is shown once at creation and never stored. |
| **Webhooks** | Configured endpoint URLs, subscribed event types, HMAC secret, enabled status |
| **Custom domains** | Domain name, verification token and status |
| **Operational metadata** | Rate-limit counters (pruned automatically after 2 minutes), idempotency replay cache |

No passwords or payment information pass through AgentState.

---

## 2. Your data is yours

### Export conversations

Export one or more conversations — including all messages — as structured JSON at any time:

```http
POST /api/v1/conversations/export
Authorization: Bearer <api-key>
Content-Type: application/json

{ "ids": ["conv_abc", "conv_def"] }
```

The response is `{ "data": [...], "count": N }` — each item contains the full conversation record and its messages.

### Self-host option

AgentState is MIT-licensed. You can run your own instance on Cloudflare Workers + D1. When self-hosted, every byte of your data lives in **your** Cloudflare account and never touches our infrastructure. See the [Getting Started](getting-started.md) guide and [Environment Variables](environment-variables.md) reference.

---

## 3. Deletion & control

### Delete a single conversation

```http
DELETE /api/v1/conversations/:id
Authorization: Bearer <api-key>
```

Permanently removes the conversation, all its messages, and all its tags in a single atomic batch (tags → messages → conversation). Returns HTTP 204. **There is no soft-delete for conversations** — deletion is immediate and permanent.

### Bulk-delete conversations

```http
POST /api/v1/conversations/bulk-delete
Authorization: Bearer <api-key>
Content-Type: application/json

{ "ids": ["conv_abc", "conv_def", ...] }
```

Returns `{ "deleted": N }`.

### Delete an agent state

```http
DELETE /api/v2/states/:state_key
Authorization: Bearer <capability-token>
```

State deletion is a **soft-delete**: the `agent_states` row has its `deleted_at` timestamp set and a `delete` event is appended to the state event log (`state_events`). The tombstone row and the event log entry are retained so that downstream consumers can observe the deletion in the event stream and so that time-travel reads to earlier sequences remain accurate. If you need all state data gone, delete the project (see below).

### Revoke a capability token

```http
DELETE /api/v2/capability-tokens/:id
Authorization: Bearer <api-key>
```

Sets `revoked_at` on the token record. Revoked tokens are rejected immediately and their auth-cache entries are invalidated.

### Delete a project (and all its data)

```http
DELETE /api/v1/projects/:id
Authorization: Clerk session (dashboard)
```

Permanently and irreversibly deletes the project and all data it owns: conversations, messages, tags, agent states, state events, snapshots, leases, claims, evidence, capability tokens, API keys, webhooks, and custom domains. Auth-cache entries for every API key are invalidated synchronously before the delete completes.

> **Note:** Project deletion is currently exposed only through the dashboard (Clerk-authenticated session). There is no equivalent endpoint in the Bearer-token API. If you need to delete a project programmatically, use a dashboard session or the self-hosted deployment where you can access the database directly.

---

## 4. Retention

### Default: data persists until you delete it

By default (`retention_days = NULL`), conversations are retained indefinitely. Nothing is automatically purged. You control when data is removed using the deletion endpoints described above.

### Optional per-project retention policy

You can configure a `retention_days` value (1–3650) on any project. When set, a scheduled job runs daily at **03:00 UTC** and permanently hard-deletes conversations (plus their messages and tags) whose `updated_at` timestamp is older than the configured window. The cleanup is batch-limited (500 rows per pass) and time-budgeted (25 seconds) to stay within Worker execution limits; very large backlogs may require multiple daily runs to fully clear.

**Agent states are not covered by the retention job.** The scheduled cleanup only touches conversations and their children. State data persists until explicitly deleted via `DELETE /api/v2/states/:state_key` or project deletion.

---

## 5. Security of your data

- **Hashed credentials** — API keys and capability tokens are hashed with SHA-256 on first write. The raw value is returned once at creation and never stored. AgentState cannot recover or expose the original credential.
- **Scoped, revocable tokens** — Capability tokens carry explicit permission scopes (`state:read`, `state:write`, `state:watch`, `lease:write`, `claim:write`) and can be revoked at any time via the API.
- **Encryption in transit** — All communication with the hosted service uses HTTPS (TLS 1.2+). Cloudflare handles TLS termination.
- **Non-leaky error responses** — Error responses follow the format `{ "error": { "code", "message" } }` and never expose stack traces, internal IDs belonging to other projects, or implementation details.
- **Constant-time auth floor** — Authentication failures are delayed to a minimum floor (~300 ms) to resist timing-based enumeration.
- **Project isolation** — Every data query filters by the project ID extracted from the authenticated API key. Cross-project data access is structurally prevented at the query layer.

For the full security policy, including how to report vulnerabilities, see [SECURITY.md](../SECURITY.md).

---

## 6. Self-hosting

AgentState is open-source under the [MIT license](../LICENSE). To run your own instance:

1. Clone the repository and install dependencies (`bun install`).
2. Create a Cloudflare D1 database and apply migrations.
3. Deploy the Cloudflare Worker (`bun run deploy`).

When self-hosted, your data is stored exclusively in your own Cloudflare account. You set your own retention policies, manage your own API keys, and have direct database access via the Wrangler CLI. See [Getting Started](getting-started.md) and [Environment Variables](environment-variables.md) for the full setup walkthrough.
