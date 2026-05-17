import { AgentState, type JsonObject } from "./index";

type Checkpoint = Record<string, unknown>;
type RunnableConfig = {
  configurable: {
    thread_id: string;
    checkpoint_ns?: string;
    checkpoint_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type Base64Envelope = {
  encoding: "base64-json";
  data: string;
};

type CheckpointRecord = {
  kind: "checkpoint";
  runtime: "langgraph";
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  checkpoint: Base64Envelope;
  metadata: Base64Envelope;
  versions: JsonObject;
};

type PendingWriteRecord = {
  kind: "checkpoint-writes";
  runtime: "langgraph";
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  task_id: string;
  task_path: string;
  writes: Base64Envelope;
};

type StoredState = {
  state_key: string;
  data: JsonObject;
  metadata: JsonObject | null;
  latest_sequence: number;
};

type PendingWriteTuple = [string, string, unknown];

type CheckpointTuple = {
  config: RunnableConfig;
  checkpoint: Checkpoint;
  metadata: unknown;
  parentConfig?: RunnableConfig;
  pendingWrites?: Array<PendingWriteTuple>;
};

export interface AGENTSTATELangGraphOptions {
  agentId?: string;
  stateKeyPrefix?: string;
}

type ListOptions = {
  limit?: number;
  after?: string | RunnableConfig;
  before?: string | RunnableConfig;
  filter?: Record<string, unknown>;
};

const DEFAULT_NAMESPACE = "";
const DEFAULT_AGENT_ID = "agentstate-sdk";
const DEFAULT_PREFIX = "agentstate/langgraph";
const DEFAULT_LIST_LIMIT = 50;
const PAGE_SIZE = 100;
const BASE_RUNTIME = "langgraph";

const BaseCheckpointSaver = class {};

type CheckpointTagType = "checkpoint" | "checkpoint-write";
type RunnableConfigLike = string | RunnableConfig;

function checkpointIdFromConfig(value: RunnableConfigLike | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : getCheckpointId(value);
}

function kindToTag(kind: "checkpoint" | "checkpoint-writes"): CheckpointTagType {
  return kind === "checkpoint-writes" ? "checkpoint-write" : "checkpoint";
}

function encodeBase64(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }

  return btoa(unescape(encodeURIComponent(json)));
}

function decodeBase64(data: string): unknown {
  if (typeof Buffer !== "undefined") {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  }

  return JSON.parse(decodeURIComponent(escape(atob(data))));
}

function normalizeNamespace(value?: string): string {
  return value || DEFAULT_NAMESPACE;
}

function normalizeNamespaceForKey(value?: string): string {
  return normalizeNamespace(value) || "default";
}

function createStateKey(prefix: string, threadId: string, checkpointNs: string, checkpointId: string): string {
  return `${prefix}/${threadId}/${normalizeNamespaceForKey(checkpointNs)}/${checkpointId}`;
}

function createWriteStateKey(
  prefix: string,
  threadId: string,
  checkpointNs: string,
  checkpointId: string,
  taskId: string,
): string {
  return `${prefix}/${threadId}/${normalizeNamespaceForKey(checkpointNs)}/writes/${checkpointId}/${taskId}`;
}

function toTags(runtime: CheckpointTagType, threadId: string): string[] {
  return [
    `agentstate:${BASE_RUNTIME}`,
    `agentstate:${runtime}`,
    `agentstate:thread:${threadId}`,
  ];
}

function ensureString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getThreadId(config: RunnableConfig): string {
  if (!config.configurable?.thread_id || typeof config.configurable.thread_id !== "string") {
    throw new Error("LangGraph config missing required configurable.thread_id");
  }
  return config.configurable.thread_id;
}

function getCheckpointId(config: RunnableConfig): string {
  return ensureString(config.configurable.checkpoint_id);
}

function getStateKeyPrefix(config: RunnableConfig): string {
  return normalizeNamespace(config.configurable.checkpoint_ns);
}

function buildConfig(threadId: string, checkpointNs: string, checkpointId: string): RunnableConfig {
  return {
    configurable: {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpointId,
    },
  };
}

function extractVersions(checkpoint: unknown): JsonObject {
  if (!checkpoint || typeof checkpoint !== "object") {
    return {};
  }

  const raw = checkpoint as Record<string, unknown>;
  const channelVersions = (raw.channel_versions as JsonObject) ?? {};
  const runtimeVersions = (raw.versions as JsonObject) ?? {};
  return { ...channelVersions, ...runtimeVersions };
}

function normalizePendingWrites(writes: unknown, taskId: string): PendingWriteTuple[] {
  if (!Array.isArray(writes)) return [];

  const entries: PendingWriteTuple[] = [];

  for (const item of writes) {
    if (!Array.isArray(item)) continue;

    const tuple = item as Array<unknown>;
    if (tuple.length === 2 && typeof tuple[0] === "string") {
      entries.push([taskId, tuple[0], tuple[1]]);
      continue;
    }

    if (tuple.length >= 3 && typeof tuple[0] === "string" && typeof tuple[1] === "string") {
      entries.push([tuple[0], tuple[1], tuple[2]]);
      continue;
    }
  }

  return entries;
}

function normalizeTupleWrites(value: unknown): Array<PendingWriteTuple> {
  if (!Array.isArray(value)) return [];

  const output: Array<PendingWriteTuple> = [];

  for (const item of value) {
    if (!Array.isArray(item)) continue;
    const tuple = item as Array<unknown>;
    if (tuple.length >= 3 && typeof tuple[0] === "string" && typeof tuple[1] === "string") {
      output.push([tuple[0], tuple[1], tuple[2]]);
    }
  }

  return output;
}

function extractCheckpointId(checkpoint: Checkpoint): string {
  return ensureString((checkpoint as Record<string, unknown>).id);
}

type QueryStateResponse = {
  data: StoredState[];
  pagination?: { next_cursor?: string | null };
};

export class AgentStateCheckpointSaver extends BaseCheckpointSaver {
  private readonly client: AgentState;
  private readonly agentId: string;
  private readonly stateKeyPrefix: string;

  constructor(client: AgentState, options: AGENTSTATELangGraphOptions = {}) {
    super();
    this.client = client;
    this.agentId = options.agentId ?? DEFAULT_AGENT_ID;
    this.stateKeyPrefix = options.stateKeyPrefix ?? DEFAULT_PREFIX;
  }

  private async queryRecords(
    threadId: string,
    checkpointNs: string | null,
    options: {
      limit: number;
      before?: RunnableConfigLike;
      after?: RunnableConfigLike;
      kind: "checkpoint" | "checkpoint-writes";
      extraPredicates?: Array<{ path: string; equals: unknown }>;
      filter?: Record<string, unknown>;
    },
  ): Promise<StoredState[]> {
    const limit = options.limit;
    const collected: StoredState[] = [];
    let cursor: string | undefined;

    const normalizedBefore = checkpointIdFromConfig(options.before);
    const normalizedAfter = checkpointIdFromConfig(options.after);
    const filterPredicates = options.filter
      ? Object.entries(options.filter).map(([key, value]) => ({
          path: key.startsWith("$.") ? key : `$.${key}`,
          equals: value,
        }))
      : [];

    const kindPredicates = [
      { path: "$.kind", equals: options.kind },
      { path: "$.runtime", equals: BASE_RUNTIME },
      { path: "$.thread_id", equals: threadId },
    ];
    if (checkpointNs !== null) {
      kindPredicates.push({ path: "$.checkpoint_ns", equals: checkpointNs });
    }

    const predicates = options.extraPredicates
      ? kindPredicates.concat(options.extraPredicates)
      : kindPredicates;
    const filteredPredicates = filterPredicates.length
      ? predicates.concat(filterPredicates)
      : predicates;

    while (collected.length < limit) {
      const response = await this.client.queryStates({
        agent_id: this.agentId,
        tags: toTags(kindToTag(options.kind), threadId),
        predicates: filteredPredicates,
        limit: Math.min(PAGE_SIZE, limit - collected.length),
        cursor,
      }) as QueryStateResponse;

      const rows = (response.data ?? []) as StoredState[];
      collected.push(...rows);

      const nextCursor = response.pagination?.next_cursor;
      if (!nextCursor || rows.length === 0) {
        break;
      }

      cursor = nextCursor;
    }

    const sorted = collected
      .slice()
      .sort((left, right) => right.latest_sequence - left.latest_sequence)
      .filter((row, index, all) => index === all.findIndex((entry) => (entry.state_key === row.state_key)));

    let filtered = sorted;

    if (normalizedBefore && options.kind === "checkpoint") {
      const beforeState = sorted.findIndex((state) => {
        const tuple = this.parseCheckpointState(state);
        return tuple.checkpoint_id === normalizedBefore;
      });

      if (beforeState >= 0) {
        filtered = sorted.slice(beforeState + 1);
      }
    }

    if (normalizedAfter && options.kind === "checkpoint") {
      const afterState = sorted.findIndex((state) => {
        const tuple = this.parseCheckpointState(state);
        return tuple.checkpoint_id === normalizedAfter;
      });

      if (afterState >= 0) {
        filtered = sorted.slice(0, afterState);
      }
    }

    return filtered.slice(0, limit);
  }

  private parseCheckpointState(state: StoredState): CheckpointRecord {
    const data = state.data as JsonObject;
    if (data.kind !== "checkpoint" || data.runtime !== BASE_RUNTIME) {
      throw new Error("Invalid checkpoint state record");
    }
    return data as unknown as CheckpointRecord;
  }

  private parseWriteState(state: StoredState): PendingWriteRecord {
    const data = state.data as JsonObject;
    if (data.kind !== "checkpoint-writes" || data.runtime !== BASE_RUNTIME) {
      throw new Error("Invalid checkpoint write record");
    }
    return data as unknown as PendingWriteRecord;
  }

  private parseCheckpointTuple(state: StoredState): Omit<CheckpointTuple, "pendingWrites"> {
    const record = this.parseCheckpointState(state);
    return {
      config: buildConfig(record.thread_id, record.checkpoint_ns, record.checkpoint_id),
      checkpoint: decodeBase64(record.checkpoint.data) as Checkpoint,
      metadata: decodeBase64(record.metadata.data),
      parentConfig: record.parent_checkpoint_id
        ? buildConfig(record.thread_id, record.checkpoint_ns, record.parent_checkpoint_id)
        : undefined,
    };
  }

  private async parsePendingWrites(threadId: string, checkpointNs: string, checkpointId: string): Promise<Array<PendingWriteTuple>> {
    const rows = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint-writes",
      limit: PAGE_SIZE,
      extraPredicates: [{ path: "$.checkpoint_id", equals: checkpointId }],
    });

    return rows
      .flatMap((row) => {
        const writeEnvelope = this.parseWriteState(row);
        const decoded = decodeBase64(writeEnvelope.writes.data);
        return normalizeTupleWrites(decoded);
      })
      .filter((entry): entry is PendingWriteTuple =>
        Array.isArray(entry) && entry.length === 3 && typeof entry[0] === "string" && typeof entry[1] === "string");
  }

  private async getLatestCheckpoint(threadId: string, checkpointNs: string): Promise<StoredState | undefined> {
    const rows = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint",
      limit: 1,
    });

    return rows[0];
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);

    const configuredCheckpointId = getCheckpointId(config);
    let state: StoredState | undefined;

    if (configuredCheckpointId) {
      const stateKey = createStateKey(
        this.stateKeyPrefix,
        threadId,
        checkpointNs,
        configuredCheckpointId,
      );
      try {
        state = (await this.client.getState(stateKey)) as unknown as StoredState;
      } catch {
        return undefined;
      }
    } else {
      state = await this.getLatestCheckpoint(threadId, checkpointNs);
    }

    if (!state) return undefined;

    const tuple = this.parseCheckpointTuple(state);
    const pendingWrites = await this.parsePendingWrites(
      threadId,
      checkpointNs,
      ensureString(this.parseCheckpointState(state).checkpoint_id),
    );

    return pendingWrites.length ? { ...tuple, pendingWrites } : tuple;
  }

  async *list(config: RunnableConfig, options: ListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const limit = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, PAGE_SIZE);

    const records = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint",
      limit,
      after: options.after,
      before: options.before,
      filter: options.filter,
    });

    const filtered = records.slice(0, limit);

    for (const state of filtered) {
      const tuple = this.parseCheckpointTuple(state);
      const pendingWrites = await this.parsePendingWrites(
        threadId,
        checkpointNs,
        ensureString(this.parseCheckpointState(state).checkpoint_id),
      );

      yield pendingWrites.length
        ? { ...tuple, pendingWrites }
        : tuple;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: unknown = null,
    newVersions: JsonObject = {},
  ): Promise<RunnableConfig> {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const checkpointId = extractCheckpointId(checkpoint) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const parentCheckpointId = getCheckpointId(config) || null;

    const checkpointVersions = extractVersions(checkpoint);
    const versionData = Object.keys(newVersions ?? {}).length > 0 ? newVersions : checkpointVersions;

    await this.client.upsertState(createStateKey(this.stateKeyPrefix, threadId, checkpointNs, checkpointId), {
      agent_id: this.agentId,
      data: {
        kind: "checkpoint",
        runtime: BASE_RUNTIME,
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
        parent_checkpoint_id: parentCheckpointId,
        checkpoint: {
          encoding: "base64-json",
          data: encodeBase64(checkpoint),
        },
        metadata: {
          encoding: "base64-json",
          data: encodeBase64(metadata),
        },
        versions: versionData,
      },
      metadata: {
        runtime: BASE_RUNTIME,
        kind: "checkpoint",
      },
      tags: toTags("checkpoint", threadId),
    });

    return buildConfig(threadId, checkpointNs, checkpointId);
  }

  async putWrites(
    config: RunnableConfig,
    writes: unknown,
    taskId: string,
    taskPath = "",
  ): Promise<void> {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const checkpointId = getCheckpointId(config);

    if (!checkpointId) {
      throw new Error("Cannot save pending writes without checkpoint_id in config");
    }

    const pendingWrites = normalizePendingWrites(writes, taskId);

    await this.client.upsertState(
      createWriteStateKey(this.stateKeyPrefix, threadId, checkpointNs, checkpointId, taskId),
      {
        agent_id: this.agentId,
        data: {
          kind: "checkpoint-writes",
          runtime: BASE_RUNTIME,
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
          task_id: taskId,
          task_path: taskPath,
          writes: {
            encoding: "base64-json",
            data: encodeBase64(pendingWrites),
          },
        },
        metadata: {
          runtime: BASE_RUNTIME,
          kind: "checkpoint-write",
        },
        tags: toTags("checkpoint-write", threadId),
      },
    );
  }

  async deleteThread(threadId: string): Promise<void> {
    const checkpoints = await this.queryRecords(threadId, null, {
      kind: "checkpoint",
      limit: 1000000,
    });

    const writes = await this.queryRecords(threadId, null, {
      kind: "checkpoint-writes",
      limit: 1000000,
    });

    const keys = [...checkpoints, ...writes].map((state) => state.state_key);

    await Promise.all(
      keys.map((key) => this.client.deleteState(key).catch(() => undefined)),
    );
  }
}
