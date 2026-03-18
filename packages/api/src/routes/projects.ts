import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import {
  apiKeys,
  conversations,
  conversationTags,
  messages,
  organizations,
  projects,
  rateLimits,
} from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { deprecationMiddleware } from "../lib/deprecation";
import { errorResponse, parseJsonBody, validationError } from "../lib/helpers";
import { generateApiKey, generateId } from "../lib/id";
import { deserializeMetadata } from "../lib/serialization";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// V1 deprecation notice
app.use(
  "*",
  deprecationMiddleware({
    message: "API v1 projects is deprecated. Use /api/v2/projects instead.",
    sunsetDate: "2026-12-31",
    link: "https://docs.agentstate.app/api/v2/migration",
  }),
);

// ---------------------------------------------------------------------------
// Project Creation Rate Limiting
// ---------------------------------------------------------------------------
// Project creation is a sensitive operation that can impact system resources.
// We apply a stricter rate limit than the default API rate limit to prevent
// abuse through unlimited project creation (DoS prevention).
//
// Limit: 5 projects per minute per identifier (vs. 100 requests/minute default)
// Window: 60 seconds (fixed window for simplicity)
//
// Rate limit identifier (in order of preference):
// 1. API key hash (for authenticated API requests)
// 2. Client IP address (for dashboard requests without API key)
//
// Uses a composite key in rate_limits table: "pc:{identifier}:{windowStart}"
// where "pc" prefix distinguishes project creation from general API limits.
// ---------------------------------------------------------------------------

/** Maximum project creations allowed per window. */
const PROJECT_CREATION_RATE_LIMIT = 5;

/** Window size in milliseconds (60 seconds). */
const PROJECT_CREATION_WINDOW_MS = 60_000;

/**
 * Get a hash of the input string for use as a rate limit identifier.
 */
async function hashIdentifier(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Project creation rate limiter using a fixed-window counter.
 * This runs independently of the general rateLimitMiddleware.
 */
const projectCreationRateLimit = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = c.get("db");

  // Determine the rate limit identifier
  // Priority: API key hash > Client IP address
  let identifier: string;
  const apiKeyHash = c.get("apiKeyHash");

  if (apiKeyHash) {
    identifier = `key:${apiKeyHash}`;
  } else {
    // Fallback to IP address for dashboard requests
    // Get IP from CF-Connecting-IP header (set by Cloudflare)
    const ip = c.req.header("CF-Connecting-IP") || "unknown";
    identifier = `ip:${await hashIdentifier(ip)}`;
  }

  const now = Date.now();
  const windowStart = now - (now % PROJECT_CREATION_WINDOW_MS);

  // Create a composite key for project creation rate limiting
  // Format: "pc:{identifier}:{windowStart}" to distinguish from general API limits
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
        apiKeyHash: identifier, // Store the identifier for debugging
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

  // Attach project-creation-specific rate limit headers
  c.header("X-RateLimit-Limit-ProjectCreation", String(PROJECT_CREATION_RATE_LIMIT));
  c.header("X-RateLimit-Remaining-ProjectCreation", String(remaining));

  if (currentCount > PROJECT_CREATION_RATE_LIMIT) {
    const windowEnd = windowStart + PROJECT_CREATION_WINDOW_MS;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    const resetSeconds = Math.ceil(windowEnd / 1000);

    c.header("Retry-After", String(retryAfter));
    c.header("X-RateLimit-Reset-ProjectCreation", String(resetSeconds));

    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Project creation rate limit exceeded. Maximum ${PROJECT_CREATION_RATE_LIMIT} projects per minute. Retry after ${retryAfter} seconds.`,
        },
      },
      429,
    );
  }

  // Fire-and-forget cleanup of old project creation rate limit rows
  // Delete rows with "pc:" prefix that are older than 2x the window
  const pruneOlderThan = now - PROJECT_CREATION_WINDOW_MS * 2;
  c.executionCtx.waitUntil(
    db.delete(rateLimits).where(
      and(
        lt(rateLimits.windowStart, pruneOlderThan),
        // Only delete rows that start with "pc:" (project creation rate limits)
        sql`id LIKE 'pc:%'`,
      ),
    ),
  );

  await next();
});

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

// Apply project-creation-specific rate limiting (5 projects/minute)
app.post("/", projectCreationRateLimit, async (c) => {
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
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
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
      metadata: deserializeMetadata(r.metadata),
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
      metadata: deserializeMetadata(m.metadata),
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
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
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
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
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

// ---------------------------------------------------------------------------
// DELETE /v1/projects/:id — Delete project (cascade)
// ---------------------------------------------------------------------------

app.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
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

export default app;
