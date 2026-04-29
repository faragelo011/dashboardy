"""Pure status transition helpers (no I/O, no secrets)."""

from __future__ import annotations

from app.connections.enums import ConnectionStatus


def status_after_credentials_submitted(current: ConnectionStatus) -> ConnectionStatus:
    if current in (
        ConnectionStatus.not_configured,
        ConnectionStatus.active,
        ConnectionStatus.test_failed,
    ):
        return ConnectionStatus.pending_test
    if current == ConnectionStatus.pending_test:
        return ConnectionStatus.pending_test
    msg = f"Unexpected status for credential submission: {current}"
    raise ValueError(msg)


def status_after_successful_test(current: ConnectionStatus) -> ConnectionStatus:
    if current == ConnectionStatus.pending_test:
        return ConnectionStatus.active
    if current == ConnectionStatus.active:
        return ConnectionStatus.active
    msg = f"Unexpected status for successful test: {current}"
    raise ValueError(msg)


def status_after_failed_test(current: ConnectionStatus) -> ConnectionStatus:
    if current in (ConnectionStatus.pending_test, ConnectionStatus.active):
        return ConnectionStatus.test_failed
    msg = f"Unexpected status for failed test: {current}"
    raise ValueError(msg)


def status_after_metadata_update_only(current: ConnectionStatus) -> ConnectionStatus:
    """Metadata-only updates do not change lifecycle status."""
    return current
