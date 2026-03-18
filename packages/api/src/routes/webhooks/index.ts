import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { webhooks } from "../../db/schema";
import { notFound, parseJsonBody, validationError } from "../../lib/helpers";
import { generateId } from "../../lib/id";
import { CreateWebhookSchema, UpdateWebhookSchema } from "../../lib/validation";
import { generateWebhookSecret } from "../../lib/webhook";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse events array from JSON string in database.
 */
function parseEvents(eventsJson: string | null): string[] {
  if (!eventsJson) return [];
  try {
    const parsed = JSON.parse(eventsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize events array to JSON string for database.
 */
function serializeEvents(events: string[]): string {
  return JSON.stringify(events);
}

// ---------------------------------------------------------------------------
// POST / — Create webhook
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const { url, events } = parsed.data;
  const db = c.get("db");
  const projectId = c.get("projectId");
  const now = Date.now();

  const webhookId = generateId();
  const secret = await generateWebhookSecret();

  await db.insert(webhooks).values({
    id: webhookId,
    projectId,
    url,
    events: serializeEvents(events),
    secret,
    active: true,
    createdAt: now,
    lastTriggeredAt: null,
  });

  // Return the secret only on creation — user won't see it again
  return c.json(
    {
      id: webhookId,
      project_id: projectId,
      url,
      events,
      active: true,
      secret,
      created_at: now,
      last_triggered_at: null,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// GET / — List webhooks for project
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.projectId, projectId))
    .orderBy(webhooks.createdAt);

  // Never include the secret in list responses
  return c.json({
    data: rows.map((w) => ({
      id: w.id,
      project_id: w.projectId,
      url: w.url,
      events: parseEvents(w.events),
      active: w.active === true,
      created_at: w.createdAt,
      last_triggered_at: w.lastTriggeredAt ?? null,
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get webhook by ID
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const projectId = c.get("projectId");

  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.projectId, projectId)))
    .limit(1);

  if (!webhook) {
    return notFound(c, "Webhook not found");
  }

  // Never include the secret in GET responses
  return c.json({
    id: webhook.id,
    project_id: webhook.projectId,
    url: webhook.url,
    events: parseEvents(webhook.events),
    active: webhook.active === true,
    created_at: webhook.createdAt,
    last_triggered_at: webhook.lastTriggeredAt ?? null,
  });
});

// ---------------------------------------------------------------------------
// PUT /:id — Update webhook
// ---------------------------------------------------------------------------

router.put("/:id", async (c) => {
  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = UpdateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const id = c.req.param("id");
  const db = c.get("db");
  const projectId = c.get("projectId");

  // Verify webhook exists and belongs to project
  const [existing] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return notFound(c, "Webhook not found");
  }

  const { url, events, active } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (url !== undefined) updates.url = url;
  if (events !== undefined) updates.events = serializeEvents(events);
  if (active !== undefined) updates.active = active;

  await db.update(webhooks).set(updates).where(eq(webhooks.id, id));

  // Build response from updated values
  return c.json({
    id,
    project_id: projectId,
    url: url ?? existing.url,
    events: events !== undefined ? events : parseEvents(existing.events),
    active: active !== undefined ? active : existing.active === true,
    created_at: existing.createdAt,
    last_triggered_at: existing.lastTriggeredAt ?? null,
  });
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete webhook
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const projectId = c.get("projectId");

  // Verify webhook exists and belongs to project
  const [existing] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return notFound(c, "Webhook not found");
  }

  await db.delete(webhooks).where(eq(webhooks.id, id));

  return c.body(null, 204);
});

export default router;
