// ---------------------------------------------------------------------------
// Projects service — Business logic for project and API key management
// ---------------------------------------------------------------------------

import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  agentStates,
  apiKeys,
  capabilityTokens,
  claimEvidence,
  claims,
  claimVerificationRuns,
  conversations,
  conversationTags,
  customDomains,
  idempotencyKeys,
  messages,
  oauthAuthorizationCodes,
  oauthRefreshTokens,
  organizations,
  projects,
  rateLimits,
  stateEvents,
  stateLeases,
  stateSnapshots,
  stateTags,
  webhooks,
} from "../db/schema";
import { buildApiKey } from "../lib/api-key";
import { generateId } from "../lib/id";
import { parseScopesJson } from "../lib/scopes";
import { deserializeMetadata } from "../lib/serialization";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectWithKeys {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: number;
  retention_days: number | null;
  api_keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[] | null;
    created_at: number;
    last_used_at: number | null;
    revoked_at: number | null;
  }>;
}

export interface ProjectListItem {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: number;
  key_count: number;
  conversation_count: number;
  message_count: number;
  total_tokens: number;
  last_activity_at: number | null;
}

export interface ConversationListItem {
  id: string;
  project_id: string;
  external_id: string | null;
  title: string | null;
  metadata: unknown;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

export interface MessageListItem {
  id: string;
  role: string;
  content: string;
  metadata: unknown;
  token_count: number;
  created_at: number;
}

export interface CreateProjectResult {
  project: {
    id: string;
    org_id: string;
    name: string;
    slug: string;
    created_at: number;
  };
  api_key: {
    id: string;
    name: string;
    key_prefix: string;
    key: string;
    scopes: string[] | null;
    created_at: number;
  };
}

// ---------------------------------------------------------------------------
// Organization Management
// ---------------------------------------------------------------------------

/**
 * Get or create an organization by Clerk org ID.
 */
export async function getOrCreateOrg(
  db: DrizzleD1Database,
  clerkOrgId: string,
): Promise<{ id: string; clerkOrgId: string; name: string; createdAt: number }> {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (existing) {
    return existing;
  }

  const orgId = generateId();
  const now = Date.now();
  const orgName = clerkOrgId;

  await db.insert(organizations).values({
    id: orgId,
    clerkOrgId,
    name: orgName,
    createdAt: now,
  });

  return { id: orgId, clerkOrgId, name: orgName, createdAt: now };
}

/**
 * Get organization by Clerk org ID.
 */
export async function getOrgByClerkId(
  db: DrizzleD1Database,
  clerkOrgId: string,
): Promise<{ id: string; clerkOrgId: string; name: string; createdAt: number } | null> {
  return (
    (await db.select().from(organizations).where(eq(organizations.clerkOrgId, clerkOrgId)).get()) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Project CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new project with a default API key.
 *
 * `clerkOrgId` is required at the type level: callers MUST pass the org id
 * resolved from the verified Clerk session (see `verifyDashboardSession`,
 * which derives `personal:<userId>` for org-less sessions). A silent
 * fallback to a shared "default" org previously let any caller that omitted
 * the org id resurrect the #254 cross-tenant leak — omitting it is now a
 * compile-time error (#277).
 */
export async function createProject(
  db: DrizzleD1Database,
  name: string,
  slug: string,
  clerkOrgId: string,
): Promise<CreateProjectResult> {
  const org = await getOrCreateOrg(db, clerkOrgId);
  const now = Date.now();

  // Check slug uniqueness within the org
  const existing = await db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, org.id), eq(projects.slug, slug)))
    .get();

  if (existing) {
    throw new Error(`Slug "${slug}" is already taken in this org`);
  }

  // Create the project
  const projectId = generateId();
  await db.insert(projects).values({
    id: projectId,
    orgId: org.id,
    name,
    slug,
    createdAt: now,
  });

  // Auto-generate a default API key
  const key = await buildApiKey(projectId, "Default");
  await db.insert(apiKeys).values(key.values);

  return {
    project: {
      id: projectId,
      org_id: org.id,
      name,
      slug,
      created_at: now,
    },
    api_key: {
      id: key.id,
      name: "Default",
      key_prefix: key.prefix,
      key: key.rawKey,
      scopes: null, // default key is full-access (unscoped)
      created_at: key.now,
    },
  };
}

/**
 * List projects for an organization with active key counts.
 *
 * `clerkOrgId` is required at the type level — see `createProject` (#277).
 */
export async function listProjects(
  db: DrizzleD1Database,
  clerkOrgId: string,
): Promise<ProjectListItem[]> {
  const org = await getOrgByClerkId(db, clerkOrgId);

  if (!org) {
    // Org rows are created lazily (see getOrCreateOrg), so a missing row is
    // legitimate for an org that has not created its first project yet — this
    // must stay a 200 with an empty list, not an error (#388).
    //
    // It is ALSO how orphaned tenants look: #276 changed org-id derivation and
    // silently stranded every project written under the old scheme. The two are
    // indistinguishable from the response, so log the id shape to tell them
    // apart. The value is a Clerk org id or `personal:<userId>`, not a secret.
    console.warn(
      JSON.stringify({
        event: "org_not_found",
        clerk_org_id: clerkOrgId,
        kind: clerkOrgId.startsWith("personal:") ? "personal" : "clerk_org",
        msg: "Session org resolved to no organization row; returning empty project list.",
      }),
    );
    return [];
  }

  const baseRows = await db
    .select({
      id: projects.id,
      org_id: projects.orgId,
      name: projects.name,
      slug: projects.slug,
      created_at: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.orgId, org.id));

  if (baseRows.length === 0) {
    return [];
  }

  const projectIds = baseRows.map((r) => r.id);

  // Active key counts, grouped by project.
  const keyRows = await db
    .select({
      projectId: apiKeys.projectId,
      key_count: sql<number>`count(*)`.as("key_count"),
    })
    .from(apiKeys)
    .where(and(inArray(apiKeys.projectId, projectIds), isNull(apiKeys.revokedAt)))
    .groupBy(apiKeys.projectId);

  // Per-project conversation aggregates. Conversations already store rolled-up
  // message_count/token_count/updated_at, so no message-table join is needed.
  // Aggregated in a separate query (not joined with keys) to avoid the
  // cartesian-product inflation a multi-table GROUP BY would cause.
  const convRows = await db
    .select({
      projectId: conversations.projectId,
      conversation_count: sql<number>`count(*)`.as("conversation_count"),
      message_count: sql<number>`coalesce(sum(${conversations.messageCount}), 0)`.as(
        "message_count",
      ),
      total_tokens: sql<number>`coalesce(sum(${conversations.tokenCount}), 0)`.as("total_tokens"),
      last_activity_at: sql<number | null>`max(${conversations.updatedAt})`.as("last_activity_at"),
    })
    .from(conversations)
    .where(inArray(conversations.projectId, projectIds))
    .groupBy(conversations.projectId);

  const keyCountByProject = new Map(keyRows.map((r) => [r.projectId, r.key_count]));
  const convStatsByProject = new Map(convRows.map((r) => [r.projectId, r]));

  return baseRows.map((row) => {
    const stats = convStatsByProject.get(row.id);
    return {
      ...row,
      key_count: keyCountByProject.get(row.id) ?? 0,
      conversation_count: stats?.conversation_count ?? 0,
      message_count: stats?.message_count ?? 0,
      total_tokens: stats?.total_tokens ?? 0,
      last_activity_at: stats?.last_activity_at ?? null,
    };
  });
}

/**
 * Get project by ID with API keys.
 */
export async function getProjectById(
  db: DrizzleD1Database,
  projectId: string,
): Promise<ProjectWithKeys | null> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return null;
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      key_prefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      created_at: apiKeys.createdAt,
      last_used_at: apiKeys.lastUsedAt,
      revoked_at: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId));

  return {
    id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    retention_days: project.retentionDays ?? null,
    api_keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      scopes: k.scopes ? parseScopesJson(k.scopes) : null,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
    })),
  };
}

