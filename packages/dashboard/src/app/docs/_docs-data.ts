export type DocNavGroup = {
  group: string;
  items: [id: string, label: string][];
};

export const DOC_NAV: DocNavGroup[] = [
  {
    group: "START",
    items: [
      ["overview", "Overview"],
      ["quickstart", "Quickstart"],
      ["auth", "Authentication"],
    ],
  },
  {
    group: "CORE",
    items: [["conversations", "Conversations"]],
  },
  {
    group: "ADAPTERS",
    items: [["ai-sdk", "Vercel AI SDK"]],
  },
  {
    group: "OPS",
    items: [["analytics", "Analytics"]],
  },
];

export const ON_THIS_PAGE: [id: string, label: string][] = [
  ["quickstart", "Quickstart"],
  ["auth", "Authentication"],
  ["conversations", "Conversations"],
  ["ai-sdk", "Adapters"],
  ["analytics", "Analytics"],
];

export const QUICK_CODE = `npm i @agentstate/sdk

import { AgentState } from "@agentstate/sdk";
const state = new AgentState({ apiKey: "as_live_..." });

const conv = await state.createConversation({
  messages: [{ role: "user", content: "Hello" }],
});`;

export const AUTH_CODE = `# every request carries a bearer key (starts with as_live_)
curl https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer as_live_your_key"`;

export const ADAPTER_CODE = `import { AgentState } from "@agentstate/sdk";
import { createAISDKChatStore } from "@agentstate/sdk/ai-sdk";

const store = createAISDKChatStore(
  new AgentState({ apiKey: AS_KEY }),
);
const chatId = await store.createChat();
await store.saveChat({ chatId, messages });`;

export const CONVERSATION_ENDPOINTS: [method: string, path: string][] = [
  ["POST", "/api/v1/conversations"],
  ["GET", "/api/v1/conversations/:id"],
  ["POST", "/api/v1/conversations/:id/messages"],
  ["PATCH", "/api/v1/conversations/:id"],
  ["DELETE", "/api/v1/conversations/:id"],
];

export const ANALYTICS_ENDPOINTS: [method: string, path: string][] = [
  ["GET", "/api/v1/analytics/summary"],
  ["GET", "/api/v1/analytics/timeseries"],
  ["GET", "/api/v1/analytics/tags"],
];
