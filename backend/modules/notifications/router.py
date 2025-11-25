"""
Notifications endpoints
Handles in-app notifications, read status, and notification management
"""
import math
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from modules.notifications.models import NotificationType, NotificationCategory
from modules.notifications.schemas import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from modules.notifications.repository import NotificationRepository
from api.dependencies import get_current_user


router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============================================================================
# Notification Endpoints
# ============================================================================


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    type: Optional[NotificationType] = Query(None, description="Filter by notification type"),
    category: Optional[NotificationCategory] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user notifications with filters and pagination

    Returns paginated list of notifications for the current user.

    **Filters:**
    - `is_read`: Filter by read/unread status
    - `type`: Filter by notification type (INFO, WARNING, SUCCESS, ERROR)
    - `category`: Filter by notification category (SYSTEM, QUOTE, OPPORTUNITY, etc.)

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Response includes:**
    - Notification details
    - Read status
    - Email send status
    - Action URL for navigation
    - Related entity information

    **Ordering:** Newest notifications first
    """
    repo = NotificationRepository(db)

    notifications, total = await repo.get_user_notifications(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        is_read=is_read,
        type=type,
        category=category,
        page=page,
        page_size=page_size,
    )

    # Get unread count
    unread_count = await repo.get_unread_count(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )

    # Build response items
    items = [
        NotificationResponse(
            id=notif.id,
            tenant_id=notif.tenant_id,
            user_id=notif.user_id,
            title=notif.title,
            message=notif.message,
            type=notif.type,
            category=notif.category,
            action_url=notif.action_url,
            action_label=notif.action_label,
            is_read=notif.is_read,
            read_at=notif.read_at,
            email_sent=notif.email_sent,
            email_sent_at=notif.email_sent_at,
            related_entity_type=notif.related_entity_type,
            related_entity_id=notif.related_entity_id,
            created_at=notif.created_at,
            updated_at=notif.updated_at,
        )
        for notif in notifications
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get count of unread notifications

    Returns the number of unread notifications for the current user.

    **Use Cases:**
    - Badge counter in UI
    - Header notification icon
    - Periodic polling for new notifications

    **Performance:**
    - Highly optimized query (single COUNT query)
    - Safe for frequent polling
    """
    repo = NotificationRepository(db)

    unread_count = await repo.get_unread_count(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )

    return UnreadCountResponse(unread_count=unread_count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark notification as read

    Marks a single notification as read and records the read timestamp.

    **Business Rules:**
    - Can only mark own notifications as read
    - Sets is_read = true
    - Records read_at timestamp
    - Idempotent (safe to call multiple times)

    **Access Control:**
    - User can only mark their own notifications as read

    **Use Cases:**
    - User clicks on notification
    - User hovers over notification (optional UX)
    - User navigates to notification target
    """
    repo = NotificationRepository(db)

    notification = await repo.mark_as_read(
        notification_id=notification_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )

    await db.commit()

    return NotificationResponse(
        id=notification.id,
        tenant_id=notification.tenant_id,
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        category=notification.category,
        action_url=notification.action_url,
        action_label=notification.action_label,
        is_read=notification.is_read,
        read_at=notification.read_at,
        email_sent=notification.email_sent,
        email_sent_at=notification.email_sent_at,
        related_entity_type=notification.related_entity_type,
        related_entity_id=notification.related_entity_id,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
    )


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all notifications as read

    Marks all unread notifications for the current user as read.

    **Business Rules:**
    - Marks all unread notifications as read
    - Sets read_at timestamp for all
    - Only affects current user's notifications
    - Idempotent (safe to call multiple times)

    **Use Cases:**
    - "Mark all as read" button
    - Clear all notifications action
    - Bulk notification management

    **Performance:**
    - Single UPDATE query
    - Optimized for bulk operations

    **Response:**
    - Returns count of notifications marked as read
    """
    repo = NotificationRepository(db)

    count = await repo.mark_all_as_read(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )

    await db.commit()

    return {
        "message": f"Marked {count} notifications as read",
        "count": count,
    }


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete notification

    Soft deletes a notification.

    **Business Rules:**
    - User can only delete their own notifications
    - Soft delete (marked as deleted, not removed from DB)
    - Deleted notifications don't appear in lists
    - Deleted notifications retained for audit

    **Access Control:**
    - User can only delete their own notifications

    **Use Cases:**
    - User dismisses notification
    - User cleans up notification list
    - Notification management

    **Note:** This is a soft delete for audit purposes.
    Old notifications are automatically cleaned up after 90 days.
    """
    repo = NotificationRepository(db)

    await repo.delete_notification(
        notification_id=notification_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )

    await db.commit()

    return None


# ============================================================================
# SSE Endpoint (Optional - for real-time notifications)
# ============================================================================

# Uncomment to enable Server-Sent Events for real-time notifications
# Requires: pip install sse-starlette
#
# from sse_starlette.sse import EventSourceResponse
# import asyncio
#
# @router.get("/stream")
# async def notification_stream(
#     current_user: User = Depends(get_current_user),
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Server-Sent Events stream for real-time notifications
#
#     Establishes a persistent connection that pushes new notifications
#     to the client in real-time.
#
#     **How it works:**
#     - Client opens EventSource connection
#     - Server polls for new notifications every 5 seconds
#     - New notifications are pushed to client immediately
#     - Connection stays open until client closes it
#
#     **Use Cases:**
#     - Real-time notification updates
#     - Live notification feed
#     - Push notifications without polling
#
#     **Client Example:**
#     ```javascript
#     const eventSource = new EventSource('/api/v1/notifications/stream');
#     eventSource.onmessage = (event) => {
#         const notification = JSON.parse(event.data);
#         console.log('New notification:', notification);
#     };
#     ```
#     """
#     async def event_generator():
#         last_check = datetime.utcnow()
#         while True:
#             # Check for new notifications
#             repo = NotificationRepository(db)
#             notifications, _ = await repo.get_user_notifications(
#                 user_id=current_user.id,
#                 tenant_id=current_user.tenant_id,
#                 page=1,
#                 page_size=10,
#             )
#
#             # Filter notifications created since last check
#             new_notifications = [
#                 n for n in notifications
#                 if n.created_at > last_check
#             ]
#
#             # Send new notifications
#             for notif in new_notifications:
#                 yield {
#                     "event": "notification",
#                     "data": NotificationResponse.model_validate(notif).model_dump_json(),
#                 }
#
#             last_check = datetime.utcnow()
#             await asyncio.sleep(5)  # Poll every 5 seconds
#
#     return EventSourceResponse(event_generator())
