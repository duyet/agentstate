"""AgentState SDK exceptions."""

from typing import Optional


class AgentStateError(Exception):
    """Base exception for AgentState errors.

    Carries the machine-readable ``code`` and human-readable ``message``
    parsed from the API error envelope ``{"error": {"code": ..., "message": ...}}``
    when available, plus the HTTP ``status`` the error was raised for.
    """

    def __init__(
        self,
        message: str = "",
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class AuthenticationError(AgentStateError):
    """Raised when API key is invalid."""

    pass


class NotFoundError(AgentStateError):
    """Raised when resource is not found."""

    pass


class ValidationError(AgentStateError):
    """Raised when request validation fails."""

    pass


class RateLimitError(AgentStateError):
    """Raised when the API rate limit (HTTP 429) is hit."""

    pass
