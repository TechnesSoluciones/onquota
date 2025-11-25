"""
Unit tests for CSRF protection middleware and utilities

Tests cover:
- CSRF token generation
- CSRF token validation
- CSRF middleware behavior
- Safe vs state-changing methods
- Exempt paths
- Cookie and header validation
"""
import pytest
from starlette.testclient import TestClient
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from core.csrf_middleware import CSRFMiddleware
from core.security import generate_csrf_token, verify_csrf_token


# Tests for CSRF token generation and validation utilities


def test_generate_csrf_token_default_length():
    """Test CSRF token generation with default length"""
    token = generate_csrf_token()

    # Token should be a non-empty string
    assert isinstance(token, str)
    assert len(token) > 0

    # Default length of 32 bytes produces ~43 characters in base64
    assert len(token) >= 40


def test_generate_csrf_token_custom_length():
    """Test CSRF token generation with custom length"""
    token = generate_csrf_token(length=16)

    assert isinstance(token, str)
    # 16 bytes produces ~22 characters in base64
    assert len(token) >= 20


def test_generate_csrf_token_uniqueness():
    """Test that generated tokens are unique"""
    tokens = [generate_csrf_token() for _ in range(100)]

    # All tokens should be unique
    assert len(tokens) == len(set(tokens))


def test_verify_csrf_token_valid():
    """Test CSRF token verification with matching tokens"""
    token = generate_csrf_token()

    # Same token should verify successfully
    assert verify_csrf_token(token, token) is True


def test_verify_csrf_token_invalid():
    """Test CSRF token verification with different tokens"""
    token1 = generate_csrf_token()
    token2 = generate_csrf_token()

    # Different tokens should not verify
    assert verify_csrf_token(token1, token2) is False


def test_verify_csrf_token_empty_strings():
    """Test CSRF token verification with empty strings"""
    assert verify_csrf_token("", "") is False
    assert verify_csrf_token("valid_token", "") is False
    assert verify_csrf_token("", "valid_token") is False


def test_verify_csrf_token_none_values():
    """Test CSRF token verification with None values"""
    assert verify_csrf_token(None, None) is False
    assert verify_csrf_token("valid_token", None) is False
    assert verify_csrf_token(None, "valid_token") is False


# Tests for CSRF middleware


@pytest.fixture
def app():
    """Create a test FastAPI application"""
    test_app = FastAPI()

    # Add CSRF middleware with test configuration
    test_app.add_middleware(
        CSRFMiddleware,
        secret_key="test_secret_key_for_csrf",
        exempt_paths=["/exempt", "/public"],
        cookie_secure=False,  # Disable secure for testing
    )

    @test_app.get("/safe-get")
    async def safe_get():
        return {"message": "GET request successful"}

    @test_app.post("/protected-post")
    async def protected_post():
        return {"message": "POST request successful"}

    @test_app.put("/protected-put")
    async def protected_put():
        return {"message": "PUT request successful"}

    @test_app.delete("/protected-delete")
    async def protected_delete():
        return {"message": "DELETE request successful"}

    @test_app.patch("/protected-patch")
    async def protected_patch():
        return {"message": "PATCH request successful"}

    @test_app.post("/exempt")
    async def exempt_endpoint():
        return {"message": "Exempt endpoint"}

    @test_app.get("/csrf-token")
    async def get_csrf_token():
        token = generate_csrf_token()
        response = JSONResponse({"csrf_token": token})
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=True,
            samesite="lax",
        )
        return response

    return test_app


@pytest.fixture
def client(app):
    """Create a test client"""
    return TestClient(app)


# Test safe HTTP methods (GET, HEAD, OPTIONS)


def test_get_request_no_csrf_token_required(client):
    """Test GET request succeeds without CSRF token"""
    response = client.get("/safe-get")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "GET request successful"


def test_head_request_no_csrf_token_required(client):
    """Test HEAD request succeeds without CSRF token"""
    response = client.head("/safe-get")
    assert response.status_code == status.HTTP_200_OK


def test_options_request_no_csrf_token_required(client):
    """Test OPTIONS request succeeds without CSRF token"""
    response = client.options("/safe-get")
    # OPTIONS may return 200 or 405 depending on configuration
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_405_METHOD_NOT_ALLOWED]


# Test state-changing methods require CSRF token


def test_post_request_without_csrf_token_fails(client):
    """Test POST request fails without CSRF token"""
    response = client.post("/protected-post")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "csrf" in response.json()["detail"].lower()


def test_put_request_without_csrf_token_fails(client):
    """Test PUT request fails without CSRF token"""
    response = client.put("/protected-put")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_request_without_csrf_token_fails(client):
    """Test DELETE request fails without CSRF token"""
    response = client.delete("/protected-delete")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_patch_request_without_csrf_token_fails(client):
    """Test PATCH request fails without CSRF token"""
    response = client.patch("/protected-patch")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# Test CSRF token validation


