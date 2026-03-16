import type { conversations, messages } from "../db/schema";

/**
 * Serialize a metadata object to a JSON string for storage.
 * Returns null if metadata is undefined or null.
 */
export function serializeMetadata(
  metadata: Record<string, unknown> | undefined | null,
): string | null {
  if (metadata === undefined || metadata === null) return null;
  return JSON.stringify(metadata);
}

/**
 * Deserialize a JSON metadata string back to an object.
 * Returns null if the input is null or parsing fails.
 */
export function deserializeMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Convert a message DB row to the API response shape (snake_case).
 */
export function deserializeMessage(row: typeof messages.$inferSelect) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    metadata: deserializeMetadata(row.metadata),
    token_count: row.tokenCount,
    created_at: row.createdAt,
  };
}

/**
 * Convert a conversation DB row to the API response shape (snake_case).
 */
export function deserializeConversationFull(row: typeof conversations.$inferSelect) {
  return {
    id: row.id,
    project_id: row.projectId,
    external_id: row.externalId,
    title: row.title,
    metadata: deserializeMetadata(row.metadata),
    message_count: row.messageCount,
    token_count: row.tokenCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
