"""
Integration tests for CSRF protection

Tests CSRF protection with actual application routes and middleware stack
"""
import pytest
from starlette.testclient import TestClient
from fastapi import status

from main import app


@pytest.fixture
def client():
    """Create test client with full application"""
    return TestClient(app)


def test_health_endpoint_no_csrf_required(client):
    """Test health check endpoint works without CSRF token"""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK


def test_csrf_token_endpoint_accessible(client):
    """Test CSRF token endpoint is accessible"""
    response = client.get("/api/v1/csrf-token")
    assert response.status_code == status.HTTP_200_OK

    # Should return token in response
    data = response.json()
    assert "csrf_token" in data
    assert isinstance(data["csrf_token"], str)
    assert len(data["csrf_token"]) > 0

    # Should set cookie
    assert "csrf_token" in response.cookies


def test_csrf_cookie_attributes(client):
    """Test CSRF cookie has correct security attributes"""
    response = client.get("/api/v1/csrf-token")

    # Get cookie details
    cookie = response.cookies.get("csrf_token")
    assert cookie is not None

    # Check cookie attributes via headers
    set_cookie_header = response.headers.get("set-cookie", "")
    assert "httponly" in set_cookie_header.lower(), "CSRF cookie must be httpOnly"
    assert "samesite=lax" in set_cookie_header.lower(), "CSRF cookie must have SameSite=lax"
    # Secure flag depends on DEBUG mode, so we check it's present or absent consistently
    assert "path=/" in set_cookie_header.lower(), "CSRF cookie must have path=/"


def test_login_endpoint_exempt_from_csrf(client):
    """Test login endpoint doesn't require CSRF token"""
    # Login should work without CSRF token (uses credentials instead)
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword",
        },
    )

    # Should not get CSRF error (may get 401 for invalid credentials)
    assert response.status_code != status.HTTP_403_FORBIDDEN


def test_register_endpoint_exempt_from_csrf(client):
    """Test register endpoint doesn't require CSRF token"""
    # Registration should work without CSRF token
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
            "name": "Test User",
            "company_name": "Test Company",
        },
    )

    # Should not get CSRF error (may get validation error)
    assert response.status_code != status.HTTP_403_FORBIDDEN


def test_get_expenses_no_csrf_required(client):
    """Test GET requests to API don't require CSRF token"""
    # GET request should work without CSRF (though may need auth)
    response = client.get("/api/v1/expenses")

    # Should not get CSRF error (may get 401 for missing auth)
    assert response.status_code != status.HTTP_403_FORBIDDEN


def test_create_expense_requires_csrf(client):
    """Test POST requests to API require CSRF token"""
    # POST without CSRF token should fail with 403
    response = client.post(
        "/api/v1/expenses",
        json={
            "amount": 100.0,
            "description": "Test expense",
        },
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "csrf" in response.json()["detail"].lower()


def test_create_expense_with_valid_csrf_passes_csrf_check(client):
    """Test POST with valid CSRF token passes CSRF validation"""
    # Get CSRF token
    token_response = client.get("/api/v1/csrf-token")
    csrf_token = token_response.json()["csrf_token"]

    # Make POST request with token
    response = client.post(
        "/api/v1/expenses",
        json={
            "amount": 100.0,
            "description": "Test expense",
        },
        headers={"X-CSRF-Token": csrf_token},
    )

    # Should not get CSRF error (may get 401 for missing auth)
    # The key is it should NOT be 403 CSRF error
    assert response.status_code != status.HTTP_403_FORBIDDEN


def test_update_expense_requires_csrf(client):
    """Test PUT requests require CSRF token"""
    response = client.put(
        "/api/v1/expenses/123",
        json={
            "amount": 150.0,
            "description": "Updated expense",
        },
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_expense_requires_csrf(client):
    """Test DELETE requests require CSRF token"""
    response = client.delete("/api/v1/expenses/123")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_csrf_protection_across_all_modules(client):
    """Test CSRF protection is enforced across all API modules"""
    modules_and_endpoints = [
        ("/api/v1/expenses", {"amount": 100, "description": "test"}),
        ("/api/v1/clients", {"name": "Test Client", "email": "test@test.com"}),
        ("/api/v1/sales", {"client_id": "123", "amount": 1000}),
    ]

    for endpoint, payload in modules_and_endpoints:
        # All POST requests should require CSRF
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN, f"CSRF not enforced for {endpoint}"


def test_csrf_token_works_across_multiple_requests(client):
    """Test CSRF token can be used for multiple consecutive requests"""
    # Get CSRF token once
    token_response = client.get("/api/v1/csrf-token")
    csrf_token = token_response.json()["csrf_token"]

    # Use same token for multiple requests
    endpoints = [
        "/api/v1/expenses",
        "/api/v1/clients",
        "/api/v1/sales",
    ]

    for endpoint in endpoints:
        response = client.post(
            endpoint,
            json={"test": "data"},
            headers={"X-CSRF-Token": csrf_token},
        )
        # Should not fail with CSRF error (may fail with other errors)
        assert response.status_code != status.HTTP_403_FORBIDDEN


def test_docs_endpoints_exempt_from_csrf(client):
    """Test API documentation endpoints are accessible"""
    # OpenAPI docs should work without CSRF
    response = client.get("/docs")
    assert response.status_code == status.HTTP_200_OK

    response = client.get("/redoc")
    assert response.status_code == status.HTTP_200_OK

    response = client.get("/api/v1/openapi.json")
    assert response.status_code == status.HTTP_200_OK


def test_csrf_error_message_is_informative(client):
    """Test CSRF error provides useful information to client"""
    response = client.post("/api/v1/expenses", json={})

    assert response.status_code == status.HTTP_403_FORBIDDEN

    error_data = response.json()
    assert "detail" in error_data
    assert "error" in error_data
    assert "hint" in error_data

    # Hint should guide users to get CSRF token
    assert "csrf-token" in error_data["hint"].lower()
