import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { conversations } from "../../../db/schema";
import { deserializeConversationFull } from "../../../lib/serialization";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /by-external-id/:eid — Lookup by external ID
// ---------------------------------------------------------------------------

router.get("/by-external-id/:eid", async (c) => {
  const eid = c.req.param("eid");
  const db = c.get("db");
  const projectId = c.get("projectId");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.externalId, eid)))
    .limit(1);

  if (!conversation) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  // V2: messages not included by default
  return c.json(deserializeConversationFull(conversation));
});

export default router;
