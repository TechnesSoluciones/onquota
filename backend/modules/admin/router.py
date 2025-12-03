"""
Admin endpoints for user management, audit logs, and settings
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.rate_limiter import limiter, ADMIN_RATE_LIMIT
from core.exceptions import NotFoundError, DuplicateError
from api.dependencies import require_admin_or_super_admin, require_super_admin
from models.user import User, UserRole
from schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    UserListResponse,
    UserFilters,
    AuditLogResponse,
    AuditLogListResponse,
    AuditLogFilters,
    TenantSettingsUpdate,
    TenantSettingsResponse,
    UserStatsResponse,
    SystemStatsResponse,
)
from modules.admin.repository import AdminRepository

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_admin_repository(db: AsyncSession = Depends(get_db)) -> AdminRepository:
    """Dependency to get AdminRepository instance"""
    return AdminRepository(db)


# ============================================================================
# User Management Endpoints
# ============================================================================


@router.get("/users", response_model=UserListResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def list_users(
    request: Request,
    response: Response,
    filters: UserFilters = Depends(),
    current_user: User = Depends(require_admin_or_super_admin),
    db: AsyncSession = Depends(get_db),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    List all users in the tenant with filters and pagination

    **Permissions:** ADMIN or SUPER_ADMIN

    **Filters:**
    - search: Search by email or full name
    - role: Filter by user role
    - is_active: Filter by active status
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - sort_by: Sort field (default: created_at)
    - sort_desc: Sort descending (default: true)

    **Rate Limit:** 200 requests per minute
    """
    users, total = await repo.list_users(
        tenant_id=current_user.tenant_id,
        page=filters.page,
        page_size=filters.page_size,
        search=filters.search,
        role=filters.role,
        is_active=filters.is_active,
        sort_by=filters.sort_by,
        sort_desc=filters.sort_desc,
    )

    total_pages = (total + filters.page_size - 1) // filters.page_size

    return UserListResponse(
        users=[AdminUserResponse.from_orm(user) for user in users],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_user(
    request: Request,
    response: Response,
    user_id: UUID,
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Get user details by ID

    **Permissions:** ADMIN or SUPER_ADMIN

    **Rate Limit:** 200 requests per minute
    """
    user = await repo.get_user_by_id(user_id, current_user.tenant_id)

    if not user:
        raise NotFoundError(resource="User", resource_id=str(user_id))

    return AdminUserResponse.from_orm(user)


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(ADMIN_RATE_LIMIT)
async def create_user(
    request: Request,
    response: Response,
    data: AdminUserCreate,
    current_user: User = Depends(require_admin_or_super_admin),
    db: AsyncSession = Depends(get_db),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Create a new user

    **Permissions:** ADMIN or SUPER_ADMIN

    **Password Requirements:**
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    **Audit:** Creates audit log entry

    **Rate Limit:** 200 requests per minute
    """
    # Check if email already exists
    from modules.auth.repository import AuthRepository

    auth_repo = AuthRepository(db)
    existing_user = await auth_repo.get_user_by_email(data.email)

    if existing_user:
        raise DuplicateError(
            resource="User",
            field="email",
            value=data.email,
        )

    # Create user
    user = await repo.create_user(
        tenant_id=current_user.tenant_id,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        is_active=data.is_active,
    )

    # Create audit log
    await repo.create_audit_log(
        tenant_id=current_user.tenant_id,
        action="user.created",
        resource_type="user",
        resource_id=user.id,
        description=f"Admin {current_user.full_name} created user {user.email}",
        changes={
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
        },
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    await db.commit()

    return AdminUserResponse.from_orm(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def update_user(
    request: Request,
    response: Response,
    user_id: UUID,
    data: AdminUserUpdate,
    current_user: User = Depends(require_admin_or_super_admin),
    db: AsyncSession = Depends(get_db),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Update user information

    **Permissions:** ADMIN or SUPER_ADMIN

    **Note:** Admins can update user roles, including promoting to admin

    **Audit:** Creates audit log entry

    **Rate Limit:** 200 requests per minute
    """
    # Get current user state for changes tracking
    current_user_state = await repo.get_user_by_id(user_id, current_user.tenant_id)
    if not current_user_state:
        raise NotFoundError(resource="User", resource_id=str(user_id))

    # Prevent users from modifying themselves (to avoid accidental lockout)
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own user account. Use profile endpoint instead.",
        )

    # Track changes
    changes = {}
    if data.full_name is not None and data.full_name != current_user_state.full_name:
        changes["full_name"] = {
            "old": current_user_state.full_name,
            "new": data.full_name,
        }
    if data.role is not None and data.role != current_user_state.role:
        changes["role"] = {
            "old": current_user_state.role.value,
            "new": data.role.value,
        }
    if data.is_active is not None and data.is_active != current_user_state.is_active:
        changes["is_active"] = {
            "old": current_user_state.is_active,
            "new": data.is_active,
        }

    # Update user
    user = await repo.update_user(
        user_id=user_id,
        tenant_id=current_user.tenant_id,
        full_name=data.full_name,
        phone=data.phone,
        avatar_url=data.avatar_url,
        role=data.role,
        is_active=data.is_active,
    )

    if not user:
        raise NotFoundError(resource="User", resource_id=str(user_id))

    # Create audit log if there were changes
    if changes:
        await repo.create_audit_log(
            tenant_id=current_user.tenant_id,
            action="user.updated",
            resource_type="user",
            resource_id=user.id,
            description=f"Admin {current_user.full_name} updated user {user.email}",
            changes=changes,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

    await db.commit()

    return AdminUserResponse.from_orm(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(ADMIN_RATE_LIMIT)
async def delete_user(
    request: Request,
    response: Response,
    user_id: UUID,
    current_user: User = Depends(require_admin_or_super_admin),
    db: AsyncSession = Depends(get_db),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Delete (soft delete) a user

    **Permissions:** ADMIN or SUPER_ADMIN

    **Note:** Cannot delete yourself. User is soft-deleted, not permanently removed.

    **Audit:** Creates audit log entry

    **Rate Limit:** 200 requests per minute
    """
    # Prevent users from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own user account.",
        )

    # Get user for audit log
    user = await repo.get_user_by_id(user_id, current_user.tenant_id)
    if not user:
        raise NotFoundError(resource="User", resource_id=str(user_id))

    # Delete user
    deleted = await repo.delete_user(user_id, current_user.tenant_id)

    if not deleted:
        raise NotFoundError(resource="User", resource_id=str(user_id))

    # Create audit log
    await repo.create_audit_log(
        tenant_id=current_user.tenant_id,
        action="user.deleted",
        resource_type="user",
        resource_id=user_id,
        description=f"Admin {current_user.full_name} deleted user {user.email}",
        changes={"deleted": True},
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    await db.commit()

    return None


@router.get("/users/stats", response_model=UserStatsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_user_stats(
    request: Request,
    response: Response,
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Get user statistics

    **Permissions:** ADMIN or SUPER_ADMIN

    **Metrics:**
    - Total users
    - Active users
    - Inactive users
    - Users by role
    - Recent logins (last 7 days)
    - New users this month

    **Rate Limit:** 200 requests per minute
    """
    stats = await repo.get_user_stats(current_user.tenant_id)
    return UserStatsResponse(**stats)


# ============================================================================
# Audit Log Endpoints
# ============================================================================


@router.get("/audit-logs", response_model=AuditLogListResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def list_audit_logs(
    request: Request,
    response: Response,
    filters: AuditLogFilters = Depends(),
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    List audit logs with filters and pagination

    **Permissions:** ADMIN or SUPER_ADMIN

    **Filters:**
    - action: Filter by action type
    - resource_type: Filter by resource type
    - resource_id: Filter by specific resource
    - user_id: Filter by user who performed action
    - start_date: Filter logs after this date
    - end_date: Filter logs before this date
    - search: Search in description
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 200)
    - sort_by: Sort field (default: created_at)
    - sort_desc: Sort descending (default: true)

    **Rate Limit:** 200 requests per minute
    """
    logs, total = await repo.list_audit_logs(
        tenant_id=current_user.tenant_id,
        page=filters.page,
        page_size=filters.page_size,
        action=filters.action,
        resource_type=filters.resource_type,
        resource_id=filters.resource_id,
        user_id=filters.user_id,
        start_date=filters.start_date,
        end_date=filters.end_date,
        search=filters.search,
        sort_by=filters.sort_by,
        sort_desc=filters.sort_desc,
    )

    total_pages = (total + filters.page_size - 1) // filters.page_size

    # Convert logs to response format
    log_responses = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "tenant_id": log.tenant_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "description": log.description,
            "changes": log.changes,
            "user_id": log.user_id,
            "user_email": log.user.email if log.user else None,
            "user_name": log.user.full_name if log.user else None,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at,
        }
        log_responses.append(AuditLogResponse(**log_dict))

    return AuditLogListResponse(
        logs=log_responses,
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=total_pages,
    )


@router.get("/audit-logs/stats")
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_audit_stats(
    request: Request,
    response: Response,
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Get audit log statistics

    **Permissions:** ADMIN or SUPER_ADMIN

    **Metrics:**
    - Total audit logs
    - Actions today
    - Actions this week
    - Top actions (most frequent)

    **Rate Limit:** 200 requests per minute
    """
    stats = await repo.get_audit_stats(current_user.tenant_id)
    return stats


# ============================================================================
# Tenant Settings Endpoints
# ============================================================================


@router.get("/settings", response_model=TenantSettingsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_settings(
    request: Request,
    response: Response,
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Get tenant settings

    **Permissions:** ADMIN or SUPER_ADMIN

    **Rate Limit:** 200 requests per minute
    """
    tenant = await repo.get_tenant_settings(current_user.tenant_id)

    if not tenant:
        raise NotFoundError(resource="Tenant", resource_id=str(current_user.tenant_id))

    return TenantSettingsResponse.from_orm(tenant)


@router.put("/settings", response_model=TenantSettingsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def update_settings(
    request: Request,
    response: Response,
    data: TenantSettingsUpdate,
    current_user: User = Depends(require_admin_or_super_admin),
    db: AsyncSession = Depends(get_db),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Update tenant settings

    **Permissions:** ADMIN or SUPER_ADMIN

    **Audit:** Creates audit log entry

    **Rate Limit:** 200 requests per minute
    """
    # Get current settings for change tracking
    current_settings = await repo.get_tenant_settings(current_user.tenant_id)
    if not current_settings:
        raise NotFoundError(resource="Tenant", resource_id=str(current_user.tenant_id))

    # Track changes
    changes = {}
    if data.company_name is not None and data.company_name != current_settings.company_name:
        changes["company_name"] = {
            "old": current_settings.company_name,
            "new": data.company_name,
        }
    if data.domain is not None and data.domain != current_settings.domain:
        changes["domain"] = {"old": current_settings.domain, "new": data.domain}
    if data.logo_url is not None and data.logo_url != current_settings.logo_url:
        changes["logo_url"] = {"old": current_settings.logo_url, "new": data.logo_url}
    if data.timezone is not None and data.timezone != current_settings.timezone:
        changes["timezone"] = {"old": current_settings.timezone, "new": data.timezone}
    if data.date_format is not None and data.date_format != current_settings.date_format:
        changes["date_format"] = {
            "old": current_settings.date_format,
            "new": data.date_format,
        }
    if data.currency is not None and data.currency != current_settings.currency:
        changes["currency"] = {"old": current_settings.currency, "new": data.currency}

    # Update settings
    tenant = await repo.update_tenant_settings(
        tenant_id=current_user.tenant_id,
        company_name=data.company_name,
        domain=data.domain,
        logo_url=data.logo_url,
        timezone=data.timezone,
        date_format=data.date_format,
        currency=data.currency,
    )

    if not tenant:
        raise NotFoundError(resource="Tenant", resource_id=str(current_user.tenant_id))

    # Create audit log if there were changes
    if changes:
        await repo.create_audit_log(
            tenant_id=current_user.tenant_id,
            action="tenant.settings_updated",
            resource_type="tenant",
            resource_id=current_user.tenant_id,
            description=f"Admin {current_user.full_name} updated tenant settings",
            changes=changes,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

    await db.commit()

    return TenantSettingsResponse.from_orm(tenant)


# ============================================================================
# System Statistics Endpoints
# ============================================================================


@router.get("/stats", response_model=SystemStatsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_system_stats(
    request: Request,
    response: Response,
    current_user: User = Depends(require_admin_or_super_admin),
    repo: AdminRepository = Depends(get_admin_repository),
):
    """
    Get overall system statistics

    **Permissions:** ADMIN or SUPER_ADMIN

    **Metrics:**
    - User statistics (total, active, by role, etc.)
    - Audit log statistics (total, recent actions, top actions)

    **Rate Limit:** 200 requests per minute
    """
    user_stats = await repo.get_user_stats(current_user.tenant_id)
    audit_stats = await repo.get_audit_stats(current_user.tenant_id)

    return SystemStatsResponse(
        user_stats=UserStatsResponse(**user_stats),
        total_audit_logs=audit_stats["total_audit_logs"],
        actions_today=audit_stats["actions_today"],
        actions_this_week=audit_stats["actions_this_week"],
        top_actions=audit_stats["top_actions"],
    )
