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
from app.models.query_engine import CacheEntry, QueryAuditLog

from app.models.dashboards import Dashboard, DashboardGrant, DashboardWidget
from app.models.saved_questions import Collection, QuestionGrant, SavedQuestion

__all__ = [
    "AssetGrant",
    "AssetType",
    "Base",
    "CacheEntry",
    "Collection",
    "CollectionGrant",
    "CollectionPermission",
    "ConnectionManagementAuditRecord",
    "ConnectionTestResult",
    "Dashboard",
    "DashboardGrant",
    "DashboardWidget",
    "DataConnection",
    "DbAuditAction",
    "DbAuditOutcome",
    "DbConnectionStatus",
    "DbConnectionTestStatus",
    "DbFailureCategory",
    "Membership",
    "MembershipRole",
    "MembershipStatus",
    "QueryAuditLog",
    "QuestionGrant",
    "SavedQuestion",
    "Tenant",
    "Workspace",
]
