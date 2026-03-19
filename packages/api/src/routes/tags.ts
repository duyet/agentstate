import { Hono } from "hono";
import { deprecationMiddleware } from "../lib/deprecation";
import { errorResponse, parseJsonBody, validationError } from "../lib/helpers";
import { AddTagsSchema } from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import {
  addTagsToConversation,
  conversationBelongsToProject,
  listConversationTags,
  listProjectTags,
  removeTagFromConversation,
} from "../services/tags";
import type { Bindings, Variables } from "../types";

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

  const tags = await listProjectTags(db, projectId);

  return c.json({ data: { tags } });
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

  const tags = await listConversationTags(db, conversationId);

  return c.json({ data: { tags } });
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

  const { tags } = parsed.data;
  const allTags = await addTagsToConversation(db, conversationId, tags);

  return c.json({ data: { tags: allTags } }, 201);
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

  await removeTagFromConversation(db, conversationId, tag);

  return c.body(null, 204);
});

export default router;
