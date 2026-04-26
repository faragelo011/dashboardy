from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.logging import configure_logging
from app.middleware import CorrelationIdMiddleware
from app.routes.health import router as health_router
from app.routes.ready import router as ready_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.LOG_LEVEL)
    yield


app = FastAPI(title="Dashboardy API", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)
app.include_router(health_router)
app.include_router(ready_router)
