"""
Celery configuration for background tasks
"""
from celery import Celery
from core.config import settings

# Create Celery app
celery_app = Celery(
    "onquota",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        # Task modules
        "modules.analytics.tasks",
        "modules.notifications.tasks",
        "celery_tasks.cache_tasks",
        "celery_tasks.maintenance_tasks",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=settings.CELERY_TASK_TRACK_STARTED,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_TIME_LIMIT - 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,  # 1 hour
)

# Celery Beat schedule (for periodic tasks)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Notification tasks
    "check-expired-quotes": {
        "task": "notifications.check_expired_quotes",
        "schedule": crontab(hour=9, minute=0),  # Daily at 9:00 AM
    },
    "check-pending-maintenance": {
        "task": "notifications.check_pending_maintenance",
        "schedule": crontab(hour=8, minute=0),  # Daily at 8:00 AM
    },
    "check-overdue-opportunities": {
        "task": "notifications.check_overdue_opportunities",
        "schedule": crontab(hour=10, minute=0),  # Daily at 10:00 AM
    },
    "cleanup-old-notifications": {
        "task": "notifications.cleanup_old_notifications",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),  # Monthly on 1st at 2:00 AM
    },
    # Weekly summary (every Monday at 7:00 AM)
    # Note: To send to all users, you need to create a task that iterates users
    # For now, this is commented out as it needs user_id parameter
    # "send-weekly-summaries": {
    #     "task": "notifications.send_weekly_summary",
    #     "schedule": crontab(day_of_week=1, hour=7, minute=0),
    # },
}


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery"""
    print(f"Request: {self.request!r}")
    return "Celery is working!"
