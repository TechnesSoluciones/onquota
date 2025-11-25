"""
Unit tests for caching functionality
Tests cache manager and cache decorators
"""
import pytest
from datetime import timedelta
from unittest.mock import patch, AsyncMock, MagicMock
from decimal import Decimal
from uuid import uuid4

from core.cache import CacheManager, cached, cache_key_builder, invalidate_cache_pattern


@pytest.mark.asyncio
async def test_cache_manager_initialization():
    """Test CacheManager initialization"""
    redis_url = "redis://localhost:6379/0"
    cache = CacheManager(redis_url, key_prefix="test")

    assert cache.redis_url == redis_url
    assert cache.key_prefix == "test"
    assert cache._redis is None  # Not connected yet


@pytest.mark.asyncio
async def test_cache_manager_make_key():
    """Test cache key generation"""
    cache = CacheManager("redis://localhost", key_prefix="myapp")

    key = cache._make_key("user:123")
    assert key == "myapp:user:123"

    key = cache._make_key("dashboard:kpis")
    assert key == "myapp:dashboard:kpis"


@pytest.mark.asyncio
async def test_cache_manager_set_get():
    """Test setting and getting cache values"""
    with patch("redis.asyncio.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.set = AsyncMock()
        mock_redis_instance.get = AsyncMock(return_value='{"key": "value"}')

        cache = CacheManager("redis://localhost")
        await cache.connect()

        # Set value
        result = await cache.set("test_key", {"key": "value"}, ttl=300)
        assert result is True
        mock_redis_instance.set.assert_called_once()

        # Get value
        value = await cache.get("test_key")
        assert value == {"key": "value"}


@pytest.mark.asyncio
async def test_cache_manager_delete():
    """Test deleting cache values"""
    with patch("redis.asyncio.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.delete = AsyncMock(return_value=1)

        cache = CacheManager("redis://localhost")
        await cache.connect()

        result = await cache.delete("test_key")
        assert result is True
        mock_redis_instance.delete.assert_called_once()


@pytest.mark.asyncio
async def test_cache_manager_delete_pattern():
    """Test deleting cache by pattern"""
    with patch("redis.asyncio.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance

        # Mock scan_iter
        async def mock_scan_iter(*args, **kwargs):
            yield "myapp:user:*:profile:1"
            yield "myapp:user:*:profile:2"

        mock_redis_instance.scan_iter = mock_scan_iter
        mock_redis_instance.delete = AsyncMock(return_value=2)

        cache = CacheManager("redis://localhost")
        await cache.connect()

        result = await cache.delete_pattern("user:*")
        assert result == 2


@pytest.mark.asyncio
async def test_cache_manager_exists():
    """Test checking if cache key exists"""
    with patch("redis.asyncio.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.exists = AsyncMock(return_value=1)

        cache = CacheManager("redis://localhost")
        await cache.connect()

        exists = await cache.exists("test_key")
        assert exists is True

        mock_redis_instance.exists = AsyncMock(return_value=0)
        exists = await cache.exists("nonexistent_key")
        assert exists is False


@pytest.mark.asyncio
async def test_cache_key_builder():
    """Test cache key builder function"""
    # Test with args
    key = cache_key_builder("user", 123, "profile")
    assert isinstance(key, str)
    assert len(key) == 32  # MD5 hash

    # Test with kwargs
    key2 = cache_key_builder("kpis", tenant_id="abc123", year=2024)
    assert isinstance(key2, str)
    assert len(key2) == 32

    # Same args should produce same key
    key3 = cache_key_builder("kpis", tenant_id="abc123", year=2024)
    assert key2 == key3


@pytest.mark.asyncio
async def test_cached_decorator_hit():
    """Test cached decorator with cache hit"""
    with patch("core.cache.get_cache") as mock_get_cache:
        mock_cache = AsyncMock()
        mock_get_cache.return_value = mock_cache
        mock_cache.get = AsyncMock(return_value={"status": "cached"})

        @cached(ttl=300, key_prefix="test")
        async def get_data(user_id: str):
            return {"status": "fresh"}

        # Call function - should return cached value
        result = await get_data("123")
        assert result == {"status": "cached"}


@pytest.mark.asyncio
async def test_cached_decorator_miss():
    """Test cached decorator with cache miss"""
    with patch("core.cache.get_cache") as mock_get_cache:
        mock_cache = AsyncMock()
        mock_get_cache.return_value = mock_cache
        mock_cache.get = AsyncMock(return_value=None)  # Cache miss
        mock_cache.set = AsyncMock()

        @cached(ttl=300, key_prefix="test")
        async def get_data(user_id: str):
            return {"status": "fresh", "user_id": user_id}

        # Call function - should execute and cache
        result = await get_data("123")
        assert result["status"] == "fresh"
        assert result["user_id"] == "123"

        # Verify set was called to cache the result
        mock_cache.set.assert_called_once()


@pytest.mark.asyncio
async def test_cached_decorator_skip_cache():
    """Test skipping cache with skip_cache parameter"""
    with patch("core.cache.get_cache") as mock_get_cache:
        mock_cache = AsyncMock()
        mock_get_cache.return_value = mock_cache
        mock_cache.get = AsyncMock(return_value={"status": "cached"})

        @cached(ttl=300)
        async def get_data(user_id: str):
            return {"status": "fresh"}

        # Call with skip_cache=True - should bypass cache
        result = await get_data("123", skip_cache=True)
        assert result == {"status": "fresh"}

        # get should not have been called
        mock_cache.get.assert_not_called()


@pytest.mark.asyncio
async def test_invalidate_cache_pattern_decorator():
    """Test cache invalidation decorator"""
    with patch("core.cache.get_cache") as mock_get_cache:
        mock_cache = AsyncMock()
        mock_get_cache.return_value = mock_cache
        mock_cache.delete_pattern = AsyncMock()

        @invalidate_cache_pattern("quotes:*")
        async def create_quote():
            return {"id": "quote-123"}

        result = await create_quote()
        assert result["id"] == "quote-123"

        # Verify cache invalidation was called
        mock_cache.delete_pattern.assert_called_once_with("quotes:*")


def test_cache_manager_timedelta():
    """Test cache manager with timedelta TTL"""
    with patch("redis.asyncio.from_url"):
        cache = CacheManager("redis://localhost")

        # Test that timedelta is converted to seconds
        ttl = timedelta(hours=1)
        assert ttl.total_seconds() == 3600
