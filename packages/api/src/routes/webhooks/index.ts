import { Hono } from "hono";
import { notFound, parseJsonBody, validationError } from "../../lib/helpers";
import { CreateWebhookSchema, UpdateWebhookSchema } from "../../lib/validation";
import * as webhooksService from "../../services/webhooks";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

  const db = c.get("db");
  const projectId = c.get("projectId");

  const webhook = await webhooksService.createWebhook(db, projectId, parsed.data);

  return c.json(webhook, 201);
});

// ---------------------------------------------------------------------------
// GET / — List webhooks for project
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const data = await webhooksService.listWebhooks(db, projectId);

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /:id — Get webhook by ID
// ---------------------------------------------------------------------------

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const projectId = c.get("projectId");

  const webhook = await webhooksService.getWebhookById(db, projectId, id);

  if (!webhook) {
    return notFound(c, "Webhook not found");
  }

  return c.json(webhook);
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

  const webhook = await webhooksService.updateWebhook(db, projectId, id, parsed.data);

  if (!webhook) {
    return notFound(c, "Webhook not found");
  }

  return c.json(webhook);
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete webhook
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const projectId = c.get("projectId");

  const deleted = await webhooksService.deleteWebhook(db, projectId, id);

  if (!deleted) {
    return notFound(c, "Webhook not found");
  }

  return c.body(null, 204);
});

export default router;