def test_post_request_with_valid_csrf_token_succeeds(client):
    """Test POST request succeeds with valid CSRF token"""
    # Get CSRF token
    token_response = client.get("/csrf-token")
    csrf_token = token_response.json()["csrf_token"]

    # Make POST request with token
    response = client.post(
        "/protected-post",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "POST request successful"


def test_post_request_with_mismatched_csrf_token_fails(client):
    """Test POST request fails with mismatched CSRF tokens"""
    # Get a token but use a different one in header
    client.get("/csrf-token")
    wrong_token = generate_csrf_token()

    response = client.post(
        "/protected-post",
        headers={"X-CSRF-Token": wrong_token},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "invalid" in response.json()["detail"].lower() or "mismatch" in response.json()["detail"].lower()


def test_post_request_with_header_but_no_cookie_fails(client):
    """Test POST request fails with header but no cookie"""
    token = generate_csrf_token()

    response = client.post(
        "/protected-post",
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "cookie" in response.json()["detail"].lower()


def test_post_request_with_cookie_but_no_header_fails(client):
    """Test POST request fails with cookie but no header"""
    # Get CSRF token (sets cookie)
    client.get("/csrf-token")

    # Make request without header
    response = client.post("/protected-post")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "header" in response.json()["detail"].lower()


# Test exempt paths


def test_exempt_path_post_without_csrf_succeeds(client):
    """Test exempt path allows POST without CSRF token"""
    response = client.post("/exempt")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Exempt endpoint"


def test_exempt_path_prefix_matching(client):
    """Test exempt path uses prefix matching"""
    # /exempt should match /exempt/something
    response = client.post("/exempt/nested/path")
    # Should get 404 (path not found) not 403 (CSRF error)
    assert response.status_code == status.HTTP_404_NOT_FOUND


# Test CSRF middleware configuration


def test_csrf_middleware_custom_header_name():
    """Test CSRF middleware with custom header name"""
    app = FastAPI()
    app.add_middleware(
        CSRFMiddleware,
        secret_key="test_secret",
        header_name="X-Custom-CSRF",
        cookie_secure=False,
    )

    @app.post("/test")
    async def test_endpoint():
        return {"message": "success"}

    @app.get("/token")
    async def get_token():
        token = generate_csrf_token()
        response = JSONResponse({"csrf_token": token})
        response.set_cookie(key="csrf_token", value=token)
        return response

    client = TestClient(app)

    # Get token
    token_response = client.get("/token")
    csrf_token = token_response.json()["csrf_token"]

    # Use custom header
    response = client.post("/test", headers={"X-Custom-CSRF": csrf_token})
    assert response.status_code == status.HTTP_200_OK


def test_csrf_middleware_custom_cookie_name():
    """Test CSRF middleware with custom cookie name"""
    app = FastAPI()
    app.add_middleware(
        CSRFMiddleware,
        secret_key="test_secret",
        cookie_name="custom_csrf",
        cookie_secure=False,
    )

    @app.post("/test")
    async def test_endpoint():
        return {"message": "success"}

    @app.get("/token")
    async def get_token():
        token = generate_csrf_token()
        response = JSONResponse({"csrf_token": token})
        response.set_cookie(key="custom_csrf", value=token)
        return response

    client = TestClient(app)

    # Get token
    token_response = client.get("/token")
    csrf_token = token_response.json()["csrf_token"]

    # Make request with token
    response = client.post("/test", headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == status.HTTP_200_OK


# Test error messages


def test_csrf_error_provides_helpful_message(client):
    """Test CSRF error includes helpful error information"""
    response = client.post("/protected-post")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    json_response = response.json()

    # Should include detailed error information
    assert "detail" in json_response
    assert "error" in json_response
    assert "hint" in json_response

    # Error should be informative
    assert json_response["error"] in ["csrf_token_missing", "csrf_cookie_missing", "csrf_token_invalid"]


# Test multiple requests with same token


def test_csrf_token_reusable_within_lifetime(client):
    """Test CSRF token can be reused for multiple requests"""
    # Get CSRF token
    token_response = client.get("/csrf-token")
    csrf_token = token_response.json()["csrf_token"]

    # Make multiple requests with same token
    for _ in range(3):
        response = client.post(
            "/protected-post",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == status.HTTP_200_OK


# Test security properties


def test_csrf_token_not_predictable():
    """Test CSRF tokens are not predictable (high entropy)"""
    tokens = [generate_csrf_token() for _ in range(10)]

    # Check no obvious patterns
    for i in range(len(tokens) - 1):
        # Consecutive tokens should be completely different
        # Check at least 50% of characters differ
        diff_count = sum(a != b for a, b in zip(tokens[i], tokens[i + 1]))
        assert diff_count > len(tokens[i]) * 0.5


def test_csrf_verification_constant_time():
    """
    Test CSRF verification uses constant-time comparison
    This is important to prevent timing attacks
    Note: This test verifies the function exists and works,
    actual timing attack prevention is tested at the implementation level
    """
    token1 = "a" * 50
    token2 = "b" * 50
    token3 = "a" * 49 + "b"

    # Verification should return False for all mismatches
    assert verify_csrf_token(token1, token2) is False
    assert verify_csrf_token(token1, token3) is False

    # The implementation should use hmac.compare_digest
    # which is constant-time
    from core.security import hmac
    import inspect

    # Verify implementation uses hmac.compare_digest
    source = inspect.getsource(verify_csrf_token)
    assert "hmac.compare_digest" in source, "CSRF verification must use constant-time comparison"
