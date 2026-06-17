"""Tests for AgentStateClient."""

import urllib.parse
from unittest.mock import Mock, patch

import pytest
from agentstate import AgentStateClient
from agentstate.exceptions import (
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)


@pytest.fixture
def mock_response():
    """Create a mock response."""
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {
        "id": "conv_123",
        "created_at": 1234567890000,
        "message_count": 2,
        "items": [],
    }
    return mock


def _make_client():
    """Return a client with a mocked httpx.Client."""
    client = AgentStateClient(api_key="as_live_test123")
    client.client = Mock()
    return client


def _ok(data):
    """Return a 200 mock response with JSON data."""
    r = Mock()
    r.status_code = 200
    r.json.return_value = data
    return r


def _no_content():
    """Return a 204 mock response."""
    r = Mock()
    r.status_code = 204
    return r


def test_client_init():
    """Test client initialization."""
    client = AgentStateClient(api_key="as_live_test123")
    assert client.api_key == "as_live_test123"
    assert client.base_url == "https://api.agentstate.app"


def test_client_init_custom_base_url():
    """Test client with custom base URL."""
    client = AgentStateClient(
        api_key="as_live_test123",
        base_url="http://localhost:8787/api"
    )
    assert client.base_url == "http://localhost:8787/api"


@patch("agentstate.client.httpx.Client")
def test_create_conversation(mock_httpx, mock_response):
    """Test creating a conversation."""
    mock_request = Mock(return_value=mock_response)
    mock_httpx.return_value.request = mock_request

    client = AgentStateClient(api_key="as_live_test123")
    result = client.create_conversation(
        messages=[{"role": "user", "content": "Hello"}],
        external_id="ext_123",
        metadata={"source": "test"}
    )

    assert result["id"] == "conv_123"
    mock_request.assert_called_once()


@patch("agentstate.client.httpx.Client")
def test_create_conversation_with_title(mock_httpx):
    """Test creating a conversation with a title."""
    r = _ok({"id": "conv_1", "title": "My Chat", "created_at": 1000})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.create_conversation(
        messages=[{"role": "user", "content": "Hi"}],
        title="My Chat",
    )

    assert result["title"] == "My Chat"
    call_kwargs = mock_httpx.return_value.request.call_args
    assert call_kwargs.kwargs["json"]["title"] == "My Chat"


@patch("agentstate.client.httpx.Client")
def test_get_conversation(mock_httpx, mock_response):
    """Test getting a conversation."""
    mock_httpx.return_value.request = Mock(return_value=mock_response)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.get_conversation("conv_123")

    assert result["id"] == "conv_123"


@patch("agentstate.client.httpx.Client")
def test_get_conversation_by_external_id(mock_httpx):
    """Test get_conversation_by_external_id hits the correct endpoint."""
    r = _ok({"id": "conv_1", "external_id": "ext/abc"})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.get_conversation_by_external_id("ext/abc")

    assert result["id"] == "conv_1"
    call_args = mock_httpx.return_value.request.call_args
    expected_encoded = urllib.parse.quote("ext/abc", safe="")
    assert call_args.args[1].endswith(
        f"/v1/conversations/by-external-id/{expected_encoded}"
    )


@patch("agentstate.client.httpx.Client")
def test_list_conversations(mock_httpx, mock_response):
    """Test listing conversations."""
    mock_httpx.return_value.request = Mock(return_value=mock_response)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.list_conversations(limit=10, cursor="cursor_123")

    assert "items" in result


@patch("agentstate.client.httpx.Client")
def test_update_conversation(mock_httpx):
    """Test update_conversation sends PUT to /v1/conversations/{id}."""
    r = _ok({"id": "conv_1", "title": "New Title"})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.update_conversation("conv_1", title="New Title")

    assert result["title"] == "New Title"
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "PUT"
    assert call_args.args[1].endswith("/v1/conversations/conv_1")
    assert call_args.kwargs["json"]["title"] == "New Title"


@patch("agentstate.client.httpx.Client")
def test_delete_conversation(mock_httpx):
    """Test delete_conversation sends DELETE to /v1/conversations/{id}."""
    mock_httpx.return_value.request = Mock(return_value=_no_content())

    client = AgentStateClient(api_key="as_live_test123")
    result = client.delete_conversation("conv_1")

    assert result is None
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "DELETE"
    assert call_args.args[1].endswith("/v1/conversations/conv_1")


