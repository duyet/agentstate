import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { messages } from "../../../db/schema";
import {
  getCachedCount,
  loadConversation,
  mapConversationToResponse,
  notFound,
  parseAndValidateBody,
  parseIncludeParam,
  parseLimitParam,
  parseOrderParam,
} from "../../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../../lib/serialization";
import { CreateConversationSchema, UpdateConversationSchema } from "../../../lib/validation";
import {
  createConversation,
  deleteConversation,
  getConversationCount,
  listConversations as listConversationsService,
  updateConversation as updateConversationService,
} from "../../../services/v2-conversations";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST / — Create conversation
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { data, error } = await parseAndValidateBody(c, CreateConversationSchema);
  if (error) return error;
  if (!data)
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid request body" } }, 400);

  const result = await createConversation(c.get("db"), {
    projectId: c.get("projectId"),
    externalId: data.external_id ?? null,
    title: data.title ?? null,
    metadata: data.metadata ?? null,
    inputMessages: data.messages,
  });

  if (result.error) {
    return c.json(
      { error: { code: result.error.code, message: result.error.message } },
      result.error.status,
    );
  }

  return c.json(mapConversationToResponse(result), 201);
});

// ---------------------------------------------------------------------------
// GET / — List conversations (v2: includes total count)
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const result = await listConversationsService(c.get("db"), c.env.AUTH_CACHE, c.get("projectId"), {
    limit: parseLimitParam(c.req.query("limit")),
    cursor: c.req.query("cursor"),
    order: parseOrderParam(c.req.query("order")),
    tag: c.req.query("tag"),
  });

  if (result.error) {
    return c.json(
      { error: { code: result.error.code, message: result.error.message } },
      result.error.status,
    );
  }

  const totalCount = await getCachedCount(c, `count:conversations:${c.get("projectId")}`, () =>
    getConversationCount(c.get("db"), c.get("projectId")),
  );

  return c.json({
    data: result.rows.map(deserializeConversationFull),
    pagination: { limit: result.rows.length, next_cursor: result.nextCursor, total: totalCount },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get conversation (v2: messages not included by default)
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const conversation = await loadConversation(c, c.req.param("id"));
  if (!conversation) return notFound(c);

  const response = deserializeConversationFull(conversation) as Record<string, unknown>;

  if (parseIncludeParam(c.req.query("include"), "messages")) {
    const msgs = await c
      .get("db")
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);
    response.messages = msgs.map(deserializeMessage);
  }

  return c.json(response);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update conversation (v2: uses PATCH instead of PUT)
// ---------------------------------------------------------------------------

router.patch("/:id", async (c) => {
  const { data, error } = await parseAndValidateBody(c, UpdateConversationSchema);
  if (error) return error;
  if (!data)
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid request body" } }, 400);

  const id = c.req.param("id");
  if (!(await loadConversation(c, id))) return notFound(c);

  const updated = await updateConversationService(c.get("db"), id, data);
  return c.json(deserializeConversationFull(updated));
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete conversation
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await loadConversation(c, id))) return notFound(c);

  await deleteConversation(c.get("db"), id);
  return c.body(null, 204);
});

export default router;
