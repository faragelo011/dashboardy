"""Data-access helpers for dashboards (Feature 006)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dashboards import Dashboard, DashboardGrant, DashboardWidget

_UNSET = object()


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _active_dashboard_clause():
    return Dashboard.deleted_at.is_(None)


def _active_widget_clause():
    return DashboardWidget.deleted_at.is_(None)


async def list_active_dashboards(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID | None = None,
) -> list[Dashboard]:
    stmt = select(Dashboard).where(
        Dashboard.tenant_id == tenant_id,
        Dashboard.workspace_id == workspace_id,
        _active_dashboard_clause(),
    )
    if collection_id is not None:
        stmt = stmt.where(Dashboard.collection_id == collection_id)
    stmt = stmt.order_by(Dashboard.updated_at.desc(), Dashboard.title)
    return list((await session.execute(stmt)).scalars().all())


async def get_active_dashboard(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> Dashboard | None:
    stmt = select(Dashboard).where(
        Dashboard.tenant_id == tenant_id,
        Dashboard.workspace_id == workspace_id,
        Dashboard.id == dashboard_id,
        _active_dashboard_clause(),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_dashboard_including_deleted(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> Dashboard | None:
    stmt = select(Dashboard).where(
        Dashboard.tenant_id == tenant_id,
        Dashboard.workspace_id == workspace_id,
        Dashboard.id == dashboard_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def find_active_dashboard_by_trimmed_title(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
    title: str,
    exclude_dashboard_id: UUID | None = None,
) -> Dashboard | None:
    trimmed = func.lower(func.trim(Dashboard.title))
    stmt = select(Dashboard).where(
        Dashboard.tenant_id == tenant_id,
        Dashboard.workspace_id == workspace_id,
        Dashboard.collection_id == collection_id,
        trimmed == title.strip().lower(),
        _active_dashboard_clause(),
    )
    if exclude_dashboard_id is not None:
        stmt = stmt.where(Dashboard.id != exclude_dashboard_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_dashboard(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
    title: str,
    definition: dict[str, Any],
    created_by_membership_id: UUID,
) -> Dashboard:
    row = Dashboard(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        collection_id=collection_id,
        title=title,
        definition=definition,
        created_by_membership_id=created_by_membership_id,
        updated_by_membership_id=created_by_membership_id,
    )
    session.add(row)
    await session.flush()
    return row


async def update_dashboard_if_current(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    expected_updated_at: datetime,
    title: str | None = None,
    collection_id: UUID | None = None,
    definition: dict[str, Any] | None = None,
    updated_by_membership_id: UUID | None = None,
) -> Dashboard | None:
    values: dict[str, Any] = {"updated_at": _utcnow()}
    if title is not None:
        values["title"] = title
    if collection_id is not None:
        values["collection_id"] = collection_id
    if definition is not None:
        values["definition"] = definition
    if updated_by_membership_id is not None:
        values["updated_by_membership_id"] = updated_by_membership_id

    stmt = (
        update(Dashboard)
        .where(
            Dashboard.tenant_id == tenant_id,
            Dashboard.workspace_id == workspace_id,
            Dashboard.id == dashboard_id,
            Dashboard.updated_at == expected_updated_at,
            _active_dashboard_clause(),
        )
        .values(**values)
        .returning(Dashboard.id)
    )
    updated_id = (await session.execute(stmt)).scalar_one_or_none()
    if updated_id is None:
        return None
    await session.flush()
    return await get_active_dashboard(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        dashboard_id=dashboard_id,
    )


async def soft_delete_dashboard(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> bool:
    stmt = (
        update(Dashboard)
        .where(
            Dashboard.tenant_id == tenant_id,
            Dashboard.workspace_id == workspace_id,
            Dashboard.id == dashboard_id,
            _active_dashboard_clause(),
        )
        .values(deleted_at=_utcnow(), updated_at=_utcnow())
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0


async def count_active_dashboards_by_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> int:
    stmt = select(func.count()).select_from(Dashboard).where(
        Dashboard.tenant_id == tenant_id,
        Dashboard.workspace_id == workspace_id,
        Dashboard.collection_id == collection_id,
        _active_dashboard_clause(),
    )
    return int((await session.execute(stmt)).scalar_one())


async def list_active_widgets_for_dashboard(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> list[DashboardWidget]:
    stmt = (
        select(DashboardWidget)
        .where(
            DashboardWidget.tenant_id == tenant_id,
            DashboardWidget.workspace_id == workspace_id,
            DashboardWidget.dashboard_id == dashboard_id,
            _active_widget_clause(),
        )
        .order_by(DashboardWidget.created_at)
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_active_widget(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    widget_id: UUID,
) -> DashboardWidget | None:
    stmt = select(DashboardWidget).where(
        DashboardWidget.tenant_id == tenant_id,
        DashboardWidget.workspace_id == workspace_id,
        DashboardWidget.dashboard_id == dashboard_id,
        DashboardWidget.id == widget_id,
        _active_widget_clause(),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def load_dashboard_with_widgets(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> tuple[Dashboard | None, list[DashboardWidget]]:
    dashboard = await get_active_dashboard(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        dashboard_id=dashboard_id,
    )
    if dashboard is None:
        return None, []
    widgets = await list_active_widgets_for_dashboard(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        dashboard_id=dashboard_id,
    )
    return dashboard, widgets


async def create_widget(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    saved_question_id: UUID,
    widget_type: str,
    title: str | None,
    layout: dict[str, Any],
    config: dict[str, Any],
    filter_bindings: dict[str, Any],
    filter_overrides: dict[str, Any],
    widget_id: UUID | None = None,
) -> DashboardWidget:
    row = DashboardWidget(
        id=widget_id,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        dashboard_id=dashboard_id,
        saved_question_id=saved_question_id,
        widget_type=widget_type,
        title=title,
        layout=layout,
        config=config,
        filter_bindings=filter_bindings,
        filter_overrides=filter_overrides,
    )
    session.add(row)
    await session.flush()
    return row


async def update_widget_if_active(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    widget_id: UUID,
    saved_question_id: UUID,
    widget_type: str,
    title: str | None = _UNSET,
    layout: dict[str, Any] | None = None,
    config: dict[str, Any] | None = None,
    filter_bindings: dict[str, Any] | None = None,
    filter_overrides: dict[str, Any] | None = None,
) -> DashboardWidget | None:
    values: dict[str, Any] = {"updated_at": _utcnow()}
    values["saved_question_id"] = saved_question_id
    values["widget_type"] = widget_type
    if title is not _UNSET:
        values["title"] = title
    if layout is not None:
        values["layout"] = layout
    if config is not None:
        values["config"] = config
    if filter_bindings is not None:
        values["filter_bindings"] = filter_bindings
    if filter_overrides is not None:
        values["filter_overrides"] = filter_overrides

    stmt = (
        update(DashboardWidget)
        .where(
            DashboardWidget.tenant_id == tenant_id,
            DashboardWidget.workspace_id == workspace_id,
            DashboardWidget.dashboard_id == dashboard_id,
            DashboardWidget.id == widget_id,
            _active_widget_clause(),
        )
        .values(**values)
        .returning(DashboardWidget.id)
    )
    updated_id = (await session.execute(stmt)).scalar_one_or_none()
    if updated_id is None:
        return None
    await session.flush()
    return await get_active_widget(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        dashboard_id=dashboard_id,
        widget_id=widget_id,
    )


async def soft_delete_widgets_not_in(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    keep_widget_ids: set[UUID],
) -> None:
    stmt = (
        update(DashboardWidget)
        .where(
            DashboardWidget.tenant_id == tenant_id,
            DashboardWidget.workspace_id == workspace_id,
            DashboardWidget.dashboard_id == dashboard_id,
            _active_widget_clause(),
        )
        .values(deleted_at=_utcnow(), updated_at=_utcnow())
    )
    if keep_widget_ids:
        stmt = stmt.where(DashboardWidget.id.not_in(keep_widget_ids))
    await session.execute(stmt)
    await session.flush()


async def get_dashboard_grant(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
    membership_id: UUID,
) -> DashboardGrant | None:
    stmt = select(DashboardGrant).where(
        DashboardGrant.tenant_id == tenant_id,
        DashboardGrant.workspace_id == workspace_id,
        DashboardGrant.dashboard_id == dashboard_id,
        DashboardGrant.membership_id == membership_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_dashboard_grants_for_membership(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    membership_id: UUID,
) -> list[DashboardGrant]:
    stmt = select(DashboardGrant).where(
        DashboardGrant.tenant_id == tenant_id,
        DashboardGrant.workspace_id == workspace_id,
        DashboardGrant.membership_id == membership_id,
    )
    return list((await session.execute(stmt)).scalars().all())


async def list_dashboard_grants_for_dashboard(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    dashboard_id: UUID,
) -> list[DashboardGrant]:
    stmt = select(DashboardGrant).where(
        DashboardGrant.tenant_id == tenant_id,
        DashboardGrant.workspace_id == workspace_id,
        DashboardGrant.dashboard_id == dashboard_id,
    )
    return list((await session.execute(stmt)).scalars().all())
