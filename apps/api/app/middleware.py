import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.logging import correlation_id_var

HEADER = "X-Correlation-ID"
logger = logging.getLogger("dashboardy.http")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw = request.headers.get(HEADER)
        if raw is None:
            cid = str(uuid.uuid4())
        else:
            try:
                parsed = uuid.UUID(raw)
            except ValueError:
                cid = str(uuid.uuid4())
            else:
                cid = str(parsed) if parsed.version == 4 else str(uuid.uuid4())

        token = correlation_id_var.set(cid)
        try:
            response = await call_next(request)
            response.headers[HEADER] = cid
            logger.info(
                "%s %s -> %s",
                request.method,
                request.url.path,
                response.status_code,
            )
            return response
        finally:
            correlation_id_var.reset(token)
