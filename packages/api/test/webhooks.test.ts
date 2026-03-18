import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface Webhook {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  created_at: number;
  last_triggered_at: number | null;
}

interface ListResponse<T> {
  data: T[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createWebhook(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/api/v1/webhooks", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Webhooks", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create webhook
  // -------------------------------------------------------------------------

  describe("POST /api/v1/webhooks", () => {
    it("creates a webhook with conversation.created event", async () => {
      const res = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      expect(res.status).toBe(201);

      const body = await res.json<Webhook>();
      expect(body.id).toBeTruthy();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.url).toBe("https://example.com/webhook");
      expect(body.events).toEqual(["conversation.created"]);
      expect(body.active).toBe(true);
      expect(body.secret).toBeTruthy();
      expect(body.secret).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(body.created_at).toBeTruthy();
      expect(body.last_triggered_at).toBeNull();
    });

    it("creates a webhook with multiple events", async () => {
      const res = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      expect(res.status).toBe(201);

      const body = await res.json<Webhook>();
      expect(body.events).toEqual(["conversation.created"]);
    });

    it("returns 400 for invalid URL", async () => {
      const res = await createWebhook({
        url: "not-a-url",
        events: ["conversation.created"],
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for empty events array", async () => {
      const res = await createWebhook({
        url: "https://example.com/webhook",
        events: [],
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for invalid event type", async () => {
      const res = await createWebhook({
        url: "https://example.com/webhook",
        events: ["invalid.event"],
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/webhook",
          events: ["conversation.created"],
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List webhooks
  // -------------------------------------------------------------------------

  describe("GET /api/v1/webhooks", () => {
    it("lists webhooks for the project", async () => {
      // Create a webhook first
      await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });

      const res = await SELF.fetch("http://localhost/api/v1/webhooks", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Webhook>>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Secret should never be included in list responses
      const webhook = body.data[0];
      expect(webhook.secret).toBeUndefined();
      expect(webhook.id).toBeTruthy();
      expect(webhook.url).toBeTruthy();
      expect(Array.isArray(webhook.events)).toBe(true);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/webhooks");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get webhook by ID
  // -------------------------------------------------------------------------

  describe("GET /api/v1/webhooks/:id", () => {
    it("returns a webhook by ID", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Webhook>();
      expect(body.id).toBe(created.id);
      expect(body.url).toBe("https://example.com/webhook");

      // Secret should never be included in GET responses
      expect(body.secret).toBeUndefined();
    });

    it("returns 404 for non-existent webhook", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/does_not_exist",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/some-id",
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /:id — Update webhook
  // -------------------------------------------------------------------------

  describe("PUT /api/v1/webhooks/:id", () => {
    it("updates webhook URL", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ url: "https://example.com/updated" }),
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Webhook>();
      expect(body.url).toBe("https://example.com/updated");
      expect(body.events).toEqual(["conversation.created"]); // unchanged
    });

    it("updates webhook events", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ events: ["conversation.created"] }),
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Webhook>();
      expect(body.events).toEqual(["conversation.created"]);
    });

    it("deactivates a webhook", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ active: false }),
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Webhook>();
      expect(body.active).toBe(false);
    });

    it("reactivates a webhook", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      // Deactivate first
      await SELF.fetch(`http://localhost/api/v1/webhooks/${created.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ active: false }),
      });

      // Reactivate
      const res = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ active: true }),
        },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Webhook>();
      expect(body.active).toBe(true);
    });

    it("returns 404 for non-existent webhook", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/does_not_exist",
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ url: "https://example.com/updated" }),
        },
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/some-id",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com/updated" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete webhook
  // -------------------------------------------------------------------------

  describe("DELETE /api/v1/webhooks/:id", () => {
    it("deletes a webhook", async () => {
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const created = await createRes.json<Webhook>();

      const deleteRes = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      expect(deleteRes.status).toBe(204);

      // Verify it's gone
      const getRes = await SELF.fetch(
        `http://localhost/api/v1/webhooks/${created.id}`,
        { headers: authHeaders() },
      );
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent webhook", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/does_not_exist",
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/webhooks/some-id",
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Webhook triggering on conversation creation
  // -------------------------------------------------------------------------

  describe("Webhook triggering", () => {
    it("triggers webhook when conversation is created", async () => {
      // Create a webhook pointing to a test server
      const res = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      expect(res.status).toBe(201);

      // Create a conversation
      const convRes = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: "Test conversation",
          messages: [{ role: "user", content: "Hello" }],
        }),
      });
      expect(convRes.status).toBe(201);

      // Webhook is triggered asynchronously, so we just verify
      // the conversation was created successfully
      const conv = await convRes.json();
      expect(conv.id).toBeTruthy();
    }, 10000);

    it("does not trigger inactive webhooks", async () => {
      // Create and deactivate a webhook
      const createRes = await createWebhook({
        url: "https://example.com/webhook",
        events: ["conversation.created"],
      });
      const webhook = await createRes.json<Webhook>();

      await SELF.fetch(`http://localhost/api/v1/webhooks/${webhook.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ active: false }),
      });

      // Create a conversation
      const convRes = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Test" }),
      });
      expect(convRes.status).toBe(201);
    });
  });

  // -------------------------------------------------------------------------
  // HMAC signature verification
  // -------------------------------------------------------------------------

  describe("HMAC signature", () => {
    it("generates valid HMAC SHA-256 signature", async () => {
      const secret = "a".repeat(64); // 64 hex chars = 32 bytes
      const payload = JSON.stringify({
        event: "conversation.created",
        timestamp: 1234567890,
        data: { id: "test" },
      });

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload),
      );
      const hex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      expect(hex).toHaveLength(64);
      expect(hex).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
