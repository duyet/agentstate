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
    group: "REMOTE",
    items: [
      ["mcp", "Remote MCP"],
      ["oauth", "OAuth"],
      ["permissions", "Permissions"],
    ],
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
  ["mcp", "Remote MCP"],
  ["oauth", "OAuth"],
  ["permissions", "Permissions"],
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
  ["PUT", "/api/v1/conversations/:id"],
  ["DELETE", "/api/v1/conversations/:id"],
];

export const ANALYTICS_ENDPOINTS: [method: string, path: string][] = [
  ["GET", "/api/v1/analytics/summary"],
  ["GET", "/api/v1/analytics/timeseries"],
  ["GET", "/api/v1/analytics/tags"],
];

export const MCP_CONFIG = `{
  "mcpServers": {
    "agentstate": {
      "type": "http",
      "url": "https://agentstate.app/api/mcp",
      "headers": { "Authorization": "Bearer as_live_your_key" }
    }
  }
}`;

export const PERMISSION_SCOPES: [scope: string, grants: string][] = [
  ["conversations:read", "Read, list, search, export conversations"],
  ["conversations:write", "Create, append, update, delete, tag"],
  ["state:read", "Read state, list events, query"],
  ["state:write", "Create, replace, delete state"],
  ["state:watch", "Watch state events"],
  ["lease:write", "Acquire, renew, release leases"],
  ["claim:write", "Create and verify claims"],
  ["analytics:read", "Read analytics"],
  ["webhooks:write", "Manage webhooks"],
  ["domains:write", "Manage custom domains"],
  ["keys:read", "List API keys"],
  ["keys:write", "Create and revoke API keys"],
];
