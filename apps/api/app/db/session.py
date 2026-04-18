from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Return a process-wide async engine (cached; safe for concurrent first use)."""
    return create_async_engine(get_settings().DATABASE_URL, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_async_session_maker() -> async_sessionmaker[AsyncSession]:
    """Return the async session factory bound to :func:`get_engine`."""
    return async_sessionmaker(
        bind=get_engine(),
        expire_on_commit=False,
        class_=AsyncSession,
    )
