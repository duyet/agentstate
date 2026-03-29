// ---------------------------------------------------------------------------
// Projects service — Business logic for project and API key management
// ---------------------------------------------------------------------------

import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  apiKeys,
  conversations,
  conversationTags,
  messages,
  organizations,
  projects,
  rateLimits,
} from "../db/schema";
import { buildApiKey } from "../lib/api-key";
import { DEFAULT_CLERK_ORG_ID } from "../lib/constants";
import { generateId } from "../lib/id";
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
  const orgName = clerkOrgId === DEFAULT_CLERK_ORG_ID ? "Default Organization" : clerkOrgId;

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
 */
export async function createProject(
  db: DrizzleD1Database,
  name: string,
  slug: string,
  clerkOrgId?: string,
): Promise<CreateProjectResult> {
  const org = await getOrCreateOrg(db, clerkOrgId ?? DEFAULT_CLERK_ORG_ID);
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
      created_at: key.now,
    },
  };
}

/**
 * List projects for an organization with active key counts.
 */
export async function listProjects(
  db: DrizzleD1Database,
  clerkOrgId?: string,
): Promise<ProjectListItem[]> {
  const org = await getOrgByClerkId(db, clerkOrgId ?? DEFAULT_CLERK_ORG_ID);

  if (!org) {
    return [];
  }

  const rows = await db
    .select({
      id: projects.id,
      org_id: projects.orgId,
      name: projects.name,
      slug: projects.slug,
      created_at: projects.createdAt,
      key_count: sql<number>`count(${apiKeys.id})`.as("key_count"),
    })
    .from(projects)
    .leftJoin(apiKeys, and(eq(apiKeys.projectId, projects.id), isNull(apiKeys.revokedAt)))
    .where(eq(projects.orgId, org.id))
    .groupBy(projects.id);

  return rows;
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
    api_keys: keys,
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
    api_keys: keys,
  };
}

/**
 * Delete a project and all related data (cascade).
 */
export async function deleteProject(db: DrizzleD1Database, projectId: string): Promise<void> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    throw new Error("Project not found");
  }

  // Subquery for conversation IDs to avoid N+1 query
  const conversationIdSubquery = db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, projectId));

  await db.batch([
    db
      .delete(conversationTags)
      .where(inArray(conversationTags.conversationId, conversationIdSubquery)),
    db.delete(messages).where(inArray(messages.conversationId, conversationIdSubquery)),
    db.delete(conversations).where(eq(conversations.projectId, projectId)),
    db.delete(apiKeys).where(eq(apiKeys.projectId, projectId)),
    db.delete(projects).where(eq(projects.id, projectId)),
  ]);
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
): Promise<{
  id: string;
  name: string;
  key_prefix: string;
  key: string;
  created_at: number;
}> {
  // Verify the project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    throw new Error("Project not found");
  }

  const key = await buildApiKey(projectId, name);
  await db.insert(apiKeys).values(key.values);

  return {
    id: key.id,
    name,
    key_prefix: key.prefix,
    key: key.rawKey,
    created_at: key.now,
  };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(
  db: DrizzleD1Database,
  projectId: string,
  keyId: string,
): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));
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

  const remaining = Math.max(0, PROJECT_CREATION_RATE_LIMIT - currentCount);

  if (currentCount > PROJECT_CREATION_RATE_LIMIT) {
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
