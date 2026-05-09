"""Canonical SQL and parameter projection hashing for audit + cache identity."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any
from uuid import UUID


def canonical_sql_sha256(canonical_sql: str) -> str:
    return hashlib.sha256(canonical_sql.encode("utf-8")).hexdigest()


def bound_parameters_projection_hash(bindings: dict[str, Any]) -> str:
    tagged = [(key, _tag(bindings[key])) for key in sorted(bindings.keys())]
    payload = json.dumps(tagged, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _digest_utf8(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _tag(value: Any) -> Any:
    """Stable projection; string values stored as digests, not raw literals."""

    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "bool", "v": value}
    if isinstance(value, str):
        return {"type": "str", "sha256": _digest_utf8(value)}
    if isinstance(value, int) and not isinstance(value, bool):
        return {"type": "int", "v": value}
    if isinstance(value, float):
        return {"type": "float", "v": repr(value)}
    if isinstance(value, Decimal):
        return {"type": "decimal", "v": str(value)}
    if isinstance(value, UUID):
        return {"type": "uuid", "v": str(value)}
    if isinstance(value, (list, tuple)):
        return {"type": "sequence", "items": [_tag(v) for v in value]}
    if isinstance(value, dict):
        entries = [(k, _tag(value[k])) for k in sorted(value)]
        return {"type": "mapping", "entries": entries}
    return {"type": "repr", "sha256": _digest_utf8(repr(value))}
