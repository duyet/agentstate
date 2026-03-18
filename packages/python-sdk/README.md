# AgentState Python SDK

Python client for [AgentState](https://agentstate.app) API.

## Installation

```bash
pip install agentstate
```

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
    metadata={"source": "web"}
)

print(f"Created conversation: {conversation['id']}")

# Get conversation details
conv = client.get_conversation(conversation["id"])
print(f"Messages: {conv['message_count']}")

# List conversations
result = client.list_conversations(limit=10)
for conv in result["items"]:
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
except ValidationError as e:
    print(f"Invalid input: {e}")
except AgentStateError as e:
    print(f"API error: {e}")
```

## Development

```bash
# Install in editable mode
pip install -e .

# Run tests
pytest
```

## API Reference

### `AgentStateClient(api_key: str, base_url: str = BASE_URL)`

Initialize the client.

- `api_key`: Your AgentState API key (format: `as_live_...`)
- `base_url`: API base URL (default: `https://api.agentstate.app`)

### `create_conversation(messages, external_id=None, metadata=None)`

Create a new conversation.

- `messages`: List of message dicts with `role` and `content` keys
- `external_id`: Optional external ID for deduplication
- `metadata`: Optional metadata dict

Returns conversation dict with `id`, `created_at`, etc.

### `get_conversation(conversation_id: str)`

Get conversation by ID.

Returns conversation dict with full details.

### `list_conversations(limit=20, cursor=None)`

List conversations with pagination.

- `limit`: Number of conversations per page (max 100)
- `cursor`: Pagination cursor from previous response

Returns dict with `items` (list) and `next_cursor`.

## License

MIT
