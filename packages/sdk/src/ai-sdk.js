import { AgentStateError } from "./index";
function buildChatKey(prefix, chatId) {
    return `${prefix}/${encodeURIComponent(chatId)}`;
}
function defaultChatId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function ensureArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    return [];
}
function isMissingState(error) {
    return error instanceof AgentStateError && error.status === 404;
}
export function createAISDKChatStore(client, options = {}) {
    const agentId = options.agentId ?? "agentstate-sdk";
    const stateKeyPrefix = options.stateKeyPrefix ?? "agentstate/ai-sdk/chat";
    const generateChatId = options.generateChatId ?? defaultChatId;
    async function saveMessages(chatId, messages) {
        const payload = {
            kind: "ai-sdk-chat",
            runtime: "ai-sdk",
            messages,
        };
        await client.upsertState(buildChatKey(stateKeyPrefix, chatId), {
            agent_id: agentId,
            data: payload,
            metadata: { adapter: "ai-sdk-chat", format: "v2-ui-messages" },
            tags: ["agentstate:ai-sdk", "agentstate:ui", `agentstate:thread:${chatId}`],
        });
    }
    async function loadMessages(chatId) {
        let state;
        try {
            state = await client.getState(buildChatKey(stateKeyPrefix, chatId));
        }
        catch (error) {
            if (!isMissingState(error))
                throw error;
            state = { data: {} };
        }
        const data = state.data;
        return ensureArray(data?.messages);
    }
    return {
        createChat: async () => {
            const chatId = generateChatId();
            await saveMessages(chatId, []);
            return chatId;
        },
        loadChat: async (chatId) => {
            return loadMessages(chatId);
        },
        saveChat: async ({ chatId, messages, }) => {
            await saveMessages(chatId, messages);
        },
        deleteChat: async (chatId) => {
            await client.deleteState(buildChatKey(stateKeyPrefix, chatId));
        },
    };
}
function defaultRscStateKey(prefix, stateKey) {
    return `${prefix}/${encodeURIComponent(stateKey)}`;
}
export function createAISDKRSCStateStore(client, options) {
    const agentId = options.agentId ?? "agentstate-sdk";
    const stateKey = defaultRscStateKey(options.stateKeyPrefix ?? "agentstate/ai-sdk/rsc", options.stateKey);
    const mapStateToUI = options.mapAIStateToUIMessages ?? (() => []);
    async function loadStoredRSCState() {
        const state = await client.getState(stateKey);
        const data = state.data;
        return {
            kind: "ai-sdk-rsc",
            runtime: "ai-sdk",
            ai_state: data?.ai_state ?? null,
            ui_messages: ensureArray(data?.ui_messages),
        };
    }
    async function saveState(payload) {
        await client.upsertState(stateKey, {
            agent_id: agentId,
            data: payload,
            metadata: { adapter: "ai-sdk-rsc", format: "v2-ui-messages" },
            tags: ["agentstate:ai-sdk", "agentstate:rsc", `agentstate:rsc:${options.stateKey}`],
        });
    }
    return {
        loadAIState: async () => {
            let state;
            try {
                state = await loadStoredRSCState();
            }
            catch (error) {
                if (!isMissingState(error))
                    throw error;
                state = {
                    kind: "ai-sdk-rsc",
                    runtime: "ai-sdk",
                    ai_state: null,
                    ui_messages: [],
                };
            }
            return state.ai_state;
        },
        saveAIState: async (state) => {
            await saveState({
                kind: "ai-sdk-rsc",
                runtime: "ai-sdk",
                ai_state: state,
                ui_messages: mapStateToUI(state),
            });
        },
        onSetAIState: async ({ state, done }) => {
            if (!done)
                return;
            await saveState({
                kind: "ai-sdk-rsc",
                runtime: "ai-sdk",
                ai_state: state,
                ui_messages: mapStateToUI(state),
            });
        },
        onGetUIState: async () => {
            let state;
            try {
                state = await loadStoredRSCState();
            }
            catch (error) {
                if (!isMissingState(error))
                    throw error;
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
//# sourceMappingURL=ai-sdk.js.map