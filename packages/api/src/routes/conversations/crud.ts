import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, conversationTags, messages } from "../../db/schema";
import {
  errorResponse,
  loadConversation,
  notFound,
  parseJsonBody,
  validationError,
} from "../../lib/helpers";
import { generateId } from "../../lib/id";
import {
  deserializeConversationFull,
  deserializeMessage,
  serializeMetadata,
} from "../../lib/serialization";
import { CreateConversationSchema, UpdateConversationSchema } from "../../lib/validation";
import type { Bindings, Variables } from "../../types";

// ---------------------------------------------------------------------------
// Field Selection Types and Utilities
// ---------------------------------------------------------------------------

/** Valid field names for conversation responses */
const VALID_CONVERSATION_FIELDS = [
  "id",
  "project_id",
  "external_id",
  "title",
  "metadata",
  "message_count",
  "token_count",
  "created_at",
  "updated_at",
  "messages",
] as const;

type ConversationFieldName = (typeof VALID_CONVERSATION_FIELDS)[number];

/**
 * Parse and validate the fields query parameter.
 * Returns null if no fields specified (return all fields).
 * Returns array of field names if valid.
 * Throws error if invalid field names found.
 */
function parseFieldsParam(fieldsStr: string | undefined | null): ConversationFieldName[] | null {
  if (!fieldsStr) return null;

  // Handle special case: !messages means "exclude messages"
  if (fieldsStr === "!messages") {
    return VALID_CONVERSATION_FIELDS.filter((f) => f !== "messages");
  }

  const fields = fieldsStr.split(",").map((f) => f.trim() as ConversationFieldName);

  // Validate all field names
  const invalidFields = fields.filter((f) => !VALID_CONVERSATION_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    throw new Error(
      `Invalid field(s): ${invalidFields.join(", ")}. Valid fields: ${VALID_CONVERSATION_FIELDS.join(", ")}`,
    );
  }

  return fields;
}

/**
 * Filter a response object to only include requested fields.
 * If fields is null, returns all fields.
 */
function filterResponse<T extends Record<string, unknown>>(
  data: T,
  fields: ConversationFieldName[] | null,
): T {
  if (!fields) return data;

  const filtered = {} as T;
  for (const field of fields) {
    if (field in data) {
      (filtered as Record<string, unknown>)[field] = data[field];
    }
  }
  return filtered;
}

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
// GET /:id — Get conversation with messages
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  // Parse and validate fields parameter
  const fieldsStr = c.req.query("fields");
  let fields: ConversationFieldName[] | null = null;
  try {
    fields = parseFieldsParam(fieldsStr);
  } catch (err) {
    return errorResponse(
      c,
      "INVALID_FIELD",
      err instanceof Error ? err.message : "Invalid fields parameter",
      400,
    );
  }

  const db = c.get("db");

  // Only fetch messages if requested
  const shouldIncludeMessages = !fields || fields.includes("messages");
  const msgs = shouldIncludeMessages
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(asc(messages.createdAt))
    : [];

  const response = {
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  };

  return c.json(filterResponse(response, fields));
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

  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");
  const { title, metadata } = parsed.data;
  const now = Date.now();

  const updates: Partial<typeof conversations.$inferInsert> = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (metadata !== undefined) updates.metadata = serializeMetadata(metadata);

  await db.update(conversations).set(updates).where(eq(conversations.id, id));

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
  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");

  // Batch delete: messages first, then conversation (atomic via D1 batch)
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, id)),
    db.delete(conversations).where(eq(conversations.id, id)),
  ]);

  return new Response(null, { status: 204 });
});

export default router;
