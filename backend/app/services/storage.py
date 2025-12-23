"""Storage service for file handling with S3/MinIO and local fallback."""
import os
import uuid
import hashlib
import aiofiles
from pathlib import Path
from typing import Optional, BinaryIO, Union
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("storage")


class StorageError(Exception):
    """Custom exception for storage errors."""
    pass


def compute_file_hash(content: bytes) -> str:
    """Compute SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()


def generate_storage_path(filename: str, user_id: str = None) -> str:
    """Generate a unique storage path for a file."""
    ext = Path(filename).suffix.lower()
    unique_id = str(uuid.uuid4())
    date_prefix = datetime.utcnow().strftime("%Y/%m/%d")

    if user_id:
        return f"{date_prefix}/{user_id}/{unique_id}{ext}"
    return f"{date_prefix}/{unique_id}{ext}"


class LocalStorage:
    """Local filesystem storage provider."""

    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"LocalStorage initialized at: {self.base_dir}")

    async def upload(
        self,
        content: bytes,
        path: str,
        content_type: str = None
    ) -> dict:
        """Upload file to local storage."""
        file_path = self.base_dir / path
        file_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        file_hash = compute_file_hash(content)

        logger.info(f"File uploaded locally: {path}")

        return {
            "path": path,
            "size": len(content),
            "hash": file_hash,
            "content_type": content_type,
            "url": f"/uploads/{path}"
        }

    async def download(self, path: str) -> bytes:
        """Download file from local storage."""
        file_path = self.base_dir / path

        if not file_path.exists():
            raise StorageError(f"File not found: {path}")

        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()

    async def delete(self, path: str) -> bool:
        """Delete file from local storage."""
        file_path = self.base_dir / path

        if file_path.exists():
            file_path.unlink()
            logger.info(f"File deleted: {path}")
            return True

        return False

    async def exists(self, path: str) -> bool:
        """Check if file exists."""
        return (self.base_dir / path).exists()

    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get URL for file (for local, just return path)."""
        return f"/uploads/{path}"


class S3Storage:
    """S3/MinIO storage provider."""

    def __init__(self):
        self._client = None
        self._bucket = settings.S3_BUCKET_NAME
        logger.info(f"S3Storage initialized for bucket: {self._bucket}")

    async def _get_client(self):
        """Get or create S3 client."""
        if self._client is None:
            try:
                import aioboto3
            except ImportError:
                raise StorageError("aioboto3 package required for S3 storage")

            session = aioboto3.Session()

            client_config = {
                "service_name": "s3",
                "aws_access_key_id": settings.S3_ACCESS_KEY,
                "aws_secret_access_key": settings.S3_SECRET_KEY,
                "region_name": settings.S3_REGION,
            }

            if settings.S3_ENDPOINT_URL:
                client_config["endpoint_url"] = settings.S3_ENDPOINT_URL

            self._client = await session.client(**client_config).__aenter__()

        return self._client

    async def close(self):
        """Close S3 client."""
        if self._client:
            await self._client.__aexit__(None, None, None)
            self._client = None

    async def upload(
        self,
        content: bytes,
        path: str,
        content_type: str = None
    ) -> dict:
        """Upload file to S3."""
        client = await self._get_client()

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        await client.put_object(
            Bucket=self._bucket,
            Key=path,
            Body=content,
            **extra_args
        )

        file_hash = compute_file_hash(content)

        logger.info(f"File uploaded to S3: {path}")

        return {
            "path": path,
            "size": len(content),
            "hash": file_hash,
            "content_type": content_type,
            "url": await self.get_url(path)
        }

    async def download(self, path: str) -> bytes:
        """Download file from S3."""
        client = await self._get_client()

        try:
            response = await client.get_object(
                Bucket=self._bucket,
                Key=path
            )
            return await response["Body"].read()
        except client.exceptions.NoSuchKey:
            raise StorageError(f"File not found: {path}")

    async def delete(self, path: str) -> bool:
        """Delete file from S3."""
        client = await self._get_client()

        try:
            await client.delete_object(
                Bucket=self._bucket,
                Key=path
            )
            logger.info(f"File deleted from S3: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    async def exists(self, path: str) -> bool:
        """Check if file exists in S3."""
        client = await self._get_client()

        try:
            await client.head_object(Bucket=self._bucket, Key=path)
            return True
        except:
            return False

    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get presigned URL for file."""
        client = await self._get_client()

        url = await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": path},
            ExpiresIn=expires_in
        )

        return url


class StorageService:
    """
    Unified storage service that automatically switches between
    S3/MinIO and local storage based on configuration.
    """

    def __init__(self):
        if settings.S3_ENABLED and settings.S3_ACCESS_KEY:
            self._provider = S3Storage()
            self._is_s3 = True
        else:
            self._provider = LocalStorage()
            self._is_s3 = False

        logger.info(f"StorageService using: {'S3' if self._is_s3 else 'Local'}")

    @property
    def is_s3(self) -> bool:
        """Check if using S3 storage."""
        return self._is_s3

    async def upload_file(
        self,
        content: bytes,
        filename: str,
        user_id: str = None,
        content_type: str = None
    ) -> dict:
        """
        Upload a file and return metadata.

        Returns:
            {
                "id": str,
                "path": str,
                "original_filename": str,
                "size": int,
                "hash": str,
                "content_type": str,
                "url": str,
                "uploaded_at": str
            }
        """
        # Validate file size
        if len(content) > settings.MAX_FILE_SIZE:
            raise StorageError(
                f"File too large. Max size: {settings.MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Validate file extension
        ext = Path(filename).suffix.lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise StorageError(
                f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )

        # Generate storage path
        storage_path = generate_storage_path(filename, user_id)

        # Upload to provider
        result = await self._provider.upload(content, storage_path, content_type)

        return {
            "id": str(uuid.uuid4()),
            "path": result["path"],
            "original_filename": filename,
            "size": result["size"],
            "hash": result["hash"],
            "content_type": content_type or "application/octet-stream",
            "url": result["url"],
            "uploaded_at": datetime.utcnow().isoformat() + "Z"
        }

    async def download_file(self, path: str) -> bytes:
        """Download a file by path."""
        return await self._provider.download(path)

    async def delete_file(self, path: str) -> bool:
        """Delete a file by path."""
        return await self._provider.delete(path)

    async def file_exists(self, path: str) -> bool:
        """Check if file exists."""
        return await self._provider.exists(path)

    async def get_file_url(self, path: str, expires_in: int = 3600) -> str:
        """Get URL for accessing file."""
        return await self._provider.get_url(path, expires_in)

    async def close(self):
        """Close storage connections."""
        if hasattr(self._provider, "close"):
            await self._provider.close()


# Singleton instance
storage_service = StorageService()


async def get_storage_service() -> StorageService:
    """Dependency for getting storage service."""
    return storage_service
