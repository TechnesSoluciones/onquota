"""
Database configuration and session management
OPTIMIZED: Enhanced connection pooling for production workloads
"""
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, QueuePool
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

# Convert standard PostgreSQL URL to asyncpg URL if needed
async_database_url = settings.DATABASE_URL
if async_database_url.startswith("postgresql://"):
    async_database_url = async_database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif not async_database_url.startswith("postgresql+asyncpg://"):
    # If it's already postgresql+something, keep it
    pass

# OPTIMIZATION: Create async engine with optimized pool settings
# - pool_pre_ping: Ensures connections are valid before use
# - pool_recycle: Recycle connections every hour to prevent stale connections
# - pool_timeout: Wait up to 30s for a connection before raising error
# - echo_pool: Log pool events in debug mode for monitoring
engine = create_async_engine(
    async_database_url,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    poolclass=NullPool if settings.ENVIRONMENT == "test" else None,
    pool_pre_ping=True,  # Verify connection health before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_timeout=30,     # Wait max 30s for available connection
    echo_pool=settings.DEBUG,  # Log pool events in debug mode
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# SYNC ENGINE AND SESSION FOR CELERY TASKS
# Celery tasks run in a synchronous context, so we need a sync session
# Convert asyncpg URL to psycopg2 URL
sync_database_url = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)

sync_engine = create_engine(
    sync_database_url,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    poolclass=NullPool if settings.ENVIRONMENT == "test" else QueuePool,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=30,
)

# Create sync session factory for Celery tasks
SessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database (create tables if they don't exist)"""
    from models.base import Base

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    logger.info("Database connections closed")
