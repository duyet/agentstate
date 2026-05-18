import { createAISDKChatStore } from "../../packages/sdk/src/ai-sdk";
import { AgentState } from "../../packages/sdk/src/index";

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
};

type Client = Pick<AgentState, "upsertState" | "getState" | "deleteState">;

export type AiSDKUIExampleResult = {
  chatId: string;
  messages: ChatMessage[];
};

export async function runAiSdkChatExample(
  client: Client,
  options?: {
    chatId?: string;
    messages?: ChatMessage[];
  },
): Promise<AiSDKUIExampleResult> {
  const stateKeyPrefix = "agentstate/examples/ai-sdk/ui";

  const store = createAISDKChatStore(client, {
    stateKeyPrefix,
    generateChatId: () => options?.chatId ?? "ai-sdk-ui-chat-1",
  });

  const chatId = await store.createChat();
  const initialMessages = options?.messages ?? [
    { id: "m-1", role: "user", content: "Hello from CLI" },
    { id: "m-2", role: "assistant", content: "Hello from AgentState" },
  ];

  await store.saveChat({ chatId, messages: initialMessages });
  const loaded = await store.loadChat(chatId);

  const updatedMessages = [
    ...loaded,
    { id: "m-3", role: "assistant", content: "This message is persisted as UIMessage[]" },
  ];
  await store.saveChat({ chatId, messages: updatedMessages });

  const finalMessages = await store.loadChat(chatId);
  await store.deleteChat(chatId);

  return {
    chatId,
    messages: finalMessages,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.AGENTSTATE_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTSTATE_API_KEY is required");
  }

  const client = new AgentState({ apiKey });
  const result = await runAiSdkChatExample(client);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("examples/ai-sdk-ui/main.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
