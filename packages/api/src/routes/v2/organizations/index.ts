import { Hono } from "hono";
import { z } from "zod";
import { errorResponse, parseJsonBody, validationError } from "../../../lib/helpers";
import { getOrganizationByClerkId, syncOrganization } from "../../../services/organizations";
import type { Bindings, Variables } from "./../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const SyncOrgSchema = z.object({
  clerk_org_id: z.string().min(1, "clerk_org_id is required"),
  name: z.string().min(1, "name is required"),
});

// ---------------------------------------------------------------------------
// POST /sync — Sync Clerk organization to local DB
// ---------------------------------------------------------------------------

/**
 * Sync a Clerk organization to the local organizations table.
 * This is called by the dashboard when a user creates or switches organizations.
 * The org is created if it doesn't exist, otherwise the existing record is returned.
 *
 * NOTE: This endpoint does not require API key auth since it's called from the
 * dashboard which uses Clerk auth. In production, we should add Clerk JWT validation.
 */
router.post("/sync", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = SyncOrgSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const db = c.get("db");
  const org = await syncOrganization(db, parsed.data);

  return c.json(org, org.created_at === org.updated_at ? 201 : 200);
});

// ---------------------------------------------------------------------------
// GET /:clerkOrgId — Get organization by Clerk org ID
// ---------------------------------------------------------------------------

router.get("/:clerkOrgId", async (c) => {
  const db = c.get("db");
  const clerkOrgId = c.req.param("clerkOrgId");

  const org = await getOrganizationByClerkId(db, clerkOrgId);

  if (!org) {
    return errorResponse(c, "NOT_FOUND", "Organization not found", 404);
  }

  return c.json(org);
});

export default router;
