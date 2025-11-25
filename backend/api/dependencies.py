"""
API dependencies
Common dependencies for endpoints (authentication, database sessions, etc.)
"""
from typing import List, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_token
from core.exceptions import UnauthorizedError, ForbiddenError
from models.user import User, UserRole
from modules.auth.repository import AuthRepository

# OAuth2 scheme for token authentication (for backwards compatibility)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# HTTP Bearer scheme for token authentication (for backwards compatibility)
http_bearer = HTTPBearer(auto_error=False)


async def get_token_from_request(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> str:
    """
    Extract JWT token from request in priority order:
    1. httpOnly cookie (access_token) - PRIMARY, XSS-safe
    2. Authorization header - FALLBACK, for backwards compatibility
    3. Legacy OAuth2 bearer token - FALLBACK, for clients that need it

    Args:
        request: FastAPI request object
        token: Token from OAuth2 bearer scheme (backwards compatibility)
        credentials: Token from HTTP Bearer scheme (backwards compatibility)

    Returns:
        JWT token string

    Raises:
        UnauthorizedError: If no valid token found in any location
    """
    # Priority 1: Check for httpOnly cookie (most secure, XSS-protected)
    if "access_token" in request.cookies:
        return request.cookies["access_token"]

    # Priority 2: Check for Authorization header (backwards compatibility)
    if credentials:
        return credentials.credentials

    # Priority 3: Check for OAuth2 token (backwards compatibility)
    if token:
        return token

    # No token found in any location
    raise UnauthorizedError("No authentication token found. Token must be provided via httpOnly cookie or Authorization header.")


async def get_current_user(
    token: str = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token

    Extracts token from multiple sources (httpOnly cookies, Authorization header, or OAuth2 bearer)
    and validates it against the database.

    **Security:**
    - Tokens are read from httpOnly cookies by default (XSS-protected)
    - Falls back to Authorization header for backwards compatibility
    - All tokens are validated and user account status is checked

    Args:
        token: JWT token from get_token_from_request dependency
        db: Database session

    Returns:
        Current user object

    Raises:
        UnauthorizedError: If token is invalid, expired, or user not found/inactive
    """
    # Decode token
    payload = decode_token(token)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    # Get user ID from payload
    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError("Invalid user ID in token")

    # Get user from database
    repo = AuthRepository(db)
    user = await repo.get_user_by_id(user_id)

    if not user:
        raise UnauthorizedError("User not found")

    if not user.is_active:
        raise UnauthorizedError("User account is inactive")

    if user.is_deleted:
        raise UnauthorizedError("User account has been deleted")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user

    Args:
        current_user: User from get_current_user dependency

    Returns:
        Current active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
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
            raise ForbiddenError(
                f"This endpoint requires one of the following roles: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return role_checker


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency for admin-only endpoints

    Shortcut for require_role([UserRole.ADMIN])
    """
    if current_user.role != UserRole.ADMIN:
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
        raise ForbiddenError("This endpoint requires supervisor or admin privileges")
    return current_user
