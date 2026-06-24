"""Service layer for saved questions and collections (Feature 005)."""

from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import CollectionPermission, MembershipRole
from app.models.saved_questions import Collection, SavedQuestion
from app.query_engine.cache_repo import invalidate_saved_question_cache
from app.questions import authz, repository
from app.questions.parameters import ParameterValidationError, validate_parameter_schema
from app.questions.schemas import (
    CollectionCreateRequest,
    CollectionListResponse,
    CollectionResponse,
    CollectionUpdateRequest,
    GrantPermission,
    ParameterDefinition,
    SavedQuestionCreateRequest,
    SavedQuestionInternalDetail,
    SavedQuestionListResponse,
    SavedQuestionSummary,
    SavedQuestionUpdateRequest,
)
from app.tenancy import repository as tenancy_repository
from app.tenancy.permissions import internal_author_has_implicit_edit
from app.tenancy.resolver import ResolvedTenancy


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


class QuestionsAuthzDeniedError(QuestionServiceError):
    def __init__(self, message: str = "Authorization denied.") -> None:
        super().__init__(message, error_code="authz_denied")


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify_name(name: str) -> str:
    slug = _SLUG_RE.sub("-", name.strip().lower()).strip("-")
    return slug[:120] or "collection"


def _parameters_to_json(parameters: list[ParameterDefinition]) -> list[dict[str, Any]]:
    return [p.model_dump(mode="json") for p in parameters]


def _parameters_from_json(raw: list[dict[str, Any]]) -> list[ParameterDefinition]:
    return [ParameterDefinition.model_validate(item) for item in raw]


def _validate_schema(parameters: list[ParameterDefinition]) -> None:
    try:
        validate_parameter_schema(parameters)
    except ParameterValidationError as exc:
        raise InvalidParametersError(str(exc), details=exc.details) from exc


