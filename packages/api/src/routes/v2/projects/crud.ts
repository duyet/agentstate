import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { DEFAULT_CLERK_ORG_ID } from "../../../lib/constants";
import {
  errorResponse,
  notFound,
  parseJsonBody,
  parseLimitParam,
  validationError,
} from "../../../lib/helpers";
import { SLUG_PATTERN } from "../../../lib/validation";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectCount,
  listProjects,
  type UpdateProjectInput,
  updateProject,
  validateCursor,
} from "../../../services/v2-projects";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const CreateProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z.string().min(1, "slug is required").regex(SLUG_PATTERN),
  org_id: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, "name is required").optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get cached or fresh project count for an organization */
async function getProjectCountWithCache(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  orgId: string,
): Promise<number> {
  const cacheKey = `count:projects:${orgId}`;
  const cache = c.env.AUTH_CACHE;

  if (cache) {
    const cached = await cache.get(cacheKey, "json");
    if (typeof cached === "number") return cached;
  }

  const count = await getProjectCount(c.get("db"), orgId);

  if (cache) {
    c.executionCtx.waitUntil(cache.put(cacheKey, JSON.stringify(count), { expirationTtl: 60 }));
  }

  return count;
}

// ---------------------------------------------------------------------------
// POST / — Create project
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);

  try {
    const result = await createProject(c.get("db"), parsed.data);
    return c.json(result, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already taken")) return errorResponse(c, "CONFLICT", msg, 409);
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET / — List projects
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const clerkOrgId = c.req.query("org_id") ?? DEFAULT_CLERK_ORG_ID;
  const limit = parseLimitParam(c.req.query("limit"));
  const cursor = c.req.query("cursor");

  const cursorValidation = validateCursor(cursor);
  if (!cursorValidation.valid) {
    return errorResponse(c, "INVALID_CURSOR", cursorValidation.error, 400);
  }

  const result = await listProjects(c.get("db"), { clerkOrgId, limit, cursor });

  const count = result.data[0] ? await getProjectCountWithCache(c, result.data[0].org_id) : 0;

  return c.json({
    data: result.data,
    pagination: {
      limit: result.pagination.limit,
      next_cursor: result.pagination.next_cursor,
      total: count,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get project by ID
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const project = await getProjectById(c.get("db"), c.req.param("id"));
  if (!project) return notFound(c, "Project not found");
  return c.json(project);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update project
// ---------------------------------------------------------------------------

router.patch("/:id", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);

  try {
    const result = await updateProject(
      c.get("db"),
      c.req.param("id"),
      parsed.data as UpdateProjectInput,
    );
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) return notFound(c, "Project not found");
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete project (cascade)
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  try {
    await deleteProject(c.get("db"), c.req.param("id"));
    return c.body(null, 204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) return notFound(c, "Project not found");
    throw err;
  }
});

export default router;
