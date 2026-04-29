"""Feature 3 ORM models: tenant data connections, tests, and audits."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DbConnectionStatus(StrEnum):
    not_configured = "not_configured"
    pending_test = "pending_test"
    active = "active"
    test_failed = "test_failed"


class DbConnectionTestStatus(StrEnum):
    success = "success"
    failure = "failure"


class DbFailureCategory(StrEnum):
    credential = "credential"
    network = "network"
    permission = "permission"
    timeout = "timeout"
    unknown = "unknown"


_failure_category_enum = Enum(
    DbFailureCategory,
    name="connection_failure_category",
    native_enum=True,
)


class DbAuditAction(StrEnum):
    create = "create"
    metadata_update = "metadata_update"
    test = "test"
    rotate = "rotate"


class DbAuditOutcome(StrEnum):
    success = "success"
    failure = "failure"


class DataConnection(Base):
    __tablename__ = "data_connections"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_data_connections_tenant_id"),
        UniqueConstraint("tenant_id", "id", name="uq_data_connections_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "updated_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        Index("ix_data_connections_tenant_id", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    vault_secret_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    secret_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    pending_vault_secret_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_secret_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    warehouse: Mapped[str] = mapped_column(Text, nullable=False)
    database: Mapped[str] = mapped_column(Text, nullable=False)
    schema_: Mapped[str | None] = mapped_column("schema", Text, nullable=True)
    status: Mapped[DbConnectionStatus] = mapped_column(
        Enum(DbConnectionStatus, name="connection_status", native_enum=True),
        nullable=False,
        server_default=text("'not_configured'::connection_status"),
    )
    last_tested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_successful_test_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    updated_by_membership_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ConnectionTestResult(Base):
    __tablename__ = "connection_test_results"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "attempted_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_connection_test_results_tenant_connection_completed",
            "tenant_id",
            "connection_id",
            "completed_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    attempted_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    credential_version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[DbConnectionTestStatus] = mapped_column(
        Enum(DbConnectionTestStatus, name="connection_test_status", native_enum=True),
        nullable=False,
    )
    failure_category: Mapped[DbFailureCategory | None] = mapped_column(
        _failure_category_enum,
        nullable=True,
    )
    sanitized_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ConnectionManagementAuditRecord(Base):
    __tablename__ = "connection_management_audit_records"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "actor_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_connection_mgmt_audit_tenant_connection_created",
            "tenant_id",
            "connection_id",
            "created_at",
        ),
        Index(
            "ix_connection_mgmt_audit_tenant_actor_created",
            "tenant_id",
            "actor_membership_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    actor_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    action: Mapped[DbAuditAction] = mapped_column(
        Enum(DbAuditAction, name="connection_audit_action", native_enum=True),
        nullable=False,
    )
    outcome: Mapped[DbAuditOutcome] = mapped_column(
        Enum(DbAuditOutcome, name="connection_audit_outcome", native_enum=True),
        nullable=False,
    )
    failure_category: Mapped[DbFailureCategory | None] = mapped_column(
        _failure_category_enum,
        nullable=True,
    )
    sanitized_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
