"""Baseline authorization hooks for POST .../query/execute.

Feature 4 only permits ad hoc SQL for authoring roles. Saved-question and
dashboard/widget execution must wait for Features 5-6 to provide asset context.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import MembershipRole
from app.query_engine.enums import QueryMode
from app.tenancy.permissions import PermissionDecision, PermissionReason
from app.tenancy.resolver import ResolvedTenancy


async def authorize_query_modality(
    session: AsyncSession,
    tenancy: ResolvedTenancy,
    request_body: Mapping[str, Any],
) -> PermissionDecision:
    _ = session

    mode = request_body.get("mode")
    if not isinstance(mode, str):
        return PermissionDecision(False, PermissionReason.role_not_allowed)
    try:
        QueryMode(mode)
    except ValueError:
        return PermissionDecision(False, PermissionReason.role_not_allowed)

    if mode != QueryMode.adhoc.value:
        return PermissionDecision(False, PermissionReason.grant_required)

    if tenancy.role in (MembershipRole.admin, MembershipRole.analyst):
        return PermissionDecision(True, PermissionReason.allowed)

    return PermissionDecision(False, PermissionReason.role_not_allowed)
