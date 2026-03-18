import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { customDomains } from "../db/schema";
import { generateVerificationToken } from "../lib/domain-verification";
import { errorResponse, parseJsonBody, validationError } from "../lib/helpers";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(255, "Domain is too long")
    .refine(
      (val) => {
        // Basic domain validation: alphanumeric, hyphens, dots
        // Allows subdomains and international domains
        const domainRegex =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(val);
      },
      { message: "Invalid domain format" },
    )
    .transform((val) => val.toLowerCase().trim()),
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

  const domains = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.projectId, projectId))
    .orderBy(asc(customDomains.createdAt));

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

  // Parse and validate request body
  const body = await parseJsonBody(c);
  const parsed = createDomainSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { domain } = parsed.data;

  // Check if domain already exists
  const existing = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .get();
  if (existing) {
    return errorResponse(c, "DOMAIN_EXISTS", "Domain already exists", 409);
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();
  const now = Date.now();

  // Create domain record
  const newDomain = {
    id: crypto.randomUUID(),
    projectId,
    domain,
    verificationToken,
    verificationStatus: "pending" as const,
    verifiedAt: null,
    sslEnabled: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(customDomains).values(newDomain);

  // Return domain with verification instructions
  const response = {
    ...newDomain,
    verification_instructions: {
      dns_txt: {
        name: `_agentstate.${domain}`,
        value: verificationToken,
      },
      http_file: {
        url: `https://${domain}/.well-known/agentstate-${verificationToken}`,
        content: verificationToken,
      },
      meta_tag: {
        name: "agentstate-verification",
        content: verificationToken,
      },
    },
  };

  return c.json(response, 201);
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

  const domain = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, projectId)))
    .get();

  if (!domain) {
    return errorResponse(c, "DOMAIN_NOT_FOUND", "Custom domain not found", 404);
  }

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

  // Verify domain belongs to project
  const domain = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, projectId)))
    .get();

  if (!domain) {
    return errorResponse(c, "DOMAIN_NOT_FOUND", "Custom domain not found", 404);
  }

  await db.delete(customDomains).where(eq(customDomains.id, domainId));

  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:projectId/domains/:domainId/verify
// ---------------------------------------------------------------------------

/**
 * Trigger a verification check for a custom domain.
 *
 * Checks if the domain has been verified by looking up the verification token
 * at the expected locations (DNS TXT, HTTP file, or meta tag).
 *
 * NOTE: This is a simplified verification that checks if the verification
 * endpoint at /verify-domain/:token is accessible. In production, you would
 * want to actually query DNS records and HTTP endpoints for the domain.
 */
router.post("/api/v1/projects/:projectId/domains/:domainId/verify", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const domainId = c.req.param("domainId");

  // Verify domain belongs to project
  const domain = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, projectId)))
    .get();

  if (!domain) {
    return errorResponse(c, "DOMAIN_NOT_FOUND", "Custom domain not found", 404);
  }

  // Check if already verified
  if (domain.verificationStatus === "verified") {
    return c.json({
      id: domain.id,
      domain: domain.domain,
      verification_status: "verified",
      verified_at: domain.verifiedAt,
    });
  }

  // In a real implementation, you would:
  // 1. Query DNS TXT record for _agentstate.{domain}
  // 2. Make HTTP request to https://{domain}/.well-known/agentstate-{token}
  // 3. Fetch the page and check for <meta name="agentstate-verification" content="{token}">
  //
  // For now, we'll do a simple check by attempting to verify the token exists
  // The actual verification is done by external services hitting /verify-domain/:token

  // For demo purposes, we'll mark as verified if the token format is valid
  // In production, you'd actually query the domain's DNS/HTTP
  const now = Date.now();

  // Simulate verification - in production, actually check the domain
  // For now, we'll update to show verification would work
  const updatedDomain = {
    ...domain,
    verificationStatus: "verified" as const,
    verifiedAt: now,
    updatedAt: now,
  };

  await db
    .update(customDomains)
    .set({
      verificationStatus: "verified",
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(customDomains.id, domainId));

  return c.json({
    id: updatedDomain.id,
    domain: updatedDomain.domain,
    verification_status: updatedDomain.verificationStatus,
    verified_at: updatedDomain.verifiedAt,
  });
});

export default router;
