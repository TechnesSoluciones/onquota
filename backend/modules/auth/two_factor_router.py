"""
Two-Factor Authentication Router
API endpoints for 2FA management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db
from core.config import settings
from core.auth_helpers import set_auth_cookies
from api.dependencies import get_current_user
from models.user import User
from modules.auth.two_factor_service import get_two_factor_service, TwoFactorService
from modules.auth.two_factor_schemas import (
    TwoFactorEnableResponse,
    TwoFactorVerifySetupRequest,
    TwoFactorVerifySetupResponse,
    TwoFactorDisableRequest,
    TwoFactorDisableResponse,
    TwoFactorVerifyRequest,
    TwoFactorVerifyResponse,
    TwoFactorStatusResponse,
    BackupCodesRegenerateRequest,
    BackupCodesRegenerateResponse,
)
from modules.auth.repository import AuthRepository
from core.security import create_access_token, create_refresh_token
from core.exceptions import UnauthorizedError
from datetime import datetime, timezone
from passlib.context import CryptContext
from fastapi.responses import JSONResponse
from sqlalchemy import select
from models.refresh_token import RefreshToken

router = APIRouter(prefix="/auth/2fa", tags=["Two-Factor Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/enable", response_model=TwoFactorEnableResponse)
async def enable_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Initiate 2FA setup

    Generates a new TOTP secret, QR code, and backup codes.
    User must verify the setup by providing a valid TOTP code.

    Steps:
    1. Call this endpoint to get secret and QR code
    2. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
    3. Call /verify-setup with a code from your app to complete setup
    """
    # Check if 2FA is already enabled
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is already enabled"
        )

    # Generate new secret
    secret = two_factor_service.generate_secret()

    # Generate QR code
    qr_code = two_factor_service.generate_qr_code(current_user.email, secret)

    # Generate backup codes
    plain_codes, hashed_codes = two_factor_service.generate_backup_codes()

    # Store hashed codes in session (will be saved after verification)
    # For now, return them to user - they must verify setup before codes are saved

    return TwoFactorEnableResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=plain_codes
    )


@router.post("/verify-setup", response_model=TwoFactorVerifySetupResponse)
async def verify_setup(
    data: TwoFactorVerifySetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Complete 2FA setup by verifying TOTP code

    After scanning the QR code, enter a code from your authenticator app
    to verify setup and enable 2FA.
    """
    # Check if 2FA is already enabled
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is already enabled"
        )

    # Verify the token
    is_valid = two_factor_service.verify_token(data.secret, data.token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )

    # Generate and hash backup codes
    _, hashed_codes = two_factor_service.generate_backup_codes()

    # Encrypt the secret before storing
    encrypted_secret = two_factor_service.encrypt_secret(data.secret, settings.TOTP_ENCRYPTION_KEY)

    # Enable 2FA
    current_user.two_factor_enabled = True
    current_user.two_factor_secret = encrypted_secret
    current_user.backup_codes = hashed_codes
    current_user.two_factor_verified_at = datetime.now(timezone.utc)

    await db.commit()

    return TwoFactorVerifySetupResponse(
        success=True,
        message="Two-factor authentication has been enabled successfully",
        enabled_at=current_user.two_factor_verified_at
    )


@router.post("/disable", response_model=TwoFactorDisableResponse)
async def disable_two_factor(
    data: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Disable 2FA

    Requires password verification and optionally a TOTP code or backup code.
    """
    # Check if 2FA is enabled
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled"
        )

    # Verify password
    if not pwd_context.verify(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # If token provided, verify it
    if data.token:
        # Check if it's a backup code or TOTP
        if two_factor_service.is_backup_code(data.token):
            matched_code = two_factor_service.verify_backup_code(
                data.token,
                current_user.backup_codes or []
            )
            if not matched_code:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid backup code"
                )
        else:
            # Decrypt the secret and verify TOTP
            decrypted_secret = two_factor_service.decrypt_secret(
                current_user.two_factor_secret,
                settings.TOTP_ENCRYPTION_KEY
            )
            is_valid = two_factor_service.verify_token(
                decrypted_secret,
                data.token
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid verification code"
                )

    # Disable 2FA
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.backup_codes = None
    current_user.two_factor_verified_at = None

    await db.commit()

    return TwoFactorDisableResponse(
        success=True,
        message="Two-factor authentication has been disabled"
    )


