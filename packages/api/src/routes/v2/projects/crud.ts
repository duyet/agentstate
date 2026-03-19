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
  type CreateProjectInput,
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
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(SLUG_PATTERN, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, "name is required").optional(),
});

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

  const db = c.get("db");

  try {
    const result = await createProject(db, parsed.data as CreateProjectInput);
    return c.json(result, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already taken")) {
      return errorResponse(c, "CONFLICT", msg, 409);
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET / — List projects
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const orgIdParam = c.req.query("org_id");
  const clerkOrgId = orgIdParam ?? DEFAULT_CLERK_ORG_ID;

  const limit = parseLimitParam(c.req.query("limit"));
  const cursorParam = c.req.query("cursor");

  // Validate cursor before org lookup to fail fast on invalid input
  const cursorValidation = validateCursor(cursorParam);
  if (!cursorValidation.valid) {
    return errorResponse(c, "INVALID_CURSOR", cursorValidation.error, 400);
  }

  // Get projects with pagination
  const result = await listProjects(db, { clerkOrgId, limit, cursor: cursorParam });

  // Populate total count with caching
  const org = result.data.length > 0 ? result.data[0] : null;
  let count = 0;

  if (org) {
    const cacheKey = `count:projects:${org.org_id}`;

    if (c.env.AUTH_CACHE) {
      const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
      if (cached) count = cached as number;
    }

    if (!count) {
      count = await getProjectCount(db, org.org_id);

      if (c.env.AUTH_CACHE) {
        c.executionCtx.waitUntil(
          c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(count), { expirationTtl: 60 }),
        );
      }
    }
  }

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
  const db = c.get("db");
  const projectId = c.req.param("id");

  const project = await getProjectById(db, projectId);

  if (!project) {
    return notFound(c, "Project not found");
  }

  return c.json(project);
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

  try {
    const result = await updateProject(db, id, parsed.data as UpdateProjectInput);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) {
      return notFound(c, "Project not found");
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete project (cascade)
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  try {
    await deleteProject(db, projectId);
    return c.body(null, 204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) {
      return notFound(c, "Project not found");
    }
    throw err;
  }
});

export default router;
