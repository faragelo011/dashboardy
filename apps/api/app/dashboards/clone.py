"""Dashboard clone helpers (Feature 006)."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.dashboards import repository
from app.models.dashboards import Dashboard
from app.models.dashboards import DashboardWidget as DashboardWidgetRow


async def clone_dashboard_with_widgets(
    session: AsyncSession,
    *,
    source_dashboard: Dashboard,
    source_widgets: list[DashboardWidgetRow],
    target_collection_id: UUID,
    title: str,
    created_by_membership_id: UUID,
) -> UUID:
    """Clone dashboard + widgets into target collection.

    Intent: copy content while resetting identity/ownership metadata. We do not copy
    per-dashboard grants; permissions are inherited from the target collection.
    """

    clone = await repository.create_dashboard(
        session,
        tenant_id=source_dashboard.tenant_id,
        workspace_id=source_dashboard.workspace_id,
        collection_id=target_collection_id,
        title=title,
        definition=dict(source_dashboard.definition or {}),
        created_by_membership_id=created_by_membership_id,
    )
    for widget in source_widgets:
        await repository.create_widget(
            session,
            tenant_id=clone.tenant_id,
            workspace_id=clone.workspace_id,
            dashboard_id=clone.id,
            widget_id=uuid4(),
            saved_question_id=widget.saved_question_id,
            widget_type=widget.widget_type,
            title=widget.title,
            layout=dict(widget.layout or {}),
            config=dict(widget.config or {}),
            filter_bindings=dict(widget.filter_bindings or {}),
            filter_overrides=dict(widget.filter_overrides or {}),
        )
    return clone.id
