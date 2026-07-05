"""Feature 4 ORM: query audit trails + short-TTL tenant cache."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    desc,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.query_engine.enums import ExecutionStatus, PresentationClass

_execution_status_sa = Enum(
    ExecutionStatus,
    name="query_execution_status",
    native_enum=True,
)
_presentation_class_sa = Enum(
    PresentationClass,
    name="cache_presentation_class",
    native_enum=True,
)


class QueryAuditLog(Base):
    __tablename__ = "query_audit_logs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
        Index(
            "ix_query_audit_logs_tenant_created_at",
            "tenant_id",
            desc("created_at"),
        ),
        Index(
            "ix_query_audit_logs_connection_created_at",
            "connection_id",
            desc("created_at"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
    )
    connection_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
    )
    saved_question_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    dashboard_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    widget_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "dashboard_widgets.id",
            ondelete="SET NULL",
            name="fk_query_audit_logs_widget",
        ),
    )
    sql_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    bound_parameters_hash: Mapped[str] = mapped_column(CHAR(64), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    bytes_scanned: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    cache_hit: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status: Mapped[ExecutionStatus] = mapped_column(
        _execution_status_sa,
        nullable=False,
    )
    error_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class CacheEntry(Base):
    __tablename__ = "cache_entries"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "cache_key",
            name="uq_cache_entries_tenant_cache_key",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
        Index("ix_cache_entries_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
    )
    secret_version: Mapped[int] = mapped_column(Integer, nullable=False)
    cache_key: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB(astext_type=Text()), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    presentation_class: Mapped[PresentationClass] = mapped_column(
        _presentation_class_sa,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
