"""Tests for AgentState LangGraph checkpoint adapters."""

from __future__ import annotations

import base64
import json
from unittest.mock import Mock

import pytest

from agentstate.exceptions import NotFoundError
from agentstate.langgraph import AgentStateCheckpointSaver, AsyncAgentStateCheckpointSaver


def _encode(value):
    return {
        "encoding": "base64-json",
        "data": base64.b64encode(json.dumps(value, separators=(",", ":")).encode()).decode(),
    }


def _checkpoint_record(checkpoint_id, thread_id="thread-1", checkpoint_ns=""):
    return {
        "state_key": f"agentstate/langgraph/{thread_id}/{checkpoint_ns or 'default'}/{checkpoint_id}",
        "data": {
            "kind": "checkpoint",
            "runtime": "langgraph",
            "thread_id": thread_id,
            "checkpoint_ns": checkpoint_ns,
            "checkpoint_id": checkpoint_id,
            "parent_checkpoint_id": None,
            "checkpoint": _encode({"state": f"checkpoint-{checkpoint_id}"}),
            "metadata": _encode({}),
            "versions": {},
        },
        "metadata": {"runtime": "langgraph", "kind": "checkpoint"},
        "latest_sequence": 100,
    }


def _pending_write_record(checkpoint_id, thread_id="thread-1", task_id="task-1", checkpoint_ns=""):
    return {
        "state_key": f"agentstate/langgraph/{thread_id}/{checkpoint_ns or 'default'}/writes/{checkpoint_id}/{task_id}",
        "data": {
            "kind": "checkpoint-writes",
            "runtime": "langgraph",
            "thread_id": thread_id,
            "checkpoint_ns": checkpoint_ns,
            "checkpoint_id": checkpoint_id,
            "task_id": task_id,
            "task_path": "",
            "writes": _encode([["", "messages", {"agent": "ok"}]]),
        },
        "metadata": {"kind": "checkpoint-write", "task_id": task_id, "checkpoint_id": checkpoint_id},
        "latest_sequence": 99,
    }


def test_sync_put_and_put_writes_store_expected_payload():
    client = Mock()
    client.upsert_state = Mock()

    saver = AgentStateCheckpointSaver(client)
    checkpoint = {"id": "cp-1"}
    saver.put({"configurable": {"thread_id": "thread-1", "checkpoint_id": "cp-1"}}, checkpoint, {}, {})
    saver.put_writes({"configurable": {"thread_id": "thread-1", "checkpoint_ns": "", "checkpoint_id": "cp-1"}}, [("messages", "x")], "task-1")

    assert client.upsert_state.call_count == 2
    checkpoint_key = client.upsert_state.call_args_list[0].args[0]
    writes_key = client.upsert_state.call_args_list[1].args[0]
    assert checkpoint_key.startswith("agentstate/langgraph/thread-1/")
    assert writes_key.endswith("/writes/cp-1/task-1")


def test_sync_get_tuple_includes_pending_writes():
    client = Mock()
    client.get_state = Mock(return_value=_checkpoint_record("cp-1"))
    client.query_states = Mock(return_value={"data": [_pending_write_record("cp-1")]})

    saver = AgentStateCheckpointSaver(client)
    result = saver.get_tuple({"configurable": {"thread_id": "thread-1", "checkpoint_id": "cp-1"}})

    assert result is not None
    config, checkpoint, metadata, parent_config, pending_writes = result
    assert config["configurable"]["checkpoint_id"] == "cp-1"
    assert isinstance(checkpoint, dict)
    assert checkpoint.get("state") == "checkpoint-cp-1"
    assert metadata == {}
    assert parent_config is None
    assert pending_writes is not None
    assert pending_writes[0][1] == "messages"


def test_sync_get_tuple_returns_none_only_for_missing_checkpoint():
    client = Mock()
    client.get_state = Mock(side_effect=NotFoundError("missing"))

    saver = AgentStateCheckpointSaver(client)
    result = saver.get_tuple({"configurable": {"thread_id": "thread-1", "checkpoint_id": "missing"}})

    assert result is None


def test_sync_get_tuple_raises_non_missing_errors():
    client = Mock()
    client.get_state = Mock(side_effect=RuntimeError("network down"))

    saver = AgentStateCheckpointSaver(client)

    with pytest.raises(RuntimeError):
        saver.get_tuple({"configurable": {"thread_id": "thread-1", "checkpoint_id": "cp-1"}})


