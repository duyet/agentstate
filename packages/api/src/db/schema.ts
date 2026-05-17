import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { MESSAGE_ROLES } from "../lib/validation";

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
    retentionDays: integer("retention_days"), // NULL = infinite retention
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("projects_org_id_slug_idx").on(table.orgId, table.slug),
    check(
      "projects_retention_days_range_check",
      sql`${table.retentionDays} IS NULL OR (${table.retentionDays} BETWEEN 1 AND 3650)`,
    ),
  ],
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
    totalCostMicrodollars: integer("total_cost_microdollars").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("conversations_project_id_idx").on(table.projectId),
    index("conversations_project_id_created_at_idx").on(table.projectId, table.createdAt),
    index("conversations_project_id_external_id_idx").on(table.projectId, table.externalId),
    // Covering index for pagination (covers both WHERE and ORDER BY)
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
    role: text("role", { enum: MESSAGE_ROLES }).notNull(),
    content: text("content").notNull(),
    metadata: text("metadata"),
    tokenCount: integer("token_count").notNull().default(0),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicrodollars: integer("cost_microdollars"),
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
    // Composite index for tag-based conversation lookups (optimizes tag filtering)
    index("conversation_tags_tag_conversation_id_idx").on(table.tag, table.conversationId),
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
// webhooks
// ---------------------------------------------------------------------------

/**
 * Webhook configurations for real-time event notifications.
 *
 * Webhooks are triggered asynchronously after events occur.
 * The system sends POST requests to configured URLs with HMAC signatures.
 */
export const webhooks = sqliteTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: text("events").notNull(), // JSON array: ["conversation.created"]
    secret: text("secret").notNull(), // HMAC secret for signature verification
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull(),
    lastTriggeredAt: integer("last_triggered_at"),
  },
  (table) => [
    index("webhooks_project_id_idx").on(table.projectId),
    index("webhooks_project_id_active_idx").on(table.projectId, table.active),
  ],
);

// ---------------------------------------------------------------------------
// custom_domains
// ---------------------------------------------------------------------------

/**
 * Custom domain configurations for projects.
 *
 * Stores custom domains with SSL verification tokens and status.
 * Domains can be verified via DNS TXT record, HTTP file, or meta tag.
 */
export const customDomains = sqliteTable(
  "custom_domains",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    verificationToken: text("verification_token").notNull(),
    verificationStatus: text("verification_status", {
      enum: ["pending", "verified", "failed"],
    })
      .notNull()
      .default("pending"),
    verifiedAt: integer("verified_at"),
    sslEnabled: integer("ssl_enabled", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("custom_domains_project_id_idx").on(table.projectId),
    index("custom_domains_verification_status_idx").on(table.verificationStatus),
  ],
);

// ---------------------------------------------------------------------------
// agent_states
// ---------------------------------------------------------------------------

