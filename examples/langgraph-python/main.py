"""LangGraph example for AgentState Python SDK."""

from __future__ import annotations

import sys
from typing import Dict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SDK_PATH = ROOT / "packages" / "python-sdk"
if str(SDK_PATH) not in sys.path:
    sys.path.insert(0, str(SDK_PATH))

from agentstate import AgentStateClient
from agentstate.langgraph import AgentStateCheckpointSaver


def run_langgraph_example(
    client: AgentStateClient,
    *,
    thread_id: str = "langgraph-python-thread-1",
    checkpoint_id: str = "checkpoint-start",
    cleanup: bool = False,
) -> Dict[str, object]:
    """Run a complete LangGraph checkpoint flow using a mockable AgentState client."""

    saver = AgentStateCheckpointSaver(client)

    next_config = saver.put(
        {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}},
        {"id": checkpoint_id, "values": {"phase": "start"}},
        {"note": "sdk example checkpoint"},
        {},
    )

    saver.put_writes(
        next_config,
        [("messages", {"role": "assistant", "content": "Hello from LangGraph example"})],
        "task-ui-example",
    )

    row = saver.get_tuple(next_config)
    if row is None:
        raise RuntimeError("Unable to load saved checkpoint tuple")

    config, checkpoint, _metadata, _parent, pending_writes = row
    result: Dict[str, object] = {
        "thread_id": thread_id,
        "checkpoint_id": config["configurable"]["checkpoint_id"],
        "checkpoint_values": checkpoint,
        "pending_writes": pending_writes or [],
    }

    if cleanup:
        saver.delete_thread(thread_id)

    return result


def main() -> None:
    """Run the example from CLI with a live API key."""

    import os

    api_key = os.environ.get("AGENTSTATE_API_KEY")
    if not api_key:
        raise RuntimeError("AGENTSTATE_API_KEY is required")

    client = AgentStateClient(api_key=api_key)
    result = run_langgraph_example(client)
    print(result)


if __name__ == "__main__":
    main()
