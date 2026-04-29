"""Remove secret material from strings and nested structures for safe logging."""

from __future__ import annotations

import re
from typing import Any

_PASSWORD_KEYS = frozenset(
    {
        "password",
        "private_key",
        "privatekey",
        "token",
        "access_token",
        "refresh_token",
        "secret",
    }
)

_VAULT_SECRET_ID = re.compile(
    r"(?P<prekey>[\"']?)"
    r"(?P<key>vault_secret_id|pending_vault_secret_id)\b"
    r"(?P<postkey>[\"']?)"
    r"(?P<pre_d>\s*)"
    r"(?P<delim>[:=])"
    r"(?P<post_d>\s*)"
    r"(?P<open_q>[\"']?)"
    r"(?P<token>[^,\s}\"']+)"
    r"(?P<close_q>[\"']?)",
    re.IGNORECASE,
)

_SNOWFLAKE_CONN_HINT = re.compile(r"snowflake://[^\s'\"]+", re.IGNORECASE)


def redact_string(value: str) -> str:
    out = value
    out = _VAULT_SECRET_ID.sub(
        r"\g<prekey>\g<key>\g<postkey>\g<pre_d>\g<delim>\g<post_d>"
        r"\g<open_q><redacted>\g<close_q>",
        out,
    )
    out = _SNOWFLAKE_CONN_HINT.sub("snowflake://<redacted>", out)
    return out


def redact_value(value: Any) -> Any:
    if isinstance(value, str):
        return redact_string(value)
    if isinstance(value, dict):
        return redact_mapping(value)
    if isinstance(value, list):
        return [redact_value(v) for v in value]
    if isinstance(value, BaseException):
        return redact_string(repr(value))
    return value


def redact_mapping(data: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, raw in data.items():
        lk = str(key).lower()
        if lk in _PASSWORD_KEYS:
            out[key] = "<redacted>"
            continue
        if lk.endswith("_vault_secret_id") or lk in (
            "vault_secret_id",
            "pending_vault_secret_id",
        ):
            out[key] = "<redacted>" if raw is not None else None
            continue
        out[key] = redact_value(raw)
    return out
