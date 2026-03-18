import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../db/schema";
import { loadConversation, notFound } from "../lib/helpers";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { generateFollowUps, generateTitle, generateTitleAndFollowUps } from "../services/ai";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// POST /:id/generate-title — first 20 messages are enough for title context
router.post("/:id/generate-title", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(20);

  const title = await generateTitle(
    c.env.AI,
    msgs.map((m) => ({ role: m.role, content: m.content })),
  );

  await db
    .update(conversations)
    .set({ title, updatedAt: Date.now() })
    .where(eq(conversations.id, id));

  return c.json({ title });
});

// POST /:id/follow-ups — last 20 messages are most relevant for suggestions
router.post("/:id/follow-ups", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  // Reverse to chronological order for the AI
  msgs.reverse();

  const questions = await generateFollowUps(
    c.env.AI,
    msgs.map((m) => ({ role: m.role, content: m.content })),
  );

  return c.json({ questions });
});

// POST /:id/generate-all — batch generate title and follow-ups in one call
router.post("/:id/generate-all", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  // Get messages — use last 20 for follow-up relevance (includes title context)
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(20);

  const { title, followUps } = await generateTitleAndFollowUps(
    c.env.AI,
    msgs.map((m) => ({ role: m.role, content: m.content })),
  );

  // Update title in database
  await db
    .update(conversations)
    .set({ title, updatedAt: Date.now() })
    .where(eq(conversations.id, id));

  return c.json({ title, follow_ups: followUps });
});

export default router;
