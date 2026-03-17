import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversationTags, messages } from "../../db/schema";
import { loadConversation, notFound } from "../../lib/helpers";
import type { Bindings, Variables } from "../../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /:id/analytics — Conversation-level analytics
// ---------------------------------------------------------------------------

app.get("/:id/analytics", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");

  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  // Fetch tags and role breakdown in parallel — both are independent reads
  const [tagRows, roleRows] = await Promise.all([
    db
      .select({ tag: conversationTags.tag })
      .from(conversationTags)
      .where(eq(conversationTags.conversationId, id)),
    db
      .select({
        role: messages.role,
        count: sql<number>`COUNT(*)`,
        tokens: sql<number>`COALESCE(SUM(${messages.tokenCount}), 0)`,
      })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .groupBy(messages.role),
  ]);

  const tags = tagRows.map((r) => r.tag);

  const messagesByRole: Record<string, { count: number; tokens: number }> = Object.fromEntries(
    roleRows.map((r) => [r.role, { count: r.count, tokens: r.tokens }]),
  );

  // Duration = updatedAt - createdAt (milliseconds)
  const durationMs = conversation.updatedAt - conversation.createdAt;

  return c.json({
    conversation_id: conversation.id,
    title: conversation.title,
    message_count: conversation.messageCount,
    token_count: conversation.tokenCount,
    tags,
    duration_ms: durationMs,
    messages_by_role: messagesByRole,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  });
});

export default app;
