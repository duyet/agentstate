# Environment Variables

All environment variables, Worker bindings, and secrets used across the AgentState monorepo, with guidance on where each is set and how it flows to the runtime.

---

## Never commit secrets

`.env`, `.env.local`, and `.env.production` are gitignored. The `.env.example` file contains **only empty placeholders** — no real values. Never paste a Cloudflare API token, Clerk secret key, or any real credential into a file that is (or could be) tracked by git.

If you accidentally commit a secret:

1. Rotate the credential immediately (before any revert).
2. Run `git filter-repo` or contact the platform provider's security team.
3. Force-push and invalidate any existing git caches.

---

## Deployment credentials

Set in `.env.local` (copy from `.env.example`). Used by CI, `packages/api/scripts/setup-secrets.sh`, and `packages/api/scripts/prepare-wrangler-deploy-config.sh`.

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Deploy only | Cloudflare API token with Workers Scripts (Edit), D1 (Edit), Account Settings (Read) permissions. Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens). |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy only | Cloudflare Account ID from the dashboard sidebar. |
| `CLOUDFLARE_DATABASE_ID` | Deploy only | D1 database ID returned by `bunx wrangler d1 create agentstate-db`. Written into `wrangler.deploy.jsonc` by the deploy-config prep script. |

These are **not** exposed to the Worker runtime; they are only consumed by local tooling and CI.

---

## Dashboard build variables

The Astro dashboard (`packages/dashboard`) is built to a static export. Astro inlines `PUBLIC_`-prefixed environment variables at build time — they become part of the emitted JavaScript bundle and are visible to every visitor.

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (`pk_live_…` or `pk_test_…`). Consumed by `src/components/providers.tsx` to initialize the Clerk client. **Publishable keys are intentionally public** — safe to embed in client code. Set as a GitHub Actions secret for production builds; pass `pk_test_placeholder` for CI build-validation runs that only check the bundle, not auth. |

**Local dashboard dev** additionally reads from `packages/dashboard/.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Same as above, but sourced from the local `.env.local` file during `bun run dev`. |

---

## Cloudflare Worker bindings

Configured in `packages/api/wrangler.jsonc`. Cloudflare injects these into the Worker at runtime — they are not traditional environment variables and cannot be set with `export`. The TypeScript types are in `packages/api/src/types.ts` (`Bindings`).

### Required bindings

| Binding | Type | Description |
|---------|------|-------------|
| `DB` | D1 Database | SQLite database for all application data. Defined in the `d1_databases` block. `database_id` must match the D1 instance in your Cloudflare account. |
| `AI` | Workers AI | Generates conversation titles and follow-up question suggestions. Declared in the `ai` block. |
| `ASSETS` | Static Assets | Serves the dashboard static export from `packages/dashboard/out/` with SPA fallback for client-side routing. Declared in the `assets` block. |

### Optional bindings

Omitting these degrades features gracefully — the Worker still starts and handles API requests.

| Binding | Type | Description |
|---------|------|-------------|
| `AUTH_CACHE` | KV Namespace | Caches API key → project ID lookups to reduce D1 reads. 300 s TTL. Declared in `kv_namespaces`. |
| `RATE_LIMITS` | KV Namespace | Stores per-key request counters for the sliding-window rate limiter (see `USE_SLIDING_WINDOW` below — both must be set for the sliding window to actually be used). Without this binding, the Worker falls back to a fixed-window counter that resets on UTC minute boundaries. |
| `VECTORIZE_INDEX` | Vectorize Index | Declared in `wrangler.jsonc` but has no runtime consumers — the semantic-search code that used to read it (`services/embeddings.ts`) was removed in the 2026-06-20 v2→v1 cleanup. `GET /api/v1/conversations/search` is a plain SQL `LIKE` full-text search over message content; it does not use this binding. Binding it has no effect on any endpoint. |
| `STATE_STREAM_HUB` | Durable Object | Coordinates SSE connections for live state-change streaming. Without this binding, `GET /api/v1/states/watch` returns 503. |

### Worker secrets

Secrets are set with `wrangler secret put` and injected into `c.env` at runtime just like bindings. **Do not** put real secrets in `wrangler.jsonc` `vars` — use `wrangler secret put` for production and `.dev.vars` for local dev.

| Secret | Required | How to set | Description |
|--------|----------|------------|-------------|
| `CLERK_SECRET_KEY` | Dashboard auth | `bunx wrangler secret put CLERK_SECRET_KEY` | Clerk secret key (`sk_live_…`). Used by `src/middleware/clerk-dashboard-auth.ts` to verify dashboard session JWTs. If unset, all dashboard-management routes fail closed with 401. |
| `CLERK_JWT_KEY` | Optional | `bunx wrangler secret put CLERK_JWT_KEY` | RSA public key (SPKI PEM) for networkless Clerk JWT verification. When set, the middleware skips an outbound call to Clerk's JWKS endpoint, reducing auth latency. Can be omitted; the middleware falls back to network-based verification. |

### Wrangler `vars` (non-secret tuning knobs)

These contain no secrets and may live in `wrangler.jsonc` `vars`. The test config (`wrangler.test.jsonc`) sets them to large values so tests are never rate-limited.

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX` | `100` | Maximum API requests per minute per API key. Override in `wrangler.jsonc` `vars` to tune per environment. |
| `PROJECT_CREATION_RATE_LIMIT_MAX` | `10` | Maximum project-creation requests per hour per IP. Override in `wrangler.jsonc` `vars`. |
| `USE_SLIDING_WINDOW` | unset (falsy) | Set to `"true"` to use the KV-backed sliding-window rate limiter (requires the `RATE_LIMITS` binding above). Otherwise the Worker always uses the fixed UTC-minute window, even if `RATE_LIMITS` is bound. |

