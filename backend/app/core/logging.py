"""Structured logging configuration using structlog."""
import logging
import sys
from typing import Any, Dict

import structlog
from structlog.types import Processor

from app.core.config import settings


def add_app_context(
    logger: logging.Logger,
    method_name: str,
    event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Add application context to log events."""
    event_dict["app"] = settings.APP_NAME
    event_dict["version"] = settings.APP_VERSION
    event_dict["environment"] = "development" if settings.DEBUG else "production"
    return event_dict


def add_request_id(
    logger: logging.Logger,
    method_name: str,
    event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Add request ID if available in context."""
    from contextvars import ContextVar
    request_id_var: ContextVar[str] = ContextVar("request_id", default="")
    request_id = request_id_var.get()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def setup_logging() -> None:
    """Configure structlog for the application."""

    # Determine log level based on DEBUG setting
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    # Shared processors for all log entries
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        add_app_context,
    ]

    # Configure processors based on environment
    if settings.DEBUG:
        # Development: Pretty console output
        processors: list[Processor] = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
    else:
        # Production: JSON output for log aggregation
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ]

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Set log levels for noisy libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name or __name__)


# Create a default logger instance
logger = get_logger("safecon")


class RequestLoggingMiddleware:
    """Middleware to log HTTP requests and responses."""

    def __init__(self, app):
        self.app = app
        self.logger = get_logger("http")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        import time
        import uuid
        from contextvars import ContextVar

        # Generate request ID
        request_id = str(uuid.uuid4())[:8]
        request_id_var: ContextVar[str] = ContextVar("request_id", default="")
        request_id_var.set(request_id)

        # Extract request info
        method = scope.get("method", "")
        path = scope.get("path", "")
        query_string = scope.get("query_string", b"").decode()
        client = scope.get("client", ("", 0))
        client_ip = client[0] if client else ""

        # Log request
        start_time = time.perf_counter()

        # Capture response status
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            self.logger.exception(
                "request_error",
                request_id=request_id,
                method=method,
                path=path,
                client_ip=client_ip,
                error=str(e)
            )
            raise
        finally:
            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log based on status code
            log_data = {
                "request_id": request_id,
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_ip,
            }

            if query_string:
                log_data["query_string"] = query_string

            if status_code >= 500:
                self.logger.error("http_request", **log_data)
            elif status_code >= 400:
                self.logger.warning("http_request", **log_data)
            else:
                self.logger.info("http_request", **log_data)


class LoggerContextManager:
    """Context manager for adding context to logs."""

    def __init__(self, **context):
        self.context = context
        self.token = None

    def __enter__(self):
        structlog.contextvars.clear_contextvars()
        for key, value in self.context.items():
            structlog.contextvars.bind_contextvars(**{key: value})
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        structlog.contextvars.clear_contextvars()
        return False


def log_context(**context):
    """Decorator/context manager to add context to logs."""
    return LoggerContextManager(**context)


# Convenience logging functions
def log_info(event: str, **kwargs):
    """Log an info message."""
    logger.info(event, **kwargs)


def log_warning(event: str, **kwargs):
    """Log a warning message."""
    logger.warning(event, **kwargs)


def log_error(event: str, **kwargs):
    """Log an error message."""
    logger.error(event, **kwargs)


def log_debug(event: str, **kwargs):
    """Log a debug message."""
    logger.debug(event, **kwargs)


def log_exception(event: str, **kwargs):
    """Log an exception with traceback."""
    logger.exception(event, **kwargs)
