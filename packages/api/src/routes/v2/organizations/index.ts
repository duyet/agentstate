import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { organizations } from "../../../db/schema";
import { errorResponse, parseJsonBody, validationError } from "../../../lib/helpers";
import { generateId } from "../../../lib/id";
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

  const { clerk_org_id, name } = parsed.data;
  const db = c.get("db");
  const now = Date.now();

  // Check if org already exists
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerk_org_id))
    .get();

  if (existing) {
    // Update name if it has changed
    if (existing.name !== name) {
      await db.update(organizations).set({ name }).where(eq(organizations.id, existing.id));
    }
    return c.json({
      org_id: existing.id,
      clerk_org_id: existing.clerkOrgId,
      name: existing.name,
      created_at: existing.createdAt,
      updated_at: now,
    });
  }

  // Create new org
  const orgId = generateId();
  await db.insert(organizations).values({
    id: orgId,
    clerkOrgId: clerk_org_id,
    name,
    createdAt: now,
  });

  return c.json(
    {
      org_id: orgId,
      clerk_org_id: clerk_org_id,
      name,
      created_at: now,
      updated_at: now,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET /:clerkOrgId — Get organization by Clerk org ID
// ---------------------------------------------------------------------------

router.get("/:clerkOrgId", async (c) => {
  const db = c.get("db");
  const clerkOrgId = c.req.param("clerkOrgId");

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (!org) {
    return errorResponse(c, "NOT_FOUND", "Organization not found", 404);
  }

  return c.json({
    org_id: org.id,
    clerk_org_id: org.clerkOrgId,
    name: org.name,
    created_at: org.createdAt,
    updated_at: null,
  });
});

export default router;
