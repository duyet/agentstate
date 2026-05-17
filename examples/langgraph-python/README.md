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

Install with:

```bash
pip install agentstate[langgraph]
```
