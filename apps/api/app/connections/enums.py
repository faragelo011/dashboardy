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


class ConnectionTestStatus(StrEnum):
    success = "success"
    failure = "failure"


class ConnectionAuditAction(StrEnum):
    create = "create"
    metadata_update = "metadata_update"
    test = "test"
    rotate = "rotate"


class ConnectionAuditOutcome(StrEnum):
    success = "success"
    failure = "failure"
