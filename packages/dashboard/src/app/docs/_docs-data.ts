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
    items: [
      ["conversations", "Conversations"],
      ["state", "Any state"],
      ["search", "Search & tags"],
    ],
  },
  {
    group: "ADAPTERS",
    items: [
      ["ai-sdk", "Vercel AI SDK"],
      ["tanstack", "TanStack"],
      ["langgraph", "LangGraph"],
      ["cf-agents", "Cloudflare Agents"],
    ],
  },
  {
    group: "OPS",
    items: [
      ["analytics", "Analytics"],
      ["migration", "V2 migration"],
    ],
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
curl https://agentstate.app/api/v2/conversations \\
  -H "Authorization: Bearer as_live_your_key"`;

export const ADAPTER_CODE = `import { AgentState } from "@agentstate/sdk";
import { createAISDKChatStore } from "@agentstate/sdk/ai-sdk";

const store = createAISDKChatStore(
  new AgentState({ apiKey: AS_KEY }),
);
const chatId = await store.createChat();
await store.saveChat({ chatId, messages });`;

export const CONVERSATION_ENDPOINTS: [method: string, path: string][] = [
  ["POST", "/api/v2/conversations"],
  ["GET", "/api/v2/conversations/:id"],
  ["POST", "/api/v2/conversations/:id/messages"],
  ["PATCH", "/api/v2/conversations/:id"],
  ["DELETE", "/api/v2/conversations/:id"],
];

export const ANALYTICS_ENDPOINTS: [method: string, path: string][] = [
  ["GET", "/api/v2/analytics/summary"],
  ["GET", "/api/v2/analytics/timeseries"],
  ["GET", "/api/v2/analytics/tags"],
];
