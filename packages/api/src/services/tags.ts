// ---------------------------------------------------------------------------
// Tags service — Business logic for conversation tag management
// ---------------------------------------------------------------------------

import { and, eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, conversationTags } from "../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagListResult {
  tags: string[];
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Check if a conversation belongs to the authenticated project.
 * Uses count(*) for efficiency (returns only count, not full row).
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID to check
 * @param projectId - Project ID to verify ownership
 * @returns true if conversation belongs to project, false otherwise
 */
export async function conversationBelongsToProject(
  db: DrizzleD1Database,
  conversationId: string,
  projectId: string,
): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.projectId, projectId)));
  return (result[0]?.count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Tag Queries
// ---------------------------------------------------------------------------

/**
 * List all unique tags for a project.
 *
 * Joins with conversations to scope tags to the current project.
 *
 * @param db - Database instance
 * @param projectId - Project ID
 * @returns Array of unique tag names
 */
export async function listProjectTags(db: DrizzleD1Database, projectId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tag: conversationTags.tag })
    .from(conversationTags)
    .innerJoin(conversations, eq(conversations.id, conversationTags.conversationId))
    .where(eq(conversations.projectId, projectId))
    .orderBy(conversationTags.tag);

  return rows.map((r) => r.tag);
}

/**
 * List all tags for a specific conversation.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @returns Array of tag names
 */
export async function listConversationTags(
  db: DrizzleD1Database,
  conversationId: string,
): Promise<string[]> {
  // PERF: Select only tag field (only need tag name)
  const rows = await db
    .select({ tag: conversationTags.tag })
    .from(conversationTags)
    .where(eq(conversationTags.conversationId, conversationId))
    .orderBy(conversationTags.tag);

  return rows.map((r) => r.tag);
}

// ---------------------------------------------------------------------------
// Tag Mutations
// ---------------------------------------------------------------------------

/**
 * Add tags to a conversation.
 *
 * Uses INSERT OR IGNORE semantics to skip duplicates that already exist.
 * Returns the full tag list after the operation (authoritative state).
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param tags - Array of tag names to add
 * @returns Full list of tags for the conversation after adding
 */
export async function addTagsToConversation(
  db: DrizzleD1Database,
  conversationId: string,
  tags: string[],
): Promise<string[]> {
  const now = Date.now();

  // Deduplicate within the request to avoid duplicate insert attempts
  const uniqueTags = [...new Set(tags)];

  const rows = uniqueTags.map((tag) => ({
    id: crypto.randomUUID(),
    conversationId,
    tag,
    createdAt: now,
  }));

  // INSERT OR IGNORE semantics: skip duplicates that already exist per the
  // unique index on (conversation_id, tag). Drizzle exposes this via onConflictDoNothing.
  await db.insert(conversationTags).values(rows).onConflictDoNothing();

  // Re-fetch the full tag list for this conversation so the response is
  // authoritative (some tags may have already existed and been skipped above).
  return listConversationTags(db, conversationId);
}

/**
 * Remove a tag from a conversation.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param tag - Tag name to remove
 */
export async function removeTagFromConversation(
  db: DrizzleD1Database,
  conversationId: string,
  tag: string,
): Promise<void> {
  await db
    .delete(conversationTags)
    .where(and(eq(conversationTags.conversationId, conversationId), eq(conversationTags.tag, tag)));
}
