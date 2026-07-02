import { Hono } from "hono";
import { errorResponse, parseAndValidateBody } from "../../lib/helpers";
import { RenewLeaseSchema } from "../../lib/validation";
import { scopedAuth } from "../../middleware/scoped-auth";
import { releaseLease, renewLease } from "../../services/leases";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Note: there is intentionally no `POST /` here to create a lease. A lease
// is always scoped to a state key, so it is created via
// `POST /v1/states/:state_key/lease` (see routes/states/index.ts) instead
// of being duplicated here. This router only operates on an existing lease
// by id (renew/release).

router.post("/:id/renew", scopedAuth({ scope: "lease:write" }), async (c) => {
  const { data, error } = await parseAndValidateBody(c, RenewLeaseSchema);
  if (error) return error;
  if (!data) return errorResponse(c, "BAD_REQUEST", "Invalid request body", 400);

  const result = await renewLease(c.get("db"), c.get("projectId"), c.req.param("id"), data.ttl_ms);
  if (result.error) {
    return errorResponse(c, result.error.code, result.error.message, result.error.status);
  }

  return c.json(result.lease);
});

router.delete("/:id", scopedAuth({ scope: "lease:write" }), async (c) => {
  const error = await releaseLease(c.get("db"), c.get("projectId"), c.req.param("id"));
  if (error) return errorResponse(c, error.code, error.message, error.status);
  return c.body(null, 204);
});

export default router;
