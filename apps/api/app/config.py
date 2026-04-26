import sys

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

    DATABASE_URL: str = Field(min_length=1)
    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "info"


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
