#!/bin/bash
# Setup GitHub secrets for AgentState deployment
# Usage: ./scripts/setup-secrets.sh
#
# Prerequisites:
#   - gh CLI authenticated (gh auth login)
#   - .env.local filled with your Cloudflare credentials

set -euo pipefail

REPO="duyet/agentstate"

# Load .env.local
if [ ! -f .env.local ]; then
  echo "Error: .env.local not found. Copy .env.example to .env.local and fill in your values."
  exit 1
fi

source .env.local

# Validate required vars
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN is empty in .env.local"
  echo "Get one at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Permissions needed: Workers Scripts (Edit), D1 (Edit), Account Settings (Read)"
  exit 1
fi

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID is empty in .env.local"
  echo "Find it at: https://dash.cloudflare.com → right sidebar → Account ID"
  exit 1
fi

echo "Setting GitHub secrets for $REPO..."

gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO" --body "$CLOUDFLARE_API_TOKEN"
echo "  ✓ CLOUDFLARE_API_TOKEN"

gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO" --body "$CLOUDFLARE_ACCOUNT_ID"
echo "  ✓ CLOUDFLARE_ACCOUNT_ID"

echo ""
echo "Done! GitHub Actions can now deploy to Cloudflare."
echo ""
echo "Next steps:"
echo "  1. Create D1 database:"
echo "     CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN npx wrangler d1 create agentstate-db"
echo "  2. Update database_id in packages/api/wrangler.jsonc"
echo "  3. Push to main → auto-deploys"
