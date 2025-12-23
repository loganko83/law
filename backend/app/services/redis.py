"""Redis connection service for caching and token blacklisting."""
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings
import structlog

logger = structlog.get_logger()


class RedisService:
    """Redis service for caching and session management."""

    _instance: Optional["RedisService"] = None
    _client: Optional[redis.Redis] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> None:
        """Initialize Redis connection."""
        if self._client is None:
            try:
                self._client = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                # Test connection
                await self._client.ping()
                logger.info("redis_connected", url=settings.REDIS_URL)
            except Exception as e:
                logger.error("redis_connection_failed", error=str(e))
                self._client = None
                raise

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("redis_disconnected")

    @property
    def client(self) -> Optional[redis.Redis]:
        """Get Redis client."""
        return self._client

    async def is_connected(self) -> bool:
        """Check if Redis is connected."""
        if self._client is None:
            return False
        try:
            await self._client.ping()
            return True
        except Exception:
            return False

    # Token blacklist operations
    async def blacklist_token(self, token: str, expires_in: int) -> bool:
        """Add token to blacklist with expiration."""
        if self._client is None:
            logger.warning("redis_not_available", operation="blacklist_token")
            return False
        try:
            key = f"blacklist:{token}"
            await self._client.setex(key, expires_in, "1")
            return True
        except Exception as e:
            logger.error("redis_blacklist_failed", error=str(e))
            return False

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        if self._client is None:
            return False
        try:
            key = f"blacklist:{token}"
            result = await self._client.get(key)
            return result is not None
        except Exception as e:
            logger.error("redis_check_blacklist_failed", error=str(e))
            return False

    # Rate limiting operations
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> tuple[bool, int]:
        """
        Check rate limit using sliding window.
        Returns (is_allowed, remaining_requests).
        """
        if self._client is None:
            # If Redis is not available, allow request
            return True, limit

        try:
            current = await self._client.get(key)
            if current is None:
                await self._client.setex(key, window_seconds, 1)
                return True, limit - 1

            current_count = int(current)
            if current_count >= limit:
                return False, 0

            await self._client.incr(key)
            return True, limit - current_count - 1
        except Exception as e:
            logger.error("redis_rate_limit_failed", error=str(e))
            return True, limit

    # Cache operations
    async def cache_set(
        self,
        key: str,
        value: str,
        expires_in: Optional[int] = None
    ) -> bool:
        """Set cache value with optional expiration."""
        if self._client is None:
            return False
        try:
            if expires_in:
                await self._client.setex(key, expires_in, value)
            else:
                await self._client.set(key, value)
            return True
        except Exception as e:
            logger.error("redis_cache_set_failed", error=str(e))
            return False

    async def cache_get(self, key: str) -> Optional[str]:
        """Get cache value."""
        if self._client is None:
            return None
        try:
            return await self._client.get(key)
        except Exception as e:
            logger.error("redis_cache_get_failed", error=str(e))
            return None

    async def cache_delete(self, key: str) -> bool:
        """Delete cache value."""
        if self._client is None:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.error("redis_cache_delete_failed", error=str(e))
            return False


# Global instance
redis_service = RedisService()


async def get_redis() -> RedisService:
    """Dependency to get Redis service."""
    return redis_service
