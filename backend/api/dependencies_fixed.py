"""
API dependencies - FIXED VERSION with Cookie-based Authentication

CRITICAL SECURITY FIX:
- Reads JWT tokens from httpOnly cookies instead of Authorization header
- Prevents XSS-based token theft
- Maintains backward compatibility with Authorization header during migration

Migration Notes:
1. Replace existing dependencies.py with this file
2. Supports both cookie and header authentication (for gradual migration)
3. Prefer cookies over headers when both present
"""
from typing import List, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security_fixed import decode_token
from core.exceptions import UnauthorizedError, ForbiddenError
from core.logging_config import get_logger
from models.user import User, UserRole
from modules.auth.repository import AuthRepository

logger = get_logger(__name__)

# HTTP Bearer scheme for backward compatibility
# This allows Authorization header during migration period
http_bearer = HTTPBearer(auto_error=False)

# Cookie names (must match router configuration)
ACCESS_TOKEN_COOKIE_NAME = "access_token"


async def get_current_user(
    request: Request,
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    access_token_cookie: Optional[str] = Cookie(None, alias=ACCESS_TOKEN_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token (cookie or header)

    SECURITY CHANGES:
    - Prioritizes cookie-based authentication (more secure)
    - Falls back to Authorization header (backward compatibility)
    - Logs authentication method for monitoring

    Authentication priority:
    1. httpOnly cookie (preferred, secure against XSS)
    2. Authorization header (legacy, for migration period)

    Args:
        request: FastAPI Request object
        authorization: Optional Authorization header credentials
        access_token_cookie: Optional access token from cookie
        db: Database session

    Returns:
        Current user object

    Raises:
        UnauthorizedError: If token is invalid, missing, or user not found

    Security notes:
        - Cookie authentication is preferred (httpOnly, XSS protection)
        - Header authentication maintained for gradual migration
        - Both methods properly validated
        - Failed attempts logged for security monitoring
    """
    token = None
    auth_method = None

    # Priority 1: Try cookie-based authentication (SECURE)
    if access_token_cookie:
        token = access_token_cookie
        auth_method = "cookie"
        logger.debug("authentication_via_cookie")

    # Priority 2: Fall back to Authorization header (LEGACY)
    elif authorization and authorization.credentials:
        token = authorization.credentials
        auth_method = "header"
        logger.debug("authentication_via_header")

    # No authentication provided
    if not token:
        logger.warning(
            "authentication_missing",
            path=request.url.path,
            ip=request.client.host if request.client else None,
        )
        raise UnauthorizedError("Authentication required")

    # Decode and validate token
    payload = decode_token(token, expected_type="access")
    if not payload:
        logger.warning(
            "authentication_token_invalid",
            auth_method=auth_method,
            path=request.url.path,
            ip=request.client.host if request.client else None,
        )
        raise UnauthorizedError("Invalid or expired token")

    # Get user ID from payload
    user_id_str = payload.get("user_id")
    if not user_id_str:
        logger.warning(
            "authentication_payload_invalid",
            auth_method=auth_method,
        )
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        logger.warning(
            "authentication_user_id_invalid",
            user_id=user_id_str,
            auth_method=auth_method,
        )
        raise UnauthorizedError("Invalid user ID in token")

    # Get user from database
    repo = AuthRepository(db)
    user = await repo.get_user_by_id(user_id)

    if not user:
        logger.warning(
            "authentication_user_not_found",
            user_id=str(user_id),
            auth_method=auth_method,
        )
        raise UnauthorizedError("User not found")

    # Validate user status
    if not user.is_active:
        logger.warning(
            "authentication_user_inactive",
            user_id=str(user_id),
            auth_method=auth_method,
        )
        raise UnauthorizedError("User account is inactive")

    if user.is_deleted:
        logger.warning(
            "authentication_user_deleted",
            user_id=str(user_id),
            auth_method=auth_method,
        )
        raise UnauthorizedError("User account has been deleted")

    # Validate tenant isolation
    token_tenant_id = payload.get("tenant_id")
    if token_tenant_id != str(user.tenant_id):
        logger.error(
            "authentication_tenant_mismatch",
            user_id=str(user_id),
            token_tenant=token_tenant_id,
            user_tenant=str(user.tenant_id),
            security_alert=True,
        )
        raise UnauthorizedError("Tenant mismatch")

    # Success - set user context for rate limiting
    request.state.user_id = str(user.id)
    request.state.tenant_id = str(user.tenant_id)

    logger.debug(
        "authentication_success",
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        auth_method=auth_method,
    )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user

    Additional validation layer for active status

    Args:
        current_user: User from get_current_user dependency

    Returns:
        Current active user

    Raises:
        UnauthorizedError: If user is inactive
    """
    if not current_user.is_active:
        logger.warning(
            "access_denied_inactive_user",
            user_id=str(current_user.id),
        )
        raise UnauthorizedError("User account is inactive")

    return current_user


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory for role-based authorization

    Args:
        allowed_roles: List of roles allowed to access the endpoint

    Returns:
        Dependency function that checks user role

    Example:
        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_role([UserRole.ADMIN]))
        ):
            ...
    """

    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        """Check if user has required role"""
        if current_user.role not in allowed_roles:
            logger.warning(
                "access_denied_insufficient_role",
                user_id=str(current_user.id),
                user_role=current_user.role.value,
                required_roles=[r.value for r in allowed_roles],
            )
            raise ForbiddenError(
                f"This endpoint requires one of the following roles: {[r.value for r in allowed_roles]}"
            )

        logger.debug(
            "authorization_success",
            user_id=str(current_user.id),
            role=current_user.role.value,
        )

        return current_user

    return role_checker


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency for admin-only endpoints

    Shortcut for require_role([UserRole.ADMIN])
    """
    if current_user.role != UserRole.ADMIN:
        logger.warning(
            "access_denied_not_admin",
            user_id=str(current_user.id),
            user_role=current_user.role.value,
        )
        raise ForbiddenError("This endpoint requires admin privileges")

    return current_user


def require_supervisor_or_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency for supervisor or admin endpoints

    Shortcut for require_role([UserRole.SUPERVISOR, UserRole.ADMIN])
    """
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        logger.warning(
            "access_denied_not_supervisor_or_admin",
            user_id=str(current_user.id),
            user_role=current_user.role.value,
        )
        raise ForbiddenError("This endpoint requires supervisor or admin privileges")

    return current_user
