"""Shared async DB seeds for saved-questions tests (Feature 005)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import (
    AssetType,
    CollectionPermission,
    MembershipRole,
    MembershipStatus,
)
from app.models.data_connections import DataConnection, DbConnectionStatus
from app.questions import repository as questions_repository

from tests.factories import auth_tenancy as factories


@dataclass(frozen=True, slots=True)
class SeededAuthorWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    actor_user_id: uuid.UUID
    actor_membership_id: uuid.UUID
    connection_id: uuid.UUID | None = None


@dataclass(frozen=True, slots=True)
class SeededQuestionCatalog:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    connection_id: uuid.UUID
    collection_id: uuid.UUID
    question_id: uuid.UUID
    admin_user_id: uuid.UUID
    analyst_user_id: uuid.UUID
    viewer_user_id: uuid.UUID
    external_user_id: uuid.UUID


async def seed_workspace_with_author(
    *,
    actor_role: MembershipRole = MembershipRole.analyst,
    with_connection: bool = False,
) -> SeededAuthorWorkspace:
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)
            actor_user_id = uuid.uuid4()
            actor = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=actor_user_id,
                role=actor_role,
                status=MembershipStatus.active,
                invited_email=f"{actor_role.value}@example.com",
            )
            connection_id: uuid.UUID | None = None
            if with_connection:
                conn = DataConnection(
                    tenant_id=tenant.id,
                    name="saved-questions test",
                    warehouse="WH",
                    database="DB",
                    schema_="PUBLIC",
                    status=DbConnectionStatus.active,
                    vault_secret_id="vault-test",
                    created_by_membership_id=actor.id,
                )
                session.add(conn)
                await session.flush()
                connection_id = conn.id
            await session.commit()
            return SeededAuthorWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                actor_user_id=actor_user_id,
                actor_membership_id=actor.id,
                connection_id=connection_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


@dataclass(frozen=True, slots=True)
class SeededCloneWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    source_collection_id: uuid.UUID
    target_collection_id: uuid.UUID
    source_question_id: uuid.UUID
    cloner_user_id: uuid.UUID
    cloner_membership_id: uuid.UUID
    target_viewer_user_id: uuid.UUID
    grant_editor_user_id: uuid.UUID
    restricted_user_id: uuid.UUID
    source_widened_membership_id: uuid.UUID


async def seed_clone_scenario() -> SeededCloneWorkspace:
    from app.models.saved_questions import QuestionGrant

    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)

            admin = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=uuid.uuid4(),
                role=MembershipRole.admin,
                status=MembershipStatus.active,
            )
            cloner_user_id = uuid.uuid4()
            cloner = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=cloner_user_id,
                role=MembershipRole.analyst,
                status=MembershipStatus.active,
            )
            widened_viewer = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=uuid.uuid4(),
                role=MembershipRole.viewer,
                status=MembershipStatus.active,
            )
            target_viewer_user_id = uuid.uuid4()
            target_viewer = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=target_viewer_user_id,
                role=MembershipRole.viewer,
                status=MembershipStatus.active,
            )
            grant_editor_user_id = uuid.uuid4()
            grant_editor = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=grant_editor_user_id,
                role=MembershipRole.viewer,
                status=MembershipStatus.active,
            )
            restricted_user_id = uuid.uuid4()
            restricted = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=restricted_user_id,
                role=MembershipRole.viewer,
                status=MembershipStatus.active,
            )

            source_collection = await questions_repository.create_collection(
                session,
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                name="Source",
                slug="source",
                sort_order=0,
                created_by_membership_id=admin.id,
            )
            target_collection = await questions_repository.create_collection(
                session,
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                name="Target",
                slug="target",
                sort_order=1,
                created_by_membership_id=admin.id,
            )
            question = await questions_repository.create_saved_question(
                session,
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                collection_id=source_collection.id,
                title="ARR",
                description="Annual recurring revenue",
                sql_text="SELECT %(region)s AS region, 1 AS amount",
                parameter_schema=[
                    {
                        "name": "region",
                        "type": "string",
                        "required": True,
                    }
                ],
                created_by_membership_id=admin.id,
            )

            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=cloner,
                collection_id=source_collection.id,
                permission=CollectionPermission.view,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=cloner,
                collection_id=target_collection.id,
                permission=CollectionPermission.edit,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=target_viewer,
                collection_id=target_collection.id,
                permission=CollectionPermission.view,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=grant_editor,
                collection_id=source_collection.id,
                permission=CollectionPermission.view,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=grant_editor,
                collection_id=target_collection.id,
                permission=CollectionPermission.edit,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=restricted,
                collection_id=source_collection.id,
                permission=CollectionPermission.view,
            )
            await factories.create_collection_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                membership=restricted,
                collection_id=target_collection.id,
                permission=CollectionPermission.view,
            )

            session.add(
                QuestionGrant(
                    tenant_id=tenant.id,
                    workspace_id=workspace.id,
                    saved_question_id=question.id,
                    membership_id=widened_viewer.id,
                    permission=CollectionPermission.edit,
                    created_by_membership_id=admin.id,
                )
            )
            await session.flush()
            await session.commit()
            return SeededCloneWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                source_collection_id=source_collection.id,
                target_collection_id=target_collection.id,
                source_question_id=question.id,
                cloner_user_id=cloner_user_id,
                cloner_membership_id=cloner.id,
                target_viewer_user_id=target_viewer_user_id,
                grant_editor_user_id=grant_editor_user_id,
                restricted_user_id=restricted_user_id,
                source_widened_membership_id=widened_viewer.id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


async def seed_question_catalog(
    *,
    grant_viewer_collection_access: bool = True,
    grant_external_asset: bool = True,
) -> SeededQuestionCatalog:
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)

            admin_user_id = uuid.uuid4()
            admin = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=admin_user_id,
                role=MembershipRole.admin,
                status=MembershipStatus.active,
            )
            analyst_user_id = uuid.uuid4()
            await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=analyst_user_id,
                role=MembershipRole.analyst,
                status=MembershipStatus.active,
            )
            viewer_user_id = uuid.uuid4()
            viewer = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=viewer_user_id,
                role=MembershipRole.viewer,
                status=MembershipStatus.active,
            )
            external_user_id = uuid.uuid4()
            await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=external_user_id,
                role=MembershipRole.external_client,
                status=MembershipStatus.active,
            )

            conn = DataConnection(
                tenant_id=tenant.id,
                name="saved-questions catalog",
                warehouse="WH",
                database="DB",
                schema_="PUBLIC",
                status=DbConnectionStatus.active,
                vault_secret_id="vault-test",
                created_by_membership_id=admin.id,
            )
            session.add(conn)
            await session.flush()

            collection = await questions_repository.create_collection(
                session,
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                name="Revenue",
                slug="revenue",
                sort_order=0,
                created_by_membership_id=admin.id,
            )
            question = await questions_repository.create_saved_question(
                session,
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                collection_id=collection.id,
                title="ARR",
                description="Annual recurring revenue",
                sql_text="SELECT %(region)s AS region, 1 AS amount",
                parameter_schema=[
                    {
                        "name": "region",
                        "type": "string",
                        "required": True,
                    }
                ],
                created_by_membership_id=admin.id,
            )

            if grant_viewer_collection_access:
                await factories.create_collection_grant(
                    session,
                    tenant=tenant,
                    workspace=workspace,
                    membership=viewer,
                    collection_id=collection.id,
                    permission=CollectionPermission.view,
                )
            if grant_external_asset:
                await factories.create_asset_grant(
                    session,
                    tenant=tenant,
                    workspace=workspace,
                    user_id=external_user_id,
                    asset_id=question.id,
                    asset_type=AssetType.question,
                    created_by=admin,
                )

            await session.commit()
            return SeededQuestionCatalog(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                connection_id=conn.id,
                collection_id=collection.id,
                question_id=question.id,
                admin_user_id=admin_user_id,
                analyst_user_id=analyst_user_id,
                viewer_user_id=viewer_user_id,
                external_user_id=external_user_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
