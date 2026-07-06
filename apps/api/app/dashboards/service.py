"""Service layer for dashboards (Feature 006)."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.dashboards import authz, repository
from app.dashboards.filters import (
    FilterValidationError,
    compute_filter_state_hash,
    merge_widget_parameters,
    validate_bindings_reference_global_filters,
    validate_global_filter_values,
    validate_global_filters,
)
from app.dashboards.schemas import (
    ColumnDescriptor,
    DashboardConsumerDetail,
    DashboardCreateRequest,
    DashboardDefinition,
    DashboardEditorDetail,
    DashboardListResponse,
    DashboardSummary,
    DashboardUpdateRequest,
    DashboardWidget,
    DashboardWidgetConsumer,
    DashboardWidgetCreateInput,
    DashboardWidgetUpdateInput,
    GlobalFilter,
    WidgetExecuteMeta,
    WidgetExecuteRequest,
    WidgetExecuteResponse,
    WidgetLayout,
    WidgetType,
    clamp_widget_ttl_seconds,
    widget_type_to_presentation_class,
)
from app.models.dashboards import Dashboard
from app.models.dashboards import DashboardWidget as DashboardWidgetRow
from app.models.saved_questions import SavedQuestion
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import (
    QueryExecuteSuccessResponse,
    WidgetQueryExecuteRequest,
)
from app.questions import authz as questions_authz
from app.questions import repository as questions_repository
from app.questions.parameters import (
    ParameterValidationError,
    validate_runtime_parameters,
)
from app.questions.schemas import ParameterDefinition
from app.tenancy import repository as tenancy_repository
from app.tenancy.permissions import internal_author_has_implicit_edit
from app.tenancy.resolver import ResolvedTenancy


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
        self.error_code = type(self).error_code
        self.details = details


class DashboardsAuthzDeniedError(DashboardServiceError):
    error_code = "authz_denied"
    default_message = "Authorization denied."


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


def _default_definition() -> DashboardDefinition:
    return DashboardDefinition(layout_version=1, global_filters=[])


def _definition_from_row(row: Dashboard) -> DashboardDefinition:
    raw = row.definition or {}
    return DashboardDefinition.model_validate(
        {
            "layout_version": raw.get("layout_version", 1),
            "global_filters": raw.get("global_filters", []),
        }
    )


def _definition_to_json(definition: DashboardDefinition) -> dict[str, Any]:
    return definition.model_dump(mode="json")


def _parameters_from_json(raw: list[dict[str, Any]]) -> list[ParameterDefinition]:
    return [ParameterDefinition.model_validate(item) for item in raw]


def _map_filter_error(exc: FilterValidationError) -> DashboardServiceError:
    if exc.error_code == "invalid_filter_bindings":
        return InvalidFilterBindingsError(str(exc))
    if exc.error_code == "widget_local_filter_forbidden":
        return WidgetLocalFilterForbiddenError(str(exc))
    return InvalidParametersError(str(exc))


def _validate_definition_global_filters(definition: DashboardDefinition) -> None:
    try:
        validate_global_filters(definition.global_filters)
    except FilterValidationError as exc:
        raise _map_filter_error(exc) from exc


def _widget_execute_response(
    result: QueryExecuteSuccessResponse,
) -> WidgetExecuteResponse:
    return WidgetExecuteResponse(
        columns=[
            ColumnDescriptor(name=c.name, type=c.type) for c in result.columns
        ],
        rows=result.rows,
        meta=WidgetExecuteMeta(
            status=result.meta.status.value,
            duration_ms=result.meta.duration_ms,
            row_count=result.meta.row_count,
            truncated=result.meta.truncated,
            cache_hit=result.meta.cache_hit,
            error_code=result.meta.error_code,
        ),
    )


class DashboardService:
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
    ) -> dict[UUID, Any]:
        grants = await questions_repository.list_collection_grants_for_membership(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            membership_id=self._actor.membership_id,
        )
        return {g.collection_id: g.permission for g in grants}

    async def _dashboard_grant_map(
        self, session: AsyncSession
    ) -> dict[UUID, Any]:
        grants = await repository.list_dashboard_grants_for_membership(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            membership_id=self._actor.membership_id,
        )
        return {g.dashboard_id: g.permission for g in grants}

    async def _require_collection_edit(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
    ) -> None:
        row = await questions_repository.get_active_collection(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        if row is None:
            raise InvalidParametersError("Collection not found.")
        grants = await self._collection_grant_map(session)
        decision = questions_authz.can_edit_collection(
            actor_role=self._actor.role,
            collection_grant=grants.get(collection_id),
        )
        if not decision.allowed:
            raise DashboardsAuthzDeniedError()

    async def _require_saved_question_access(
        self,
        session: AsyncSession,
        *,
        saved_question_id: UUID,
        collection_grants: dict[UUID, Any] | None = None,
        asset_grants: list | None = None,
    ) -> SavedQuestion:
        row = await questions_repository.get_active_saved_question(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            question_id=saved_question_id,
        )
        if row is None:
            raise InvalidParametersError(
                "Saved question not found.",
                details={"saved_question_id": str(saved_question_id)},
            )
        collection_grants = (
            collection_grants
            if collection_grants is not None
            else await self._collection_grant_map(session)
        )
        question_grants = (
            await questions_repository.list_question_grants_for_membership(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                membership_id=self._actor.membership_id,
            )
        )
        q_grant_map = {g.saved_question_id: g.permission for g in question_grants}
        asset_grants = (
            asset_grants
            if asset_grants is not None
            else await self._asset_grants(session)
        )
        decision = questions_authz.can_view_question(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            question_id=saved_question_id,
            collection_grant=collection_grants.get(row.collection_id),
            question_grant=q_grant_map.get(saved_question_id),
            asset_grants=asset_grants,
        )
        if not decision.allowed:
            raise DashboardsAuthzDeniedError(
                "Saved question is not accessible for this widget."
            )
        return row

    def _widget_rows_to_update_inputs(
        self, widget_rows: list[DashboardWidgetRow]
    ) -> list[DashboardWidgetUpdateInput]:
        return [
            DashboardWidgetUpdateInput(
                id=w.id,
                title=w.title,
                widget_type=WidgetType(w.widget_type),
                saved_question_id=w.saved_question_id,
                layout=WidgetLayout.model_validate(w.layout),
                config=w.config or {},
                filter_bindings=w.filter_bindings or {},
                filter_overrides=w.filter_overrides or {},
            )
            for w in widget_rows
        ]

    def _validate_widget_type(self, widget_type: WidgetType) -> None:
        try:
            WidgetType(widget_type)
        except ValueError as exc:
            raise UnsupportedWidgetTypeError(str(exc)) from exc

    async def _validate_widget_inputs(
        self,
        session: AsyncSession,
        *,
        global_filters: list[GlobalFilter],
        widgets: list[DashboardWidgetCreateInput | DashboardWidgetUpdateInput],
    ) -> None:
        for widget in widgets:
            self._validate_widget_type(widget.widget_type)
            await self._require_saved_question_access(
                session,
                saved_question_id=widget.saved_question_id,
            )
            try:
                validate_bindings_reference_global_filters(
                    global_filters=global_filters,
                    filter_bindings=widget.filter_bindings,
                    filter_overrides=widget.filter_overrides,
                )
            except FilterValidationError as exc:
                raise _map_filter_error(exc) from exc

    async def _dashboard_authz(
        self,
        session: AsyncSession,
        *,
        dashboard: Dashboard,
        collection_grants: dict[UUID, Any] | None = None,
        dashboard_grants: dict[UUID, Any] | None = None,
        asset_grants: list | None = None,
    ) -> authz.DashboardsAuthzDecision:
        collection_grants = (
            collection_grants
            if collection_grants is not None
            else await self._collection_grant_map(session)
        )
        dashboard_grants = (
            dashboard_grants
            if dashboard_grants is not None
            else await self._dashboard_grant_map(session)
        )
        asset_grants = (
            asset_grants
            if asset_grants is not None
            else await self._asset_grants(session)
        )
        return authz.can_view_dashboard(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard.id,
            collection_grant=collection_grants.get(dashboard.collection_id),
            dashboard_grant=dashboard_grants.get(dashboard.id),
            asset_grants=asset_grants,
        )

    async def _can_edit_dashboard(
        self,
        session: AsyncSession,
        *,
        dashboard: Dashboard,
    ) -> bool:
        collection_grants = await self._collection_grant_map(session)
        dashboard_grants = await self._dashboard_grant_map(session)
        asset_grants = await self._asset_grants(session)
        decision = authz.can_edit_dashboard(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard.id,
            collection_grant=collection_grants.get(dashboard.collection_id),
            dashboard_grant=dashboard_grants.get(dashboard.id),
            asset_grants=asset_grants,
        )
        return decision.allowed

    def _widget_can_export(
        self,
        *,
        widget_type: str,
        export_allowed: bool,
    ) -> bool:
        return export_allowed and widget_type == WidgetType.table.value

    def _widget_editor_dto(
        self,
        row: DashboardWidgetRow,
        *,
        export_allowed: bool,
    ) -> DashboardWidget:
        return DashboardWidget(
            id=row.id,
            title=row.title,
            widget_type=WidgetType(row.widget_type),
            saved_question_id=row.saved_question_id,
            layout=WidgetLayout.model_validate(row.layout),
            config=row.config or {},
            filter_bindings=row.filter_bindings or {},
            filter_overrides=row.filter_overrides or {},
            has_active_overrides=False,
            can_export=self._widget_can_export(
                widget_type=row.widget_type,
                export_allowed=export_allowed,
            ),
        )

    def _widget_consumer_dto(
        self,
        row: DashboardWidgetRow,
        *,
        export_allowed: bool,
    ) -> DashboardWidgetConsumer:
        return DashboardWidgetConsumer(
            id=row.id,
            title=row.title,
            widget_type=WidgetType(row.widget_type),
            layout=WidgetLayout.model_validate(row.layout),
            config=row.config or {},
            filter_bindings=row.filter_bindings or {},
            has_active_overrides=False,
            can_export=self._widget_can_export(
                widget_type=row.widget_type,
                export_allowed=export_allowed,
            ),
        )

    async def _editor_detail(
        self,
        session: AsyncSession,
        *,
        dashboard: Dashboard,
        widgets: list[DashboardWidgetRow],
        can_edit: bool,
    ) -> DashboardEditorDetail:
        view = await self._dashboard_authz(session, dashboard=dashboard)
        export_allowed = view.can_export
        return DashboardEditorDetail(
            id=dashboard.id,
            collection_id=dashboard.collection_id,
            title=dashboard.title,
            definition=_definition_from_row(dashboard),
            widgets=[
                self._widget_editor_dto(w, export_allowed=export_allowed)
                for w in widgets
            ],
            updated_at=dashboard.updated_at,
            can_edit=can_edit,
        )

    async def _consumer_detail(
        self,
        session: AsyncSession,
        *,
        dashboard: Dashboard,
        widgets: list[DashboardWidgetRow],
        can_edit: bool,
    ) -> DashboardConsumerDetail:
        view = await self._dashboard_authz(session, dashboard=dashboard)
        export_allowed = view.can_export
        return DashboardConsumerDetail(
            id=dashboard.id,
            collection_id=dashboard.collection_id,
            title=dashboard.title,
            definition=_definition_from_row(dashboard),
            widgets=[
                self._widget_consumer_dto(w, export_allowed=export_allowed)
                for w in widgets
            ],
            updated_at=dashboard.updated_at,
            can_edit=can_edit,
        )

    async def _upsert_widgets(
        self,
        session: AsyncSession,
        *,
        dashboard_id: UUID,
        global_filters: list[GlobalFilter],
        widgets: list[DashboardWidgetCreateInput | DashboardWidgetUpdateInput],
    ) -> None:
        await self._validate_widget_inputs(
            session,
            global_filters=global_filters,
            widgets=widgets,
        )
        keep_ids: set[UUID] = set()
        for widget in widgets:
            layout = widget.layout.model_dump(mode="json")
            config = widget.config
            bindings = widget.filter_bindings
            overrides = widget.filter_overrides
            widget_id = getattr(widget, "id", None)
            if widget_id is not None:
                keep_ids.add(widget_id)
                existing = await repository.get_active_widget(
                    session,
                    tenant_id=self._actor.tenant_id,
                    workspace_id=self._actor.workspace_id,
                    dashboard_id=dashboard_id,
                    widget_id=widget_id,
                )
                if existing is None:
                    await repository.create_widget(
                        session,
                        tenant_id=self._actor.tenant_id,
                        workspace_id=self._actor.workspace_id,
                        dashboard_id=dashboard_id,
                        widget_id=widget_id,
                        saved_question_id=widget.saved_question_id,
                        widget_type=widget.widget_type.value,
                        title=widget.title,
                        layout=layout,
                        config=config,
                        filter_bindings=bindings,
                        filter_overrides=overrides,
                    )
                else:
                    updated = await repository.update_widget_if_active(
                        session,
                        tenant_id=self._actor.tenant_id,
                        workspace_id=self._actor.workspace_id,
                        dashboard_id=dashboard_id,
                        widget_id=widget_id,
                        saved_question_id=widget.saved_question_id,
                        widget_type=widget.widget_type.value,
                        title=widget.title,
                        layout=layout,
                        config=config,
                        filter_bindings=bindings,
                        filter_overrides=overrides,
                    )
                    if updated is None:
                        raise WidgetNotFoundError(
                            details={"widget_id": str(widget_id)},
                        )
            else:
                new_id = uuid4()
                keep_ids.add(new_id)
                await repository.create_widget(
                    session,
                    tenant_id=self._actor.tenant_id,
                    workspace_id=self._actor.workspace_id,
                    dashboard_id=dashboard_id,
                    widget_id=new_id,
                    saved_question_id=widget.saved_question_id,
                    widget_type=widget.widget_type.value,
                    title=widget.title,
                    layout=layout,
                    config=config,
                    filter_bindings=bindings,
                    filter_overrides=overrides,
                )
        await repository.soft_delete_widgets_not_in(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
            keep_widget_ids=keep_ids,
        )

    async def _assert_unique_title(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID,
        title: str,
        exclude_dashboard_id: UUID | None = None,
    ) -> None:
        duplicate = await repository.find_active_dashboard_by_trimmed_title(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
            title=title,
            exclude_dashboard_id=exclude_dashboard_id,
        )
        if duplicate is not None:
            raise DuplicateDashboardTitleError()

    async def list_dashboards(
        self,
        session: AsyncSession,
        *,
        collection_id: UUID | None = None,
    ) -> DashboardListResponse:
        rows = await repository.list_active_dashboards(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=collection_id,
        )
        visible: list[DashboardSummary] = []
        for row in rows:
            decision = await self._dashboard_authz(session, dashboard=row)
            if not decision.allowed:
                continue
            visible.append(
                DashboardSummary(
                    id=row.id,
                    collection_id=row.collection_id,
                    title=row.title,
                    updated_at=row.updated_at,
                )
            )
        return DashboardListResponse(dashboards=visible)

    async def get_dashboard(
        self,
        session: AsyncSession,
        *,
        dashboard_id: UUID,
    ) -> DashboardEditorDetail | DashboardConsumerDetail:
        dashboard, widgets = await repository.load_dashboard_with_widgets(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        if dashboard is None:
            raise DashboardNotFoundError()
        view = await self._dashboard_authz(session, dashboard=dashboard)
        if not view.allowed:
            raise DashboardsAuthzDeniedError()
        can_edit = await self._can_edit_dashboard(session, dashboard=dashboard)
        if can_edit:
            return await self._editor_detail(
                session,
                dashboard=dashboard,
                widgets=widgets,
                can_edit=True,
            )
        return await self._consumer_detail(
            session,
            dashboard=dashboard,
            widgets=widgets,
            can_edit=False,
        )

    async def create_dashboard(
        self,
        session: AsyncSession,
        *,
        payload: DashboardCreateRequest,
    ) -> DashboardEditorDetail:
        if not internal_author_has_implicit_edit(self._actor.role):
            raise DashboardsAuthzDeniedError(
                "Only internal authors may create dashboards."
            )
        await self._require_collection_edit(
            session,
            collection_id=payload.collection_id,
        )
        title = payload.title.strip()
        if not title:
            raise InvalidParametersError("Dashboard title must not be blank.")
        await self._assert_unique_title(
            session,
            collection_id=payload.collection_id,
            title=title,
        )
        definition = payload.definition or _default_definition()
        _validate_definition_global_filters(definition)
        widgets = payload.widgets or []
        await self._validate_widget_inputs(
            session,
            global_filters=definition.global_filters,
            widgets=widgets,
        )
        row = await repository.create_dashboard(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            collection_id=payload.collection_id,
            title=title,
            definition=_definition_to_json(definition),
            created_by_membership_id=self._actor.membership_id,
        )
        if widgets:
            await self._upsert_widgets(
                session,
                dashboard_id=row.id,
                global_filters=definition.global_filters,
                widgets=widgets,
            )
        _, widget_rows = await repository.load_dashboard_with_widgets(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=row.id,
        )
        return await self._editor_detail(
            session,
            dashboard=row,
            widgets=widget_rows,
            can_edit=True,
        )

    async def update_dashboard(
        self,
        session: AsyncSession,
        *,
        dashboard_id: UUID,
        payload: DashboardUpdateRequest,
    ) -> DashboardEditorDetail:
        dashboard, existing_widgets = await repository.load_dashboard_with_widgets(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        if dashboard is None:
            raise DashboardNotFoundError()
        if not await self._can_edit_dashboard(session, dashboard=dashboard):
            raise DashboardsAuthzDeniedError()

        collection_id = payload.collection_id or dashboard.collection_id
        if payload.collection_id is not None:
            await self._require_collection_edit(
                session,
                collection_id=collection_id,
            )

        title = dashboard.title
        if payload.title is not None:
            title = payload.title.strip()
            if not title:
                raise InvalidParametersError("Dashboard title must not be blank.")

        definition = (
            payload.definition
            if payload.definition is not None
            else _definition_from_row(dashboard)
        )
        _validate_definition_global_filters(definition)

        if payload.title is not None or payload.collection_id is not None:
            await self._assert_unique_title(
                session,
                collection_id=collection_id,
                title=title,
                exclude_dashboard_id=dashboard_id,
            )

        if payload.widgets is not None:
            await self._validate_widget_inputs(
                session,
                global_filters=definition.global_filters,
                widgets=payload.widgets,
            )
        elif payload.definition is not None:
            await self._validate_widget_inputs(
                session,
                global_filters=definition.global_filters,
                widgets=self._widget_rows_to_update_inputs(existing_widgets),
            )

        updated = await repository.update_dashboard_if_current(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
            expected_updated_at=payload.updated_at,
            title=title if payload.title is not None else None,
            collection_id=payload.collection_id,
            definition=(
                _definition_to_json(definition)
                if payload.definition is not None
                else None
            ),
            updated_by_membership_id=self._actor.membership_id,
        )
        if updated is None:
            current = await repository.get_active_dashboard(
                session,
                tenant_id=self._actor.tenant_id,
                workspace_id=self._actor.workspace_id,
                dashboard_id=dashboard_id,
            )
            if current is None:
                raise DashboardNotFoundError()
            raise StaleUpdateError()

        if payload.widgets is not None:
            await self._upsert_widgets(
                session,
                dashboard_id=dashboard_id,
                global_filters=definition.global_filters,
                widgets=payload.widgets,
            )

        _, widget_rows = await repository.load_dashboard_with_widgets(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        return await self._editor_detail(
            session,
            dashboard=updated,
            widgets=widget_rows,
            can_edit=True,
        )

    async def delete_dashboard(
        self,
        session: AsyncSession,
        *,
        dashboard_id: UUID,
    ) -> None:
        dashboard = await repository.get_active_dashboard(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        if dashboard is None:
            raise DashboardNotFoundError()
        if not await self._can_edit_dashboard(session, dashboard=dashboard):
            raise DashboardsAuthzDeniedError()
        deleted = await repository.soft_delete_dashboard(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        if not deleted:
            raise DashboardNotFoundError()

    async def execute_widget(
        self,
        session: AsyncSession,
        *,
        dashboard_id: UUID,
        widget_id: UUID,
        payload: WidgetExecuteRequest,
        connection_service: object,
    ) -> WidgetExecuteResponse:
        dashboard, widgets = await repository.load_dashboard_with_widgets(
            session,
            tenant_id=self._actor.tenant_id,
            workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
        )
        if dashboard is None:
            raise DashboardNotFoundError()
        collection_grants = await self._collection_grant_map(session)
        dashboard_grants = await self._dashboard_grant_map(session)
        asset_grants = await self._asset_grants(session)
        view = await self._dashboard_authz(
            session,
            dashboard=dashboard,
            collection_grants=collection_grants,
            dashboard_grants=dashboard_grants,
            asset_grants=asset_grants,
        )
        if not view.allowed:
            raise DashboardsAuthzDeniedError()
        execute_decision = authz.can_execute_dashboard(
            actor_role=self._actor.role,
            actor_user_id=self._user_id,
            actor_workspace_id=self._actor.workspace_id,
            dashboard_id=dashboard_id,
            collection_grant=collection_grants.get(dashboard.collection_id),
            dashboard_grant=dashboard_grants.get(dashboard_id),
            asset_grants=asset_grants,
        )
        if not execute_decision.allowed:
            raise DashboardsAuthzDeniedError()

        widget = next((w for w in widgets if w.id == widget_id), None)
        if widget is None:
            raise WidgetNotFoundError(details={"widget_id": str(widget_id)})

        definition = _definition_from_row(dashboard)
        global_filters = definition.global_filters
        try:
            validate_global_filter_values(
                global_filters=global_filters,
                global_filter_values=payload.global_filter_values,
            )
            merged = merge_widget_parameters(
                global_filters,
                payload.global_filter_values,
                widget.filter_bindings or {},
                widget.filter_overrides or {},
            )
        except FilterValidationError as exc:
            raise _map_filter_error(exc) from exc

        question = await self._require_saved_question_access(
            session,
            saved_question_id=widget.saved_question_id,
            collection_grants=collection_grants,
            asset_grants=asset_grants,
        )

        declarations = _parameters_from_json(question.parameter_schema)
        try:
            coerced = validate_runtime_parameters(declarations, merged)
        except ParameterValidationError as exc:
            raise InvalidParametersError(str(exc), details=exc.details) from exc

        filter_hash = compute_filter_state_hash(
            global_filters=global_filters,
            global_filter_values=payload.global_filter_values,
            widget_bindings=widget.filter_bindings or {},
            filter_overrides=widget.filter_overrides or {},
        )
        presentation = widget_type_to_presentation_class(widget.widget_type)
        cache_ttl_seconds = clamp_widget_ttl_seconds(widget.config or {}, presentation)

        engine_payload = WidgetQueryExecuteRequest(
            dashboard_id=dashboard_id,
            widget_id=widget_id,
            saved_question_id=widget.saved_question_id,
            parameters=coerced,
            presentation_class=presentation,
            bypass_cache=payload.bypass_cache,
            filter_state_hash=filter_hash,
            cache_ttl_seconds=cache_ttl_seconds,
        )
        result = await execute_workspace_query(
            session,
            tenancy=self._actor,
            auth_user_id=self._user_id,
            payload=engine_payload,
            connection_service=connection_service,
            allow_widget_execution=True,
        )
        return _widget_execute_response(result)
