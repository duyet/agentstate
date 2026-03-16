# Environment Variables

All environment variables used across the AgentState monorepo.

## Deployment Credentials

Set in `.env.local` (copy from `.env.example`). Used by CI and `wrangler deploy`.

| Variable | Required | Where Used | Description |
|----------|----------|------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Deploy only | CI, `wrangler deploy` | Cloudflare API token with Workers Scripts (Edit), D1 (Edit), Account Settings (Read) permissions. Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens). |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy only | CI, `wrangler deploy` | Cloudflare Account ID from the dashboard sidebar. |
| `CLOUDFLARE_DATABASE_ID` | Deploy only | `wrangler.jsonc` | D1 database ID returned by `bunx wrangler d1 create agentstate-db`. |

## Dashboard Environment

| Variable | Required | Where Used | Description |
|----------|----------|------------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Dashboard | Dashboard build, `providers.tsx` | Clerk publishable key for the auth UI. Prefixed with `NEXT_PUBLIC_` so Next.js exposes it to the browser. |
| `CLERK_SECRET_KEY` | Dev only | Local dashboard dev | Clerk secret key. Not needed in production -- the dashboard uses client-side keyless mode. |

## Cloudflare Worker Bindings

Configured in `packages/api/wrangler.jsonc`. These are not traditional env vars -- Cloudflare injects them into the Worker runtime automatically.

| Binding | Type | Description |
|---------|------|-------------|
| `DB` | D1 Database | SQLite database for all application data. Defined in `d1_databases`. |
| `AI` | Workers AI | Used for conversation title generation and follow-up question suggestions. |
| `ASSETS` | Static Assets | Serves the dashboard static export from `packages/dashboard/out/`. Configured with SPA fallback for client-side routing. |

## GitHub Actions Secrets

Set via `scripts/setup-secrets.sh` or the GitHub repository settings UI.

| Secret | Used In | How to Set |
|--------|---------|------------|
| `CLOUDFLARE_API_TOKEN` | Deploy workflow | `./scripts/setup-secrets.sh` (reads from `.env.local`) |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy workflow | `./scripts/setup-secrets.sh` (reads from `.env.local`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Dashboard build | GitHub UI under Settings > Secrets and variables > Actions |

Run the setup script to configure deployment secrets:

```bash
# 1. Fill in .env.local
cp .env.example .env.local

# 2. Push secrets to GitHub
./scripts/setup-secrets.sh
```

## User API Keys (SDK / API Integration)

When integrating AgentState into your application, store the API key as an environment variable. The recommended name is `AGENTSTATE_API_KEY`:

```bash
# .env
AGENTSTATE_API_KEY=as_live_your_key_here
```

```typescript
const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});
```

Key format: `as_live_` prefix + 40 base62 characters. Only the SHA-256 hash is stored server-side.

## Quick Setup Checklist

1. `cp .env.example .env.local` and fill in Cloudflare credentials.
2. Create the D1 database: `bunx wrangler d1 create agentstate-db`.
3. Update `database_id` in `packages/api/wrangler.jsonc`.
4. Set GitHub secrets: `./scripts/setup-secrets.sh`.
5. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in GitHub secrets for dashboard builds.
6. Push to `main` to trigger auto-deploy.

## Files Reference

| File | Purpose |
|------|---------|
| `.env.example` | Template for local credentials |
| `packages/api/wrangler.jsonc` | Worker bindings (DB, AI, ASSETS) |
| `packages/dashboard/src/app/providers.tsx` | Reads `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at runtime |
| `scripts/setup-secrets.sh` | Pushes `.env.local` values to GitHub Actions secrets |
