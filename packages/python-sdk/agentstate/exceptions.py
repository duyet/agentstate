"""AgentState SDK exceptions."""

from typing import Optional


class AgentStateError(Exception):
    """Base exception for AgentState errors.

    Carries the machine-readable ``code`` and human-readable ``message`` parsed
    from the API error envelope ``{"error": {"code": ..., "message": ...}}`` when
    available.
    """

    def __init__(self, message: str = "", *, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.code = code


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
