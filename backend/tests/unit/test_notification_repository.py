"""
Unit tests for Notification Repository
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from modules.notifications.models import Notification, NotificationType, NotificationCategory
from modules.notifications.schemas import NotificationCreate
from modules.notifications.repository import NotificationRepository
from core.exceptions import NotFoundError


@pytest.mark.asyncio
class TestNotificationRepository:
    """Test suite for NotificationRepository"""

    async def test_create_notification(self, db_session, test_tenant, test_user):
        """Test creating a new notification"""
        repo = NotificationRepository(db_session)

        data = NotificationCreate(
            user_id=test_user.id,
            title="Test Notification",
            message="This is a test notification message",
            type=NotificationType.INFO,
            category=NotificationCategory.SYSTEM,
            action_url="/dashboard",
            action_label="View Dashboard",
            send_email=False
        )

        notification = await repo.create_notification(
            data=data,
            tenant_id=test_tenant.id
        )

        assert notification.id is not None
        assert notification.user_id == test_user.id
        assert notification.title == "Test Notification"
        assert notification.message == "This is a test notification message"
        assert notification.type == NotificationType.INFO
        assert notification.category == NotificationCategory.SYSTEM
        assert notification.is_read is False
        assert notification.email_sent is False

    async def test_create_bulk_notifications(self, db_session, test_tenant):
        """Test creating notifications for multiple users"""
        repo = NotificationRepository(db_session)

        # Create multiple test users
        user_ids = [uuid4() for _ in range(3)]

        notifications = await repo.create_bulk_notifications(
            user_ids=user_ids,
            tenant_id=test_tenant.id,
            title="Bulk Notification",
            message="Message for all users",
            type=NotificationType.WARNING,
            category=NotificationCategory.SYSTEM
        )

        assert len(notifications) == 3
        for notification in notifications:
            assert notification.title == "Bulk Notification"
            assert notification.type == NotificationType.WARNING

    async def test_get_notification_by_id(self, db_session, test_notification):
        """Test retrieving notification by ID"""
        repo = NotificationRepository(db_session)

        notification = await repo.get_notification_by_id(
            notification_id=test_notification.id,
            tenant_id=test_notification.tenant_id,
            user_id=test_notification.user_id
        )

        assert notification is not None
        assert notification.id == test_notification.id
        assert notification.title == test_notification.title

    async def test_get_notification_wrong_user(self, db_session, test_notification):
        """Test retrieving notification with wrong user ID fails"""
        repo = NotificationRepository(db_session)

        with pytest.raises(NotFoundError):
            await repo.get_notification_by_id(
                notification_id=test_notification.id,
                tenant_id=test_notification.tenant_id,
                user_id=uuid4()  # Wrong user
            )

    async def test_get_user_notifications(self, db_session, test_tenant, test_user):
        """Test listing user notifications with pagination"""
        repo = NotificationRepository(db_session)

        # Create multiple notifications
        for i in range(5):
            data = NotificationCreate(
                user_id=test_user.id,
                title=f"Notification {i}",
                message=f"Message {i}",
                type=NotificationType.INFO,
                category=NotificationCategory.GENERAL,
                send_email=False
            )
            await repo.create_notification(data=data, tenant_id=test_tenant.id)

        # Get notifications
        notifications, total = await repo.get_user_notifications(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            page=1,
            page_size=3
        )

        assert len(notifications) == 3
        assert total == 5

    async def test_filter_notifications_by_read_status(self, db_session, test_tenant, test_user):
        """Test filtering notifications by read status"""
        repo = NotificationRepository(db_session)

        # Create unread notifications
        for i in range(3):
            data = NotificationCreate(
                user_id=test_user.id,
                title=f"Unread {i}",
                message="Message",
                send_email=False
            )
            notification = await repo.create_notification(data=data, tenant_id=test_tenant.id)

        # Create and mark one as read
        data = NotificationCreate(
            user_id=test_user.id,
            title="Read notification",
            message="Message",
            send_email=False
        )
        read_notification = await repo.create_notification(data=data, tenant_id=test_tenant.id)
        await repo.mark_as_read(
            notification_id=read_notification.id,
            tenant_id=test_tenant.id,
            user_id=test_user.id
        )

        # Filter unread
        unread, unread_total = await repo.get_user_notifications(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            is_read=False,
            page=1,
            page_size=10
        )

        assert unread_total == 3

        # Filter read
        read, read_total = await repo.get_user_notifications(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            is_read=True,
            page=1,
            page_size=10
        )

        assert read_total == 1

    async def test_filter_notifications_by_type(self, db_session, test_tenant, test_user):
        """Test filtering notifications by type"""
        repo = NotificationRepository(db_session)

        # Create notifications of different types
        types = [NotificationType.INFO, NotificationType.WARNING, NotificationType.ERROR]
        for notification_type in types:
            data = NotificationCreate(
                user_id=test_user.id,
                title=f"Notification {notification_type.value}",
                message="Message",
                type=notification_type,
                send_email=False
            )
            await repo.create_notification(data=data, tenant_id=test_tenant.id)

        # Filter by WARNING type
        notifications, total = await repo.get_user_notifications(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            type=NotificationType.WARNING,
            page=1,
            page_size=10
        )

        assert total == 1
        assert notifications[0].type == NotificationType.WARNING

    async def test_get_unread_count(self, db_session, test_tenant, test_user):
        """Test getting unread notification count"""
        repo = NotificationRepository(db_session)

        # Create 5 unread notifications
        for i in range(5):
            data = NotificationCreate(
                user_id=test_user.id,
                title=f"Notification {i}",
                message="Message",
                send_email=False
            )
            await repo.create_notification(data=data, tenant_id=test_tenant.id)

        # Get unread count
        unread_count = await repo.get_unread_count(
            user_id=test_user.id,
            tenant_id=test_tenant.id
        )

        assert unread_count == 5

    async def test_mark_as_read(self, db_session, test_notification):
        """Test marking notification as read"""
        repo = NotificationRepository(db_session)

        assert test_notification.is_read is False
        assert test_notification.read_at is None

        notification = await repo.mark_as_read(
            notification_id=test_notification.id,
            tenant_id=test_notification.tenant_id,
            user_id=test_notification.user_id
        )

        assert notification.is_read is True
        assert notification.read_at is not None

    async def test_mark_all_as_read(self, db_session, test_tenant, test_user):
        """Test marking all notifications as read"""
        repo = NotificationRepository(db_session)

        # Create multiple unread notifications
        for i in range(5):
            data = NotificationCreate(
                user_id=test_user.id,
                title=f"Notification {i}",
                message="Message",
                send_email=False
            )
            await repo.create_notification(data=data, tenant_id=test_tenant.id)

        # Verify unread count
        unread_count = await repo.get_unread_count(
            user_id=test_user.id,
            tenant_id=test_tenant.id
        )
        assert unread_count == 5

        # Mark all as read
        marked_count = await repo.mark_all_as_read(
            user_id=test_user.id,
            tenant_id=test_tenant.id
        )

        assert marked_count == 5

        # Verify all are read
        unread_count = await repo.get_unread_count(
            user_id=test_user.id,
            tenant_id=test_tenant.id
        )
        assert unread_count == 0

    async def test_update_email_status(self, db_session, test_notification):
        """Test updating email send status"""
        repo = NotificationRepository(db_session)

        assert test_notification.email_sent is False
        assert test_notification.email_sent_at is None

        notification = await repo.update_email_status(
            notification_id=test_notification.id,
            sent=True,
            error=None
        )

        assert notification.email_sent is True
        assert notification.email_sent_at is not None
        assert notification.email_error is None

    async def test_update_email_status_with_error(self, db_session, test_notification):
        """Test updating email status with error"""
        repo = NotificationRepository(db_session)

        notification = await repo.update_email_status(
            notification_id=test_notification.id,
            sent=False,
            error="SMTP connection failed"
        )

        assert notification.email_sent is False
        assert notification.email_error == "SMTP connection failed"

    async def test_delete_notification(self, db_session, test_notification):
        """Test soft deleting a notification"""
        repo = NotificationRepository(db_session)

        result = await repo.delete_notification(
            notification_id=test_notification.id,
            tenant_id=test_notification.tenant_id,
            user_id=test_notification.user_id
        )

        assert result is True

        # Verify it's soft deleted
        with pytest.raises(NotFoundError):
            await repo.get_notification_by_id(
                notification_id=test_notification.id,
                tenant_id=test_notification.tenant_id,
                user_id=test_notification.user_id
            )

    async def test_delete_old_notifications(self, db_session, test_tenant, test_user):
        """Test cleanup of old read notifications"""
        repo = NotificationRepository(db_session)

        # Create old read notification (manually set created_at)
        old_notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            title="Old Notification",
            message="This is old",
            type=NotificationType.INFO,
            category=NotificationCategory.GENERAL,
            is_read=True,
            read_at=datetime.utcnow() - timedelta(days=100)
        )
        old_notification.created_at = datetime.utcnow() - timedelta(days=100)
        db_session.add(old_notification)
        await db_session.flush()

        # Create recent notification
        recent_data = NotificationCreate(
            user_id=test_user.id,
            title="Recent Notification",
            message="This is recent",
            send_email=False
        )
        recent = await repo.create_notification(data=recent_data, tenant_id=test_tenant.id)
        await repo.mark_as_read(
            notification_id=recent.id,
            tenant_id=test_tenant.id,
            user_id=test_user.id
        )

        # Delete old notifications (90+ days)
        deleted_count = await repo.delete_old_notifications(
            tenant_id=test_tenant.id,
            days_old=90
        )

        assert deleted_count >= 1  # At least the old one
