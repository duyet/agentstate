import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
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
  const limit = Math.min(isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw, 100);

  const cursor = c.req.query("cursor");
  const order = c.req.query("order") === "asc" ? "asc" : "desc";

  const conditions = [eq(conversations.projectId, projectId)];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!isNaN(cursorTs)) {
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

  const [updated] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!updated) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  return c.json(deserializeConversationFull(updated));
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
  const limit = Math.min(isNaN(limitRaw) || limitRaw < 1 ? 100 : limitRaw, 500);

  const after = c.req.query("after");

  const conditions = [eq(messages.conversationId, id)];

  if (after) {
    // Resolve the created_at of the cursor message for stable pagination
    const [cursorMsg] = await db.select().from(messages).where(eq(messages.id, after)).limit(1);

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
  const ids = Array.isArray(body.ids) ? body.ids : [];

  const conditions = [eq(conversations.projectId, projectId)];

  const rows =
    ids.length > 0
      ? await Promise.all(
          ids.map(async (id: string) => {
            const [conv] = await db
              .select()
              .from(conversations)
              .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
              .limit(1);
            return conv;
          }),
        ).then((results) => results.filter(Boolean))
      : await db
          .select()
          .from(conversations)
          .where(and(...conditions))
          .orderBy(desc(conversations.updatedAt))
          .limit(100);

  const exported = await Promise.all(
    rows.map(async (conv) => {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt));

      return {
        ...deserializeConversationFull(conv),
        messages: msgs.map(deserializeMessage),
      };
    }),
  );

  return c.json({ data: exported, count: exported.length });
});

export default router;
