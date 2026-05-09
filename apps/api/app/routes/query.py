"""Internal query execution + analytics harness (Feature 004)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.db.deps import get_db
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import QueryExecuteRequest, QueryExecuteSuccessResponse
from app.routes import connections as connections_routes

router = APIRouter(tags=["query"])


@router.post(
    "/workspaces/{workspace_id}/query/execute",
    response_model=QueryExecuteSuccessResponse,
)
async def post_workspace_query_execute(
    workspace_id: UUID,
    payload: QueryExecuteRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> QueryExecuteSuccessResponse:
    actor = await connections_routes.require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = connections_routes.get_connection_service(vault_required=True)
    try:
        result = await execute_workspace_query(
            session,
            tenancy=actor,
            auth_user_id=auth.user_id,
            payload=payload,
            connection_service=service,
        )
    except HTTPException:
        await session.commit()
        raise
    await session.commit()
    return result