/**
 * Get project by slug with API keys.
 */
export async function getProjectBySlug(
  db: DrizzleD1Database,
  slug: string,
): Promise<ProjectWithKeys | null> {
  const project = await db.select().from(projects).where(eq(projects.slug, slug)).get();

  if (!project) {
    return null;
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      key_prefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      created_at: apiKeys.createdAt,
      last_used_at: apiKeys.lastUsedAt,
      revoked_at: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, project.id));

  return {
    id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    retention_days: project.retentionDays ?? null,
    api_keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      scopes: k.scopes ? parseScopesJson(k.scopes) : null,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
    })),
  };
}

/**
 * Delete a project and ALL related data.
 *
 * D1 does not reliably enforce `ON DELETE CASCADE` (foreign-key enforcement is
 * off by default), so every child table is deleted explicitly rather than
 * relying on the FK cascade. Missing any table would orphan rows that keep the
 * data (and, for api_keys / capability_tokens, keep credentials usable).
 *
 * Returns the list of credential hashes (API keys AND capability tokens) for
 * the project so callers can invalidate the corresponding auth-cache entries —
 * without this a revoked/deleted credential could still authenticate until its
 * cache entry expires.
 */
export async function deleteProject(db: DrizzleD1Database, projectId: string): Promise<string[]> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    throw new Error("Project not found");
  }

  // Collect credential hashes BEFORE the delete so the route can invalidate each
  // one's auth-cache entry (api keys and capability/OAuth access tokens).
  const [keyRows, capRows] = await Promise.all([
    db.select({ keyHash: apiKeys.keyHash }).from(apiKeys).where(eq(apiKeys.projectId, projectId)),
    db
      .select({ keyHash: capabilityTokens.keyHash })
      .from(capabilityTokens)
      .where(eq(capabilityTokens.projectId, projectId)),
  ]);
  const keyHashes = [...keyRows.map((r) => r.keyHash), ...capRows.map((r) => r.keyHash)];

  // Subquery for conversation IDs to avoid N+1 query
  const conversationIdSubquery = db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, projectId));

  await db.batch([
    // Conversation subtree (children first, then conversations).
    db
      .delete(conversationTags)
      .where(inArray(conversationTags.conversationId, conversationIdSubquery)),
    db.delete(messages).where(inArray(messages.conversationId, conversationIdSubquery)),
    db.delete(conversations).where(eq(conversations.projectId, projectId)),
    // Claim subtree (evidence + verification runs reference claims).
    db.delete(claimVerificationRuns).where(eq(claimVerificationRuns.projectId, projectId)),
    db.delete(claimEvidence).where(eq(claimEvidence.projectId, projectId)),
    db.delete(claims).where(eq(claims.projectId, projectId)),
    // State platform tables.
    db.delete(stateEvents).where(eq(stateEvents.projectId, projectId)),
    db.delete(stateSnapshots).where(eq(stateSnapshots.projectId, projectId)),
    db.delete(stateTags).where(eq(stateTags.projectId, projectId)),
    db.delete(stateLeases).where(eq(stateLeases.projectId, projectId)),
    db.delete(agentStates).where(eq(agentStates.projectId, projectId)),
    db.delete(idempotencyKeys).where(eq(idempotencyKeys.projectId, projectId)),
    // OAuth artifacts bound to the project.
    db.delete(oauthRefreshTokens).where(eq(oauthRefreshTokens.projectId, projectId)),
    db.delete(oauthAuthorizationCodes).where(eq(oauthAuthorizationCodes.projectId, projectId)),
    // Credentials + config.
    db.delete(capabilityTokens).where(eq(capabilityTokens.projectId, projectId)),
    db.delete(webhooks).where(eq(webhooks.projectId, projectId)),
    db.delete(customDomains).where(eq(customDomains.projectId, projectId)),
    db.delete(apiKeys).where(eq(apiKeys.projectId, projectId)),
    db.delete(projects).where(eq(projects.id, projectId)),
  ]);

  return keyHashes;
}

