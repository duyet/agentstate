"""AgentState SDK exceptions."""


class AgentStateError(Exception):
    """Base exception for AgentState errors."""

    pass


class AuthenticationError(AgentStateError):
    """Raised when API key is invalid."""

    pass


class NotFoundError(AgentStateError):
    """Raised when resource is not found."""

    pass


class ValidationError(AgentStateError):
    """Raised when request validation fails."""

    pass
