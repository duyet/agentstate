import { RunnableConfig } from '@langchain/core/runnables';
import { BaseCheckpointSaver, CheckpointTuple, CheckpointListOptions, Checkpoint, ChannelVersions, PendingWrite } from '@langchain/langgraph-checkpoint';
import { AgentState } from './index.js';

interface AGENTSTATELangGraphOptions {
  agentId?: string;
  stateKeyPrefix?: string;
}
type ListOptions = CheckpointListOptions & {
  after?: string | RunnableConfig;
};
declare class AgentStateCheckpointSaver extends BaseCheckpointSaver {
  private readonly client;
  private readonly agentId;
  private readonly stateKeyPrefix;
  constructor(client: AgentState, options?: AGENTSTATELangGraphOptions);
  private queryRecords;
  private parseCheckpointState;
  private parseWriteState;
  private parseCheckpointTuple;
  private parsePendingWrites;
  private getLatestCheckpoint;
  getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>;
  list(config: RunnableConfig, options?: ListOptions): AsyncGenerator<CheckpointTuple>;
  put(
    config: RunnableConfig,
    checkpoint: Checkpoint | Record<string, unknown>,
    metadata?: unknown,
    newVersions?: ChannelVersions,
  ): Promise<RunnableConfig>;
  putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
    taskPath?: string,
  ): Promise<void>;
  private deleteRecords;
  deleteThread(threadId: string): Promise<void>;
}

export { type AGENTSTATELangGraphOptions, AgentStateCheckpointSaver };
