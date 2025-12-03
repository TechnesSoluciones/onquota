"""
Repository for admin operations (user management, audit logs, settings)
"""
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy import select, and_, or_, func, desc, asc, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from models.user import User, UserRole
from models.tenant import Tenant
from models.audit_log import AuditLog
from core.security import get_password_hash
from core.logging import get_logger

logger = get_logger(__name__)


class AdminRepository:
    """Repository for admin operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # User Management Operations
    # ========================================================================

    async def list_users(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
    ) -> Tuple[List[User], int]:
        """
        List users with filters and pagination

        Args:
            tenant_id: Tenant ID
            page: Page number (1-indexed)
            page_size: Items per page
            search: Search term for email or full_name
            role: Filter by role
            is_active: Filter by active status
            sort_by: Field to sort by
            sort_desc: Sort descending

        Returns:
            Tuple of (users, total_count)
        """
        # Base query
        query = select(User).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
            )
        )

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                )
            )

        if role is not None:
            query = query.where(User.role == role)

        if is_active is not None:
            query = query.where(User.is_active == is_active)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_desc:
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        users = result.scalars().all()

        return users, total

    async def get_user_by_id(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> Optional[User]:
        """
        Get user by ID within tenant

        Args:
            user_id: User ID
            tenant_id: Tenant ID

        Returns:
            User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.id == user_id,
                    User.tenant_id == tenant_id,
                    User.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_user(
        self,
        tenant_id: UUID,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        role: UserRole = UserRole.SALES_REP,
        is_active: bool = True,
    ) -> User:
        """
        Create a new user

        Args:
            tenant_id: Tenant ID
            email: User email
            password: Plain text password (will be hashed)
            full_name: User full name
            phone: Optional phone number
            role: User role
            is_active: Whether user is active

        Returns:
            Created user
        """
        hashed_password = get_password_hash(password)

        user = User(
            tenant_id=tenant_id,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            phone=phone,
            role=role,
            is_active=is_active,
            is_verified=True,  # Admin-created users are verified by default
        )

        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        logger.info(f"Admin created user: {user.id} - {user.email}")
        return user

    async def update_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        avatar_url: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[User]:
        """
        Update user information

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            full_name: Updated full name
            phone: Updated phone
            avatar_url: Updated avatar URL
            role: Updated role
            is_active: Updated active status

        Returns:
            Updated user if found, None otherwise
        """
        user = await self.get_user_by_id(user_id, tenant_id)
        if not user:
            return None

        # Update fields
        if full_name is not None:
            user.full_name = full_name
        if phone is not None:
            user.phone = phone
        if avatar_url is not None:
            user.avatar_url = avatar_url
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active

        user.updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(user)

        logger.info(f"Admin updated user: {user.id}")
        return user

    async def delete_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete a user

        Args:
            user_id: User ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        user = await self.get_user_by_id(user_id, tenant_id)
        if not user:
            return False

        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.is_active = False

        await self.db.flush()

        logger.info(f"Admin deleted user: {user.id}")
        return True

    async def get_user_stats(
        self,
        tenant_id: UUID,
    ) -> Dict[str, Any]:
        """
        Get user statistics for admin dashboard

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with user statistics
        """
        # Total users
        total_query = select(func.count()).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
            )
        )
        total_result = await self.db.execute(total_query)
        total_users = total_result.scalar_one()

        # Active users
        active_query = select(func.count()).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
                User.is_active == True,
            )
        )
        active_result = await self.db.execute(active_query)
        active_users = active_result.scalar_one()

        # Users by role
        role_query = select(
            User.role,
            func.count(User.id).label("count"),
        ).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
            )
        ).group_by(User.role)

        role_result = await self.db.execute(role_query)
        users_by_role = {row[0].value: row[1] for row in role_result}

        # Recent logins (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_logins_query = select(func.count()).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
                User.last_login >= seven_days_ago,
            )
        )
        recent_logins_result = await self.db.execute(recent_logins_query)
        recent_logins = recent_logins_result.scalar_one()

        # New users this month
        first_day_of_month = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        new_users_query = select(func.count()).where(
            and_(
                User.tenant_id == tenant_id,
                User.is_deleted == False,
                User.created_at >= first_day_of_month,
            )
        )
        new_users_result = await self.db.execute(new_users_query)
        new_users_this_month = new_users_result.scalar_one()

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "users_by_role": users_by_role,
            "recent_logins": recent_logins,
            "new_users_this_month": new_users_this_month,
        }

    # ========================================================================
    # Audit Log Operations
    # ========================================================================

    async def create_audit_log(
        self,
        tenant_id: UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        description: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry

        Args:
            tenant_id: Tenant ID
            action: Action performed (e.g., "user.created", "user.updated")
            resource_type: Type of resource affected (e.g., "user", "tenant")
            resource_id: ID of affected resource
            description: Human-readable description
            changes: Dictionary of changes made
            user_id: ID of user who performed action
            ip_address: IP address of request
            user_agent: User agent string

        Returns:
            Created audit log
        """
        audit_log = AuditLog(
            tenant_id=tenant_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            changes=changes or {},
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(audit_log)
        await self.db.flush()
        await self.db.refresh(audit_log)

        return audit_log

    async def list_audit_logs(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 50,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
    ) -> Tuple[List[AuditLog], int]:
        """
        List audit logs with filters and pagination

        Args:
            tenant_id: Tenant ID
            page: Page number (1-indexed)
            page_size: Items per page
            action: Filter by action type
            resource_type: Filter by resource type
            resource_id: Filter by resource ID
            user_id: Filter by user who performed action
            start_date: Filter logs after this date
            end_date: Filter logs before this date
            search: Search in description
            sort_by: Field to sort by
            sort_desc: Sort descending

        Returns:
            Tuple of (audit_logs, total_count)
        """
        # Base query with user relationship
        query = (
            select(AuditLog)
            .options(joinedload(AuditLog.user))
            .where(
                and_(
                    AuditLog.tenant_id == tenant_id,
                    AuditLog.is_deleted == False,
                )
            )
        )

        # Apply filters
        if action:
            query = query.where(AuditLog.action == action)

        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)

        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)

        if start_date:
            query = query.where(AuditLog.created_at >= start_date)

        if end_date:
            query = query.where(AuditLog.created_at <= end_date)

        if search:
            search_term = f"%{search}%"
            query = query.where(AuditLog.description.ilike(search_term))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply sorting
        sort_column = getattr(AuditLog, sort_by, AuditLog.created_at)
        if sort_desc:
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        logs = result.unique().scalars().all()

        return logs, total

    async def get_audit_stats(
        self,
        tenant_id: UUID,
    ) -> Dict[str, Any]:
        """
        Get audit log statistics

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with audit statistics
        """
        # Total audit logs
        total_query = select(func.count()).where(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.is_deleted == False,
            )
        )
        total_result = await self.db.execute(total_query)
        total_audit_logs = total_result.scalar_one()

        # Actions today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_query = select(func.count()).where(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.is_deleted == False,
                AuditLog.created_at >= today,
            )
        )
        today_result = await self.db.execute(today_query)
        actions_today = today_result.scalar_one()

        # Actions this week
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        week_query = select(func.count()).where(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.is_deleted == False,
                AuditLog.created_at >= seven_days_ago,
            )
        )
        week_result = await self.db.execute(week_query)
        actions_this_week = week_result.scalar_one()

        # Top actions
        top_actions_query = (
            select(
                AuditLog.action,
                func.count(AuditLog.id).label("count"),
            )
            .where(
                and_(
                    AuditLog.tenant_id == tenant_id,
                    AuditLog.is_deleted == False,
                )
            )
            .group_by(AuditLog.action)
            .order_by(desc("count"))
            .limit(10)
        )

        top_actions_result = await self.db.execute(top_actions_query)
        top_actions = [
            {"action": row[0], "count": row[1]} for row in top_actions_result
        ]

        return {
            "total_audit_logs": total_audit_logs,
            "actions_today": actions_today,
            "actions_this_week": actions_this_week,
            "top_actions": top_actions,
        }

    # ========================================================================
    # Tenant Settings Operations
    # ========================================================================

    async def get_tenant_settings(
        self,
        tenant_id: UUID,
    ) -> Optional[Tenant]:
        """
        Get tenant settings

        Args:
            tenant_id: Tenant ID

        Returns:
            Tenant if found, None otherwise
        """
        result = await self.db.execute(
            select(Tenant).where(
                and_(
                    Tenant.id == tenant_id,
                    Tenant.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def update_tenant_settings(
        self,
        tenant_id: UUID,
        company_name: Optional[str] = None,
        domain: Optional[str] = None,
        logo_url: Optional[str] = None,
        timezone: Optional[str] = None,
        date_format: Optional[str] = None,
        currency: Optional[str] = None,
    ) -> Optional[Tenant]:
        """
        Update tenant settings

        Args:
            tenant_id: Tenant ID
            company_name: Updated company name
            domain: Updated domain
            logo_url: Updated logo URL
            timezone: Updated timezone
            date_format: Updated date format
            currency: Updated currency

        Returns:
            Updated tenant if found, None otherwise
        """
        tenant = await self.get_tenant_settings(tenant_id)
        if not tenant:
            return None

        # Update fields
        if company_name is not None:
            tenant.company_name = company_name
        if domain is not None:
            tenant.domain = domain
        if logo_url is not None:
            tenant.logo_url = logo_url
        if timezone is not None:
            tenant.timezone = timezone
        if date_format is not None:
            tenant.date_format = date_format
        if currency is not None:
            tenant.currency = currency

        tenant.updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(tenant)

        logger.info(f"Admin updated tenant settings: {tenant.id}")
        return tenant
