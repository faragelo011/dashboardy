"""Deterministic cache keys for tenant-isolated result reuse (constitution §3.3).

The digest is **SHA-256** over UTF-8 delimited identity fields and returned as **64-char
lowercase hex**, which fits ``cache_key VARCHAR(128)`` with room for future prefixes.
"""

from __future__ import annotations

import hashlib
from uuid import UUID


def build_cache_identity_digest(
    *,
    tenant_id: UUID,
    connection_id: UUID,
    secret_version: int,
    sql_hash: str,
    bound_parameters_hash: str,
    mode: str,
    saved_question_id: UUID | None,
    dashboard_id: UUID | None,
    widget_id: UUID | None,
    filter_state_hash: str | None,
) -> str:
    """Build a stable cache key digest for ``cache_entries.cache_key``."""

    def _u(uu: UUID | None) -> str:
        return str(uu) if uu is not None else ""

    raw = "|".join(
        (
            str(tenant_id),
            str(connection_id),
            str(int(secret_version)),
            sql_hash,
            bound_parameters_hash,
            mode,
            _u(saved_question_id),
            _u(dashboard_id),
            _u(widget_id),
            filter_state_hash or "",
        ),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
