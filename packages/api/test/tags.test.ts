import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders } from "./setup";

// ---------------------------------------------------------------------------
// Extra DDL for conversation_tags (not yet in setup.ts migrations)
// ---------------------------------------------------------------------------

const TAGS_DDL = [
  `CREATE TABLE IF NOT EXISTS \`conversation_tags\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`conversation_id\` text NOT NULL,
    \`tag\` text NOT NULL,
    \`created_at\` integer NOT NULL,
    FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS \`conversation_tags_conversation_id_tag_idx\` ON \`conversation_tags\` (\`conversation_id\`,\`tag\`)`,
  `CREATE INDEX IF NOT EXISTS \`conversation_tags_tag_idx\` ON \`conversation_tags\` (\`tag\`)`,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversation(body: Record<string, unknown> = {}) {
  return SELF.fetch("http://localhost/v1/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

interface ConversationWithMessages {
  id: string;
  project_id: string;
  messages: Array<{ id: string; role: string; content: string }>;
}

interface TagsResponse {
  data: { tags: string[] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Tags", () => {
  beforeAll(async () => {
    await applyMigrations();
    for (const stmt of TAGS_DDL) {
      await env.DB.prepare(stmt).run();
    }
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST /v1/conversations/:id/tags — Add tags
  // -------------------------------------------------------------------------

  describe("POST /v1/conversations/:id/tags", () => {
    it("adds tags to a conversation", async () => {
      const createRes = await createConversation({ title: "Tag Test" });
      const conv = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ tags: ["bug", "urgent"] }),
        },
      );
      expect(res.status).toBe(201);

      const body = await res.json<TagsResponse>();
      expect(body.data.tags).toContain("bug");
      expect(body.data.tags).toContain("urgent");
    });

    it("is idempotent — duplicate tags are ignored", async () => {
      const createRes = await createConversation({ title: "Idempotent Tag" });
      const conv = await createRes.json<ConversationWithMessages>();

      // Add tags first time
      await SELF.fetch(`http://localhost/v1/conversations/${conv.id}/tags`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tags: ["feature"] }),
      });

      // Add same tag again plus a new one
      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ tags: ["feature", "enhancement"] }),
        },
      );
      expect(res.status).toBe(201);

      const body = await res.json<TagsResponse>();
      // Should have exactly 2 unique tags, not 3
      expect(body.data.tags).toContain("feature");
      expect(body.data.tags).toContain("enhancement");
      expect(body.data.tags.length).toBe(2);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_conv_id/tags",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ tags: ["test"] }),
        },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 400 when tags array is empty", async () => {
      const createRes = await createConversation({});
      const conv = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ tags: [] }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/any_id/tags",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: ["test"] }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/conversations/:id/tags — List tags for a conversation
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations/:id/tags", () => {
    it("lists tags for a conversation", async () => {
      const createRes = await createConversation({ title: "List Tags" });
      const conv = await createRes.json<ConversationWithMessages>();

      // Add some tags
      await SELF.fetch(`http://localhost/v1/conversations/${conv.id}/tags`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tags: ["alpha", "beta"] }),
      });

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(body.data.tags).toContain("alpha");
      expect(body.data.tags).toContain("beta");
      expect(body.data.tags.length).toBe(2);
    });

    it("returns empty tags for a conversation with no tags", async () => {
      const createRes = await createConversation({ title: "No Tags" });
      const conv = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(body.data.tags).toEqual([]);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_conv_id/tags",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/tags — List all tags for the project
  // -------------------------------------------------------------------------

  describe("GET /v1/tags", () => {
    it("lists all unique tags across conversations in the project", async () => {
      // Create two conversations with overlapping tags
      const res1 = await createConversation({ title: "Tags A" });
      const conv1 = await res1.json<ConversationWithMessages>();
      await SELF.fetch(`http://localhost/v1/conversations/${conv1.id}/tags`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tags: ["shared", "only-a"] }),
      });

      const res2 = await createConversation({ title: "Tags B" });
      const conv2 = await res2.json<ConversationWithMessages>();
      await SELF.fetch(`http://localhost/v1/conversations/${conv2.id}/tags`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tags: ["shared", "only-b"] }),
      });

      const res = await SELF.fetch("http://localhost/v1/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(body.data.tags).toContain("shared");
      expect(body.data.tags).toContain("only-a");
      expect(body.data.tags).toContain("only-b");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/tags");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /v1/conversations/:id/tags/:tag — Remove a tag
  // -------------------------------------------------------------------------

  describe("DELETE /v1/conversations/:id/tags/:tag", () => {
    it("removes a tag from a conversation", async () => {
      const createRes = await createConversation({ title: "Delete Tag" });
      const conv = await createRes.json<ConversationWithMessages>();

      // Add tags
      await SELF.fetch(`http://localhost/v1/conversations/${conv.id}/tags`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tags: ["remove-me", "keep-me"] }),
      });

      // Delete one tag
      const deleteRes = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags/remove-me`,
        { method: "DELETE", headers: authHeaders() },
      );
      expect(deleteRes.status).toBe(204);

      // Verify it was removed
      const listRes = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags`,
        { headers: authHeaders() },
      );
      const body = await listRes.json<TagsResponse>();
      expect(body.data.tags).not.toContain("remove-me");
      expect(body.data.tags).toContain("keep-me");
    });

    it("returns 204 even when tag does not exist (idempotent delete)", async () => {
      const createRes = await createConversation({ title: "Delete Nonexistent" });
      const conv = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/tags/nonexistent-tag`,
        { method: "DELETE", headers: authHeaders() },
      );
      // The route deletes and returns 204 regardless of whether the tag existed
      expect(res.status).toBe(204);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_conv_id/tags/some-tag",
        { method: "DELETE", headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });
});
