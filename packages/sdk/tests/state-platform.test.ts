import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentState } from "../src/index";
import { createAISDKChatStore } from "../src/ai-sdk";
import { AgentStateCheckpointSaver } from "../src/langgraph";

type StateRecord = {
  state_key: string;
  agent_id: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  tags: string[];
  latest_sequence: number;
  created_at: number;
  updated_at: number;
  deleted_at: null;
};

type MockRequest = {
  method: string;
  url: string;
  body?: unknown;
};

function createStateApiMock() {
  const stateStore = new Map<string, StateRecord>();
  const requests: MockRequest[] = [];
  let latestSequence = 1;
  let timestamp = Date.now();

  const now = () => {
    timestamp += 1;
    return timestamp;
  };

  function parseStateKey(pathname: string): string | null {
    if (!pathname.startsWith("/v2/states/")) {
      return null;
    }
    const remainder = pathname.replace("/v2/states/", "");
    const [encoded] = remainder.split("/");
    return encoded ? decodeURIComponent(encoded) : null;
  }

  function readPredicateValue(record: StateRecord, path: string): unknown {
    if (!path.startsWith("$.") || !record.data) {
      return undefined;
    }
    return record.data[path.slice(2)];
  }

  const query = (payload: Record<string, unknown>) => {
    const requestedTags = (payload.tags as string[] | undefined) ?? [];
    const predicates = (payload.predicates as Array<{ path: string; equals: unknown }> | undefined) ?? [];

    return Array.from(stateStore.values())
      .filter((record) =>
        requestedTags.every((tag) => record.tags.includes(tag))
      )
      .filter((record) =>
        predicates.every((predicate) => readPredicateValue(record, predicate.path) === predicate.equals),
      )
      .sort((left, right) => right.latest_sequence - left.latest_sequence)
      .map((record) => record);
  };

  const buildRecord = (stateKey: string, payload: Record<string, unknown>): StateRecord => ({
    state_key: stateKey,
    agent_id: String((payload.agent_id as string) ?? ""),
    data: (payload.data as Record<string, unknown>) ?? {},
    metadata: payload.metadata === undefined ? null : (payload.metadata as Record<string, unknown>),
    tags: (payload.tags as string[]) ?? [],
    latest_sequence: latestSequence++,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  });

  const fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(request.url);
    const routePath = url.pathname.startsWith("/api/")
      ? url.pathname.slice("/api".length)
      : url.pathname;
    const method = (request.method || "GET").toUpperCase();
    const rawBody = request.body ? await request.text() : "";
    const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined;

    requests.push({
      method,
      url: `${routePath}${url.search}`,
      body,
    });

    if (routePath === "/v2/states/query" && method === "POST") {
      return new Response(
        JSON.stringify({
          data: query((body ?? {}) as Record<string, unknown>),
          pagination: { next_cursor: null },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    const stateKey = parseStateKey(routePath);
    if (!stateKey) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (method === "PUT" && !routePath.endsWith("/events")) {
      const payload = body as Record<string, unknown>;
      const record = buildRecord(stateKey, payload);
      stateStore.set(stateKey, record);
      return new Response(JSON.stringify(record), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (method === "GET" && routePath.endsWith("/events")) {
      return new Response(
        JSON.stringify({ data: [], pagination: { next_cursor: null } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (method === "GET") {
      const existing = stateStore.get(stateKey);
      if (!existing) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(existing), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const existing = stateStore.get(stateKey);
      stateStore.delete(stateKey);
      return new Response(JSON.stringify({ deleted: true, event: existing }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unsupported" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  });

  return { fetch, requests, stateStore };
}

describe.skip("State SDK examples should run with mocked transport", () => {
  let originalFetch: typeof globalThis.fetch;
  let stateMock: ReturnType<typeof createStateApiMock>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    stateMock = createStateApiMock();
    globalThis.fetch = stateMock.fetch as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("persists and loads AI SDK chat state using AgentState v2 endpoints", async () => {
    const client = new AgentState({ apiKey: "as_live_test123" });
    const store = createAISDKChatStore(client, {
      stateKeyPrefix: "agentstate/ai-sdk/chat",
      generateChatId: () => "chat-1",
    });

    const stateKey = "agentstate/ai-sdk/chat/chat-1";
    await store.createChat();
    await store.saveChat({
      chatId: "chat-1",
      messages: [{ id: "m1", role: "user", content: "hello" }],
    });
    const loaded = await store.loadChat("chat-1");

    expect(loaded).toEqual([{ id: "m1", role: "user", content: "hello" }]);
    expect(stateMock.stateStore.get(stateKey)?.data).toMatchObject({
      kind: "ai-sdk-chat",
      runtime: "ai-sdk",
      messages: [{ id: "m1", role: "user", content: "hello" }],
    });

    await store.deleteChat("chat-1");
    expect(stateMock.stateStore.has(stateKey)).toBe(false);
    expect(stateMock.requests.some((request) => request.url.startsWith("/v2/states/"))).toBe(true);
  });

  it("persists LangGraph checkpoints and pending writes through query-backed list filtering", async () => {
    const client = new AgentState({ apiKey: "as_live_test123" });
    const saver = new AgentStateCheckpointSaver(client, {
      stateKeyPrefix: "agentstate/langgraph",
    });

    const nextConfig = await saver.put(
      { configurable: { thread_id: "thread-1", checkpoint_ns: "" } },
      { id: "cp-1", values: { status: "running" } },
      { note: "checkpoint created" },
      {},
    );
    await saver.putWrites(
      nextConfig,
      [["messages", { role: "assistant", content: "ok" }]],
      "task-id-1",
    );

    const rows = [];
    for await (const row of saver.list(
      { configurable: { thread_id: "thread-1" } },
      { filter: { runtime: "langgraph" } },
    )) {
      rows.push(row);
    }

    expect(rows).toHaveLength(1);
    expect(rows[0]!.config.configurable.checkpoint_id).toBe("cp-1");
    expect(rows[0]!.checkpoint).toMatchObject({ id: "cp-1", values: { status: "running" } });
    expect(rows[0]!.pendingWrites).toEqual([
      ["task-id-1", "messages", { role: "assistant", content: "ok" }],
    ]);
    expect(stateMock.requests.some((request) => request.body && "predicates" in (request.body as any))).toBe(
      true,
    );
  });
});
