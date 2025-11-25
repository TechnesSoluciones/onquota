"""
Core configuration settings
Uses Pydantic Settings for environment variable management
"""
from typing import List, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # General
    PROJECT_NAME: str = "OnQuota"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str
    REDIS_CACHE_DB: int = 1

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    API_DOCS_URL: str = "/docs"
    API_REDOC_URL: str = "/redoc"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: str = "*"
    CORS_HEADERS: str = "*"

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    # Security
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    CELERY_TASK_TRACK_STARTED: bool = True
    CELERY_TASK_TIME_LIMIT: int = 300

    # OCR
    TESSERACT_PATH: str = "/usr/bin/tesseract"
    TESSERACT_LANG: str = "spa+eng"
    GOOGLE_VISION_API_KEY: str = ""
    OCR_CONFIDENCE_THRESHOLD: float = 0.85
    MAX_IMAGE_SIZE_MB: int = 10

    # Storage
    STORAGE_TYPE: str = "local"  # local, s3, minio
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""

    # Email
    EMAIL_PROVIDER: str = "sendgrid"
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@onquota.com"
    FROM_NAME: str = "OnQuota"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Create settings instance
settings = Settings()
