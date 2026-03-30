import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, conversationTags, messages } from "../db/schema";
import { deserializeMetadata } from "../lib/serialization";

// ---------------------------------------------------------------------------
// Bulk Delete
// ---------------------------------------------------------------------------

/**
 * Delete multiple conversations and their messages.
 * Only deletes conversations that belong to the specified project.
 *
 * @param db - Database instance
 * @param projectId - Project ID to scope deletions
 * @param ids - Conversation IDs to delete
 * @returns Number of conversations deleted
 */
export async function bulkDeleteConversations(
  db: DrizzleD1Database,
  projectId: string,
  ids: string[],
): Promise<number> {
  // Only delete conversations that belong to this project
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)));

  const existingIds = existing.map((r) => r.id);

  if (existingIds.length > 0) {
    await db.batch([
      db.delete(conversationTags).where(inArray(conversationTags.conversationId, existingIds)),
      db.delete(messages).where(inArray(messages.conversationId, existingIds)),
      db.delete(conversations).where(inArray(conversations.id, existingIds)),
    ]);
  }

  return existingIds.length;
}

// ---------------------------------------------------------------------------
// Bulk Export
// ---------------------------------------------------------------------------

/** Select only export-relevant conversation fields (~40% payload reduction) */
const CONVERSATION_EXPORT_FIELDS = {
  id: conversations.id,
  project_id: conversations.projectId,
  external_id: conversations.externalId,
  title: conversations.title,
  metadata: conversations.metadata,
  token_count: conversations.tokenCount,
  total_cost_microdollars: conversations.totalCostMicrodollars,
  total_tokens: conversations.totalTokens,
  created_at: conversations.createdAt,
  updated_at: conversations.updatedAt,
} as const;

/** Select only export-relevant message fields (~50% payload reduction) */
const MESSAGE_EXPORT_FIELDS = {
  id: messages.id,
  conversation_id: messages.conversationId,
  role: messages.role,
  content: messages.content,
  metadata: messages.metadata,
  token_count: messages.tokenCount,
  model: messages.model,
  input_tokens: messages.inputTokens,
  output_tokens: messages.outputTokens,
  cost_microdollars: messages.costMicrodollars,
  created_at: messages.createdAt,
} as const;

/**
 * Export conversations with their messages.
 *
 * @param db - Database instance
 * @param projectId - Project ID to scope exports
 * @param ids - Optional conversation IDs to filter (exports all if empty)
 * @returns Exported conversations with messages grouped by conversation
 */
export async function exportConversations(
  db: DrizzleD1Database,
  projectId: string,
  ids: string[] | undefined,
): Promise<Array<{
  id: string;
  project_id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  token_count: number;
  total_cost_microdollars: number;
  total_tokens: number;
  message_count: number;
  created_at: number;
  updated_at: number;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    metadata: Record<string, unknown> | null;
    token_count: number;
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_microdollars: number | null;
    created_at: number;
  }>;
}>> {
  // Batch-fetch all matching conversations in a single query instead of
  // firing one query per ID (N+1 problem).
  const rows =
    ids && ids.length > 0
      ? await db
          .select(CONVERSATION_EXPORT_FIELDS)
          .from(conversations)
          .where(and(eq(conversations.projectId, projectId), inArray(conversations.id, ids)))
      : await db
          .select(CONVERSATION_EXPORT_FIELDS)
          .from(conversations)
          .where(eq(conversations.projectId, projectId))
          .orderBy(desc(conversations.updatedAt))
          .limit(100);

  // Batch-fetch all messages for the returned conversations in a single query
  const convIds = rows.map((r) => r.id);
  const allMsgs =
    convIds.length > 0
      ? await db
          .select(MESSAGE_EXPORT_FIELDS)
          .from(messages)
          .where(inArray(messages.conversationId, convIds))
          .orderBy(asc(messages.createdAt))
      : [];

  // Group messages by conversation ID for O(1) lookup when building response
  const msgsByConv = new Map<string, typeof allMsgs>();
  for (const msg of allMsgs) {
    const list = msgsByConv.get(msg.conversation_id) ?? [];
    list.push(msg);
    msgsByConv.set(msg.conversation_id, list);
  }

  // Build export format inline to avoid deserialize function overhead
  return rows.map((conv) => ({
    id: conv.id,
    project_id: conv.project_id,
    external_id: conv.external_id,
    title: conv.title,
    metadata: deserializeMetadata(conv.metadata),
    token_count: conv.token_count,
    total_cost_microdollars: conv.total_cost_microdollars,
    total_tokens: conv.total_tokens,
    message_count: (msgsByConv.get(conv.id) ?? []).length,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    messages: (msgsByConv.get(conv.id) ?? []).map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: deserializeMetadata(msg.metadata),
      token_count: msg.token_count,
      model: msg.model,
      input_tokens: msg.input_tokens,
      output_tokens: msg.output_tokens,
      cost_microdollars: msg.cost_microdollars,
      created_at: msg.created_at,
    })),
  }));
}
