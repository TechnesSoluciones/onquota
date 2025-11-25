"""
Unit tests for authentication repository
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from modules.auth.repository import AuthRepository
from models.user import UserRole


@pytest.mark.asyncio
async def test_create_tenant(db_session):
    """Test creating a tenant"""
    repo = AuthRepository(db_session)

    tenant = await repo.create_tenant(
        company_name="Test Company",
        domain="test.com",
    )

    assert tenant.id is not None
    assert tenant.company_name == "Test Company"
    assert tenant.domain == "test.com"
    assert tenant.is_active is True


@pytest.mark.asyncio
async def test_create_user(db_session):
    """Test creating a user"""
    repo = AuthRepository(db_session)

    # Create tenant first
    tenant = await repo.create_tenant(company_name="Test Company")

    # Create user
    user = await repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="TestPassword123",
        full_name="Test User",
        role=UserRole.ADMIN,
    )

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.role == UserRole.ADMIN
    assert user.tenant_id == tenant.id
    assert user.hashed_password != "TestPassword123"  # Should be hashed


@pytest.mark.asyncio
async def test_get_user_by_email(db_session):
    """Test getting user by email"""
    repo = AuthRepository(db_session)

    # Create tenant and user
    tenant = await repo.create_tenant(company_name="Test Company")
    created_user = await repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="TestPassword123",
        full_name="Test User",
    )

    # Get user by email
    user = await repo.get_user_by_email("test@example.com")

    assert user is not None
    assert user.id == created_user.id
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_authenticate_user(db_session):
    """Test user authentication"""
    repo = AuthRepository(db_session)

    # Create tenant and user
    tenant = await repo.create_tenant(company_name="Test Company")
    await repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="TestPassword123",
        full_name="Test User",
    )

    # Authenticate with correct password
    user = await repo.authenticate_user("test@example.com", "TestPassword123")
    assert user is not None
    assert user.email == "test@example.com"

    # Authenticate with wrong password
    user = await repo.authenticate_user("test@example.com", "WrongPassword")
    assert user is None

    # Authenticate with non-existent email
    user = await repo.authenticate_user("nonexistent@example.com", "TestPassword123")
    assert user is None


@pytest.mark.asyncio
async def test_create_and_get_refresh_token(db_session):
    """Test creating and retrieving refresh token"""
    repo = AuthRepository(db_session)

    # Create tenant and user
    tenant = await repo.create_tenant(company_name="Test Company")
    user = await repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="TestPassword123",
        full_name="Test User",
    )

    # Create refresh token
    token_string = str(uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)

    token = await repo.create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token=token_string,
        expires_at=expires_at,
    )

    assert token.id is not None
    assert token.user_id == user.id
    assert token.token == token_string
    assert token.is_revoked is False

    # Get refresh token
    retrieved_token = await repo.get_refresh_token(token_string)
    assert retrieved_token is not None
    assert retrieved_token.id == token.id


@pytest.mark.asyncio
async def test_revoke_refresh_token(db_session):
    """Test revoking a refresh token"""
    repo = AuthRepository(db_session)

    # Create tenant, user, and token
    tenant = await repo.create_tenant(company_name="Test Company")
    user = await repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="TestPassword123",
        full_name="Test User",
    )

    token_string = str(uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)

    await repo.create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token=token_string,
        expires_at=expires_at,
    )

    # Revoke token
    success = await repo.revoke_refresh_token(token_string)
    assert success is True

    # Verify token is revoked
    token = await repo.get_refresh_token(token_string)
    assert token.is_revoked is True
    assert token.revoked_at is not None
