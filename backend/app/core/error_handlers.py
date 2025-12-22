"""Global exception handlers for FastAPI application."""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import SafeConException, ErrorCode
from app.core.logging import get_logger

logger = get_logger("error_handler")


def create_error_response(
    error_code: str,
    message: str,
    details: dict = None,
    status_code: int = 500
) -> JSONResponse:
    """Create standardized error response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details or {}
            }
        }
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers with the FastAPI app."""

    @app.exception_handler(SafeConException)
    async def safecon_exception_handler(
        request: Request,
        exc: SafeConException
    ) -> JSONResponse:
        """Handle custom SafeCon exceptions."""
        logger.warning(
            f"SafeConException: {exc.error_code.value} - {exc.message}",
            extra={
                "error_code": exc.error_code.value,
                "status_code": exc.status_code,
                "details": exc.details,
                "path": request.url.path,
                "method": request.method
            }
        )
        return create_error_response(
            error_code=exc.error_code.value,
            message=exc.message,
            details=exc.details,
            status_code=exc.status_code
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors."""
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })

        logger.warning(
            f"Validation error: {errors}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "errors": errors
            }
        )

        return create_error_response(
            error_code=ErrorCode.VALIDATION_ERROR.value,
            message="Request validation failed",
            details={"errors": errors},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request,
        exc: PydanticValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors."""
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })

        return create_error_response(
            error_code=ErrorCode.VALIDATION_ERROR.value,
            message="Data validation failed",
            details={"errors": errors},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(
        request: Request,
        exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle SQLAlchemy database errors."""
        logger.error(
            f"Database error: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error_type": type(exc).__name__
            },
            exc_info=True
        )

        return create_error_response(
            error_code=ErrorCode.INTERNAL_ERROR.value,
            message="Database error occurred",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle all unhandled exceptions."""
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error_type": type(exc).__name__
            },
            exc_info=True
        )

        return create_error_response(
            error_code=ErrorCode.INTERNAL_ERROR.value,
            message="An unexpected error occurred",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ErrorResponseSchema:
    """Schema documentation for error responses."""

    example_validation_error = {
        "success": False,
        "error": {
            "code": "VALIDATION_8001",
            "message": "Request validation failed",
            "details": {
                "errors": [
                    {
                        "field": "body.email",
                        "message": "field required",
                        "type": "value_error.missing"
                    }
                ]
            }
        }
    }

    example_auth_error = {
        "success": False,
        "error": {
            "code": "AUTH_1001",
            "message": "Invalid email or password",
            "details": {}
        }
    }

    example_not_found = {
        "success": False,
        "error": {
            "code": "CONTRACT_3001",
            "message": "Contract not found",
            "details": {
                "resource_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }
    }

    example_internal_error = {
        "success": False,
        "error": {
            "code": "INTERNAL_9001",
            "message": "An unexpected error occurred",
            "details": {}
        }
    }
