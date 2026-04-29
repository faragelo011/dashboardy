"""Connection domain service shell (behavior filled in by user story tasks)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

from app.connections.protocols import ConnectionRepositoryProtocol
from app.connections.snowflake import SnowflakeTester
from app.connections.vault import VaultClient


class ConnectionService:
    """Coordinates repository, Vault, and Snowflake adapters.

    Constructor injection keeps routes thin and tests deterministic.
    """

    def __init__(
        self,
        *,
        repository: ConnectionRepositoryProtocol,
        vault: VaultClient,
        snowflake_tester: SnowflakeTester,
        clock: Callable[[], datetime],
    ) -> None:
        self._repository = repository
        self._vault = vault
        self._snowflake_tester = snowflake_tester
        self._clock = clock

    @property
    def repository(self) -> ConnectionRepositoryProtocol:
        return self._repository

    @property
    def vault(self) -> VaultClient:
        return self._vault

    @property
    def snowflake_tester(self) -> SnowflakeTester:
        return self._snowflake_tester

    def now(self) -> datetime:
        return self._clock()