class QuestionService:
    def __init__(self, *, actor: ResolvedTenancy, user_id: UUID) -> None:
        self._actor = actor
        self._user_id = user_id

    async def _asset_grants(self, session: AsyncSession) -> list:
        return await tenancy_repository.list_asset_grants_for_user_workspace(
            session,
            user_id=self._user_id,
            workspace_id=self._actor.workspace_id,
        )

    async def _collection_grant_map(
        self, session: AsyncSession
    ) -> dict[UUID, CollectionPermission]:
        grants = await repository.list_collection_grants_for_membership(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            membership_id=self._actor.membership_id,
        )
        return {g.collection_id: g.permission for g in grants}

    async def _question_grant_map(
        self, session: AsyncSession
    ) -> dict[UUID, CollectionPermission]:
        grants = await repository.list_question_grants_for_membership(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            membership_id=self._actor.membership_id,
        )
        return {g.saved_question_id: g.permission for g in grants}

    def _collection_response(
        self,
        row: Collection,
        *,
        permission: GrantPermission,
    ) -> CollectionResponse:
        return CollectionResponse(
            id=row.id,
            workspace_id=row.workspace_id,
            name=row.name,
            slug=row.slug,
            sort_order=row.sort_order,
            permission=permission,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _question_summary(
        self,
        row: SavedQuestion,
        *,
        permission: GrantPermission,
        can_export: bool,
    ) -> SavedQuestionSummary:
        return SavedQuestionSummary(
            id=row.id,
            collection_id=row.collection_id,
            title=row.title,
            description=row.description,
            permission=permission,
            can_export=can_export,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _question_internal_detail(
        self,
        row: SavedQuestion,
        *,
        permission: GrantPermission,
        can_export: bool,
    ) -> SavedQuestionInternalDetail:
        return SavedQuestionInternalDetail(
            id=row.id,
            collection_id=row.collection_id,
            title=row.title,
            description=row.description,
            permission=permission,
            can_export=can_export,
            created_at=row.created_at,
            updated_at=row.updated_at,
            detail_level="internal",
            parameters=_parameters_from_json(row.parameter_schema),
            sql_text=row.sql_text,
        )

    async def _require_collection_edit(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
    ) -> Collection:
        row = await repository.get_active_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if row is None:
            raise CollectionNotFoundError()
        grants = await self._collection_grant_map(session)
        decision = authz.can_edit_collection(
            actor_role=self._actor.role,
            collection_grant=grants.get(collection_id),
        )
        if not decision.allowed:
            raise QuestionsAuthzDeniedError()
        return row

    async def _require_question_view(
        self,
        session: AsyncSession,
        *,
        question_id: UUID,
    ) -> SavedQuestion:
        row = await repository.get_active_saved_question(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            question_id=question_id,
        )
        if row is None:
            raise QuestionNotFoundError()
        collection_grants = await self._collection_grant_map(session)
        question_grants = await self._question_grant_map(session)
        asset_grants = await self._asset_grants(session)
        decision = authz.can_view_question(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            question_id=question_id,
            collection_grant=collection_grants.get(row.collection_id),
            question_grant=question_grants.get(question_id),
            asset_grants=asset_grants,
        )
        if not decision.allowed:
            raise QuestionsAuthzDeniedError()
        return row

    async def _require_question_edit(
        self,
        session: AsyncSession,
        *,
        question_id: UUID,
    ) -> SavedQuestion:
        row = await self._require_question_view(session, question_id=question_id)
        collection_grants = await self._collection_grant_map(session)
        question_grants = await self._question_grant_map(session)
        asset_grants = await self._asset_grants(session)
        decision = authz.can_edit_question(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            question_id=question_id,
            collection_grant=collection_grants.get(row.collection_id),
            question_grant=question_grants.get(question_id),
            asset_grants=asset_grants,
        )
        if not decision.allowed:
            raise QuestionsAuthzDeniedError()
        return row

    async def _unique_slug(
        self,
        session: AsyncSession,
        *,
        base_slug: str,
        exclude_collection_id: UUID | None = None,
    ) -> str:
        slug = base_slug
        suffix = 2
        while True:
            conflict = await repository.find_active_collection_by_slug(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                slug=slug,
                exclude_collection_id=exclude_collection_id,
            )
            if conflict is None:
                return slug
            slug = f"{base_slug}-{suffix}"
            suffix += 1

    async def list_collections(self, session: AsyncSession) -> CollectionListResponse:
        rows = await repository.list_active_collections(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
        )
        grants = await self._collection_grant_map(session)
        visible: list[CollectionResponse] = []
        for row in rows:
            decision = authz.can_view_collection(
                actor_role=self._actor.role,
                collection_grant=grants.get(row.id),
            )
            if not decision.allowed or decision.effective_permission is None:
                continue
            visible.append(
                self._collection_response(
                    row,
                    permission=decision.effective_permission,
                )
            )
        return CollectionListResponse(collections=visible)

    async def get_collection(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
    ) -> CollectionResponse:
        row = await repository.get_active_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if row is None:
            raise CollectionNotFoundError()
        grants = await self._collection_grant_map(session)
        decision = authz.can_view_collection(
            actor_role=self._actor.role,
            collection_grant=grants.get(collection_id),
        )
        if not decision.allowed or decision.effective_permission is None:
            raise QuestionsAuthzDeniedError()
        return self._collection_response(
            row,
            permission=decision.effective_permission,
        )

    async def create_collection(
        self,
        session: AsyncSession,
        *,
        payload: CollectionCreateRequest,
    ) -> CollectionResponse:
        if not internal_author_has_implicit_edit(self._actor.role):
            raise QuestionsAuthzDeniedError(
                "Only internal authors may create collections."
            )
        name = payload.name.strip()
        if not name:
            raise InvalidParametersError("Collection name must not be blank.")
        duplicate = await repository.find_active_collection_by_trimmed_name(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            name=name,
        )
        if duplicate is not None:
            raise DuplicateCollectionNameError()
        slug = await self._unique_slug(session, base_slug=_slugify_name(name))
        row = await repository.create_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            name=name,
            slug=slug,
            sort_order=payload.sort_order,
            created_by_membership_id=self._actor.membership_id,
        )
        return self._collection_response(row, permission=GrantPermission.edit)

    async def update_collection(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
        payload: CollectionUpdateRequest,
    ) -> CollectionResponse:
        await self._require_collection_edit(session, collection_id=collection_id)
        existing = await repository.get_active_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if existing is None:
            raise CollectionNotFoundError()

        name = existing.name
        slug = None
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise InvalidParametersError("Collection name must not be blank.")
            duplicate = await repository.find_active_collection_by_trimmed_name(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                name=name,
                exclude_collection_id=collection_id,
            )
            if duplicate is not None:
                raise DuplicateCollectionNameError()
            base_slug = _slugify_name(name)
            if base_slug != existing.slug:
                slug = await self._unique_slug(
                    session,
                    base_slug=base_slug,
                    exclude_collection_id=collection_id,
                )

        updated = await repository.update_collection_if_current(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
            expected_updated_at=payload.expected_updated_at,
            name=name if payload.name is not None else None,
            slug=slug,
            sort_order=payload.sort_order,
        )
        if updated is None:
            current = await repository.get_active_collection(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                collection_id=collection_id,
            )
            if current is None:
                raise CollectionNotFoundError()
            raise StaleUpdateError()
        grants = await self._collection_grant_map(session)
        decision = authz.can_view_collection(
            actor_role=self._actor.role,
            collection_grant=grants.get(collection_id),
        )
        assert decision.effective_permission is not None
        return self._collection_response(
            updated,
            permission=decision.effective_permission,
        )

    async def delete_collection(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
    ) -> None:
        await self._require_collection_edit(session, collection_id=collection_id)
        count = await repository.count_active_questions_in_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if count > 0:
            raise CollectionNotEmptyError(details={"active_question_count": count})
        deleted = await repository.soft_delete_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if not deleted:
            raise CollectionNotFoundError()

    async def list_questions(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID | None = None,
    ) -> SavedQuestionListResponse:
        rows = await repository.list_active_saved_questions(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        collection_grants = await self._collection_grant_map(session)
        question_grants = await self._question_grant_map(session)
        asset_grants = await self._asset_grants(session)
        visible: list[SavedQuestionSummary] = []
        for row in rows:
            decision = authz.can_view_question(
                actor_role=self._actor.role,
                actor_user_id=self._user_id,
                actor_workspace_id=self._actor.workspace_id,
                question_id=row.id,
                collection_grant=collection_grants.get(row.collection_id),
                question_grant=question_grants.get(row.id),
                asset_grants=asset_grants,
            )
            if not decision.allowed or decision.effective_permission is None:
                continue
            visible.append(
                self._question_summary(
                    row,
                    permission=decision.effective_permission,
                    can_export=decision.can_export,
                )
            )
        return SavedQuestionListResponse(questions=visible)

    async def get_question(
        self,
        session: AsyncSession,
        *,
        question_id: UUID,
    ) -> SavedQuestionInternalDetail:
        row = await self._require_question_view(session, question_id=question_id)
        collection_grants = await self._collection_grant_map(session)
        question_grants = await self._question_grant_map(session)
        asset_grants = await self._asset_grants(session)
        view = authz.can_view_question(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            question_id=question_id,
            collection_grant=collection_grants.get(row.collection_id),
            question_grant=question_grants.get(question_id),
            asset_grants=asset_grants,
        )
        assert view.effective_permission is not None
        return self._question_internal_detail(
            row,
            permission=view.effective_permission,
            can_export=view.can_export,
        )

    async def create_question(
        self,
        session: AsyncSession,
        *,
        payload: SavedQuestionCreateRequest,
    ) -> SavedQuestionInternalDetail:
        if not internal_author_has_implicit_edit(self._actor.role):
            raise QuestionsAuthzDeniedError(
                "Only internal authors may create saved questions."
            )
        await self._require_collection_edit(
            session,
            collection_id=payload.collection_id,
        )
        title = payload.title.strip()
        sql_text = payload.sql_text.strip()
        if not title or not sql_text:
            raise InvalidParametersError("Title and SQL text must not be blank.")
        _validate_schema(payload.parameters)
        row = await repository.create_saved_question(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=payload.collection_id,
            title=title,
            description=payload.description,
            sql_text=sql_text,
            parameter_schema=_parameters_to_json(payload.parameters),
            created_by_membership_id=self._actor.membership_id,
        )
        return self._question_internal_detail(
            row,
            permission=GrantPermission.edit,
            can_export=self._actor.role != MembershipRole.external_client,
        )

    async def update_question(
        self,
        session: AsyncSession,
        *,
        question_id: UUID,
        payload: SavedQuestionUpdateRequest,
    ) -> SavedQuestionInternalDetail:
        existing = await self._require_question_edit(
            session,
            question_id=question_id,
        )
        collection_id = payload.collection_id or existing.collection_id
        if payload.collection_id is not None:
            await self._require_collection_edit(
                session,
                collection_id=collection_id,
            )

        title = existing.title
        sql_text = existing.sql_text
        parameter_schema = existing.parameter_schema

        if payload.title is not None:
            title = payload.title.strip()
            if not title:
                raise InvalidParametersError("Title must not be blank.")
        if payload.sql_text is not None:
            sql_text = payload.sql_text.strip()
            if not sql_text:
                raise InvalidParametersError("SQL text must not be blank.")
        if payload.parameters is not None:
            _validate_schema(payload.parameters)
            parameter_schema = _parameters_to_json(payload.parameters)

        schema_changed = parameter_schema != existing.parameter_schema
        sql_changed = sql_text != existing.sql_text

        description_update: Any = repository._UNSET
        if "description" in payload.model_fields_set:
            description_update = payload.description

        updated = await repository.update_saved_question_if_current(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            question_id=question_id,
            expected_updated_at=payload.expected_updated_at,
            collection_id=payload.collection_id,
            title=title if payload.title is not None else None,
            description=description_update,
            sql_text=sql_text if payload.sql_text is not None else None,
            parameter_schema=(
                parameter_schema if payload.parameters is not None else None
            ),
            updated_by_membership_id=self._actor.membership_id,
        )
        if updated is None:
            current = await repository.get_active_saved_question(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                question_id=question_id,
            )
            if current is None:
                raise QuestionNotFoundError()
            raise StaleUpdateError()

        if sql_changed or schema_changed:
            await invalidate_saved_question_cache(
                session,
                tenant_id=self._actor.tenant_id,
                saved_question_id=question_id,
            )

        return self._question_internal_detail(
            updated,
            permission=GrantPermission.edit,
            can_export=self._actor.role != MembershipRole.external_client,
        )

    async def delete_question(
        self,
        session: AsyncSession,
        *,
        question_id: UUID,
    ) -> None:
        await self._require_question_edit(session, question_id=question_id)
        deleted = await repository.soft_delete_saved_question(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            question_id=question_id,
            updated_by_membership_id=self._actor.membership_id,
        )
        if not deleted:
            raise QuestionNotFoundError()
