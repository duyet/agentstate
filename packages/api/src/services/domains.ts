// ---------------------------------------------------------------------------
// Domains service — Business logic for custom domain management
// ---------------------------------------------------------------------------

import { and, asc, eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { CustomDomain } from "../db/schema";
import { customDomains } from "../db/schema";
import {
  checkDomainVerification,
  generateVerificationToken,
  isValidVerificationToken,
} from "../lib/domain-verification";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Domain name regex for validation */
const DOMAIN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Max domain name length */
const MAX_DOMAIN_LENGTH = 255;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainWithVerificationInstructions extends CustomDomain {
  verification_instructions: {
    dns_txt: { name: string; value: string };
    http_file: { url: string; content: string };
    meta_tag: { name: string; content: string };
  };
}

export interface VerificationResult {
  id: string;
  domain: string;
  verification_status: "pending" | "verified" | "failed";
  verified_at: number | null;
}

export interface ValidationError {
  code: "INVALID_DOMAIN" | "DOMAIN_EXISTS" | "DOMAIN_NOT_FOUND";
  message: string;
}

// ---------------------------------------------------------------------------
// Domain Validation
// ---------------------------------------------------------------------------

/**
 * Validate a domain name format.
 *
 * @param domain - The domain to validate
 * @returns true if valid, false otherwise
 */
export function isValidDomainName(domain: string): boolean {
  if (domain.length === 0 || domain.length > MAX_DOMAIN_LENGTH) {
    return false;
  }
  return DOMAIN_REGEX.test(domain);
}

/**
 * Normalize a domain name (lowercase and trim).
 *
 * @param domain - The domain to normalize
 * @returns Normalized domain name
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim();
}

/**
 * Validate domain and return normalized version or error.
 *
 * @param domain - The domain to validate and normalize
 * @returns Normalized domain or validation error
 */
export function validateAndNormalizeDomain(domain: string):
  | {
      success: true;
      domain: string;
    }
  | {
      success: false;
      error: ValidationError;
    } {
  if (domain.length === 0) {
    return { success: false, error: { code: "INVALID_DOMAIN", message: "Domain is required" } };
  }

  if (domain.length > MAX_DOMAIN_LENGTH) {
    return { success: false, error: { code: "INVALID_DOMAIN", message: "Domain is too long" } };
  }

  const normalized = normalizeDomain(domain);

  if (!isValidDomainName(normalized)) {
    return { success: false, error: { code: "INVALID_DOMAIN", message: "Invalid domain format" } };
  }

  return { success: true, domain: normalized };
}

// ---------------------------------------------------------------------------
// Domain CRUD Operations
// ---------------------------------------------------------------------------

/**
 * List all custom domains for a project.
 *
 * @param db - Database instance
 * @param projectId - Project ID
 * @returns Array of custom domains
 */
export async function listDomains(
  db: DrizzleD1Database,
  projectId: string,
): Promise<CustomDomain[]> {
  return db
    .select()
    .from(customDomains)
    .where(eq(customDomains.projectId, projectId))
    .orderBy(asc(customDomains.createdAt));
}

/**
 * Get a domain by ID and project ID.
 *
 * @param db - Database instance
 * @param domainId - Domain ID
 * @param projectId - Project ID (for authorization)
 * @returns Domain record or null
 */
export async function getDomain(
  db: DrizzleD1Database,
  domainId: string,
  projectId: string,
): Promise<CustomDomain | null> {
  const result = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, domainId), eq(customDomains.projectId, projectId)))
    .get();

  return result ?? null;
}

/**
 * Get a domain by domain name.
 *
 * @param db - Database instance
 * @param domain - Domain name
 * @returns Domain record or null
 */
export async function getDomainByName(
  db: DrizzleD1Database,
  domain: string,
): Promise<CustomDomain | null> {
  const result = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .get();

  return result ?? null;
}

/**
 * Create a new custom domain for a project.
 *
 * Generates a verification token and returns the domain record with
 * verification instructions.
 *
 * @param db - Database instance
 * @param projectId - Project ID
 * @param domain - Domain name (will be normalized)
 * @returns Domain with verification instructions
 * @throws Error if domain already exists
 */
