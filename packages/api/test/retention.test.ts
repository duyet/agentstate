import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanupExpiredConversations } from "../src/services/retention";
import { applyMigrations } from "./setup";

const TEST_ORG_ID = "ret_org_001";
const PROJECT_WITH_RETENTION = "ret_proj_001";
const PROJECT_NO_RETENTION = "ret_proj_002";
const NOW = Date.now();
const DAY_MS = 86_400_000;

async function seed(): Promise<void> {
  const db = env.DB;

  // Organization
  await db.prepare("INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(TEST_ORG_ID, "clerk_ret_test", "Retention Test Org", NOW)
    .run();

  // Project with 30-day retention
  await db.prepare("INSERT OR IGNORE INTO projects (id, org_id, name, slug, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(PROJECT_WITH_RETENTION, TEST_ORG_ID, "Retention Project", "retention-proj", 30, NOW)
    .run();

  // Project with no retention
  await db.prepare("INSERT OR IGNORE INTO projects (id, org_id, name, slug, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(PROJECT_NO_RETENTION, TEST_ORG_ID, "No Retention Project", "no-retention-proj", null, NOW)
    .run();
}

async function insertConversation(
  id: string,
  projectId: string,
  updatedAt: number,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO conversations (id, project_id, external_id, title, message_count, token_count, total_cost_microdollars, total_tokens, created_at, updated_at) VALUES (?, ?, NULL, NULL, 0, 0, 0, 0, ?, ?)",
  )
    .bind(id, projectId, updatedAt, updatedAt)
    .run();
}

async function insertMessage(
  id: string,
  conversationId: string,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, token_count, created_at) VALUES (?, ?, 'user', 'hello', 0, ?)",
  )
    .bind(id, conversationId, NOW)
    .run();
}

async function insertTag(
  id: string,
  conversationId: string,
  tag: string,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO conversation_tags (id, conversation_id, tag, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, conversationId, tag, NOW)
    .run();
}

async function countConversations(projectId: string): Promise<number> {
  const result = await env.DB.prepare("SELECT COUNT(*) as cnt FROM conversations WHERE project_id = ?")
    .bind(projectId)
    .first<{ cnt: number }>();
  return result?.cnt ?? 0;
}

async function countMessages(conversationId: string): Promise<number> {
  const result = await env.DB.prepare("SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?")
    .bind(conversationId)
    .first<{ cnt: number }>();
  return result?.cnt ?? 0;
}

async function countTags(conversationId: string): Promise<number> {
  const result = await env.DB.prepare("SELECT COUNT(*) as cnt FROM conversation_tags WHERE conversation_id = ?")
    .bind(conversationId)
    .first<{ cnt: number }>();
  return result?.cnt ?? 0;
}

describe("Retention Service", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seed();
  });

  it("deletes only expired conversations for project with retention_days", async () => {
    const oldUpdatedAt = NOW - 31 * DAY_MS; // 31 days ago → outside 30-day window
    const newUpdatedAt = NOW - 10 * DAY_MS; // 10 days ago → inside 30-day window

    // Old conversations (should be deleted)
    await insertConversation("ret_conv_old_1", PROJECT_WITH_RETENTION, oldUpdatedAt);
    await insertConversation("ret_conv_old_2", PROJECT_WITH_RETENTION, oldUpdatedAt);
    await insertConversation("ret_conv_old_3", PROJECT_WITH_RETENTION, oldUpdatedAt);

    // New conversations (should be kept)
    await insertConversation("ret_conv_new_1", PROJECT_WITH_RETENTION, newUpdatedAt);
    await insertConversation("ret_conv_new_2", PROJECT_WITH_RETENTION, newUpdatedAt);

    const db = drizzle(env.DB);
    const results = await cleanupExpiredConversations(db);

    expect(results).toHaveLength(1);
    expect(results[0].projectId).toBe(PROJECT_WITH_RETENTION);
    expect(results[0].deleted).toBe(3);
    expect(results[0].retentionDays).toBe(30);

    // Verify old conversations are gone, new ones remain
    expect(await countConversations(PROJECT_WITH_RETENTION)).toBe(2);
  });

  it("does not delete anything for projects without retention_days", async () => {
    const oldUpdatedAt = NOW - 365 * DAY_MS; // 1 year ago

    await insertConversation("ret_conv_noret_old_1", PROJECT_NO_RETENTION, oldUpdatedAt);
    await insertConversation("ret_conv_noret_old_2", PROJECT_NO_RETENTION, oldUpdatedAt);

    const db = drizzle(env.DB);
    const results = await cleanupExpiredConversations(db);

    // Only the retention project results (from previous test data still in DB)
    // No result for PROJECT_NO_RETENTION
    const noRetResult = results.find((r) => r.projectId === PROJECT_NO_RETENTION);
    expect(noRetResult).toBeUndefined();

    expect(await countConversations(PROJECT_NO_RETENTION)).toBe(2);
  });

  it("deletes tags and messages when deleting conversations", async () => {
    // Create a project with 1-day retention
    await env.DB.prepare(
      "INSERT OR IGNORE INTO projects (id, org_id, name, slug, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind("ret_proj_cascade", TEST_ORG_ID, "Cascade Test", "cascade-test", 1, NOW)
      .run();

    const oldTs = NOW - 2 * DAY_MS;
    await insertConversation("ret_conv_cascade", "ret_proj_cascade", oldTs);
    await insertMessage("ret_msg_cascade", "ret_conv_cascade");
    await insertTag("ret_tag_cascade", "ret_conv_cascade", "test-tag");

    // Verify data exists before cleanup
    expect(await countMessages("ret_conv_cascade")).toBe(1);
    expect(await countTags("ret_conv_cascade")).toBe(1);

    const db = drizzle(env.DB);
    const results = await cleanupExpiredConversations(db);

    const cascadeResult = results.find((r) => r.projectId === "ret_proj_cascade");
    expect(cascadeResult).toBeDefined();
    expect(cascadeResult!.deleted).toBe(1);

    // Verify cascade: messages and tags are also gone
    expect(await countMessages("ret_conv_cascade")).toBe(0);
    expect(await countTags("ret_conv_cascade")).toBe(0);
  });

  it("deletes all conversations when retention is aggressive (1 day)", async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO projects (id, org_id, name, slug, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind("ret_proj_1day", TEST_ORG_ID, "1-Day Retention", "1day-retention", 1, NOW)
      .run();

    const oldTs = NOW - 2 * DAY_MS;
    for (let i = 0; i < 10; i++) {
      await insertConversation(`ret_conv_1day_${i}`, "ret_proj_1day", oldTs);
    }

    const db = drizzle(env.DB);
    const results = await cleanupExpiredConversations(db);

    const result = results.find((r) => r.projectId === "ret_proj_1day");
    expect(result).toBeDefined();
    expect(result!.deleted).toBe(10);
    expect(await countConversations("ret_proj_1day")).toBe(0);
  });

  it("handles projects with no expired conversations", async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO projects (id, org_id, name, slug, retention_days, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind("ret_proj_fresh", TEST_ORG_ID, "Fresh Data", "fresh-data", 30, NOW)
      .run();

    // All conversations are recent
    for (let i = 0; i < 5; i++) {
      await insertConversation(`ret_conv_fresh_${i}`, "ret_proj_fresh", NOW - DAY_MS);
    }

    const db = drizzle(env.DB);
    const results = await cleanupExpiredConversations(db);

    const result = results.find((r) => r.projectId === "ret_proj_fresh");
    expect(result).toBeDefined();
    expect(result!.deleted).toBe(0);
    expect(await countConversations("ret_proj_fresh")).toBe(5);
  });
});
