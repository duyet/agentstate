# MCP Server

Use AgentState from Cursor, Claude Desktop, Windsurf, and any other MCP-compatible client. There are two ways to connect:

- **Remote MCP server (hosted)** — point your client at `https://agentstate.app/api/mcp`. Nothing to install. Covered first below.
- **Local stdio server (`@agentstate/mcp`)** — run a local subprocess via `npx`. Covered in [Local stdio server](#local-stdio-server).

## Remote MCP server (hosted)

AgentState hosts a remote MCP server over Streamable HTTP. No install — just point your client at the URL and authenticate.

```
POST https://agentstate.app/api/mcp
```

It speaks standard MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`, `ping`) and is stateless — each request responds with `application/json`. The tools mirror the local stdio server (conversations, state, leases, claims, capability tokens) plus key management. Each tool requires a [scope](permissions.md); a token may only call tools its scopes allow.

### Authentication

Send an `Authorization: Bearer <token>` header. Three token types work:

| Mode | Token | When to use |
|------|-------|-------------|
| API key | `as_live_...` | Paste a project API key into your client config. |
| Capability token | `as_cap_...` | A scoped, often short-lived delegation token. |
| OAuth access token | issued by the flow | Client runs the browser consent flow itself. |

**Bearer token mode** — paste a key or capability token directly. Simplest for clients that accept a static header.

**OAuth mode** — the client discovers AgentState's authorization server and runs the OAuth 2.1 + PKCE flow automatically; the user signs in, picks a project, and approves scopes on a consent screen. See [OAuth 2.1](oauth.md) for the full flow.

A request without a valid token returns `401` with a pointer to the OAuth discovery document:

```
WWW-Authenticate: Bearer resource_metadata="https://agentstate.app/.well-known/oauth-protected-resource"
```

### Client configuration

For clients that support remote / Streamable-HTTP MCP servers, give the URL and a Bearer header:

```json
{
  "mcpServers": {
    "agentstate": {
      "type": "http",
      "url": "https://agentstate.app/api/mcp",
      "headers": {
        "Authorization": "Bearer as_live_your_key_here"
      }
    }
  }
}
```

Clients that support OAuth-based remote MCP can omit the header and connect by URL — they run the consent flow on first use:

```json
{
  "mcpServers": {
    "agentstate": {
      "type": "http",
      "url": "https://agentstate.app/api/mcp"
    }
  }
}
```

The exact key name (`type`, `transport`, `url`, etc.) varies by client — check your client's remote-MCP docs. The URL and Bearer auth are the same everywhere.

### Scopes

Each tool maps to a scope. A token can only call tools allowed by its scopes; out-of-scope calls fail with `403 FORBIDDEN`.

| Scope | Grants |
|-------|--------|
| `conversations:read` | Read, list, search, export conversations |
| `conversations:write` | Create, append, update, delete, tag |
| `state:read` | Read state, list events, query |
| `state:write` | Create, replace, delete state |
| `state:watch` | Watch state events |
| `lease:write` | Acquire, renew, release leases |
| `claim:write` | Create and verify claims |
| `analytics:read` | Read analytics |
| `webhooks:write` | Manage webhooks |
| `domains:write` | Manage custom domains |
| `keys:read` | List API keys |
| `keys:write` | Create and revoke API keys |

`*` grants full access; per-resource wildcards like `state:*` cover all actions on a resource. A key created without scopes (or any legacy key) has full access. See [Permissions & Scopes](permissions.md) for the full taxonomy and the delegation rule.

## Local stdio server

Run AgentState locally via the `@agentstate/mcp` server — a subprocess started by `npx`. Use this for token-based local development, or any client that does not support remote MCP.

## Prerequisites

- **An AgentState API key** — get one free at [agentstate.app](https://agentstate.app)
- **Node.js 18+** — the server runs via `npx`, no global install required

## How it works

The MCP server runs as a local subprocess and exposes AgentState's five primitives — conversations, state, leases, claims, and capability tokens — as 12 callable tools. Your AI client (Cursor, Claude Desktop, Windsurf, etc.) discovers and calls these tools automatically.

## Install

You can run the server without installing it globally:

```bash
npx @agentstate/mcp
```

Or install it once:

```bash
npm install -g @agentstate/mcp
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENTSTATE_API_KEY` | Yes | — | Your project API key (`as_live_...`). Get one free at [agentstate.app](https://agentstate.app). |
| `AGENTSTATE_BASE_URL` | No | `https://agentstate.app/api` | Override the API base URL (useful for self-hosted or local dev). |

The server exits immediately with a clear error message if `AGENTSTATE_API_KEY` is not set.

## Configuration

All three clients use the same `mcpServers` JSON shape. Paste the relevant block into the config file for your client.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "agentstate": {
      "command": "npx",
      "args": ["@agentstate/mcp"],
      "env": {
        "AGENTSTATE_API_KEY": "as_live_your_key_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root, or `~/.cursor/mcp.json` for all projects:

```json
{
  "mcpServers": {
    "agentstate": {
      "command": "npx",
      "args": ["@agentstate/mcp"],
      "env": {
        "AGENTSTATE_API_KEY": "as_live_your_key_here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "agentstate": {
      "command": "npx",
      "args": ["@agentstate/mcp"],
      "env": {
        "AGENTSTATE_API_KEY": "as_live_your_key_here"
      }
    }
  }
}
```

Any other MCP client that accepts the `mcpServers` schema (command + args + env) works the same way.

## Tools

12 tools are exposed, grouped by primitive.

### Conversations

| Tool | Description |
|------|-------------|
| `store_conversation` | Create a new conversation with an optional list of initial messages |
| `recall_conversation` | Get a conversation and all its messages by ID |
| `list_conversations` | List conversations with cursor pagination and optional tag filtering |

### State

| Tool | Description |
|------|-------------|
| `upsert_state` | Write (create or overwrite) a state record at a dot-separated key path |
| `get_state` | Read the current state record, or read it as of a historical sequence or timestamp |
| `query_states` | Query state records across the project by agent, tags, JSON path, or time range |

### Leases

| Tool | Description |
|------|-------------|
| `acquire_lease` | Acquire a distributed lease on a state key; returns 409 if already held |
| `renew_lease` | Extend an active lease before it expires |
| `release_lease` | Release a held lease immediately |

### Claims

| Tool | Description |
|------|-------------|
| `create_claim` | Create a verifiable claim about a subject with attached evidence |
| `verify_claim` | Re-evaluate all evidence for a claim and return pass/fail per item |

### Capability Tokens

| Tool | Description |
|------|-------------|
| `mint_capability_token` | Mint a scoped sub-agent delegation token with named scopes and optional expiry |

## Verify it works

After restarting your client (Claude Desktop requires a full restart; Cursor and Windsurf reload automatically), ask the agent:

> "Use the AgentState MCP server to list my conversations."

The agent will call `list_conversations` and return your project's conversation list. An empty list on a fresh project is a successful response.

## Get a free API key

Sign up at [agentstate.app](https://agentstate.app) — no credit card required.

## Related docs

- [OAuth 2.1](oauth.md) — browser auth flow for remote MCP clients
- [Permissions & Scopes](permissions.md) — scope taxonomy and delegation rule
- [TypeScript SDK](sdk.md) — typed client for use in your own code
- [API Reference](api-reference.md) — full REST API documentation
- [Recipe: Conversations](recipes/conversations.md) — create, append, search, and AI-enrich conversations
- [Recipe: States](recipes/states.md) — versioned key/value storage with time-travel reads
- [Recipe: Leases](recipes/leases.md) — distributed locking for multi-agent coordination
- [Recipe: Claims](recipes/claims.md) — verifiable agent output with evidence
- [Recipe: Capability Tokens](recipes/capability-tokens.md) — scoped delegation tokens
