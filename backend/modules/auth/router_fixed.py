"""
Authentication endpoints - FIXED VERSION with httpOnly Cookie Support

CRITICAL SECURITY FIX:
- JWT tokens now sent via httpOnly cookies instead of response body
- Prevents XSS-based token theft
- Implements secure cookie flags (httpOnly, Secure, SameSite)
- CSRF protection required for state-changing operations

Migration Notes:
1. Replace existing router.py with this file
2. Update frontend to remove localStorage usage
3. Frontend will automatically send cookies with requests
4. CSRF token required in X-CSRF-Token header for POST/PUT/DELETE
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security_fixed import (
    create_access_token,
    create_refresh_token,
    decode_token,
    needs_rehash,
    get_password_hash,
)
from core.config import settings
from core.rate_limiter import (
    limiter,
    AUTH_LOGIN_LIMIT,
    AUTH_REGISTER_LIMIT,
    AUTH_REFRESH_LIMIT,
)
from core.exceptions import (
    DuplicateError,
    UnauthorizedError,
    ValidationError as AppValidationError,
)
from core.logging_config import get_logger
from models.user import User, UserRole
from schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
)
from modules.auth.repository import AuthRepository
from api.dependencies import get_current_user

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Cookie configuration constants
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
TENANT_ID_COOKIE_NAME = "tenant_id"


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    tenant_id: str,
) -> None:
    """
    Set authentication cookies with secure flags

    Security flags:
    - httpOnly: Prevents JavaScript access (XSS mitigation)
    - secure: Only sent over HTTPS (production)
    - samesite="lax": Prevents CSRF while allowing normal navigation
    - path: Cookie scope
    - max_age: Cookie lifetime in seconds

    Args:
        response: FastAPI Response object
        access_token: JWT access token
        refresh_token: JWT refresh token
        tenant_id: Tenant ID for multi-tenancy
    """
    # Access token cookie (short-lived)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        httponly=True,  # Critical: prevents XSS attacks
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite="lax",  # CSRF protection with usability balance
        path="/",  # Available for all paths
    )

    # Refresh token cookie (long-lived)
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # seconds
        httponly=True,  # Critical: prevents XSS attacks
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite="lax",  # CSRF protection
        path="/api/v1/auth",  # Only for auth endpoints (principle of least privilege)
    )

    # Tenant ID cookie (for client-side tenant context)
    # Not httpOnly because frontend needs to read it
    response.set_cookie(
        key=TENANT_ID_COOKIE_NAME,
        value=tenant_id,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Match refresh token
        httponly=False,  # Frontend needs to read this
        secure=not settings.DEBUG,
        samesite="lax",
        path="/",
    )

    logger.info(
        "auth_cookies_set",
        cookie_names=[ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, TENANT_ID_COOKIE_NAME],
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clear all authentication cookies

    Used during logout to remove all session data

    Args:
        response: FastAPI Response object
    """
    cookie_names = [ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, TENANT_ID_COOKIE_NAME]

    for cookie_name in cookie_names:
        response.delete_cookie(
            key=cookie_name,
            path="/" if cookie_name != REFRESH_TOKEN_COOKIE_NAME else "/api/v1/auth",
            httponly=True if cookie_name != TENANT_ID_COOKIE_NAME else False,
            secure=not settings.DEBUG,
            samesite="lax",
        )

    logger.info("auth_cookies_cleared", cookie_names=cookie_names)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_REGISTER_LIMIT)
