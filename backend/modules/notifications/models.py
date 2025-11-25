"""
Notification model for user alerts and notifications
"""
from enum import Enum
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class NotificationType(str, Enum):
    """Notification type enum for categorizing alerts"""
    INFO = "INFO"
    WARNING = "WARNING"
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"


class NotificationCategory(str, Enum):
    """Notification category for grouping related notifications"""
    SYSTEM = "SYSTEM"
    QUOTE = "QUOTE"
    OPPORTUNITY = "OPPORTUNITY"
    MAINTENANCE = "MAINTENANCE"
    PAYMENT = "PAYMENT"
    CLIENT = "CLIENT"
    GENERAL = "GENERAL"


class Notification(BaseModel):
    """
    Notification Model

    Represents user notifications and system alerts.
    Used for in-app notifications, email notifications, and activity tracking.
    """
    __tablename__ = "notifications"

    # Recipient
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Notification content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    # Type and category
    type = Column(
        SQLEnum(NotificationType, name="notification_type"),
        nullable=False,
        default=NotificationType.INFO,
        index=True
    )
    category = Column(
        SQLEnum(NotificationCategory, name="notification_category"),
        nullable=False,
        default=NotificationCategory.GENERAL,
        index=True
    )

    # Optional action URL (deep link for in-app navigation)
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(50), nullable=True)  # e.g., "View Quote", "Review Opportunity"

    # Read status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Email notification tracking
    email_sent = Column(Boolean, default=False, nullable=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_error = Column(Text, nullable=True)

    # Related entity (optional, for tracking what triggered the notification)
    related_entity_type = Column(String(50), nullable=True)  # e.g., "quote", "opportunity", "maintenance"
    related_entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Relationships
    user = relationship("User", backref="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type='{self.type}', is_read={self.is_read})>"
