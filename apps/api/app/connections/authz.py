"""Authorization helpers for connection management (admin-only)."""

from __future__ import annotations

from app.connections.errors import AuthzDeniedError
from app.tenancy.permissions import can_manage_members
from app.tenancy.resolver import ResolvedTenancy


def require_admin_membership(actor: ResolvedTenancy) -> None:
    if not can_manage_members(actor.role).allowed:
        raise AuthzDeniedError("You do not have permission to manage data connections.")
