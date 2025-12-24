from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional
import os
import secrets


def generate_default_secret() -> str:
    """Generate a secure random secret for development only."""
    return secrets.token_urlsafe(32)


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SafeCon API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://safecon:safecon@localhost:5432/safecon"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT - No default value, must be set in production
    JWT_SECRET_KEY: str = Field(default_factory=generate_default_secret)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator('JWT_SECRET_KEY')
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        """Ensure JWT secret is secure in production."""
        # Check for insecure default values
        insecure_defaults = [
            "your-super-secret-key-change-in-production",
            "secret",
            "changeme",
            "your-secret-key",
        ]
        if v.lower() in [d.lower() for d in insecure_defaults]:
            raise ValueError(
                "JWT_SECRET_KEY must be changed from the insecure default value. "
                "Set a secure random string in your environment variables."
            )
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters long for security."
            )
        return v

    # AI
    GEMINI_API_KEY: str = ""

    # File Storage - Local
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: list = ["pdf", "docx", "doc", "jpg", "jpeg", "png", "txt"]

    # S3/MinIO Storage
    S3_ENABLED: bool = False
    S3_ENDPOINT_URL: Optional[str] = None  # For MinIO: http://localhost:9000
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "safecon-documents"
    S3_REGION: str = "ap-northeast-2"

    # OCR Service
    OCR_ENABLED: bool = True
    OCR_PROVIDER: str = "tesseract"  # tesseract, google-vision, azure-ocr

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://trendy.storydot.kr",
    ]

    # DID BaaS
    DID_BAAS_URL: str = "https://trendy.storydot.kr/did-baas/api/v1"
    DID_BAAS_API_KEY: str = ""
    SAFECON_ISSUER_DID: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
