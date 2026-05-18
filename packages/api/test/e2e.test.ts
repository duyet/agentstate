import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject } from "./setup";

interface E2EMessage {
  role: string;
  content: string;
}

interface CreatedConversation {
  id: string;
  messages: E2EMessage[];
}

interface ConversationWithMessages extends CreatedConversation {
  message_count: number;
}

interface TagsResponse {
  data: { tags: string[] };
}

describe("API E2E smoke", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("creates, updates, reads, tags, and deletes a conversation through Worker routes", async () => {
    const headers = authHeaders();

    const healthRes = await SELF.fetch("http://localhost/api");
    expect(healthRes.status).toBe(200);
    await expect(healthRes.json()).resolves.toMatchObject({ name: "agentstate", status: "ok" });

    const createRes = await SELF.fetch("http://localhost/api/v1/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        external_id: `e2e-${Date.now()}`,
        messages: [{ role: "user", content: "Start the smoke test" }],
        metadata: { source: "ci-e2e" },
      }),
    });
    expect(createRes.status).toBe(201);

    const created = await createRes.json<CreatedConversation>();
    expect(created.id).toBeTruthy();
    expect(created.messages).toHaveLength(1);

    const appendRes = await SELF.fetch(
      `http://localhost/api/v1/conversations/${created.id}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [{ role: "assistant", content: "Smoke test reply" }],
        }),
      },
    );
    expect(appendRes.status).toBe(201);

    const conversationRes = await SELF.fetch(
      `http://localhost/api/v1/conversations/${created.id}`,
      { headers },
    );
    expect(conversationRes.status).toBe(200);

    const conversation = await conversationRes.json<ConversationWithMessages>();
    expect(conversation.id).toBe(created.id);
    expect(conversation.message_count).toBe(2);
    expect(conversation.messages.map((message) => message.role)).toEqual(["user", "assistant"]);

    const tagRes = await SELF.fetch(`http://localhost/api/v1/conversations/${created.id}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags: ["e2e-smoke"] }),
    });
    expect(tagRes.status).toBe(201);

    const tagsRes = await SELF.fetch("http://localhost/api/v1/tags", { headers });
    expect(tagsRes.status).toBe(200);
    const tagsBody = await tagsRes.json<TagsResponse>();
    expect(tagsBody.data.tags).toContain("e2e-smoke");

    const deleteRes = await SELF.fetch(`http://localhost/api/v1/conversations/${created.id}`, {
      method: "DELETE",
      headers,
    });
    expect(deleteRes.status).toBe(204);

    const missingRes = await SELF.fetch(`http://localhost/api/v1/conversations/${created.id}`, {
      headers,
    });
    expect(missingRes.status).toBe(404);
  });
});
