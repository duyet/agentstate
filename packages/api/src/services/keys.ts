// ---------------------------------------------------------------------------
// Keys service — Business logic for API key management
// ---------------------------------------------------------------------------

import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { apiKeys } from "../db/schema";
import { buildApiKey } from "../lib/api-key";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyListItem {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
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
): Promise<ApiKeyWithSecret> {
  const key = await buildApiKey(projectId, name);
  await db.insert(apiKeys).values(key.values);

  return {
    id: key.id,
    project_id: projectId,
    name,
    key_prefix: key.prefix,
    key: key.rawKey,
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
 * Returns true if revoked, false if not found.
 */
export async function revokeApiKey(
  db: DrizzleD1Database,
  projectId: string,
  keyId: string,
): Promise<boolean> {
  // Verify the key exists and belongs to the project
  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return false;
  }

  // Soft delete by setting revokedAt
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return true;
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
    created_at: row.createdAt,
    last_used_at: row.lastUsedAt,
    revoked_at: row.revokedAt,
  };
}
