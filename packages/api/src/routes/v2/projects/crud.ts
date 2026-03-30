import { Hono } from "hono";
import { z } from "zod";
import { DEFAULT_CLERK_ORG_ID } from "../../../lib/constants";
import {
  errorResponse,
  getCachedCount,
  notFound,
  parseAndValidateBody,
  parseLimitParam,
} from "../../../lib/helpers";
import { SLUG_PATTERN } from "../../../lib/validation";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectCount,
  listProjects,
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
  retention_days: z.number().int().min(1).max(3650).nullable().optional(),
}).refine(data => data.name !== undefined || data.retention_days !== undefined, {
  message: "At least one field is required",
});

// ---------------------------------------------------------------------------
// POST / — Create project
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { data, error } = await parseAndValidateBody(c, CreateProjectSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Validation failed", 400);

  try {
    const result = await createProject(c.get("db"), data);
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
  if (!cursorValidation.valid)
    return errorResponse(c, "INVALID_CURSOR", cursorValidation.error, 400);

  const result = await listProjects(c.get("db"), { clerkOrgId, limit, cursor });

  const count = result.data[0]
    ? await getCachedCount(c, `count:projects:${result.data[0].org_id}`, () =>
        getProjectCount(c.get("db"), result.data[0].org_id),
      )
    : 0;

  return c.json({
    data: result.data,
    pagination: { limit, next_cursor: result.pagination.next_cursor, total: count },
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
  const { data, error } = await parseAndValidateBody(c, UpdateProjectSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "At least one field is required", 400);

  const id = c.req.param("id");

  try {
    return c.json(
      await updateProject(c.get("db"), id, {
        name: data.name,
        retention_days: data.retention_days,
      }),
    );
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
  const id = c.req.param("id");

  try {
    await deleteProject(c.get("db"), id);
    return c.body(null, 204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) return notFound(c, "Project not found");
    throw err;
  }
});

export default router;
