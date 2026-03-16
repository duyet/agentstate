import { and, asc, desc, eq, gt, inArray, like, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, conversationTags, messages } from "../db/schema";
import { parseJsonBody, validationError } from "../lib/helpers";
import { generateId } from "../lib/id";
import {
  deserializeConversationFull,
  deserializeMessage,
  serializeMetadata,
} from "../lib/serialization";
import {
  AppendMessagesSchema,
  BulkDeleteSchema,
  CreateConversationSchema,
  ExportSchema,
  UpdateConversationSchema,
} from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

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
  const tagFilter = c.req.query("tag");

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
    // Filter conversations that have the requested tag via an inner join.
    // We use groupBy to collapse the join's duplicate conversation rows.
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
// GET /search — Search conversations by message content
// ---------------------------------------------------------------------------

// Snippet extraction: return up to `maxLen` characters of the matching portion
// of the message content, with a short prefix for context.
const SNIPPET_PREFIX_CHARS = 40;
const SNIPPET_MAX_LEN = 200;

function buildSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    // No exact match (can happen with LIKE wildcards); return the start of content.
    return content.slice(0, SNIPPET_MAX_LEN);
  }
  const start = Math.max(0, idx - SNIPPET_PREFIX_CHARS);
  const end = Math.min(content.length, start + SNIPPET_MAX_LEN);
  const snippet = content.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < content.length ? "…" : "");
}

router.get("/search", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const q = c.req.query("q");
  if (!q || q.trim() === "") {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'q' is required and must not be empty",
        },
      },
      400,
    );
  }
  const query = q.trim();

  const limitRaw = parseInt(c.req.query("limit") ?? "20", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 20 : limitRaw, 100);

  const cursor = c.req.query("cursor");

  // Build the cursor condition. Cursor is the `updated_at` timestamp of the last
  // result from the previous page, so we page forward with `updated_at < cursor`
  // (newest-first ordering, matching the list endpoint convention).
  const conditions = [eq(conversations.projectId, projectId), like(messages.content, `%${query}%`)];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!Number.isNaN(cursorTs)) {
      conditions.push(lt(conversations.updatedAt, cursorTs));
    }
  }

  // Single JOIN query: find distinct conversations that have at least one
  // message matching the query. We fetch limit+1 rows (one extra per
  // conversation) to detect if there is a next page, then deduplicate by
  // conversation id in JS. The extra row overhead is bounded because D1 LIKE
  // scans are already O(n) on the message table.
  //
  // Strategy: use a subquery-style approach via Drizzle's raw SQL to get one
  // matching message per conversation efficiently. Since Drizzle's D1 adapter
  // does not expose DISTINCT ON (SQLite-specific), we rely on GROUP BY to
  // collapse duplicate conversation rows and MIN() to pick a deterministic
  // matching message id for snippet extraction.
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      messageCount: conversations.messageCount,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      // Pick the earliest matching message for the snippet (MIN gives a
      // deterministic ordering without requiring a subquery).
      matchingMessageId: sql<string>`MIN(${messages.id})`,
      matchingContent: sql<string>`MIN(${messages.content})`,
    })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt))
    // Fetch one extra row to determine if a next page exists.
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

  const nextCursor = hasNextPage ? String(pageRows[pageRows.length - 1].updatedAt) : null;

  const data = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: buildSnippet(row.matchingContent, query),
    message_count: row.messageCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }));

  return c.json({ data, next_cursor: nextCursor });
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
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
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
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = AppendMessagesSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
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
