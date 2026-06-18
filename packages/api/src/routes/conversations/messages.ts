import { and, asc, eq, gt, or, type SQL, sql } from "drizzle-orm";
import { Hono } from "hono";
import { messages } from "../../db/schema";
import {
  loadConversation,
  notFound,
  parseJsonBody,
  parseLimitParam,
  validationError,
} from "../../lib/helpers";
import { deserializeMessage } from "../../lib/serialization";
import { AppendMessagesSchema } from "../../lib/validation";
import { requireScope } from "../../middleware/require-scope";
import { appendMessages } from "../../services/messages";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /:id/messages — Append messages
// ---------------------------------------------------------------------------

router.post("/:id/messages", requireScope("conversations:write"), async (c) => {
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
  const inputMessages = parsed.data.messages;

  const messageRows = await appendMessages(db, id, inputMessages);

  return c.json({ messages: messageRows.map(deserializeMessage) }, 201);
});

// ---------------------------------------------------------------------------
// GET /:id/messages — List messages
// ---------------------------------------------------------------------------

router.get("/:id/messages", requireScope("conversations:read"), async (c) => {
  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");

  const limit = parseLimitParam(c.req.query("limit"), 100, 500);

  const after = c.req.query("after");

  // Page by (createdAt, rowid). Messages appended in one batch share a single
  // createdAt (services/messages.ts uses one `now` per append), so rowid — the
  // SQLite insertion order — is the stable tie-breaker. Without it, a page
  // boundary inside a batch drops the rows after the cursor.
  let cursorCond: SQL | undefined;
  if (after) {
    const [cursorMsg] = await db
      .select({ createdAt: messages.createdAt, rowid: sql<number>`rowid` })
      .from(messages)
      .where(and(eq(messages.id, after), eq(messages.conversationId, id)))
      .limit(1);
    if (cursorMsg) {
      cursorCond = or(
        gt(messages.createdAt, cursorMsg.createdAt),
        and(eq(messages.createdAt, cursorMsg.createdAt), sql`rowid > ${cursorMsg.rowid}`),
      );
    }
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, id), cursorCond))
    .orderBy(asc(messages.createdAt), asc(sql`rowid`))
    .limit(limit + 1);

  // Fetch one extra row to detect a next page without a trailing empty page.
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;

  return c.json({
    data: page.map(deserializeMessage),
    pagination: {
      limit,
      next_cursor: nextCursor,
    },
  });
});

export default router;
