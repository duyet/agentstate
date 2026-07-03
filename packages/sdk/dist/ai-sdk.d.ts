import { JsonObject, AgentState } from './index.js';

type UIMessage = Record<string, unknown> & {
    id?: string;
    role?: string;
};
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
interface AISDKChatStore {
    createChat: () => Promise<string>;
    loadChat: (chatId: string) => Promise<UIMessage[]>;
    saveChat: (input: {
        chatId: string;
        messages: UIMessage[];
    }) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
}
interface AISDKRSCStateStore {
    loadAIState: () => Promise<JsonObject | null>;
    saveAIState: (state: JsonObject | null) => Promise<void>;
    onSetAIState: (params: {
        state: JsonObject | null;
        done: boolean;
    }) => Promise<void>;
    onGetUIState: () => Promise<UIMessage[]>;
}
declare function createAISDKChatStore(client: AgentState, options?: ChatStoreOptions): AISDKChatStore;
declare function createAISDKRSCStateStore(client: AgentState, options: RSCStoreOptions): AISDKRSCStateStore;

export { type AISDKChatStore, type AISDKRSCStateStore, createAISDKChatStore, createAISDKRSCStateStore };
