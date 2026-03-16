import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { apiKeys, conversations, messages, organizations, projects } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { parseJsonBody, validationError } from "../lib/helpers";
import { generateApiKey, generateId } from "../lib/id";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const createProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(slugPattern, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});

const createKeySchema = z.object({
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

// ---------------------------------------------------------------------------
// POST /v1/projects — Create project
// ---------------------------------------------------------------------------

app.post("/", async (c) => {
  const db = c.get("db");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { name, slug, org_id } = parsed.data;
  const clerkOrgId = org_id ?? DEFAULT_CLERK_ORG_ID;
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
    return c.json(
      { error: { code: "CONFLICT", message: `Slug "${slug}" is already taken in this org` } },
      409,
    );
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
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET /v1/projects — List projects
// ---------------------------------------------------------------------------

app.get("/", async (c) => {
  const db = c.get("db");
  const orgIdParam = c.req.query("org_id");
  const clerkOrgId = orgIdParam ?? DEFAULT_CLERK_ORG_ID;

  // Resolve org — return empty list if not found
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (!org) {
    return c.json({ data: [] });
  }

  // Fetch projects with active key counts
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

  return c.json({ data: rows });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/by-slug/:slug — Get project by slug
// ---------------------------------------------------------------------------

app.get("/by-slug/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");

  const project = await db.select().from(projects).where(eq(projects.slug, slug)).get();

  if (!project) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
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

  return c.json({
    id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    api_keys: keys,
  });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/conversations — List conversations for project (dashboard)
// ---------------------------------------------------------------------------

app.get("/:id/conversations", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw, 100);

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);

  return c.json({
    data: rows.map((r) => ({
      id: r.id,
      project_id: r.projectId,
      external_id: r.externalId,
      title: r.title,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      message_count: r.messageCount,
      token_count: r.tokenCount,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/conversations/:convId/messages — List messages (dashboard)
// ---------------------------------------------------------------------------

app.get("/:id/conversations/:convId/messages", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const convId = c.req.param("convId");

  // Verify conversation belongs to this project
  const conv = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.projectId, projectId)))
    .get();

  if (!conv) {
    return c.json({ data: [] });
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(500);

  return c.json({
    data: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
      token_count: m.tokenCount,
      created_at: m.createdAt,
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id — Get project by ID
// ---------------------------------------------------------------------------

app.get("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
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
    id: project.id,
    org_id: project.orgId,
    name: project.name,
    slug: project.slug,
    created_at: project.createdAt,
    api_keys: keys,
  });
});

// ---------------------------------------------------------------------------
// POST /v1/projects/:id/keys — Generate new API key
// ---------------------------------------------------------------------------

app.post("/:id/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  // Verify the project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const key = await buildApiKey(projectId, parsed.data.name);
  await db.insert(apiKeys).values(key.values);

  return c.json(
    {
      id: key.id,
      name: parsed.data.name,
      key_prefix: key.prefix,
      key: key.rawKey,
      created_at: key.now,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// DELETE /v1/projects/:id/keys/:keyId — Revoke API key
// ---------------------------------------------------------------------------

app.delete("/:id/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const keyId = c.req.param("keyId");

  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default app;
