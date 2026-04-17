from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

    DATABASE_URL: str
    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "info"


def get_settings() -> Settings:
    return Settings()  # raises ValidationError if required env missing
