import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../../db/schema";
import { notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { deserializeMessage } from "../../../lib/serialization";
import { AppendMessagesSchema } from "../../../lib/validation";
import { appendMessages } from "../../../services/messages";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /:id/messages — Append messages
// ---------------------------------------------------------------------------

router.post("/:id/messages", async (c) => {
  const id = c.req.param("id");

  // Verify conversation exists
  const db = c.get("db");
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, c.get("projectId"))))
    .limit(1);

  if (!existing) {
    return notFound(c);
  }

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = AppendMessagesSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { messages: inputMessages } = parsed.data;

  await appendMessages(db, id, inputMessages);

  // V2: Return 204 with no body (resource updated)
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// GET /:id/messages — List messages with pagination
// ---------------------------------------------------------------------------

router.get("/:id/messages", async (c) => {
  const id = c.req.param("id");

  // Verify conversation exists
  const db = c.get("db");
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, c.get("projectId"))))
    .limit(1);

  if (!existing) {
    return notFound(c);
  }

  const limitRaw = parseInt(c.req.query("limit") ?? "100", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 100 : limitRaw, 500);

  const after = c.req.query("after");

  const conditions = [eq(messages.conversationId, id)];

  if (after) {
    const afterTs = parseInt(after, 10);
    if (!Number.isNaN(afterTs)) {
      conditions.push(gt(messages.createdAt, afterTs));
    }
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt))
    .limit(limit);

  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].createdAt) : null;

  return c.json({
    data: rows.map(deserializeMessage),
    pagination: {
      limit,
      next_cursor: nextCursor,
    },
  });
});

export default router;
