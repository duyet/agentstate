import { Hono } from "hono";
import { errorResponse, parseAndValidateBody } from "../../../lib/helpers";
import { CAPABILITY_SCOPES, CreateCapabilityTokenSchema } from "../../../lib/validation";
import { apiKeyAuth } from "../../../middleware/auth";
import { rateLimitMiddleware } from "../../../middleware/rate-limit";
import {
  createCapabilityToken,
  listCapabilityTokens,
  revokeCapabilityToken,
} from "../../../services/capability-tokens";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const UniqueCapabilityTokenSchema = CreateCapabilityTokenSchema.refine(
  (value) => new Set(value.scopes).size === value.scopes.length,
  {
    path: ["scopes"],
    message: `scopes must be unique; allowed scopes: ${CAPABILITY_SCOPES.join(", ")}`,
  },
);

router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

router.post("/", async (c) => {
  const { data, error } = await parseAndValidateBody(c, UniqueCapabilityTokenSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);
  if (!data.name || !data.scopes) {
    return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);
  }

  const token = await createCapabilityToken(c.get("db"), c.get("projectId"), {
    name: data.name,
    scopes: data.scopes,
    expires_at: data.expires_at,
  });
  return c.json(token, 201);
});

router.get("/", async (c) => {
  const tokens = await listCapabilityTokens(c.get("db"), c.get("projectId"));
  return c.json({ data: tokens });
});

router.delete("/:id", async (c) => {
  const revoked = await revokeCapabilityToken(c.get("db"), c.get("projectId"), c.req.param("id"));
  if (!revoked) return errorResponse(c, "NOT_FOUND", "Capability token not found", 404);
  return c.body(null, 204);
});

export default router;
