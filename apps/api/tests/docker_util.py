"""Helpers for tests that need a local Docker daemon (testcontainers)."""

from __future__ import annotations

import pytest


def skip_if_no_docker() -> None:
    try:
        import docker

        docker.from_env().ping()
    except Exception as exc:
        pytest.skip(f"Docker not available: {exc}")
