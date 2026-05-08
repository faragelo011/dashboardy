"""Unit tests for Vault secret name versioning (pending vs effective)."""

from __future__ import annotations

import pytest
from app.connections.service import _next_vault_credential_version


@pytest.mark.parametrize(
    ("secret_version", "pending_secret_version", "expected"),
    [
        (None, None, 1),
        (0, None, 1),
        (1, None, 2),
        (0, 1, 2),
        (1, 2, 3),
        (1, 1, 2),
    ],
)
def test_next_vault_credential_version_monotonic(
    secret_version: int | None,
    pending_secret_version: int | None,
    expected: int,
) -> None:
    assert (
        _next_vault_credential_version(
            secret_version=secret_version,
            pending_secret_version=pending_secret_version,
        )
        == expected
    )
