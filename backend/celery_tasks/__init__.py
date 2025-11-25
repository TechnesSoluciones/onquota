"""
Celery Background Tasks
Asynchronous task processing for OnQuota
"""
from celery import Celery
from core.config import settings

# Create Celery app
celery_app = Celery(
    "onquota",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Configure Celery
celery_app.conf.update(
    task_track_started=settings.CELERY_TASK_TRACK_STARTED,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Auto-discover tasks
celery_app.autodiscover_tasks([
    "celery_tasks.cache_tasks",
    "celery_tasks.maintenance_tasks",
    "modules.ocr.tasks",
])
