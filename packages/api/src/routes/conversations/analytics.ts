import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversationTags, messages } from "../../db/schema";
import { loadConversation, notFound } from "../../lib/helpers";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /:id/analytics — Per-conversation analytics
// ---------------------------------------------------------------------------

router.get("/:id/analytics", async (c) => {
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const db = c.get("db");

  // Aggregate messages by role and fetch tags in parallel — both are
  // independent reads that only require the conversation to exist.
  const [roleStats, tagRows] = await Promise.all([
    db
      .select({
        role: messages.role,
        count: sql<number>`COUNT(*)`,
        tokens: sql<number>`COALESCE(SUM(${messages.tokenCount}), 0)`,
      })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .groupBy(messages.role),
    db
      .select({ tag: conversationTags.tag })
      .from(conversationTags)
      .where(eq(conversationTags.conversationId, id)),
  ]);

  // Build messages_by_role map
  const messagesByRole: Record<string, { count: number; tokens: number }> = {};
  for (const row of roleStats) {
    messagesByRole[row.role] = { count: Number(row.count), tokens: Number(row.tokens) };
  }

  return c.json({
    conversation_id: conversation.id,
    title: conversation.title,
    message_count: conversation.messageCount,
    token_count: conversation.tokenCount,
    tags: tagRows.map((t) => t.tag),
    duration_ms: conversation.updatedAt - conversation.createdAt,
    messages_by_role: messagesByRole,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  });
});

export default router;
