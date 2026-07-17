# AgentState Roadmap

AgentState is the coordination and state layer for AI agent fleets. Memory is table stakes — the real wedge is **coordination** (leases so agents don't step on each other), **verifiability** (claims with evidence so outputs can be audited), and **scoped delegation** (capability tokens so agents can hand off work safely). It is open-source (MIT) and designed to be self-hostable from day one.

This roadmap is organized by theme, not by hard release dates. We use quarters as rough anchors and will update this file as priorities shift.

---

## Now — Shipped

The five core primitives are live at `/api/v1`:

- **Conversations** — create, list, search, bulk-export, tag, and paginate agent conversation history
- **States** — arbitrary key/value state with versioned event log
- **Leases** — distributed exclusive locks with TTL, renewal, and release
- **Claims** — verifiable assertions with evidence attached; verify endpoint for consumers
- **Capability Tokens** — scoped, time-limited delegation tokens for sub-agents

Additional shipped work:

- REST API at `/api/v1` (Hono on Cloudflare Workers + D1)
- TypeScript SDK (`@agentstate/sdk`) and Python SDK (`agentstate` on PyPI)
- Dashboard with project management, analytics, and API key management (Astro + React + Clerk)
- Cursor-based pagination, full-text search, bulk operations, AI-generated titles and follow-up questions
- **Remote MCP server** — hosted Streamable-HTTP endpoint at `/api/mcp` plus a local stdio package (`@agentstate/mcp`), with OAuth 2.1 + PKCE and scope-gated tools mirroring all five primitives, so coding agents (Cursor, Claude Desktop, Windsurf) can use AgentState natively. See [docs/mcp.md](docs/mcp.md).
- 353 passing tests; Biome linting; strict TypeScript throughout

---

## Next — Near-Term

These are the highest-priority items in active development or ready to start:

### Developer Experience
- **Primitive docs and recipes** — focused how-to guides for each primitive (leases, claims, capability tokens), not just API reference. Show the why, not just the what.
- **Flagship examples** — end-to-end examples: coordinate N agents using leases; produce a verifiable output with claims; delegate a subtask with a capability token. Runnable in minutes.
- **Landing page clarity** — make it obvious within seconds what AgentState does and why you'd reach for it over ad-hoc solutions.

### SDK Breadth
- Expanded SDK coverage for all primitives (leases, claims, capability tokens) in both TypeScript and Python SDKs
- Better ergonomics: typed responses, retry handling, streaming pagination helpers

### Reliability
- **Public status page and uptime tracking** — visible to users before they even sign up

---

## Later — Themes on the Horizon

These are directional, not committed. Order may change based on what we learn.

### Storage Portability and Self-Hosting
- Adapter interface so D1 is one backend among several (e.g. libSQL, PostgreSQL, SQLite file)
- `docker compose up` self-host path with full feature parity to the cloud version
- Self-host documentation and migration tooling

### More SDKs
- Go SDK
- Additional languages based on community demand

### Ecosystem Integrations
- **LangGraph** — AgentState as the persistence and coordination layer for LangGraph graphs
- **CrewAI** — native integration for crew state and task hand-off
- **Vercel AI SDK** — conversation history middleware
- **Cloudflare Agents** — native Durable Object + AgentState patterns

### Reliability and Observability
- Per-project error budgets and automated rollback on threshold breach
- Structured audit/provenance export (who created what, when, with what evidence)
- Webhook delivery reliability improvements (retry policies, dead-letter queues)

---

## Principles We Won't Compromise

- **Generous free tier, no card to start** — you can evaluate and build without giving us payment details
- **Self-host free forever** — the MIT license means you can run the full stack on your own infrastructure at no cost, forever
- **No gating on core primitives** — leases, claims, and capability tokens are not premium features; they are the core
- **Your data is yours** — export any time, in full, via the bulk-export endpoint or self-host and own it directly

---

## How to Influence the Roadmap

The best way to shape what gets built next:

- **Open an issue** — describe your use case, not just a feature request. The more context, the better.
- **Start a discussion** — for broader questions or ideas, GitHub Discussions is the right place.
- **Contribute** — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved. PRs welcome.

Roadmap items with the most real-world backing (issues, upvotes, or PRs) move up the queue.
