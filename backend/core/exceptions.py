"""
Custom exceptions for the application
"""
from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class OnQuotaException(Exception):
    """Base exception for OnQuota application"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(OnQuotaException):
    """Resource not found exception"""

    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            message=f"{resource} with id {resource_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "id": resource_id},
        )


class UnauthorizedError(OnQuotaException):
    """Unauthorized access exception"""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(OnQuotaException):
    """Forbidden access exception"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ValidationError(OnQuotaException):
    """Validation error exception"""

    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class DuplicateError(OnQuotaException):
    """Duplicate resource exception"""

    def __init__(self, resource: str, field: str, value: Any):
        super().__init__(
            message=f"{resource} with {field}={value} already exists",
            status_code=status.HTTP_409_CONFLICT,
            details={"resource": resource, "field": field, "value": value},
        )


class DatabaseError(OnQuotaException):
    """Database operation exception"""

    def __init__(self, message: str = "Database error occurred"):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ServiceUnavailableError(OnQuotaException):
    """Service unavailable exception"""

    def __init__(self, service: str):
        super().__init__(
            message=f"Service {service} is currently unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"service": service},
        )


class RateLimitExceededError(OnQuotaException):
    """Rate limit exceeded exception"""

    def __init__(self, limit: int, window: str):
        super().__init__(
            message=f"Rate limit exceeded: {limit} requests per {window}",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"limit": limit, "window": window},
        )
