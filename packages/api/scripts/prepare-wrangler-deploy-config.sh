#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${WRANGLER_CONFIG:-wrangler.jsonc}"
DEPLOY_CONFIG_PATH="${WRANGLER_DEPLOY_CONFIG:-wrangler.deploy.jsonc}"
INDEX_NAME="${VECTORIZE_INDEX_NAME:-agentstate-embeddings}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Wrangler config not found: $CONFIG_PATH" >&2
  exit 1
fi

if npx wrangler vectorize get "$INDEX_NAME" >/dev/null 2>&1; then
  cp "$CONFIG_PATH" "$DEPLOY_CONFIG_PATH"
  echo "Using Vectorize index '$INDEX_NAME' in deploy config."
  exit 0
fi

echo "::warning title=Vectorize index unavailable::Deploying without VECTORIZE_INDEX. Semantic search endpoints return NOT_CONFIGURED until the index exists and the deploy token can read it."

node - "$CONFIG_PATH" "$DEPLOY_CONFIG_PATH" <<'NODE'
const fs = require("node:fs");
const ts = require("typescript");

const [configPath, deployConfigPath] = process.argv.slice(2);
try {
  const parsed = ts.parseConfigFileTextToJson(configPath, fs.readFileSync(configPath, "utf8"));
  if (parsed.error) {
    throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n"));
  }

  const config = parsed.config;
  delete config.vectorize;
  fs.writeFileSync(deployConfigPath, `${JSON.stringify(config, null, 2)}\n`);
} catch (error) {
  console.error(
    `Failed to write deploy Wrangler config from ${configPath} to ${deployConfigPath}: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}
NODE
