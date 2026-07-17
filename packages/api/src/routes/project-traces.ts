import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, organizations, projects } from "../db/schema";
import { errorResponse, parseLimitParam, parseOrderParam } from "../lib/helpers";
import * as tracesService from "../services/traces";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /:id/traces — List traces for a project (Clerk-authed)
// ---------------------------------------------------------------------------

app.get("/:id/traces", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  // Resolve the session Clerk org id to the internal org id, then verify the
  // project belongs to that org (mirrors analytics.ts pattern).
  const clerkOrgId = c.get("orgId");
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId ?? ""))
    .limit(1);
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || !org || project.orgId !== org.id) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  const limit = parseLimitParam(c.req.query("limit"));
  const cursor = c.req.query("cursor");
  const order = parseOrderParam(c.req.query("order"));

  const result = await tracesService.listTraces(db, projectId, {
    limit,
    cursor: cursor ?? undefined,
    order,
  });

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json({
    data: result.data,
    has_more: result.has_more,
    next_cursor: result.next_cursor,
  });
});

// ---------------------------------------------------------------------------
// GET /:id/traces/:traceId — Get trace detail (Clerk-authed)
// ---------------------------------------------------------------------------

app.get("/:id/traces/:traceId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const traceId = c.req.param("traceId");

  // Resolve the session Clerk org id to the internal org id, then verify the
  // project belongs to that org (mirrors analytics.ts pattern).
  const clerkOrgId = c.get("orgId");
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId ?? ""))
    .limit(1);
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || !org || project.orgId !== org.id) {
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  // Verify the trace belongs to this project
  const [conv] = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(eq(conversations.id, traceId))
    .limit(1);
  if (!conv || conv.projectId !== projectId) {
    return errorResponse(c, "NOT_FOUND", "Trace not found", 404);
  }

  const result = await tracesService.getTraceTree(db, traceId);
  if (!result) {
    return errorResponse(c, "NOT_FOUND", "Trace not found", 404);
  }

  return c.json(result);
});

export default app;
