from __future__ import annotations

"""
Admin schemas for user management and audit logs
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
from models.user import UserRole


# ============================================================================
# Admin User Management Schemas
# ============================================================================


class AdminUserCreate(BaseModel):
    """Schema for creating a new user (by admin)"""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    role: UserRole = Field(default=UserRole.SALES_REP)
    is_active: bool = Field(default=True)

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

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class AdminUserUpdate(BaseModel):
    """Schema for updating a user (by admin)"""

    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip() if v else v


class AdminUserResponse(BaseModel):
    """Schema for user response in admin panel"""

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
    last_login_ip: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated user list response"""

    users: List[AdminUserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserFilters(BaseModel):
    """Filters for user listing"""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: Optional[str] = None  # Search by email or full_name
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    sort_by: str = Field(default="created_at")
    sort_desc: bool = Field(default=True)


# ============================================================================
# Audit Log Schemas
# ============================================================================


class AuditLogResponse(BaseModel):
    """Schema for audit log response"""

    id: UUID
    tenant_id: UUID
    action: str
    resource_type: str
    resource_id: Optional[UUID]
    description: Optional[str]
    changes: Dict[str, Any]
    user_id: Optional[UUID]
    user_email: Optional[str] = None  # Computed field
    user_name: Optional[str] = None  # Computed field
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Paginated audit log list response"""

    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogFilters(BaseModel):
    """Filters for audit log listing"""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    action: Optional[str] = None  # Filter by action type
    resource_type: Optional[str] = None  # Filter by resource type
    resource_id: Optional[UUID] = None  # Filter by specific resource
    user_id: Optional[UUID] = None  # Filter by user who performed action
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None  # Search in description
    sort_by: str = Field(default="created_at")
    sort_desc: bool = Field(default=True)


# ============================================================================
# Tenant Settings Schemas
# ============================================================================


class TenantSettingsUpdate(BaseModel):
    """Schema for updating tenant settings"""

    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = Field(None, max_length=50)
    date_format: Optional[str] = Field(None, max_length=20)
    currency: Optional[str] = Field(None, max_length=3)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Company name cannot be empty")
        return v.strip() if v else v


class TenantSettingsResponse(BaseModel):
    """Schema for tenant settings response"""

    id: UUID
    company_name: str
    domain: Optional[str]
    logo_url: Optional[str]
    is_active: bool
    subscription_plan: str
    timezone: Optional[str]
    date_format: Optional[str]
    currency: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Admin Statistics Schemas
# ============================================================================


class UserStatsResponse(BaseModel):
    """User statistics for admin dashboard"""

    total_users: int
    active_users: int
    inactive_users: int
    users_by_role: Dict[str, int]
    recent_logins: int  # Users who logged in last 7 days
    new_users_this_month: int


class SystemStatsResponse(BaseModel):
    """System statistics for admin dashboard"""

    user_stats: UserStatsResponse
    total_audit_logs: int
    actions_today: int
    actions_this_week: int
    top_actions: List[Dict[str, Any]]  # Most common actions
