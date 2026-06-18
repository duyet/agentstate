import { hashApiKey } from "./crypto";
import { generateApiKey, generateId } from "./id";

/**
 * Build a new API key record and return both the raw key and insert values.
 *
 * @returns Object containing the key ID, raw key (for one-time display to user),
 *          database insert values, and convenience fields (prefix, timestamp).
 */
export async function buildApiKey(projectId: string, name: string, scopes?: string[]) {
  const rawKey = generateApiKey();
  const hash = await hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 12);
  const id = generateId();
  const now = Date.now();

  return {
    id,
    rawKey,
    values: {
      id,
      projectId,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      // null = full access (legacy/unscoped); a non-empty list = restricted key.
      scopes: scopes && scopes.length > 0 ? JSON.stringify(scopes) : null,
      createdAt: now,
    },
    prefix,
    now,
  };
}
