import { env, SELF } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  AppendMessagesSchema,
  CreateConversationSchema,
  IngestTraceSchema,
  MAX_MESSAGE_CONTENT_BYTES,
  MAX_MESSAGES_CONTENT_BYTES,
  MAX_MESSAGES_PER_REQUEST,
} from "../src/lib/validation";
import { insertMessageRows, serializeMessageRows } from "../src/services/messages";
import { applyMigrations, authHeaders, seedProject } from "./setup";

const message = (content = "hello") => ({ role: "user" as const, content, token_count: 2 });
type InputMessage = ReturnType<typeof message>;
type ObservationInput = InputMessage & {
  observation_type: "span";
  parent_message_id?: string;
};
interface StoredMessage {
  id: string;
  content: string;
  parent_message_id: string | null;
}
interface ConversationResponse {
  id: string;
  message_count: number;
  messages: StoredMessage[];
}
interface TraceResponse {
  conversation: { id: string; message_count: number; token_count: number };
  observations: StoredMessage[];
}

const create = (messages?: InputMessage[]) =>
  SELF.fetch("http://localhost/api/v1/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages }),
  });
const append = (id: string, messages: InputMessage[]) =>
  SELF.fetch(`http://localhost/api/v1/conversations/${id}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages }),
  });
const observations = (messages: InputMessage[]): ObservationInput[] =>
  messages.map((m) => ({ ...m, observation_type: "span" }));
const ingest = (observations: ObservationInput[]) =>
  SELF.fetch("http://localhost/api/v1/conversations/traces/ingest", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ trace: { title: "Message limits trace" }, observations }),
  });
const store = async (messages?: InputMessage[]) => {
  const response = await SELF.fetch("http://localhost/api/mcp", {
    method: "POST",
    headers: { ...authHeaders(), Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "store_conversation", arguments: { messages } },
    }),
  });
  expect(response.status).toBe(200);
  return response.json<{
    result: { isError?: boolean; content: { text: string }[] };
  }>();
};

// Check both tables: validation must not leave an orphan conversation or partial messages.
const writeSnapshot = () =>
  env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM conversations) AS conversations,
    (SELECT COUNT(*) FROM messages) AS messages,
    (SELECT COALESCE(SUM(message_count), 0) FROM conversations) AS message_count,
    (SELECT COALESCE(SUM(token_count), 0) FROM conversations) AS token_count`).first();
const conversationRow = (id: string) =>
  env.DB.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
const messageCount = (id: string) =>
  env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?").bind(id).first();
const contentBytes = (id: string) =>
  env.DB.prepare(
    "SELECT COUNT(*) AS n, SUM(length(CAST(content AS BLOB))) AS bytes FROM messages WHERE conversation_id = ?",
  )
    .bind(id)
    .first();