/**
 * Update a project's name and/or retention window.
 * Throws "Project not found" if the project does not exist.
 * Performs the write only — callers re-read via getProjectById for the response.
 */
export async function updateProject(
  db: DrizzleD1Database,
  projectId: string,
  input: { name?: string; retention_days?: number | null },
): Promise<void> {
  const existing = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) {
    throw new Error("Project not found");
  }

  const updates: Partial<typeof projects.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.retention_days !== undefined) updates.retentionDays = input.retention_days;

  // Nothing to change — avoid an invalid `SET` clause. The route's schema
  // already requires at least one field, so this only guards direct callers.
  if (Object.keys(updates).length === 0) return;

  await db.update(projects).set(updates).where(eq(projects.id, projectId));
}

// ---------------------------------------------------------------------------
// API Key Management
// ---------------------------------------------------------------------------

/**
 * Create a new API key for a project.
 */
export async function createApiKey(
  db: DrizzleD1Database,
  projectId: string,
  name: string,
  scopes?: string[],
): Promise<{
  id: string;
  name: string;
  key_prefix: string;
  key: string;
  scopes: string[] | null;
  created_at: number;
}> {
  // Verify the project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    throw new Error("Project not found");
  }

  const key = await buildApiKey(projectId, name, scopes);
  await db.insert(apiKeys).values(key.values);

  return {
    id: key.id,
    name,
    key_prefix: key.prefix,
    key: key.rawKey,
    scopes: scopes && scopes.length > 0 ? scopes : null,
    created_at: key.now,
  };
}