export const agentStates = sqliteTable(
  "agent_states",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    agentId: text("agent_id").notNull(),
    data: text("data").notNull(),
    metadata: text("metadata"),
    tags: text("tags").notNull().default("[]"),
    latestSequence: integer("latest_sequence").notNull(),
    deletedAt: integer("deleted_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("agent_states_project_id_state_key_idx").on(table.projectId, table.stateKey),
    index("agent_states_project_id_agent_id_idx").on(table.projectId, table.agentId),
    index("agent_states_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
    index("agent_states_project_id_latest_sequence_idx").on(table.projectId, table.latestSequence),
  ],
);

// ---------------------------------------------------------------------------
// state_events
// ---------------------------------------------------------------------------

export const stateEvents = sqliteTable(
  "state_events",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id")
      .notNull()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    agentId: text("agent_id").notNull(),
    eventType: text("event_type", { enum: ["upsert", "delete"] }).notNull(),
    data: text("data"),
    metadata: text("metadata"),
    tags: text("tags").notNull().default("[]"),
    idempotencyKey: text("idempotency_key"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("state_events_id_idx").on(table.id),
    index("state_events_project_id_sequence_idx").on(table.projectId, table.sequence),
    index("state_events_project_id_state_key_idx").on(table.projectId, table.stateKey),
    index("state_events_project_id_created_at_idx").on(table.projectId, table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// state_snapshots
// ---------------------------------------------------------------------------

export const stateSnapshots = sqliteTable(
  "state_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    sequence: integer("sequence").notNull(),
    data: text("data"),
    metadata: text("metadata"),
    tags: text("tags").notNull().default("[]"),
    deletedAt: integer("deleted_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("state_snapshots_project_id_state_key_sequence_idx").on(
      table.projectId,
      table.stateKey,
      table.sequence,
    ),
    index("state_snapshots_project_id_sequence_idx").on(table.projectId, table.sequence),
  ],
);

// ---------------------------------------------------------------------------
// state_tags
// ---------------------------------------------------------------------------

export const stateTags = sqliteTable(
  "state_tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    tag: text("tag").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("state_tags_project_id_state_key_tag_idx").on(
      table.projectId,
      table.stateKey,
      table.tag,
    ),
    index("state_tags_project_id_tag_idx").on(table.projectId, table.tag),
  ],
);

// ---------------------------------------------------------------------------
// idempotency_keys
// ---------------------------------------------------------------------------

export const idempotencyKeys = sqliteTable(
  "idempotency_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: text("response_body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idempotency_keys_project_id_key_idx").on(table.projectId, table.key),
    index("idempotency_keys_project_id_created_at_idx").on(table.projectId, table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// capability_tokens
// ---------------------------------------------------------------------------

export const capabilityTokens = sqliteTable(
  "capability_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: text("scopes").notNull(),
    expiresAt: integer("expires_at"),
    lastUsedAt: integer("last_used_at"),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [
    index("capability_tokens_key_hash_idx").on(table.keyHash),
    index("capability_tokens_project_id_idx").on(table.projectId),
  ],
);

// ---------------------------------------------------------------------------
// state_leases
// ---------------------------------------------------------------------------

export const stateLeases = sqliteTable(
  "state_leases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    holder: text("holder").notNull(),
    fencingToken: integer("fencing_token").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    renewedAt: integer("renewed_at").notNull(),
    releasedAt: integer("released_at"),
  },
  (table) => [
    index("state_leases_project_id_state_key_idx").on(table.projectId, table.stateKey),
    index("state_leases_project_id_expires_at_idx").on(table.projectId, table.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// claims
// ---------------------------------------------------------------------------

export const claims = sqliteTable(
  "claims",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    statement: text("statement").notNull(),
    status: text("status", { enum: ["pending", "verified", "failed"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("claims_project_id_created_at_idx").on(table.projectId, table.createdAt),
    index("claims_project_id_subject_idx").on(table.projectId, table.subjectType, table.subjectId),
  ],
);

export const claimEvidence = sqliteTable(
  "claim_evidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["state_event", "text_hash", "json_value"] }).notNull(),
    source: text("source").notNull(),
    data: text("data"),
    hash: text("hash"),
    jsonPath: text("json_path"),
    expectedValue: text("expected_value"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("claim_evidence_project_id_claim_id_idx").on(table.projectId, table.claimId)],
);

export const claimVerificationRuns = sqliteTable(
  "claim_verification_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["verified", "failed"] }).notNull(),
    details: text("details").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("claim_verification_runs_project_id_claim_id_idx").on(table.projectId, table.claimId),
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
export type Webhook = InferSelectModel<typeof webhooks>;
export type CustomDomain = InferSelectModel<typeof customDomains>;
export type AgentState = InferSelectModel<typeof agentStates>;
export type StateEvent = InferSelectModel<typeof stateEvents>;
export type StateSnapshot = InferSelectModel<typeof stateSnapshots>;
export type StateTag = InferSelectModel<typeof stateTags>;
export type IdempotencyKey = InferSelectModel<typeof idempotencyKeys>;
export type CapabilityToken = InferSelectModel<typeof capabilityTokens>;
export type StateLease = InferSelectModel<typeof stateLeases>;
export type Claim = InferSelectModel<typeof claims>;
export type ClaimEvidence = InferSelectModel<typeof claimEvidence>;
export type ClaimVerificationRun = InferSelectModel<typeof claimVerificationRuns>;

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
export type NewWebhook = InferInsertModel<typeof webhooks>;
export type NewCustomDomain = InferInsertModel<typeof customDomains>;
export type NewAgentState = InferInsertModel<typeof agentStates>;
export type NewStateEvent = InferInsertModel<typeof stateEvents>;
export type NewStateSnapshot = InferInsertModel<typeof stateSnapshots>;
export type NewStateTag = InferInsertModel<typeof stateTags>;
export type NewIdempotencyKey = InferInsertModel<typeof idempotencyKeys>;
export type NewCapabilityToken = InferInsertModel<typeof capabilityTokens>;
export type NewStateLease = InferInsertModel<typeof stateLeases>;
export type NewClaim = InferInsertModel<typeof claims>;
export type NewClaimEvidence = InferInsertModel<typeof claimEvidence>;
export type NewClaimVerificationRun = InferInsertModel<typeof claimVerificationRuns>;
