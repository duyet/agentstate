// ---------------------------------------------------------------------------
// V2 Projects service — Business logic for V2 project API endpoints
// ---------------------------------------------------------------------------

import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  apiKeys,
  conversations,
  conversationTags,
  messages,
  organizations,
  projects,
} from "../db/schema";
import { buildApiKey } from "../lib/api-key";
import { DEFAULT_CLERK_ORG_ID } from "../lib/constants";
import { generateId } from "../lib/id";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  name: string;
  slug: string;
  org_id?: string;
}

export interface UpdateProjectInput {
  name?: string;
  retention_days?: number | null;
}

export interface V2ProjectListItem {
  project_id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: number;
  key_count: number;
  retention_days: number | null;
}

export interface V2ProjectDetail {
  project_id: string;
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

export interface V2CreateProjectResult {
  project: {
    project_id: string;
    org_id: string;
    name: string;
    slug: string;
    created_at: number;
    updated_at: number;
  };
  api_key: {
    id: string;
    name: string;
    key_prefix: string;
    key: string;
    created_at: number;
  };
}

export interface ListProjectsOptions {
  clerkOrgId: string;
  limit: number;
  cursor?: string;
}

export interface ListProjectsResult {
  data: V2ProjectListItem[];
  pagination: {
    limit: number;
    next_cursor: string | null;
    total: number;
  };
}

export interface CursorValidationError {
  valid: false;
  error: string;
}

// ---------------------------------------------------------------------------
// Organization Management
// ---------------------------------------------------------------------------

/**
 * Get or create an organization by Clerk org ID.
 * Returns the organization record.
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
 * Returns null if not found.
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
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate cursor parameter for pagination.
 * Returns { valid: true } if valid, or { valid: false, error: string } if invalid.
 */
export function validateCursor(
  cursorParam: string | undefined,
): CursorValidationError | { valid: true } {
  if (cursorParam === undefined) {
    return { valid: true };
  }

  const cursorNum = Number(cursorParam);
  if (
    Number.isNaN(cursorNum) ||
    !Number.isFinite(cursorNum) ||
    cursorNum < 0 ||
    cursorNum > Number.MAX_SAFE_INTEGER
  ) {
    return {
      valid: false,
      error: "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Project CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new project with a default API key.
 * Throws error if slug is already taken in the org.
 */
export async function createProject(
  db: DrizzleD1Database,
  input: CreateProjectInput,
): Promise<V2CreateProjectResult> {
  const { name, slug, org_id } = input;
  const clerkOrgId = org_id ?? DEFAULT_CLERK_ORG_ID;
  const now = Date.now();

  // Resolve or create the org
  const org = await getOrCreateOrg(db, clerkOrgId);

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
      project_id: projectId,
      org_id: org.id,
      name,
      slug,
      created_at: now,
      updated_at: now,
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
 * List projects for an organization with pagination and active key counts.
 */
export async function listProjects(
  db: DrizzleD1Database,
  options: ListProjectsOptions,
): Promise<ListProjectsResult> {
  const { clerkOrgId, limit, cursor } = options;

  // Resolve org — return empty list if not found
  const org = await getOrgByClerkId(db, clerkOrgId);

  if (!org) {
    return {
      data: [],
      pagination: { limit, next_cursor: null, total: 0 },
    };
  }

  const conditions = [eq(projects.orgId, org.id)];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!Number.isNaN(cursorTs)) {
      conditions.push(lt(projects.createdAt, cursorTs));
    }
  }

  // Fetch projects with active key counts
  const rows = await db
    .select({
      id: projects.id,
      orgId: projects.orgId,
      name: projects.name,
      slug: projects.slug,
      createdAt: projects.createdAt,
      retentionDays: projects.retentionDays,
      key_count: sql<number>`count(${apiKeys.id})`.as("key_count"),
    })
    .from(projects)
    .leftJoin(apiKeys, and(eq(apiKeys.projectId, projects.id), isNull(apiKeys.revokedAt)))
    .where(and(...conditions))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt))
    .limit(limit);

  const nextCursor =
    rows.length === limit && rows.length > 0 ? String(rows[rows.length - 1].createdAt) : null;

  return {
    data: rows.map((r) => ({
      project_id: r.id,
      org_id: r.orgId,
      name: r.name,
      slug: r.slug,
      created_at: r.createdAt,
      key_count: r.key_count,
      retention_days: r.retentionDays ?? null,
    })),
    pagination: {
      limit,
      next_cursor: nextCursor,
      total: 0, // Caller must populate this separately
    },
  };
}

/**
 * Get project count for an organization.
 * Used for pagination metadata.
 */
export async function getProjectCount(db: DrizzleD1Database, orgId: string): Promise<number> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.orgId, orgId));
  return countResult?.count ?? 0;
}

/**
 * Get project by ID with API keys.
 * Returns null if not found.
 */
export async function getProjectById(
  db: DrizzleD1Database,
  projectId: string,
): Promise<V2ProjectDetail | null> {
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
    project_id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    retention_days: project.retentionDays ?? null,
    api_keys: keys,
  };
}

/**
 * Update project name.
 * Returns the updated project with API keys.
 * Throws error if project not found.
 */
export async function updateProject(
  db: DrizzleD1Database,
  projectId: string,
  input: UpdateProjectInput,
): Promise<V2ProjectDetail & { updated_at: number; retention_days: number | null }> {
  const existing = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!existing) {
    throw new Error("Project not found");
  }

  const now = Date.now();
  const updates: Partial<typeof projects.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.retention_days !== undefined) updates.retentionDays = input.retention_days;

  await db.update(projects).set(updates).where(eq(projects.id, projectId));

  const updated = await db.select().from(projects).where(eq(projects.id, projectId)).get();

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
    project_id: existing.id,
    org_id: existing.orgId,
    name: updated?.name ?? existing.name,
    slug: existing.slug,
    created_at: existing.createdAt,
    updated_at: now,
    retention_days: updated?.retentionDays ?? existing.retentionDays ?? null,
    api_keys: keys,
  };
}

/**
 * Delete a project and all related data (cascade).
 * Throws error if project not found.
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
