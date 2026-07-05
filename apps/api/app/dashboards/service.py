"""Service layer for dashboards (Feature 006)."""

from __future__ import annotations

from typing import Any


class DashboardServiceError(Exception):
    """Base error for dashboard domain operations."""

    error_code: str

    def __init__(
        self,
        message: str,
        *,
        error_code: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.details = details


class DuplicateDashboardTitleError(DashboardServiceError):
    def __init__(
        self,
        message: str = "A dashboard with this title already exists in the collection.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="duplicate_dashboard_title",
            details=details,
        )


class DashboardNotFoundError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Dashboard not found.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, error_code="dashboard_not_found", details=details)


class WidgetNotFoundError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Widget not found.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, error_code="widget_not_found", details=details)


class StaleUpdateError(DashboardServiceError):
    def __init__(
        self,
        message: str = "The dashboard changed since it was loaded.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, error_code="stale_update", details=details)


class InvalidFilterBindingsError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Invalid dashboard filter bindings.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="invalid_filter_bindings",
            details=details,
        )


class WidgetLocalFilterForbiddenError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Widget-local-only filters are not permitted.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="widget_local_filter_forbidden",
            details=details,
        )


class InvalidParametersError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Invalid parameters.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="invalid_parameters",
            details=details,
        )


class ExportNotPermittedError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Export is not permitted for this dashboard widget.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="export_not_permitted",
            details=details,
        )


class CollectionNotEmptyError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Collection contains active dashboards.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="collection_not_empty",
            details=details,
        )


class UnsupportedWidgetTypeError(DashboardServiceError):
    def __init__(
        self,
        message: str = "Unsupported widget type.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="unsupported_widget_type",
            details=details,
        )
