"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/langgraph.ts
var langgraph_exports = {};
__export(langgraph_exports, {
  AgentStateCheckpointSaver: () => AgentStateCheckpointSaver
});
module.exports = __toCommonJS(langgraph_exports);
var import_langgraph_checkpoint = require("@langchain/langgraph-checkpoint");

// src/index.ts
var AgentStateError = class extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "AgentStateError";
    this.code = code;
    this.status = status;
  }
};

// src/langgraph.ts
var DEFAULT_NAMESPACE = "";
var DEFAULT_AGENT_ID = "agentstate-sdk";
var DEFAULT_PREFIX = "agentstate/langgraph";
var DEFAULT_LIST_LIMIT = 50;
var PAGE_SIZE = 100;
var BASE_RUNTIME = "langgraph";
function checkpointIdFromConfig(value) {
  if (!value) return "";
  return typeof value === "string" ? value : getCheckpointId(value);
}
function kindToTag(kind) {
  return kind === "checkpoint-writes" ? "checkpoint-write" : "checkpoint";
}
function encodeBase64(value) {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}
function decodeBase64(data) {
  if (typeof Buffer !== "undefined") {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  }
  return JSON.parse(decodeURIComponent(escape(atob(data))));
}
function normalizeNamespace(value) {
  return value || DEFAULT_NAMESPACE;
}
function normalizeNamespaceForKey(value) {
  return normalizeNamespace(value) || "default";
}
function createStateKey(prefix, threadId, checkpointNs, checkpointId) {
  return `${prefix}/${threadId}/${normalizeNamespaceForKey(checkpointNs)}/${checkpointId}`;
}
function createWriteStateKey(prefix, threadId, checkpointNs, checkpointId, taskId) {
  return `${prefix}/${threadId}/${normalizeNamespaceForKey(checkpointNs)}/writes/${checkpointId}/${taskId}`;
}
function toTags(runtime, threadId) {
  return [`agentstate:${BASE_RUNTIME}`, `agentstate:${runtime}`, `agentstate:thread:${threadId}`];
}
function ensureString(value) {
  return typeof value === "string" ? value : "";
}
function getConfigurable(config) {
  return config.configurable ?? {};
}
function getThreadId(config) {
  const configurable = getConfigurable(config);
  if (typeof configurable.thread_id !== "string" || !configurable.thread_id) {
    throw new Error("LangGraph config missing required configurable.thread_id");
  }
  return configurable.thread_id;
}
function getCheckpointId(config) {
  return ensureString(getConfigurable(config).checkpoint_id);
}
function getStateKeyPrefix(config) {
  return normalizeNamespace(ensureString(getConfigurable(config).checkpoint_ns));
}
function buildConfig(threadId, checkpointNs, checkpointId) {
  return {
    configurable: {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpointId
    }
  };
}
function extractVersions(checkpoint) {
  if (!checkpoint || typeof checkpoint !== "object") {
    return {};
  }
  const raw = checkpoint;
  const channelVersions = raw.channel_versions ?? {};
  const runtimeVersions = raw.versions ?? {};
  return { ...channelVersions, ...runtimeVersions };
}
function normalizePendingWrites(writes, taskId) {
  if (!Array.isArray(writes)) return [];
  const entries = [];
  for (const item of writes) {
    if (!Array.isArray(item)) continue;
    const tuple = item;
    if (tuple.length === 2 && typeof tuple[0] === "string") {
      entries.push([taskId, tuple[0], tuple[1]]);
      continue;
    }
    if (tuple.length >= 3 && typeof tuple[0] === "string" && typeof tuple[1] === "string") {
      entries.push([tuple[0], tuple[1], tuple[2]]);
    }
  }
  return entries;
}
function normalizeTupleWrites(value) {
  if (!Array.isArray(value)) return [];
  const output = [];
  for (const item of value) {
    if (!Array.isArray(item)) continue;
    const tuple = item;
    if (tuple.length >= 3 && typeof tuple[0] === "string" && typeof tuple[1] === "string") {
      output.push([tuple[0], tuple[1], tuple[2]]);
    }
  }
  return output;
}
function extractCheckpointId(checkpoint) {
  return ensureString(checkpoint.id);
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => deepEqual(value, right[index]));
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
  }
  return false;
}
function matchesFilter(data, filter) {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => {
    const dataKey = key.startsWith("$.") ? key.slice(2) : key;
    return deepEqual(data[dataKey], value);
  });
}
function isMissingState(error) {
  return error instanceof AgentStateError && error.status === 404;
}
var AgentStateCheckpointSaver = class extends import_langgraph_checkpoint.BaseCheckpointSaver {
  client;
  agentId;
  stateKeyPrefix;
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.agentId = options.agentId ?? DEFAULT_AGENT_ID;
    this.stateKeyPrefix = options.stateKeyPrefix ?? DEFAULT_PREFIX;
  }
  async queryRecords(threadId, checkpointNs, options) {
    const limit = options.limit;
    const collected = [];
    let cursor;
    const normalizedBefore = checkpointIdFromConfig(options.before);
    const normalizedAfter = checkpointIdFromConfig(options.after);
    const filterPredicates = options.filter ? Object.entries(options.filter).map(([key, value]) => ({
      path: key.startsWith("$.") ? key : `$.${key}`,
      equals: value
    })) : [];
    const kindPredicates = [
      { path: "$.kind", equals: options.kind },
      { path: "$.runtime", equals: BASE_RUNTIME },
      { path: "$.thread_id", equals: threadId }
    ];
    if (checkpointNs !== null) {
      kindPredicates.push({ path: "$.checkpoint_ns", equals: checkpointNs });
    }
    const predicates = options.extraPredicates ? kindPredicates.concat(options.extraPredicates) : kindPredicates;
    const filteredPredicates = filterPredicates.length ? predicates.concat(filterPredicates) : predicates;
    while (limit === void 0 || collected.length < limit) {
      const response = await this.client.queryStates({
        agent_id: this.agentId,
        tags: toTags(kindToTag(options.kind), threadId),
        predicates: filteredPredicates,
        limit: limit === void 0 ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - collected.length),
        cursor
      });
      const rows = response.data ?? [];
      collected.push(
        ...rows.filter((row) => matchesFilter(row.data, options.filter))
      );
      const nextCursor = response.pagination?.next_cursor;
      if (!nextCursor || rows.length === 0) {
        break;
      }
      cursor = nextCursor;
    }
    const sorted = collected.slice().sort((left, right) => right.latest_sequence - left.latest_sequence);
    const deduped = [];
    const seen = /* @__PURE__ */ new Set();
    for (const row of sorted) {
      if (seen.has(row.state_key)) continue;
      seen.add(row.state_key);
      deduped.push(row);
    }
    let filtered = deduped;
    if (normalizedBefore && options.kind === "checkpoint") {
      const beforeState = filtered.findIndex((state) => {
        const tuple = this.parseCheckpointState(state);
        return tuple.checkpoint_id === normalizedBefore;
      });
      if (beforeState >= 0) {
        filtered = filtered.slice(beforeState + 1);
      }
    }
    if (normalizedAfter && options.kind === "checkpoint") {
      const afterState = filtered.findIndex((state) => {
        const tuple = this.parseCheckpointState(state);
        return tuple.checkpoint_id === normalizedAfter;
      });
      if (afterState >= 0) {
        filtered = filtered.slice(0, afterState);
      }
    }
    return limit === void 0 ? filtered : filtered.slice(0, limit);
  }
  parseCheckpointState(state) {
    const data = state.data;
    if (data.kind !== "checkpoint" || data.runtime !== BASE_RUNTIME) {
      throw new Error("Invalid checkpoint state record");
    }
    return data;
  }
  parseWriteState(state) {
    const data = state.data;
    if (data.kind !== "checkpoint-writes" || data.runtime !== BASE_RUNTIME) {
      throw new Error("Invalid checkpoint write record");
    }
    return data;
  }
  parseCheckpointTuple(state) {
    const record = this.parseCheckpointState(state);
    return {
      config: buildConfig(record.thread_id, record.checkpoint_ns, record.checkpoint_id),
      checkpoint: decodeBase64(record.checkpoint.data),
      metadata: decodeBase64(record.metadata.data),
      parentConfig: record.parent_checkpoint_id ? buildConfig(record.thread_id, record.checkpoint_ns, record.parent_checkpoint_id) : void 0
    };
  }
  async parsePendingWrites(threadId, checkpointNs, checkpointId) {
    const rows = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint-writes",
      extraPredicates: [{ path: "$.checkpoint_id", equals: checkpointId }]
    });
    return rows.flatMap((row) => {
      const writeEnvelope = this.parseWriteState(row);
      const decoded = decodeBase64(writeEnvelope.writes.data);
      return normalizeTupleWrites(decoded);
    }).filter(
      (entry) => Array.isArray(entry) && entry.length === 3 && typeof entry[0] === "string" && typeof entry[1] === "string"
    );
  }
  async getLatestCheckpoint(threadId, checkpointNs) {
    const rows = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint",
      limit: 1
    });
    return rows[0];
  }
  async getTuple(config) {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const configuredCheckpointId = getCheckpointId(config);
    let state;
    if (configuredCheckpointId) {
      const stateKey = createStateKey(
        this.stateKeyPrefix,
        threadId,
        checkpointNs,
        configuredCheckpointId
      );
      try {
        state = await this.client.getState(stateKey);
      } catch (error) {
        if (!isMissingState(error)) throw error;
        return void 0;
      }
    } else {
      state = await this.getLatestCheckpoint(threadId, checkpointNs);
    }
    if (!state) return void 0;
    const tuple = this.parseCheckpointTuple(state);
    const pendingWrites = await this.parsePendingWrites(
      threadId,
      checkpointNs,
      ensureString(this.parseCheckpointState(state).checkpoint_id)
    );
    return pendingWrites.length ? { ...tuple, pendingWrites } : tuple;
  }
  async *list(config, options = {}) {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const limit = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, PAGE_SIZE);
    const records = await this.queryRecords(threadId, checkpointNs, {
      kind: "checkpoint",
      limit,
      after: options.after,
      before: options.before,
      filter: options.filter
    });
    const filtered = records.slice(0, limit);
    for (const state of filtered) {
      const tuple = this.parseCheckpointTuple(state);
      const pendingWrites = await this.parsePendingWrites(
        threadId,
        checkpointNs,
        ensureString(this.parseCheckpointState(state).checkpoint_id)
      );
      yield pendingWrites.length ? { ...tuple, pendingWrites } : tuple;
    }
  }
  async put(config, checkpoint, metadata = null, newVersions = {}) {
    const threadId = getThreadId(config);
    const checkpointNs = getStateKeyPrefix(config);
    const checkpointId = extractCheckpointId(checkpoint) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const parentCheckpointId = getCheckpointId(config) || null;
    const checkpointVersions = extractVersions(checkpoint);
    const versionData = Object.keys(newVersions ?? {}).length > 0 ? newVersions : checkpointVersions;
    await this.client.upsertState(
      createStateKey(this.stateKeyPrefix, threadId, checkpointNs, checkpointId),
      {
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
            data: encodeBase64(checkpoint)
          },
          metadata: {
            encoding: "base64-json",
            data: encodeBase64(metadata)
          },
          versions: versionData
        },
        metadata: {
          runtime: BASE_RUNTIME,
          kind: "checkpoint"
        },
        tags: toTags("checkpoint", threadId)
      }
    );
    return buildConfig(threadId, checkpointNs, checkpointId);
  }
  async putWrites(config, writes, taskId, taskPath = "") {
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
            data: encodeBase64(pendingWrites)
          }
        },
        metadata: {
          runtime: BASE_RUNTIME,
          kind: "checkpoint-write"
        },
        tags: toTags("checkpoint-write", threadId)
      }
    );
  }
  async deleteRecords(threadId, kind) {
    let cursor;
    while (true) {
      const response = await this.client.queryStates({
        agent_id: this.agentId,
        tags: toTags(kindToTag(kind), threadId),
        predicates: [
          { path: "$.kind", equals: kind },
          { path: "$.runtime", equals: BASE_RUNTIME },
          { path: "$.thread_id", equals: threadId }
        ],
        limit: PAGE_SIZE,
        cursor
      });
      const rows = response.data ?? [];
      if (!rows.length) return;
      const keys = Array.from(new Set(rows.map((state) => state.state_key)));
      const results = await Promise.allSettled(keys.map((key) => this.client.deleteState(key)));
      const failed = results.filter(
        (result) => result.status === "rejected"
      );
      if (failed.length) {
        const reasons = failed.map((result) => result.reason).map((reason) => reason instanceof Error ? reason.message : String(reason)).join("; ");
        throw new Error(`Failed to delete ${failed.length} ${kind} state record(s): ${reasons}`);
      }
      const nextCursor = response.pagination?.next_cursor;
      if (!nextCursor) return;
      cursor = nextCursor;
    }
  }
  async deleteThread(threadId) {
    await this.deleteRecords(threadId, "checkpoint-writes");
    await this.deleteRecords(threadId, "checkpoint");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentStateCheckpointSaver
});
