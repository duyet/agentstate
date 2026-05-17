# AI SDK UI Message Store Example

Persist `UIMessage[]` in AgentState v2 state using `createAISDKChatStore`.

```ts
import { AgentState } from "@agentstate/sdk";
import { createAISDKChatStore } from "@agentstate/sdk/ai-sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const store = createAISDKChatStore(client, {
  stateKeyPrefix: "agentstate/ai-sdk/chat",
});

export async function createChat() {
  const chatId = await store.createChat();
  await store.saveChat({
    chatId,
    messages: [{ id: "m1", role: "user", content: "Hi!" }],
  });
  return chatId;
}

export async function loadChat(chatId: string) {
  return store.loadChat(chatId);
}

export async function deleteChat(chatId: string) {
  await store.deleteChat(chatId);
}
```

Notes:
- The adapter stores the full v2 state payload:
  - `kind: "ai-sdk-chat"`
  - `runtime: "ai-sdk"`
  - `messages` (full `UIMessage[]`)
