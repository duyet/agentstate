import { Hono } from "hono";
import { deprecationMiddleware } from "../lib/deprecation";
import { errorResponse, parseJsonBody, parseLimitParam, validationError } from "../lib/helpers";
import { CreateApiKeySchema, CreateProjectSchema } from "../lib/validation";
import { projectCreationRateLimit } from "../middleware/project-creation-rate-limit";
import {
  createApiKey as createApiKeyService,
  createProject,
  deleteProject as deleteProjectService,
  getProjectById,
  getProjectBySlug,
  listProjectConversations,
  listProjectMessages,
  listProjects,
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
// POST /v1/projects — Create project
// ---------------------------------------------------------------------------

app.post("/", projectCreationRateLimit, async (c) => {
  const db = c.get("db");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateProjectSchema.safeParse(body);
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

  const parsed = CreateApiKeySchema.safeParse(body);
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
