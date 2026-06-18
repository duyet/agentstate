# MCP Server

Use AgentState from Cursor, Claude Desktop, Windsurf, and any other MCP-compatible client via the `@agentstate/mcp` server.

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

- [TypeScript SDK](sdk.md) — typed client for use in your own code
- [API Reference](api-reference.md) — full REST API documentation
- [Recipe: Conversations](recipes/conversations.md) — create, append, search, and AI-enrich conversations
- [Recipe: States](recipes/states.md) — versioned key/value storage with time-travel reads
- [Recipe: Leases](recipes/leases.md) — distributed locking for multi-agent coordination
- [Recipe: Claims](recipes/claims.md) — verifiable agent output with evidence
- [Recipe: Capability Tokens](recipes/capability-tokens.md) — scoped delegation tokens
