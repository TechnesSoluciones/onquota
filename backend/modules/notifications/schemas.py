"""
Pydantic schemas for Notification API
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from modules.notifications.models import NotificationType, NotificationCategory


class NotificationCreate(BaseModel):
    """Schema for creating a new notification (internal use)"""
    user_id: UUID = Field(..., description="Recipient user UUID")
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message")
    type: NotificationType = Field(default=NotificationType.INFO, description="Notification type")
    category: NotificationCategory = Field(default=NotificationCategory.GENERAL, description="Notification category")
    action_url: Optional[str] = Field(None, max_length=500, description="Action URL for navigation")
    action_label: Optional[str] = Field(None, max_length=50, description="Action button label")
    related_entity_type: Optional[str] = Field(None, max_length=50, description="Type of related entity")
    related_entity_id: Optional[UUID] = Field(None, description="UUID of related entity")
    send_email: bool = Field(default=False, description="Whether to send email notification")

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Quote Expired",
                "message": "Quote #QUO-2025-001 has expired and needs to be renewed or closed.",
                "type": "WARNING",
                "category": "QUOTE",
                "action_url": "/quotes/550e8400-e29b-41d4-a716-446655440000",
                "action_label": "View Quote",
                "related_entity_type": "quote",
                "related_entity_id": "550e8400-e29b-41d4-a716-446655440000",
                "send_email": True
            }
        }
    }


class NotificationResponse(BaseModel):
    """Schema for notification response"""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    title: str
    message: str
    type: NotificationType
    category: NotificationCategory
    action_url: Optional[str]
    action_label: Optional[str]
    is_read: bool
    read_at: Optional[datetime]
    email_sent: bool
    email_sent_at: Optional[datetime]
    related_entity_type: Optional[str]
    related_entity_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list"""
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count"""
    unread_count: int


class MarkAsReadRequest(BaseModel):
    """Schema for marking notification as read (optional body)"""
    pass


class BulkNotificationCreate(BaseModel):
    """Schema for creating notifications for multiple users"""
    user_ids: list[UUID] = Field(..., min_length=1, description="List of recipient user UUIDs")
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message")
    type: NotificationType = Field(default=NotificationType.INFO, description="Notification type")
    category: NotificationCategory = Field(default=NotificationCategory.GENERAL, description="Notification category")
    action_url: Optional[str] = Field(None, max_length=500, description="Action URL for navigation")
    action_label: Optional[str] = Field(None, max_length=50, description="Action button label")
    send_email: bool = Field(default=False, description="Whether to send email notifications")
