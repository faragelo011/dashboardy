"""Dashboard routes (Feature 006).

Route groups from specs/006-dashboard-builder/contracts/dashboards.openapi.yaml:
- List/create dashboard: GET/POST /workspaces/{workspace_id}/dashboards
- Get/patch/delete dashboard:
  GET/PATCH/DELETE /workspaces/{workspace_id}/dashboards/{dashboard_id}
- Clone: POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/clone
- Widget execute:
  POST .../dashboards/{dashboard_id}/widgets/{widget_id}/execute
- Table export:
  GET .../dashboards/{dashboard_id}/widgets/{widget_id}/export.csv
"""

from __future__ import annotations

import json
from typing import Annotated, NoReturn
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.dashboards.schemas import (
    DashboardConsumerDetail,
    DashboardCloneRequest,
    DashboardCreateRequest,
    DashboardEditorDetail,
    DashboardListResponse,
    DashboardUpdateRequest,
    FilterStateExport,
    WidgetExecuteRequest,
    WidgetExecuteResponse,
)
from app.dashboards.service import DashboardService, DashboardServiceError
from app.db.deps import get_db
from app.routes.connections import get_connection_service, require_active_membership

router = APIRouter(tags=["dashboards"])


def _forbidden(*, error_code: str, message: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": error_code, "message": message},
    )


def _map_service_error(exc: DashboardServiceError) -> NoReturn:
    code = exc.error_code
    if code in {"authz_denied", "export_not_permitted"}:
        _forbidden(error_code=code, message=str(exc))
    if code in {"dashboard_not_found", "widget_not_found"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    if code in {"duplicate_dashboard_title", "stale_update"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    if code in {
        "invalid_parameters",
        "invalid_filter_bindings",
        "widget_local_filter_forbidden",
        "unsupported_widget_type",
        "export_execution_refused",
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error_code": code, "message": str(exc), "details": exc.details},
    ) from exc


def _parse_filter_state(raw: str) -> FilterStateExport:
    if len(raw) > 2048:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "invalid_parameters",
                "message": "filter_state exceeds maximum length.",
            },
        )
    try:
        payload = json.loads(unquote(raw))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "invalid_parameters",
                "message": "filter_state must be URL-encoded JSON.",
            },
        ) from exc
    try:
        return FilterStateExport.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "invalid_parameters",
                "message": "filter_state is invalid.",
                "details": exc.errors(),
            },
        ) from exc


@router.get("/dashboards", response_model=DashboardListResponse)
async def list_dashboards(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    collection_id: Annotated[UUID | None, Query()] = None,
) -> DashboardListResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.list_dashboards(session, collection_id=collection_id)
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.post(
    "/dashboards",
    response_model=DashboardEditorDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_dashboard(
    workspace_id: UUID,
    payload: DashboardCreateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardEditorDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.create_dashboard(session, payload=payload)
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.get(
    "/dashboards/{dashboard_id}",
    response_model=DashboardEditorDetail | DashboardConsumerDetail,
)
async def get_dashboard(
    workspace_id: UUID,
    dashboard_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardEditorDetail | DashboardConsumerDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.get_dashboard(session, dashboard_id=dashboard_id)
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.patch(
    "/dashboards/{dashboard_id}",
    response_model=DashboardEditorDetail,
)
async def update_dashboard(
    workspace_id: UUID,
    dashboard_id: UUID,
    payload: DashboardUpdateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardEditorDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.update_dashboard(
            session,
            dashboard_id=dashboard_id,
            payload=payload,
        )
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.delete(
    "/dashboards/{dashboard_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_dashboard(
    workspace_id: UUID,
    dashboard_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        await service.delete_dashboard(session, dashboard_id=dashboard_id)
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/dashboards/{dashboard_id}/clone",
    response_model=DashboardEditorDetail,
    status_code=status.HTTP_201_CREATED,
)
async def clone_dashboard(
    workspace_id: UUID,
    dashboard_id: UUID,
    payload: DashboardCloneRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardEditorDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.clone_dashboard(
            session,
            dashboard_id=dashboard_id,
            payload=payload,
        )
    except DashboardServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.post(
    "/dashboards/{dashboard_id}/widgets/{widget_id}/execute",
    response_model=WidgetExecuteResponse,
)
async def execute_dashboard_widget(
    workspace_id: UUID,
    dashboard_id: UUID,
    widget_id: UUID,
    payload: WidgetExecuteRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WidgetExecuteResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    connection_service = get_connection_service(vault_required=True)
    try:
        result = await service.execute_widget(
            session,
            dashboard_id=dashboard_id,
            widget_id=widget_id,
            payload=payload,
            connection_service=connection_service,
        )
    except DashboardServiceError as exc:
        _map_service_error(exc)
    except HTTPException:
        await session.commit()
        raise
    await session.commit()
    return result


@router.get(
    "/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
)
async def export_dashboard_widget_csv(
    workspace_id: UUID,
    dashboard_id: UUID,
    widget_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    filter_state: Annotated[str, Query()],
    bypass_cache: Annotated[bool, Query()] = False,
) -> Response:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = DashboardService(actor=actor, user_id=auth.user_id)
    connection_service = get_connection_service(vault_required=True)
    parsed = _parse_filter_state(filter_state)
    try:
        csv_text = await service.export_widget_csv(
            session,
            dashboard_id=dashboard_id,
            widget_id=widget_id,
            global_filter_values=parsed.global_filter_values,
            bypass_cache=bypass_cache,
            connection_service=connection_service,
        )
    except DashboardServiceError as exc:
        _map_service_error(exc)
    except HTTPException:
        await session.commit()
        raise
    await session.commit()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                'attachment; filename="dashboard-'
                f'{dashboard_id}-widget-{widget_id}.csv"'
            ),
        },
    )
