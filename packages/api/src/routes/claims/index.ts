import { Hono } from "hono";
import { z } from "zod";
import {
  errorResponse,
  parseAndValidateBody,
  parseLimitParam,
  parseOrderParam,
} from "../../lib/helpers";
import { rateLimitMiddleware } from "../../middleware/rate-limit";
import { scopedAuth } from "../../middleware/scoped-auth";
import {
  type CreateEvidenceInput,
  createClaim,
  getClaim,
  listClaims,
  verifyClaim,
} from "../../services/claims";
import type { Bindings, Variables } from "../../types";

const HASH_SCHEMA = /^[a-fA-F0-9]{64}$/;
/**
 * Supported JSON path subset: root `$` followed by any number of
 * `.property` and `[index]` segments, in any order/combination (e.g.
 * `$[0].field`, `$.a[0][1].b`, `$.items[2].name`). Deliberately excludes
 * wildcards (`[*]`), recursive descent (`..`), slices, and quoted/bracket
 * property access (`['key']`) — those are not evaluated by
 * `readJsonPath` in `lib/state-json.ts`, which mirrors this exact grammar.
 */
const JSON_PATH_SCHEMA = /^\$(?:\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*$/;

const TextHashEvidenceSchema = z.object({
  kind: z.literal("text_hash"),
  source: z.string().min(1).max(255),
  data: z.string().min(1),
  hash: z.string().regex(HASH_SCHEMA, "hash must be a SHA-256 hex digest"),
});

const JsonValueEvidenceSchema = z.object({
  kind: z.literal("json_value"),
  source: z.string().min(1).max(255),
  data: z.unknown(),
  json_path: z.string().regex(JSON_PATH_SCHEMA, "json_path must be a simple JSON path"),
  expected_value: z.unknown(),
});

const StateEventEvidenceSchema = z.object({
  kind: z.literal("state_event"),
  source: z.string().min(1).max(255),
  hash: z.string().regex(HASH_SCHEMA, "hash must be a SHA-256 hex digest").optional(),
  json_path: z.string().regex(JSON_PATH_SCHEMA, "json_path must be a simple JSON path").optional(),
  expected_value: z.unknown().optional(),
});

const EvidenceSchema = z
  .union([TextHashEvidenceSchema, JsonValueEvidenceSchema, StateEventEvidenceSchema])
  .superRefine((value, ctx) => {
    if (value.kind === "json_value") {
      requireOwnProperty(value, "data", ctx);
      requireOwnProperty(value, "expected_value", ctx);
      return;
    }

    if (value.kind !== "state_event") return;

    const hasHash = typeof value.hash === "string";
    const hasJsonAssertion =
      typeof value.json_path === "string" && Object.hasOwn(value, "expected_value");

    if (!hasHash && !hasJsonAssertion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "state_event evidence requires hash or json_path with expected_value",
        path: ["json_path"],
      });
    }
  });

const CreateClaimSchema = z.object({
  subject_type: z.string().min(1).max(100),
  subject_id: z.string().min(1).max(255),
  statement: z.string().min(1).max(5000),
  evidence: z.array(EvidenceSchema).min(1).max(50),
});

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// claim:read and claim:write are independent scopes (claim:write does not
// imply claim:read, mirroring conversations:write/state:write not implying
// their :read counterparts) — each route requires exactly what it needs.
// rateLimitMiddleware runs after scopedAuth so apiKeyHash is populated.

router.post("/", scopedAuth({ scope: "claim:write" }), rateLimitMiddleware, async (c) => {
  const { data, error } = await parseAndValidateBody(c, CreateClaimSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);

  const claim = await createClaim(c.get("db"), {
    projectId: c.get("projectId"),
    subjectType: data.subject_type,
    subjectId: data.subject_id,
    statement: data.statement,
    evidence: data.evidence.map(mapEvidenceInput),
  });

  return c.json(claim, 201);
});

router.get("/", scopedAuth({ scope: "claim:read" }), rateLimitMiddleware, async (c) => {
  const result = await listClaims(c.get("db"), c.get("projectId"), {
    limit: parseLimitParam(c.req.query("limit"), 50, 100),
    cursor: c.req.query("cursor"),
    order: parseOrderParam(c.req.query("order")),
    subjectType: c.req.query("subject_type"),
    subjectId: c.req.query("subject_id"),
  });

  if (result.error) {
    return c.json(
      { error: { code: result.error.code, message: result.error.message } },
      result.error.status,
    );
  }

  return c.json({
    data: result.rows,
    pagination: { limit: result.rows.length, next_cursor: result.nextCursor },
  });
});

router.post("/:id/verify", scopedAuth({ scope: "claim:write" }), rateLimitMiddleware, async (c) => {
  const run = await verifyClaim(c.get("db"), c.get("projectId"), c.req.param("id"));
  if (!run) return errorResponse(c, "NOT_FOUND", "Claim not found", 404);

  return c.json(run, 201);
});

router.get("/:id", scopedAuth({ scope: "claim:read" }), rateLimitMiddleware, async (c) => {
  const claim = await getClaim(c.get("db"), c.get("projectId"), c.req.param("id"));
  if (!claim) return errorResponse(c, "NOT_FOUND", "Claim not found", 404);

  return c.json(claim);
});

type EvidenceInput = z.infer<typeof EvidenceSchema>;

function mapEvidenceInput(input: EvidenceInput): CreateEvidenceInput {
  if (input.kind === "text_hash") {
    return {
      kind: input.kind,
      source: input.source,
      data: input.data,
      hash: input.hash,
    };
  }

  if (input.kind === "json_value") {
    return {
      kind: input.kind,
      source: input.source,
      data: input.data,
      jsonPath: input.json_path,
      expectedValue: input.expected_value,
    };
  }

  const stateEvent = input as z.infer<typeof StateEventEvidenceSchema>;
  return {
    kind: "state_event",
    source: stateEvent.source,
    hash: stateEvent.hash,
    jsonPath: stateEvent.json_path,
    expectedValue: stateEvent.expected_value,
  };
}

function requireOwnProperty(value: object, key: string, ctx: z.RefinementCtx) {
  if (Object.hasOwn(value, key)) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${key} is required`,
    path: [key],
  });
}

export default router;
