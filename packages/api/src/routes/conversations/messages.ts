import { and, asc, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../db/schema";
import { loadConversation, notFound, parseJsonBody, validationError } from "../../lib/helpers";
import { generateId } from "../../lib/id";
import { deserializeMessage, serializeMetadata } from "../../lib/serialization";
import { AppendMessagesSchema } from "../../lib/validation";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /:id/messages — Append messages
// ---------------------------------------------------------------------------

router.post("/:id/messages", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = AppendMessagesSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");
  const now = Date.now();
  const inputMessages = parsed.data.messages;

  const messageRows = inputMessages.map((m) => ({
    id: generateId(),
    conversationId: id,
    role: m.role as "system" | "user" | "assistant" | "tool",
    content: m.content,
    metadata: serializeMetadata(m.metadata),
    tokenCount: m.token_count ?? 0,
    createdAt: now,
  }));

  await db.insert(messages).values(messageRows);

  const addedTokens = inputMessages.reduce((sum, m) => sum + (m.token_count ?? 0), 0);

  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + ${inputMessages.length}`,
      tokenCount: sql`${conversations.tokenCount} + ${addedTokens}`,
      updatedAt: now,
    })
    .where(eq(conversations.id, id));

  return c.json({ messages: messageRows.map(deserializeMessage) }, 201);
});

// ---------------------------------------------------------------------------
// GET /:id/messages — List messages
// ---------------------------------------------------------------------------

router.get("/:id/messages", async (c) => {
  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");

  const limitRaw = parseInt(c.req.query("limit") ?? "100", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 100 : limitRaw, 500);

  const after = c.req.query("after");

  const conditions = [eq(messages.conversationId, id)];

  if (after) {
    // Resolve the created_at of the cursor message for stable pagination
    const [cursorMsg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, after), eq(messages.conversationId, id)))
      .limit(1);

    if (cursorMsg) {
      conditions.push(gt(messages.createdAt, cursorMsg.createdAt));
    }
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt))
    .limit(limit);

  const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

  return c.json({
    data: rows.map(deserializeMessage),
    pagination: {
      limit,
      next_cursor: nextCursor,
    },
  });
});

export default router;
