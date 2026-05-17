#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${WRANGLER_CONFIG:-wrangler.jsonc}"
DEPLOY_CONFIG_PATH="${WRANGLER_DEPLOY_CONFIG:-wrangler.deploy.jsonc}"
INDEX_NAME="${VECTORIZE_INDEX_NAME:-agentstate-embeddings}"

if npx wrangler vectorize get "$INDEX_NAME" >/dev/null 2>&1; then
  cp "$CONFIG_PATH" "$DEPLOY_CONFIG_PATH"
  echo "Using Vectorize index '$INDEX_NAME' in deploy config."
  exit 0
fi

echo "::warning title=Vectorize index unavailable::Deploying without VECTORIZE_INDEX. Semantic search endpoints return NOT_CONFIGURED until the index exists and the deploy token can read it."

node - "$CONFIG_PATH" "$DEPLOY_CONFIG_PATH" <<'NODE'
const fs = require("node:fs");

const [configPath, deployConfigPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
delete config.vectorize;
fs.writeFileSync(deployConfigPath, `${JSON.stringify(config, null, 2)}\n`);
NODE
