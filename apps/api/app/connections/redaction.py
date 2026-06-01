"""Remove secret material from strings and nested structures for safe logging."""

from __future__ import annotations

import re
from typing import Any

_PASSWORD_KEYS = frozenset(
    {
        "password",
        "private_key",
        "privatekey",
        "private_key_pem",
        "private_key_passphrase",
        "token",
        "access_token",
        "refresh_token",
        "secret",
    }
)

_SENSITIVE_KEY_PATTERN = (
    r"password|private_key|privatekey|private_key_pem|private_key_passphrase|"
    r"token|access_token|refresh_token|secret"
)
_VAULT_KEY_PATTERN = r"vault_secret_id|pending_vault_secret_id"

_ASSIGNMENT_PREFIX = (
    r"(?P<prekey>[\"']?)"
    r"(?P<key>{key_pattern})\b"
    r"(?P<postkey>[\"']?)"
    r"(?P<pre_d>\s*)"
    r"(?P<delim>[:=])"
    r"(?P<post_d>\s*)"
)
_QUOTED_REDACT_REPL = (
    r"\g<prekey>\g<key>\g<postkey>\g<pre_d>\g<delim>\g<post_d>"
    r"\g<open_q><redacted>\g<open_q>"
)
_UNQUOTED_REDACT_REPL = (
    r"\g<prekey>\g<key>\g<postkey>\g<pre_d>\g<delim>\g<post_d>"
    r"\g<open_q><redacted>\g<close_q>"
)

_QUOTED_SENSITIVE_ASSIGNMENT = re.compile(
    _ASSIGNMENT_PREFIX.format(key_pattern=_SENSITIVE_KEY_PATTERN)
    + r"(?P<open_q>['\"])(?P<token>.*?)(?P=open_q)",
    re.IGNORECASE,
)
_UNQUOTED_SENSITIVE_ASSIGNMENT = re.compile(
    _ASSIGNMENT_PREFIX.format(key_pattern=_SENSITIVE_KEY_PATTERN)
    + r"(?P<open_q>)(?P<token>[^,\s\"']+)(?P<close_q>)",
    re.IGNORECASE,
)
_QUOTED_VAULT_SECRET_ID = re.compile(
    _ASSIGNMENT_PREFIX.format(key_pattern=_VAULT_KEY_PATTERN)
    + r"(?P<open_q>['\"])(?P<token>.*?)(?P=open_q)",
    re.IGNORECASE,
)
_UNQUOTED_VAULT_SECRET_ID = re.compile(
    _ASSIGNMENT_PREFIX.format(key_pattern=_VAULT_KEY_PATTERN)
    + r"(?P<open_q>)(?P<token>[^,\s\"']+)(?P<close_q>)",
    re.IGNORECASE,
)

_SNOWFLAKE_CONN_HINT = re.compile(r"snowflake://[^\s'\"]+", re.IGNORECASE)
_PEM_BLOCK = re.compile(
    r"-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----",
    re.IGNORECASE | re.DOTALL,
)


def redact_string(value: str) -> str:
    out = value
    out = _PEM_BLOCK.sub("<redacted-private-key>", out)
    out = _QUOTED_SENSITIVE_ASSIGNMENT.sub(_QUOTED_REDACT_REPL, out)
    out = _UNQUOTED_SENSITIVE_ASSIGNMENT.sub(_UNQUOTED_REDACT_REPL, out)
    out = _QUOTED_VAULT_SECRET_ID.sub(_QUOTED_REDACT_REPL, out)
    out = _UNQUOTED_VAULT_SECRET_ID.sub(_UNQUOTED_REDACT_REPL, out)
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
