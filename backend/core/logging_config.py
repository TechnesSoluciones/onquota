"""
Enhanced logging configuration with structlog
Provides JSON-formatted structured logging for production debugging
"""
import logging
import sys
from typing import Any
import structlog
from structlog.processors import CallsiteParameter

from core.config import settings


def setup_structlog() -> None:
    """
    Configure structlog with comprehensive processors for production logging

    This configuration provides:
    - JSON output for easy parsing and analysis
    - ISO-formatted timestamps
    - Exception formatting with stack traces
    - Callsite information (module, function, line number)
    - Consistent log level formatting
    """
    # Determine log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Shared processors for both structlog and stdlib
    shared_processors = [
        # Add log level to event dict
        structlog.stdlib.add_log_level,
        # Add logger name to event dict
        structlog.stdlib.add_logger_name,
        # Add timestamp in ISO format
        structlog.processors.TimeStamper(fmt="iso"),
        # Add callsite information (module, function, line number)
        structlog.processors.CallsiteParameterAdder(
            parameters=[
                CallsiteParameter.MODULE,
                CallsiteParameter.FUNC_NAME,
                CallsiteParameter.LINENO,
            ]
        ),
        # Format exception info
        structlog.processors.format_exc_info,
        # Render stack info
        structlog.processors.StackInfoRenderer(),
        # Decode unicode
        structlog.processors.UnicodeDecoder(),
    ]

    # Configure structlog
    structlog.configure(
        # Processors that run for all log entries
        processors=shared_processors + [
            # Filter by log level
            structlog.stdlib.filter_by_level,
            # Prepare for stdlib processing
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        # Use dict for context
        context_class=dict,
        # Use stdlib logging
        logger_factory=structlog.stdlib.LoggerFactory(),
        # Wrapper class for bound logger
        wrapper_class=structlog.stdlib.BoundLogger,
        # Cache logger instances
        cache_logger_on_first_use=True,
    )

    # Determine output format based on environment
    if settings.LOG_FORMAT == "json":
        # Production: JSON format for log aggregation systems
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.processors.JSONRenderer(),
            ],
        )
    else:
        # Development: Console format for readability
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.dev.ConsoleRenderer(colors=True),
            ],
        )

    # Configure stdlib logging
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Configure third-party library log levels to reduce noise
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)


def get_logger(name: str) -> Any:
    """
    Get a structured logger instance

    Args:
        name: Logger name (typically __name__)

    Returns:
        Structured logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("User logged in", user_id=user.id, tenant_id=user.tenant_id)
    """
    return structlog.get_logger(name)


def bind_context(**kwargs) -> None:
    """
    Bind context variables to the thread-local context

    Useful for adding request-scoped context like request_id

    Args:
        **kwargs: Key-value pairs to bind to context

    Example:
        bind_context(request_id="123e4567-e89b-12d3-a456-426614174000")
    """
    structlog.contextvars.bind_contextvars(**kwargs)


def unbind_context(*keys) -> None:
    """
    Unbind context variables from the thread-local context

    Args:
        *keys: Keys to unbind from context

    Example:
        unbind_context("request_id")
    """
    structlog.contextvars.unbind_contextvars(*keys)


def clear_context() -> None:
    """
    Clear all context variables from the thread-local context

    Useful for cleanup after request processing
    """
    structlog.contextvars.clear_contextvars()