@patch("agentstate.client.httpx.Client")
def test_append_messages(mock_httpx):
    """Test append_messages POST to /v1/conversations/{id}/messages."""
    r = _ok({"messages": [{"id": "msg_1", "role": "user", "content": "Hi"}]})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.append_messages("conv_1", [{"role": "user", "content": "Hi"}])

    assert "messages" in result
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/conversations/conv_1/messages")
    assert call_args.kwargs["json"]["messages"][0]["role"] == "user"


@patch("agentstate.client.httpx.Client")
def test_list_messages(mock_httpx):
    """Test list_messages GET to /v1/conversations/{id}/messages."""
    r = _ok({"data": [], "pagination": {"next_cursor": None, "limit": 20}})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.list_messages("conv_1", limit=10)

    assert "data" in result
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "GET"
    assert call_args.args[1].endswith("/v1/conversations/conv_1/messages")
    assert call_args.kwargs["params"]["limit"] == 10


@patch("agentstate.client.httpx.Client")
def test_export_conversations(mock_httpx):
    """Test export_conversations POST to /v1/conversations/export."""
    r = _ok({"data": [], "count": 0})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.export_conversations(ids=["conv_1", "conv_2"])

    assert result["count"] == 0
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/conversations/export")
    assert call_args.kwargs["json"]["ids"] == ["conv_1", "conv_2"]


@patch("agentstate.client.httpx.Client")
def test_generate_title(mock_httpx):
    """Test generate_title POST to /v1/conversations/{id}/generate-title."""
    r = _ok({"title": "My Conversation"})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.generate_title("conv_1")

    assert result["title"] == "My Conversation"
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/conversations/conv_1/generate-title")


@patch("agentstate.client.httpx.Client")
def test_generate_follow_ups(mock_httpx):
    """Test generate_follow_ups POST to /v1/conversations/{id}/follow-ups."""
    r = _ok({"questions": ["What next?", "Tell me more"]})
    mock_httpx.return_value.request = Mock(return_value=r)

    client = AgentStateClient(api_key="as_live_test123")
    result = client.generate_follow_ups("conv_1")

    assert result["questions"] == ["What next?", "Tell me more"]
    call_args = mock_httpx.return_value.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/conversations/conv_1/follow-ups")


@patch("agentstate.client.httpx.Client")
def test_authentication_error(mock_httpx):
    """Test authentication error handling."""
    mock_response = Mock()
    mock_response.status_code = 401
    mock_httpx.return_value.request = Mock(return_value=mock_response)

    client = AgentStateClient(api_key="invalid")
    with pytest.raises(AuthenticationError):
        client.create_conversation(messages=[{"role": "user", "content": "Hi"}])


@patch("agentstate.client.httpx.Client")
def test_not_found_error(mock_httpx):
    """Test not found error handling."""
    mock_response = Mock()
    mock_response.status_code = 404
    mock_httpx.return_value.request = Mock(return_value=mock_response)

    client = AgentStateClient(api_key="as_live_test123")
    with pytest.raises(NotFoundError):
        client.get_conversation("nonexistent")


@patch("agentstate.client.httpx.Client")
def test_rate_limit_error(mock_httpx):
    """Test that HTTP 429 raises RateLimitError."""
    mock_response = Mock()
    mock_response.status_code = 429
    mock_httpx.return_value.request = Mock(return_value=mock_response)

    # max_retries=0 so we don't actually sleep in tests
    client = AgentStateClient(api_key="as_live_test123", max_retries=0)
    with pytest.raises(RateLimitError):
        client.get_conversation("conv_1")


@patch("agentstate.client.httpx.Client")
def test_context_manager(mock_httpx):
    """Test using client as context manager."""
    client = AgentStateClient(api_key="as_live_test123")
    mock_close = Mock()
    client.client.close = mock_close

    with client:
        pass

    mock_close.assert_called_once()


# -------------------------------------------------------------------------
# State record tests — all paths must be /v1/ (not /v2/)
# -------------------------------------------------------------------------

def test_upsert_state_uses_v1_path():
    """Test upsert_state maps to the /v1/ endpoint (path fix from v2)."""
    client = _make_client()
    client.client.request = Mock(return_value=_ok({"state_key": "thread-1"}))

    result = client.upsert_state(
        "thread-1",
        {
            "agent_id": "agentstate-sdk",
            "data": {"kind": "checkpoint"},
            "metadata": {"runtime": "langgraph"},
        },
        idempotency_key="idem-1",
    )

    assert result["state_key"] == "thread-1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "PUT"
    assert "/v1/states/" in call_args.args[1]
    assert call_args.kwargs["json"]["agent_id"] == "agentstate-sdk"
    assert call_args.kwargs["headers"]["Idempotency-Key"] == "idem-1"


