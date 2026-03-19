import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { messages } from "../../../db/schema";
import {
  errorResponse,
  loadConversation,
  notFound,
  parseJsonBody,
  parseLimitParam,
  validationError,
} from "../../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../../lib/serialization";
import { CreateConversationSchema, UpdateConversationSchema } from "../../../lib/validation";
import {
  type CreateConversationInput,
  createConversation as createConversationService,
  deleteConversation as deleteConversationService,
  type ListConversationsOptions,
  listConversations as listConversationsService,
  updateConversation as updateConversationService,
} from "../../../services/v2-conversations";
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

  const input: CreateConversationInput = {
    projectId,
    externalId: external_id ?? null,
    title: title ?? null,
    metadata: metadata ?? null,
    inputMessages,
  };

  const result = await createConversationService(db, input);

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json(
    {
      id: result.conversationId,
      project_id: result.projectId,
      external_id: result.externalId,
      title: result.title,
      metadata: result.metadata,
      message_count: result.messageCount,
      token_count: result.tokenCount,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
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

  const limit = parseLimitParam(c.req.query("limit"));

  const cursor = c.req.query("cursor");
  const order = c.req.query("order") === "asc" ? "asc" : "desc";
  const tag = c.req.query("tag");

  const options: ListConversationsOptions = {
    limit,
    cursor,
    order,
    tag,
  };

  const result = await listConversationsService(db, c.env.AUTH_CACHE, projectId, options);

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json({
    data: result.rows.map(deserializeConversationFull),
    pagination: { limit, next_cursor: result.nextCursor, total: result.totalCount },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get conversation (v2: messages not included by default)
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const shouldIncludeMessages = c.req.query("include")?.includes("messages") ?? false;
  const response = deserializeConversationFull(conversation);

  if (shouldIncludeMessages) {
    const db = c.get("db");
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    return c.json({ ...response, messages: msgs.map(deserializeMessage) });
  }

  return c.json(response);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update conversation (v2: uses PATCH instead of PUT)
// ---------------------------------------------------------------------------

router.patch("/:id", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);

  const id = c.req.param("id");
  if (!(await loadConversation(c, id))) return notFound(c);

  const db = c.get("db");
  const updated = await updateConversationService(db, id, parsed.data);

  return c.json(deserializeConversationFull(updated));
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete conversation
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await loadConversation(c, id))) return notFound(c);

  await deleteConversationService(c.get("db"), id);
  return c.body(null, 204);
});

export default router;
