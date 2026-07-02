import { createExecutionContext, env, SELF, waitOnExecutionContext } from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { apiKeyAuth } from "../src/middleware/auth";
import { dbMiddleware } from "../src/middleware/db";
import crudRouter from "../src/routes/v2/conversations/crud";
import messagesRouter from "../src/routes/v2/conversations/messages";
import type { Bindings, Variables } from "../src/types";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// v2/conversations is not currently mounted in src/index.ts (see
// docs/knowledge/core-memory.md), so it can't be exercised via SELF.fetch.
// Build a standalone app that wires the same middleware chain production
// mounts (apiKeyAuth -> requireScope -> handler) so the scope-enforcement
// and response-contract fixes on crud.ts / messages.ts are covered.
// ---------------------------------------------------------------------------

type App = Hono<{ Bindings: Bindings; Variables: Variables }>;

function buildApp(): App {
  const app: App = new Hono();
  app.use("*", dbMiddleware);
  app.use("*", apiKeyAuth);
  app.route("/", messagesRouter);
  app.route("/", crudRouter);
  return app;
}

async function request(app: App, path: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await app.fetch(new Request(`http://localhost${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

interface Conversation {
  id: string;
  project_id: string;
  message_count: number;
}

interface ListResponse<T> {
  data: T[];
  pagination: { limit: number; next_cursor: string | null; total?: number };
}

function bearer(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function createScopedKey(scopes?: string[]): Promise<string> {
  const res = await SELF.fetch(`http://localhost/api/projects/${TEST_PROJECT_ID}/keys`, {
    method: "POST",
    headers: authHeaders(), // full-access seeded key
    body: JSON.stringify({ name: "v2-conv-scope-test", ...(scopes ? { scopes } : {}) }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { key: string };
  return body.key;
}

async function createConversation(app: App): Promise<Conversation> {
  const fullAccess = await createScopedKey();
  const res = await request(app, "/", {
    method: "POST",
    headers: bearer(fullAccess),
    body: JSON.stringify({ title: "seed convo" }),
  });
  return res.json<Conversation>();
}

describe("v2 conversations — scope enforcement", () => {
  const app = buildApp();

  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  describe("POST / — create conversation", () => {
    it("rejects a key without conversations:write with 403", async () => {
      const readOnly = await createScopedKey(["conversations:read"]);
      const res = await request(app, "/", {
        method: "POST",
        headers: bearer(readOnly),
        body: JSON.stringify({ title: "should fail" }),
      });
      expect(res.status).toBe(403);
      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("allows a key with conversations:write", async () => {
      const writer = await createScopedKey(["conversations:write"]);
      const res = await request(app, "/", {
        method: "POST",
        headers: bearer(writer),
        body: JSON.stringify({ title: "ok" }),
      });
      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /:id — update conversation", () => {
    it("rejects a key without conversations:write with 403", async () => {
      const created = await createConversation(app);
      const readOnly = await createScopedKey(["conversations:read"]);

      const res = await request(app, `/${created.id}`, {
        method: "PATCH",
        headers: bearer(readOnly),
        body: JSON.stringify({ title: "nope" }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /:id — delete conversation", () => {
    it("rejects a key without conversations:write with 403", async () => {
      const created = await createConversation(app);
      const readOnly = await createScopedKey(["conversations:read"]);

      const res = await request(app, `/${created.id}`, {
        method: "DELETE",
        headers: bearer(readOnly),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET / and GET /:id — read scope", () => {
    it("rejects a key without conversations:read with 403", async () => {
      const writeOnly = await createScopedKey(["conversations:write"]);
      const res = await request(app, "/", { headers: bearer(writeOnly) });
      expect(res.status).toBe(403);
    });

    it("allows a key with conversations:read", async () => {
      const reader = await createScopedKey(["conversations:read"]);
      const res = await request(app, "/", { headers: bearer(reader) });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /:id/messages — append messages", () => {
    it("rejects a key without conversations:write with 403", async () => {
      const created = await createConversation(app);
      const readOnly = await createScopedKey(["conversations:read"]);

      const res = await request(app, `/${created.id}/messages`, {
        method: "POST",
        headers: bearer(readOnly),
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      });
      expect(res.status).toBe(403);
    });

    it("returns 201 with the created messages as JSON body (matches V1 contract)", async () => {
      const created = await createConversation(app);
      const writer = await createScopedKey(["conversations:write"]);

      const res = await request(app, `/${created.id}/messages`, {
        method: "POST",
        headers: bearer(writer),
        body: JSON.stringify({
          messages: [{ role: "user", content: "Appended message", token_count: 8 }],
        }),
      });
      expect(res.status).toBe(201);

      const body = await res.json<{ messages: Array<{ id: string; content: string }> }>();
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].content).toBe("Appended message");
    });

    it("rejects a key without conversations:read for GET messages with 403", async () => {
      const created = await createConversation(app);
      const writeOnly = await createScopedKey(["conversations:write"]);

      const res = await request(app, `/${created.id}/messages`, { headers: bearer(writeOnly) });
      expect(res.status).toBe(403);
    });
  });

  describe("GET / — pagination reflects the requested limit", () => {
    it("echoes the requested limit, not the row count", async () => {
      const writer = await createScopedKey(["conversations:write", "conversations:read"]);

      // Seed 3 conversations, request a page of 2.
      for (let i = 0; i < 3; i++) {
        await request(app, "/", {
          method: "POST",
          headers: bearer(writer),
          body: JSON.stringify({ title: `convo-${i}` }),
        });
      }

      const res = await request(app, "/?limit=2", { headers: bearer(writer) });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Conversation>>();
      // Fewer rows than the requested limit can come back depending on seed
      // state, but pagination.limit must always echo the requested value.
      expect(body.pagination.limit).toBe(2);
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it("reflects a different requested limit than the actual row count", async () => {
      const writer = await createScopedKey(["conversations:write", "conversations:read"]);
      // Seed exactly 1 conversation but request a page of 10 — the row count
      // (1) must not leak into pagination.limit (must stay 10).
      await request(app, "/", {
        method: "POST",
        headers: bearer(writer),
        body: JSON.stringify({}),
      });

      const res = await request(app, "/?limit=10", { headers: bearer(writer) });
      const body = await res.json<ListResponse<Conversation>>();

      expect(body.data.length).toBe(1);
      expect(body.pagination.limit).toBe(10);
    });
  });
});
