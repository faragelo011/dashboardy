"""SQLAlchemy declarative base and ORM models (extend as features land)."""

from app.models.auth_tenancy import (
    AssetGrant,
    AssetType,
    CollectionGrant,
    CollectionPermission,
    Membership,
    MembershipRole,
    MembershipStatus,
    Tenant,
    Workspace,
)
from app.models.base import Base
from app.models.data_connections import (
    ConnectionManagementAuditRecord,
    ConnectionTestResult,
    DataConnection,
    DbAuditAction,
    DbAuditOutcome,
    DbConnectionStatus,
    DbConnectionTestStatus,
    DbFailureCategory,
)

__all__ = [
    "AssetGrant",
    "AssetType",
    "Base",
    "CollectionGrant",
    "CollectionPermission",
    "ConnectionManagementAuditRecord",
    "ConnectionTestResult",
    "DataConnection",
    "DbAuditAction",
    "DbAuditOutcome",
    "DbConnectionStatus",
    "DbConnectionTestStatus",
    "DbFailureCategory",
    "Membership",
    "MembershipRole",
    "MembershipStatus",
    "Tenant",
    "Workspace",
]
