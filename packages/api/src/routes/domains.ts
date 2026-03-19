import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "../lib/helpers";
import { errorResponse, parseJsonBody, validationError } from "../lib/helpers";
import {
  createDomain,
  deleteDomain,
  getDomain,
  listDomains,
  validateAndNormalizeDomain,
  verifyDomain,
} from "../services/domains";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Handle DOMAIN_NOT_FOUND errors from domain service operations.
 */
function handleDomainError(c: AppContext, e: unknown) {
  if (e instanceof Error && e.message === "DOMAIN_NOT_FOUND") {
    return errorResponse(c, "DOMAIN_NOT_FOUND", "Custom domain not found", 404);
  }
  throw e;
}

// Validation schemas

const createDomainSchema = z.object({
  domain: z.string().min(1).max(255),
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:projectId/domains
// ---------------------------------------------------------------------------

/**
 * List all custom domains for a project.
 */
router.get("/api/v1/projects/:projectId/domains", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const domains = await listDomains(db, projectId);
  return c.json({ data: domains });
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:projectId/domains
// ---------------------------------------------------------------------------

/**
 * Add a custom domain to a project.
 *
 * Generates a verification token and returns instructions for
 * domain ownership verification via DNS TXT record, HTTP file, or meta tag.
 */
router.post("/api/v1/projects/:projectId/domains", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = createDomainSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);

  const validation = validateAndNormalizeDomain(parsed.data.domain);
  if (!validation.success) {
    return errorResponse(c, validation.error.code, validation.error.message, 400);
  }

  try {
    const result = await createDomain(db, projectId, validation.domain);
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "DOMAIN_EXISTS") {
      return errorResponse(c, "DOMAIN_EXISTS", "Domain already exists", 409);
    }
    throw e;
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:projectId/domains/:domainId
// ---------------------------------------------------------------------------

/**
 * Get a specific custom domain.
 */
router.get("/api/v1/projects/:projectId/domains/:domainId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const domainId = c.req.param("domainId");

  const domain = await getDomain(db, domainId, projectId);
  if (!domain) return errorResponse(c, "DOMAIN_NOT_FOUND", "Custom domain not found", 404);

  return c.json(domain);
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/:projectId/domains/:domainId
// ---------------------------------------------------------------------------

/**
 * Delete a custom domain from a project.
 */
router.delete("/api/v1/projects/:projectId/domains/:domainId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const domainId = c.req.param("domainId");

  try {
    await deleteDomain(db, domainId, projectId);
    return c.body(null, 204);
  } catch (e) {
    return handleDomainError(c, e);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:projectId/domains/:domainId/verify
// ---------------------------------------------------------------------------

/**
 * Trigger a verification check for a custom domain.
 *
 * Checks if the domain has been verified by looking up the verification token
 * at the expected locations (DNS TXT, HTTP file, or meta tag).
 */
router.post("/api/v1/projects/:projectId/domains/:domainId/verify", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const domainId = c.req.param("domainId");

  try {
    const result = await verifyDomain(db, domainId, projectId);
    return c.json(result);
  } catch (e) {
    return handleDomainError(c, e);
  }
});

export default router;
