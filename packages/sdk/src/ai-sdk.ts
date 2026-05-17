import { type AgentState, AgentStateError, type JsonObject } from "./index";

type UIMessage = Record<string, unknown> & {
  id?: string;
  role?: string;
};

interface ChatStoreStatePayload {
  kind: "ai-sdk-chat";
  runtime: "ai-sdk";
  messages: UIMessage[];
}

interface RSCStatePayload {
  kind: "ai-sdk-rsc";
  runtime: "ai-sdk";
  ai_state: JsonObject | null;
  ui_messages: UIMessage[];
}

interface ChatStoreOptions {
  agentId?: string;
  stateKeyPrefix?: string;
  generateChatId?: () => string;
}

interface RSCStoreOptions {
  stateKey: string;
  agentId?: string;
  stateKeyPrefix?: string;
  mapAIStateToUIMessages?: (state: JsonObject | null) => UIMessage[];
}

export interface AISDKChatStore {
  createChat: () => Promise<string>;
  loadChat: (chatId: string) => Promise<UIMessage[]>;
  saveChat: (input: { chatId: string; messages: UIMessage[] }) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

export interface AISDKRSCStateStore {
  loadAIState: () => Promise<JsonObject | null>;
  saveAIState: (state: JsonObject | null) => Promise<void>;
  onSetAIState: (params: { state: JsonObject | null; done: boolean }) => Promise<void>;
  onGetUIState: () => Promise<UIMessage[]>;
}

function buildChatKey(prefix: string, chatId: string): string {
  return `${prefix}/${encodeURIComponent(chatId)}`;
}

function defaultChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureArray(value: unknown): UIMessage[] {
  if (Array.isArray(value)) {
    return value as UIMessage[];
  }
  return [];
}

function isMissingState(error: unknown): boolean {
  return error instanceof AgentStateError && error.status === 404;
}

export function createAISDKChatStore(
  client: AgentState,
  options: ChatStoreOptions = {},
): AISDKChatStore {
  const agentId = options.agentId ?? "agentstate-sdk";
  const stateKeyPrefix = options.stateKeyPrefix ?? "agentstate/ai-sdk/chat";
  const generateChatId = options.generateChatId ?? defaultChatId;

  async function saveMessages(chatId: string, messages: UIMessage[]): Promise<void> {
    const payload = {
      kind: "ai-sdk-chat",
      runtime: "ai-sdk",
      messages,
    } as ChatStoreStatePayload;

    await client.upsertState(buildChatKey(stateKeyPrefix, chatId), {
      agent_id: agentId,
      data: payload as unknown as JsonObject,
      metadata: { adapter: "ai-sdk-chat", format: "v2-ui-messages" },
      tags: ["agentstate:ai-sdk", "agentstate:ui", `agentstate:thread:${chatId}`],
    });
  }

  async function loadMessages(chatId: string): Promise<UIMessage[]> {
    let state: unknown;
    try {
      state = await client.getState(buildChatKey(stateKeyPrefix, chatId));
    } catch (error) {
      if (!isMissingState(error)) throw error;
      state = { data: {} };
    }
    const data = (state as unknown as Partial<JsonObject> & { data?: unknown }).data;
    return ensureArray((data as JsonObject)?.messages);
  }

  return {
    createChat: async () => {
      const chatId = generateChatId();
      await saveMessages(chatId, []);
      return chatId;
    },

    loadChat: async (chatId: string): Promise<UIMessage[]> => {
      return loadMessages(chatId);
    },

    saveChat: async ({
      chatId,
      messages,
    }: {
      chatId: string;
      messages: UIMessage[];
    }): Promise<void> => {
      await saveMessages(chatId, messages);
    },

    deleteChat: async (chatId: string): Promise<void> => {
      await client.deleteState(buildChatKey(stateKeyPrefix, chatId));
    },
  };
}

function defaultRscStateKey(prefix: string, stateKey: string): string {
  return `${prefix}/${encodeURIComponent(stateKey)}`;
}

export function createAISDKRSCStateStore(
  client: AgentState,
  options: RSCStoreOptions,
): AISDKRSCStateStore {
  const agentId = options.agentId ?? "agentstate-sdk";
  const stateKey = defaultRscStateKey(
    options.stateKeyPrefix ?? "agentstate/ai-sdk/rsc",
    options.stateKey,
  );
  const mapStateToUI = options.mapAIStateToUIMessages ?? (() => []);

  async function loadStoredRSCState(): Promise<RSCStatePayload> {
    const state = await client.getState(stateKey);
    const data = (state as unknown as { data?: JsonObject }).data;
    return {
      kind: "ai-sdk-rsc",
      runtime: "ai-sdk",
      ai_state: (data?.ai_state as JsonObject | null | undefined) ?? null,
      ui_messages: ensureArray(data?.ui_messages),
    };
  }

  async function saveState(payload: RSCStatePayload): Promise<void> {
    await client.upsertState(stateKey, {
      agent_id: agentId,
      data: payload as unknown as JsonObject,
      metadata: { adapter: "ai-sdk-rsc", format: "v2-ui-messages" },
      tags: ["agentstate:ai-sdk", "agentstate:rsc", `agentstate:rsc:${options.stateKey}`],
    });
  }

  return {
    loadAIState: async () => {
      let state: RSCStatePayload;
      try {
        state = await loadStoredRSCState();
      } catch (error) {
        if (!isMissingState(error)) throw error;
        state = {
          kind: "ai-sdk-rsc",
          runtime: "ai-sdk",
          ai_state: null,
          ui_messages: [],
        };
      }
      return state.ai_state;
    },

    saveAIState: async (state: JsonObject | null) => {
      await saveState({
        kind: "ai-sdk-rsc",
        runtime: "ai-sdk",
        ai_state: state,
        ui_messages: mapStateToUI(state),
      });
    },

    onSetAIState: async ({ state, done }) => {
      if (!done) return;
      await saveState({
        kind: "ai-sdk-rsc",
        runtime: "ai-sdk",
        ai_state: state,
        ui_messages: mapStateToUI(state),
      });
    },

    onGetUIState: async () => {
      let state: RSCStatePayload;
      try {
        state = await loadStoredRSCState();
      } catch (error) {
        if (!isMissingState(error)) throw error;
        state = {
          kind: "ai-sdk-rsc",
          runtime: "ai-sdk",
          ai_state: null,
          ui_messages: [],
        };
      }
      return state.ui_messages;
    },
  };
}
