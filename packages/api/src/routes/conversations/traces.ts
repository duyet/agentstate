import { Hono } from "hono";
import {
  errorResponse,
  loadConversation,
  notFound,
  parseJsonBody,
  parseLimitParam,
  parseOrderParam,
  validationError,
} from "../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import { IngestTraceSchema } from "../../lib/validation";
import { requireScope } from "../../middleware/require-scope";
import * as tracesService from "../../services/traces";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST /traces/ingest — Batch create trace + observations
// ---------------------------------------------------------------------------

router.post("/traces/ingest", requireScope("conversations:write"), async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = IngestTraceSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const db = c.get("db");
  const projectId = c.get("projectId");

  const result = await tracesService.ingestTrace(db, projectId, parsed.data);

  return c.json(
    {
      conversation: deserializeConversationFull(result.conversation),
      observations: result.observations.map(deserializeMessage),
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET /traces — List traces
// ---------------------------------------------------------------------------

router.get("/traces", requireScope("conversations:read"), async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const limit = parseLimitParam(c.req.query("limit"));
  const cursor = c.req.query("cursor");
  const order = parseOrderParam(c.req.query("order"));

  const result = await tracesService.listTraces(db, projectId, {
    limit,
    cursor: cursor ?? undefined,
    order,
  });

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json({
    data: result.data,
    has_more: result.has_more,
    next_cursor: result.next_cursor,
  });
});

// ---------------------------------------------------------------------------
// GET /traces/:id — Get trace with observation tree
// ---------------------------------------------------------------------------

router.get("/traces/:id", requireScope("conversations:read"), async (c) => {
  const id = c.req.param("id");
  const existing = await loadConversation(c, id);
  if (!existing) return notFound(c, "Trace not found");

  const db = c.get("db");
  const result = await tracesService.getTraceTree(db, id);

  if (!result) return notFound(c, "Trace not found");

  return c.json(result);
});

export default router;
