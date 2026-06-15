import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiKeys, organizations, projects } from "../../../db/schema";
import { buildApiKey } from "../../../lib/api-key";
import { type AppContext, notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { CreateApiKeySchema } from "../../../lib/validation";
import type { Bindings, Variables } from "../../../types";
import crudRouter from "./crud";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Resolve the session Clerk org id to the internal org id.
async function resolveSessionOrgId(c: AppContext): Promise<string | null> {
  const db = c.get("db");
  const clerkOrgId = c.get("orgId");
  if (!clerkOrgId) return null;
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);
  return org?.id ?? null;
}

// Mount CRUD router
router.route("/", crudRouter);

// ---------------------------------------------------------------------------
// POST /:id/keys — Generate new API key (org-scoped)
// ---------------------------------------------------------------------------

router.post("/:id/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  // Verify the project exists AND belongs to the authenticated org.
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  const sessionInternalOrgId = await resolveSessionOrgId(c);

  if (!project || !sessionInternalOrgId || project.orgId !== sessionInternalOrgId) {
    return notFound(c, "Project not found");
  }

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const key = await buildApiKey(projectId, parsed.data.name);
  await db.insert(apiKeys).values(key.values);

  return c.json(
    {
      id: key.id,
      name: parsed.data.name,
      key_prefix: key.prefix,
      key: key.rawKey,
      created_at: key.now,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// DELETE /:id/keys/:keyId — Revoke API key (org-scoped)
// ---------------------------------------------------------------------------

router.delete("/:id/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const keyId = c.req.param("keyId");

  // Verify the project belongs to the authenticated org before revoking.
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  const sessionInternalOrgId = await resolveSessionOrgId(c);
  if (!project || !sessionInternalOrgId || project.orgId !== sessionInternalOrgId) {
    return notFound(c, "Project not found");
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default router;
