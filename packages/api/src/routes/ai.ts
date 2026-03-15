import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { conversations, messages } from "../db/schema";
import { apiKeyAuth } from "../middleware/auth";
import { loadConversation, notFound } from "../lib/helpers";
import { generateTitle, generateFollowUps } from "../services/ai";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use("*", apiKeyAuth);

// POST /:id/generate-title — Generate and persist a conversation title
router.post("/:id/generate-title", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

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

// POST /:id/follow-ups — Suggest follow-up questions
router.post("/:id/follow-ups", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const conversation = await loadConversation(c, id);
  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const questions = await generateFollowUps(
    c.env.AI,
    msgs.map((m) => ({ role: m.role, content: m.content })),
  );

  return c.json({ questions });
});

export default router;
