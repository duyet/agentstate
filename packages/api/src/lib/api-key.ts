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
      // null = full access (legacy/unscoped, `scopes` omitted entirely). An
      // explicit list — including an empty one — is persisted as-is: [] means
      // "no permissions", never "no restrictions". Only `undefined` maps to
      // null; do not conflate it with an explicit empty array.
      scopes: scopes === undefined ? null : JSON.stringify(scopes),
      createdAt: now,
    },
    prefix,
    now,
  };
}
