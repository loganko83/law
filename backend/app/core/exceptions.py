"""Standardized exception classes for SafeCon API."""
from enum import Enum
from typing import Any, Dict, Optional


class ErrorCode(str, Enum):
    """Standard error codes for API responses."""
    # Authentication errors (1xxx)
    INVALID_CREDENTIALS = "AUTH_1001"
    TOKEN_EXPIRED = "AUTH_1002"
    TOKEN_INVALID = "AUTH_1003"
    UNAUTHORIZED = "AUTH_1004"
    FORBIDDEN = "AUTH_1005"

    # User errors (2xxx)
    USER_NOT_FOUND = "USER_2001"
    USER_ALREADY_EXISTS = "USER_2002"
    USER_INACTIVE = "USER_2003"
    INVALID_USER_DATA = "USER_2004"

    # Contract errors (3xxx)
    CONTRACT_NOT_FOUND = "CONTRACT_3001"
    CONTRACT_ALREADY_EXISTS = "CONTRACT_3002"
    CONTRACT_INVALID_STATUS = "CONTRACT_3003"
    CONTRACT_ACCESS_DENIED = "CONTRACT_3004"

    # DID errors (4xxx)
    DID_NOT_FOUND = "DID_4001"
    DID_ALREADY_EXISTS = "DID_4002"
    DID_ISSUANCE_FAILED = "DID_4003"
    DID_VERIFICATION_FAILED = "DID_4004"
    DID_REVOKED = "DID_4005"

    # Signature errors (5xxx)
    SIGNATURE_NOT_FOUND = "SIGNATURE_5001"
    SIGNATURE_INVALID = "SIGNATURE_5002"
    SIGNATURE_ALREADY_SIGNED = "SIGNATURE_5003"
    SIGNATURE_EXPIRED = "SIGNATURE_5004"

    # Blockchain errors (6xxx)
    BLOCKCHAIN_CONNECTION_FAILED = "BLOCKCHAIN_6001"
    BLOCKCHAIN_TRANSACTION_FAILED = "BLOCKCHAIN_6002"
    BLOCKCHAIN_ANCHOR_FAILED = "BLOCKCHAIN_6003"

    # External service errors (7xxx)
    DID_BAAS_ERROR = "EXTERNAL_7001"
    AI_SERVICE_ERROR = "EXTERNAL_7002"
    STORAGE_ERROR = "EXTERNAL_7003"

    # Validation errors (8xxx)
    VALIDATION_ERROR = "VALIDATION_8001"
    INVALID_INPUT = "VALIDATION_8002"
    MISSING_REQUIRED_FIELD = "VALIDATION_8003"

    # General errors (9xxx)
    INTERNAL_ERROR = "INTERNAL_9001"
    NOT_FOUND = "GENERAL_9002"
    RATE_LIMIT_EXCEEDED = "GENERAL_9003"
    SERVICE_UNAVAILABLE = "GENERAL_9004"


class SafeConException(Exception):
    """Base exception for SafeCon API."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dict for JSON response."""
        return {
            "success": False,
            "error": {
                "code": self.error_code.value,
                "message": self.message,
                "details": self.details
            }
        }


# Authentication exceptions
class AuthenticationError(SafeConException):
    """Authentication related errors."""

    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: ErrorCode = ErrorCode.UNAUTHORIZED,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401,
            details=details
        )


class InvalidCredentialsError(AuthenticationError):
    """Invalid login credentials."""

    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(
            message=message,
            error_code=ErrorCode.INVALID_CREDENTIALS
        )


class TokenExpiredError(AuthenticationError):
    """Token has expired."""

    def __init__(self, message: str = "Token has expired"):
        super().__init__(
            message=message,
            error_code=ErrorCode.TOKEN_EXPIRED
        )