---

## GitHub Actions secrets

Set via `scripts/setup-secrets.sh` or the GitHub repository settings UI (Settings → Secrets and variables → Actions).

| Secret | Used in | Description |
|--------|---------|-------------|
| `CLOUDFLARE_API_TOKEN` | Deploy workflow | Passed to `wrangler deploy` to authenticate with Cloudflare. |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy workflow | Passed to `wrangler deploy` and the deploy-config prep script. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Dashboard build workflow | Passed as a build-time env var when building the Astro dashboard. This is a publishable key — safe to store as a non-secret variable, but keeping it a secret avoids accidental exposure in logs. |

Run the setup script to push `.env.local` values to GitHub:

```bash
cp .env.example .env.local
# Fill in CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
./scripts/setup-secrets.sh
```

`PUBLIC_CLERK_PUBLISHABLE_KEY` is not handled by `setup-secrets.sh` — add it manually in the GitHub UI.

---

## User API keys (SDK / API integration)

When integrating AgentState into an application, store the API key in an environment variable. The conventional name is `AGENTSTATE_API_KEY`:

```bash
# .env (your application, not this repo)
AGENTSTATE_API_KEY=as_live_your_key_here
```

```typescript
const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});
```

Key format: `as_live_` prefix followed by 40 base62 characters. Only the SHA-256 hash is stored on the server — the full key is shown once at creation and cannot be recovered.

---

## Quick setup checklist

1. `cp .env.example .env.local` and fill in Cloudflare credentials.
2. Create the D1 database: `bunx wrangler d1 create agentstate-db`.
3. Copy the returned `database_id` into `packages/api/wrangler.jsonc`.
4. Apply migrations: `bunx wrangler d1 migrations apply agentstate-db --local`.
5. Set GitHub secrets: `./scripts/setup-secrets.sh`.
6. Add `PUBLIC_CLERK_PUBLISHABLE_KEY` in GitHub secrets (GitHub UI).
7. Set the Clerk secret on the deployed Worker:
   ```bash
   bunx wrangler secret put CLERK_SECRET_KEY
   ```
8. Push to `main` to trigger auto-deploy.

Deploys on CI first run `packages/api/scripts/prepare-wrangler-deploy-config.sh`, which writes `wrangler.deploy.jsonc` and can omit Vectorize or cron config when the deploy token lacks permissions for those resources.

---

## File reference

| File | Purpose |
|------|---------|
| `.env.example` | Template with empty placeholders — safe to commit |
| `.env.local` | Local credentials — **gitignored, never commit** |
| `packages/api/wrangler.jsonc` | Worker bindings for local dev |
| `packages/api/wrangler.deploy.jsonc` | Generated by `prepare-wrangler-deploy-config.sh` for production deploy |
| `packages/api/wrangler.test.jsonc` | Bindings for `vitest` runs (uses test credentials and high rate-limit caps) |
| `packages/api/src/types.ts` | TypeScript `Bindings` type — canonical list of what the Worker runtime receives |
| `packages/dashboard/src/components/providers.tsx` | Reads `PUBLIC_CLERK_PUBLISHABLE_KEY` at build time |
| `scripts/setup-secrets.sh` | Pushes `.env.local` values to GitHub Actions secrets |
| `scripts/prepare-wrangler-deploy-config.sh` | Writes `wrangler.deploy.jsonc` from `.env.local` before `wrangler deploy` |
