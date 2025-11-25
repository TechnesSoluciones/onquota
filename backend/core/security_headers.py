"""
Security Headers Middleware
Adds security-related HTTP headers to all responses

CRITICAL SECURITY FIX: This was MISSING in the original implementation

Implements OWASP recommended security headers to prevent:
- Man-in-the-middle attacks (HSTS)
- Clickjacking (X-Frame-Options)
- XSS attacks (CSP, X-Content-Type-Options)
- Information leakage (X-Content-Type-Options)
- Permission abuse (Permissions-Policy)
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Optional
from core.config import settings
from core.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses

    Security headers implemented:
    1. Strict-Transport-Security (HSTS): Forces HTTPS
    2. X-Content-Type-Options: Prevents MIME sniffing
    3. X-Frame-Options: Prevents clickjacking
    4. Content-Security-Policy: Mitigates XSS
    5. Permissions-Policy: Controls browser features
    6. Referrer-Policy: Controls referrer information
    7. X-Permitted-Cross-Domain-Policies: Controls Adobe Flash/PDF

    References:
    - OWASP Secure Headers Project
    - MDN Web Docs: Security Headers
    - CWE-693: Protection Mechanism Failure
    """

    def __init__(
        self,
        app,
        hsts_max_age: int = 31536000,  # 1 year
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = True,
        frame_options: str = "DENY",
        csp_directives: Optional[str] = None,
        enable_hsts: Optional[bool] = None,
    ):
        """
        Initialize security headers middleware

        Args:
            app: ASGI application
            hsts_max_age: Max age for HSTS header in seconds (default 1 year)
            hsts_include_subdomains: Include subdomains in HSTS
            hsts_preload: Enable HSTS preload
            frame_options: X-Frame-Options value (DENY, SAMEORIGIN)
            csp_directives: Custom CSP directives
            enable_hsts: Enable HSTS (defaults to not DEBUG mode)
        """
        super().__init__(app)
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload
        self.frame_options = frame_options
        self.enable_hsts = enable_hsts if enable_hsts is not None else not settings.DEBUG

        # Default CSP for API (strict)
        self.csp_directives = csp_directives or (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'none'; "
            "form-action 'none'"
        )

        logger.info(
            "security_headers_middleware_initialized",
            hsts_enabled=self.enable_hsts,
            frame_options=self.frame_options,
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Add security headers to response

        Args:
            request: Incoming request
            call_next: Next middleware or route handler

        Returns:
            Response with security headers added
        """
        response = await call_next(request)

        # 1. HTTP Strict Transport Security (HSTS)
        # Forces browsers to use HTTPS for all future requests
        # Prevents SSL stripping attacks
        # Only enabled in production (HTTPS required)
        if self.enable_hsts:
            hsts_value = f"max-age={self.hsts_max_age}"
            if self.hsts_include_subdomains:
                hsts_value += "; includeSubDomains"
            if self.hsts_preload:
                hsts_value += "; preload"

            response.headers["Strict-Transport-Security"] = hsts_value

        # 2. X-Content-Type-Options
        # Prevents browsers from MIME-sniffing content types
        # Mitigates attacks where attacker uploads malicious file disguised as image
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 3. X-Frame-Options
        # Prevents page from being loaded in iframe/frame/embed/object
        # Mitigates clickjacking attacks
        response.headers["X-Frame-Options"] = self.frame_options

        # 4. Content-Security-Policy (CSP)
        # Mitigates XSS, clickjacking, and other code injection attacks
        # For API: very strict policy (no scripts, no frames)
        response.headers["Content-Security-Policy"] = self.csp_directives

        # 5. Permissions-Policy (formerly Feature-Policy)
        # Controls which browser features can be used
        # Denies all features for API
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )

        # 6. Referrer-Policy
        # Controls how much referrer information is sent
        # 'strict-origin-when-cross-origin': Full URL for same origin, origin only for cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 7. X-Permitted-Cross-Domain-Policies
        # Controls Adobe Flash and PDF cross-domain policies
        # 'none' prevents cross-domain access
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # 8. X-XSS-Protection (Legacy)
        # Modern browsers use CSP instead, but included for older browsers
        # '1; mode=block' enables XSS filter and blocks page if attack detected
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # 9. Remove server information disclosure headers
        # Don't advertise server technology (security through obscurity)
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)

        return response


def configure_security_headers(app, **kwargs):
    """
    Configure security headers middleware for FastAPI application

    Args:
        app: FastAPI application instance
        **kwargs: Additional configuration for SecurityHeadersMiddleware

    Example:
        configure_security_headers(
            app,
            hsts_max_age=31536000,  # 1 year
            frame_options="DENY",
            enable_hsts=True  # Production only
        )
    """
    app.add_middleware(SecurityHeadersMiddleware, **kwargs)
    logger.info("security_headers_configured")