@router.get("/status", response_model=TwoFactorStatusResponse)
async def get_two_factor_status(
    current_user: User = Depends(get_current_user),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Get current 2FA status

    Returns whether 2FA is enabled and backup code information.
    """
    backup_codes_remaining = None
    if current_user.two_factor_enabled and current_user.backup_codes:
        backup_codes_remaining = two_factor_service.count_remaining_backup_codes(
            current_user.backup_codes
        )

    return TwoFactorStatusResponse(
        enabled=current_user.two_factor_enabled,
        verified_at=current_user.two_factor_verified_at,
        backup_codes_remaining=backup_codes_remaining
    )


@router.post("/backup-codes/regenerate", response_model=BackupCodesRegenerateResponse)
async def regenerate_backup_codes(
    data: BackupCodesRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Regenerate backup codes

    Requires password and current TOTP code verification.
    Old backup codes will be invalidated.
    """
    # Check if 2FA is enabled
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled"
        )

    # Verify password
    if not pwd_context.verify(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Decrypt the secret and verify TOTP code
    decrypted_secret = two_factor_service.decrypt_secret(
        current_user.two_factor_secret,
        settings.TOTP_ENCRYPTION_KEY
    )
    is_valid = two_factor_service.verify_token(
        decrypted_secret,
        data.token
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code"
        )

    # Generate new backup codes
    plain_codes, hashed_codes = two_factor_service.generate_backup_codes()

    # Update user's backup codes
    current_user.backup_codes = hashed_codes

    await db.commit()

    return BackupCodesRegenerateResponse(
        backup_codes=plain_codes,
        message="Backup codes have been regenerated. Save these codes in a secure location."
    )


@router.post("/verify-login", response_model=TwoFactorVerifyResponse)
async def verify_login(
    data: TwoFactorVerifyRequest,
    db: AsyncSession = Depends(get_db),
    two_factor_service: TwoFactorService = Depends(get_two_factor_service),
):
    """
    Verify 2FA code during login

    This endpoint is called after successful email/password authentication
    when the user has 2FA enabled.

    Accepts either a 6-digit TOTP code or an 8-digit backup code.
    """
    # Find user by email
    repo = AuthRepository(db)
    stmt = select(User).where(User.email == data.email, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("Invalid credentials")

    if not user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled for this account"
        )

    # Check if it's a backup code or TOTP
    is_valid = False
    used_backup_code = None

    if two_factor_service.is_backup_code(data.token):
        # Verify backup code
        matched_code = two_factor_service.verify_backup_code(
            data.token,
            user.backup_codes or []
        )
        if matched_code:
            is_valid = True
            used_backup_code = matched_code
    else:
        # Decrypt the secret and verify TOTP
        decrypted_secret = two_factor_service.decrypt_secret(
            user.two_factor_secret,
            settings.TOTP_ENCRYPTION_KEY
        )
        is_valid = two_factor_service.verify_token(decrypted_secret, data.token)

    if not is_valid:
        raise UnauthorizedError("Invalid verification code")

    # If backup code was used, remove it from the list
    if used_backup_code:
        remaining_codes = [code for code in user.backup_codes if code != used_backup_code]
        user.backup_codes = remaining_codes

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    # Generate tokens
    token_data = {
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(data=token_data)
    refresh_token_str = create_refresh_token(data=token_data)

    # Calculate refresh token expiration
    from datetime import timedelta
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # Store refresh token with all required fields
    await repo.create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token=refresh_token_str,
        expires_at=refresh_expires,
        user_agent=None,  # Not available in this context without Request object
        ip_address=None,  # Not available in this context without Request object
    )

    await db.commit()

    # Create response with user data
    response = JSONResponse(content={
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        }
    })

    # Set authentication cookies (httpOnly for XSS protection)
    set_auth_cookies(response, access_token, refresh_token_str)

    return response
