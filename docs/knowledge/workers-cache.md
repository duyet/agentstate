# Workers Cache

Durable note on how AgentState uses Cloudflare **Workers Cache** (launched
2026-07-06, https://blog.cloudflare.com/workers-cache/).

## What it is

A tiered cache that sits **in front of** the Worker. Enable it per-worker in the
wrangler config, then control it entirely with standard HTTP response headers.
Key safety facts:

- Only responses that are **explicitly cacheable** (e.g. `Cache-Control: public,
  max-age=...`) are stored. Responses with no public cache directive are never
  cached — so merely enabling the feature is safe by default.
- Requests carrying an `Authorization` header are **automatically bypassed** and
  never cached. AgentState's API auth is `Authorization: Bearer as_live_...`, so
  every authenticated / per-project / per-key route auto-bypasses.
- On a cache **HIT** the Worker doesn't run (no CPU billing). MISS/BYPASS run
  normally. `Cache-Control: ..., stale-while-revalidate=<s>` serves stale
  instantly while refreshing in the background.

## How it's enabled here

`packages/api/wrangler.jsonc` has a top-level:

```jsonc
"cache": { "enabled": true }
```

## What is cached (public, read-only, non-user-specific only)

Set in `packages/api/src/index.ts`:

| Endpoint | `Cache-Control` | Why safe |
|----------|-----------------|----------|
| `GET /api` (health) | `public, max-age=60, stale-while-revalidate=300` | Static health payload, no auth, no user data |
| `GET /llms.txt` | `public, max-age=300, stale-while-revalidate=3600` | Static agent-readable content, changes only on deploy |
| `GET /agents.md` | `public, max-age=300, stale-while-revalidate=3600` | Static agent-readable content |
| `GET /openapi.json` | `public, max-age=300, stale-while-revalidate=3600` | Static API spec |

## What is intentionally NOT cached

Everything authenticated, per-user, or mutating — no `Cache-Control: public` is
ever set on these, and the `Authorization: Bearer` header makes Workers Cache
bypass them anyway:

- `/api/v1/conversations`, `/api/v1/projects`, `/api/v1/states`, `/api/v1/leases`,
  `/api/v1/capability-tokens`, `/api/v1/claims`, `/api/v1/organizations`,
  `/api/v1/keys`, `/api/v1/tags`, `/api/v1/webhooks`, the MCP server, OAuth
  endpoints — all Bearer-authed and/or per-project.
- `/api/v1/analytics/*` (`routes/analytics-public.ts`) — despite the "public"
  name it runs `apiKeyAuth` + a required read scope and returns **per-project**
  aggregates. Never cache it publicly.
- All POST/PATCH/DELETE routes.

## Rule

Only add `Cache-Control: public, ...` to genuinely public, unauthenticated,
non-user-specific GET responses. When in doubt, leave it uncacheable — the
default (no directive) is not cached.

## Purging

From inside the owning entrypoint: `await ctx.cache.purge({ tags: [...] })` /
`{ prefix: "/x" }` / `{ purgeEverything: true }`. Not currently wired up; the
short TTLs above make the cached set self-heal on deploy without manual purges.