const invalidBatches = [
  {
    name: "101 messages",
    messages: Array.from({ length: MAX_MESSAGES_PER_REQUEST + 1 }, () => message()),
  },
  { name: "empty content", messages: [message("")] },
  {
    name: "oversized ASCII content",
    messages: [message("a".repeat(MAX_MESSAGE_CONTENT_BYTES + 1))],
  },
  {
    name: "oversized UTF-8 content",
    messages: [message(`${"é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2)}a`)],
  },
  {
    name: "combined content above 1 MiB",
    messages: [
      ...Array.from({ length: MAX_MESSAGES_CONTENT_BYTES / MAX_MESSAGE_CONTENT_BYTES }, () =>
        message("é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2)),
      ),
      message("a"),
    ],
  },
];

describe("message request limits", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("accepts batches immediately below count and UTF-8 byte limits", () => {
    const batches = [
      Array.from({ length: MAX_MESSAGES_PER_REQUEST - 1 }, () => message()),
      [message(`${"é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2 - 1)}a`)],
      [
        ...Array.from({ length: MAX_MESSAGES_CONTENT_BYTES / MAX_MESSAGE_CONTENT_BYTES - 1 }, () =>
          message("é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2)),
        ),
        message(`${"é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2 - 1)}a`),
      ],
    ];
    for (const messages of batches) {
      expect(CreateConversationSchema.safeParse({ messages }).success).toBe(true);
      expect(AppendMessagesSchema.safeParse({ messages }).success).toBe(true);
      expect(
        IngestTraceSchema.safeParse({ trace: {}, observations: observations(messages) }).success,
      ).toBe(true);
    }
  });

  it("retains omitted/empty-create semantics for REST and MCP, but rejects empty append/trace", async () => {
    for (const messages of [undefined, []]) {
      const response = await create(messages);
      expect(response.status).toBe(201);
      const conversation = await response.json<ConversationResponse>();
      expect(conversation.message_count).toBe(0);
      expect(conversation.messages).toEqual([]);
      expect(await messageCount(conversation.id)).toEqual({ n: 0 });
      const before = await writeSnapshot();
      const row = await conversationRow(conversation.id);
      const appended = await append(conversation.id, []);
      expect(appended.status).toBe(400);
      await appended.json();
      expect(await writeSnapshot()).toEqual(before);
      expect(await conversationRow(conversation.id)).toEqual(row);

      const stored = await store(messages);
      expect(stored.result.isError).not.toBe(true);
      const result = JSON.parse(stored.result.content[0].text) as ConversationResponse;
      expect(result.message_count).toBe(0);
      expect(await messageCount(result.id)).toEqual({ n: 0 });
    }
    const before = await writeSnapshot();
    const response = await ingest([]);
    expect(response.status).toBe(400);
    await response.json();
    expect(await writeSnapshot()).toEqual(before);
  });

  for (const { name, messages } of invalidBatches) {
    it(`rejects ${name} on REST create without writes`, async () => {
      const before = await writeSnapshot();
      const response = await create(messages);
      expect(response.status).toBe(400);
      const body = await response.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message.length).toBeGreaterThan(0);
      expect(await writeSnapshot()).toEqual(before);
    });

    it(`rejects ${name} on append without writes or counter changes`, async () => {
      const response = await create([message()]);
      expect(response.status).toBe(201);
      const conversation = await response.json<ConversationResponse>();
      const before = await writeSnapshot();
      const row = await conversationRow(conversation.id);
      const appended = await append(conversation.id, messages);
      expect(appended.status).toBe(400);
      expect((await appended.json<{ error: { code: string } }>()).error.code).toBe("BAD_REQUEST");
      expect(await writeSnapshot()).toEqual(before);
      expect(await conversationRow(conversation.id)).toEqual(row);
      expect(await messageCount(conversation.id)).toEqual({ n: 1 });
    });

    it(`rejects ${name} on MCP with INVALID_PARAMS and no writes`, async () => {
      const before = await writeSnapshot();
      const body = await store(messages);
      expect(body.result.isError).toBe(true);
      expect(body.result.content[0].text).toContain("INVALID_PARAMS");
      expect(await writeSnapshot()).toEqual(before);
    });

    it(`rejects ${name} on trace ingestion without writes`, async () => {
      const before = await writeSnapshot();
      const response = await ingest(observations(messages));
      expect(response.status).toBe(400);
      expect((await response.json<{ error: { code: string } }>()).error.code).toBe("BAD_REQUEST");
      expect(await writeSnapshot()).toEqual(before);
    });
  }

  it("creates and appends 100 messages across D1 chunks, preserving order and counts", async () => {
    const messages = Array.from({ length: MAX_MESSAGES_PER_REQUEST }, (_, i) =>
      message(`message ${i}`),
    );
    const response = await create(messages);
    expect(response.status).toBe(201);
    const conversation = await response.json<ConversationResponse>();
    expect(conversation.messages.map((m) => m.content)).toEqual(messages.map((m) => m.content));
    const appended = await append(conversation.id, messages);
    expect(appended.status).toBe(201);
    const body = await appended.json<{ messages: StoredMessage[] }>();
    expect(body.messages.map((m) => m.content)).toEqual(messages.map((m) => m.content));
    expect(await conversationRow(conversation.id)).toMatchObject({
      message_count: 200,
      token_count: 400,
    });
    expect(await messageCount(conversation.id)).toEqual({ n: 200 });
  });

  it("accepts exactly 64 KiB UTF-8 per message and 1 MiB combined via create and append", async () => {
    const messages = Array.from(
      { length: MAX_MESSAGES_CONTENT_BYTES / MAX_MESSAGE_CONTENT_BYTES },
      () => message("é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2)),
    );
    const response = await create(messages);
    expect(response.status).toBe(201);
    const conversation = await response.json<ConversationResponse>();
    expect(conversation.message_count).toBe(16);
    expect(await contentBytes(conversation.id)).toEqual({
      n: 16,
      bytes: MAX_MESSAGES_CONTENT_BYTES,
    });
    const appended = await append(conversation.id, messages);
    expect(appended.status).toBe(201);
    const body = await appended.json<{ messages: StoredMessage[] }>();
    expect(body.messages.map((m) => m.content)).toEqual(messages.map((m) => m.content));
    expect(await contentBytes(conversation.id)).toEqual({
      n: 32,
      bytes: 2 * MAX_MESSAGES_CONTENT_BYTES,
    });
    expect(await conversationRow(conversation.id)).toMatchObject({
      message_count: 32,
      token_count: 64,
    });
  });

  it("accepts exactly 64 KiB UTF-8 per message and 1 MiB combined via MCP and trace ingestion", async () => {
    const messages = Array.from(
      { length: MAX_MESSAGES_CONTENT_BYTES / MAX_MESSAGE_CONTENT_BYTES },
      () => message("é".repeat(MAX_MESSAGE_CONTENT_BYTES / 2)),
    );
    const body = await store(messages);
    expect(body.result.isError).not.toBe(true);
    const conversation = JSON.parse(body.result.content[0].text) as ConversationResponse;
    expect(conversation.message_count).toBe(16);
    expect(await contentBytes(conversation.id)).toEqual({
      n: 16,
      bytes: MAX_MESSAGES_CONTENT_BYTES,
    });
    const response = await ingest(observations(messages));
    expect(response.status).toBe(201);
    const trace = await response.json<TraceResponse>();
    expect(trace.conversation.message_count).toBe(16);
    expect(trace.observations.map((o) => o.content)).toEqual(messages.map((m) => m.content));
    expect(await contentBytes(trace.conversation.id)).toEqual({
      n: 16,
      bytes: MAX_MESSAGES_CONTENT_BYTES,
    });
  });

  it("stores 100 messages through MCP across D1 chunks", async () => {
    const body = await store(Array.from({ length: MAX_MESSAGES_PER_REQUEST }, () => message()));
    expect(body.result.isError).not.toBe(true);
    const conversation = JSON.parse(body.result.content[0].text) as ConversationResponse;
    expect(conversation.message_count).toBe(100);
    expect(await conversationRow(conversation.id)).toMatchObject({
      message_count: 100,
      token_count: 200,
    });
    expect(await messageCount(conversation.id)).toEqual({ n: 100 });
  });

  it("ingests 100 observations with forward and backward parent references across chunks", async () => {
    const input = observations(
      Array.from({ length: MAX_MESSAGES_PER_REQUEST }, (_, i) => message(`observation ${i}`)),
    ).map((o, i) => ({
      ...o,
      // Second observation references the last chunk; every fifth references the previous chunk.
      parent_message_id: i === 0 ? undefined : i === 1 ? "$100" : i % 5 === 0 ? `$${i}` : "$1",
    }));
    const response = await ingest(input);
    expect(response.status).toBe(201);
    const body = await response.json<TraceResponse>();
    expect(body.conversation).toMatchObject({ message_count: 100, token_count: 200 });
    expect(body.observations.map((o) => o.content)).toEqual(input.map((o) => o.content));
    const expected = body.observations.map((o, i) => ({
      id: o.id,
      content: input[i].content,
      parent_message_id: input[i].parent_message_id
        ? body.observations[Number(input[i].parent_message_id?.slice(1)) - 1].id
        : null,
    }));
    expect(
      body.observations.map(({ id, content, parent_message_id }) => ({
        id,
        content,
        parent_message_id,
      })),
    ).toEqual(expected);
    const persisted = await env.DB.prepare(
      "SELECT id, content, parent_message_id FROM messages WHERE conversation_id = ? ORDER BY id",
    )
      .bind(body.conversation.id)
      .all<StoredMessage>();
    expect(persisted.results).toEqual(
      expected.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    );
    expect(await conversationRow(body.conversation.id)).toMatchObject({
      message_count: 100,
      token_count: 200,
    });
  });

  it("keeps every insert statement within D1's 100 bound parameters", async () => {
    const db = drizzle(env.DB);
    const rows = serializeMessageRows(
      "bind-limit-conversation",
      Array.from({ length: MAX_MESSAGES_PER_REQUEST }, () => ({
        ...message(),
        metadata: { source: "bind-limit-test" },
        model: "test-model",
        input_tokens: 1,
        output_tokens: 1,
        cost_microdollars: 1,
        parent_message_id: "parent",
        observation_type: "span" as const,
        start_time: 1,
        end_time: 2,
        status: "success" as const,
        level: "default" as const,
      })),
    );
    const batch = vi.spyOn(db, "batch").mockResolvedValue([]);
    try {
      await insertMessageRows(db, rows);
      expect(batch).toHaveBeenCalledTimes(1);
      const statements = batch.mock.calls[0][0];
      expect(statements.length).toBeGreaterThan(1);
      for (const statement of statements) {
        expect(statement.toSQL().params.length).toBeLessThanOrEqual(100);
      }
    } finally {
      batch.mockRestore();
    }
  });

  it("rolls back the first insert chunk when the second chunk fails", async () => {
    const response = await create([message("existing message")]);
    expect(response.status).toBe(201);
    const conversation = await response.json<ConversationResponse>();
    const db = drizzle(env.DB);
    const rows = serializeMessageRows(
      conversation.id,
      Array.from({ length: 6 }, (_, i) => message(`rollback ${i}`)),
    );
    // Five valid rows fit in chunk one; a duplicate primary key fails chunk two.
    rows[5].id = rows[0].id;
    const before = await writeSnapshot();
    const row = await conversationRow(conversation.id);
    await expect(insertMessageRows(db, rows)).rejects.toThrow(/UNIQUE constraint failed/);
    expect(await writeSnapshot()).toEqual(before);
    expect(await conversationRow(conversation.id)).toEqual(row);
    expect(await messageCount(conversation.id)).toEqual({ n: 1 });

    // These same first five rows are valid and must be reusable after the rollback.
    await insertMessageRows(db, rows.slice(0, 5));
    expect(await messageCount(conversation.id)).toEqual({ n: 6 });
    await insertMessageRows(db, []);
    expect(await messageCount(conversation.id)).toEqual({ n: 6 });
  });
});
