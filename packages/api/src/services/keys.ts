// ---------------------------------------------------------------------------
// Keys service — Business logic for API key management
// ---------------------------------------------------------------------------

import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { apiKeys } from "../db/schema";
import { buildApiKey } from "../lib/api-key";
import { parseScopesJson } from "../lib/scopes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyListItem {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  /** Granted scopes, or null for a full-access (legacy/unscoped) key. */
  scopes: string[] | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface ApiKeyWithSecret extends ApiKeyListItem {
  key: string;
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new API key for a project.
 * Returns the key with the raw secret (only shown on creation).
 */
export async function createApiKey(
  db: DrizzleD1Database,
  projectId: string,
  name: string,
  scopes?: string[],
): Promise<ApiKeyWithSecret> {
  const key = await buildApiKey(projectId, name, scopes);
  await db.insert(apiKeys).values(key.values);

  return {
    id: key.id,
    project_id: projectId,
    name,
    key_prefix: key.prefix,
    key: key.rawKey,
    // Mirror buildApiKey's null/[] distinction: only an omitted `scopes`
    // (undefined) means full access; an explicit [] means no permissions.
    scopes: scopes === undefined ? null : scopes,
    created_at: key.now,
    last_used_at: null,
    revoked_at: null,
  };
}

/**
 * List API keys for a project.
 * Raw keys are never included in list responses.
 */
export async function listApiKeys(
  db: DrizzleD1Database,
  projectId: string,
): Promise<ApiKeyListItem[]> {
  const keys = await db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId));

  return keys.map((k) => toApiKeyListItem(k));
}

/**
 * Revoke an API key by ID and project.
 * Returns the revoked key's hash (so callers can invalidate the auth cache),
 * or null if the key was not found.
 */
export async function revokeApiKey(
  db: DrizzleD1Database,
  projectId: string,
  keyId: string,
): Promise<string | null> {
  // Verify the key exists and belongs to the project
  const [existing] = await db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  // Soft delete by setting revokedAt
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return existing.keyHash;
}

// ---------------------------------------------------------------------------
// Response Helpers
// ---------------------------------------------------------------------------

/**
 * Convert database row to API response format (without raw key).
 */
function toApiKeyListItem(row: typeof apiKeys.$inferSelect): ApiKeyListItem {
  return {
    id: row.id,
    project_id: row.projectId,
    name: row.name,
    key_prefix: row.keyPrefix,
    scopes: row.scopes ? parseScopesJson(row.scopes) : null,
    created_at: row.createdAt,
    last_used_at: row.lastUsedAt,
    revoked_at: row.revokedAt,
  };
}
