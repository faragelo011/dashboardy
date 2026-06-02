"""Feature 005 ORM models: collections, saved questions, and question grants.

ORM enums and table mappings land in Phase 2 (T010); Phase 1 only scaffolds the module
so Alembic/model metadata can discover imports from `app.models`.
"""

from app.models.base import Base

__all__ = ["Base"]
