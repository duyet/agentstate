#!/usr/bin/env bash
set -euo pipefail

INDEX_NAME="${VECTORIZE_INDEX_NAME:-agentstate-embeddings}"
DIMENSIONS="${VECTORIZE_DIMENSIONS:-1024}"
METRIC="${VECTORIZE_METRIC:-cosine}"

if npx wrangler vectorize get "$INDEX_NAME" >/dev/null 2>&1; then
  echo "Vectorize index '$INDEX_NAME' already exists."
  exit 0
fi

echo "Creating Vectorize index '$INDEX_NAME' (${DIMENSIONS} dimensions, ${METRIC})."
npx wrangler vectorize create "$INDEX_NAME" --dimensions="$DIMENSIONS" --metric="$METRIC"
