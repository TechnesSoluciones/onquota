"""
Authentication endpoints
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import create_access_token, create_refresh_token, decode_token
from core.config import settings
from core.auth_helpers import set_auth_cookies
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
from models.user import User, UserRole
from schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse,
)
from modules.auth.repository import AuthRepository
from api.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_REGISTER_LIMIT)
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new company (tenant) with an admin user

    Creates:
    - New tenant (company)
    - Admin user for that tenant
    - Sets httpOnly cookies for access and refresh tokens

    **Password Requirements:**
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    **Rate Limit:** 3 requests per minute per IP address

    **Security:** Tokens are set as httpOnly cookies and NOT included in response body
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

        # Create response with user data
        response = Response(
            status_code=status.HTTP_201_CREATED,
            media_type="application/json",
        )

        # Set authentication cookies (httpOnly for XSS protection)
        set_auth_cookies(response, access_token, refresh_token_str)

        # Return user data in response body (no tokens)
        return user

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}",
        )


@router.post("/login")
@limiter.limit(AUTH_LOGIN_LIMIT)
async def login(
    request: Request,
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password

    Sets httpOnly cookies for access and refresh tokens

    **Returns:**
    - UserResponse: If login is successful and 2FA is not enabled
    - TwoFactorRequiredResponse: If login is successful but 2FA is required

    **Rate Limit:** 5 requests per minute per IP address to prevent brute force attacks

    **Security:** Tokens are set as httpOnly cookies and NOT included in response body
    """
    repo = AuthRepository(db)

    # Authenticate user
    user = await repo.authenticate_user(data.email, data.password)
    if not user:
        raise UnauthorizedError("Invalid email or password")

    # Check if 2FA is enabled
    if user.two_factor_enabled:
        # Return special response indicating 2FA is required
        # Frontend should redirect to 2FA verification page
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "requires_2fa": True,
                "email": user.email,
                "message": "Two-factor authentication required"
            }
        )

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

    # Create response with user data
    user_response = UserResponse.model_validate(user)
    response = Response(content=user_response.model_dump_json(), media_type="application/json")

    # Set authentication cookies (httpOnly for XSS protection)
    set_auth_cookies(response, access_token, refresh_token_str)

    return response


@router.post("/refresh", response_model=UserResponse)
@limiter.limit(AUTH_REFRESH_LIMIT)
async def refresh_token(
    request: Request,
    data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using refresh token

    Sets new httpOnly cookies for access and refresh tokens

    **Rate Limit:** 10 requests per minute per IP address

    **Security:** New tokens are set as httpOnly cookies and NOT included in response body
    """
    repo = AuthRepository(db)

    # Get refresh token from database
    refresh_token_obj = await repo.get_refresh_token(data.refresh_token)
    if not refresh_token_obj:
        raise UnauthorizedError("Invalid refresh token")

    # Check if token is revoked
    if refresh_token_obj.is_revoked:
        raise UnauthorizedError("Token has been revoked")

    # Check if token is expired
    if refresh_token_obj.expires_at < datetime.utcnow():
        raise UnauthorizedError("Token has expired")

    # Get user
    user = await repo.get_user_by_id(refresh_token_obj.user_id)
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    # Revoke old refresh token
    await repo.revoke_refresh_token(data.refresh_token)

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

    # Create response with user data
    user_response = UserResponse.model_validate(user)
    response = Response(content=user_response.model_dump_json(), media_type="application/json")

    # Set authentication cookies (httpOnly for XSS protection)
    set_auth_cookies(response, access_token, new_refresh_token)

    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(AUTH_REFRESH_LIMIT)
async def logout(
    request: Request,
    data: TokenRefresh,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout user by revoking refresh token and deleting cookies

    Clears httpOnly cookies containing JWT tokens

    **Rate Limit:** 10 requests per minute per IP address

    **Security:** Cookies are deleted from the client via Set-Cookie with max_age=0
    """
    repo = AuthRepository(db)

    # Revoke the refresh token
    await repo.revoke_refresh_token(data.refresh_token)
    await db.commit()

    # Create response
    response = Response(status_code=status.HTTP_204_NO_CONTENT)

    # Delete httpOnly cookies by setting max_age to 0
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=not settings.DEBUG,
        samesite="lax",
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=not settings.DEBUG,
        samesite="lax",
    )

    return response


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information
    """
    return current_user