export async function createDomain(
  db: DrizzleD1Database,
  projectId: string,
  domain: string,
): Promise<DomainWithVerificationInstructions> {
  const normalized = normalizeDomain(domain);

  // Check if domain already exists
  const existing = await getDomainByName(db, normalized);
  if (existing) {
    throw new Error("DOMAIN_EXISTS");
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();
  const now = Date.now();

  // Create domain record
  const newDomain = {
    id: crypto.randomUUID(),
    projectId,
    domain: normalized,
    verificationToken,
    verificationStatus: "pending" as const,
    verifiedAt: null,
    sslEnabled: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(customDomains).values(newDomain);

  // Return with verification instructions
  return {
    ...newDomain,
    verification_instructions: {
      dns_txt: {
        name: `_agentstate.${normalized}`,
        value: verificationToken,
      },
      http_file: {
        url: `https://${normalized}/.well-known/agentstate-${verificationToken}`,
        content: verificationToken,
      },
      meta_tag: {
        name: "agentstate-verification",
        content: verificationToken,
      },
    },
  };
}

/**
 * Delete a custom domain.
 *
 * @param db - Database instance
 * @param domainId - Domain ID
 * @param projectId - Project ID (for authorization)
 * @throws Error if domain not found
 */
export async function deleteDomain(
  db: DrizzleD1Database,
  domainId: string,
  projectId: string,
): Promise<void> {
  const domain = await getDomain(db, domainId, projectId);

  if (!domain) {
    throw new Error("DOMAIN_NOT_FOUND");
  }

  await db.delete(customDomains).where(eq(customDomains.id, domainId));
}

// ---------------------------------------------------------------------------
// Domain Verification
// ---------------------------------------------------------------------------

/**
 * Build verification result object.
 *
 * @param domain - Domain record
 * @returns Verification result
 */
export function buildVerificationResult(domain: CustomDomain): VerificationResult {
  return {
    id: domain.id,
    domain: domain.domain,
    verification_status: domain.verificationStatus,
    verified_at: domain.verifiedAt,
  };
}

/**
 * Verify a custom domain.
 *
 * This is a simplified implementation that marks domains as verified
 * for demonstration. In production, you would:
 * 1. Query DNS TXT record for _agentstate.{domain}
 * 2. Make HTTP request to https://{domain}/.well-known/agentstate-{token}
 * 3. Fetch the page and check for meta tag
 *
 * @param db - Database instance
 * @param domainId - Domain ID
 * @param projectId - Project ID (for authorization)
 * @returns Verification result
 * @throws Error if domain not found
 */
export async function verifyDomain(
  db: DrizzleD1Database,
  domainId: string,
  projectId: string,
): Promise<VerificationResult> {
  const domain = await getDomain(db, domainId, projectId);

  if (!domain) {
    throw new Error("DOMAIN_NOT_FOUND");
  }

  // If already verified, return current state
  if (domain.verificationStatus === "verified") {
    return buildVerificationResult(domain);
  }

  // Run all three verification methods in parallel (DNS TXT, HTTP file, meta tag)
  const { verified } = await checkDomainVerification(domain.domain, domain.verificationToken);
  const now = Date.now();
  const newStatus = verified ? "verified" : "failed";

  // Only update if not concurrently verified by another request
  await db
    .update(customDomains)
    .set({
      verificationStatus: newStatus,
      verifiedAt: verified ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(customDomains.id, domainId),
        inArray(customDomains.verificationStatus, ["pending", "failed"]),
      ),
    );

  // Re-query to return the actual persisted state
  const fresh = await getDomain(db, domainId, projectId);
  if (!fresh) {
    throw new Error("DOMAIN_NOT_FOUND");
  }
  return buildVerificationResult(fresh);
}

/**
 * Check if a verification token is valid format.
 *
 * @param token - Token to validate
 * @returns true if valid format
 */
export function isValidTokenFormat(token: string): boolean {
  return isValidVerificationToken(token);
}
