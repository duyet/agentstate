import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { organizations, projects } from "../db/schema";
import {
  type AppContext,
  errorResponse,
  invalidateAuthCacheEntries,
  parseJsonBody,
  parseLimitParam,
  validationError,
} from "../lib/helpers";
import { CreateApiKeySchema, CreateProjectSchema, UpdateProjectSchema } from "../lib/validation";
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
  updateProject,
} from "../services/projects";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Tenancy helpers
// The Clerk session exposes the Clerk org id (o_id claim). Projects store the
// internal org id (organizations.id). We resolve Clerk org id -> internal id
// before comparing, so the check is correct across the two namespaces.
// ---------------------------------------------------------------------------

/** Resolve the session's Clerk org id to the internal org id. */
async function resolveSessionOrgId(c: AppContext): Promise<string | null> {
  const db = c.get("db");
  const clerkOrgId = c.get("orgId");
  if (!clerkOrgId) return null;
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);
  return org?.id ?? null;
}

/**
 * Verify a project belongs to the authenticated Clerk org.
 * Returns null (authorized) or a 404 response. 404 (not 403) avoids leaking
 * the existence of projects owned by other orgs.
 */
async function authorizeProjectOrg(c: AppContext, projectId: string): Promise<Response | null> {
  const db = c.get("db");
  const sessionInternalOrgId = await resolveSessionOrgId(c);
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || !sessionInternalOrgId || project.orgId !== sessionInternalOrgId) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }
  return null;
}

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

  // org_id is taken from the verified Clerk session, NOT the request body.
  // The auth middleware always sets a non-empty per-org (or per-user) value.
  const name = parsed.data.name;
  const slug = parsed.data.slug;
  const sessionOrgId = c.get("orgId");

  try {
    const result = await createProject(db, name, slug, sessionOrgId);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already taken")) {
      return errorResponse(c, "CONFLICT", err.message, 409);
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /v1/projects — List projects (scoped to the authenticated org)
// ---------------------------------------------------------------------------

app.get("/", async (c) => {
  const db = c.get("db");
  // org_id is taken from the verified Clerk session, NOT the query string.
  const sessionOrgId = c.get("orgId");

  const data = await listProjects(db, sessionOrgId);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/by-slug/:slug — Get project by slug (org-scoped)
// ---------------------------------------------------------------------------

app.get("/by-slug/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const sessionInternalOrgId = await resolveSessionOrgId(c);

  const project = await getProjectBySlug(db, slug);

  if (!project || !sessionInternalOrgId || project.org_id !== sessionInternalOrgId) {
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

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

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

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

  const data = await listProjectMessages(db, projectId, convId);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /v1/projects/:id — Get project by ID (org-scoped)
// ---------------------------------------------------------------------------

app.get("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const sessionInternalOrgId = await resolveSessionOrgId(c);

  const project = await getProjectById(db, projectId);

  if (!project || !sessionInternalOrgId || project.org_id !== sessionInternalOrgId) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  return c.json(project);
});

// ---------------------------------------------------------------------------
// PATCH /v1/projects/:id — Update project name/retention (org-scoped)
// ---------------------------------------------------------------------------

app.patch("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  try {
    await updateProject(db, projectId, {
      name: parsed.data.name,
      retention_days: parsed.data.retention_days,
    });
    // Return the v1 project shape (id, not the v2 payload's project_id) so the
    // response matches GET /v1/projects/:id and the dashboard's project model.
    const updated = await getProjectById(db, projectId);
    if (!updated) return errorResponse(c, "NOT_FOUND", "Project not found", 404);
    return c.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return errorResponse(c, "NOT_FOUND", "Project not found", 404);
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /v1/projects/:id/keys — Generate new API key
// ---------------------------------------------------------------------------

app.post("/:id/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  try {
    // Dashboard key creation is authenticated by a verified Clerk session
    // (org owner), so any scopes may be granted — no subset restriction here.
    const result = await createApiKeyService(db, projectId, parsed.data.name, parsed.data.scopes);
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

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

  const revokedHash = await revokeApiKeyService(db, projectId, keyId);
  if (revokedHash) {
    invalidateAuthCacheEntries(c, [revokedHash]);
  }

  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// DELETE /v1/projects/:id — Delete project (cascade)
// ---------------------------------------------------------------------------

app.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const unauthorized = await authorizeProjectOrg(c, projectId);
  if (unauthorized) return unauthorized;

  try {
    const keyHashes = await deleteProjectService(db, projectId);
    // Invalidate auth-cache entries for every key that belonged to the project
    // (the cascade deletes the rows; without this they'd stay valid up to TTL).
    invalidateAuthCacheEntries(c, keyHashes);
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof Error && err.message === "Project not found") {
      return errorResponse(c, "NOT_FOUND", "Project not found", 404);
    }
    throw err;
  }
});

export default app;
