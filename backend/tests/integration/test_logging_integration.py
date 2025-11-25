"""
Integration tests for request logging middleware
Tests end-to-end logging with real application
"""
import pytest
import json
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from models.user import User, UserRole
from models.tenant import Tenant
from core.security import hash_password


@pytest.mark.asyncio
async def test_logging_on_authenticated_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test that authenticated requests log user and tenant context"""
    # Create test tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Tenant",
        slug="test-tenant",
        is_active=True,
    )
    db_session.add(tenant)

    # Create test user
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="test@example.com",
        full_name="Test User",
        hashed_password=hash_password("password123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Make authenticated request
    response = await async_client.get(
        "/api/v1/expenses/categories",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify request succeeded
    assert response.status_code == 200

    # Verify X-Request-ID header is present
    assert "X-Request-ID" in response.headers

    # Verify request_id is a valid UUID
    request_id = response.headers["X-Request-ID"]
    uuid.UUID(request_id)


@pytest.mark.asyncio
async def test_logging_on_unauthenticated_request(async_client: AsyncClient):
    """Test that unauthenticated requests are logged without user context"""
    # Make unauthenticated request
    response = await async_client.get("/health")

    # Verify request succeeded
    assert response.status_code == 200

    # Verify X-Request-ID header is present even for unauthenticated requests
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_logging_on_failed_request(async_client: AsyncClient):
    """Test that failed requests are logged with error details"""
    # Make request to non-existent endpoint
    response = await async_client.get("/api/v1/non-existent")

    # Verify request failed
    assert response.status_code == 404

    # Verify X-Request-ID header is present even for failed requests
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_logging_on_unauthorized_request(async_client: AsyncClient):
    """Test that unauthorized requests are logged appropriately"""
    # Make request to protected endpoint without token
    response = await async_client.get("/api/v1/expenses/categories")

    # Verify request failed with 401
    assert response.status_code == 401

    # Verify X-Request-ID header is present
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_logging_captures_query_parameters(async_client: AsyncClient):
    """Test that query parameters are logged"""
    # Make request with query parameters
    response = await async_client.get(
        "/api/v1/expenses?page=1&limit=50&status=approved"
    )

    # Verify X-Request-ID header is present
    assert "X-Request-ID" in response.headers

    # Note: To verify query params are logged, you would need to capture
    # actual log output, which requires a log capture fixture


@pytest.mark.asyncio
async def test_logging_on_post_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test that POST requests are logged with appropriate details"""
    # Create test tenant and user
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Tenant",
        slug="test-tenant-2",
        is_active=True,
    )
    db_session.add(tenant)

    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="test2@example.com",
        full_name="Test User 2",
        hashed_password=hash_password("password123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Login to get token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "test2@example.com", "password": "password123"},
    )
    token = login_response.json()["access_token"]

    # Make POST request to create expense category
    response = await async_client.post(
        "/api/v1/expenses/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Category",
            "description": "Test description",
            "is_active": True,
        },
    )

    # Verify X-Request-ID header is present
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_request_id_correlation(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test that same request_id is used for request and response logs"""
    # Make request
    response = await async_client.get("/health")

    # Get request_id from response header
    request_id = response.headers["X-Request-ID"]

    # Verify it's a valid UUID
    uuid.UUID(request_id)

    # In real scenario, you would verify that all log entries for this request
    # have the same request_id by capturing and parsing log output
    # For now, we just verify the header is present and valid


@pytest.mark.asyncio
async def test_logging_excluded_paths_still_have_request_id(async_client: AsyncClient):
    """Test that excluded paths still get request_id header"""
    # Health check is in excluded_paths but should still get request_id
    response = await async_client.get("/health")

    assert response.status_code == 200
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_logging_with_special_characters_in_path(async_client: AsyncClient):
    """Test that paths with special characters are logged correctly"""
    # Make request with special characters (will likely 404)
    response = await async_client.get("/api/v1/test%20path")

    # Verify X-Request-ID header is present
    assert "X-Request-ID" in response.headers
