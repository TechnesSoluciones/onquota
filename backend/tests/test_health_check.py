"""
Unit tests for health check functionality
Tests all health check endpoints and service
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from datetime import datetime


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test basic health endpoint"""
    from main import app

    with TestClient(app) as client:
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "onquota-api"
        assert "version" in data


@pytest.mark.asyncio
async def test_liveness_endpoint():
    """Test liveness probe endpoint"""
    from main import app

    with TestClient(app) as client:
        response = client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
        assert data["service"] == "onquota-api"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_readiness_endpoint_success():
    """Test readiness endpoint when all dependencies are healthy"""
    from core.health_check import HealthCheckService

    # Mock database and redis
    mock_engine = AsyncMock()
    mock_conn = AsyncMock()
    mock_engine.connect = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_conn.execute = AsyncMock()

    # Mock redis
    with patch("redis.asyncio.Redis.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.ping = AsyncMock()
        mock_redis_instance.info = AsyncMock(return_value={"used_memory_human": "50M"})
        mock_redis_instance.close = AsyncMock()

        service = HealthCheckService(mock_engine, "redis://localhost")
        result = await service.check_all()

        assert result["status"] == "ready"
        assert result["is_ready"] is True
        assert "components" in result
        assert result["components"]["database"]["status"] == "healthy"
        assert result["components"]["redis"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_endpoint_db_failure():
    """Test readiness endpoint when database fails"""
    from core.health_check import HealthCheckService

    # Mock database failure
    mock_engine = AsyncMock()
    mock_engine.connect = AsyncMock(side_effect=Exception("Connection failed"))

    # Mock redis
    with patch("redis.asyncio.Redis.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.ping = AsyncMock()
        mock_redis_instance.close = AsyncMock()

        service = HealthCheckService(mock_engine, "redis://localhost")
        result = await service.check_all()

        assert result["status"] == "not_ready"
        assert result["is_ready"] is False
        assert "error" in result["components"]["database"]["database"]


@pytest.mark.asyncio
async def test_readiness_endpoint_redis_failure():
    """Test readiness endpoint when redis fails"""
    from core.health_check import HealthCheckService

    # Mock database
    mock_engine = AsyncMock()
    mock_conn = AsyncMock()
    mock_engine.connect = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_engine.connect.return_value.__aexit__ = AsyncMock(return_value=None)
    mock_conn.execute = AsyncMock()

    # Mock redis failure
    with patch("redis.asyncio.Redis.from_url") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.ping = AsyncMock(side_effect=Exception("Redis connection failed"))
        mock_redis_instance.close = AsyncMock()

        service = HealthCheckService(mock_engine, "redis://localhost")
        result = await service.check_all()

        assert result["status"] == "not_ready"
        assert result["is_ready"] is False
        assert "error" in result["components"]["redis"]["redis"]


def test_health_check_service_initialization():
    """Test HealthCheckService initialization"""
    from core.health_check import HealthCheckService
    from unittest.mock import MagicMock

    mock_engine = MagicMock()
    service = HealthCheckService(mock_engine, "redis://localhost")

    assert service.db_engine == mock_engine
    assert service.redis_url == "redis://localhost"
