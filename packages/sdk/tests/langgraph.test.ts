import { describe, expect, it, vi } from "vitest";

import { AgentStateError } from "../src/index";
import { AgentStateCheckpointSaver } from "../src/langgraph";

const CHECKPOINT_STATE = {
  state_key: "agentstate/langgraph/thread-1/default/cp-1",
  data: {
    kind: "checkpoint",
    runtime: "langgraph",
    thread_id: "thread-1",
    checkpoint_ns: "",
    checkpoint_id: "cp-1",
    parent_checkpoint_id: null,
    checkpoint: { encoding: "base64-json", data: "eyJzdGF0ZXMiOnt9fQ==" },
    metadata: { encoding: "base64-json", data: "e30=" },
    versions: {},
  },
  metadata: {},
  latest_sequence: 2,
};

const SECOND_STATE = {
  ...CHECKPOINT_STATE,
  state_key: "agentstate/langgraph/thread-1/default/cp-2",
  data: {
    ...CHECKPOINT_STATE.data,
    checkpoint_id: "cp-2",
    checkpoint: { encoding: "base64-json", data: "eyJ2IjoiYW5vdGhlciJ9" },
  },
  latest_sequence: 1,
};

describe("AgentState LangGraph saver", () => {
  it("stores checkpoints and pending writes in dedicated v2 envelopes", async () => {
    const client = {
      upsertState: vi.fn().mockResolvedValue(undefined),
    };

    const saver = new AgentStateCheckpointSaver(client as any, { agentId: "agentstate-sdk" });
    await saver.put(
      { configurable: { thread_id: "thread-1", checkpoint_ns: "" } },
      { id: "cp-1" },
      { tag: "initial" },
      {},
    );
    await saver.putWrites(
      { configurable: { thread_id: "thread-1", checkpoint_id: "cp-1" } },
      [["messages", "hello"]],
      "task-1",
    );

    expect(client.upsertState).toHaveBeenCalledTimes(2);
    expect((client.upsertState as any).mock.calls[1][0]).toContain("/writes/cp-1/task-1");
  });

  it("lists checkpoints before a cursor config", async () => {
    const client = {
      queryStates: vi
        .fn()
        .mockResolvedValueOnce({
          data: [CHECKPOINT_STATE, SECOND_STATE],
          pagination: { next_cursor: null },
        })
        .mockResolvedValueOnce({ data: [], pagination: { next_cursor: null } })
        .mockResolvedValueOnce({ data: [], pagination: { next_cursor: null } }),
      getState: vi.fn(),
      upsertState: vi.fn(),
      deleteState: vi.fn(),
    };

    const saver = new AgentStateCheckpointSaver(client as any);

    const tuples = [];
    for await (const tuple of saver.list(
      { configurable: { thread_id: "thread-1" } },
      { before: { configurable: { thread_id: "thread-1", checkpoint_id: "cp-1" } } },
    )) {
      tuples.push(tuple);
    }

    expect(tuples.length).toBe(1);
    expect(tuples[0].config.configurable.checkpoint_id).toBe("cp-2");
  });

  it("supports list filter predicates", async () => {
    const first = { ...CHECKPOINT_STATE, data: { ...CHECKPOINT_STATE.data, runtime: "langgraph" } };
    const second = {
      ...CHECKPOINT_STATE,
      state_key: "agentstate/langgraph/thread-1/default/cp-filtered",
      data: { ...CHECKPOINT_STATE.data, runtime: "legacy" },
      latest_sequence: 1,
    };

    const client = {
      queryStates: vi
        .fn()
        .mockResolvedValueOnce({
          data: [first, second],
          pagination: { next_cursor: null },
        })
        .mockResolvedValue({
          data: [],
          pagination: { next_cursor: null },
        }),
      getState: vi.fn(),
      upsertState: vi.fn(),
      deleteState: vi.fn(),
    };

    const saver = new AgentStateCheckpointSaver(client as any);
    const tuples = [];
    for await (const tuple of saver.list(
      { configurable: { thread_id: "thread-1" } },
      { filter: { runtime: "langgraph" } },
    )) {
      tuples.push(tuple);
    }

    expect((client.queryStates as any).mock.calls[0][0].predicates).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "$.runtime", equals: "langgraph" })]),
    );
    expect(tuples.length).toBe(1);
    expect(tuples[0].config.configurable.checkpoint_id).toBe("cp-1");
  });

  it("returns undefined only for missing configured checkpoints", async () => {
    const missingClient = {
      getState: vi.fn().mockRejectedValue(new AgentStateError("missing", "NOT_FOUND", 404)),
      queryStates: vi.fn(),
      upsertState: vi.fn(),
      deleteState: vi.fn(),
    };
    const missingSaver = new AgentStateCheckpointSaver(missingClient as any);

    await expect(
      missingSaver.getTuple({ configurable: { thread_id: "thread-1", checkpoint_id: "missing" } }),
    ).resolves.toBeUndefined();

    const failedClient = {
      getState: vi.fn().mockRejectedValue(new AgentStateError("denied", "UNAUTHORIZED", 401)),
      queryStates: vi.fn(),
      upsertState: vi.fn(),
      deleteState: vi.fn(),
    };
    const failedSaver = new AgentStateCheckpointSaver(failedClient as any);

    await expect(
      failedSaver.getTuple({ configurable: { thread_id: "thread-1", checkpoint_id: "cp-1" } }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("deletes checkpoints and write rows for an entire thread", async () => {
    const writeState = {
      state_key: "agentstate/langgraph/thread-1/default/writes/cp-1/task-1",
      data: {
        kind: "checkpoint-writes",
        runtime: "langgraph",
        thread_id: "thread-1",
        checkpoint_ns: "",
        checkpoint_id: "cp-1",
        task_id: "task-1",
        task_path: "",
        writes: { encoding: "base64-json", data: "W10=" },
      },
      metadata: {},
      latest_sequence: 3,
    };
    const client = {
      queryStates: vi
        .fn()
        .mockResolvedValueOnce({
          data: [writeState],
          pagination: { next_cursor: null },
        })
        .mockResolvedValueOnce({
          data: [CHECKPOINT_STATE, SECOND_STATE],
          pagination: { next_cursor: null },
        }),
      deleteState: vi.fn().mockResolvedValue(undefined),
      upsertState: vi.fn(),
      getState: vi.fn(),
    };

    const saver = new AgentStateCheckpointSaver(client as any);
    await saver.deleteThread("thread-1");

    expect(client.deleteState).toHaveBeenCalledTimes(3);
  });

  it("fails thread deletion when any state delete fails", async () => {
    const client = {
      queryStates: vi
        .fn()
        .mockResolvedValueOnce({
          data: [],
          pagination: { next_cursor: null },
        })
        .mockResolvedValueOnce({
          data: [CHECKPOINT_STATE],
          pagination: { next_cursor: null },
        }),
      deleteState: vi.fn().mockRejectedValue(new Error("delete failed")),
      upsertState: vi.fn(),
      getState: vi.fn(),
    };

    const saver = new AgentStateCheckpointSaver(client as any);

    await expect(saver.deleteThread("thread-1")).rejects.toThrow("Failed to delete");
  });
});
