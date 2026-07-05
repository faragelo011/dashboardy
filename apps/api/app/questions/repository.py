"""Data-access helpers for saved questions and collections (Feature 005)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import CollectionGrant
from app.models.saved_questions import Collection, QuestionGrant, SavedQuestion

_UNSET = object()


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _active_collection_clause():
    return Collection.deleted_at.is_(None)


def _active_question_clause():
    return SavedQuestion.deleted_at.is_(None)


async def list_active_collections(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
) -> list[Collection]:
    stmt = (
        select(Collection)
        .where(
            Collection.tenant_id == tenant_id,
            Collection.workspace_id == workspace_id,
            _active_collection_clause(),
        )
        .order_by(Collection.sort_order, Collection.name)
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_active_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> Collection | None:
    stmt = select(Collection).where(
        Collection.tenant_id == tenant_id,
        Collection.workspace_id == workspace_id,
        Collection.id == collection_id,
        _active_collection_clause(),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_collection_including_deleted(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> Collection | None:
    stmt = select(Collection).where(
        Collection.tenant_id == tenant_id,
        Collection.workspace_id == workspace_id,
        Collection.id == collection_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def find_active_collection_by_trimmed_name(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    name: str,
    exclude_collection_id: UUID | None = None,
) -> Collection | None:
    trimmed = func.lower(func.trim(Collection.name))
    stmt = select(Collection).where(
        Collection.tenant_id == tenant_id,
        Collection.workspace_id == workspace_id,
        trimmed == name.strip().lower(),
        _active_collection_clause(),
    )
    if exclude_collection_id is not None:
        stmt = stmt.where(Collection.id != exclude_collection_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def find_active_collection_by_slug(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    slug: str,
    exclude_collection_id: UUID | None = None,
) -> Collection | None:
    stmt = select(Collection).where(
        Collection.tenant_id == tenant_id,
        Collection.workspace_id == workspace_id,
        Collection.slug == slug,
        _active_collection_clause(),
    )
    if exclude_collection_id is not None:
        stmt = stmt.where(Collection.id != exclude_collection_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    name: str,
    slug: str,
    sort_order: int,
    created_by_membership_id: UUID,
) -> Collection:
    row = Collection(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        name=name,
        slug=slug,
        sort_order=sort_order,
        created_by_membership_id=created_by_membership_id,
    )
    session.add(row)
    await session.flush()
    return row


async def update_collection_if_current(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
    expected_updated_at: datetime,
    name: str | None = None,
    slug: str | None = None,
    sort_order: int | None = None,
) -> Collection | None:
    values: dict[str, Any] = {"updated_at": _utcnow()}
    if name is not None:
        values["name"] = name
    if slug is not None:
        values["slug"] = slug
    if sort_order is not None:
        values["sort_order"] = sort_order

    stmt = (
        update(Collection)
        .where(
            Collection.tenant_id == tenant_id,
            Collection.workspace_id == workspace_id,
            Collection.id == collection_id,
            Collection.updated_at == expected_updated_at,
            _active_collection_clause(),
        )
        .values(**values)
        .returning(Collection.id)
    )
    updated_id = (await session.execute(stmt)).scalar_one_or_none()
    if updated_id is None:
        return None
    await session.flush()
    return await get_active_collection(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        collection_id=collection_id,
    )


async def soft_delete_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> bool:
    stmt = (
        update(Collection)
        .where(
            Collection.tenant_id == tenant_id,
            Collection.workspace_id == workspace_id,
            Collection.id == collection_id,
            _active_collection_clause(),
        )
        .values(deleted_at=_utcnow(), updated_at=_utcnow())
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0


async def count_active_questions_in_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> int:
    stmt = select(func.count()).select_from(SavedQuestion).where(
        SavedQuestion.tenant_id == tenant_id,
        SavedQuestion.workspace_id == workspace_id,
        SavedQuestion.collection_id == collection_id,
        _active_question_clause(),
    )
    return int((await session.execute(stmt)).scalar_one())


async def count_active_dashboards_by_collection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
) -> int:
    from app.dashboards import repository as dashboards_repository

    return await dashboards_repository.count_active_dashboards_by_collection(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        collection_id=collection_id,
    )


async def list_active_saved_questions(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID | None = None,
) -> list[SavedQuestion]:
    stmt = select(SavedQuestion).where(
        SavedQuestion.tenant_id == tenant_id,
        SavedQuestion.workspace_id == workspace_id,
        _active_question_clause(),
    )
    if collection_id is not None:
        stmt = stmt.where(SavedQuestion.collection_id == collection_id)
    stmt = stmt.order_by(SavedQuestion.updated_at.desc(), SavedQuestion.title)
    return list((await session.execute(stmt)).scalars().all())


async def get_active_saved_question_by_id(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    question_id: UUID,
) -> SavedQuestion | None:
    stmt = select(SavedQuestion).where(
        SavedQuestion.tenant_id == tenant_id,
        SavedQuestion.workspace_id == workspace_id,
        SavedQuestion.id == question_id,
        _active_question_clause(),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_active_saved_question(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    question_id: UUID,
) -> SavedQuestion | None:
    stmt = select(SavedQuestion).where(
        SavedQuestion.tenant_id == tenant_id,
        SavedQuestion.workspace_id == workspace_id,
        SavedQuestion.id == question_id,
        _active_question_clause(),
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_saved_question_including_deleted(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    question_id: UUID,
) -> SavedQuestion | None:
    stmt = select(SavedQuestion).where(
        SavedQuestion.tenant_id == tenant_id,
        SavedQuestion.workspace_id == workspace_id,
        SavedQuestion.id == question_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_saved_question(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
    title: str,
    description: str | None,
    sql_text: str,
    parameter_schema: list[dict[str, Any]],
    created_by_membership_id: UUID,
) -> SavedQuestion:
    row = SavedQuestion(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        collection_id=collection_id,
        title=title,
        description=description,
        sql_text=sql_text,
        parameter_schema=parameter_schema,
        created_by_membership_id=created_by_membership_id,
        updated_by_membership_id=created_by_membership_id,
    )
    session.add(row)
    await session.flush()
    return row


async def clone_saved_question(
    session: AsyncSession,
    *,
    source: SavedQuestion,
    target_collection_id: UUID,
    title: str,
    created_by_membership_id: UUID,
) -> SavedQuestion:
    return await create_saved_question(
        session,
        tenant_id=source.tenant_id,
        workspace_id=source.workspace_id,
        collection_id=target_collection_id,
        title=title,
        description=source.description,
        sql_text=source.sql_text,
        parameter_schema=list(source.parameter_schema),
        created_by_membership_id=created_by_membership_id,
    )


async def list_question_grants_for_saved_question(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    saved_question_id: UUID,
) -> list[QuestionGrant]:
    stmt = select(QuestionGrant).where(
        QuestionGrant.tenant_id == tenant_id,
        QuestionGrant.workspace_id == workspace_id,
        QuestionGrant.saved_question_id == saved_question_id,
    )
    return list((await session.execute(stmt)).scalars().all())


async def update_saved_question_if_current(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    question_id: UUID,
    expected_updated_at: datetime,
    collection_id: UUID | None = None,
    title: str | None = None,
    description: str | None | object = _UNSET,
    sql_text: str | None = None,
    parameter_schema: list[dict[str, Any]] | None = None,
    updated_by_membership_id: UUID | None = None,
) -> SavedQuestion | None:
    values: dict[str, Any] = {"updated_at": _utcnow()}
    if collection_id is not None:
        values["collection_id"] = collection_id
    if title is not None:
        values["title"] = title
    if description is not _UNSET:
        values["description"] = description
    if sql_text is not None:
        values["sql_text"] = sql_text
    if parameter_schema is not None:
        values["parameter_schema"] = parameter_schema
    if updated_by_membership_id is not None:
        values["updated_by_membership_id"] = updated_by_membership_id

    stmt = (
        update(SavedQuestion)
        .where(
            SavedQuestion.tenant_id == tenant_id,
            SavedQuestion.workspace_id == workspace_id,
            SavedQuestion.id == question_id,
            SavedQuestion.updated_at == expected_updated_at,
            _active_question_clause(),
        )
        .values(**values)
        .returning(SavedQuestion.id)
    )
    updated_id = (await session.execute(stmt)).scalar_one_or_none()
    if updated_id is None:
        return None
    await session.flush()
    return await get_active_saved_question(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        question_id=question_id,
    )


async def soft_delete_saved_question(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    question_id: UUID,
    updated_by_membership_id: UUID | None = None,
) -> bool:
    values: dict[str, Any] = {"deleted_at": _utcnow(), "updated_at": _utcnow()}
    if updated_by_membership_id is not None:
        values["updated_by_membership_id"] = updated_by_membership_id
    stmt = (
        update(SavedQuestion)
        .where(
            SavedQuestion.tenant_id == tenant_id,
            SavedQuestion.workspace_id == workspace_id,
            SavedQuestion.id == question_id,
            _active_question_clause(),
        )
        .values(**values)
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount > 0


async def get_collection_grant(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    collection_id: UUID,
    membership_id: UUID,
) -> CollectionGrant | None:
    stmt = select(CollectionGrant).where(
        CollectionGrant.tenant_id == tenant_id,
        CollectionGrant.workspace_id == workspace_id,
        CollectionGrant.collection_id == collection_id,
        CollectionGrant.membership_id == membership_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_collection_grants_for_membership(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    membership_id: UUID,
) -> list[CollectionGrant]:
    stmt = select(CollectionGrant).where(
        CollectionGrant.tenant_id == tenant_id,
        CollectionGrant.workspace_id == workspace_id,
        CollectionGrant.membership_id == membership_id,
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_question_grant(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    saved_question_id: UUID,
    membership_id: UUID,
) -> QuestionGrant | None:
    stmt = select(QuestionGrant).where(
        QuestionGrant.tenant_id == tenant_id,
        QuestionGrant.workspace_id == workspace_id,
        QuestionGrant.saved_question_id == saved_question_id,
        QuestionGrant.membership_id == membership_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_question_grants_for_membership(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    membership_id: UUID,
) -> list[QuestionGrant]:
    stmt = select(QuestionGrant).where(
        QuestionGrant.tenant_id == tenant_id,
        QuestionGrant.workspace_id == workspace_id,
        QuestionGrant.membership_id == membership_id,
    )
    return list((await session.execute(stmt)).scalars().all())
