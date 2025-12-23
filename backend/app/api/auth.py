from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime

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
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials

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
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token."""
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

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    payload = verify_token(token_data.refresh_token, "refresh")

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
    refresh_token = create_refresh_token(new_token_data)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout and invalidate access token."""
    token = credentials.credentials

    # Add token to blacklist (expires when token would expire)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    await redis_service.blacklist_token(token, expires_in)

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
