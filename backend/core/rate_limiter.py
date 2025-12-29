"""
Rate Limiting Configuration
Protects against DoS attacks and brute force attempts using SlowAPI
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import FastAPI, Request, Response
from typing import Callable
import structlog

from core.config import settings

logger = structlog.get_logger(__name__)


def get_identifier(request: Request) -> str:
    """
    Get rate limit identifier from request

    Priority order:
    1. User ID from JWT token (if authenticated)
    2. Client IP address (from X-Forwarded-For or direct connection)

    This allows better tracking of authenticated users while
    falling back to IP-based limiting for unauthenticated requests.
    """
    # Try to get user ID from request state (set by auth dependency)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Fall back to IP address
    # Check for X-Forwarded-For header (for proxy/load balancer scenarios)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain (original client)
        ip = forwarded.split(",")[0].strip()
        return f"ip:{ip}"

    # Direct connection IP
    if request.client:
        return f"ip:{request.client.host}"

    # Fallback
    return "unknown"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors

    Logs the violation and returns a 429 response with Retry-After header
    """
    identifier = get_identifier(request)

    # Log rate limit violation
    logger.warning(
        "rate_limit_exceeded",
        identifier=identifier,
        path=request.url.path,
        method=request.method,
        limit=str(exc.detail),
    )

    # Return standard handler response (429 with Retry-After)
    return _rate_limit_exceeded_handler(request, exc)


# TEMPORARY: Create limiter WITHOUT Redis to avoid authentication errors
# TODO: Fix Redis authentication and re-enable distributed rate limiting
# Create limiter instance with in-memory storage (single-worker only)
logger.warning("rate_limiting_using_memory", reason="temporary_redis_auth_debug")
limiter = Limiter(
    key_func=get_identifier,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    storage_uri=None,  # Use in-memory storage instead of Redis
    strategy="fixed-window",
    headers_enabled=True,  # Add X-RateLimit-* headers to responses
)


def configure_rate_limiting(app: FastAPI) -> Limiter:
    """
    Configure rate limiting for the FastAPI application

    Args:
        app: FastAPI application instance

    Returns:
        Configured Limiter instance

    Security Notes:
    - TEMPORARY: Using in-memory storage (not distributed)
    - Logs all rate limit violations for security monitoring
    - Returns 429 status with Retry-After header when limit exceeded
    - Supports both IP-based and user-based rate limiting
    """
    # Attach limiter to app state
    app.state.limiter = limiter

    # Add custom exception handler for rate limit errors
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Add SlowAPI middleware to handle rate limiting
    app.add_middleware(SlowAPIMiddleware)

    logger.info(
        "rate_limiting_configured",
        default_limit=f"{settings.RATE_LIMIT_PER_MINUTE}/minute",
        storage="redis",
    )

    return limiter


# Rate limit constants for different endpoint types
# These can be used as decorators on specific endpoints

# Authentication endpoints - very strict to prevent brute force
AUTH_LOGIN_LIMIT = "5/minute"  # 5 login attempts per minute
AUTH_REGISTER_LIMIT = "3/minute"  # 3 registration attempts per minute
AUTH_REFRESH_LIMIT = "10/minute"  # 10 token refresh per minute

# Write operations - moderate limits
WRITE_OPERATION_LIMIT = "100/minute"  # POST/PUT/DELETE operations

# Read operations - higher limits
READ_OPERATION_LIMIT = "300/minute"  # GET operations

# Admin operations - higher limits for administrative tasks
ADMIN_RATE_LIMIT = "200/minute"  # Admin endpoints (user management, settings)

# Health check endpoints - very high limits
HEALTH_CHECK_LIMIT = "1000/minute"  # Health checks shouldn't be limited much


def exempt_from_rate_limit(request: Request) -> bool:
    """
    Determine if a request should be exempt from rate limiting

    Exemptions:
    - Internal health checks from known IPs
    - Requests from whitelisted IPs (if configured)

    Note: Be very conservative with exemptions. Most requests should be rate limited.
    """
    # Example: Exempt health checks from localhost
    if request.url.path in ["/health", "/health/ready", "/health/live"]:
        if request.client and request.client.host in ["127.0.0.1", "localhost"]:
            return True

    # Add other exemption logic here if needed
    # Example: Whitelist specific IPs for internal services
    # WHITELISTED_IPS = ["10.0.0.0/8", "172.16.0.0/12"]

    return False
