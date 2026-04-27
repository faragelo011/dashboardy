import logging

from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger("dashboardy.health")


@router.get("/health")
async def health() -> dict:
    logger.info("health_check")
    return {"status": "ok"}
