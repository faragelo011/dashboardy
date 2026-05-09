"""HTTP route modules."""

from app.routes.auth import router as auth_router
from app.routes.connections import router as connections_router
from app.routes.me import router as me_router
from app.routes.query import router as query_router
from app.routes.workspaces import router as workspaces_router

__all__ = [
    "me_router",
    "auth_router",
    "workspaces_router",
    "connections_router",
    "query_router",
]
