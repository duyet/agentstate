import type { RunnableConfig } from "@langchain/core/runnables";
import { BaseCheckpointSaver, type ChannelVersions, type Checkpoint, type CheckpointListOptions, type CheckpointTuple, type PendingWrite } from "@langchain/langgraph-checkpoint";
import { type AgentState } from "./index";
export interface AGENTSTATELangGraphOptions {
    agentId?: string;
    stateKeyPrefix?: string;
}
type ListOptions = CheckpointListOptions & {
    after?: string | RunnableConfig;
};
export declare class AgentStateCheckpointSaver extends BaseCheckpointSaver {
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
    put(config: RunnableConfig, checkpoint: Checkpoint | Record<string, unknown>, metadata?: unknown, newVersions?: ChannelVersions): Promise<RunnableConfig>;
    putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string, taskPath?: string): Promise<void>;
    private deleteRecords;
    deleteThread(threadId: string): Promise<void>;
}
export {};
//# sourceMappingURL=langgraph.d.ts.map