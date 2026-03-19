import { eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Message } from "../db/schema";
import { conversations, messages } from "../db/schema";
import { generateId } from "../lib/id";
import { serializeMetadata } from "../lib/serialization";
import type { MessageInput } from "../lib/validation";

/**
 * Append messages to a conversation.
 *
 * Inserts message records and updates the conversation's message and token counts.
 * Returns the inserted message records.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param inputMessages - Messages to append from API request
 * @returns Inserted message records
 */
export async function appendMessages(
  db: DrizzleD1Database,
  conversationId: string,
  inputMessages: MessageInput[],
): Promise<Message[]> {
  const now = Date.now();

  const messageRows = inputMessages.map((m) => ({
    id: generateId(),
    conversationId,
    role: m.role as "system" | "user" | "assistant" | "tool",
    content: m.content,
    metadata: serializeMetadata(m.metadata),
    tokenCount: m.token_count ?? 0,
    createdAt: now,
  }));

  await db.insert(messages).values(messageRows);

  const addedTokens = inputMessages.reduce((sum, m) => sum + (m.token_count ?? 0), 0);

  await updateConversationMessageCount(db, conversationId, inputMessages.length, addedTokens);

  return messageRows;
}

/**
 * Convert API messages to database message rows.
 *
 * Does NOT insert into the database; only prepares the row objects.
 *
 * @param conversationId - Conversation ID
 * @param inputMessages - Messages to convert from API request
 * @returns Message row objects ready for database insertion
 */
export function serializeMessageRows(conversationId: string, inputMessages: MessageInput[]) {
  const now = Date.now();

  return inputMessages.map((m) => ({
    id: generateId(),
    conversationId,
    role: m.role as "system" | "user" | "assistant" | "tool",
    content: m.content,
    metadata: serializeMetadata(m.metadata),
    tokenCount: m.token_count ?? 0,
    createdAt: now,
  }));
}

/**
 * Update a conversation's message and token counts.
 *
 * Uses SQL increment expressions for atomic updates.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param addedCount - Number of messages added
 * @param addedTokens - Number of tokens added
 */
export async function updateConversationMessageCount(
  db: DrizzleD1Database,
  conversationId: string,
  addedCount: number,
  addedTokens: number,
): Promise<void> {
  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + ${addedCount}`,
      tokenCount: sql`${conversations.tokenCount} + ${addedTokens}`,
      updatedAt: Date.now(),
    })
    .where(eq(conversations.id, conversationId));
}
