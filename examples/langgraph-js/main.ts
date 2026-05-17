import { AgentState } from "../../packages/sdk/src/index";
import { AgentStateCheckpointSaver } from "../../packages/sdk/src/langgraph";

type Client = Pick<AgentState, "upsertState" | "getState" | "queryStates" | "deleteState">;

export type LangGraphJsExampleResult = {
  threadId: string;
  checkpointId: string;
  listLength: number;
  pendingWriteTask: string;
  pendingWrites: Array<[string, string, unknown]>;
};

export async function runLangGraphJsExample(
  client: Client,
  options?: {
    threadId?: string;
    checkpointId?: string;
    cleanup?: boolean;
  },
): Promise<LangGraphJsExampleResult> {
  const threadId = options?.threadId ?? "langgraph-thread-1";
  const checkpointId = options?.checkpointId ?? "checkpoint-start";

  const saver = new AgentStateCheckpointSaver(client, {
    stateKeyPrefix: "agentstate/examples/langgraph/js",
  });

  const nextConfig = await saver.put(
    {
      configurable: { thread_id: threadId, checkpoint_ns: "" },
    },
    {
      id: checkpointId,
      values: { phase: "start" },
    },
    { note: "sdk example checkpoint" },
    {},
  );

  const taskId = "task-ui-example";
  await saver.putWrites(
    nextConfig,
    [["messages", { role: "assistant", content: "hello" }]],
    taskId,
  );

  const row = await saver.getTuple(nextConfig);

  const rows: Array<{
    config: { configurable: { thread_id: string; checkpoint_id?: string } };
    checkpoint: Record<string, unknown>;
    pendingWrites?: Array<[string, string, unknown]>;
  }> = [];

  for await (const tuple of saver.list({ configurable: { thread_id: threadId } })) {
    rows.push(
      tuple as unknown as {
        config: { configurable: { thread_id: string; checkpoint_id?: string } };
        checkpoint: Record<string, unknown>;
        pendingWrites?: Array<[string, string, unknown]>;
      },
    );
  }

  const pendingWrites = row?.pendingWrites ?? [];

  if (options?.cleanup) {
    await saver.deleteThread(threadId);
  }

  return {
    threadId,
    checkpointId: nextConfig.configurable.checkpoint_id,
    listLength: rows.length,
    pendingWriteTask: taskId,
    pendingWrites,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.AGENTSTATE_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTSTATE_API_KEY is required");
  }

  const client = new AgentState({ apiKey });
  const result = await runLangGraphJsExample(client);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("examples/langgraph-js/main.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
