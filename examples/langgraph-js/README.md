# LangGraph (JavaScript) Adapter Example

Persist LangGraph checkpoints and pending writes using the `@agentstate/sdk/langgraph` adapter.

```ts
import { AgentState } from "@agentstate/sdk";
import { AgentStateCheckpointSaver } from "@agentstate/sdk/langgraph";

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY!,
});

const saver = new AgentStateCheckpointSaver(client, {
  agentId: "agentstate-sdk",
  stateKeyPrefix: "agentstate/langgraph",
});

export async function saveCheckpoint(threadId: string) {
  const config = {
    configurable: { thread_id: threadId, checkpoint_ns: "" },
  };
  const nextConfig = await saver.put(
    config,
    { id: "cp-1", values: { step: "start" } },
    { note: "checkpoint created" },
    {},
  );

  await saver.putWrites(
    nextConfig,
    [["messages", [{ role: "assistant", content: "hello" }]]],
    "task-id-1",
  );

  return nextConfig;
}

export async function loadCheckpoint(config: { configurable: { thread_id: string; checkpoint_ns?: string; checkpoint_id?: string } }) {
  return saver.getTuple(config);
}
```

Requirements:
- Install `@agentstate/sdk`
- Install optional peer `@langchain/langgraph-checkpoint`
- (Optional) use `@agentstate/sdk/langgraph` for async workflows
