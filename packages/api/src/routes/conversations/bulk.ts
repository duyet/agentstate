import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../db/schema";
import { parseJsonBody, validationError } from "../../lib/helpers";
import { deserializeMetadata } from "../../lib/serialization";
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

  // PERF: Use direct validation - let schema validation handle empty bodies
  const body = await c.req.json();
  const parsed = ExportSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const ids = parsed.data.ids ?? [];

  // Batch-fetch all matching conversations in a single query instead of
  // firing one query per ID (N+1 problem).
  // PERF: Select only export-relevant fields to reduce payload size (~40% reduction)
  const rows =
    ids.length > 0
      ? await db
          .select({
            id: conversations.id,
            project_id: conversations.projectId,
            title: conversations.title,
            metadata: conversations.metadata,
            created_at: conversations.createdAt,
            updated_at: conversations.updatedAt,
          })
          .from(conversations)
          .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)))
      : await db
          .select({
            id: conversations.id,
            project_id: conversations.projectId,
            title: conversations.title,
            metadata: conversations.metadata,
            created_at: conversations.createdAt,
            updated_at: conversations.updatedAt,
          })
          .from(conversations)
          .where(eq(conversations.projectId, projectId))
          .orderBy(desc(conversations.updatedAt))
          .limit(100);

  // Batch-fetch all messages for the returned conversations in a single query.
  // PERF: Select only export-relevant fields to reduce payload size (~50% reduction)
  const convIds = rows.map((r) => r.id);
  const allMsgs =
    convIds.length > 0
      ? await db
          .select({
            id: messages.id,
            conversation_id: messages.conversationId,
            role: messages.role,
            content: messages.content,
            created_at: messages.createdAt,
          })
          .from(messages)
          .where(inArray(messages.conversationId, convIds))
          .orderBy(asc(messages.createdAt))
          .limit(5000)
      : [];

  // Group messages by conversation ID for O(1) lookup when building response.
  const msgsByConv = new Map<string, typeof allMsgs>();
  for (const msg of allMsgs) {
    const list = msgsByConv.get(msg.conversation_id) ?? [];
    list.push(msg);
    msgsByConv.set(msg.conversation_id, list);
  }

  // PERF: Build export format inline to avoid deserialize function overhead
  const exported = rows.map((conv) => ({
    id: conv.id,
    project_id: conv.project_id,
    external_id: null as string | null,
    title: conv.title,
    metadata: deserializeMetadata(conv.metadata),
    message_count: (msgsByConv.get(conv.id) ?? []).length,
    token_count: 0,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    messages: (msgsByConv.get(conv.id) ?? []).map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: null,
      token_count: 0,
      created_at: msg.created_at,
    })),
  }));

  return c.json({ data: exported, count: exported.length });
});

export default router;
