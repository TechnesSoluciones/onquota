"""
Two-Factor Authentication Schemas
Pydantic models for 2FA requests and responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class TwoFactorEnableRequest(BaseModel):
    """Request to enable 2FA - no additional data needed"""
    pass


class TwoFactorEnableResponse(BaseModel):
    """Response when initiating 2FA setup"""
    secret: str = Field(..., description="TOTP secret key (base32 encoded)")
    qr_code: str = Field(..., description="QR code as base64 encoded PNG image")
    backup_codes: List[str] = Field(..., description="Backup codes for account recovery")

    class Config:
        json_schema_extra = {
            "example": {
                "secret": "JBSWY3DPEHPK3PXP",
                "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
                "backup_codes": ["12345678", "87654321", "11112222"]
            }
        }


class TwoFactorVerifySetupRequest(BaseModel):
    """Request to verify and complete 2FA setup"""
    token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code from authenticator app")
    secret: str = Field(..., description="Secret key from setup response")

    class Config:
        json_schema_extra = {
            "example": {
                "token": "123456",
                "secret": "JBSWY3DPEHPK3PXP"
            }
        }


class TwoFactorVerifySetupResponse(BaseModel):
    """Response after successful 2FA setup verification"""
    success: bool = Field(..., description="Whether 2FA was successfully enabled")
    message: str = Field(..., description="Success message")
    enabled_at: datetime = Field(..., description="Timestamp when 2FA was enabled")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Two-factor authentication has been enabled successfully",
                "enabled_at": "2025-12-02T10:30:00Z"
            }
        }


class TwoFactorDisableRequest(BaseModel):
    """Request to disable 2FA"""
    password: str = Field(..., description="User's current password for verification")
    token: Optional[str] = Field(None, min_length=6, max_length=6, description="Current TOTP code or backup code")

    class Config:
        json_schema_extra = {
            "example": {
                "password": "mySecurePassword123",
                "token": "123456"
            }
        }


class TwoFactorDisableResponse(BaseModel):
    """Response after disabling 2FA"""
    success: bool = Field(..., description="Whether 2FA was successfully disabled")
    message: str = Field(..., description="Success message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Two-factor authentication has been disabled"
            }
        }


class TwoFactorVerifyRequest(BaseModel):
    """Request to verify TOTP code during login"""
    email: str = Field(..., description="User's email address")
    token: str = Field(..., min_length=6, max_length=8, description="6-digit TOTP code or 8-digit backup code")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "token": "123456"
            }
        }


class TwoFactorVerifyResponse(BaseModel):
    """Response after successful 2FA verification during login"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }


class TwoFactorStatusResponse(BaseModel):
    """Response with current 2FA status"""
    enabled: bool = Field(..., description="Whether 2FA is currently enabled")
    verified_at: Optional[datetime] = Field(None, description="When 2FA was last verified/enabled")
    backup_codes_remaining: Optional[int] = Field(None, description="Number of unused backup codes")

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "verified_at": "2025-12-02T10:30:00Z",
                "backup_codes_remaining": 8
            }
        }


class BackupCodesRegenerateRequest(BaseModel):
    """Request to regenerate backup codes"""
    password: str = Field(..., description="User's current password for verification")
    token: str = Field(..., min_length=6, max_length=6, description="Current TOTP code")

    class Config:
        json_schema_extra = {
            "example": {
                "password": "mySecurePassword123",
                "token": "123456"
            }
        }


class BackupCodesRegenerateResponse(BaseModel):
    """Response with new backup codes"""
    backup_codes: List[str] = Field(..., description="New backup codes (these will only be shown once)")
    message: str = Field(..., description="Success message")

    class Config:
        json_schema_extra = {
            "example": {
                "backup_codes": ["12345678", "87654321", "11112222", "33334444", "55556666"],
                "message": "Backup codes have been regenerated. Save these codes in a secure location."
            }
        }
