import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../db/schema";
import { errorResponse, notFound, parseLimitParam } from "../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import { searchConversations } from "../../services/conversation-search";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /search — Search conversations by message content
// ---------------------------------------------------------------------------

router.get("/search", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const q = c.req.query("q");
  if (!q || q.trim() === "") {
    return errorResponse(
      c,
      "BAD_REQUEST",
      "Query parameter 'q' is required and must not be empty",
      400,
    );
  }

  const limit = parseLimitParam(c.req.query("limit"), 20);

  const cursor = c.req.query("cursor");

  // Validate cursor if provided (must be a valid Unix timestamp in milliseconds)
  if (cursor !== undefined) {
    const cursorNum = Number(cursor);
    if (
      Number.isNaN(cursorNum) ||
      !Number.isFinite(cursorNum) ||
      cursorNum < 0 ||
      cursorNum > Number.MAX_SAFE_INTEGER
    ) {
      return errorResponse(
        c,
        "INVALID_CURSOR",
        "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
        400,
      );
    }
  }

  try {
    const result = await searchConversations(db, projectId, {
      query: q.trim(),
      limit,
      cursor,
    });

    return c.json(result);
  } catch (err) {
    // Service layer throws Error for validation failures
    const message = err instanceof Error ? err.message : "Search failed";
    return errorResponse(c, "SEARCH_ERROR", message, 400);
  }
});

// ---------------------------------------------------------------------------
// GET /by-external-id/:externalId — Lookup by caller-provided ID
// ---------------------------------------------------------------------------

router.get("/by-external-id/:externalId", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const externalId = c.req.param("externalId");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.externalId, externalId), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt));

  return c.json({
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  });
});

export default router;
