"""Service layer for saved questions and collections (Feature 005).

Routes must call into this service; business logic lands in Phase 3+.
"""

from __future__ import annotations

from typing import Any


class QuestionServiceError(Exception):
    """Base error for saved-question domain operations."""

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


class DuplicateCollectionNameError(QuestionServiceError):
    def __init__(
        self,
        message: str = "A collection with this name already exists.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="duplicate_collection_name",
            details=details,
        )


class CollectionNotEmptyError(QuestionServiceError):
    def __init__(
        self,
        message: str = "Collection contains active saved questions.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="collection_not_empty",
            details=details,
        )


class StaleUpdateError(QuestionServiceError):
    def __init__(
        self,
        message: str = "The record changed since it was loaded.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, error_code="stale_update", details=details)


class InvalidParametersError(QuestionServiceError):
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


class ExportNotPermittedError(QuestionServiceError):
    def __init__(
        self,
        message: str = "Export is not permitted for this saved question.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="export_not_permitted",
            details=details,
        )


class QuestionNotFoundError(QuestionServiceError):
    def __init__(
        self,
        message: str = "Saved question not found.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="question_not_found",
            details=details,
        )


class CollectionNotFoundError(QuestionServiceError):
    def __init__(
        self,
        message: str = "Collection not found.",
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            error_code="collection_not_found",
            details=details,
        )
