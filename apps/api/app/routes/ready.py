import asyncio

from fastapi import APIRouter, Response, status
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, SQLAlchemyError

from app.db.session import get_engine

router = APIRouter()


@router.get("/ready")
async def ready(response: Response) -> dict:
    try:
        async with asyncio.timeout(1.0):
            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
    except TimeoutError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "reason": "database_timeout"}
    except (SQLAlchemyError, DBAPIError, OSError, ConnectionError, BrokenPipeError):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "reason": "database_unreachable"}
    return {"status": "ready"}
