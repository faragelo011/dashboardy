from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.admin.routes import router as admin_router
from app.config import get_settings
from app.logging import configure_logging
from app.middleware import CorrelationIdMiddleware
from app.routes import auth_router, connections_router, me_router, workspaces_router
from app.routes.health import router as health_router
from app.routes.ready import router as ready_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.LOG_LEVEL)
    yield


app = FastAPI(title="Dashboardy API", lifespan=lifespan)
app.add_middleware(CorrelationIdMiddleware)

# Allow the web app to call the API from the browser in local/dev (e.g. sign-in flows).
_default_web_origin = (
    "http://localhost:3000" if settings.ENVIRONMENT == "local" else None
)
_web_origin = (settings.WEB_PUBLIC_URL or "").strip() or _default_web_origin
_allowed_origins = [_web_origin] if _web_origin else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def normalized_http_exception_handler(
    _request: Request,
    exc: HTTPException,
) -> JSONResponse:
    if (
        isinstance(exc.detail, dict)
        and "error_code" in exc.detail
        and "message" in exc.detail
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            headers=exc.headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def normalized_request_validation_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    safe_errors = [
        {
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "type": error.get("type"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content={
            "error_code": "validation_error",
            "message": "Request validation failed.",
            "details": {"errors": safe_errors},
        },
    )


app.include_router(health_router)
app.include_router(ready_router)
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(workspaces_router)
app.include_router(connections_router)
app.include_router(admin_router)
