"""Admin-only data connections routes (Feature 3)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.config import get_settings
from app.connections import repository as connections_repository
from app.connections.errors import (
    AuthzDeniedError,
    ConnectionConflictError,
    ConnectionServiceError,
    ConnectionValidationError,
    DependencyUnavailableError,
)
from app.connections.schemas import DataConnectionResponse, UpsertConnectionRequest
from app.connections.service import ConnectionService
from app.connections.vault import HttpSupabaseVaultClient, VaultClient
from app.db.deps import get_db
from app.tenancy import repository as tenancy_repository
from app.tenancy.resolver import ResolvedTenancy, resolve_membership_for_workspace

router = APIRouter(tags=["connections"])


def _forbidden(*, error_code: str, message: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": error_code, "message": message},
    )


async def _require_active_membership(
    *,
    session: AsyncSession,
    user_id: UUID,
    workspace_id: UUID,
) -> ResolvedTenancy:
    resolved = await resolve_membership_for_workspace(
        session,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    if resolved is None:
        membership = await tenancy_repository.get_membership_for_user_workspace(
            session,
            user_id=user_id,
            workspace_id=workspace_id,
        )
        if membership is not None and membership.status.value != "active":
            _forbidden(
                error_code="inactive_membership",
                message="Workspace access is inactive.",
            )
        _forbidden(error_code="no_membership", message="Workspace access is required.")
    return resolved


class _NoopSnowflakeTester:
    async def test_connection(
        self, *, credentials: object, timeout_seconds: float
    ) -> object:
        raise RuntimeError("Snowflake tester not configured for this endpoint")


def _build_vault_client() -> VaultClient:
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return _UnconfiguredVaultClient()
    return HttpSupabaseVaultClient(
        base_url=settings.SUPABASE_URL,
        service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )


class _UnconfiguredVaultClient:
    async def store_secret(self, *, name: str, secret_payload: dict[str, str]) -> str:
        raise DependencyUnavailableError(
            "Supabase Vault client is not configured for this request"
        )


def _build_service(*, vault_required: bool) -> ConnectionService:
    # Snowflake tester is used in Phase 4; keep a placeholder here.
    return ConnectionService(
        repository=connections_repository,
        vault=_build_vault_client() if vault_required else _UnconfiguredVaultClient(),  # type: ignore[arg-type]
        snowflake_tester=_NoopSnowflakeTester(),  # type: ignore[arg-type]
        clock=lambda: datetime.now(tz=UTC),
    )


@router.get(
    "/workspaces/{workspace_id}/connection",
    response_model=DataConnectionResponse,
)
async def get_workspace_connection(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DataConnectionResponse:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = _build_service(vault_required=False)
        return await service.get_connection_metadata(session=session, actor=actor)
    except AuthzDeniedError as exc:
        _forbidden(error_code=exc.error_code, message=str(exc))
    except ConnectionServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc


@router.put(
    "/workspaces/{workspace_id}/connection",
    response_model=DataConnectionResponse,
)
async def upsert_workspace_connection(
    workspace_id: UUID,
    payload: UpsertConnectionRequest,
    response: Response,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DataConnectionResponse:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = _build_service(vault_required=payload.credentials is not None)
        result, created = await service.upsert_connection(
            session=session,
            actor=actor,
            payload=payload,
        )
    except AuthzDeniedError as exc:
        _forbidden(error_code=exc.error_code, message=str(exc))
    except ConnectionValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": exc.error_code,
                "message": str(exc),
                "details": getattr(exc, "details", None),
            },
        ) from exc
    except ConnectionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc
    except DependencyUnavailableError as exc:
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc
    except ConnectionServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc

    await session.commit()
    if created:
        response.status_code = status.HTTP_201_CREATED
    return result
