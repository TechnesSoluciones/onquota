"""
Notifications module for OnQuota
Handles in-app notifications, email notifications, and scheduled alerts
"""
from modules.notifications.models import Notification, NotificationType

__all__ = ["Notification", "NotificationType"]
