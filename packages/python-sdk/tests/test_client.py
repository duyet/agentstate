"""Tests for AgentStateClient."""

import pytest
from agentstate import AgentStateClient
from agentstate.exceptions import (
    AuthenticationError,
    NotFoundError,
    ValidationError,
)
from unittest.mock import Mock, patch


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
    mock_post = Mock()
    mock_post.return_value = mock_response
    mock_httpx.return_value.post = mock_post

    client = AgentStateClient(api_key="as_live_test123")
    result = client.create_conversation(
        messages=[{"role": "user", "content": "Hello"}],
        external_id="ext_123",
        metadata={"source": "test"}
    )

    assert result["id"] == "conv_123"
    mock_post.assert_called_once()


@patch("agentstate.client.httpx.Client")
def test_get_conversation(mock_httpx, mock_response):
    """Test getting a conversation."""
    mock_get = Mock()
    mock_get.return_value = mock_response
    mock_httpx.return_value.get = mock_get

    client = AgentStateClient(api_key="as_live_test123")
    result = client.get_conversation("conv_123")

    assert result["id"] == "conv_123"


@patch("agentstate.client.httpx.Client")
def test_list_conversations(mock_httpx, mock_response):
    """Test listing conversations."""
    mock_get = Mock()
    mock_get.return_value = mock_response
    mock_httpx.return_value.get = mock_get

    client = AgentStateClient(api_key="as_live_test123")
    result = client.list_conversations(limit=10, cursor="cursor_123")

    assert "items" in result


@patch("agentstate.client.httpx.Client")
def test_authentication_error(mock_httpx):
    """Test authentication error handling."""
    mock_response = Mock()
    mock_response.status_code = 401
    mock_post = Mock()
    mock_post.return_value = mock_response
    mock_httpx.return_value.post = mock_post

    client = AgentStateClient(api_key="invalid")
    with pytest.raises(AuthenticationError):
        client.create_conversation(messages=[{"role": "user", "content": "Hi"}])


@patch("agentstate.client.httpx.Client")
def test_not_found_error(mock_httpx):
    """Test not found error handling."""
    mock_response = Mock()
    mock_response.status_code = 404
    mock_get = Mock()
    mock_get.return_value = mock_response
    mock_httpx.return_value.get = mock_get

    client = AgentStateClient(api_key="as_live_test123")
    with pytest.raises(NotFoundError):
        client.get_conversation("nonexistent")


@patch("agentstate.client.httpx.Client")
def test_context_manager(mock_httpx):
    """Test using client as context manager."""
    client = AgentStateClient(api_key="as_live_test123")
    mock_close = Mock()
    client.client.close = mock_close

    with client:
        pass

    mock_close.assert_called_once()
