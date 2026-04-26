from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routes.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Dashboardy API", lifespan=lifespan)
app.include_router(health_router)
