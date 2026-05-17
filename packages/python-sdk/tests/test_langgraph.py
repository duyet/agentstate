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
