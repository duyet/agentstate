import { env } from "cloudflare:test";

// Individual DDL statements extracted from drizzle/0000_natural_hydra.sql.
// We run them one by one using prepare().run() to avoid multi-statement issues.
const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS \`api_keys\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`project_id\` text NOT NULL,
    \`name\` text NOT NULL,
    \`key_prefix\` text NOT NULL,
    \`key_hash\` text NOT NULL,
    \`last_used_at\` integer,
    \`created_at\` integer NOT NULL,
    \`revoked_at\` integer,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE INDEX IF NOT EXISTS \`api_keys_key_hash_idx\` ON \`api_keys\` (\`key_hash\`)`,
  `CREATE INDEX IF NOT EXISTS \`api_keys_project_id_idx\` ON \`api_keys\` (\`project_id\`)`,
  `CREATE TABLE IF NOT EXISTS \`conversations\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`project_id\` text NOT NULL,
    \`external_id\` text,
    \`title\` text,
    \`metadata\` text,
    \`message_count\` integer DEFAULT 0 NOT NULL,
    \`token_count\` integer DEFAULT 0 NOT NULL,
    \`total_cost_microdollars\` integer DEFAULT 0 NOT NULL,
    \`total_tokens\` integer DEFAULT 0 NOT NULL,
    \`created_at\` integer NOT NULL,
    \`updated_at\` integer NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE INDEX IF NOT EXISTS \`conversations_project_id_idx\` ON \`conversations\` (\`project_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`conversations_project_id_created_at_idx\` ON \`conversations\` (\`project_id\`,\`created_at\`)`,
  `CREATE INDEX IF NOT EXISTS \`conversations_project_id_external_id_idx\` ON \`conversations\` (\`project_id\`,\`external_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`conversations_project_id_updated_at_idx\` ON \`conversations\` (\`project_id\`,\`updated_at\`)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`conversations_project_id_external_id_unique_idx\` ON \`conversations\` (\`project_id\`,\`external_id\`)`,
  `CREATE TABLE IF NOT EXISTS \`messages\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`conversation_id\` text NOT NULL,
    \`role\` text NOT NULL,
    \`content\` text NOT NULL,
    \`metadata\` text,
    \`token_count\` integer DEFAULT 0 NOT NULL,
    \`model\` text,
    \`input_tokens\` integer,
    \`output_tokens\` integer,
    \`cost_microdollars\` integer,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE INDEX IF NOT EXISTS \`messages_conversation_id_idx\` ON \`messages\` (\`conversation_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`messages_conversation_id_created_at_idx\` ON \`messages\` (\`conversation_id\`,\`created_at\`)`,
  `CREATE TABLE IF NOT EXISTS \`organizations\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`clerk_org_id\` text NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`organizations_clerk_org_id_unique\` ON \`organizations\` (\`clerk_org_id\`)`,
  `CREATE TABLE IF NOT EXISTS \`projects\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`org_id\` text NOT NULL,
    \`name\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`retention_days\` integer,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`org_id\`) REFERENCES \`organizations\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`projects_org_id_slug_idx\` ON \`projects\` (\`org_id\`,\`slug\`)`,
  `CREATE TABLE IF NOT EXISTS \`rate_limits\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`api_key_hash\` text NOT NULL,
    \`window_start\` integer NOT NULL,
    \`request_count\` integer DEFAULT 0 NOT NULL,
    \`updated_at\` integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`rate_limits_key_window_idx\` ON \`rate_limits\` (\`api_key_hash\`,\`window_start\`)`,
  `CREATE INDEX IF NOT EXISTS \`rate_limits_window_start_idx\` ON \`rate_limits\` (\`window_start\`)`,
  `CREATE TABLE IF NOT EXISTS \`conversation_tags\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`conversation_id\` text NOT NULL,
    \`tag\` text NOT NULL,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`conversation_tags_conversation_id_tag_idx\` ON \`conversation_tags\` (\`conversation_id\`,\`tag\`)`,
  `CREATE INDEX IF NOT EXISTS \`conversation_tags_tag_idx\` ON \`conversation_tags\` (\`tag\`)`,
  `CREATE TABLE IF NOT EXISTS \`webhooks\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`project_id\` text NOT NULL,
    \`url\` text NOT NULL,
    \`events\` text NOT NULL,
    \`secret\` text NOT NULL,
    \`active\` integer DEFAULT 1 NOT NULL,
    \`created_at\` integer NOT NULL,
    \`last_triggered_at\` integer,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS \`webhooks_project_id_idx\` ON \`webhooks\` (\`project_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`webhooks_project_id_active_idx\` ON \`webhooks\` (\`project_id\`,\`active\`)`,
];

// Fixed seed data for deterministic tests
export const TEST_ORG_ID = "org_test_0000000000001";
export const TEST_PROJECT_ID = "proj_test_000000000001";
export const TEST_API_KEY = "as_live_TestKeyABCDEFGHIJKLMNOPQRSTUVWXYZabcd";
export const TEST_KEY_ID = "key_test_000000000001";

async function computeSHA256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function applyMigrations(): Promise<void> {
  for (const stmt of DDL_STATEMENTS) {
    await env.DB.prepare(stmt).run();
  }
}

export async function seedProject(): Promise<void> {
  const now = Date.now();
  const keyHash = await computeSHA256Hex(TEST_API_KEY);
  const keyPrefix = TEST_API_KEY.substring(0, 12);

  await env.DB.prepare(
    `INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(TEST_ORG_ID, "clerk_test_org_001", "Test Org", now)
    .run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(TEST_PROJECT_ID, TEST_ORG_ID, "Test Project", "test-project", now)
    .run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO api_keys (id, project_id, name, key_prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(TEST_KEY_ID, TEST_PROJECT_ID, "Test Key", keyPrefix, keyHash, now)
    .run();
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${TEST_API_KEY}`,
    "Content-Type": "application/json",
  };
}
