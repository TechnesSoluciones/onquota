"""
Prometheus Metrics Configuration for OnQuota
Exports custom application metrics for monitoring
"""
from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_fastapi_instrumentator import Instrumentator, metrics
from prometheus_fastapi_instrumentator.metrics import Info as MetricInfo
from fastapi import FastAPI
import time

# Custom metrics

# Request counter by endpoint and method
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Request duration histogram
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

# Active requests gauge
http_requests_inprogress = Gauge(
    'http_requests_inprogress',
    'Number of HTTP requests in progress',
    ['method', 'endpoint']
)

# Database metrics
db_connection_pool_size = Gauge(
    'db_connection_pool_size',
    'Current database connection pool size'
)

db_connection_pool_active = Gauge(
    'db_connection_pool_active',
    'Number of active database connections'
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
)

# Cache metrics
cache_hits_total = Counter(
    'cache_hits_total',
    'Total number of cache hits',
    ['cache_key']
)

cache_misses_total = Counter(
    'cache_misses_total',
    'Total number of cache misses',
    ['cache_key']
)

# Business metrics
users_registered_total = Counter(
    'users_registered_total',
    'Total number of registered users',
    ['tenant']
)

expenses_created_total = Counter(
    'expenses_created_total',
    'Total number of expenses created',
    ['tenant', 'category']
)

quotes_created_total = Counter(
    'quotes_created_total',
    'Total number of quotes created',
    ['tenant', 'status']
)

# Celery metrics (if using Celery)
celery_tasks_total = Counter(
    'celery_tasks_total',
    'Total number of Celery tasks',
    ['task_name', 'status']
)

celery_task_duration_seconds = Histogram(
    'celery_task_duration_seconds',
    'Celery task duration in seconds',
    ['task_name'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0)
)

# Application info
app_info = Info(
    'onquota_application',
    'OnQuota application information'
)


def setup_metrics(app: FastAPI) -> Instrumentator:
    """
    Configure Prometheus metrics for FastAPI application

    Args:
        app: FastAPI application instance

    Returns:
        Instrumentator instance
    """
    # Create instrumentator
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health", "/health/ready", "/health/live"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="http_requests_inprogress",
        inprogress_labels=True,
    )

    # Add default metrics
    instrumentator.add(
        metrics.request_size(
            should_include_handler=True,
            should_include_method=True,
            should_include_status=True,
            metric_namespace="http",
            metric_subsystem="",
        )
    )

    instrumentator.add(
        metrics.response_size(
            should_include_handler=True,
            should_include_method=True,
            should_include_status=True,
            metric_namespace="http",
            metric_subsystem="",
        )
    )

    instrumentator.add(
        metrics.latency(
            should_include_handler=True,
            should_include_method=True,
            should_include_status=True,
            metric_namespace="http",
            metric_subsystem="",
            buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0),
        )
    )

    instrumentator.add(
        metrics.requests(
            should_include_handler=True,
            should_include_method=True,
            should_include_status=True,
            metric_namespace="http",
            metric_subsystem="",
        )
    )

    # Set application info
    from core.config import settings
    app_info.info({
        'version': settings.VERSION,
        'environment': settings.ENVIRONMENT,
        'project_name': settings.PROJECT_NAME,
    })

    # Instrument the app
    instrumentator.instrument(app)

    return instrumentator


def track_cache_hit(cache_key: str):
    """Track cache hit"""
    cache_hits_total.labels(cache_key=cache_key).inc()


def track_cache_miss(cache_key: str):
    """Track cache miss"""
    cache_misses_total.labels(cache_key=cache_key).inc()


def track_user_registration(tenant: str):
    """Track user registration"""
    users_registered_total.labels(tenant=tenant).inc()


def track_expense_created(tenant: str, category: str):
    """Track expense creation"""
    expenses_created_total.labels(tenant=tenant, category=category).inc()


def track_quote_created(tenant: str, status: str):
    """Track quote creation"""
    quotes_created_total.labels(tenant=tenant, status=status).inc()


def track_celery_task(task_name: str, status: str, duration: float = None):
    """Track Celery task execution"""
    celery_tasks_total.labels(task_name=task_name, status=status).inc()
    if duration is not None:
        celery_task_duration_seconds.labels(task_name=task_name).observe(duration)


def track_db_query(query_type: str, duration: float):
    """Track database query execution"""
    db_query_duration_seconds.labels(query_type=query_type).observe(duration)


def update_db_pool_metrics(pool_size: int, active_connections: int):
    """Update database connection pool metrics"""
    db_connection_pool_size.set(pool_size)
    db_connection_pool_active.set(active_connections)


class MetricsMiddleware:
    """
    Custom middleware to track additional metrics
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        method = scope["method"]
        path = scope["path"]

        # Skip metrics endpoint
        if path == "/metrics":
            return await self.app(scope, receive, send)

        # Track request
        start_time = time.time()
        http_requests_inprogress.labels(method=method, endpoint=path).inc()

        try:
            await self.app(scope, receive, send)
        finally:
            # Update metrics
            duration = time.time() - start_time
            http_requests_inprogress.labels(method=method, endpoint=path).dec()
            http_request_duration_seconds.labels(method=method, endpoint=path).observe(duration)
