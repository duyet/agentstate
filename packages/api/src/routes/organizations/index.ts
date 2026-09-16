import { Hono } from "hono";
import { z } from "zod";
import { errorResponse, parseJsonBody, validationError } from "../../lib/helpers";
import { getOrganizationByClerkId, syncOrganization } from "../../services/organizations";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const SyncOrgSchema = z.object({
  // Ignored — identity comes from the verified JWT, never the body.
  clerk_org_id: z.string().optional(),
  name: z.string().min(1, "name is required"),
});

// ---------------------------------------------------------------------------
// POST /sync — Sync Clerk organization to local DB
// ---------------------------------------------------------------------------

/**
 * Sync the session Clerk organization to the local organizations table.
 * Called by the dashboard when a user creates or switches organizations.
 *
 * JWT org is required: `clerk_org_id` is taken from the verified session
 * (`c.get("orgId")`). Request-body `clerk_org_id` is ignored so a signed-in
 * user cannot create or overwrite another tenant's row. `name` is applied
 * only to that session org (the dashboard sends the Clerk org name).
 */
router.post("/sync", async (c) => {
  // JWT org is required — never trust a client-supplied clerk_org_id.
  const clerkOrgId = c.get("orgId");
  if (!clerkOrgId) {
    return errorResponse(c, "UNAUTHORIZED", "Organization is required", 401);
  }

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = SyncOrgSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const db = c.get("db");
  const org = await syncOrganization(db, {
    clerk_org_id: clerkOrgId,
    name: parsed.data.name,
  });

  return c.json(org, org.created_at === org.updated_at ? 201 : 200);
});

// ---------------------------------------------------------------------------
// GET /:clerkOrgId — Get organization by Clerk org ID
// ---------------------------------------------------------------------------

router.get("/:clerkOrgId", async (c) => {
  const sessionOrgId = c.get("orgId");
  const clerkOrgId = c.req.param("clerkOrgId");

  // JWT org is required — 404 unless the path org is the session org.
  // Do not leak another tenant's row (or its existence).
  if (!sessionOrgId || clerkOrgId !== sessionOrgId) {
    return errorResponse(c, "NOT_FOUND", "Organization not found", 404);
  }

  const db = c.get("db");
  const org = await getOrganizationByClerkId(db, clerkOrgId);

  if (!org) {
    return errorResponse(c, "NOT_FOUND", "Organization not found", 404);
  }

  return c.json(org);
});

export default router;
