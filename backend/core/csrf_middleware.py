"""
CSRF (Cross-Site Request Forgery) Protection Middleware

Implements double-submit cookie pattern for CSRF protection:
- Generates secure random CSRF tokens
- Stores tokens in httpOnly cookies
- Validates tokens on state-changing requests (POST, PUT, DELETE, PATCH)
- Exempts safe methods (GET, HEAD, OPTIONS) and specific paths

Security features:
- Uses secrets.token_urlsafe for cryptographically secure token generation
- Constant-time comparison to prevent timing attacks
- Configurable exempt paths for webhooks and public endpoints
- Returns 403 Forbidden for missing or invalid tokens
"""
from typing import List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import status
import secrets
import hmac

from core.logging import get_logger

logger = get_logger(__name__)


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware using double-submit cookie pattern

    The double-submit cookie pattern works as follows:
    1. Server generates a random CSRF token
    2. Token is sent to client in both:
       - An httpOnly cookie (prevents JavaScript access for XSS mitigation)
       - Response body (for client to include in requests)
    3. Client includes token in custom header (X-CSRF-Token) for state-changing requests
    4. Server validates that cookie token matches header token

    This protects against CSRF because:
    - Attacker's malicious site cannot read the cookie (same-origin policy)
    - Attacker cannot set custom headers on cross-origin requests
    - Even if attacker sends cookie, they cannot provide matching header
    """

    # Safe HTTP methods that don't change state (RFC 7231)
    SAFE_METHODS = frozenset(["GET", "HEAD", "OPTIONS", "TRACE"])

    # HTTP methods that require CSRF protection
    STATE_CHANGING_METHODS = frozenset(["POST", "PUT", "DELETE", "PATCH"])

    def __init__(
        self,
        app,
        secret_key: str,
        exempt_paths: Optional[List[str]] = None,
        cookie_name: str = "csrf_token",
        header_name: str = "X-CSRF-Token",
        cookie_secure: bool = True,
        cookie_samesite: str = "lax",
        token_length: int = 32,
    ):
        """
        Initialize CSRF middleware

        Args:
            app: ASGI application
            secret_key: Secret key for HMAC signing (should match JWT secret)
            exempt_paths: List of path prefixes to exempt from CSRF validation
            cookie_name: Name of the CSRF cookie
            header_name: Name of the CSRF header
            cookie_secure: Whether to set Secure flag on cookie (True for HTTPS)
            cookie_samesite: SameSite cookie attribute (strict, lax, or none)
            token_length: Length of generated token in bytes (default 32 = 256 bits)
        """
        super().__init__(app)
        self.secret_key = secret_key
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.cookie_secure = cookie_secure
        self.cookie_samesite = cookie_samesite
        self.token_length = token_length

        # Default exempt paths - health checks and public endpoints
        self.exempt_paths = exempt_paths or [
            "/health",
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]

        logger.info(
            f"CSRF middleware initialized with {len(self.exempt_paths)} exempt paths"
        )

    def generate_csrf_token(self) -> str:
        """
        Generate a cryptographically secure CSRF token

        Uses secrets.token_urlsafe which:
        - Uses os.urandom for cryptographically strong random bytes
        - Encodes in URL-safe base64 (safe for cookies and headers)
        - 32 bytes = 256 bits of entropy

        Returns:
            URL-safe base64 encoded random token
        """
        return secrets.token_urlsafe(self.token_length)

    def verify_csrf_token(self, token: str, cookie_token: str) -> bool:
        """
        Verify CSRF token using constant-time comparison

        Uses hmac.compare_digest to prevent timing attacks that could
        allow an attacker to guess the token byte by byte.

        Args:
            token: Token from request header
            cookie_token: Token from cookie

        Returns:
            True if tokens match, False otherwise
        """
        if not token or not cookie_token:
            return False

        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(token, cookie_token)

    def is_exempt_path(self, path: str) -> bool:
        """
        Check if request path is exempt from CSRF validation

        Args:
            path: Request URL path

        Returns:
            True if path is exempt, False otherwise
        """
        return any(path.startswith(exempt_path) for exempt_path in self.exempt_paths)

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Process request and enforce CSRF protection

        Flow:
        1. Skip validation for safe methods (GET, HEAD, OPTIONS, TRACE)
        2. Skip validation for exempt paths (webhooks, health checks)
        3. Extract CSRF token from header and cookie
        4. Validate tokens match
        5. Return 403 if validation fails
        6. Process request if validation passes

        Args:
            request: Incoming request
            call_next: Next middleware or route handler

        Returns:
            Response from downstream handler or 403 error
        """

        # 1. Allow safe methods without CSRF validation
        # These methods should not change state per HTTP semantics
        if request.method in self.SAFE_METHODS:
            return await call_next(request)

        # 2. Allow exempt paths (webhooks, public endpoints)
        if self.is_exempt_path(request.url.path):
            logger.debug(
                f"CSRF check skipped for exempt path: {request.method} {request.url.path}"
            )
            return await call_next(request)

        # 3. Extract CSRF tokens from header and cookie
        csrf_token_header = request.headers.get(self.header_name)
        csrf_token_cookie = request.cookies.get(self.cookie_name)

        # 4. Validate presence of both tokens
        if not csrf_token_header:
            logger.warning(
                f"CSRF token missing in header for: {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "CSRF token missing in request header",
                    "error": "csrf_token_missing",
                    "hint": f"Include CSRF token in {self.header_name} header",
                },
            )

        if not csrf_token_cookie:
            logger.warning(
                f"CSRF cookie missing for: {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "CSRF cookie missing",
                    "error": "csrf_cookie_missing",
                    "hint": "Request CSRF token from /api/v1/csrf-token endpoint",
                },
            )

        # 5. Validate tokens match using constant-time comparison
        if not self.verify_csrf_token(csrf_token_header, csrf_token_cookie):
            logger.warning(
                f"CSRF token mismatch for: {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "CSRF token validation failed",
                    "error": "csrf_token_invalid",
                    "hint": "Token may have expired, request new token from /api/v1/csrf-token",
                },
            )

        # 6. CSRF validation passed, process request
        logger.debug(
            f"CSRF validation passed for: {request.method} {request.url.path}"
        )
        return await call_next(request)

    def set_csrf_cookie(
        self,
        response: Response,
        token: str,
        max_age: int = 3600,  # 1 hour
    ) -> Response:
        """
        Set CSRF token cookie on response

        Security attributes:
        - httponly=True: Prevents JavaScript access (XSS mitigation)
        - secure=True: Only sent over HTTPS (production)
        - samesite=lax: Prevents cross-site cookie sending
        - max_age: Cookie expiration time

        Args:
            response: Response object to set cookie on
            token: CSRF token to store in cookie
            max_age: Cookie lifetime in seconds

        Returns:
            Response with CSRF cookie set
        """
        response.set_cookie(
            key=self.cookie_name,
            value=token,
            max_age=max_age,
            httponly=True,  # Prevent XSS attacks
            secure=self.cookie_secure,  # HTTPS only in production
            samesite=self.cookie_samesite,  # Prevent CSRF via cookie sending
            path="/",  # Available for all paths
        )
        return response
