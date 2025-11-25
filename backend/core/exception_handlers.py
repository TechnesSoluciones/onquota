"""
Global Exception Handlers
Prevents stack traces from being exposed in production while maintaining
comprehensive server-side logging for debugging.

Security Features:
- Sanitized error responses for clients
- Full stack traces logged server-side
- Request tracking with unique IDs
- No sensitive information leakage
"""
import uuid
from typing import Union, Dict, Any, List
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import (
    SQLAlchemyError,
    IntegrityError,
    OperationalError,
    DataError,
    DatabaseError as SQLDatabaseError,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.logging_config import get_logger
from core.exceptions import OnQuotaException
from core.config import settings

logger = get_logger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler for unhandled exceptions.

    This is the last line of defense to prevent stack traces from being
    exposed to clients. All exceptions that aren't caught by other handlers
    will be caught here.

    Args:
        request: The incoming request
        exc: The unhandled exception

    Returns:
        JSONResponse with sanitized error message
    """
    request_id = str(uuid.uuid4())

    # Extract request metadata for logging (safely)
    try:
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
    except Exception:
        client_host = "unknown"
        user_agent = "unknown"

    # Log with full details including stack trace
    logger.error(
        "Unhandled exception occurred",
        exc_info=True,
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "client_host": client_host,
            "user_agent": user_agent,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
        }
    )

    # Return sanitized response (no stack trace or internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "request_id": request_id,
            "message": "An unexpected error occurred. Please contact support if the issue persists.",
            "timestamp": None,  # Could add timestamp if needed
        },
        headers={
            "X-Request-ID": request_id,
        }
    )


async def http_exception_handler(
    request: Request, exc: Union[HTTPException, StarletteHTTPException]
) -> JSONResponse:
    """
    Handler for FastAPI HTTPException.

    Provides structured error responses for HTTP exceptions while
    preventing information leakage.

    Args:
        request: The incoming request
        exc: The HTTP exception

    Returns:
        JSONResponse with structured error
    """
    request_id = str(uuid.uuid4())

    # Log the HTTP exception
    logger.warning(
        f"HTTP exception: {exc.status_code}",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "status_code": exc.status_code,
            "detail": exc.detail,
        }
    )

    # Determine if we should expose the detail message
    # Only expose details for client errors (4xx), not server errors (5xx)
    if 400 <= exc.status_code < 500:
        message = exc.detail if isinstance(exc.detail, str) else "Client error"
    else:
        message = "An error occurred processing your request"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else "HTTP Error",
            "request_id": request_id,
            "message": message,
            "status_code": exc.status_code,
        },
        headers={
            "X-Request-ID": request_id,
        }
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handler for Pydantic RequestValidationError.

    Provides user-friendly validation error messages while logging
    full validation details server-side.

    Args:
        request: The incoming request
        exc: The validation error

    Returns:
        JSONResponse with validation errors
    """
    request_id = str(uuid.uuid4())

    # Extract validation errors
    errors = exc.errors()

    # Log validation errors
    logger.warning(
        "Validation error",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "validation_errors": errors,
        }
    )

    # Format validation errors for client response
    formatted_errors = []
    for error in errors:
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        formatted_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "request_id": request_id,
            "message": "Invalid input data",
            "details": formatted_errors,
        },
        headers={
            "X-Request-ID": request_id,
        }
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: PydanticValidationError
) -> JSONResponse:
    """
    Handler for Pydantic ValidationError (not from request).

    Args:
        request: The incoming request
        exc: The pydantic validation error

    Returns:
        JSONResponse with validation errors
    """
    request_id = str(uuid.uuid4())

    # Log validation errors
    logger.warning(
        "Pydantic validation error",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "validation_errors": exc.errors(),
        }
    )

    # Format validation errors
    formatted_errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        formatted_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "request_id": request_id,
            "message": "Data validation failed",
            "details": formatted_errors,
        },
        headers={
            "X-Request-ID": request_id,
        }
    )


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """
    Handler for SQLAlchemy database exceptions.

    Critical for security: Never expose SQL queries, table names, or
    database structure to clients. Log full details server-side only.

    Args:
        request: The incoming request
        exc: The SQLAlchemy exception

    Returns:
        JSONResponse with generic database error message
    """
    request_id = str(uuid.uuid4())

    # Log full exception details (including SQL if available)
    # This will include the full stack trace and SQL query for debugging
    logger.error(
        "Database exception occurred",
        exc_info=True,
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
        }
    )

    # Determine appropriate response based on exception type
    if isinstance(exc, IntegrityError):
        # Constraint violation (unique, foreign key, etc.)
        error_message = "Data integrity constraint violated"
        user_message = "The operation conflicts with existing data. Please check your input."
        status_code = status.HTTP_409_CONFLICT

    elif isinstance(exc, OperationalError):
        # Database operational issues (connection, etc.)
        error_message = "Database operational error"
        user_message = "Database service is temporarily unavailable. Please try again later."
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    elif isinstance(exc, DataError):
        # Data type or value errors
        error_message = "Database data error"
        user_message = "Invalid data format. Please check your input."
        status_code = status.HTTP_400_BAD_REQUEST

    else:
        # Generic database error
        error_message = "Database error"
        user_message = "A database error occurred. Please try again or contact support."
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    # Return sanitized response (no SQL, table names, or schema info)
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_message,
            "request_id": request_id,
            "message": user_message,
        },
        headers={
            "X-Request-ID": request_id,
        }
    )


async def onquota_exception_handler(
    request: Request, exc: OnQuotaException
) -> JSONResponse:
    """
    Handler for custom OnQuota application exceptions.

    These are business logic exceptions that are safe to expose to clients
    as they contain user-friendly messages without sensitive details.

    Args:
        request: The incoming request
        exc: The OnQuota exception

    Returns:
        JSONResponse with application error
    """
    request_id = str(uuid.uuid4())

    # Log application exception
    logger.warning(
        f"Application exception: {exc.message}",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "status_code": exc.status_code,
            "exception_type": type(exc).__name__,
            "details": exc.details,
        }
    )

    # Build response content
    content = {
        "error": type(exc).__name__,
        "request_id": request_id,
        "message": exc.message,
    }

    # Only include details if they exist and don't contain sensitive info
    if exc.details and settings.DEBUG:
        content["details"] = exc.details

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers={
            "X-Request-ID": request_id,
        }
    )


def configure_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI application.

    Order matters: More specific handlers should be registered before
    more general ones. The order is:
    1. Custom application exceptions (OnQuotaException)
    2. Validation errors (RequestValidationError, PydanticValidationError)
    3. Database errors (SQLAlchemyError)
    4. HTTP exceptions (HTTPException)
    5. Global catch-all (Exception)

    Args:
        app: FastAPI application instance
    """
    # Custom application exceptions
    app.add_exception_handler(OnQuotaException, onquota_exception_handler)

    # Validation exceptions
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(PydanticValidationError, pydantic_validation_exception_handler)

    # Database exceptions
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

    # HTTP exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    # Global catch-all (must be last)
    app.add_exception_handler(Exception, global_exception_handler)

    logger.info("Exception handlers configured successfully")
