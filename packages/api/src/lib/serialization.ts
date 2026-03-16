import type { conversations, messages } from "../db/schema";

// ---------------------------------------------------------------------------
// Metadata serialization helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a metadata object to a JSON string for storage.
 * Returns `null` when the input is `undefined` or `null`.
 */
export function serializeMetadata(
  metadata: Record<string, unknown> | undefined | null,
): string | null {
  return metadata != null ? JSON.stringify(metadata) : null;
}

/**
 * Deserialize a raw JSON string from the database back into a metadata object.
 * Returns `null` when the input is `null`, empty, or unparseable.
 */
export function deserializeMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Row deserialization helpers
// ---------------------------------------------------------------------------

/**
 * Convert a message DB row into the API response shape.
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
 * Convert a conversation DB row into the API response shape.
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
