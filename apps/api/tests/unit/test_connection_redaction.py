from __future__ import annotations

from app.connections.redaction import redact_mapping, redact_string, redact_value


def test_redact_password_in_mapping() -> None:
    out = redact_mapping({"username": "u", "password": "secret"})
    assert out["username"] == "u"
    assert out["password"] == "<redacted>"


def test_redact_private_key_camel_case_in_mapping() -> None:
    out = redact_mapping({"privateKey": "-----BEGIN PRIVATE KEY-----"})
    assert out["privateKey"] == "<redacted>"


def test_redact_vault_id_key() -> None:
    out = redact_mapping({"vault_secret_id": "abc123"})
    assert out["vault_secret_id"] == "<redacted>"


def test_redact_nested_dict() -> None:
    out = redact_mapping({"outer": {"token": "t"}})
    assert out["outer"]["token"] == "<redacted>"


def test_redact_string_vault_like_fragment() -> None:
    s = "error: vault_secret_id=uuid-here and snowflake://acct/db/path"
    out = redact_string(s)
    assert "vault_secret_id=<redacted>" in out
    assert "snowflake://<redacted>" in out


def test_redact_string_json_vault_like_fragment() -> None:
    s = '{"pending_vault_secret_id": "secret-value", "message": "failed"}'
    out = redact_string(s)
    assert "secret-value" not in out
    assert '"pending_vault_secret_id": "<redacted>"' in out


def test_redact_string_preserves_colon_delimiter() -> None:
    out = redact_string("vault_secret_id: uuid-here trailing")
    assert "vault_secret_id: <redacted>" in out
    assert "uuid-here" not in out


def test_redact_exception_value() -> None:
    exc = RuntimeError("See snowflake://acct/db for detail")
    out = redact_value(exc)
    assert "snowflake://<redacted>" in str(out)
