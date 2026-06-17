# LangGraph (Python) Adapter Example

Use AgentState as a LangGraph saver from Python with `agentstate[langgraph]`.

```python
from agentstate import AgentStateClient
from agentstate.langgraph import AgentStateCheckpointSaver, AsyncAgentStateCheckpointSaver

client = AgentStateClient(api_key="as_live_...")

saver = AgentStateCheckpointSaver(client)

config = {"configurable": {"thread_id": "thread-1", "checkpoint_ns": ""}}
checkpoint = {"id": "cp-1", "values": {"step": "start"}}
next_config = saver.put(config, checkpoint, {"note": "checkpoint created"}, {})

saver.put_writes(
    next_config,
    [("messages", {"role": "assistant", "content": "hello"})],
    task_id="task-main",
)

tuple_value = saver.get_tuple(next_config)
print(tuple_value[0]["configurable"]["checkpoint_id"])
```

## AI-Powered Title Generation

After creating a conversation you can ask the API to generate a title from the
message content:

```python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

conv = client.create_conversation(
    messages=[
        {"role": "user", "content": "How does LangGraph handle state checkpointing?"},
        {"role": "assistant", "content": "LangGraph uses checkpoint savers to persist graph state..."},
    ]
)

result = client.generate_title(conv["id"])
print(result["title"])  # e.g. "LangGraph State Checkpointing"
```

## State Lease Round-Trip

Leases let you claim exclusive write access to a state key for a bounded window:

```python
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

# Acquire a 30-second exclusive lease
lease = client.create_state_lease("agent:worker-1:task", holder="worker-1", ttl_ms=30_000)
lease_id = lease["id"]

# Write state while holding the lease
client.upsert_state(
    "agent:worker-1:task",
    {
        "agent_id": "worker-1",
        "data": {"status": "running"},
        "lease_id": lease_id,
    },
)

# Extend the lease if needed
client.renew_state_lease(lease_id, ttl_ms=30_000)

# Release when done
client.release_state_lease(lease_id)
```

Install with:

```bash
pip install agentstate[langgraph]
```
