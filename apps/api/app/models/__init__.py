"""SQLAlchemy declarative base and ORM models (extend as features land)."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for Alembic autogenerate and ORM models."""
