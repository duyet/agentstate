import { AgentState, CreateConversationParams, ConversationWithMessages } from "./index.mjs";
export function createAISDKChatStore(params: CreateConversationParams): AgentState;
export function createAISDKRSCStateStore(config: {
  apiKey: string;
  baseUrl?: string;
}): AgentState;