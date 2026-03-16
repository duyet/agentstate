import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../db/schema";
import { parseJsonBody, validationError } from "../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import { BulkDeleteSchema, ExportSchema } from "../../lib/validation";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /bulk-delete — Delete multiple conversations at once
// ---------------------------------------------------------------------------

router.post("/bulk-delete", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = BulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const db = c.get("db");
  const projectId = c.get("projectId");
  const ids = parsed.data.ids;

  // Only delete conversations that belong to this project
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)));

  const existingIds = existing.map((r) => r.id);

  if (existingIds.length > 0) {
    await db.batch([
      db.delete(messages).where(inArray(messages.conversationId, existingIds)),
      db.delete(conversations).where(inArray(conversations.id, existingIds)),
    ]);
  }

  return c.json({ deleted: existingIds.length });
});

// ---------------------------------------------------------------------------
// POST /export — Bulk export conversations with messages
// ---------------------------------------------------------------------------

router.post("/export", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const body = await c.req.json().catch(() => ({}));
  const parsed = ExportSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const ids = parsed.data.ids ?? [];

  // Batch-fetch all matching conversations in a single query instead of
  // firing one query per ID (N+1 problem).
  const rows =
    ids.length > 0
      ? await db
          .select()
          .from(conversations)
          .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)))
      : await db
          .select()
          .from(conversations)
          .where(eq(conversations.projectId, projectId))
          .orderBy(desc(conversations.updatedAt))
          .limit(100);

  // Batch-fetch all messages for the returned conversations in a single query.
  const convIds = rows.map((r) => r.id);
  const allMsgs =
    convIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.conversationId, convIds))
          .orderBy(asc(messages.createdAt))
          .limit(5000)
      : [];

  // Group messages by conversation ID for O(1) lookup when building response.
  const msgsByConv = new Map<string, typeof allMsgs>();
  for (const msg of allMsgs) {
    const list = msgsByConv.get(msg.conversationId) ?? [];
    list.push(msg);
    msgsByConv.set(msg.conversationId, list);
  }

  const exported = rows.map((conv) => ({
    ...deserializeConversationFull(conv),
    messages: (msgsByConv.get(conv.id) ?? []).map(deserializeMessage),
  }));

  return c.json({ data: exported, count: exported.length });
});

export default router;
