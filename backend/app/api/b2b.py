"""B2B API endpoints for enterprise customers."""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
import secrets
import hashlib

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract
from app.models.subscription import UsageRecord

router = APIRouter(prefix="/b2b", tags=["B2B API"])


# ==================== In-Memory API Key Storage ====================
# In production, store in database with proper encryption

api_keys: Dict[str, dict] = {}


# ==================== Schemas ====================

class APIKeyCreateRequest(BaseModel):
    name: str
    scopes: List[str] = ["contracts:read", "contracts:write", "analysis:read"]
    expires_in_days: Optional[int] = 365


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: List[str]
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool


class APIKeyCreateResponse(APIKeyResponse):
    api_key: str  # Only shown once at creation


class B2BContractRequest(BaseModel):
    title: str
    content: str
    contract_type: Optional[str] = "other"
    metadata: Optional[Dict[str, Any]] = None


class B2BContractResponse(BaseModel):
    id: UUID
    title: str
    status: str
    safety_score: Optional[int]
    created_at: datetime


class B2BAnalysisRequest(BaseModel):
    contract_id: UUID


class B2BAnalysisResponse(BaseModel):
    contract_id: UUID
    safety_score: int
    summary: str
    risks: List[Dict[str, Any]]
    questions: List[str]
    analyzed_at: datetime


class WebhookConfigRequest(BaseModel):
    url: str
    events: List[str]  # contract.created, contract.analyzed, signature.completed
    secret: Optional[str] = None


class WebhookConfigResponse(BaseModel):
    id: str
    url: str
    events: List[str]
    is_active: bool
    created_at: datetime


# ==================== Helper Functions ====================

def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"sc_live_{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    """Hash API key for storage."""
    return hashlib.sha256(key.encode()).hexdigest()


def get_key_prefix(key: str) -> str:
    """Get displayable prefix of API key."""
    return key[:12] + "..."


async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Verify API key and return associated user info."""
    key_hash = hash_api_key(x_api_key)

    for key_id, key_data in api_keys.items():
        if key_data["key_hash"] == key_hash:
            # Check if expired
            if key_data["expires_at"] and datetime.utcnow() > key_data["expires_at"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key expired"
                )

            if not key_data["is_active"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key is disabled"
                )

            # Update last used
            key_data["last_used_at"] = datetime.utcnow()

            return key_data

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key"
    )


def check_scope(key_data: dict, required_scope: str) -> bool:
    """Check if API key has required scope."""
    return required_scope in key_data.get("scopes", []) or "*" in key_data.get("scopes", [])


# ==================== API Key Management ====================

