import { createAISDKRSCStateStore } from "../../packages/sdk/src/ai-sdk";
import { AgentState } from "../../packages/sdk/src/index";

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
};

type Client = Pick<AgentState, "upsertState" | "getState" | "deleteState">;

export type AiSDKRSCExampleResult = {
  stateKey: string;
  aiState: Record<string, unknown> | null;
  uiMessages: ChatMessage[];
};

export async function runAiSdkRscExample(
  client: Client,
  options?: {
    stateKey?: string;
  },
): Promise<AiSDKRSCExampleResult> {
  const stateKeyPrefix = "agentstate/examples/ai-sdk/rsc";
  const stateKey = options?.stateKey ?? "rsc-thread-1";

  const store = createAISDKRSCStateStore(client, {
    stateKeyPrefix,
    stateKey,
    mapAIStateToUIMessages: (state) => {
      if (!state || !("step" in state)) {
        return [];
      }

      return [
        {
          id: "ui-step",
          role: "assistant",
          content: `Step: ${String((state as Record<string, unknown>).step)}`,
        },
      ];
    },
  });

  await store.saveAIState({
    step: "collect",
    payload: { example: "rsc" },
  });

  await store.onSetAIState({
    state: {
      step: "response-ready",
      payload: { example: "rsc" },
    },
    done: true,
  });

  const uiMessages = await store.onGetUIState();
  const aiState = await store.loadAIState();

  return {
    stateKey,
    aiState,
    uiMessages,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.AGENTSTATE_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTSTATE_API_KEY is required");
  }

  const client = new AgentState({ apiKey });
  const result = await runAiSdkRscExample(client);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("examples/ai-sdk-rsc/main.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