def test_sync_list_with_before_filter():
    first = _checkpoint_record("cp-1")
    second = _checkpoint_record("cp-2")
    first["latest_sequence"] = 2
    second["latest_sequence"] = 3
    client = Mock()
    client.query_states = Mock(
        side_effect=[
            {"data": [first, second], "pagination": {"next_cursor": None}},
            {"data": [_pending_write_record("cp-2"), _pending_write_record("cp-1")]},
        ]
    )
    saver = AgentStateCheckpointSaver(client)

    entries = list(
        saver.list(
            {"configurable": {"thread_id": "thread-1"}},
            before={"configurable": {"thread_id": "thread-1", "checkpoint_id": "cp-2"}},
        )
    )

    assert len(entries) == 1
    assert entries[0][0]["configurable"]["checkpoint_id"] == "cp-1"


def test_sync_list_with_filter():
    first = _checkpoint_record("cp-1")
    second = _checkpoint_record("cp-2")
    first["data"]["runtime"] = "langgraph"
    second["data"]["runtime"] = "legacy"
    client = Mock()
    client.query_states = Mock(return_value={"data": [first, second], "pagination": {"next_cursor": None}})
    client.get_state = Mock()
    client.upsert_state = Mock()
    client.delete_state = Mock()

    saver = AgentStateCheckpointSaver(client)
    entries = list(
        saver.list(
            {"configurable": {"thread_id": "thread-1"}},
            filter={"runtime": "langgraph"},
        )
    )

    assert len(entries) == 1
    assert entries[0][0]["configurable"]["checkpoint_id"] == "cp-1"


def test_sync_delete_thread_uses_namespace_unaware_query():
    checkpoint_default = _checkpoint_record("cp-1", checkpoint_ns="")
    checkpoint_other = _checkpoint_record("cp-2", checkpoint_ns="subflow")
    writes = _pending_write_record("cp-1")
    client = Mock()
    client.query_states = Mock(
        side_effect=[
            {"data": [writes], "pagination": {"next_cursor": None}},
            {"data": [checkpoint_default, checkpoint_other], "pagination": {"next_cursor": None}},
        ]
    )
    client.delete_state = Mock()

    saver = AgentStateCheckpointSaver(client)
    saver.delete_thread("thread-1")

    assert client.query_states.call_count == 2
    assert client.delete_state.call_count == 3
    deleted_keys = [call.args[0] for call in client.delete_state.call_args_list if call.args]
    assert any("cp-1" in str(key) for key in deleted_keys)
    assert any("cp-2" in str(key) for key in deleted_keys)


@pytest.mark.asyncio
async def test_async_saver_delegates_to_sync():
    client = Mock()
    client.query_states = Mock(return_value={"data": [_checkpoint_record("cp-1")]})
    async_saver = AsyncAgentStateCheckpointSaver(client)

    tuple_config = {"configurable": {"thread_id": "thread-1"}}
    async_saver._sync.get_tuple = Mock(return_value=(tuple_config, {}, {}, None, None))
    async_saver._sync.put = Mock(return_value={"configurable": {"thread_id": "thread-1"}})
    async_saver._sync.put_writes = Mock(return_value=None)
    async_saver._sync.delete_thread = Mock(return_value=None)
    async_saver._sync.list = Mock(
        return_value=iter(
            [
                (tuple_config, {}, {}, None, None),
                ({"configurable": {"thread_id": "thread-2"}}, {}, {}, None, None),
            ]
        )
    )

    tuple_value = await async_saver.aget_tuple({"configurable": {"thread_id": "thread-1"}})
    assert tuple_value[0]["configurable"]["thread_id"] == "thread-1"

    new_config = await async_saver.aput(
        {"configurable": {"thread_id": "thread-1"}},
        {"id": "cp-new"},
        {},
        {},
    )
    assert new_config["configurable"]["thread_id"] == "thread-1"

    await async_saver.aput_writes({"configurable": {"thread_id": "thread-1", "checkpoint_id": "cp-1"}}, [("messages", "x")], "task-1")
    await async_saver.adelete_thread("thread-1")

    rows = []
    async for item in async_saver.alist({"configurable": {"thread_id": "thread-1"}}):
        rows.append(item)
    assert len(rows) == 2


# -------------------------------------------------------------------------
# In-memory fake client for cursor-following / integration tests
# -------------------------------------------------------------------------


