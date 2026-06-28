"""Saved questions and collections routes (Feature 005)."""

from __future__ import annotations

from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.db.deps import get_db
from app.query_engine.schemas import QueryExecuteSuccessResponse
from app.questions.schemas import (
    CollectionCreateRequest,
    CollectionListResponse,
    CollectionResponse,
    CollectionUpdateRequest,
    SavedQuestionCloneRequest,
    SavedQuestionConsumerDetail,
    SavedQuestionCreateRequest,
    SavedQuestionExecuteRequest,
    SavedQuestionInternalDetail,
    SavedQuestionListResponse,
    SavedQuestionUpdateRequest,
)
from app.questions.service import QuestionService, QuestionServiceError
from app.routes.connections import get_connection_service, require_active_membership

router = APIRouter(tags=["questions"])


def _forbidden(*, error_code: str, message: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": error_code, "message": message},
    )


def _map_service_error(exc: QuestionServiceError) -> NoReturn:
    code = exc.error_code
    if code == "authz_denied":
        _forbidden(error_code=code, message=str(exc))
    if code in {"collection_not_found", "question_not_found"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    if code in {"duplicate_collection_name", "stale_update", "collection_not_empty"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    if code == "invalid_parameters":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": code,
                "message": str(exc),
                "details": exc.details,
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error_code": code, "message": str(exc), "details": exc.details},
    ) from exc


@router.get("/collections", response_model=CollectionListResponse)
async def list_collections(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CollectionListResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.list_collections(session)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.post(
    "/collections",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_collection(
    workspace_id: UUID,
    payload: CollectionCreateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CollectionResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.create_collection(session, payload=payload)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.get("/collections/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    workspace_id: UUID,
    collection_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CollectionResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.get_collection(session, collection_id=collection_id)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.patch("/collections/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    workspace_id: UUID,
    collection_id: UUID,
    payload: CollectionUpdateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CollectionResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.update_collection(
            session,
            collection_id=collection_id,
            payload=payload,
        )
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.delete("/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    workspace_id: UUID,
    collection_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        await service.delete_collection(session, collection_id=collection_id)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/questions", response_model=SavedQuestionListResponse)
async def list_saved_questions(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    collection_id: Annotated[UUID | None, Query()] = None,
) -> SavedQuestionListResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.list_questions(
            session,
            collection_id=collection_id,
        )
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.post(
    "/questions",
    response_model=SavedQuestionInternalDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_saved_question(
    workspace_id: UUID,
    payload: SavedQuestionCreateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SavedQuestionInternalDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.create_question(session, payload=payload)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.get(
    "/questions/{question_id}",
    response_model=SavedQuestionInternalDetail | SavedQuestionConsumerDetail,
)
async def get_saved_question(
    workspace_id: UUID,
    question_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SavedQuestionInternalDetail | SavedQuestionConsumerDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.get_question(session, question_id=question_id)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.patch("/questions/{question_id}", response_model=SavedQuestionInternalDetail)
async def update_saved_question(
    workspace_id: UUID,
    question_id: UUID,
    payload: SavedQuestionUpdateRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SavedQuestionInternalDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.update_question(
            session,
            question_id=question_id,
            payload=payload,
        )
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_question(
    workspace_id: UUID,
    question_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        await service.delete_question(session, question_id=question_id)
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/questions/{question_id}/execute",
    response_model=QueryExecuteSuccessResponse,
)
async def execute_saved_question(
    workspace_id: UUID,
    question_id: UUID,
    payload: SavedQuestionExecuteRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> QueryExecuteSuccessResponse:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    connection_service = get_connection_service(vault_required=True)
    try:
        result = await service.execute_question(
            session,
            question_id=question_id,
            payload=payload,
            connection_service=connection_service,
        )
    except QuestionServiceError as exc:
        _map_service_error(exc)
    except HTTPException:
        await session.commit()
        raise
    await session.commit()
    return result


@router.post(
    "/questions/{question_id}/clone",
    response_model=SavedQuestionInternalDetail,
    status_code=status.HTTP_201_CREATED,
)
async def clone_saved_question(
    workspace_id: UUID,
    question_id: UUID,
    payload: SavedQuestionCloneRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SavedQuestionInternalDetail:
    actor = await require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    service = QuestionService(actor=actor, user_id=auth.user_id)
    try:
        result = await service.clone_question(
            session,
            question_id=question_id,
            payload=payload,
        )
    except QuestionServiceError as exc:
        _map_service_error(exc)
    await session.commit()
    return result
