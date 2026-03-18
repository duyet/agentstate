import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, conversationTags, messages } from "../../../db/schema";
import {
  errorResponse,
  loadConversation,
  notFound,
  parseJsonBody,
  validationError,
} from "../../../lib/helpers";
import { generateId } from "../../../lib/id";
import {
  deserializeConversationFull,
  deserializeMessage,
  serializeMetadata,
} from "../../../lib/serialization";
import { CreateConversationSchema, UpdateConversationSchema } from "../../../lib/validation";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST / — Create conversation
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
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
      return errorResponse(
        c,
        "CONFLICT",
        "A conversation with this external_id already exists",
        409,
      );
    }
    throw err;
  }

  // V2: Messages not included in create response for efficiency

  let _messageRows: (typeof messages.$inferSelect)[] = [];

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
    _messageRows = rows as (typeof messages.$inferSelect)[];
  }

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
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET / — List conversations (v2: includes total count)
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw, 100);

  const cursor = c.req.query("cursor");
  const order = c.req.query("order") === "asc" ? "asc" : "desc";
  const tagFilter = c.req.query("tag");

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

  let rows: (typeof conversations.$inferSelect)[];

  if (tagFilter) {
    rows = await db
      .select({
        id: conversations.id,
        projectId: conversations.projectId,
        externalId: conversations.externalId,
        title: conversations.title,
        metadata: conversations.metadata,
        messageCount: conversations.messageCount,
        tokenCount: conversations.tokenCount,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .innerJoin(
        conversationTags,
        and(
          eq(conversationTags.conversationId, conversations.id),
          eq(conversationTags.tag, tagFilter),
        ),
      )
      .where(and(...conditions))
      .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
      .limit(limit);
  } else {
    rows = await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
      .limit(limit);
  }

  // V2: Include total count for the project (with caching)
  const cacheKey = `count:conversations:${projectId}`;
  let count = 0;

  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) count = cached as number;
  }

  if (!count) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.projectId, projectId));
    count = countResult?.count ?? 0;

    if (c.env.AUTH_CACHE) {
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(count), { expirationTtl: 60 }),
      );
    }
  }

  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].updatedAt) : null;

  return c.json({
    data: rows.map(deserializeConversationFull),
    pagination: {
      limit,
      next_cursor: nextCursor,
      total: count,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get conversation (v2: messages not included by default)
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  // V2: messages not included by default - use ?include=messages
  const include = c.req.query("include");
  const shouldIncludeMessages = include?.includes("messages") ?? false;

  let messagesList: ReturnType<typeof deserializeMessage>[] = [];
  if (shouldIncludeMessages) {
    const db = c.get("db");
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    messagesList = msgs.map(deserializeMessage);
  }

  return c.json({
    ...deserializeConversationFull(conversation),
    ...(shouldIncludeMessages ? { messages: messagesList } : {}),
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update conversation (v2: uses PATCH instead of PUT)
// ---------------------------------------------------------------------------

router.patch("/:id", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");
  const { title, metadata } = parsed.data;
  const now = Date.now();

  const updates: Partial<typeof conversations.$inferInsert> = {
    updatedAt: now,
  };
  if (title !== undefined) updates.title = title;
  if (metadata !== undefined) updates.metadata = serializeMetadata(metadata);

  await db.update(conversations).set(updates).where(eq(conversations.id, id));

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
  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");

  // Batch delete: messages first, then conversation (atomic via D1 batch)
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, id)),
    db.delete(conversations).where(eq(conversations.id, id)),
  ]);

  return c.body(null, 204);
});

export default router;
