"""Bounded Snowflake concurrency + bounded wait patience (constitution §8.2).

Semantics (per worker process):
- At most ``QUERY_ENGINE_CONCURRENT_SNOWFLAKE_EXECUTIONS`` queries run concurrently.
- At most ``QUERY_ENGINE_WAITING_REQUESTS_QUEUE_DEPTH`` coroutines may be **blocked**
  waiting for a slot; additional arrivals get ``QueueFullError`` immediately.
- Each waiter uses ``QUERY_ENGINE_EXECUTION_SLOT_WAIT_SECONDS`` max before
  ``QueueTimeoutError``.

Primitives are initialized on first ``acquire_execution_slot`` inside the running
event loop so imports do not eagerly load ``Settings``, and Locks bind to the correct
loop in tests.

Effective cluster capacity scales with horizontally scaled replicas (no global Redis
queue in MVP).
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from app.config import get_settings


class QueueFullError(Exception):
    """Wait buffer saturated before an execution slot could be reserved."""


class QueueTimeoutError(Exception):
    """Patience window elapsed while waiting for an execution slot."""


@dataclass
class _GateRuntime:
    exec_sem: asyncio.Semaphore
    wait_lock: asyncio.Lock
    max_waiting: int
    slot_wait_seconds: float
    waiting_blocked: int = field(default=0)


_rt: _GateRuntime | None = None


async def _ensure_gate() -> _GateRuntime:
    global _rt
    if _rt is None:
        s = get_settings()
        _rt = _GateRuntime(
            exec_sem=asyncio.Semaphore(s.QUERY_ENGINE_CONCURRENT_SNOWFLAKE_EXECUTIONS),
            wait_lock=asyncio.Lock(),
            max_waiting=s.QUERY_ENGINE_WAITING_REQUESTS_QUEUE_DEPTH,
            slot_wait_seconds=float(s.QUERY_ENGINE_EXECUTION_SLOT_WAIT_SECONDS),
        )
    return _rt


@asynccontextmanager
async def acquire_execution_slot() -> AsyncIterator[None]:
    rt = await _ensure_gate()

    async with rt.wait_lock:
        if rt.waiting_blocked >= rt.max_waiting:
            raise QueueFullError(
                "query execution wait buffer is full "
                f"(max {rt.max_waiting} concurrent waiters)"
            )
        rt.waiting_blocked += 1

    try:
        await asyncio.wait_for(
            rt.exec_sem.acquire(), timeout=rt.slot_wait_seconds
        )
    except TimeoutError as exc:
        async with rt.wait_lock:
            rt.waiting_blocked -= 1
        raise QueueTimeoutError(
            "timed out waiting for a query execution slot "
            f"({int(rt.slot_wait_seconds)}s)"
        ) from exc

    async with rt.wait_lock:
        rt.waiting_blocked -= 1

    try:
        yield
    finally:
        rt.exec_sem.release()
