import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// organizations
// ---------------------------------------------------------------------------

export const organizations = sqliteTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const projects = sqliteTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("projects_org_id_slug_idx").on(table.orgId, table.slug)],
);

// ---------------------------------------------------------------------------
// api_keys
// ---------------------------------------------------------------------------

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: integer("last_used_at"),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [
    index("api_keys_key_hash_idx").on(table.keyHash),
    index("api_keys_project_id_idx").on(table.projectId),
  ],
);

// ---------------------------------------------------------------------------
// conversations
// ---------------------------------------------------------------------------

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    externalId: text("external_id"),
    title: text("title"),
    metadata: text("metadata"),
    messageCount: integer("message_count").notNull().default(0),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("conversations_project_id_idx").on(table.projectId),
    index("conversations_project_id_external_id_idx").on(table.projectId, table.externalId),
    index("conversations_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
    // Partial unique constraint: unique(project_id, external_id) only when external_id is not null.
    // SQLite does not enforce uniqueness on NULL values in a unique index, so a standard unique
    // index is sufficient — multiple rows with external_id = NULL are allowed.
    uniqueIndex("conversations_project_id_external_id_unique_idx").on(
      table.projectId,
      table.externalId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

export const messages = sqliteTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    role: text("role", { enum: ["system", "user", "assistant", "tool"] }).notNull(),
    content: text("content").notNull(),
    metadata: text("metadata"),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_conversation_id_created_at_idx").on(table.conversationId, table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// conversation_tags
// ---------------------------------------------------------------------------

export const conversationTags = sqliteTable(
  "conversation_tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    tag: text("tag").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("conversation_tags_conversation_id_tag_idx").on(table.conversationId, table.tag),
    index("conversation_tags_tag_idx").on(table.tag),
  ],
);

// ---------------------------------------------------------------------------
// rate_limits
// ---------------------------------------------------------------------------

/**
 * Sliding-window rate limit counters, keyed by api_key_hash + window_start.
 *
 * Each row represents one 60-second window for a given API key.
 * The window_start is floored to the minute boundary (unix ms).
 * A TTL-style cleanup happens inline: rows older than 2 minutes are pruned on
 * each check so the table stays bounded without a dedicated cron job.
 */
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    apiKeyHash: text("api_key_hash").notNull(),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("rate_limits_key_window_idx").on(table.apiKeyHash, table.windowStart),
    index("rate_limits_window_start_idx").on(table.windowStart),
  ],
);

// ---------------------------------------------------------------------------
// Select types (rows returned from DB)
// ---------------------------------------------------------------------------

export type Organization = InferSelectModel<typeof organizations>;
export type Project = InferSelectModel<typeof projects>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type Conversation = InferSelectModel<typeof conversations>;
export type Message = InferSelectModel<typeof messages>;
export type ConversationTag = InferSelectModel<typeof conversationTags>;
export type RateLimit = InferSelectModel<typeof rateLimits>;

// ---------------------------------------------------------------------------
// Insert types (rows passed to .insert())
// ---------------------------------------------------------------------------

export type NewOrganization = InferInsertModel<typeof organizations>;
export type NewProject = InferInsertModel<typeof projects>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
export type NewConversation = InferInsertModel<typeof conversations>;
export type NewMessage = InferInsertModel<typeof messages>;
export type NewConversationTag = InferInsertModel<typeof conversationTags>;
export type NewRateLimit = InferInsertModel<typeof rateLimits>;
