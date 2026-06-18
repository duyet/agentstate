# @agentstate/mcp

MCP (Model Context Protocol) server for [AgentState](https://agentstate.app).

Expose AgentState's conversation history, state management, distributed leases, verifiable claims, and capability tokens as MCP tools — usable from Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

> **Prefer a hosted server?** A remote MCP server is also available at `https://agentstate.app/api/mcp` (Streamable HTTP). Point your client at the URL and authenticate with a Bearer API key, a capability token, or OAuth — no local install. See [docs/mcp.md](https://github.com/duyet/agentstate/blob/main/docs/mcp.md#remote-mcp-server-hosted). This package is the local stdio server, for token-based local use.

## Tools

| Tool | What it does |
|------|-------------|
| `store_conversation` | Create a conversation with optional initial messages |
| `recall_conversation` | Get a conversation and its messages by ID |
| `list_conversations` | List conversations with pagination and tag filtering |
| `upsert_state` | Write a state record (create or overwrite) at a key |
| `get_state` | Read a state record (optionally at a historical point in time) |
| `query_states` | Query state records by agent, tags, JSON path, or time range |
| `acquire_lease` | Acquire a distributed lease for exactly-once agent coordination |
| `renew_lease` | Extend an active lease before it expires |
| `release_lease` | Release a held lease immediately |
| `create_claim` | Create a verifiable claim about a subject with evidence |
| `verify_claim` | Trigger a verification run and get pass/fail results per evidence item |
| `mint_capability_token` | Mint a scoped sub-agent delegation token |

## Install

```bash
npm install -g @agentstate/mcp
# or run without installing:
npx @agentstate/mcp
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENTSTATE_API_KEY` | Yes | — | Your project API key (`as_live_...`). Get one free at [agentstate.app](https://agentstate.app). |
| `AGENTSTATE_BASE_URL` | No | `https://agentstate.app/api` | Override the API base URL (useful for self-hosted or local dev). |

The server exits immediately with a clear error message if `AGENTSTATE_API_KEY` is not set.

## Claude Desktop configuration

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

## Cursor configuration

Add to your Cursor MCP settings (`.cursor/mcp.json` or global `~/.cursor/mcp.json`):

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

## Windsurf configuration

Add to your Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`):

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

---

Get a free API key at [agentstate.app](https://agentstate.app).
