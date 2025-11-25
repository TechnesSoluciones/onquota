"""
Health check service module
Provides comprehensive health check functionality for all system components
"""
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from redis.asyncio import Redis
from core.logging import get_logger

logger = get_logger(__name__)


class HealthCheckService:
    """Service for comprehensive health checks of all system components"""

    def __init__(self, db_engine: AsyncEngine, redis_url: str):
        """
        Initialize health check service

        Args:
            db_engine: SQLAlchemy async engine
            redis_url: Redis connection URL
        """
        self.db_engine = db_engine
        self.redis_url = redis_url

    async def check_database(self) -> Dict[str, Any]:
        """
        Check database connectivity and health

        Returns:
            Dict with database health status
        """
        try:
            async with self.db_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return {
                "status": "healthy",
                "database": "connected",
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "database": f"error: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def check_redis(self) -> Dict[str, Any]:
        """
        Check Redis connectivity and health

        Returns:
            Dict with Redis health status
        """
        redis: Optional[Redis] = None
        try:
            redis = Redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            await redis.ping()

            # Get memory info if available
            info = await redis.info("memory")
            memory_used_mb = info.get("used_memory_human", "N/A")

            return {
                "status": "healthy",
                "redis": "connected",
                "memory_used": memory_used_mb,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "redis": f"error: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
            }
        finally:
            if redis:
                await redis.close()

    async def check_all(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check on all components

        Returns:
            Dict with health status of all components
        """
        db_status = await self.check_database()
        redis_status = await self.check_redis()

        # Determine overall status
        is_healthy = (
            db_status.get("status") == "healthy"
            and redis_status.get("status") == "healthy"
        )

        return {
            "status": "ready" if is_healthy else "not_ready",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "database": db_status,
                "redis": redis_status,
            },
            "is_ready": is_healthy,
        }
