"""AgentState API client."""

from __future__ import annotations

import random
import time
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import httpx

from agentstate.exceptions import (
    AgentStateError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

# Canonical default base URL shared across all AgentState SDKs.
BASE_URL = "https://agentstate.app/api"

# Default per-request timeout in seconds.
DEFAULT_TIMEOUT = 30.0

_RETRY_STATUSES = {429, 500, 502, 503, 504}

# Methods that are safe to auto-retry. Non-idempotent methods (POST) are only
# retried when an explicit Idempotency-Key is attached so the server can dedupe.
_IDEMPOTENT_METHODS = {"GET", "PUT", "DELETE", "HEAD", "OPTIONS"}


def _extract_error(response: httpx.Response) -> Tuple[Optional[str], Optional[str]]:
    """Parse the ``{"error": {"code", "message"}}`` envelope from a response body."""
    try:
        body = response.json()
    except Exception:  # noqa: BLE001 - body may be empty or non-JSON
        return None, None
    if not isinstance(body, dict):
        return None, None
    error = body.get("error")
    if not isinstance(error, dict):
        return None, None
    code = error.get("code")
    message = error.get("message")
    return (
        code if isinstance(code, str) else None,
        message if isinstance(message, str) else None,
    )


def _parse_retry_after(value: Optional[str]) -> Optional[float]:
    """Parse a ``Retry-After`` header value expressed in seconds.

    Returns ``None`` for missing values or HTTP-date forms we do not honor.
    """
    if not value:
        return None
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        return None
    return max(seconds, 0.0)


def _handle_response(response: httpx.Response) -> Any:
    """Handle an API response and raise appropriate exceptions.

    Success (2xx) returns the parsed JSON body (or ``None`` for 204). Every
    non-2xx response is mapped to an :class:`AgentStateError` subclass, carrying
    the parsed error ``code`` and ``message`` when present.
    """
    status = response.status_code

    if 200 <= status < 300:
        if status == 204:
            return None
        try:
            return response.json()
        except Exception:  # noqa: BLE001 - tolerate empty success bodies
            return None

    code, message = _extract_error(response)

    if status in (401, 403):
        raise AuthenticationError(
            message or ("Forbidden" if status == 403 else "Invalid API key"),
            code=code,
        )
    if status == 404:
        raise NotFoundError(message or "Resource not found", code=code)
    if status in (400, 422):
        raise ValidationError(message or "Request validation failed", code=code)
    if status == 429:
        raise RateLimitError(message or "Rate limit exceeded", code=code)

    # Any other non-2xx status is wrapped rather than left to fall through.
    raise AgentStateError(message or f"HTTP {status} error", code=code)


class AgentStateClient:
    """AgentState API client."""

    def __init__(
        self,
        api_key: str,
        base_url: str = BASE_URL,
        max_retries: int = 3,
        retry_delay_ms: int = 1000,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        """Initialize the client.

        Args:
            api_key: AgentState API key (format: as_live_...)
            base_url: API base URL (default: https://agentstate.app/api, the
                canonical default shared across all AgentState SDKs)
            max_retries: Max retry attempts for 429/5xx. Default: 3
            retry_delay_ms: Base delay in ms for exponential backoff. Default: 1000
            timeout: Per-request timeout in seconds passed to httpx. Default: 30.0
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.retry_delay_ms = retry_delay_ms
        self.timeout = timeout
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Close the HTTP client."""
        self.client.close()

    def _backoff_delay(self, attempt: int, retry_after: Optional[float]) -> float:
        """Compute a retry delay with exponential backoff and random jitter.

        Honors a server-provided ``Retry-After`` (seconds) as the base delay when
        present, otherwise falls back to exponential backoff. Random jitter is
        added on top to avoid thundering-herd retries.
        """
        if retry_after is not None:
            base = retry_after
        else:
            base = self.retry_delay_ms * (2 ** attempt) / 1000.0
        return base + random.uniform(0.0, base * 0.5)

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        """Execute an HTTP request with retry on 429/5xx for idempotent methods.

        Retries are only performed for idempotent methods (GET/PUT/DELETE/HEAD).
        A non-idempotent POST is retried only when it already carries an
        ``Idempotency-Key`` header, letting the server safely dedupe the replay.
        Backoff honors ``Retry-After`` and adds random jitter.
        """
        url = f"{self.base_url}{path}"
        last_error: Optional[Exception] = None

        method_upper = method.upper()
        has_idempotency_key = bool(headers and headers.get("Idempotency-Key"))
        retriable = method_upper in _IDEMPOTENT_METHODS or (
            method_upper == "POST" and has_idempotency_key
        )

        for attempt in range(self.max_retries + 1):
            try:
                response = self.client.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=headers,
                )
            except AgentStateError:
                raise
            except Exception as exc:
                last_error = exc
                if not retriable or attempt == self.max_retries:
                    raise
                time.sleep(self._backoff_delay(attempt, None))
                continue

            # Retry on 429 and 5xx (idempotent/keyed requests only, not final attempt)
            if (
                response.status_code in _RETRY_STATUSES
                and retriable
                and attempt < self.max_retries
            ):
                last_error = AgentStateError(
                    f"Retriable server error: {response.status_code}"
                )
                retry_after = _parse_retry_after(response.headers.get("Retry-After"))
                time.sleep(self._backoff_delay(attempt, retry_after))
                continue

            return _handle_response(response)

        raise last_error  # type: ignore[misc]

    # -------------------------------------------------------------------------
    # Conversations
    # -------------------------------------------------------------------------

    def create_conversation(
        self,
        messages: Optional[List[Dict[str, Any]]] = None,
        external_id: Optional[str] = None,
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new conversation.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            external_id: Optional external ID for deduplication
            title: Optional title for the conversation
            metadata: Optional metadata dict

        Returns:
            Conversation dict with id, created_at, etc.
        """
        payload: Dict[str, Any] = {}
        if messages is not None:
            payload["messages"] = messages
        if external_id is not None:
            payload["external_id"] = external_id
        if title is not None:
            payload["title"] = title
        if metadata is not None:
            payload["metadata"] = metadata

        return self._request("POST", "/v1/conversations", json=payload)

    def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation by ID.

        Args:
            conversation_id: The conversation ID

        Returns:
            Conversation dict with full details
        """
        return self._request("GET", f"/v1/conversations/{conversation_id}")

    def get_conversation_by_external_id(self, external_id: str) -> Dict[str, Any]:
        """Get conversation by external ID.

        Args:
            external_id: The external ID

        Returns:
            Conversation dict with full details
        """
        encoded = urllib.parse.quote(external_id, safe="")
        return self._request("GET", f"/v1/conversations/by-external-id/{encoded}")

    def list_conversations(
        self,
        limit: int = 20,
        cursor: Optional[str] = None,
        order: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List conversations with pagination.

        Args:
            limit: Number of conversations per page (max 100)
            cursor: Pagination cursor from previous response
            order: Sort order, 'asc' or 'desc'

        Returns:
            Dict with data (list) and pagination
        """
        params: Dict[str, Any] = {"limit": limit}
        if cursor is not None:
            params["cursor"] = cursor
        if order is not None:
            params["order"] = order

        return self._request("GET", "/v1/conversations", params=params)

    def update_conversation(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Update a conversation's title or metadata.

        Args:
            conversation_id: The conversation ID
            title: New title
            metadata: New metadata

        Returns:
            Updated conversation dict
        """
        payload: Dict[str, Any] = {}
        if title is not None:
            payload["title"] = title
        if metadata is not None:
            payload["metadata"] = metadata

        return self._request("PUT", f"/v1/conversations/{conversation_id}", json=payload)

    def delete_conversation(self, conversation_id: str) -> None:
        """Delete a conversation.

        Args:
            conversation_id: The conversation ID
        """
        self._request("DELETE", f"/v1/conversations/{conversation_id}")

    def append_messages(
        self,
        conversation_id: str,
        messages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Append messages to a conversation.

        Args:
            conversation_id: The conversation ID
            messages: List of message dicts to append

        Returns:
            Dict with the appended messages list
        """
        return self._request(
            "POST",
            f"/v1/conversations/{conversation_id}/messages",
            json={"messages": messages},
        )

    def list_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List messages in a conversation.

        Args:
            conversation_id: The conversation ID
            limit: Max messages to return
            after: Cursor for pagination

        Returns:
            Dict with data (list) and pagination
        """
        params: Dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if after is not None:
            params["after"] = after

        return self._request(
            "GET",
            f"/v1/conversations/{conversation_id}/messages",
            params=params or None,
        )

    def export_conversations(
        self,
        ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Export conversations with their messages.

        Args:
            ids: Optional list of conversation IDs to export; omit to export all

        Returns:
            Dict with data (list of conversations with messages) and count
        """
        payload: Dict[str, Any] = {}
        if ids is not None:
            payload["ids"] = ids

        return self._request("POST", "/v1/conversations/export", json=payload)

    # -------------------------------------------------------------------------
    # AI helpers
    # -------------------------------------------------------------------------

    def generate_title(self, conversation_id: str) -> Dict[str, Any]:
        """Generate a title for a conversation using AI.

        Args:
            conversation_id: The conversation ID

        Returns:
            Dict with 'title' key
        """
        return self._request(
            "POST",
            f"/v1/conversations/{conversation_id}/generate-title",
        )

    def generate_follow_ups(self, conversation_id: str) -> Dict[str, Any]:
        """Generate follow-up questions for a conversation using AI.

        Args:
            conversation_id: The conversation ID

        Returns:
            Dict with 'questions' list
        """
        return self._request(
            "POST",
            f"/v1/conversations/{conversation_id}/follow-ups",
        )

    # -------------------------------------------------------------------------
    # State records
    # -------------------------------------------------------------------------

    def upsert_state(
        self,
        state_key: str,
        state: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create or replace a state record.

        Args:
            state_key: Caller-defined state key
            state: Upsert request body (must include agent_id)
            idempotency_key: Optional idempotency key

        Returns:
            Latest state record snapshot
        """
        extra_headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None

        return self._request(
            "PUT",
            f"/v1/states/{urllib.parse.quote(state_key, safe='')}",
            json=state,
            headers=extra_headers,
        )

    def get_state(
        self,
        state_key: str,
        at_sequence: Optional[int] = None,
        at_time: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get latest or historical state by key.

        Args:
            state_key: Caller-defined state key
            at_sequence: Optional historical sequence cursor
            at_time: Optional historical timestamp in millis

        Returns:
            State record snapshot
        """
        params: Dict[str, Any] = {}
        if at_sequence is not None:
            params["at_sequence"] = at_sequence
        if at_time is not None:
            params["at_time"] = at_time

        return self._request(
            "GET",
            f"/v1/states/{urllib.parse.quote(state_key, safe='')}",
            params=params or None,
        )

    def query_states(self, query: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Query states.

        Args:
            query: Optional state query request payload

        Returns:
            State list response
        """
        return self._request("POST", "/v1/states/query", json=query or {})

    def delete_state(
        self,
        state_key: str,
        lease_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Delete state.

        Args:
            state_key: Caller-defined state key
            lease_id: Optional active lease id
            idempotency_key: Optional idempotency key

        Returns:
            Deletion confirmation
        """
        extra_headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        params = {"lease_id": lease_id} if lease_id else None

        return self._request(
            "DELETE",
            f"/v1/states/{urllib.parse.quote(state_key, safe='')}",
            params=params,
            headers=extra_headers,
        )

    def list_state_events(
        self,
        state_key: str,
        after: int = 0,
        limit: int = 50,
        capability_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List state events for a state key.

        Args:
            state_key: Caller-defined state key
            after: Sequence cursor. Return events after this sequence
            limit: Maximum number of events
            capability_token: Optional capability token to use instead of the API key

        Returns:
            State event stream response
        """
        extra_headers: Optional[Dict[str, str]] = None
        if capability_token is not None:
            extra_headers = {"Authorization": f"Bearer {capability_token}"}

        return self._request(
            "GET",
            f"/v1/states/{urllib.parse.quote(state_key, safe='')}/events",
            params={"after": after, "limit": limit},
            headers=extra_headers,
        )

    # -------------------------------------------------------------------------
    # State leases
    # -------------------------------------------------------------------------

    def create_state_lease(
        self,
        state_key: str,
        holder: str,
        ttl_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a lease on a state key.

        Args:
            state_key: The state key to lease
            holder: Caller-supplied holder identifier
            ttl_ms: Optional TTL in milliseconds

        Returns:
            Lease record
        """
        payload: Dict[str, Any] = {"holder": holder}
        if ttl_ms is not None:
            payload["ttl_ms"] = ttl_ms

        return self._request(
            "POST",
            f"/v1/states/{urllib.parse.quote(state_key, safe='')}/lease",
            json=payload,
        )

    def renew_state_lease(
        self,
        lease_id: str,
        ttl_ms: Optional[int] = None,
        capability_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Renew an existing lease.

        Args:
            lease_id: The lease ID
            ttl_ms: Optional new TTL in milliseconds
            capability_token: Optional capability token to use instead of the API key

        Returns:
            Updated lease record
        """
        payload: Dict[str, Any] = {}
        if ttl_ms is not None:
            payload["ttl_ms"] = ttl_ms

        extra_headers: Optional[Dict[str, str]] = None
        if capability_token is not None:
            extra_headers = {"Authorization": f"Bearer {capability_token}"}

        return self._request(
            "POST",
            f"/v1/leases/{urllib.parse.quote(lease_id, safe='')}/renew",
            json=payload,
            headers=extra_headers,
        )

    def release_state_lease(
        self,
        lease_id: str,
        capability_token: Optional[str] = None,
    ) -> None:
        """Release a lease.

        Args:
            lease_id: The lease ID
            capability_token: Optional capability token to use instead of the API key
        """
        extra_headers: Optional[Dict[str, str]] = None
        if capability_token is not None:
            extra_headers = {"Authorization": f"Bearer {capability_token}"}

        self._request(
            "DELETE",
            f"/v1/leases/{urllib.parse.quote(lease_id, safe='')}",
            headers=extra_headers,
        )

    # -------------------------------------------------------------------------
    # Capability tokens
    # -------------------------------------------------------------------------

    def create_capability_token(
        self,
        name: str,
        scopes: List[str],
        expires_at: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a capability token.

        Args:
            name: Token name
            scopes: List of scopes (e.g. ['state:read', 'state:write'])
            expires_at: Optional expiry as Unix millis

        Returns:
            Capability token record including the raw token value
        """
        payload: Dict[str, Any] = {"name": name, "scopes": scopes}
        if expires_at is not None:
            payload["expires_at"] = expires_at

        return self._request("POST", "/v1/capability-tokens", json=payload)

    def list_capability_tokens(self) -> Dict[str, Any]:
        """List all capability tokens for the project.

        Returns:
            Dict with 'data' list of capability token records
        """
        return self._request("GET", "/v1/capability-tokens")

    def revoke_capability_token(self, token_id: str) -> None:
        """Revoke a capability token.

        Args:
            token_id: The capability token ID
        """
        self._request(
            "DELETE",
            f"/v1/capability-tokens/{urllib.parse.quote(token_id, safe='')}",
        )

    # -------------------------------------------------------------------------
    # Claims
    # -------------------------------------------------------------------------

    def create_claim(
        self,
        subject_type: str,
        subject_id: str,
        statement: str,
        evidence: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Create a verifiable claim.

        Args:
            subject_type: Type of the claim subject
            subject_id: ID of the claim subject
            statement: Human-readable claim statement
            evidence: List of evidence dicts

        Returns:
            Claim record
        """
        return self._request(
            "POST",
            "/v1/claims",
            json={
                "subject_type": subject_type,
                "subject_id": subject_id,
                "statement": statement,
                "evidence": evidence,
            },
        )

    def list_claims(
        self,
        subject_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
        order: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List claims.

        Args:
            subject_type: Filter by subject type
            subject_id: Filter by subject ID
            cursor: Pagination cursor
            limit: Max claims to return
            order: Sort order, 'asc' or 'desc'

        Returns:
            Dict with 'data' list and 'pagination'
        """
        params: Dict[str, Any] = {}
        if subject_type is not None:
            params["subject_type"] = subject_type
        if subject_id is not None:
            params["subject_id"] = subject_id
        if cursor is not None:
            params["cursor"] = cursor
        if limit is not None:
            params["limit"] = limit
        if order is not None:
            params["order"] = order

        return self._request("GET", "/v1/claims", params=params or None)

    def get_claim(self, claim_id: str) -> Dict[str, Any]:
        """Get a claim by ID.

        Args:
            claim_id: The claim ID

        Returns:
            Claim record
        """
        return self._request("GET", f"/v1/claims/{urllib.parse.quote(claim_id, safe='')}")

    def verify_claim(self, claim_id: str) -> Dict[str, Any]:
        """Trigger verification of a claim.

        Args:
            claim_id: The claim ID

        Returns:
            Claim verification run record
        """
        return self._request(
            "POST",
            f"/v1/claims/{urllib.parse.quote(claim_id, safe='')}/verify",
        )
