class ConnectionServiceError(Exception):
    """Base error for data connection service operations."""

    error_code: str

    def __init__(
        self,
        message: str = "Connection service error",
        *,
        error_code: str = "connection_service_error",
    ) -> None:
        super().__init__(message)
        self.error_code = error_code


class ConnectionNotFoundError(ConnectionServiceError):
    def __init__(self, message: str = "Connection not found") -> None:
        super().__init__(message, error_code="connection_not_found")


class ConnectionConflictError(ConnectionServiceError):
    def __init__(self, message: str = "Connection conflict") -> None:
        super().__init__(message, error_code="connection_conflict")


class ConnectionValidationError(ConnectionServiceError):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message, error_code="connection_validation_error")
        self.details = details


class AuthzDeniedError(ConnectionServiceError):
    def __init__(self, message: str = "Authorization denied") -> None:
        super().__init__(message, error_code="authz_denied")


class DependencyUnavailableError(ConnectionServiceError):
    def __init__(self, message: str = "Dependency unavailable") -> None:
        super().__init__(message, error_code="dependency_unavailable")
