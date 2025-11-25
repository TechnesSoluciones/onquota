"""
Request logging middleware for structured request/response logging
Provides comprehensive request tracking and debugging capabilities
"""
import time
import uuid
from typing import Callable, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

from models.user import User

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging all HTTP requests and responses with structured data

    Features:
    - Generates unique request_id for each request
    - Logs request details (method, path, query params, headers)
    - Logs response details (status code, duration, size)
    - Captures user context (user_id, tenant_id) if authenticated
    - Adds request_id to response headers for debugging
    - Supports JSON log format for log aggregation systems
    """

    def __init__(
        self,
        app,
        excluded_paths: Optional[list[str]] = None,
        log_request_body: bool = False,
        log_response_body: bool = False,
    ):
        """
        Initialize request logging middleware

        Args:
            app: FastAPI application
            excluded_paths: List of paths to exclude from logging (e.g., health checks)
            log_request_body: Whether to log request body (use with caution for PII)
            log_response_body: Whether to log response body (use with caution for PII)
        """
        super().__init__(app)
        self.excluded_paths = excluded_paths or ["/health", "/health/ready", "/metrics"]
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body

    def _should_log_request(self, path: str) -> bool:
        """
        Check if request should be logged

        Args:
            path: Request path

        Returns:
            True if request should be logged, False otherwise
        """
        return path not in self.excluded_paths

    def _extract_user_context(self, request: Request) -> tuple[Optional[str], Optional[str]]:
        """
        Extract user_id and tenant_id from request state

        Args:
            request: Starlette request object

        Returns:
            Tuple of (user_id, tenant_id) as strings, or (None, None) if not authenticated
        """
        user_id = None
        tenant_id = None

        # Check if user is attached to request state (set by auth dependency)
        if hasattr(request.state, "user"):
            user: User = request.state.user
            user_id = str(user.id)
            tenant_id = str(user.tenant_id)

        return user_id, tenant_id

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address, handling proxy headers

        Args:
            request: Starlette request object

        Returns:
            Client IP address
        """
        # Check for proxy headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"

    def _sanitize_headers(self, headers: dict) -> dict:
        """
        Sanitize sensitive headers before logging

        Args:
            headers: Request headers

        Returns:
            Sanitized headers dict
        """
        sensitive_headers = {
            "authorization",
            "cookie",
            "x-api-key",
            "x-auth-token",
            "proxy-authorization",
        }

        return {
            k: "***REDACTED***" if k.lower() in sensitive_headers else v
            for k, v in headers.items()
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details

        Args:
            request: Incoming HTTP request
            call_next: Next middleware or route handler

        Returns:
            HTTP response
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Check if we should log this request
        if not self._should_log_request(request.url.path):
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response

        # Extract user context (will be None if not authenticated yet)
        user_id, tenant_id = self._extract_user_context(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Build request log data
        request_log_data = {
            "event": "request_started",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent"),
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length"),
        }

        # Add user context if available
        if user_id:
            request_log_data["user_id"] = user_id
            request_log_data["tenant_id"] = tenant_id

        # Optionally log sanitized headers
        if self.log_request_body:
            request_log_data["headers"] = self._sanitize_headers(dict(request.headers))

        # Log request start
        logger.info(**request_log_data)

        # Process request and measure time
        start_time = time.time()

        try:
            response = await call_next(request)

            # Calculate duration
            duration_ms = round((time.time() - start_time) * 1000, 2)

            # Extract user context again (may be set during request processing)
            user_id, tenant_id = self._extract_user_context(request)

            # Get response size if available
            response_size = response.headers.get("content-length", "unknown")

            # Build response log data
            response_log_data = {
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "response_size_bytes": response_size,
            }

            # Add user context if available
            if user_id:
                response_log_data["user_id"] = user_id
                response_log_data["tenant_id"] = tenant_id

            # Log response
            if response.status_code >= 500:
                # Server errors - log as ERROR
                logger.error(**response_log_data)
            elif response.status_code >= 400:
                # Client errors - log as WARNING
                logger.warning(**response_log_data)
            else:
                # Success - log as INFO
                logger.info(**response_log_data)

            # Add request ID to response headers for client-side debugging
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            # Calculate duration
            duration_ms = round((time.time() - start_time) * 1000, 2)

            # Extract user context
            user_id, tenant_id = self._extract_user_context(request)

            # Build error log data
            error_log_data = {
                "event": "request_failed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            }

            # Add user context if available
            if user_id:
                error_log_data["user_id"] = user_id
                error_log_data["tenant_id"] = tenant_id

            # Log error with exception info
            logger.error(**error_log_data, exc_info=True)

            # Re-raise exception to be handled by exception handlers
            raise


class ResponseSizeMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add Content-Length header to responses
    Helps with logging response sizes
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add content-length header"""
        response = await call_next(request)

        # Add content-length if not already present and body is available
        if "content-length" not in response.headers and hasattr(response, "body"):
            response.headers["content-length"] = str(len(response.body))

        return response
