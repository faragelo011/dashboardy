"""Query execution orchestration (Feature 004).

Ad hoc queries never use the result cache. Saved question / widget request
shapes are reserved for Features 5-6 and are denied before parser/Snowflake
until an owning asset layer supplies authorization and SQL context.
Queue overload → **429** ``warehouse_busy``.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.connections.errors import ConnectionValidationError, DependencyUnavailableError
from app.connections.service import ConnectionService
from app.query_engine.audit_repo import QueryAuditLogInsertDTO, insert_audit_log
from app.query_engine.authz_modalities import authorize_query_modality
from app.query_engine.cache_identity import build_cache_identity_digest
from app.query_engine.cache_repo import (
    CacheEntryUpsertDTO,
    get_by_tenant_cache_key,
    upsert_entry,
)
from app.query_engine.cache_ttl import presentation_class_ttl_seconds
from app.query_engine.enums import ExecutionStatus, PresentationClass, QueryMode
from app.query_engine.hashing import (
    bound_parameters_projection_hash,
    canonical_sql_sha256,
)
from app.query_engine.modal_sql_resolve import WidgetSqlResolveError, resolve_modal_sql
from app.query_engine.parameter_binding import (
    ParameterBindingError,
    prepare_adhoc_sql_hashes,
)
from app.query_engine.parser import QueryParserError
from app.query_engine.queue import (
    QueueFullError,
    QueueTimeoutError,
    acquire_execution_slot,
)
from app.query_engine.schemas import (
    AdhocQueryExecuteRequest,
    ColumnDescriptor,
    QueryExecuteMeta,
    QueryExecuteRequest,
    QueryExecuteSuccessResponse,
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)
from app.query_engine.snowflake_run import execute_snowflake_select
from app.tenancy.permissions import can_execute_workspace_query
from app.tenancy.resolver import ResolvedTenancy

_logger = logging.getLogger(__name__)

_STRUCTURAL_SQL_HASH = canonical_sql_sha256("__query_engine_structural_rejection__")


def _stub_mode_hashes(mode: str, parameters: dict[str, Any]) -> tuple[str, str]:
    return canonical_sql_sha256(f"skipped:{mode}"), bound_parameters_projection_hash(
        parameters
    )


def _meta_error_code_for_outcome(
    outcome_status: ExecutionStatus,
) -> str | None:
    if outcome_status == ExecutionStatus.ok:
        return None
    if outcome_status == ExecutionStatus.timeout:
        return "warehouse_timeout"
    if outcome_status == ExecutionStatus.row_limit_exceeded:
        return "row_limit_exceeded"
    if outcome_status == ExecutionStatus.warehouse_error:
        return "warehouse_query_failed"
    return None


def _snowflake_payload_for_cache(
    *,
    column_names: list[str],
    column_types: list[str | None],
    rows: list[list[Any]],
    truncated: bool,
) -> dict[str, Any]:
    return {
        "v": 1,
        "columns": [
            {"name": n, "type": t}
            for n, t in zip(column_names, column_types, strict=True)
        ],
        "rows": rows,
        "truncated": truncated,
    }


def _response_from_cached_payload(
    payload: dict[str, Any],
    *,
    wall_ms: int,
) -> QueryExecuteSuccessResponse:
    if payload.get("v") != 1:
        msg = "unsupported cache payload version"
        raise ValueError(msg)
    cols_raw = payload.get("columns") or []
    columns_model = [
        ColumnDescriptor(name=c["name"], type=c.get("type")) for c in cols_raw
    ]
    rows = payload.get("rows") or []
    return QueryExecuteSuccessResponse(
        columns=columns_model,
        rows=rows,
        meta=QueryExecuteMeta(
            status=ExecutionStatus.ok,
            duration_ms=wall_ms,
            row_count=len(rows),
            truncated=bool(payload.get("truncated", False)),
            cache_hit=True,
            error_code=None,
        ),
    )


async def execute_workspace_query(
    session: AsyncSession,
    *,
    tenancy: ResolvedTenancy,
    auth_user_id: UUID,
    payload: QueryExecuteRequest,
    connection_service: ConnectionService,
    settings: Settings | None = None,
    allow_saved_question_execution: bool = False,
    allow_widget_execution: bool = False,
) -> QueryExecuteSuccessResponse:
    cfg = settings or get_settings()
    t0 = time.perf_counter()

    def wall_ms() -> int:
        return max(0, int((time.perf_counter() - t0) * 1000))

    saved_question_id: UUID | None = None
    dashboard_id: UUID | None = None
    widget_id: UUID | None = None
    filter_state_hash: str | None = None
    presentation_class: PresentationClass | None = None
    cacheable = False
    bypass_cache = False
    mode_for_cache = ""

    async def _audit(
        *,
        connection_id: UUID | None,
        sql_hash: str,
        bound_hash: str,
        row_count: int,
        bytes_scanned: int | None,
        exec_status: ExecutionStatus,
        error_code: str | None,
        cache_hit: bool,
        audit_sq_id: UUID | None,
        audit_dash_id: UUID | None,
        audit_widget_id: UUID | None = None,
    ) -> None:
        await insert_audit_log(
            session,
            QueryAuditLogInsertDTO(
                tenant_id=tenancy.tenant_id,
                workspace_id=tenancy.workspace_id,
                user_id=auth_user_id,
                connection_id=connection_id,
                saved_question_id=audit_sq_id,
                dashboard_id=audit_dash_id,
                widget_id=audit_widget_id,
                sql_hash=sql_hash,
                bound_parameters_hash=bound_hash,
                row_count=row_count,
                bytes_scanned=bytes_scanned,
                duration_ms=wall_ms(),
                cache_hit=cache_hit,
                status=exec_status,
                error_code=error_code,
            ),
        )

    perm = can_execute_workspace_query(tenancy.role)
    if (
        isinstance(payload, SavedQuestionQueryExecuteRequest)
        and not allow_saved_question_execution
    ):
        await _audit(
            connection_id=None,
            sql_hash=_STRUCTURAL_SQL_HASH,
            bound_hash=bound_parameters_projection_hash(payload.parameters),
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.authz_denied,
            error_code="authz_denied",
            cache_hit=False,
            audit_sq_id=None,
            audit_dash_id=None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "authz_denied",
                "message": "Saved question execution must use the questions API.",
            },
        )
    if isinstance(payload, WidgetQueryExecuteRequest) and not allow_widget_execution:
        await _audit(
            connection_id=None,
            sql_hash=_STRUCTURAL_SQL_HASH,
            bound_hash=bound_parameters_projection_hash(payload.parameters),
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.authz_denied,
            error_code="authz_denied",
            cache_hit=False,
            audit_sq_id=payload.saved_question_id,
            audit_dash_id=payload.dashboard_id,
            audit_widget_id=payload.widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "authz_denied",
                "message": "Widget execution must use the dashboards API.",
            },
        )
    asset_execution_allowed = (
        isinstance(payload, SavedQuestionQueryExecuteRequest)
        and allow_saved_question_execution
    ) or (isinstance(payload, WidgetQueryExecuteRequest) and allow_widget_execution)
    if not perm.allowed and not asset_execution_allowed:
        await _audit(
            connection_id=None,
            sql_hash=_STRUCTURAL_SQL_HASH,
            bound_hash=bound_parameters_projection_hash({}),
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.authz_denied,
            error_code="authz_denied",
            cache_hit=False,
            audit_sq_id=None,
            audit_dash_id=None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "authz_denied",
                "message": "Query execution is not permitted for this principal.",
            },
        )

    modality = await authorize_query_modality(
        session,
        tenancy,
        payload.model_dump(mode="python"),
    )
    if not modality.allowed:
        params: dict[str, Any] = getattr(payload, "parameters", {}) or {}
        sh, ph = _stub_mode_hashes(str(payload.mode), params)
        mode_value = str(payload.mode)
        if mode_value == QueryMode.saved_question.value:
            error_code = "saved_question_not_implemented"
            message = "Saved question execution is not available yet."
        elif mode_value == QueryMode.widget.value:
            error_code = "feature_not_available"
            message = "Widget execution is not available yet."
        else:
            error_code = "authz_denied"
            message = "Query execution is not permitted for this modality."
        await _audit(
            connection_id=None,
            sql_hash=sh,
            bound_hash=ph,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.authz_denied,
            error_code=error_code,
            cache_hit=False,
            audit_sq_id=None,
            audit_dash_id=getattr(payload, "dashboard_id", None),
            audit_widget_id=getattr(payload, "widget_id", None),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": error_code,
                "message": message,
            },
        )

    if isinstance(payload, AdhocQueryExecuteRequest):
        sql_text = payload.sql_text
        parameters = dict(payload.parameters)
    elif isinstance(payload, SavedQuestionQueryExecuteRequest):
        resolved = await resolve_modal_sql(
            session,
            tenant_id=tenancy.tenant_id,
            workspace_id=tenancy.workspace_id,
            payload=payload,
        )
        if resolved is None:
            sh, ph = _stub_mode_hashes("saved_question", payload.parameters)
            await _audit(
                connection_id=None,
                sql_hash=sh,
                bound_hash=ph,
                row_count=0,
                bytes_scanned=None,
                exec_status=ExecutionStatus.authz_denied,
                error_code="question_not_found",
                cache_hit=False,
                audit_sq_id=payload.saved_question_id,
                audit_dash_id=None,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "question_not_found",
                    "message": "Saved question not found.",
                },
            )
        mode_for_cache = QueryMode.saved_question.value
        sql_text, parameters = resolved
        cacheable = True
        bypass_cache = payload.bypass_cache
        presentation_class = payload.presentation_class
        saved_question_id = payload.saved_question_id
        filter_state_hash = payload.filter_state_hash
    else:
        assert isinstance(payload, WidgetQueryExecuteRequest)
        try:
            resolved = await resolve_modal_sql(
                session,
                tenant_id=tenancy.tenant_id,
                workspace_id=tenancy.workspace_id,
                payload=payload,
            )
        except WidgetSqlResolveError as exc:
            sh, ph = _stub_mode_hashes("widget", payload.parameters)
            await _audit(
                connection_id=None,
                sql_hash=sh,
                bound_hash=ph,
                row_count=0,
                bytes_scanned=None,
                exec_status=ExecutionStatus.authz_denied,
                error_code=exc.error_code,
                cache_hit=False,
                audit_sq_id=payload.saved_question_id,
                audit_dash_id=payload.dashboard_id,
                audit_widget_id=payload.widget_id,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": exc.error_code,
                    "message": exc.message,
                },
            ) from exc
        mode_for_cache = QueryMode.widget.value
        sql_text, parameters = resolved
        cacheable = True
        bypass_cache = payload.bypass_cache
        presentation_class = payload.presentation_class
        saved_question_id = payload.saved_question_id
        dashboard_id = payload.dashboard_id
        widget_id = payload.widget_id
        filter_state_hash = payload.filter_state_hash

    try:
        exec_sql, sql_hash, bound_hash = prepare_adhoc_sql_hashes(
            sql_text,
            parameters=parameters,
        )
    except QueryParserError as exc:
        ph = bound_parameters_projection_hash(parameters)
        await _audit(
            connection_id=None,
            sql_hash=_STRUCTURAL_SQL_HASH,
            bound_hash=ph,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.rejected_by_parser,
            error_code=exc.error_code,
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc
    except ParameterBindingError as exc:
        await _audit(
            connection_id=None,
            sql_hash=_STRUCTURAL_SQL_HASH,
            bound_hash=bound_parameters_projection_hash(parameters),
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.rejected_by_parser,
            error_code=exc.error_code,
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc

    try:
        bundle = await connection_service.resolve_active_execution_credentials(
            session=session,
            tenant_id=tenancy.tenant_id,
        )
    except DependencyUnavailableError as exc:
        await _audit(
            connection_id=None,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_error,
            error_code="dependency_unavailable",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "dependency_unavailable", "message": str(exc)},
        ) from exc
    except ConnectionValidationError as exc:
        await _audit(
            connection_id=None,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_error,
            error_code="connection_not_ready",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "connection_not_ready", "message": str(exc)},
        ) from exc

    if bundle is None:
        await _audit(
            connection_id=None,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_error,
            error_code="connection_not_ready",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "connection_not_ready",
                "message": "Snowflake connection is inactive or incomplete.",
            },
        )

    connection_row, secret = bundle

    cache_key_digest: str | None = None
    if cacheable and presentation_class is not None:
        cache_key_digest = build_cache_identity_digest(
            tenant_id=tenancy.tenant_id,
            connection_id=connection_row.id,
            secret_version=connection_row.secret_version,
            sql_hash=sql_hash,
            bound_parameters_hash=bound_hash,
            mode=mode_for_cache,
            saved_question_id=saved_question_id,
            dashboard_id=dashboard_id,
            widget_id=widget_id,
            filter_state_hash=filter_state_hash,
        )

    if cacheable and not bypass_cache and cache_key_digest is not None:
        entry = await get_by_tenant_cache_key(
            session,
            tenant_id=tenancy.tenant_id,
            cache_key=cache_key_digest,
        )
        if entry is not None:
            perm_hit = can_execute_workspace_query(tenancy.role)
            mod_hit = await authorize_query_modality(
                session,
                tenancy,
                payload.model_dump(mode="python"),
            )
            saved_question_hit_allowed = (
                isinstance(payload, SavedQuestionQueryExecuteRequest)
                and allow_saved_question_execution
            )
            widget_hit_allowed = (
                isinstance(payload, WidgetQueryExecuteRequest)
                and allow_widget_execution
            )
            cache_reuse_denied = (
                not saved_question_hit_allowed
                and not widget_hit_allowed
                and not perm_hit.allowed
            ) or not mod_hit.allowed
            if cache_reuse_denied:
                await _audit(
                    connection_id=connection_row.id,
                    sql_hash=sql_hash,
                    bound_hash=bound_hash,
                    row_count=0,
                    bytes_scanned=None,
                    exec_status=ExecutionStatus.authz_denied,
                    error_code="authz_denied",
                    cache_hit=False,
                    audit_sq_id=saved_question_id,
                    audit_dash_id=dashboard_id,
                    audit_widget_id=widget_id,
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error_code": "authz_denied",
                        "message": (
                            "Cached query reuse is not permitted for this principal."
                        ),
                    },
                )
            try:
                resp = _response_from_cached_payload(
                    entry.payload,
                    wall_ms=wall_ms(),
                )
            except (KeyError, TypeError, ValueError):
                # Malformed cache row; fall through to live warehouse execution.
                pass
            else:
                await _audit(
                    connection_id=connection_row.id,
                    sql_hash=sql_hash,
                    bound_hash=bound_hash,
                    row_count=resp.meta.row_count,
                    bytes_scanned=None,
                    exec_status=ExecutionStatus.ok,
                    error_code=None,
                    cache_hit=True,
                    audit_sq_id=saved_question_id,
                    audit_dash_id=dashboard_id,
                    audit_widget_id=widget_id,
                )
                return resp

    try:
        async with acquire_execution_slot():
            sf_out = await execute_snowflake_select(
                connection_row=connection_row,
                secret=secret,
                sql_text=exec_sql,
                bindings=parameters,
                settings=cfg,
            )
    except QueueFullError:
        await _audit(
            connection_id=connection_row.id,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_busy,
            error_code="warehouse_busy",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error_code": "warehouse_busy",
                "message": "Warehouse execution capacity is saturated.",
            },
        )
    except QueueTimeoutError:
        await _audit(
            connection_id=connection_row.id,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_busy,
            error_code="warehouse_busy",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error_code": "warehouse_busy",
                "message": "Warehouse execution capacity is saturated.",
            },
        )
    except Exception as exc:
        _logger.exception("snowflake_runner_unexpected_failure")
        await _audit(
            connection_id=connection_row.id,
            sql_hash=sql_hash,
            bound_hash=bound_hash,
            row_count=0,
            bytes_scanned=None,
            exec_status=ExecutionStatus.warehouse_error,
            error_code="warehouse_query_failed",
            cache_hit=False,
            audit_sq_id=saved_question_id,
            audit_dash_id=dashboard_id,
            audit_widget_id=widget_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "warehouse_query_failed",
                "message": "An unexpected error occurred during query execution.",
            },
        ) from exc

    resolved_meta_code = (
        None
        if sf_out.status == ExecutionStatus.ok
        else (_meta_error_code_for_outcome(sf_out.status) or "warehouse_query_failed")
    )

    await _audit(
        connection_id=connection_row.id,
        sql_hash=sql_hash,
        bound_hash=bound_hash,
        row_count=len(sf_out.rows),
        bytes_scanned=sf_out.bytes_scanned,
        exec_status=sf_out.status,
        error_code=resolved_meta_code,
        cache_hit=False,
        audit_sq_id=saved_question_id,
        audit_dash_id=dashboard_id,
        audit_widget_id=widget_id,
    )

    if (
        cacheable
        and not bypass_cache
        and cache_key_digest is not None
        and sf_out.status == ExecutionStatus.ok
        and presentation_class is not None
    ):
        try:
            ttl_secs = presentation_class_ttl_seconds(presentation_class, settings=cfg)
            expires_at = datetime.now(tz=UTC) + timedelta(seconds=ttl_secs)
            blob = _snowflake_payload_for_cache(
                column_names=sf_out.column_names,
                column_types=sf_out.column_types,
                rows=sf_out.rows,
                truncated=sf_out.truncated,
            )
            if saved_question_id is not None:
                blob["saved_question_id"] = str(saved_question_id)
            await upsert_entry(
                session,
                CacheEntryUpsertDTO(
                    tenant_id=tenancy.tenant_id,
                    connection_id=connection_row.id,
                    secret_version=connection_row.secret_version,
                    cache_key=cache_key_digest,
                    payload=blob,
                    expires_at=expires_at,
                    presentation_class=presentation_class,
                ),
            )
        except Exception:
            _logger.exception("cache_write_failed")

    pairs = zip(sf_out.column_names, sf_out.column_types, strict=True)
    columns_model = [ColumnDescriptor(name=n, type=t) for n, t in pairs]

    resp_meta = QueryExecuteMeta(
        status=sf_out.status,
        duration_ms=wall_ms(),
        row_count=len(sf_out.rows),
        truncated=sf_out.truncated,
        cache_hit=False,
        error_code=resolved_meta_code,
    )

    return QueryExecuteSuccessResponse(
        columns=columns_model,
        rows=sf_out.rows,
        meta=resp_meta,
    )
