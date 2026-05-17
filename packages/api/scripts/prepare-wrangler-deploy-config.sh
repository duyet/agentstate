#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${WRANGLER_CONFIG:-wrangler.jsonc}"
DEPLOY_CONFIG_PATH="${WRANGLER_DEPLOY_CONFIG:-wrangler.deploy.jsonc}"
INDEX_NAME="${VECTORIZE_INDEX_NAME:-agentstate-embeddings}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Wrangler config not found: $CONFIG_PATH" >&2
  exit 1
fi

VECTORIZE_AVAILABLE=0
if npx wrangler vectorize get "$INDEX_NAME" >/dev/null 2>&1; then
  VECTORIZE_AVAILABLE=1
  echo "Using Vectorize index '$INDEX_NAME' in deploy config."
else
  echo "::warning title=Vectorize index unavailable::Deploying without VECTORIZE_INDEX. Semantic search endpoints return NOT_CONFIGURED until the index exists and the deploy token can read it."
fi

node - "$CONFIG_PATH" "$DEPLOY_CONFIG_PATH" "$VECTORIZE_AVAILABLE" <<'NODE'
const fs = require("node:fs");
const ts = require("typescript");

const [configPath, deployConfigPath, vectorizeAvailable] = process.argv.slice(2);
try {
  const parsed = ts.parseConfigFileTextToJson(configPath, fs.readFileSync(configPath, "utf8"));
  if (parsed.error) {
    throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n"));
  }

  const config = parsed.config;
  if (vectorizeAvailable !== "1") {
    delete config.vectorize;
  }
  if (config.triggers?.crons) {
    delete config.triggers;
    console.log(
      "::warning title=Cron triggers omitted::Deploy config does not manage cron triggers to avoid Cloudflare account plan limits.",
    );
  }
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