class TokenInvalidError(AuthenticationError):
    """Token is invalid."""

    def __init__(self, message: str = "Invalid token"):
        super().__init__(
            message=message,
            error_code=ErrorCode.TOKEN_INVALID
        )


class ForbiddenError(SafeConException):
    """Access forbidden."""

    def __init__(
        self,
        message: str = "Access forbidden",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.FORBIDDEN,
            status_code=403,
            details=details
        )


# Resource not found exceptions
class NotFoundError(SafeConException):
    """Resource not found."""

    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Optional[str] = None,
        error_code: ErrorCode = ErrorCode.NOT_FOUND
    ):
        message = f"{resource} not found"
        details = {"resource_id": resource_id} if resource_id else {}
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=404,
            details=details
        )


class UserNotFoundError(NotFoundError):
    """User not found."""

    def __init__(self, user_id: Optional[str] = None):
        super().__init__(
            resource="User",
            resource_id=user_id,
            error_code=ErrorCode.USER_NOT_FOUND
        )


class ContractNotFoundError(NotFoundError):
    """Contract not found."""

    def __init__(self, contract_id: Optional[str] = None):
        super().__init__(
            resource="Contract",
            resource_id=contract_id,
            error_code=ErrorCode.CONTRACT_NOT_FOUND
        )


class DIDNotFoundError(NotFoundError):
    """DID not found."""

    def __init__(self, did_address: Optional[str] = None):
        super().__init__(
            resource="DID",
            resource_id=did_address,
            error_code=ErrorCode.DID_NOT_FOUND
        )


# Conflict exceptions
class ConflictError(SafeConException):
    """Resource conflict (already exists)."""

    def __init__(
        self,
        message: str = "Resource already exists",
        error_code: ErrorCode = ErrorCode.USER_ALREADY_EXISTS,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=409,
            details=details
        )


class UserAlreadyExistsError(ConflictError):
    """User already exists."""

    def __init__(self, email: Optional[str] = None):
        super().__init__(
            message="Email already registered",
            error_code=ErrorCode.USER_ALREADY_EXISTS,
            details={"email": email} if email else {}
        )


class DIDAlreadyExistsError(ConflictError):
    """User already has a DID."""

    def __init__(self):
        super().__init__(
            message="User already has a DID",
            error_code=ErrorCode.DID_ALREADY_EXISTS
        )


# Validation exceptions
class ValidationError(SafeConException):
    """Validation error."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=400,
            details=details
        )


# External service exceptions
class ExternalServiceError(SafeConException):
    """External service error."""

    def __init__(
        self,
        service: str,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        status_code: int = 502,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"{service} error: {message}",
            error_code=error_code,
            status_code=status_code,
            details={"service": service, **(details or {})}
        )


class DIDServiceError(ExternalServiceError):
    """DID BaaS service error."""

    def __init__(
        self,
        message: str,
        status_code: int = 502,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            service="DID BaaS",
            message=message,
            error_code=ErrorCode.DID_BAAS_ERROR,
            status_code=status_code,
            details=details
        )


class AIServiceError(ExternalServiceError):
    """AI service error."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            service="AI",
            message=message,
            error_code=ErrorCode.AI_SERVICE_ERROR,
            details=details
        )


# Business logic exceptions
class BusinessLogicError(SafeConException):
    """Business logic error."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.VALIDATION_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=400,
            details=details
        )


class ContractStatusError(BusinessLogicError):
    """Invalid contract status for operation."""

    def __init__(self, message: str, current_status: Optional[str] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.CONTRACT_INVALID_STATUS,
            details={"current_status": current_status} if current_status else {}
        )


class SignatureError(BusinessLogicError):
    """Signature related error."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.SIGNATURE_INVALID
    ):
        super().__init__(message=message, error_code=error_code)


class RateLimitError(SafeConException):
    """Rate limit exceeded."""

    def __init__(self, retry_after: Optional[int] = None):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=429,
            details={"retry_after": retry_after} if retry_after else {}
        )