class FakeStateClient:
    """Minimal in-memory stand-in for AgentStateClient state methods.

    Emulates predicate filtering (by ``$.kind`` / ``$.thread_id`` / …) and
    cursor pagination so the checkpoint saver can be exercised end to end.
    """

    def __init__(self):
        self.records = {}
        self._seq = 0

    def upsert_state(self, state_key, body, idempotency_key=None):
        self._seq += 1
        self.records[state_key] = {
            "state_key": state_key,
            "data": body["data"],
            "metadata": body.get("metadata", {}),
            "latest_sequence": self._seq,
        }
        return self.records[state_key]

    def get_state(self, state_key, **kwargs):
        rec = self.records.get(state_key)
        if rec is None:
            raise NotFoundError("missing")
        return rec

    def delete_state(self, state_key, **kwargs):
        self.records.pop(state_key, None)
        return {"deleted": True}

    def query_states(self, query):
        preds = query.get("predicates", [])

        def matches(rec):
            data = rec["data"]
            return all(data.get(p["path"][2:]) == p["equals"] for p in preds)

        rows = sorted(
            (r for r in self.records.values() if matches(r)),
            key=lambda r: r["latest_sequence"],
            reverse=True,
        )
        page_size = query.get("limit") or len(rows) or 1
        start = int(query.get("cursor") or 0)
        page = rows[start : start + page_size]
        next_cursor = str(start + page_size) if start + page_size < len(rows) else None
        return {"data": page, "pagination": {"next_cursor": next_cursor}}


def test_list_follows_cursor_beyond_single_page():
    """list() must page past the 100-row API cap up to the requested limit (#270)."""
    client = FakeStateClient()
    saver = AgentStateCheckpointSaver(client)
    for i in range(150):
        saver.put(
            {"configurable": {"thread_id": "t", "checkpoint_ns": ""}},
            {"id": f"cp-{i:03d}"},
            {},
            {},
        )

    entries = list(saver.list({"configurable": {"thread_id": "t"}}, limit=150))
    assert len(entries) == 150
    checkpoint_ids = {e[0]["configurable"]["checkpoint_id"] for e in entries}
    assert len(checkpoint_ids) == 150


def test_list_unbounded_returns_all_records():
    """list() with no limit returns every checkpoint, not a clamped page (#270)."""
    client = FakeStateClient()
    saver = AgentStateCheckpointSaver(client)
    for i in range(120):
        saver.put(
            {"configurable": {"thread_id": "t", "checkpoint_ns": ""}},
            {"id": f"cp-{i:03d}"},
            {},
            {},
        )

    entries = list(saver.list({"configurable": {"thread_id": "t"}}))
    assert len(entries) == 120


# -------------------------------------------------------------------------
# Real LangGraph integration (skipped when langgraph is not installed) — #265
# -------------------------------------------------------------------------


def test_saver_subclasses_real_base_when_langgraph_installed():
    base = pytest.importorskip("langgraph.checkpoint.base")
    assert issubclass(AgentStateCheckpointSaver, base.BaseCheckpointSaver)
    assert issubclass(AsyncAgentStateCheckpointSaver, base.BaseCheckpointSaver)
    saver = AgentStateCheckpointSaver(FakeStateClient())
    assert isinstance(saver, base.BaseCheckpointSaver)


def test_compiles_and_runs_real_stategraph():
    """Compile a real StateGraph with the saver and exercise persist + resume."""
    graph_mod = pytest.importorskip("langgraph.graph")
    from typing_extensions import TypedDict

    class State(TypedDict):
        count: int

    def increment(state):
        return {"count": state["count"] + 1}

    client = FakeStateClient()
    saver = AgentStateCheckpointSaver(client)

    builder = graph_mod.StateGraph(State)
    builder.add_node("increment", increment)
    builder.add_edge(graph_mod.START, "increment")
    builder.add_edge("increment", graph_mod.END)
    app = builder.compile(checkpointer=saver)

    config = {"configurable": {"thread_id": "integration-thread"}}
    first = app.invoke({"count": 0}, config)
    assert first["count"] == 1

    # Resume: reading back the persisted checkpoint must work (requires a real
    # CheckpointTuple, not a bare tuple).
    resumed = app.invoke({"count": 0}, config)
    assert resumed["count"] == 1

    snapshot = app.get_state(config)
    assert snapshot.values["count"] == 1

    history = list(app.get_state_history(config))
    assert len(history) >= 1
