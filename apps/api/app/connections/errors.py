class ConnectionServiceError(Exception):
    """Base error for data connection service operations."""


class ConnectionNotFoundError(ConnectionServiceError):
    pass


class ConnectionConflictError(ConnectionServiceError):
    pass


class ConnectionValidationError(ConnectionServiceError):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details


class AuthzDeniedError(ConnectionServiceError):
    pass


class DependencyUnavailableError(ConnectionServiceError):
    pass
