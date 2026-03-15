/**
 * Seed script — creates a default org, project, and API key for local development.
 *
 * Usage:
 *   npx wrangler d1 migrations apply agentstate-db --local
 *   npx tsx scripts/seed.ts
 *
 * Or use wrangler d1 execute directly:
 *   npx wrangler d1 execute agentstate-db --local --file=scripts/seed.sql
 */

const ORG_ID = "org_seed_001";
const PROJECT_ID = "proj_seed_001";
const API_KEY_ID = "key_seed_001";

// Pre-generated test key: as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab
// SHA-256 hash of that key (pre-computed)
const TEST_KEY = "as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab";

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function main() {
  const hash = await hashKey(TEST_KEY);
  const now = Date.now();

  console.log("-- AgentState Seed SQL --");
  console.log("-- Run with: npx wrangler d1 execute agentstate-db --local --file=<this-file>.sql");
  console.log("");
  console.log(`INSERT INTO organizations (id, clerk_org_id, name, created_at) VALUES ('${ORG_ID}', 'clerk_org_local', 'Local Dev Org', ${now});`);
  console.log(`INSERT INTO projects (id, org_id, name, slug, created_at) VALUES ('${PROJECT_ID}', '${ORG_ID}', 'My First Project', 'my-first-project', ${now});`);
  console.log(`INSERT INTO api_keys (id, project_id, name, key_prefix, key_hash, created_at) VALUES ('${API_KEY_ID}', '${PROJECT_ID}', 'Development', '${TEST_KEY.substring(0, 12)}', '${hash}', ${now});`);
  console.log("");
  console.log(`-- Your test API key: ${TEST_KEY}`);
}

main();