def test_query_states_uses_v1_path():
    """Test query_states hits /v1/states/query."""
    client = _make_client()
    client.client.request = Mock(
        return_value=_ok({"data": [], "pagination": {"next_cursor": None}})
    )

    result = client.query_states({"agent_id": "agentstate-sdk"})

    assert result["data"] == []
    call_args = client.client.request.call_args
    assert call_args.args[1].endswith("/v1/states/query")
    assert call_args.kwargs["json"] == {"agent_id": "agentstate-sdk"}


def test_get_state_uses_v1_path():
    """Test get_state uses /v1/ path and supports at_sequence / at_time."""
    client = _make_client()
    client.client.request = Mock(return_value=_ok({"state_key": "thread-1"}))

    state = client.get_state("thread-1", at_sequence=12, at_time=1000)

    assert state["state_key"] == "thread-1"
    call_args = client.client.request.call_args
    assert "/v1/states/" in call_args.args[1]
    assert call_args.kwargs["params"] == {"at_sequence": 12, "at_time": 1000}


def test_delete_state_uses_v1_path():
    """Test delete_state uses /v1/ path and passes lease_id + idempotency."""
    client = _make_client()
    client.client.request = Mock(return_value=_ok({"deleted": True}))

    state = client.delete_state("thread-1", lease_id="lease-1", idempotency_key="idem-1")

    assert state["deleted"] is True
    call_args = client.client.request.call_args
    assert "/v1/states/" in call_args.args[1]
    assert call_args.kwargs["params"] == {"lease_id": "lease-1"}
    assert call_args.kwargs["headers"]["Idempotency-Key"] == "idem-1"


def test_list_state_events_uses_v1_path():
    """Test list_state_events uses /v1/ path."""
    client = _make_client()
    client.client.request = Mock(
        return_value=_ok({"data": [], "pagination": {"next_cursor": None}})
    )

    events = client.list_state_events("thread-1", after=10, limit=25)

    assert events["data"] == []
    call_args = client.client.request.call_args
    assert "/v1/states/" in call_args.args[1]
    assert call_args.args[1].endswith("/events")
    assert call_args.kwargs["params"] == {"after": 10, "limit": 25}


def test_list_state_events_with_capability_token():
    """Test list_state_events passes capability_token as Authorization header."""
    client = _make_client()
    client.client.request = Mock(
        return_value=_ok({"data": [], "pagination": {"next_cursor": None}})
    )

    client.list_state_events("thread-1", capability_token="cap_tok_abc")

    call_args = client.client.request.call_args
    assert call_args.kwargs["headers"]["Authorization"] == "Bearer cap_tok_abc"


# -------------------------------------------------------------------------
# State leases
# -------------------------------------------------------------------------

def test_create_state_lease():
    """Test create_state_lease POST to /v1/states/{key}/lease."""
    client = _make_client()
    lease = {"id": "lease-1", "state_key": "thread-1", "holder": "worker-A"}
    client.client.request = Mock(return_value=_ok(lease))

    result = client.create_state_lease("thread-1", holder="worker-A", ttl_ms=30000)

    assert result["id"] == "lease-1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith(
        f"/v1/states/{urllib.parse.quote('thread-1', safe='')}/lease"
    )
    assert call_args.kwargs["json"]["holder"] == "worker-A"
    assert call_args.kwargs["json"]["ttl_ms"] == 30000


def test_renew_state_lease():
    """Test renew_state_lease POST to /v1/leases/{id}/renew."""
    client = _make_client()
    lease = {"id": "lease-1", "expires_at": 9999999}
    client.client.request = Mock(return_value=_ok(lease))

    result = client.renew_state_lease("lease-1", ttl_ms=60000)

    assert result["id"] == "lease-1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/leases/lease-1/renew")
    assert call_args.kwargs["json"]["ttl_ms"] == 60000


def test_renew_state_lease_with_capability_token():
    """Test renew_state_lease sends capability_token as Authorization header."""
    client = _make_client()
    client.client.request = Mock(return_value=_ok({"id": "lease-1"}))

    client.renew_state_lease("lease-1", capability_token="cap_tok_xyz")

    call_args = client.client.request.call_args
    assert call_args.kwargs["headers"]["Authorization"] == "Bearer cap_tok_xyz"


