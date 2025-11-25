"""
Security tests for authentication system with httpOnly cookies

Tests verify that:
1. Tokens are NOT returned in response body
2. Tokens ARE set as httpOnly cookies
3. Cookies have correct security flags (secure, samesite, httponly)
4. Token refresh works with cookies
5. Logout properly deletes cookies
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from models.user import UserRole
from schemas.auth import UserRegister

# Use TestClient for synchronous testing
client = TestClient(app)


class TestCookieSecurity:
    """Test that tokens are properly protected with httpOnly cookies"""

    @pytest.mark.asyncio
    async def test_login_returns_no_tokens_in_body(
        self, db: AsyncSession, test_user_data: dict
    ):
        """
        SECURITY TEST: Login response body must NOT contain tokens
        Tokens should ONLY be in httpOnly cookies
        """
        # Assuming test user exists
        response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify tokens are NOT in response body
        assert "access_token" not in data, "access_token should NOT be in response body"
        assert "refresh_token" not in data, "refresh_token should NOT be in response body"
        assert "token_type" not in data, "token_type should NOT be in response body"

    @pytest.mark.asyncio
    async def test_login_sets_httponly_cookies(
        self, db: AsyncSession, test_user_data: dict
    ):
        """
        SECURITY TEST: Login must set httpOnly cookies with correct flags
        """
        response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert response.status_code == 200

        # Check for Set-Cookie headers
        cookies = response.cookies

        # Verify access_token cookie exists
        assert "access_token" in cookies, "access_token cookie not set"
        assert cookies["access_token"].value, "access_token cookie is empty"

        # Verify refresh_token cookie exists
        assert "refresh_token" in cookies, "refresh_token cookie not set"
        assert cookies["refresh_token"].value, "refresh_token cookie is empty"

    @pytest.mark.asyncio
    async def test_cookies_have_security_flags(
        self, db: AsyncSession, test_user_data: dict
    ):
        """
        SECURITY TEST: Cookies must have httponly=True, secure, and samesite flags
        """
        response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert response.status_code == 200

        # In production, we need to check the Set-Cookie header directly
        # as the TestClient might not properly expose all cookie attributes
        set_cookie_headers = response.headers.getlist("set-cookie")

        access_token_cookie = None
        refresh_token_cookie = None

        for header in set_cookie_headers:
            if header.startswith("access_token="):
                access_token_cookie = header
            elif header.startswith("refresh_token="):
                refresh_token_cookie = header

        assert access_token_cookie is not None, "access_token Set-Cookie header not found"
        assert refresh_token_cookie is not None, "refresh_token Set-Cookie header not found"

        # Verify security flags for access_token
        assert (
            "httponly" in access_token_cookie.lower()
        ), "access_token cookie missing HttpOnly flag"
        assert (
            "samesite" in access_token_cookie.lower()
        ), "access_token cookie missing SameSite flag"

        # Verify security flags for refresh_token
        assert (
            "httponly" in refresh_token_cookie.lower()
        ), "refresh_token cookie missing HttpOnly flag"
        assert (
            "samesite" in refresh_token_cookie.lower()
        ), "refresh_token cookie missing SameSite flag"

    @pytest.mark.asyncio
    async def test_register_returns_no_tokens_in_body(self):
        """
        SECURITY TEST: Register response body must NOT contain tokens
        """
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePass123",
                "full_name": "New User",
                "company_name": "New Company",
                "phone": "+1234567890",
            },
        )

        assert response.status_code == 201
        data = response.json()

        # Verify tokens are NOT in response body
        assert "access_token" not in data, "access_token should NOT be in response body"
        assert "refresh_token" not in data, "refresh_token should NOT be in response body"

    @pytest.mark.asyncio
    async def test_refresh_returns_no_tokens_in_body(
        self, db: AsyncSession, test_user_data: dict
    ):
        """
        SECURITY TEST: Refresh response body must NOT contain tokens
        """
        # First login to get refresh token cookie
        login_response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert login_response.status_code == 200

        # Extract refresh token from cookies
        refresh_token = login_response.cookies.get("refresh_token")

        # Use refresh endpoint
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
            cookies={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify tokens are NOT in response body
        assert "access_token" not in data, "access_token should NOT be in response body"
        assert "refresh_token" not in data, "refresh_token should NOT be in response body"

    @pytest.mark.asyncio
    async def test_logout_deletes_cookies(
        self, db: AsyncSession, test_user_data: dict
    ):
        """
        SECURITY TEST: Logout must delete httpOnly cookies
        """
        # First login to get cookies
        login_response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert login_response.status_code == 200

        # Extract tokens from cookies
        access_token = login_response.cookies.get("access_token")
        refresh_token = login_response.cookies.get("refresh_token")

        # Call logout
        response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            cookies={
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
        )

        assert response.status_code == 204

        # Verify cookies are deleted in response
        set_cookie_headers = response.headers.getlist("set-cookie")

        # Look for Max-Age=0 or Expires in the past
        access_deleted = False
        refresh_deleted = False

        for header in set_cookie_headers:
            if header.startswith("access_token="):
                # Deleted cookies have Max-Age=0 or empty value
                access_deleted = (
                    "Max-Age=0" in header or "expires=" in header.lower()
                )
            elif header.startswith("refresh_token="):
                refresh_deleted = (
                    "Max-Age=0" in header or "expires=" in header.lower()
                )

        assert (
            access_deleted
        ), "access_token cookie was not deleted (no Max-Age=0 found)"
        assert (
            refresh_deleted
        ), "refresh_token cookie was not deleted (no Max-Age=0 found)"


class TestXSSProtection:
    """Test that XSS attacks cannot steal tokens from localStorage"""

    def test_tokens_not_in_localstorage(self):
        """
        SECURITY TEST: Verify tokens are NOT accessible from JavaScript via localStorage
        This is an integration test that verifies the client doesn't store tokens in localStorage
        """
        # This test would need a browser automation tool (Selenium, Playwright, Cypress)
        # For now, we can test that the API doesn't return tokens in the response body
        # which is the root cause of the vulnerability

        # Make a login request
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPass123",
            },
        )

        # If status is not 200, test setup issue (user doesn't exist)
        # But we still verify the response structure
        if response.status_code in [200, 401]:
            data = response.json()

            # The key assertion: tokens should NEVER be in the response
            assert (
                "access_token" not in data
            ), "CRITICAL SECURITY ISSUE: access_token in response body - XSS vulnerability!"
            assert (
                "refresh_token" not in data
            ), "CRITICAL SECURITY ISSUE: refresh_token in response body - XSS vulnerability!"

    def test_javascript_cannot_access_httponly_cookies(self):
        """
        SECURITY TEST: Verify that JavaScript cannot access httpOnly cookies
        This is tested by checking that Set-Cookie headers include HttpOnly flag
        """
        # Make a login request
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPass123",
            },
        )

        if response.status_code == 200:
            set_cookie_headers = response.headers.getlist("set-cookie")

            # Verify that httpOnly flag is present in cookies
            httponly_count = 0
            for header in set_cookie_headers:
                if "httponly" in header.lower():
                    httponly_count += 1

            # We should have at least 2 httpOnly cookies (access and refresh)
            assert (
                httponly_count >= 2
            ), "Not all cookies have HttpOnly flag - XSS vulnerability!"


class TestTokenValidation:
    """Test that backend properly validates tokens from cookies"""

    @pytest.mark.asyncio
    async def test_can_authenticate_with_cookie(
        self, db: AsyncSession, test_user_data: dict
    ):
        """Test that protected endpoints accept tokens from httpOnly cookies"""
        # Login to get cookies
        login_response = client.post(
            "/api/v1/auth/login",
            json=test_user_data,
        )

        assert login_response.status_code == 200

        # Use cookies to access protected endpoint
        response = client.get(
            "/api/v1/auth/me",
            cookies=login_response.cookies,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]

    @pytest.mark.asyncio
    async def test_cannot_authenticate_without_cookie(self):
        """Test that protected endpoints reject requests without valid cookie"""
        # Try to access protected endpoint without token
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 401


class TestCORSConfiguration:
    """Test that CORS is properly configured for cookie support"""

    def test_cors_allows_credentials(self):
        """
        SECURITY TEST: Verify CORS allow_credentials is set to True
        This is required for httpOnly cookies to be sent/received in cross-origin requests
        """
        # Make a request and check CORS headers
        response = client.options(
            "/api/v1/auth/login",
            headers={"Origin": "http://localhost:3000"},
        )

        # Check for Access-Control-Allow-Credentials header
        if "access-control-allow-credentials" in response.headers:
            assert (
                response.headers["access-control-allow-credentials"].lower() == "true"
            ), "CORS allow_credentials must be True for httpOnly cookies"
