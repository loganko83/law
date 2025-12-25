from fastapi import APIRouter, Depends, status, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional
import secrets

from app.db.base import get_db
from app.models.user import User
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    AuthResponse,
    TokenRefresh
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)
from app.core.exceptions import (
    InvalidCredentialsError,
    TokenInvalidError,
    UserNotFoundError,
    UserAlreadyExistsError
)
from app.services.redis import redis_service
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

# Cookie settings
REFRESH_TOKEN_COOKIE = "safecon_refresh_token"
CSRF_TOKEN_COOKIE = "safecon_csrf_token"
COOKIE_SECURE = not settings.DEBUG  # Use secure cookies in production
COOKIE_SAMESITE = "lax"  # Allows same-site and top-level navigation


def set_auth_cookies(response: Response, refresh_token: str) -> str:
    """Set authentication cookies and return CSRF token."""
    csrf_token = secrets.token_urlsafe(32)

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

    # Set CSRF token (readable by JavaScript)
    response.set_cookie(
        key=CSRF_TOKEN_COOKIE,
        value=csrf_token,
        httponly=False,  # JavaScript needs to read this
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

    return csrf_token


def clear_auth_cookies(response: Response):
    """Clear authentication cookies."""
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE, path="/")
    response.delete_cookie(key=CSRF_TOKEN_COOKIE, path="/")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token (header or cookie)."""
    token = None

    # Try to get token from Authorization header first
    if credentials:
        token = credentials.credentials

    if not token:
        raise TokenInvalidError("Authentication required")

    # Check if token is blacklisted
    if await redis_service.is_token_blacklisted(token):
        raise TokenInvalidError("Token has been revoked")

    token_data = verify_token(token, "access")

    if token_data is None:
        raise TokenInvalidError("Invalid or expired token")

    result = await db.execute(
        select(User)
        .options(selectinload(User.user_did))
        .where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise UserNotFoundError(str(token_data.user_id))

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise UserAlreadyExistsError(user_data.email)

    # Create new user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return user


@router.post("/login", response_model=AuthResponse)
async def login(
    login_data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token. Sets refresh token in httpOnly cookie."""
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(login_data.password, user.password_hash):
        raise InvalidCredentialsError()

    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.flush()

    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "auth_level": user.auth_level.value,
        "tier": user.subscription_tier.value
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Set refresh token in httpOnly cookie
    set_auth_cookies(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,  # Also return for backward compatibility
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token_endpoint(
    response: Response,
    token_data: Optional[TokenRefresh] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token from cookie or body."""
    # Try to get refresh token from cookie first, then from body
    token = refresh_token_cookie
    if not token and token_data:
        token = token_data.refresh_token

    if not token:
        raise TokenInvalidError("Refresh token required")

    payload = verify_token(token, "refresh")

    if payload is None:
        raise TokenInvalidError("Invalid or expired refresh token")

    # Get user
    result = await db.execute(
        select(User).where(User.id == payload.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise UserNotFoundError(str(payload.user_id))

    # Create new tokens
    new_token_data = {
        "sub": str(user.id),
        "email": user.email,
        "auth_level": user.auth_level.value,
        "tier": user.subscription_tier.value
    }

    access_token = create_access_token(new_token_data)
    new_refresh_token = create_refresh_token(new_token_data)

    # Set new refresh token in cookie
    set_auth_cookies(response, new_refresh_token)

    return AuthResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Logout, invalidate access token, and clear cookies."""
    # Blacklist the access token if provided
    if credentials:
        token = credentials.credentials
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        await redis_service.blacklist_token(token, expires_in)

    # Clear authentication cookies
    clear_auth_cookies(response)

    return None


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    update_dict = update_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        setattr(current_user, key, value)

    await db.flush()
    await db.refresh(current_user)

    return current_user