def test_release_state_lease():
    """Test release_state_lease DELETE to /v1/leases/{id}."""
    client = _make_client()
    client.client.request = Mock(return_value=_no_content())

    result = client.release_state_lease("lease-1")

    assert result is None
    call_args = client.client.request.call_args
    assert call_args.args[0] == "DELETE"
    assert call_args.args[1].endswith("/v1/leases/lease-1")


def test_release_state_lease_with_capability_token():
    """Test release_state_lease sends capability_token as Authorization header."""
    client = _make_client()
    client.client.request = Mock(return_value=_no_content())

    client.release_state_lease("lease-1", capability_token="cap_tok_xyz")

    call_args = client.client.request.call_args
    assert call_args.kwargs["headers"]["Authorization"] == "Bearer cap_tok_xyz"


# -------------------------------------------------------------------------
# Capability tokens
# -------------------------------------------------------------------------

def test_create_capability_token():
    """Test create_capability_token POST to /v1/capability-tokens."""
    client = _make_client()
    token_data = {"id": "ct_1", "name": "my-token", "token": "cap_tok_abc", "scopes": ["state:read"]}
    client.client.request = Mock(return_value=_ok(token_data))

    result = client.create_capability_token(
        name="my-token",
        scopes=["state:read"],
        expires_at=9999999,
    )

    assert result["id"] == "ct_1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/capability-tokens")
    assert call_args.kwargs["json"]["scopes"] == ["state:read"]
    assert call_args.kwargs["json"]["expires_at"] == 9999999


def test_list_capability_tokens():
    """Test list_capability_tokens GET to /v1/capability-tokens."""
    client = _make_client()
    client.client.request = Mock(return_value=_ok({"data": []}))

    result = client.list_capability_tokens()

    assert "data" in result
    call_args = client.client.request.call_args
    assert call_args.args[0] == "GET"
    assert call_args.args[1].endswith("/v1/capability-tokens")


def test_revoke_capability_token():
    """Test revoke_capability_token DELETE to /v1/capability-tokens/{id}."""
    client = _make_client()
    client.client.request = Mock(return_value=_no_content())

    result = client.revoke_capability_token("ct_1")

    assert result is None
    call_args = client.client.request.call_args
    assert call_args.args[0] == "DELETE"
    assert call_args.args[1].endswith("/v1/capability-tokens/ct_1")


# -------------------------------------------------------------------------
# Claims
# -------------------------------------------------------------------------

def test_create_claim():
    """Test create_claim POST to /v1/claims."""
    client = _make_client()
    claim = {"id": "claim_1", "status": "pending"}
    client.client.request = Mock(return_value=_ok(claim))

    result = client.create_claim(
        subject_type="agent",
        subject_id="agent-1",
        statement="Agent completed task",
        evidence=[{"kind": "text_hash", "source": "log", "data": "ok", "hash": "abc"}],
    )

    assert result["id"] == "claim_1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/claims")
    assert call_args.kwargs["json"]["subject_type"] == "agent"
    assert len(call_args.kwargs["json"]["evidence"]) == 1


def test_list_claims():
    """Test list_claims GET to /v1/claims."""
    client = _make_client()
    client.client.request = Mock(
        return_value=_ok({"data": [], "pagination": {"next_cursor": None}})
    )

    result = client.list_claims(subject_type="agent", limit=5)

    assert "data" in result
    call_args = client.client.request.call_args
    assert call_args.args[0] == "GET"
    assert call_args.args[1].endswith("/v1/claims")
    assert call_args.kwargs["params"]["subject_type"] == "agent"
    assert call_args.kwargs["params"]["limit"] == 5


def test_get_claim():
    """Test get_claim GET to /v1/claims/{id}."""
    client = _make_client()
    claim = {"id": "claim_1", "status": "pending"}
    client.client.request = Mock(return_value=_ok(claim))

    result = client.get_claim("claim_1")

    assert result["id"] == "claim_1"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "GET"
    assert call_args.args[1].endswith("/v1/claims/claim_1")


def test_verify_claim():
    """Test verify_claim POST to /v1/claims/{id}/verify."""
    client = _make_client()
    run = {"id": "run_1", "claim_id": "claim_1", "status": "verified"}
    client.client.request = Mock(return_value=_ok(run))

    result = client.verify_claim("claim_1")

    assert result["status"] == "verified"
    call_args = client.client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.args[1].endswith("/v1/claims/claim_1/verify")
