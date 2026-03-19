import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { deprecationMiddleware } from "../lib/deprecation";
import { errorResponse, parseJsonBody, parseLimitParam, validationError } from "../lib/helpers";
import { SLUG_PATTERN } from "../lib/validation";
import {
  checkProjectCreationRateLimit,
  createApiKey as createApiKeyService,
  createProject,
  deleteProject as deleteProjectService,
  getProjectById,
  getProjectBySlug,
  listProjectConversations,
  listProjectMessages,
  listProjects,
  pruneOldRateLimits,
  revokeApiKey as revokeApiKeyService,
} from "../services/projects";
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
// Validation schemas
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(SLUG_PATTERN, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});

const createKeySchema = z.object({
  name: z.string().min(1, "name is required"),
});

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
// ---------------------------------------------------------------------------

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
    const { hashIdentifier } = await import("../services/projects");
    identifier = `ip:${await hashIdentifier(ip)}`;
  }

  const result = await checkProjectCreationRateLimit(db, identifier);

  // Attach project-creation-specific rate limit headers
  c.header("X-RateLimit-Limit-ProjectCreation", String(5));
  c.header("X-RateLimit-Remaining-ProjectCreation", String(result.remaining));

  if (!result.allowed) {
    c.header("Retry-After", String(result.retryAfter));
    c.header("X-RateLimit-Reset-ProjectCreation", String(result.resetAt));

    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Project creation rate limit exceeded. Maximum 5 projects per minute. Retry after ${result.retryAfter} seconds.`,
        },
      },
      429,
    );
  }

  // Fire-and-forget cleanup of old project creation rate limit rows
  c.executionCtx.waitUntil(pruneOldRateLimits(db, Date.now()));

  await next();
});

// ---------------------------------------------------------------------------
// POST /v1/projects — Create project
// ---------------------------------------------------------------------------

app.post("/", projectCreationRateLimit, async (c) => {
  const db = c.get("db");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { name, slug, org_id } = parsed.data;

  try {
    const result = await createProject(db, name, slug, org_id);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already taken")) {
      return errorResponse(c, "CONFLICT", err.message, 409);
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /v1/projects — List projects
// ---------------------------------------------------------------------------

app.get("/", async (c) => {
  const db = c.get("db");
  const orgIdParam = c.req.query("org_id");

  const data = await listProjects(db, orgIdParam);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/by-slug/:slug — Get project by slug
// ---------------------------------------------------------------------------

app.get("/by-slug/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");

  const project = await getProjectBySlug(db, slug);

  if (!project) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  return c.json(project);
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/conversations — List conversations for project (dashboard)
// ---------------------------------------------------------------------------

app.get("/:id/conversations", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const limit = parseLimitParam(c.req.query("limit"));

  const data = await listProjectConversations(db, projectId, limit);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/conversations/:convId/messages — List messages (dashboard)
// ---------------------------------------------------------------------------

app.get("/:id/conversations/:convId/messages", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const convId = c.req.param("convId");

  const data = await listProjectMessages(db, projectId, convId);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id — Get project by ID
// ---------------------------------------------------------------------------

app.get("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await getProjectById(db, projectId);

  if (!project) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  return c.json(project);
});

// ---------------------------------------------------------------------------
// POST /v1/projects/:id/keys — Generate new API key
// ---------------------------------------------------------------------------

app.post("/:id/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  try {
    const result = await createApiKeyService(db, projectId, parsed.data.name);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "Project not found") {
      return errorResponse(c, "NOT_FOUND", "Project not found", 404);
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /v1/projects/:id/keys/:keyId — Revoke API key
// ---------------------------------------------------------------------------

app.delete("/:id/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const keyId = c.req.param("keyId");

  await revokeApiKeyService(db, projectId, keyId);

  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// DELETE /v1/projects/:id — Delete project (cascade)
// ---------------------------------------------------------------------------

app.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  try {
    await deleteProjectService(db, projectId);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof Error && err.message === "Project not found") {
      return errorResponse(c, "NOT_FOUND", "Project not found", 404);
    }
    throw err;
  }
});

export default app;
