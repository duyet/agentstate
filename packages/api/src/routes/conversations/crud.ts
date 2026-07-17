import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { messages } from "../../db/schema";
import {
  errorResponse,
  invalidId,
  isValidResourceId,
  loadConversation,
  notFound,
  parseJsonBody,
  parseLimitParam,
  validationError,
} from "../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import { CreateConversationSchema, UpdateConversationSchema } from "../../lib/validation";
import { requireScope } from "../../middleware/require-scope";
import * as ConversationService from "../../services/conversations";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Upper bound on messages returned inline with a single conversation. Prevents
 * an unbounded load (and unordered result) for very large conversations while
 * keeping the response shape unchanged for the common case.
 */
const MAX_INLINE_MESSAGES = 1000;

// ---------------------------------------------------------------------------
// POST / — Create conversation
// ---------------------------------------------------------------------------

router.post("/", requireScope("conversations:write"), async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { external_id, title, metadata, messages: inputMessages } = parsed.data;
  const db = c.get("db");
  const projectId = c.get("projectId");

  const result = await ConversationService.createConversation(
    db,
    {
      projectId,
      externalId: external_id,
      title,
      metadata,
      inputMessages,
    },
    c.executionCtx,
    c.env.AUTH_CACHE,
  );

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json(
    {
      id: result.conversation.id,
      project_id: result.conversation.projectId,
      external_id: result.conversation.externalId,
      title: result.conversation.title,
      metadata: metadata ?? null,
      message_count: result.conversation.messageCount,
      token_count: result.conversation.tokenCount,
      total_cost_microdollars: result.conversation.totalCostMicrodollars,
      total_tokens: result.conversation.totalTokens,
      created_at: result.conversation.createdAt,
      updated_at: result.conversation.updatedAt,
      messages: result.messages.map(deserializeMessage),
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET / — List conversations
// ---------------------------------------------------------------------------

router.get("/", requireScope("conversations:read"), async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const limit = parseLimitParam(c.req.query("limit"));

  const cursor = c.req.query("cursor");
  const order = c.req.query("order") === "asc" ? "asc" : "desc";
  const tag = c.req.query("tag");

  const result = await ConversationService.listConversations(db, projectId, {
    limit,
    cursor,
    order,
    tag,
  });

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json({
    data: result.rows.map(deserializeConversationFull),
    pagination: {
      limit,
      next_cursor: result.nextCursor,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get conversation with messages
// ---------------------------------------------------------------------------

router.get("/:id", requireScope("conversations:read"), async (c) => {
  const id = c.req.param("id");
  if (!isValidResourceId(id)) return invalidId(c, "Invalid conversation id");

  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  // Parse and validate fields parameter
  const fieldsStr = c.req.query("fields");
  let fields: ReturnType<typeof ConversationService.parseFieldsParam> = null;
  try {
    fields = ConversationService.parseFieldsParam(fieldsStr);
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
        // Deterministic order (created_at, then rowid to break ties on identical
        // timestamps) and a bound so a huge conversation can't load unboundedly.
        .orderBy(asc(messages.createdAt), asc(sql`rowid`))
        .limit(MAX_INLINE_MESSAGES)
    : [];

  const response = {
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  };

  return c.json(ConversationService.filterResponse(response, fields));
});

// ---------------------------------------------------------------------------
// PUT /:id — Update conversation
// ---------------------------------------------------------------------------

router.put("/:id", requireScope("conversations:write"), async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const id = c.req.param("id");
  if (!isValidResourceId(id)) return invalidId(c, "Invalid conversation id");

  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");
  const { title, metadata } = parsed.data;

  await ConversationService.updateConversation(db, id, {
    title,
    metadata,
  });

  // Build response from local state
  return c.json(
    deserializeConversationFull({
      ...existing,
      title: title !== undefined ? title : existing.title,
      metadata: metadata !== undefined ? JSON.stringify(metadata) : existing.metadata,
      updatedAt: Date.now(),
    }),
  );
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete conversation
// ---------------------------------------------------------------------------

router.delete("/:id", requireScope("conversations:write"), async (c) => {
  const id = c.req.param("id");
  if (!isValidResourceId(id)) return invalidId(c, "Invalid conversation id");

  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c);

  const db = c.get("db");

  await ConversationService.deleteConversation(
    db,
    id,
    existing.projectId,
    c.executionCtx,
    c.env.AUTH_CACHE,
  );

  return c.body(null, 204);
});

export default router;
