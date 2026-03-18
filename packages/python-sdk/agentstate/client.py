"""AgentState API client."""

import httpx
from typing import Optional, List, Dict, Any

from agentstate.exceptions import (
    AgentStateError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
)

BASE_URL = "https://api.agentstate.app"


def _handle_response(response: httpx.Response) -> Dict[str, Any]:
    """Handle API response and raise appropriate exceptions."""
    if response.status_code == 401:
        raise AuthenticationError("Invalid API key")
    if response.status_code == 404:
        raise NotFoundError("Resource not found")
    if response.status_code == 422:
        raise ValidationError("Request validation failed")

    response.raise_for_status()
    return response.json()


class AgentStateClient:
    """AgentState API client."""

    def __init__(self, api_key: str, base_url: str = BASE_URL):
        """Initialize the client.

        Args:
            api_key: AgentState API key (format: as_live_...)
            base_url: API base URL (default: https://api.agentstate.app)
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"}
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Close the HTTP client."""
        self.client.close()

    def create_conversation(
        self,
        messages: List[Dict[str, str]],
        external_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new conversation.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            external_id: Optional external ID for deduplication
            metadata: Optional metadata dict

        Returns:
            Conversation dict with id, created_at, etc.
        """
        payload: Dict[str, Any] = {"messages": messages}
        if external_id:
            payload["external_id"] = external_id
        if metadata:
            payload["metadata"] = metadata

        response = self.client.post(
            f"{self.base_url}/v1/conversations",
            json=payload
        )
        return _handle_response(response)

    def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation by ID.

        Args:
            conversation_id: The conversation ID

        Returns:
            Conversation dict with full details
        """
        response = self.client.get(
            f"{self.base_url}/v1/conversations/{conversation_id}"
        )
        return _handle_response(response)

    def list_conversations(
        self,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """List conversations with pagination.

        Args:
            limit: Number of conversations per page (max 100)
            cursor: Pagination cursor from previous response

        Returns:
            Dict with items (list) and next_cursor
        """
        params = {"limit": limit}
        if cursor:
            params["cursor"] = cursor

        response = self.client.get(
            f"{self.base_url}/v1/conversations",
            params=params
        )
        return _handle_response(response)