async def register(
    request: Request,
    response: Response,
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new company (tenant) with an admin user

    SECURITY CHANGES:
    - Tokens now sent via httpOnly cookies (not in response body)
    - Response only contains user information
    - Cookies automatically sent with subsequent requests

    Creates:
    - New tenant (company)
    - Admin user for that tenant
    - Sets authentication cookies

    **Password Requirements:**
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    **Rate Limit:** 3 requests per minute per IP address
    """
    repo = AuthRepository(db)

    # Check if email already exists
    existing_user = await repo.get_user_by_email(data.email)
    if existing_user:
        raise DuplicateError(
            resource="User",
            field="email",
            value=data.email,
        )

    # Check if domain already exists (if provided)
    if data.domain:
        existing_tenant = await repo.get_tenant_by_domain(data.domain)
        if existing_tenant:
            raise DuplicateError(
                resource="Tenant",
                field="domain",
                value=data.domain,
            )

    try:
        # Create tenant
        tenant = await repo.create_tenant(
            company_name=data.company_name,
            domain=data.domain,
        )

        # Create admin user
        user = await repo.create_user(
            tenant_id=tenant.id,
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            phone=data.phone,
            role=UserRole.ADMIN,
        )

        await db.commit()

        # Generate tokens
        token_data = {
            "user_id": str(user.id),
            "tenant_id": str(user.tenant_id),
            "email": user.email,
            "role": user.role.value,
        }

        access_token = create_access_token(data=token_data)
        refresh_token_str = create_refresh_token(data=token_data)

        # Store refresh token in database
        refresh_expires = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        await repo.create_refresh_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            token=refresh_token_str,
            expires_at=refresh_expires,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
        )

        await db.commit()

        # CRITICAL SECURITY FIX: Set cookies instead of returning tokens
        set_auth_cookies(
            response=response,
            access_token=access_token,
            refresh_token=refresh_token_str,
            tenant_id=str(user.tenant_id),
        )

        logger.info(
            "user_registered",
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
        )

        # Return user data only (no tokens in response body)
        return user

    except Exception as e:
        await db.rollback()
        logger.error("registration_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}",
        )


@router.post("/login", response_model=UserResponse)
@limiter.limit(AUTH_LOGIN_LIMIT)
async def login(
    request: Request,
    response: Response,
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password

    SECURITY CHANGES:
    - Tokens now sent via httpOnly cookies (not in response body)
    - Response only contains user information
    - Cookies automatically sent with subsequent requests
    - Password rehashing to Argon2id on successful login (if using old bcrypt)

    **Rate Limit:** 5 requests per minute per IP address to prevent brute force attacks
    """
    repo = AuthRepository(db)

    # Authenticate user
    user = await repo.authenticate_user(data.email, data.password)
    if not user:
        logger.warning(
            "login_failed",
            email=data.email,
            ip=request.client.host if request.client else None,
        )
        raise UnauthorizedError("Invalid email or password")

    # SECURITY IMPROVEMENT: Rehash password if using deprecated algorithm
    if needs_rehash(user.hashed_password):
        logger.info("password_rehash", user_id=str(user.id))
        user.hashed_password = get_password_hash(data.password)
        await db.commit()

    # Generate tokens
    token_data = {
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(data=token_data)
    refresh_token_str = create_refresh_token(data=token_data)

    # Store refresh token
    refresh_expires = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    await repo.create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token=refresh_token_str,
        expires_at=refresh_expires,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    # CRITICAL SECURITY FIX: Set cookies instead of returning tokens
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=refresh_token_str,
        tenant_id=str(user.tenant_id),
    )

    logger.info(
        "user_logged_in",
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        email=user.email,
        ip=request.client.host if request.client else None,
    )

    # Return user data only (no tokens in response body)
    return user


@router.post("/refresh", response_model=UserResponse)
@limiter.limit(AUTH_REFRESH_LIMIT)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using refresh token from cookie

    SECURITY CHANGES:
    - Reads refresh token from httpOnly cookie (not request body)
    - Sets new tokens in httpOnly cookies (not response body)
    - More secure against XSS attacks

    **Rate Limit:** 10 requests per minute per IP address
    """
    # CRITICAL: Read refresh token from cookie
    refresh_token_value = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)

    if not refresh_token_value:
        logger.warning(
            "refresh_token_missing",
            ip=request.client.host if request.client else None,
        )
        raise UnauthorizedError("Refresh token not found")

    repo = AuthRepository(db)

    # Get refresh token from database
    refresh_token_obj = await repo.get_refresh_token(refresh_token_value)
    if not refresh_token_obj:
        logger.warning(
            "refresh_token_invalid",
            ip=request.client.host if request.client else None,
        )
        raise UnauthorizedError("Invalid refresh token")

    # Check if token is revoked
    if refresh_token_obj.is_revoked:
        logger.warning(
            "refresh_token_revoked",
            user_id=str(refresh_token_obj.user_id),
            security_alert=True,
        )
        raise UnauthorizedError("Token has been revoked")

    # Check if token is expired
    if refresh_token_obj.expires_at < datetime.utcnow():
        logger.warning(
            "refresh_token_expired",
            user_id=str(refresh_token_obj.user_id),
        )
        raise UnauthorizedError("Token has expired")

    # Get user
    user = await repo.get_user_by_id(refresh_token_obj.user_id)
    if not user or not user.is_active:
        logger.warning(
            "refresh_token_user_invalid",
            user_id=str(refresh_token_obj.user_id),
        )
        raise UnauthorizedError("User not found or inactive")

    # Revoke old refresh token
    await repo.revoke_refresh_token(refresh_token_value)

    # Generate new tokens
    token_data = {
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    # Store new refresh token
    refresh_expires = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    await repo.create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token=new_refresh_token,
        expires_at=refresh_expires,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    # CRITICAL SECURITY FIX: Set cookies instead of returning tokens
    set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=new_refresh_token,
        tenant_id=str(user.tenant_id),
    )

    logger.info(
        "token_refreshed",
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
    )

    # Return user data only
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(AUTH_REFRESH_LIMIT)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout user by revoking refresh token and clearing cookies

    SECURITY CHANGES:
    - Reads refresh token from httpOnly cookie
    - Clears all authentication cookies
    - More secure logout process

    **Rate Limit:** 10 requests per minute per IP address
    """
    repo = AuthRepository(db)

    # Get refresh token from cookie
    refresh_token_value = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)

    if refresh_token_value:
        # Revoke the refresh token
        await repo.revoke_refresh_token(refresh_token_value)
        await db.commit()

    # CRITICAL: Clear all authentication cookies
    clear_auth_cookies(response)

    logger.info(
        "user_logged_out",
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id),
    )

    return None


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information

    No changes needed - token automatically sent via cookies
    """
    return current_user