@router.post("/keys", response_model=APIKeyCreateResponse)
async def create_api_key(
    request: APIKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new API key for B2B access."""
    # Check if user has API access
    if current_user.subscription_tier not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API access requires Pro or Enterprise subscription"
        )

    # Generate key
    api_key = generate_api_key()
    key_hash = hash_api_key(api_key)
    key_id = secrets.token_hex(8)

    # Calculate expiry
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)

    # Store key
    key_data = {
        "id": key_id,
        "name": request.name,
        "key_hash": key_hash,
        "key_prefix": get_key_prefix(api_key),
        "user_id": str(current_user.id),
        "scopes": request.scopes,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "last_used_at": None,
        "is_active": True
    }
    api_keys[key_id] = key_data

    return APIKeyCreateResponse(
        id=key_id,
        name=request.name,
        key_prefix=get_key_prefix(api_key),
        scopes=request.scopes,
        created_at=key_data["created_at"],
        expires_at=expires_at,
        last_used_at=None,
        is_active=True,
        api_key=api_key  # Only shown once!
    )


@router.get("/keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user)
):
    """List all API keys for the current user."""
    user_keys = [
        APIKeyResponse(
            id=k["id"],
            name=k["name"],
            key_prefix=k["key_prefix"],
            scopes=k["scopes"],
            created_at=k["created_at"],
            expires_at=k["expires_at"],
            last_used_at=k["last_used_at"],
            is_active=k["is_active"]
        )
        for k in api_keys.values()
        if k["user_id"] == str(current_user.id)
    ]
    return user_keys


@router.delete("/keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """Revoke an API key."""
    if key_id not in api_keys:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    if api_keys[key_id]["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot revoke another user's API key"
        )

    del api_keys[key_id]
    return {"message": "API key revoked"}


# ==================== B2B API Endpoints ====================

@router.post("/contracts", response_model=B2BContractResponse)
async def create_contract_b2b(
    request: B2BContractRequest,
    key_data: dict = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    """Create a contract via API."""
    if not check_scope(key_data, "contracts:write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient scope: contracts:write required"
        )

    from app.models.contract import Contract, ContractType

    # Map contract type
    try:
        contract_type = ContractType(request.contract_type)
    except ValueError:
        contract_type = ContractType.OTHER

    contract = Contract(
        user_id=UUID(key_data["user_id"]),
        title=request.title,
        description=request.content[:500] if request.content else None,
        contract_type=contract_type
    )

    db.add(contract)
    await db.flush()

    # Track API usage
    await track_api_usage(db, UUID(key_data["user_id"]))

    return B2BContractResponse(
        id=contract.id,
        title=contract.title,
        status=contract.status.value,
        safety_score=contract.safety_score,
        created_at=contract.created_at
    )


@router.get("/contracts", response_model=List[B2BContractResponse])
async def list_contracts_b2b(
    skip: int = 0,
    limit: int = 50,
    key_data: dict = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    """List contracts via API."""
    if not check_scope(key_data, "contracts:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient scope: contracts:read required"
        )

    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == UUID(key_data["user_id"]))
        .order_by(Contract.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
    )
    contracts = result.scalars().all()

    await track_api_usage(db, UUID(key_data["user_id"]))

    return [
        B2BContractResponse(
            id=c.id,
            title=c.title,
            status=c.status.value,
            safety_score=c.safety_score,
            created_at=c.created_at
        )
        for c in contracts
    ]


@router.get("/contracts/{contract_id}", response_model=B2BContractResponse)
async def get_contract_b2b(
    contract_id: UUID,
    key_data: dict = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific contract via API."""
    if not check_scope(key_data, "contracts:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient scope: contracts:read required"
        )

    result = await db.execute(
        select(Contract).where(
            Contract.id == contract_id,
            Contract.user_id == UUID(key_data["user_id"])
        )
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    await track_api_usage(db, UUID(key_data["user_id"]))

    return B2BContractResponse(
        id=contract.id,
        title=contract.title,
        status=contract.status.value,
        safety_score=contract.safety_score,
        created_at=contract.created_at
    )


@router.post("/analyze", response_model=B2BAnalysisResponse)
async def analyze_contract_b2b(
    request: B2BAnalysisRequest,
    key_data: dict = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    """Analyze a contract via API."""
    if not check_scope(key_data, "analysis:read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient scope: analysis:read required"
        )

    # Get contract
    result = await db.execute(
        select(Contract).where(
            Contract.id == request.contract_id,
            Contract.user_id == UUID(key_data["user_id"])
        )
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Perform analysis (simplified for B2B)
    # In production, call the actual analysis service
    analysis_result = {
        "safety_score": contract.safety_score or 75,
        "summary": "Contract analysis completed via API",
        "risks": [
            {
                "type": "general",
                "severity": "low",
                "description": "Standard contract terms detected"
            }
        ],
        "questions": [
            "What is the contract duration?",
            "Are there any renewal clauses?"
        ]
    }

    await track_api_usage(db, UUID(key_data["user_id"]))

    return B2BAnalysisResponse(
        contract_id=contract.id,
        safety_score=analysis_result["safety_score"],
        summary=analysis_result["summary"],
        risks=analysis_result["risks"],
        questions=analysis_result["questions"],
        analyzed_at=datetime.utcnow()
    )


@router.get("/usage")
async def get_api_usage(
    key_data: dict = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    """Get API usage statistics."""
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == UUID(key_data["user_id"]),
            UsageRecord.period_start == period_start
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        return {
            "period_start": period_start.isoformat(),
            "period_end": (period_start.replace(month=period_start.month + 1) if period_start.month < 12 else period_start.replace(year=period_start.year + 1, month=1)).isoformat(),
            "api_calls": 0,
            "contracts_created": 0,
            "analyses_performed": 0
        }

    return {
        "period_start": usage.period_start.isoformat(),
        "period_end": usage.period_end.isoformat(),
        "api_calls": usage.api_calls,
        "contracts_created": usage.contracts_created,
        "analyses_performed": usage.analyses_performed
    }


# ==================== Webhooks ====================

webhooks: Dict[str, dict] = {}


@router.post("/webhooks", response_model=WebhookConfigResponse)
async def create_webhook(
    request: WebhookConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """Configure a webhook endpoint."""
    webhook_id = secrets.token_hex(8)

    webhook_data = {
        "id": webhook_id,
        "user_id": str(current_user.id),
        "url": request.url,
        "events": request.events,
        "secret": request.secret or secrets.token_hex(16),
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    webhooks[webhook_id] = webhook_data

    return WebhookConfigResponse(
        id=webhook_id,
        url=request.url,
        events=request.events,
        is_active=True,
        created_at=webhook_data["created_at"]
    )


@router.get("/webhooks", response_model=List[WebhookConfigResponse])
async def list_webhooks(
    current_user: User = Depends(get_current_user)
):
    """List configured webhooks."""
    user_webhooks = [
        WebhookConfigResponse(
            id=w["id"],
            url=w["url"],
            events=w["events"],
            is_active=w["is_active"],
            created_at=w["created_at"]
        )
        for w in webhooks.values()
        if w["user_id"] == str(current_user.id)
    ]
    return user_webhooks


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a webhook."""
    if webhook_id not in webhooks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    if webhooks[webhook_id]["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another user's webhook"
        )

    del webhooks[webhook_id]
    return {"message": "Webhook deleted"}


# ==================== Helper Functions ====================

async def track_api_usage(db: AsyncSession, user_id: UUID):
    """Track API call in usage records."""
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.period_start == period_start
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        if now.month == 12:
            period_end = period_start.replace(year=now.year + 1, month=1)
        else:
            period_end = period_start.replace(month=now.month + 1)

        usage = UsageRecord(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end
        )
        db.add(usage)

    usage.api_calls += 1
    await db.flush()


# Import auth dependency
from app.api.auth import get_current_user
