# AgentState Python SDK

Python client for [AgentState](https://agentstate.app) API — full parity with the TypeScript SDK.

## Installation

```bash
pip install agentstate
```

## Installation (with optional adapters)

```bash
pip install agentstate[langgraph]
```

The `langgraph` extra installs:

- `langgraph`
- `langgraph-checkpoint`

## Quick Start

```python
from agentstate import AgentStateClient

# Initialize client
client = AgentStateClient(api_key="as_live_...")

# Create a conversation
conversation = client.create_conversation(
    messages=[
        {"role": "user", "content": "Hello, AI!"},
        {"role": "assistant", "content": "Hi there!"}
    ],
    external_id="user-conversation-123",
    title="My Chat",
    metadata={"source": "web"}
)

print(f"Created conversation: {conversation['id']}")

# Get conversation details
conv = client.get_conversation(conversation["id"])
print(f"Messages: {conv['message_count']}")

# List conversations
result = client.list_conversations(limit=10)
for conv in result["data"]:
    print(f"{conv['id']}: {conv['message_count']} messages")

# Use context manager for automatic cleanup
with AgentStateClient(api_key="as_live_...") as client:
    client.create_conversation(messages=[{"role": "user", "content": "Hi"}])
```

## Error Handling

```python
from agentstate import AgentStateClient
from agentstate.exceptions import (
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    AgentStateError
)

try:
    client = AgentStateClient(api_key="invalid-key")
    client.create_conversation(messages=[{"role": "user", "content": "Hi"}])
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("Conversation not found")
except RateLimitError:
    print("Rate limit hit — back off and retry")
except ValidationError as e:
    print(f"Invalid input: {e}")
except AgentStateError as e:
    print(f"API error: {e}")
```

## Development

```bash
# Install in editable mode with dev deps
pip install -e ".[dev]"

# Run tests
pytest
```

## API Reference

### `AgentStateClient(api_key, base_url=BASE_URL, max_retries=3, retry_delay_ms=1000)`

Initialize the client. Automatically retries on HTTP 429 and 5xx with exponential backoff.

- `api_key`: Your AgentState API key (format: `as_live_...`)
- `base_url`: API base URL (default: `https://api.agentstate.app`)
- `max_retries`: Max retry attempts (default: 3)
- `retry_delay_ms`: Base delay between retries in ms (default: 1000)

---

### Conversations

#### `create_conversation(messages=None, external_id=None, title=None, metadata=None)`

Create a new conversation.

- `messages`: List of message dicts with `role` and `content` keys
- `external_id`: Optional external ID for deduplication
- `title`: Optional title
- `metadata`: Optional metadata dict

#### `get_conversation(conversation_id)`

Get conversation by ID.

#### `get_conversation_by_external_id(external_id)`

Get conversation by external ID (URL-encoded automatically).

#### `list_conversations(limit=20, cursor=None, order=None)`

List conversations with pagination. Returns dict with `data` and `pagination`.

#### `update_conversation(conversation_id, title=None, metadata=None)`

Update a conversation's title or metadata.

#### `delete_conversation(conversation_id)`

Delete a conversation. Returns `None`.

#### `append_messages(conversation_id, messages)`

Append messages to an existing conversation. Returns `{"messages": [...]}`.

#### `list_messages(conversation_id, limit=None, after=None)`

List messages in a conversation. Returns dict with `data` and `pagination`.

#### `export_conversations(ids=None)`

Export conversations with full message history. Pass `ids` to limit export.
Returns `{"data": [...], "count": N}`.

---

### AI Helpers

#### `generate_title(conversation_id)`

Generate a title for a conversation using AI. Returns `{"title": "..."}`.

#### `generate_follow_ups(conversation_id)`

Generate follow-up questions. Returns `{"questions": [...]}`.

---

### State Records

#### `upsert_state(state_key, state, idempotency_key=None)`

Create or replace a state record at `/v1/states/{key}`.

- `state_key`: Caller-defined key (namespaced, e.g. `agentstate/langgraph/thread-1/...`)
- `state`: Dict with at least `agent_id` and `data` fields
- `idempotency_key`: Optional idempotency key header

#### `get_state(state_key, at_sequence=None, at_time=None)`

Read the latest state for a key, or a historical version:

- `at_sequence` (int)
- `at_time` (int, epoch millis)

#### `query_states(query=None)`

Run a filtered state query against `/v1/states/query`.

#### `delete_state(state_key, lease_id=None, idempotency_key=None)`

Delete a state key. Supports optional lease validation and idempotency.

#### `list_state_events(state_key, after=0, limit=50, capability_token=None)`

Read event history for a state key. Pass `capability_token` to authenticate with a
capability token instead of the API key.

---

### State Leases

#### `create_state_lease(state_key, holder, ttl_ms=None)`

Acquire a lease on a state key. Returns a lease record.

#### `renew_state_lease(lease_id, ttl_ms=None, capability_token=None)`

Renew an existing lease. Optionally authenticate with a capability token.

#### `release_state_lease(lease_id, capability_token=None)`

Release a lease. Returns `None`. Optionally authenticate with a capability token.

---

### Capability Tokens

#### `create_capability_token(name, scopes, expires_at=None)`

Create a scoped capability token. Scopes: `state:read`, `state:write`, `state:watch`,
`lease:write`, `claim:write`. Returns the record including the raw token value.

#### `list_capability_tokens()`

List all capability tokens for the project.

#### `revoke_capability_token(token_id)`

Revoke a capability token. Returns `None`.

---

### Claims

#### `create_claim(subject_type, subject_id, statement, evidence)`

Create a verifiable claim with evidence. Returns a claim record.

#### `list_claims(subject_type=None, subject_id=None, cursor=None, limit=None, order=None)`

List claims with optional filtering.

#### `get_claim(claim_id)`

Get a claim by ID.

#### `verify_claim(claim_id)`

Trigger verification of a claim. Returns a verification run record.

---

## LangGraph checkpoint savers

### `agentstate.langgraph.AgentStateCheckpointSaver`

LangGraph checkpoint saver that persists checkpoints and pending writes in AgentState state records.

```python
from agentstate import AgentStateClient
from agentstate.langgraph import AgentStateCheckpointSaver

client = AgentStateClient(api_key="as_live_...")
saver = AgentStateCheckpointSaver(client)

config = {"configurable": {"thread_id": "thread-1"}}
checkpoint = {"id": "checkpoint-1"}
metadata = {"note": "start"}

next_config = saver.put(config, checkpoint, metadata, {})
```

### `agentstate.langgraph.AsyncAgentStateCheckpointSaver`

Async variant for async runtimes.

```python
import asyncio
from agentstate import AgentStateClient
from agentstate.langgraph import AsyncAgentStateCheckpointSaver


async def main():
    client = AgentStateClient(api_key="as_live_...")
    saver = AsyncAgentStateCheckpointSaver(client)
    config = {"configurable": {"thread_id": "thread-1", "checkpoint_id": "checkpoint-1"}}
    await saver.aput_writes(config, [("messages", {"role": "user"})], "task-1")


asyncio.run(main())
```

## License

MIT
