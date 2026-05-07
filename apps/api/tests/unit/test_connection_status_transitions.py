from __future__ import annotations

import pytest
from app.connections.enums import ConnectionStatus
from app.connections.status_transitions import (
    status_after_credentials_submitted,
    status_after_failed_test,
    status_after_successful_test,
)


def test_pending_to_active_on_success() -> None:
    st = status_after_successful_test(ConnectionStatus.pending_test)
    assert st == ConnectionStatus.active


def test_pending_to_failed_on_failure() -> None:
    st = status_after_failed_test(ConnectionStatus.pending_test)
    assert st == ConnectionStatus.test_failed


def test_active_to_failed_on_failed_test_while_rotating() -> None:
    st = status_after_failed_test(ConnectionStatus.active)
    assert st == ConnectionStatus.test_failed


def test_credentials_submitted_from_not_configured() -> None:
    assert (
        status_after_credentials_submitted(ConnectionStatus.not_configured)
        == ConnectionStatus.pending_test
    )


def test_credentials_submitted_from_active() -> None:
    st = status_after_credentials_submitted(ConnectionStatus.active)
    assert st == ConnectionStatus.pending_test


def test_credentials_submitted_from_test_failed() -> None:
    assert (
        status_after_credentials_submitted(ConnectionStatus.test_failed)
        == ConnectionStatus.pending_test
    )


def test_no_delete_disable_path() -> None:
    """MVP forbids delete/disable; transitions stay within the four statuses."""
    with pytest.raises(ValueError):
        status_after_successful_test(ConnectionStatus.not_configured)
