import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import {
  apiKeys,
  conversations,
  conversationTags,
  messages,
  organizations,
  projects,
} from "../../../db/schema";
import { hashApiKey } from "../../../lib/crypto";
import { errorResponse, notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { generateApiKey, generateId } from "../../../lib/id";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const CreateProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(slugPattern, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, "name is required").optional(),
});

const _CreateKeySchema = z.object({
  name: z.string().min(1, "name is required"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CLERK_ORG_ID = "default";

/**
 * Build a new API key record and return both the raw key and insert values.
 */
async function buildApiKey(projectId: string, name: string) {
  const rawKey = generateApiKey();
  const hash = await hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 12);
  const id = generateId();
  const now = Date.now();

  return {
    id,
    rawKey,
    values: {
      id,
      projectId,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      createdAt: now,
    },
    prefix,
    now,
  };
}

/**
 * Serialize a project row to V2 response format.
 */
function _serializeProject(row: typeof projects.$inferSelect) {
  return {
    project_id: row.id,
    org_id: row.orgId,
    name: row.name,
    slug: row.slug,
    created_at: row.createdAt,
  };
}

/**
 * Serialize a project row with updated_at to V2 response format.
 */
function _serializeProjectWithUpdates(row: typeof projects.$inferSelect, updatedAt: number) {
  return {
    project_id: row.id,
    org_id: row.orgId,
    name: row.name,
    slug: row.slug,
    created_at: row.createdAt,
    updated_at: updatedAt,
  };
}

// ---------------------------------------------------------------------------
// POST / — Create project
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { name, slug, org_id } = parsed.data;
  const clerkOrgId = org_id ?? DEFAULT_CLERK_ORG_ID;
  const db = c.get("db");
  const now = Date.now();

  // Resolve or create the org
  let org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (!org) {
    const orgId = generateId();
    const orgName = clerkOrgId === DEFAULT_CLERK_ORG_ID ? "Default Organization" : clerkOrgId;
    await db.insert(organizations).values({
      id: orgId,
      clerkOrgId,
      name: orgName,
      createdAt: now,
    });
    // Use local values — no re-SELECT needed
    org = { id: orgId, clerkOrgId, name: orgName, createdAt: now };
  }

  // Check slug uniqueness within the org
  const existing = await db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, org.id), eq(projects.slug, slug)))
    .get();

  if (existing) {
    return errorResponse(c, "CONFLICT", `Slug "${slug}" is already taken in this org`, 409);
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

  return c.json(
    {
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
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET / — List projects
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const orgIdParam = c.req.query("org_id");
  const clerkOrgId = orgIdParam ?? DEFAULT_CLERK_ORG_ID;

  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw, 100);
  const cursorParam = c.req.query("cursor");

  // Validate cursor if provided (must be a valid Unix timestamp in milliseconds)
  // Do this before org lookup to fail fast on invalid input
  if (cursorParam !== undefined) {
    const cursorNum = Number(cursorParam);
    if (
      Number.isNaN(cursorNum) ||
      !Number.isFinite(cursorNum) ||
      cursorNum < 0 ||
      cursorNum > Number.MAX_SAFE_INTEGER
    ) {
      return errorResponse(
        c,
        "INVALID_CURSOR",
        "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
        400,
      );
    }
  }

  // Resolve org — return empty list if not found
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (!org) {
    return c.json({
      data: [],
      pagination: { limit, next_cursor: null, total: 0 },
    });
  }

  const conditions = [eq(projects.orgId, org.id)];

  if (cursorParam) {
    const cursorTs = parseInt(cursorParam, 10);
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
      key_count: sql<number>`count(${apiKeys.id})`.as("key_count"),
    })
    .from(projects)
    .leftJoin(apiKeys, and(eq(apiKeys.projectId, projects.id), isNull(apiKeys.revokedAt)))
    .where(and(...conditions))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt))
    .limit(limit);

  // V2: Include total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.orgId, org.id));
  const count = countResult?.count ?? 0;

  const nextCursor =
    rows.length === limit && rows.length > 0 ? String(rows[rows.length - 1].createdAt) : null;

  return c.json({
    data: rows.map((r) => ({
      project_id: r.id,
      org_id: r.orgId,
      name: r.name,
      slug: r.slug,
      created_at: r.createdAt,
      key_count: r.key_count,
    })),
    pagination: {
      limit,
      next_cursor: nextCursor,
      total: count,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get project by ID
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return notFound(c, "Project not found");
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

  return c.json({
    project_id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    api_keys: keys,
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update project
// ---------------------------------------------------------------------------

router.patch("/:id", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const id = c.req.param("id");
  const db = c.get("db");

  const existing = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!existing) {
    return notFound(c, "Project not found");
  }

  const { name } = parsed.data;
  const now = Date.now();

  // Projects schema doesn't have updated_at, so we just return the data
  // In V2 format we include updated_at for consistency
  await db.update(projects).set({ name }).where(eq(projects.id, id));

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
    .where(eq(apiKeys.projectId, id));

  return c.json({
    project_id: existing.id,
    org_id: existing.orgId,
    name: name ?? existing.name,
    slug: existing.slug,
    created_at: existing.createdAt,
    updated_at: now,
    api_keys: keys,
  });
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete project (cascade)
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return notFound(c, "Project not found");
  }

  const convRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, projectId));

  const convIds = convRows.map((r) => r.id);

  if (convIds.length > 0) {
    await db.batch([
      db.delete(conversationTags).where(inArray(conversationTags.conversationId, convIds)),
      db.delete(messages).where(inArray(messages.conversationId, convIds)),
      db.delete(conversations).where(eq(conversations.projectId, projectId)),
      db.delete(apiKeys).where(eq(apiKeys.projectId, projectId)),
      db.delete(projects).where(eq(projects.id, projectId)),
    ]);
  } else {
    await db.batch([
      db.delete(apiKeys).where(eq(apiKeys.projectId, projectId)),
      db.delete(projects).where(eq(projects.id, projectId)),
    ]);
  }

  return c.body(null, 204);
});

export default router;
