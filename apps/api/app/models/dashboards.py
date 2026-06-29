"""Feature 006 ORM models: dashboards, dashboard widgets, and dashboard grants."""

from __future__ import annotations

import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Dashboard(Base):
    """Workspace analytical canvas. Full columns land in T010."""

    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)


class DashboardWidget(Base):
    """Widget row belonging to one dashboard. Full columns land in T010."""

    __tablename__ = "dashboard_widgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)


class DashboardGrant(Base):
    """Internal per-dashboard widen grant. Full columns land in T010."""

    __tablename__ = "dashboard_grants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
