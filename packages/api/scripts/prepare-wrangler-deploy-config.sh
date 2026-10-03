#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${WRANGLER_CONFIG:-wrangler.jsonc}"
DEPLOY_CONFIG_PATH="${WRANGLER_DEPLOY_CONFIG:-wrangler.deploy.jsonc}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Wrangler config not found: $CONFIG_PATH" >&2
  exit 1
fi

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
  if (config.triggers?.crons) {
    delete config.triggers;
    console.log(
      "::warning title=Cron triggers omitted::Deploy config does not manage cron triggers to avoid Cloudflare account plan limits.",
    );
  }
  // Mark the deployed Worker as production so CORS excludes localhost origins
  // (see src/lib/cors.ts). Only stamped here — local `wrangler dev` uses
  // wrangler.jsonc directly and never gets this var, so localhost dev origins
  // keep working there.
  config.vars = { ...config.vars, ENVIRONMENT: "production" };
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
