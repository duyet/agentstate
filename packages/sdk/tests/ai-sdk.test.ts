import { describe, expect, it, vi } from "vitest";

import { createAISDKChatStore, createAISDKRSCStateStore } from "../src/ai-sdk";
import { AgentStateError } from "../src/index";

const CHAT_STATE = {
  data: {
    kind: "ai-sdk-chat",
    runtime: "ai-sdk",
    messages: [{ id: "m1", role: "user", content: "hello" }],
  },
};

describe("AgentState AI SDK adapters", () => {
  it("stores and loads UI chat messages as full v2 state payload", async () => {
    const client = {
      upsertState: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockResolvedValue(CHAT_STATE),
      deleteState: vi.fn().mockResolvedValue(undefined),
    };

    const store = createAISDKChatStore(client as any, {
      stateKeyPrefix: "agentstate/ai-sdk/chat",
      generateChatId: () => "chat/1",
    });

    await store.createChat();
    const loaded = await store.loadChat("chat/1");

    expect(client.upsertState).toHaveBeenCalledTimes(1);
    expect(client.getState).toHaveBeenCalledWith("agentstate/ai-sdk/chat/chat%2F1");
    expect(loaded).toEqual(CHAT_STATE.data.messages);

    await store.saveChat({
      chatId: "chat/1",
      messages: [{ id: "m2", role: "assistant", content: "hey" }],
    });
    expect(client.upsertState).toHaveBeenCalledTimes(2);

    await store.deleteChat("chat/1");
    expect(client.deleteState).toHaveBeenCalledWith("agentstate/ai-sdk/chat/chat%2F1");
  });

  it("returns empty chat messages only when the state is missing", async () => {
    const missingClient = {
      upsertState: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockRejectedValue(new AgentStateError("missing", "NOT_FOUND", 404)),
      deleteState: vi.fn().mockResolvedValue(undefined),
    };
    const missingStore = createAISDKChatStore(missingClient as any);

    await expect(missingStore.loadChat("missing")).resolves.toEqual([]);

    const failedClient = {
      upsertState: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockRejectedValue(new AgentStateError("denied", "UNAUTHORIZED", 401)),
      deleteState: vi.fn().mockResolvedValue(undefined),
    };
    const failedStore = createAISDKChatStore(failedClient as any);

    await expect(failedStore.loadChat("private")).rejects.toMatchObject({ status: 401 });
  });

  it("uses RSC adapter to map AI state into UI messages", async () => {
    const client = {
      upsertState: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockResolvedValue({
        data: {
          kind: "ai-sdk-rsc",
          runtime: "ai-sdk",
          ai_state: { step: "first" },
          ui_messages: [{ id: "x", role: "assistant", content: "from-load" }],
        },
      }),
      deleteState: vi.fn().mockResolvedValue(undefined),
    };

    const store = createAISDKRSCStateStore(client as any, {
      stateKey: "rsc-thread-1",
      stateKeyPrefix: "agentstate/ai-sdk/rsc",
      mapAIStateToUIMessages: (state) => {
        if (!state) return [];
        return [{ id: "mapped", role: "assistant", content: String(state.step) }];
      },
    });

    await store.saveAIState({ step: "alpha" });
    await store.onSetAIState({ state: { step: "beta" }, done: true });
    const uiMessages = await store.onGetUIState();

    expect(uiMessages).toHaveLength(1);
    expect(uiMessages[0].content).toBe("from-load");
    expect(client.upsertState).toHaveBeenCalledTimes(2);

    const loadState = await store.loadAIState();
    expect(loadState).toEqual({ step: "first" });
  });
});
