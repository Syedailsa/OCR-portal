from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_url: str = Field(default="http://localhost:3000", alias="APP_URL")
    api_url: str = Field(default="http://localhost:8000", alias="API_URL")
    cors_origin: str = Field(default="http://localhost:3000", alias="CORS_ORIGIN")

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")
    queue_mode: str = Field(default="inline", alias="QUEUE_MODE")

    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_refresh_secret: str = Field(alias="JWT_REFRESH_SECRET")
    access_token_minutes: int = Field(default=30, alias="ACCESS_TOKEN_MINUTES")
    refresh_token_days: int = Field(default=7, alias="REFRESH_TOKEN_DAYS")

    upload_dir: str = Field(default="/data/uploads", alias="UPLOAD_DIR")
    export_dir: str = Field(default="/data/exports", alias="EXPORT_DIR")
    max_upload_mb: int = Field(default=20, alias="MAX_UPLOAD_MB")
    ocr_max_pages: int = Field(default=20, alias="OCR_MAX_PAGES")
    ocr_timeout_seconds: int = Field(default=300, alias="OCR_TIMEOUT_SECONDS")

    log_level: str = Field(default="info", alias="LOG_LEVEL")


@lru_cache
def get_settings() -> Settings:
    return Settings()
