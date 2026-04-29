from enum import StrEnum


class ConnectionStatus(StrEnum):
    not_configured = "not_configured"
    pending_test = "pending_test"
    active = "active"
    test_failed = "test_failed"


class FailureCategory(StrEnum):
    credential = "credential"
    network = "network"
    permission = "permission"
    timeout = "timeout"
    unknown = "unknown"
