# Documentation Index

## 5 Coordination Primitives

| Primitive | What it's for | Recipe |
|-----------|---------------|--------|
| **States** | Versioned key/value storage — durable agent state with time-travel reads and SSE watch | [recipes/states.md](recipes/states.md) |
| **Leases** | Distributed locking — coordinate N agents with exactly-one-writer semantics | [recipes/leases.md](recipes/leases.md) |
| **Capability Tokens** | Scoped sub-agent delegation — least-privilege tokens for untrusted processes | [recipes/capability-tokens.md](recipes/capability-tokens.md) |
| **Claims** | Verifiable agent output — attest and audit work with evidence | [recipes/claims.md](recipes/claims.md) |
| **Conversations** | Agent memory primitive — create, append, search, export, and AI-enrich conversation history | [recipes/conversations.md](recipes/conversations.md) |

## All Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Zero to working in 2 minutes |
| [API Reference](api-reference.md) | Complete REST API documentation |
| [Integration Guide](integration.md) | Chat apps, AI frameworks (Vercel AI SDK, LangChain, LangGraph, OpenAI, Cloudflare), LLM tracing, multi-tenant |
| [V2 Migration Guide](v2-migration.md) | Migrate from V1 to V2 API |
| [TypeScript SDK](sdk.md) | SDK installation, methods, and examples |
| [MCP Server](mcp.md) | Use AgentState from Cursor, Claude Desktop, and Windsurf via MCP — hosted remote server or local stdio |
| [OAuth 2.1](oauth.md) | Browser auth + PKCE + consent screen so MCP clients can connect |
| [Permissions & Scopes](permissions.md) | Scope taxonomy, scoped API keys, and the delegation rule |
| [ClickHouse Monitoring](integrations/clickhouse-monitoring.md) | Use AgentState as the conversation-history backend for the clickhouse-monitoring dashboard |
| [Environment Variables](environment-variables.md) | Env vars and Cloudflare bindings |
| [Data Handling & Ownership](data-handling.md) | What data is stored, export, deletion controls, retention, and self-hosting |
| [Core Memory](knowledge/core-memory.md) | Durable maintenance notes for future agents |
| [Workers Cache](knowledge/workers-cache.md) | Cloudflare Workers Cache: what's enabled, which public endpoints are cached, why authed routes are not |
| [Recipe: Leases](recipes/leases.md) | Distributed locking — coordinate N agents with exactly-one-writer semantics |
| [Recipe: Claims](recipes/claims.md) | Verifiable agent output — attest and audit work with evidence |
| [Recipe: Capability Tokens](recipes/capability-tokens.md) | Scoped sub-agent delegation — least-privilege tokens for untrusted processes |
| [Recipe: States](recipes/states.md) | Versioned key/value storage — durable agent state with time-travel reads and SSE watch |
| [Recipe: Conversations](recipes/conversations.md) | Agent memory primitive — create, append, search, export, and AI-enrich conversation history |
