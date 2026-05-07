from __future__ import annotations

from app.connections.enums import FailureCategory
from app.connections.snowflake import categorize_snowflake_failure


def test_failure_mapping_timeout():
    assert (
        categorize_snowflake_failure(RuntimeError("Operation timed out"))
        == FailureCategory.timeout
    )


def test_failure_mapping_network():
    assert (
        categorize_snowflake_failure(RuntimeError("Failed to connect to host"))
        == FailureCategory.network
    )


def test_failure_mapping_permission():
    assert (
        categorize_snowflake_failure(RuntimeError("Not authorized to access warehouse"))
        == FailureCategory.permission
    )


def test_failure_mapping_credential():
    assert (
        categorize_snowflake_failure(RuntimeError("Incorrect username or password"))
        == FailureCategory.credential
    )


def test_failure_mapping_unknown():
    assert (
        categorize_snowflake_failure(RuntimeError("Something else"))
        == FailureCategory.unknown
    )
