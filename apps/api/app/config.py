from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

    DATABASE_URL: str
    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "info"

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_uses_asyncpg(cls, v: str) -> str:
        if "+asyncpg" not in v:
            msg = (
                "DATABASE_URL must use the asyncpg driver "
                "(e.g. postgresql+asyncpg://user:pass@host:5432/dbname)"
            )
            raise ValueError(msg)
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # raises ValidationError if required env missing
