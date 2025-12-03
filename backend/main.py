"""
OnQuota Backend API
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from core.config import settings
from core.logging_config import setup_structlog, get_logger
from core.logging_middleware import RequestLoggingMiddleware, ResponseSizeMiddleware
from core.database import init_db, close_db
from core.exception_handlers import configure_exception_handlers
from core.rate_limiter import configure_rate_limiting
from core.csrf_middleware import CSRFMiddleware
from core.csrf_router import router as csrf_router

# Import routers
from modules.auth.router import router as auth_router
from modules.auth.two_factor_router import router as two_factor_router
from modules.expenses.router import router as expenses_router
from modules.clients.router import router as clients_router
from modules.clients.contacts_router import router as client_contacts_router
from modules.sales.router import router as sales_router
from modules.sales.product_lines.router import router as product_lines_router
from modules.sales.quotations.router import router as quotations_router
from modules.sales.controls.router import router as sales_controls_router
from modules.sales.quotas.router import router as quotas_router
from modules.dashboard.router import router as dashboard_router
from modules.transport.router import router as transport_router
from modules.ocr.router import router as ocr_router
from modules.accounts.router import router as accounts_router
from modules.notifications.router import router as notifications_router
from modules.opportunities.router import router as opportunities_router
from modules.analytics.router import router as analytics_router
from modules.visits.router import router as visits_router
from modules.visits.router_enhanced import router as visit_topics_router
from modules.visits.commitment_router import router as commitments_router
from modules.spa.router import router as spa_router
from modules.lta.router import router as lta_router
from modules.reports.router import router as reports_router
from modules.admin.router import router as admin_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    setup_structlog()
    logger.info("Starting OnQuota API...", version=settings.VERSION, environment=settings.ENVIRONMENT)

    # Initialize database (create tables if they don't exist)
    # Note: In production, use Alembic migrations instead
    # await init_db()

    logger.info("OnQuota API started successfully",
                api_host=settings.API_HOST,
                api_port=settings.API_PORT)

    yield

    # Shutdown
    logger.info("Shutting down OnQuota API...")
    await close_db()
    logger.info("OnQuota API shut down complete")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="OnQuota SaaS - Multi-tenant Sales Management Platform",
    docs_url=settings.API_DOCS_URL,
    redoc_url=settings.API_REDOC_URL,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Add request logging middleware (first to capture all requests)
app.add_middleware(RequestLoggingMiddleware)

# Add response size middleware (helps with logging response sizes)
app.add_middleware(ResponseSizeMiddleware)

# Add CSRF protection middleware (security: prevent CSRF attacks)
# Must be added BEFORE CORS middleware to properly validate tokens
app.add_middleware(
    CSRFMiddleware,
    secret_key=settings.SECRET_KEY,
    exempt_paths=[
        "/health",
        "/health/ready",
        "/health/live",
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        f"{settings.API_PREFIX}/csrf-token",  # CSRF token endpoint itself
        f"{settings.API_PREFIX}/auth/login",  # Login doesn't need CSRF (uses credentials)
        f"{settings.API_PREFIX}/auth/register",  # Registration doesn't need CSRF
        f"{settings.API_PREFIX}/spa/upload",  # SPA upload uses multipart/form-data
        f"{settings.API_PREFIX}/analytics/upload",  # Analytics upload uses multipart/form-data
        f"{settings.API_PREFIX}/ocr/upload",  # OCR upload uses multipart/form-data
    ],
    cookie_secure=not settings.DEBUG,  # Only secure cookies in production
)

# Add CORS middleware
# CRITICAL: allow_credentials=True is REQUIRED for httpOnly cookies to work
# When allow_credentials is True, browsers will send and accept cookies in cross-origin requests
# Note: X-CSRF-Token must be in allowed headers for CSRF protection
cors_headers = ["*"] if settings.CORS_HEADERS == "*" else settings.CORS_HEADERS.split(",")
if cors_headers != ["*"] and "X-CSRF-Token" not in cors_headers:
    cors_headers.append("X-CSRF-Token")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,  # CRITICAL: Must be True to support httpOnly cookies
    allow_methods=["*"] if settings.CORS_METHODS == "*" else settings.CORS_METHODS.split(","),
    allow_headers=cors_headers,
)

# Add GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure exception handlers (security: prevent stack trace exposure)
configure_exception_handlers(app)

# Configure rate limiting (security: prevent DoS and brute force attacks)
configure_rate_limiting(app)

# Register routers
app.include_router(csrf_router, prefix=settings.API_PREFIX, tags=["Security"])
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(two_factor_router, prefix=settings.API_PREFIX)
app.include_router(expenses_router, prefix=settings.API_PREFIX)
app.include_router(clients_router, prefix=settings.API_PREFIX)
app.include_router(client_contacts_router, prefix=settings.API_PREFIX)
app.include_router(sales_router, prefix=settings.API_PREFIX)
app.include_router(product_lines_router, prefix=settings.API_PREFIX)
app.include_router(quotations_router, prefix=settings.API_PREFIX)
app.include_router(sales_controls_router, prefix=settings.API_PREFIX)
app.include_router(quotas_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(transport_router, prefix=settings.API_PREFIX)
app.include_router(ocr_router, prefix=settings.API_PREFIX)
app.include_router(accounts_router, prefix=settings.API_PREFIX)
app.include_router(notifications_router, prefix=settings.API_PREFIX)
app.include_router(opportunities_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(visits_router, prefix=settings.API_PREFIX)
app.include_router(visit_topics_router, prefix=settings.API_PREFIX)
app.include_router(commitments_router, prefix=settings.API_PREFIX)
app.include_router(spa_router, prefix=settings.API_PREFIX)
app.include_router(lta_router, prefix=settings.API_PREFIX)
app.include_router(reports_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to OnQuota API",
        "version": settings.VERSION,
        "docs": settings.API_DOCS_URL,
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Returns API status
    """
    return {
        "status": "healthy",
        "service": "onquota-api",
        "version": settings.VERSION,
    }


@app.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint
    Checks if service is ready to accept requests (database and Redis connectivity)

    Returns:
        JSON response with:
        - 200 OK: All dependencies healthy
        - 503 SERVICE UNAVAILABLE: One or more dependencies unhealthy
    """
    from core.database import engine
    from core.health_check import HealthCheckService
    from fastapi import status as http_status
    from fastapi.responses import JSONResponse

    health_service = HealthCheckService(engine, settings.REDIS_URL)
    health_result = await health_service.check_all()

    # Return appropriate HTTP status code
    if health_result["is_ready"]:
        logger.info("Readiness check: OK", components=health_result["components"])
        return JSONResponse(
            status_code=http_status.HTTP_200_OK,
            content=health_result
        )
    else:
        logger.warning("Readiness check: FAILED", components=health_result["components"])
        return JSONResponse(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_result
        )


@app.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint
    Returns 200 if the application is running and responding
    Does NOT check external dependencies (for Kubernetes liveness probes)

    Returns:
        200 OK: Application is running
    """
    return {
        "status": "alive",
        "service": "onquota-api",
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
