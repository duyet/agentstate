import { AgentState } from "./index.mjs";
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointMetadata,
  type CheckpointTuple,
  type ChannelVersions,
} from "@langchain/langgraph-checkpoint";

export interface AGENTSTATELangGraphOptions {
  agentId?: string;
  stateKeyPrefix?: string;
}

export class AgentStateCheckpointSaver extends BaseCheckpointSaver {
  constructor(client: AgentState, options?: AGENTSTATELangGraphOptions);
  getTuple(
    config: RunnableConfig,
  ): Promise<CheckpointTuple | undefined>;
  list(
    config: RunnableConfig,
    options?: {
      limit?: number;
      before?: string | RunnableConfig;
      after?: string | RunnableConfig;
      filter?: Record<string, unknown>;
    },
  ): AsyncGenerator<CheckpointTuple, void, unknown>;
}