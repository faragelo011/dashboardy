"""Service layer for dashboards (Feature 006)."""

from __future__ import annotations

from typing import Any


class DashboardServiceError(Exception):
    """Base error for dashboard domain operations."""

    error_code: str
    default_message: str

    def __init__(
        self,
        message: str | None = None,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message if message is not None else self.default_message)
        self.details = details


class DuplicateDashboardTitleError(DashboardServiceError):
    error_code = "duplicate_dashboard_title"
    default_message = "A dashboard with this title already exists in the collection."


class DashboardNotFoundError(DashboardServiceError):
    error_code = "dashboard_not_found"
    default_message = "Dashboard not found."


class WidgetNotFoundError(DashboardServiceError):
    error_code = "widget_not_found"
    default_message = "Widget not found."


class StaleUpdateError(DashboardServiceError):
    error_code = "stale_update"
    default_message = "The dashboard changed since it was loaded."


class InvalidFilterBindingsError(DashboardServiceError):
    error_code = "invalid_filter_bindings"
    default_message = "Invalid dashboard filter bindings."


class WidgetLocalFilterForbiddenError(DashboardServiceError):
    error_code = "widget_local_filter_forbidden"
    default_message = "Widget-local-only filters are not permitted."


class InvalidParametersError(DashboardServiceError):
    error_code = "invalid_parameters"
    default_message = "Invalid parameters."


class ExportNotPermittedError(DashboardServiceError):
    error_code = "export_not_permitted"
    default_message = "Export is not permitted for this dashboard widget."


class CollectionNotEmptyError(DashboardServiceError):
    error_code = "collection_not_empty"
    default_message = "Collection contains active dashboards."


class UnsupportedWidgetTypeError(DashboardServiceError):
    error_code = "unsupported_widget_type"
    default_message = "Unsupported widget type."
