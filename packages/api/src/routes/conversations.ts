import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { conversations, messages } from "../db/schema";
import { generateId } from "../lib/id";
import { apiKeyAuth } from "../middleware/auth";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const MessageInputSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  token_count: z.number().int().nonnegative().optional(),
});

const CreateConversationSchema = z.object({
  external_id: z.string().optional(),
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  messages: z.array(MessageInputSchema).optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const AppendMessagesSchema = z.object({
  messages: z.array(MessageInputSchema).min(1),
});

const ExportSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Helper: serialize metadata to/from JSON text column
// ---------------------------------------------------------------------------

function serializeMetadata(metadata: Record<string, unknown> | undefined): string | null {
  return metadata !== undefined ? JSON.stringify(metadata) : null;
}

function deserializeMessage(row: typeof messages.$inferSelect) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    token_count: row.tokenCount,
    created_at: row.createdAt,
  };
}

function deserializeConversationFull(row: typeof conversations.$inferSelect) {
  return {
    id: row.id,
    project_id: row.projectId,
    external_id: row.externalId,
    title: row.title,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    message_count: row.messageCount,
    token_count: row.tokenCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", apiKeyAuth);

// ---------------------------------------------------------------------------
// POST / — Create conversation
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0].message } }, 400);
  }

  const { external_id, title, metadata, messages: inputMessages } = parsed.data;
  const db = c.get("db");
  const projectId = c.get("projectId");
  const now = Date.now();

  const msgCount = inputMessages?.length ?? 0;
  const tokenCount = inputMessages?.reduce((sum, m) => sum + (m.token_count ?? 0), 0) ?? 0;

  const conversationId = generateId();

  try {
    await db.insert(conversations).values({
      id: conversationId,
      projectId,
      externalId: external_id ?? null,
      title: title ?? null,
      metadata: serializeMetadata(metadata),
      messageCount: msgCount,
      tokenCount,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (external_id && msg.toLowerCase().includes("unique")) {
      return c.json(
        {
          error: {
            code: "CONFLICT",
            message: "A conversation with this external_id already exists",
          },
        },
        409,
      );
    }
    throw err;
  }

  let messageRows: (typeof messages.$inferSelect)[] = [];

  if (inputMessages && inputMessages.length > 0) {
    const rows = inputMessages.map((m) => ({
      id: generateId(),
      conversationId,
      role: m.role as "system" | "user" | "assistant" | "tool",
      content: m.content,
      metadata: serializeMetadata(m.metadata),
      tokenCount: m.token_count ?? 0,
      createdAt: now,
    }));

    await db.insert(messages).values(rows);
    messageRows = rows as (typeof messages.$inferSelect)[];
  }

  // Build response directly from inserted values — no re-SELECT needed
  return c.json(
    {
      id: conversationId,
      project_id: projectId,
      external_id: external_id ?? null,
      title: title ?? null,
      metadata: metadata ?? null,
      message_count: msgCount,
      token_count: tokenCount,
      created_at: now,
      updated_at: now,
      messages: messageRows.map(deserializeMessage),
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET / — List conversations
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw, 100);

  const cursor = c.req.query("cursor");
  const order = c.req.query("order") === "asc" ? "asc" : "desc";

  const conditions = [eq(conversations.projectId, projectId)];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!Number.isNaN(cursorTs)) {
      conditions.push(
        order === "desc"
          ? lt(conversations.updatedAt, cursorTs)
          : gt(conversations.updatedAt, cursorTs),
      );
    }
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
    .limit(limit);

  // NOTE: The cursor is based on `updatedAt` (millisecond timestamp). This means
  // rows with identical `updatedAt` values that straddle a page boundary may be
  // duplicated or skipped. This is a known tradeoff accepted to avoid the added
  // complexity of a composite (updatedAt, id) cursor — do not change without
  // updating existing API consumers that rely on this cursor format.
  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].updatedAt) : null;

  return c.json({
    data: rows.map(deserializeConversationFull),
    pagination: {
      limit,
      next_cursor: nextCursor,
    },
  });
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

  if (!conversation) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

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

// ---------------------------------------------------------------------------
// GET /:id — Get conversation with messages
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const id = c.req.param("id");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!conversation) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return c.json({
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  });
});

// ---------------------------------------------------------------------------
// PUT /:id — Update conversation
// ---------------------------------------------------------------------------

router.put("/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0].message } }, 400);
  }

  const db = c.get("db");
  const projectId = c.get("projectId");
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  const { title, metadata } = parsed.data;
  const now = Date.now();

  const updates: Partial<typeof conversations.$inferInsert> = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (metadata !== undefined) updates.metadata = serializeMetadata(metadata);

  await db
    .update(conversations)
    .set(updates)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)));

  // Build response from local state — no re-SELECT needed
  return c.json(
    deserializeConversationFull({
      ...existing,
      title: title !== undefined ? title : existing.title,
      metadata: metadata !== undefined ? serializeMetadata(metadata) : existing.metadata,
      updatedAt: now,
    }),
  );
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete conversation
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  // Batch delete: messages first, then conversation (atomic via D1 batch)
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, id)),
    db.delete(conversations).where(eq(conversations.id, id)),
  ]);

  return new Response(null, { status: 204 });
});

// ---------------------------------------------------------------------------
// POST /:id/messages — Append messages
// ---------------------------------------------------------------------------

router.post("/:id/messages", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  const parsed = AppendMessagesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0].message } }, 400);
  }

  const db = c.get("db");
  const projectId = c.get("projectId");
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

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
  const db = c.get("db");
  const projectId = c.get("projectId");
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

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

// ---------------------------------------------------------------------------
// POST /export — Bulk export conversations with messages
// ---------------------------------------------------------------------------

router.post("/export", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const body = await c.req.json().catch(() => ({}));
  const parsed = ExportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0].message } }, 400);
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
