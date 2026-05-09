"""Baseline authorization hooks for POST .../query/execute.

Saved-question and dashboard asset grants stay in Features 5-6.
This validates mode strings plus internal/external membership posture only.
Routes must reject external_client before parsers; denies here still need audits
marked authz_denied in pipeline wiring.

Unused session placeholder until asset lookups ship.
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

    if tenancy.role == MembershipRole.external_client:
        return PermissionDecision(False, PermissionReason.role_not_allowed)

    mode = request_body.get("mode")
    if not isinstance(mode, str):
        return PermissionDecision(False, PermissionReason.role_not_allowed)
    try:
        QueryMode(mode)
    except ValueError:
        return PermissionDecision(False, PermissionReason.role_not_allowed)

    return PermissionDecision(True, PermissionReason.allowed)
