import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { errorResponse, parseAndValidateBody, parseLimitParam } from "../../../lib/helpers";
import { CreateLeaseSchema, QueryStatesSchema, UpsertStateSchema } from "../../../lib/validation";
import { scopedAuth } from "../../../middleware/scoped-auth";
import { createLease } from "../../../services/leases";
import {
  buildIdempotencyHash,
  deleteState,
  getHistoricalState,
  getLatestState,
  listStateEvents,
  queryStates,
  readIdempotency,
  type StateEventResponse,
  storeIdempotency,
  upsertState,
} from "../../../services/states";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function stateHub(c: any) {
  const namespace = c.env.STATE_STREAM_HUB;
  if (!namespace) return null;
  return namespace.getByName(c.get("projectId"));
}

function notifyStateEvent(c: any, event: StateEventResponse) {
  const hub = stateHub(c);
  if (!hub) return;
  c.executionCtx.waitUntil(
    hub.fetch("https://state-stream.local/notify", {
      method: "POST",
      body: JSON.stringify(event),
    }),
  );
}

// ---------------------------------------------------------------------------
// GET /watch — SSE state event stream
// ---------------------------------------------------------------------------

router.get("/watch", scopedAuth({ scope: "state:watch", allowQueryToken: true }), async (c) => {
  const after =
    parsePositiveInt(c.req.query("after")) ?? parsePositiveInt(c.req.header("Last-Event-ID")) ?? 0;
  const once = c.req.query("once") === "true";
  const hub = stateHub(c);

  if (hub && !once) {
    const url = new URL("https://state-stream.local/watch");
    url.searchParams.set("after", String(after));
    return hub.fetch(
      new Request(url, {
        headers: { "X-Project-Id": c.get("projectId") },
      }),
    );
  }

  return streamSSE(c, async (stream) => {
    const events = await c
      .get("d1Db")
      .prepare(
        `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
         FROM state_events
         WHERE project_id = ? AND sequence > ?
         ORDER BY sequence ASC
         LIMIT 1000`,
      )
      .bind(c.get("projectId"), after)
      .all<any>();

    for (const event of events.results ?? []) {
      await stream.writeSSE({
        id: String(event.sequence),
        event: `state.${event.event_type}`,
        data: JSON.stringify(event),
      });
    }
    stream.close();
  });
});

// ---------------------------------------------------------------------------
// POST /query — Rich state query
// ---------------------------------------------------------------------------

router.post("/query", scopedAuth({ scope: "state:read" }), async (c) => {
  const { data, error } = await parseAndValidateBody(c, QueryStatesSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);

  const result = await queryStates(c.get("d1Db"), c.get("projectId"), data);
  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  const rows = result.rows ?? [];
  return c.json({
    data: rows,
    pagination: {
      limit: rows.length,
      next_cursor: result.nextCursor ?? null,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /:state_key/lease — Acquire lease
// ---------------------------------------------------------------------------

router.post("/:state_key/lease", scopedAuth({ scope: "lease:write" }), async (c) => {
  const { data, error } = await parseAndValidateBody(c, CreateLeaseSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);

  const result = await createLease(
    c.get("db"),
    c.get("projectId"),
    c.req.param("state_key"),
    data.holder,
    data.ttl_ms,
  );

  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json(result.lease, 201);
});

// ---------------------------------------------------------------------------
// GET /:state_key/events — WAL events
// ---------------------------------------------------------------------------

router.get("/:state_key/events", scopedAuth({ scope: "state:read" }), async (c) => {
  const after = parsePositiveInt(c.req.query("after")) ?? 0;
  const limit = parseLimitParam(c.req.query("limit"), 50, 500);
  const events = await listStateEvents(
    c.get("d1Db"),
    c.get("projectId"),
    c.req.param("state_key"),
    after,
    limit,
  );

  return c.json({
    data: events,
    pagination: {
      limit: events.length,
      next_cursor: events.length ? String(events[events.length - 1].sequence) : null,
    },
  });
});

// ---------------------------------------------------------------------------
// PUT /:state_key — Upsert full state
// ---------------------------------------------------------------------------

router.put("/:state_key", scopedAuth({ scope: "state:write" }), async (c) => {
  const { data, error } = await parseAndValidateBody(c, UpsertStateSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);

  const stateKey = c.req.param("state_key");
  const idempotencyKey = c.req.header("Idempotency-Key");
  const requestHash = await buildIdempotencyHash("PUT", stateKey, data);
  const cached = await readIdempotency(
    c.get("d1Db"),
    c.get("projectId"),
    idempotencyKey,
    requestHash,
  );
  if (cached.error)
    return errorResponse(c, cached.error.code, cached.error.message, cached.error.status);
  if (cached.replay) return cached.replay;

  const result = await upsertState(
    c.get("d1Db"),
    c.get("projectId"),
    stateKey,
    data,
    idempotencyKey,
  );
  if (result.error)
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  if (!result.result) return errorResponse(c, "INTERNAL_ERROR", "State write failed", 500);

  await storeIdempotency(
    c.get("d1Db"),
    c.get("projectId"),
    idempotencyKey,
    requestHash,
    result.result.status,
    result.result.body,
  );
  notifyStateEvent(c, result.result.event);
  return c.json(result.result.body, result.result.status as 200);
});

// ---------------------------------------------------------------------------
// GET /:state_key — Latest or historical state
// ---------------------------------------------------------------------------

router.get("/:state_key", scopedAuth({ scope: "state:read" }), async (c) => {
  const atSequence = parsePositiveInt(c.req.query("at_sequence"));
  const atTime = parsePositiveInt(c.req.query("at_time"));
  const state =
    atSequence !== undefined || atTime !== undefined
      ? await getHistoricalState(
          c.get("d1Db"),
          c.get("projectId"),
          c.req.param("state_key"),
          atSequence,
          atTime,
        )
      : await getLatestState(c.get("d1Db"), c.get("projectId"), c.req.param("state_key"));

  if (!state) return errorResponse(c, "NOT_FOUND", "State not found", 404);
  return c.json(state);
});

// ---------------------------------------------------------------------------
// DELETE /:state_key — Tombstone state
// ---------------------------------------------------------------------------

router.delete("/:state_key", scopedAuth({ scope: "state:write" }), async (c) => {
  const stateKey = c.req.param("state_key");
  const leaseId = c.req.header("X-Lease-Id") ?? c.req.query("lease_id");
  const idempotencyKey = c.req.header("Idempotency-Key");
  const requestHash = await buildIdempotencyHash("DELETE", stateKey, { lease_id: leaseId ?? null });
  const cached = await readIdempotency(
    c.get("d1Db"),
    c.get("projectId"),
    idempotencyKey,
    requestHash,
  );
  if (cached.error)
    return errorResponse(c, cached.error.code, cached.error.message, cached.error.status);
  if (cached.replay) return cached.replay;

  const result = await deleteState(c.get("d1Db"), c.get("projectId"), stateKey, leaseId);
  if (result.error)
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  if (!result.result) return errorResponse(c, "INTERNAL_ERROR", "State delete failed", 500);

  await storeIdempotency(
    c.get("d1Db"),
    c.get("projectId"),
    idempotencyKey,
    requestHash,
    result.result.status,
    result.result.body,
  );
  notifyStateEvent(c, result.result.event);
  return c.json(result.result.body, 200);
});

export default router;