/**
 * Revoke an API key.
 * Returns the revoked key's hash (so callers can invalidate the auth cache),
 * or null if no matching key was found.
 */
export async function revokeApiKey(
  db: DrizzleD1Database,
  projectId: string,
  keyId: string,
): Promise<string | null> {
  const [existing] = await db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return existing.keyHash;
}

// ---------------------------------------------------------------------------
// Project Conversations & Messages (Dashboard)
// ---------------------------------------------------------------------------

/**
 * List conversations for a project (dashboard use).
 */
export async function listProjectConversations(
  db: DrizzleD1Database,
  projectId: string,
  limit: number,
): Promise<ConversationListItem[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    project_id: r.projectId,
    external_id: r.externalId,
    title: r.title,
    metadata: deserializeMetadata(r.metadata),
    message_count: r.messageCount,
    token_count: r.tokenCount,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));
}

/**
 * List messages for a conversation in a project (dashboard use).
 */
export async function listProjectMessages(
  db: DrizzleD1Database,
  projectId: string,
  convId: string,
): Promise<MessageListItem[]> {
  // Verify conversation belongs to this project
  const conv = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.projectId, projectId)))
    .get();

  if (!conv) {
    return [];
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(500);

  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    metadata: deserializeMetadata(m.metadata),
    token_count: m.tokenCount,
    created_at: m.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Rate Limiting (Project Creation)
// ---------------------------------------------------------------------------

export const PROJECT_CREATION_RATE_LIMIT = 5;
export const PROJECT_CREATION_WINDOW_MS = 60_000;

/**
 * Get a hash of the input string for use as a rate limit identifier.
 */
export async function hashIdentifier(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Check project creation rate limit.
 * Returns { allowed: boolean, remaining: number, retryAfter?: number, resetAt?: number }
 */
export async function checkProjectCreationRateLimit(
  db: DrizzleD1Database,
  identifier: string,
  rateLimit = PROJECT_CREATION_RATE_LIMIT,
): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  resetAt?: number;
}> {
  const now = Date.now();
  const windowStart = now - (now % PROJECT_CREATION_WINDOW_MS);
  const rateLimitId = `pc:${identifier}:${windowStart}`;

  // Check if a rate limit row exists for this window
  const existing = await db.select().from(rateLimits).where(eq(rateLimits.id, rateLimitId)).get();

  let currentCount: number;

  if (existing) {
    // Increment existing counter
    const updated = await db
      .update(rateLimits)
      .set({
        requestCount: sql`${rateLimits.requestCount} + 1`,
        updatedAt: now,
      })
      .where(eq(rateLimits.id, rateLimitId))
      .returning({ requestCount: rateLimits.requestCount });

    currentCount = updated[0]?.requestCount ?? 1;
  } else {
    // Create new rate limit entry with count = 1
    await db
      .insert(rateLimits)
      .values({
        id: rateLimitId,
        apiKeyHash: identifier,
        windowStart,
        requestCount: 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: rateLimits.id,
        set: {
          requestCount: sql`${rateLimits.requestCount} + 1`,
          updatedAt: now,
        },
      });

    currentCount = 1;
  }

  const remaining = Math.max(0, rateLimit - currentCount);

  if (currentCount > rateLimit) {
    const windowEnd = windowStart + PROJECT_CREATION_WINDOW_MS;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    const resetSeconds = Math.ceil(windowEnd / 1000);

    return { allowed: false, remaining, retryAfter, resetAt: resetSeconds };
  }

  return { allowed: true, remaining };
}

/**
 * Clean up old project creation rate limit rows.
 * This should be called as a fire-and-forget operation.
 */
export function pruneOldRateLimits(db: DrizzleD1Database, now: number): Promise<unknown> {
  const pruneOlderThan = now - PROJECT_CREATION_WINDOW_MS * 2;
  return db.delete(rateLimits).where(
    and(
      lt(rateLimits.windowStart, pruneOlderThan),
      // Only delete rows that start with "pc:" (project creation rate limits)
      sql`id LIKE 'pc:%'`,
    ),
  );
}
