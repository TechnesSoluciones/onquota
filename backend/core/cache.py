"""
Redis Cache Manager
High-performance caching layer with async support
"""
import json
import hashlib
from typing import Optional, Any, Callable, Union
from functools import wraps
from datetime import timedelta
from redis import asyncio as aioredis
from redis.asyncio import Redis
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class CacheManager:
    """
    Async Redis cache manager with key namespacing and TTL support

    Features:
    - Automatic JSON serialization/deserialization
    - Key prefixing for namespace isolation
    - Connection pooling
    - Error handling with fallback
    """

    def __init__(self, redis_url: str, key_prefix: str = "onquota"):
        """
        Initialize cache manager

        Args:
            redis_url: Redis connection URL
            key_prefix: Prefix for all cache keys (namespace)
        """
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self._redis: Optional[Redis] = None

    async def connect(self) -> None:
        """Establish Redis connection"""
        if not self._redis:
            try:
                self._redis = await aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=50,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                )
                await self._redis.ping()
                logger.info("Redis cache connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise

    async def close(self) -> None:
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Redis cache disconnected")

    def _make_key(self, key: str) -> str:
        """Generate prefixed cache key"""
        return f"{self.key_prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            value = await self._redis.get(cache_key)

            if value is None:
                logger.debug(f"Cache miss: {key}")
                return None

            logger.debug(f"Cache hit: {key}")
            return json.loads(value)

        except Exception as e:
            logger.warning(f"Cache get error for key '{key}': {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[Union[int, timedelta]] = None,
    ) -> bool:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds or timedelta

        Returns:
            True if successful, False otherwise
        """
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            serialized = json.dumps(value, default=str)

            if isinstance(ttl, timedelta):
                ttl = int(ttl.total_seconds())

            if ttl:
                await self._redis.setex(cache_key, ttl, serialized)
            else:
                await self._redis.set(cache_key, serialized)

            logger.debug(f"Cache set: {key} (ttl={ttl}s)")
            return True

        except Exception as e:
            logger.warning(f"Cache set error for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete key from cache

        Args:
            key: Cache key

        Returns:
            True if deleted, False otherwise
        """
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            result = await self._redis.delete(cache_key)
            logger.debug(f"Cache delete: {key}")
            return result > 0

        except Exception as e:
            logger.warning(f"Cache delete error for key '{key}': {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern

        Args:
            pattern: Pattern to match (e.g., "user:*")

        Returns:
            Number of keys deleted
        """
        try:
            if not self._redis:
                await self.connect()

            cache_pattern = self._make_key(pattern)
            keys = []

            async for key in self._redis.scan_iter(match=cache_pattern):
                keys.append(key)

            if keys:
                deleted = await self._redis.delete(*keys)
                logger.info(f"Cache pattern delete: {pattern} ({deleted} keys)")
                return deleted

            return 0

        except Exception as e:
            logger.warning(f"Cache pattern delete error for pattern '{pattern}': {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            return await self._redis.exists(cache_key) > 0

        except Exception as e:
            logger.warning(f"Cache exists error for key '{key}': {e}")
            return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """Get remaining TTL for key in seconds"""
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            ttl = await self._redis.ttl(cache_key)
            return ttl if ttl > 0 else None

        except Exception as e:
            logger.warning(f"Cache TTL error for key '{key}': {e}")
            return None

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment integer value in cache

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value after increment
        """
        try:
            if not self._redis:
                await self.connect()

            cache_key = self._make_key(key)
            return await self._redis.incrby(cache_key, amount)

        except Exception as e:
            logger.warning(f"Cache increment error for key '{key}': {e}")
            return None


# Global cache instance
_cache_instance: Optional[CacheManager] = None


async def get_cache() -> CacheManager:
    """
    Get or create cache manager instance

    Returns:
        CacheManager instance
    """
    global _cache_instance

    if _cache_instance is None:
        _cache_instance = CacheManager(settings.REDIS_URL)
        await _cache_instance.connect()

    return _cache_instance


def cache_key_builder(*args, **kwargs) -> str:
    """
    Build cache key from function arguments

    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        Hashed cache key
    """
    # Convert args to string representation
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)

    # Hash to create consistent key
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(
    ttl: int = 300,
    key_prefix: Optional[str] = None,
    skip_cache: bool = False,
):
    """
    Decorator for caching function results

    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Custom prefix for cache key
        skip_cache: If True, bypass cache (useful for conditional caching)

    Example:
        @cached(ttl=600, key_prefix="user_profile")
        async def get_user_profile(user_id: str):
            return await db.query(User).get(user_id)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Skip cache if requested
            if skip_cache or kwargs.get("skip_cache", False):
                kwargs.pop("skip_cache", None)
                return await func(*args, **kwargs)

            # Build cache key
            func_name = f"{func.__module__}.{func.__name__}"
            prefix = key_prefix or func_name

            # Filter kwargs to exclude non-cacheable values
            cacheable_kwargs = {
                k: v for k, v in kwargs.items()
                if k not in ["skip_cache", "db", "session"]
            }

            arg_hash = cache_key_builder(*args, **cacheable_kwargs)
            cache_key = f"{prefix}:{arg_hash}"

            # Try to get from cache
            cache = await get_cache()
            cached_value = await cache.get(cache_key)

            if cached_value is not None:
                logger.debug(f"Cache hit for {func_name}")
                return cached_value

            # Execute function
            logger.debug(f"Cache miss for {func_name}, executing...")
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(cache_key, result, ttl=ttl)

            return result

        return wrapper
    return decorator


def invalidate_cache_pattern(pattern: str):
    """
    Decorator to invalidate cache pattern after function execution

    Args:
        pattern: Cache key pattern to invalidate (e.g., "dashboard:*")

    Example:
        @invalidate_cache_pattern("quotes:*")
        async def create_quote(...):
            # Cache will be invalidated after quote creation
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            # Invalidate cache after successful execution
            try:
                cache = await get_cache()
                await cache.delete_pattern(pattern)
                logger.info(f"Invalidated cache pattern: {pattern}")
            except Exception as e:
                logger.warning(f"Failed to invalidate cache pattern '{pattern}': {e}")

            return result

        return wrapper
    return decorator
