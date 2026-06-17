# ClickHouse Monitoring Dashboard Integration

The [clickhouse-monitoring](https://github.com/duyet/clickhouse-monitoring)
dashboard ships an AI agent that can chat about your ClickHouse clusters. This
guide wires that dashboard up to **AgentState** as its conversation-history
backend.

## What this integration does

When AgentState is configured as the conversation store, the dashboard:

- **Persists agent chat history** — every agent conversation (and its messages)
  is stored in your AgentState project instead of (or alongside) the dashboard's
  local D1 database.
- **Enables AI auto-titles and follow-ups** — AgentState's Workers AI features
  generate conversation titles and suggested follow-up questions, surfaced
  directly in the dashboard UI.
- **Isolates end-users** — multiple dashboard users share one AgentState project
  but only ever see their own conversations (see [Isolation](#how-isolation-works)).

## Prerequisites

You need an AgentState **project** and an **API key** (format `as_live_...`).

### Option A — Hosted (agentstate.app)

1. Sign in at [agentstate.app](https://agentstate.app).
2. **Create a project** from the dashboard (e.g. `clickhouse-monitoring`).
3. Open the project, go to **API Keys → Create key**, and copy the
   `as_live_...` value. It is shown only once — store it securely.

### Option B — Self-host

Run the AgentState Worker yourself (Cloudflare Workers + D1) and create a
project + key via the API. See [Local development](#local-development) for the
local-dev shortcut.

## Dashboard environment variables

Set these on the clickhouse-monitoring dashboard (Cloudflare Worker secrets,
`.env`, or your deployment platform's env config):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AGENTSTATE_API_KEY` | Yes | — | Your `as_live_...` project API key. |
| `AGENTSTATE_BASE_URL` | No | `https://agentstate.app/api` | AgentState API base URL. Point at your self-hosted Worker for local/dev. |
| `AGENTSTATE_AI_ENRICH` | No | `false` | Set `true` to enable AI auto-titles and follow-up suggestions. |
| `VITE_FEATURE_CONVERSATION_DB` | Yes | — | Must be `true` to enable the conversation-history feature in the dashboard. |
| `CONVERSATION_STORE_BACKEND` | No | auto | Set `agentstate` to force the AgentState backend even when a D1 binding is also present. |

> **Clerk requirement**: the conversation-history feature requires the
> dashboard's Clerk auth to be configured, because user isolation keys off the
> authenticated user ID. Make sure your dashboard's Clerk env vars are set
> before enabling `VITE_FEATURE_CONVERSATION_DB`.

A minimal hosted setup:

```bash
AGENTSTATE_API_KEY=as_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGENTSTATE_AI_ENRICH=true
VITE_FEATURE_CONVERSATION_DB=true
# AGENTSTATE_BASE_URL defaults to https://agentstate.app/api
```

If the dashboard also has a D1 conversation-store binding configured, force
AgentState explicitly:

```bash
CONVERSATION_STORE_BACKEND=agentstate
```

## How isolation works

The dashboard maps each end-user's conversation onto AgentState primitives so
that one project can safely host many users:

- **`external_id`** is set to `<userId>:<conversationId>` — a stable,
  collision-free key the dashboard uses to look a conversation back up
  (`getConversationByExternalId`).
- **`tag`** is set to `user:<userId>` on every conversation the user creates.

Listing a user's conversations is then an exact-match tag query:

```typescript
import { AgentState } from "@agentstate/sdk";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

// Only conversations belonging to this user.
const conversations = await client.listConversations({ tag: `user:${userId}` });
```

The `tag` filter is an **exact match** — `user:abc` never matches `user:abcd`.

## Verification

### 1. Confirm the dashboard picked the AgentState backend

```bash
curl -s https://your-dashboard.example.com/api/v1/conversations/backend
# => {"backend":"agentstate"}
```

If you see a different backend (e.g. `d1`), check that
`VITE_FEATURE_CONVERSATION_DB=true` and `AGENTSTATE_API_KEY` are set, and set
`CONVERSATION_STORE_BACKEND=agentstate` if a D1 binding is overriding it.

### 2. Confirm conversations land in AgentState

After chatting with the agent in the dashboard, list the project's
conversations directly against the AgentState API:

```bash
curl -s https://agentstate.app/api/v1/conversations \
  -H "Authorization: Bearer as_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

You should see the stored conversations, each with an `external_id` of the form
`<userId>:<conversationId>`. To list a single user's conversations, add the tag
filter:

```bash
curl -s "https://agentstate.app/api/v1/conversations?tag=user:abc" \
  -H "Authorization: Bearer as_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Local development

To develop against a self-hosted AgentState instead of the hosted service:

1. Start the AgentState API Worker locally:

   ```bash
   cd packages/api
   bunx wrangler dev   # serves on http://localhost:8787
   ```

2. Use the seeded local dev key (from `scripts/seed.sql`):

   ```
   as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab
   ```

3. Point the dashboard at your local Worker:

   ```bash
   AGENTSTATE_BASE_URL=http://localhost:8787
   AGENTSTATE_API_KEY=as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab
   VITE_FEATURE_CONVERSATION_DB=true
   CONVERSATION_STORE_BACKEND=agentstate
   ```

Then verify the same way as above, substituting `http://localhost:8787` for the
hosted base URL.

## Related

- [TypeScript SDK](../sdk.md)
- [API Reference](../api-reference.md)
- [Integration Guide](../integration-guide.md)
