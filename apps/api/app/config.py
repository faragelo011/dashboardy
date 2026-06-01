import sys

from pydantic import Field, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

    DATABASE_URL: str = Field(min_length=1)
    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "info"

    # Public URL of the web app (used for auth redirects, invite acceptance flows, etc).
    WEB_PUBLIC_URL: str | None = None

    # Supabase project details used by admin-only operations (invites).
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    # Web env vars sometimes exist in the same `.env` (especially in local docker).
    # We allow a fallback so local setups don't need to duplicate the URL.
    NEXT_PUBLIC_SUPABASE_URL: str | None = None

    # Supabase JWT verification:
    # - RS256: set SUPABASE_JWKS_URL (recommended when available)
    # - HS256: set SUPABASE_JWT_SECRET (Project Settings → API → JWT Secret)
    SUPABASE_JWKS_URL: str | None = None
    SUPABASE_JWT_SECRET: str | None = None
    SUPABASE_JWT_ISSUER: str = Field(min_length=1)
    SUPABASE_JWT_AUDIENCE: str | None = None

    # Query engine (Feature 004): defaults match locked table in
    # ``specs/004-query-engine/tasks.md``; override via env.
    QUERY_ENGINE_SNOWFLAKE_STATEMENT_TIMEOUT_SECONDS: int = Field(
        default=30, ge=1, le=3_600
    )
    QUERY_ENGINE_DEFAULT_MAX_ROWS: int = Field(default=5_000, ge=1)
    QUERY_ENGINE_HARD_MAX_ROWS: int = Field(default=10_000, ge=1)
    QUERY_ENGINE_CONCURRENT_SNOWFLAKE_EXECUTIONS: int = Field(default=10, ge=1)
    QUERY_ENGINE_WAITING_REQUESTS_QUEUE_DEPTH: int = Field(default=50, ge=1)
    QUERY_ENGINE_EXECUTION_SLOT_WAIT_SECONDS: int = Field(default=25, ge=1)
    QUERY_ENGINE_CACHE_TTL_KPI_SECONDS: int = Field(default=600, ge=1)
    QUERY_ENGINE_CACHE_TTL_CHART_SECONDS: int = Field(default=300, ge=1)
    QUERY_ENGINE_CACHE_TTL_TABLE_SECONDS: int = Field(default=120, ge=1)
    QUERY_ENGINE_CACHE_GLOBAL_TTL_CEILING_SECONDS: int = Field(default=900, ge=1)
    QUERY_ENGINE_AUDIT_RETENTION_DAYS: int = Field(default=90, ge=1)

    @model_validator(mode="after")
    def _validate_query_engine_constraints(self) -> "Settings":
        if self.QUERY_ENGINE_DEFAULT_MAX_ROWS > self.QUERY_ENGINE_HARD_MAX_ROWS:
            raise ValueError(
                "QUERY_ENGINE_DEFAULT_MAX_ROWS must be less than or equal to "
                "QUERY_ENGINE_HARD_MAX_ROWS"
            )
        ceiling = self.QUERY_ENGINE_CACHE_GLOBAL_TTL_CEILING_SECONDS
        for field_name in (
            "QUERY_ENGINE_CACHE_TTL_KPI_SECONDS",
            "QUERY_ENGINE_CACHE_TTL_CHART_SECONDS",
            "QUERY_ENGINE_CACHE_TTL_TABLE_SECONDS",
        ):
            ttl = getattr(self, field_name)
            if ttl > ceiling:
                raise ValueError(
                    f"{field_name} ({ttl}s) must be less than or equal to "
                    f"QUERY_ENGINE_CACHE_GLOBAL_TTL_CEILING_SECONDS ({ceiling}s)"
                )
        return self

    @model_validator(mode="after")
    def _validate_supabase_jwt_config(self) -> "Settings":
        if not (self.SUPABASE_JWKS_URL and self.SUPABASE_JWKS_URL.strip()) and not (
            self.SUPABASE_JWT_SECRET and self.SUPABASE_JWT_SECRET.strip()
        ):
            raise ValueError(
                "Set SUPABASE_JWKS_URL (RS256) or SUPABASE_JWT_SECRET (HS256) "
                "for JWT verification"
            )
        return self

    @model_validator(mode="after")
    def _apply_supabase_admin_fallbacks(self) -> "Settings":
        if (not self.SUPABASE_URL or not self.SUPABASE_URL.strip()) and (
            self.NEXT_PUBLIC_SUPABASE_URL and self.NEXT_PUBLIC_SUPABASE_URL.strip()
        ):
            self.SUPABASE_URL = self.NEXT_PUBLIC_SUPABASE_URL.strip()
        return self


def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as e:
        missing = [
            str(err["loc"][0])
            for err in e.errors()
            if err["type"] in ("missing", "string_type", "string_too_short")
            or "required" in err["msg"].lower()
        ]
        for name in missing:
            print(f"Missing required environment variable: {name}", file=sys.stderr)
        if not missing:
            print(f"Invalid environment configuration: {e}", file=sys.stderr)
        sys.exit(2)
