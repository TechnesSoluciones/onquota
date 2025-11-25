from __future__ import annotations

"""
Authentication schemas (Pydantic models for request/response)
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
from models.user import UserRole


# ============================================================================
# Tenant Schemas
# ============================================================================


class TenantCreate(BaseModel):
    """Schema for creating a new tenant"""

    company_name: str = Field(..., min_length=2, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        if not v.strip():
            raise ValueError("Company name cannot be empty")
        return v.strip()


class TenantResponse(BaseModel):
    """Schema for tenant response"""

    id: UUID
    company_name: str
    domain: Optional[str]
    is_active: bool
    subscription_plan: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# User Schemas
# ============================================================================


class UserCreate(BaseModel):
    """Schema for creating a new user"""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        """
        Validate password strength
        Must contain at least one uppercase, one lowercase, and one number
        """
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class UserUpdate(BaseModel):
    """Schema for updating user profile"""

    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)


class UserResponse(BaseModel):
    """Schema for user response"""

    id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Authentication Schemas
# ============================================================================


class UserRegister(BaseModel):
    """Schema for user registration (creates tenant + admin user)"""

    # Tenant info
    company_name: str = Field(..., min_length=2, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)

    # User info
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    """Schema for user login"""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefresh(BaseModel):
    """Schema for refreshing access token"""

    refresh_token: str


class TokenData(BaseModel):
    """Schema for JWT token payload"""

    user_id: UUID
    tenant_id: UUID
    email: str
    role: UserRole


class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset"""

    email: EmailStr


class PasswordReset(BaseModel):
    """Schema for resetting password"""

    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class PasswordChange(BaseModel):
    """Schema for changing password"""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v
