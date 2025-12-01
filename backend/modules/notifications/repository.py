"""
Repository for Notification CRUD operations and business logic
"""
from typing import Optional, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import joinedload

from models.notification import Notification, NotificationType, NotificationCategory
from modules.notifications.schemas import NotificationCreate
from core.exceptions import NotFoundError


class NotificationRepository:
    """Repository for managing notifications"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================================================
    # Create Operations
    # ============================================================================

    async def create_notification(
        self,
        data: NotificationCreate,
        tenant_id: UUID
    ) -> Notification:
        """
        Create a new notification

        Args:
            data: Notification creation data
            tenant_id: Tenant UUID

        Returns:
            Created Notification instance
        """
        notification = Notification(
            tenant_id=tenant_id,
            user_id=data.user_id,
            title=data.title,
            message=data.message,
            type=data.type,
            category=data.category,
            action_url=data.action_url,
            action_label=data.action_label,
            related_entity_type=data.related_entity_type,
            related_entity_id=data.related_entity_id,
            is_read=False,
            email_sent=False,
        )

        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)

        return notification

    async def create_bulk_notifications(
        self,
        user_ids: list[UUID],
        tenant_id: UUID,
        title: str,
        message: str,
        type: NotificationType = NotificationType.INFO,
        category: NotificationCategory = NotificationCategory.GENERAL,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[UUID] = None,
    ) -> list[Notification]:
        """
        Create notifications for multiple users at once

        Args:
            user_ids: List of user UUIDs
            tenant_id: Tenant UUID
            title: Notification title
            message: Notification message
            type: Notification type
            category: Notification category
            action_url: Optional action URL
            action_label: Optional action label
            related_entity_type: Optional related entity type
            related_entity_id: Optional related entity ID

        Returns:
            List of created Notification instances
        """
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                tenant_id=tenant_id,
                user_id=user_id,
                title=title,
                message=message,
                type=type,
                category=category,
                action_url=action_url,
                action_label=action_label,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                is_read=False,
                email_sent=False,
            )
            self.db.add(notification)
            notifications.append(notification)

        await self.db.flush()
        return notifications

    # ============================================================================
    # Read Operations
    # ============================================================================

    async def get_notification_by_id(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> Notification:
        """
        Get notification by ID (with user ownership check)

        Args:
            notification_id: Notification UUID
            tenant_id: Tenant UUID
            user_id: User UUID (owner check)

        Returns:
            Notification instance

        Raises:
            NotFoundError: If notification not found or doesn't belong to user
        """
        stmt = (
            select(Notification)
            .where(
                and_(
                    Notification.id == notification_id,
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.is_deleted == False
                )
            )
        )

        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()

        if not notification:
            raise NotFoundError("Notification not found")

        return notification

    async def get_user_notifications(
        self,
        user_id: UUID,
        tenant_id: UUID,
        is_read: Optional[bool] = None,
        type: Optional[NotificationType] = None,
        category: Optional[NotificationCategory] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[list[Notification], int]:
        """
        Get paginated list of user notifications with filters

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID
            is_read: Filter by read status
            type: Filter by notification type
            category: Filter by notification category
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (notifications list, total count)
        """
        # Build base query
        stmt = (
            select(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.tenant_id == tenant_id,
                    Notification.is_deleted == False
                )
            )
        )

        # Apply filters
        if is_read is not None:
            stmt = stmt.where(Notification.is_read == is_read)
        if type:
            stmt = stmt.where(Notification.type == type)
        if category:
            stmt = stmt.where(Notification.category == category)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # Apply pagination and ordering (newest first)
        stmt = stmt.order_by(Notification.created_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = await self.db.execute(stmt)
        notifications = list(result.scalars().all())

        return notifications, total

    async def get_unread_count(
        self,
        user_id: UUID,
        tenant_id: UUID
    ) -> int:
        """
        Get count of unread notifications for a user

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID

        Returns:
            Count of unread notifications
        """
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.tenant_id == tenant_id,
                    Notification.is_read == False,
                    Notification.is_deleted == False
                )
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ============================================================================
    # Update Operations
    # ============================================================================

    async def mark_as_read(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> Notification:
        """
        Mark a notification as read

        Args:
            notification_id: Notification UUID
            tenant_id: Tenant UUID
            user_id: User UUID (owner check)

        Returns:
            Updated Notification instance

        Raises:
            NotFoundError: If notification not found
        """
        notification = await self.get_notification_by_id(
            notification_id,
            tenant_id,
            user_id
        )

        notification.is_read = True
        notification.read_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(notification)

        return notification

    async def mark_all_as_read(
        self,
        user_id: UUID,
        tenant_id: UUID
    ) -> int:
        """
        Mark all notifications as read for a user

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID

        Returns:
            Number of notifications marked as read
        """
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.tenant_id == tenant_id,
                    Notification.is_read == False,
                    Notification.is_deleted == False
                )
            )
            .values(
                is_read=True,
                read_at=datetime.utcnow()
            )
        )

        result = await self.db.execute(stmt)
        await self.db.flush()

        return result.rowcount

    async def update_email_status(
        self,
        notification_id: UUID,
        sent: bool,
        error: Optional[str] = None
    ) -> Notification:
        """
        Update email send status for a notification

        Args:
            notification_id: Notification UUID
            sent: Whether email was sent successfully
            error: Optional error message if send failed

        Returns:
            Updated Notification instance
        """
        stmt = select(Notification).where(Notification.id == notification_id)
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()

        if notification:
            notification.email_sent = sent
            if sent:
                notification.email_sent_at = datetime.utcnow()
            if error:
                notification.email_error = error

            await self.db.flush()
            await self.db.refresh(notification)

        return notification

    # ============================================================================
    # Delete Operations
    # ============================================================================

    async def delete_notification(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Soft delete a notification

        Args:
            notification_id: Notification UUID
            tenant_id: Tenant UUID
            user_id: User UUID (owner check)

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If notification not found
        """
        notification = await self.get_notification_by_id(
            notification_id,
            tenant_id,
            user_id
        )

        notification.soft_delete()
        await self.db.flush()

        return True

    async def delete_old_notifications(
        self,
        tenant_id: UUID,
        days_old: int = 90
    ) -> int:
        """
        Delete old read notifications (cleanup task)

        Args:
            tenant_id: Tenant UUID
            days_old: Delete notifications older than this many days

        Returns:
            Number of notifications deleted
        """
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.tenant_id == tenant_id,
                    Notification.is_read == True,
                    Notification.created_at < cutoff_date,
                    Notification.is_deleted == False
                )
            )
            .values(
                is_deleted=True,
                deleted_at=datetime.utcnow()
            )
        )

        result = await self.db.execute(stmt)
        await self.db.flush()

        return result.rowcount
