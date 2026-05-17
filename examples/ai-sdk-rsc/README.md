# AI SDK RSC State Store Example

Persist RSC AI state and UI messages with `createAISDKRSCStateStore`.

```ts
import { AgentState } from "@agentstate/sdk";
import { createAISDKRSCStateStore } from "@agentstate/sdk/ai-sdk";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const store = createAISDKRSCStateStore(client, {
  stateKeyPrefix: "agentstate/ai-sdk/rsc",
  stateKey: "thread-1",
  mapAIStateToUIMessages: (state) => {
    if (!state) return [];
    const nextState = state.next;
    return nextState ? [{ id: "state-msg", role: "assistant", content: String(nextState) }] : [];
  },
});

export async function saveState(state: { next?: string } | null) {
  await store.saveAIState(state);
}

export async function onFinish(state: { next?: string } | null) {
  await store.onSetAIState({ state, done: true });
}

export async function getUiState() {
  return store.onGetUIState();
}
```

Production guidance:
- This is useful for server-rendered RSC handlers.
- For AI SDK experimental RSC adapters, keep this in server code and pass through server actions.
