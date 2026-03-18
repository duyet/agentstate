import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, conversationTags } from "../db/schema";
import { deprecationMiddleware } from "../lib/deprecation";
import { errorResponse, parseJsonBody, validationError } from "../lib/helpers";
import { generateId } from "../lib/id";
import { AddTagsSchema } from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Authorization Helper
// ---------------------------------------------------------------------------

/**
 * Check if a conversation belongs to the authenticated project.
 * Uses count(*) for efficiency (returns only count, not full row).
 */
async function conversationBelongsToProject(
  db: any,
  conversationId: string,
  projectId: string,
): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.projectId, projectId)));
  return (result[0]?.count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// V1 deprecation notice
router.use(
  "*",
  deprecationMiddleware({
    message: "API v1 is deprecated. Use /api/v2/ instead.",
    sunsetDate: "2026-12-31",
    link: "https://docs.agentstate.app/api/v2/migration",
  }),
);

// ---------------------------------------------------------------------------
// GET /tags — List all unique tags for the project
// ---------------------------------------------------------------------------

router.get("/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  // Join with conversations to scope tags to the current project
  const rows = await db
    .selectDistinct({ tag: conversationTags.tag })
    .from(conversationTags)
    .innerJoin(conversations, eq(conversations.id, conversationTags.conversationId))
    .where(eq(conversations.projectId, projectId))
    .orderBy(conversationTags.tag);

  return c.json({ data: { tags: rows.map((r) => r.tag) } });
});

// ---------------------------------------------------------------------------
// GET /conversations/:id/tags — List tags for a conversation
// ---------------------------------------------------------------------------

router.get("/conversations/:id/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const conversationId = c.req.param("id");

  const hasAccess = await conversationBelongsToProject(db, conversationId, projectId);
  if (!hasAccess) {
    return errorResponse(c, "NOT_FOUND", "Conversation not found", 404);
  }

  const rows = await db
    .select()
    .from(conversationTags)
    .where(eq(conversationTags.conversationId, conversationId))
    .orderBy(conversationTags.tag);

  return c.json({ data: { tags: rows.map((r) => r.tag) } });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/tags — Add tag(s) to a conversation
// ---------------------------------------------------------------------------

router.post("/conversations/:id/tags", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = AddTagsSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const db = c.get("db");
  const projectId = c.get("projectId");
  const conversationId = c.req.param("id");

  const hasAccess = await conversationBelongsToProject(db, conversationId, projectId);
  if (!hasAccess) {
    return errorResponse(c, "NOT_FOUND", "Conversation not found", 404);
  }

  const now = Date.now();
  const { tags } = parsed.data;

  // Deduplicate within the request to avoid duplicate insert attempts
  const uniqueTags = [...new Set(tags)];

  const rows = uniqueTags.map((tag) => ({
    id: generateId(),
    conversationId,
    tag,
    createdAt: now,
  }));

  // INSERT OR IGNORE semantics: skip duplicates that already exist per the
  // unique index on (conversation_id, tag). Drizzle exposes this via onConflictDoNothing.
  await db.insert(conversationTags).values(rows).onConflictDoNothing();

  // Re-fetch the full tag list for this conversation so the response is
  // authoritative (some tags may have already existed and been skipped above).
  const allTags = await db
    .select()
    .from(conversationTags)
    .where(eq(conversationTags.conversationId, conversationId))
    .orderBy(conversationTags.tag);

  return c.json({ data: { tags: allTags.map((r) => r.tag) } }, 201);
});

// ---------------------------------------------------------------------------
// DELETE /conversations/:id/tags/:tag — Remove a tag from a conversation
// ---------------------------------------------------------------------------

router.delete("/conversations/:id/tags/:tag", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const conversationId = c.req.param("id");
  const tag = c.req.param("tag");

  const hasAccess = await conversationBelongsToProject(db, conversationId, projectId);
  if (!hasAccess) {
    return errorResponse(c, "NOT_FOUND", "Conversation not found", 404);
  }

  await db
    .delete(conversationTags)
    .where(and(eq(conversationTags.conversationId, conversationId), eq(conversationTags.tag, tag)));

  return new Response(null, { status: 204 });
});

export default router;
