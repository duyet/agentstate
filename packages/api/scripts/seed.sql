-- AgentState Seed Data for Local Development
-- Usage: npx wrangler d1 execute agentstate-db --local --file=scripts/seed.sql

INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at)
VALUES ('org_seed_001', 'clerk_org_local', 'Local Dev Org', 1710500000000);

INSERT OR IGNORE INTO projects (id, org_id, name, slug, created_at)
VALUES ('proj_seed_001', 'org_seed_001', 'My First Project', 'my-first-project', 1710500000000);

-- API Key: as_live_TEST_KEY_FOR_LOCAL_DEV_ONLY_1234567890ab
-- SHA-256: pre-computed at seed time. Re-generate if you change the key.
INSERT OR IGNORE INTO api_keys (id, project_id, name, key_prefix, key_hash, created_at)
VALUES (
  'key_seed_001',
  'proj_seed_001',
  'Development',
  'as_live_TEST_',
  'c9c2f7b2acaabbf899dfe461b6d9eb1823326c13da49debdef357e7d8ad05a74',
  1710500000000
);
