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
from app.connections.schemas import (
    ConnectionTestResponse,
    DataConnectionResponse,
    RotateConnectionRequest,
    UpsertConnectionRequest,
)
from app.connections.service import ConnectionService
from app.connections.snowflake import SnowflakeConnectorTester
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


async def require_active_membership(
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

    async def read_secret(self, *, secret_id: str) -> dict[str, str]:
        _ = secret_id
        raise DependencyUnavailableError(
            "Supabase Vault client is not configured for this request"
        )


def get_connection_service(*, vault_required: bool) -> ConnectionService:
    return ConnectionService(
        repository=connections_repository,
        vault=_build_vault_client() if vault_required else _UnconfiguredVaultClient(),  # type: ignore[arg-type]
        snowflake_tester=SnowflakeConnectorTester(),
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
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = get_connection_service(vault_required=False)
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
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = get_connection_service(vault_required=payload.credentials is not None)
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


@router.post(
    "/workspaces/{workspace_id}/connection/test",
    response_model=ConnectionTestResponse,
)
async def test_workspace_connection(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ConnectionTestResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = get_connection_service(vault_required=True)
        result = await service.test_connection(session=session, actor=actor)
    except AuthzDeniedError as exc:
        _forbidden(error_code=exc.error_code, message=str(exc))
    except DependencyUnavailableError as exc:
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc
    except ConnectionServiceError as exc:
        status_code = status.HTTP_400_BAD_REQUEST
        if exc.error_code == "connection_not_found":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc

    await session.commit()
    return result


@router.post(
    "/workspaces/{workspace_id}/connection/rotate",
    response_model=DataConnectionResponse,
)
async def rotate_workspace_connection(
    workspace_id: UUID,
    payload: RotateConnectionRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DataConnectionResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        service = get_connection_service(vault_required=True)
        result = await service.rotate_credentials(
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
    except DependencyUnavailableError as exc:
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc
    except ConnectionServiceError as exc:
        status_code = status.HTTP_400_BAD_REQUEST
        if exc.error_code == "connection_not_found":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(
            status_code=status_code,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc

    await session.commit()
    return result
