"""Contract sharing API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
import secrets

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract, ContractDocument
from app.api.auth import get_current_user

router = APIRouter(prefix="/sharing", tags=["Contract Sharing"])


# ==================== Schemas ====================

class ShareContractRequest(BaseModel):
    contract_id: UUID
    expires_in_hours: Optional[int] = 24 * 7  # Default 7 days
    allow_download: bool = True
    password: Optional[str] = None


class ShareLinkResponse(BaseModel):
    contract_id: UUID
    share_url: str
    share_token: str
    expires_at: datetime
    allow_download: bool
    password_protected: bool


class SharedContractResponse(BaseModel):
    contract_id: UUID
    title: str
    description: Optional[str]
    status: str
    safety_score: Optional[int]
    created_at: datetime
    documents: List[dict]


class UpdateShareSettingsRequest(BaseModel):
    expires_in_hours: Optional[int] = None
    allow_download: Optional[bool] = None
    password: Optional[str] = None
    remove_password: bool = False


class ShareAccessRequest(BaseModel):
    token: str
    password: Optional[str] = None


# ==================== In-Memory Share Storage ====================
# In production, this should be stored in database or Redis

share_links: dict = {}


class ShareLink:
    def __init__(
        self,
        contract_id: UUID,
        token: str,
        expires_at: datetime,
        allow_download: bool,
        password_hash: Optional[str]
    ):
        self.contract_id = contract_id
        self.token = token
        self.expires_at = expires_at
        self.allow_download = allow_download
        self.password_hash = password_hash
        self.access_count = 0


# ==================== Helper Functions ====================

def generate_share_token() -> str:
    """Generate a secure share token."""
    return secrets.token_urlsafe(24)


def hash_password(password: str) -> str:
    """Simple password hash (use bcrypt in production)."""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == hashed


def get_share_url(token: str) -> str:
    """Generate the full share URL."""
    base_url = "https://trendy.storydot.kr/law"
    return f"{base_url}/shared/{token}"


# ==================== Endpoints ====================

@router.post("/create", response_model=ShareLinkResponse)
async def create_share_link(
    request: ShareContractRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a shareable link for a contract.

    Generates a secure token that can be used to view the contract
    without authentication.
    """
    # Verify contract ownership
    result = await db.execute(
        select(Contract).where(Contract.id == request.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    if contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only share your own contracts"
        )

    # Generate token and calculate expiry
    token = generate_share_token()
    expires_at = datetime.utcnow() + timedelta(hours=request.expires_in_hours)

    # Hash password if provided
    password_hash = hash_password(request.password) if request.password else None

    # Store share link
    share_link = ShareLink(
        contract_id=request.contract_id,
        token=token,
        expires_at=expires_at,
        allow_download=request.allow_download,
        password_hash=password_hash
    )
    share_links[token] = share_link

    # Update contract with share URL
    contract.share_url = get_share_url(token)
    await db.flush()

    return ShareLinkResponse(
        contract_id=request.contract_id,
        share_url=get_share_url(token),
        share_token=token,
        expires_at=expires_at,
        allow_download=request.allow_download,
        password_protected=password_hash is not None
    )


@router.get("/access/{token}", response_model=SharedContractResponse)
async def access_shared_contract(
    token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Access a shared contract via token.

    No authentication required. Password may be required if set.
    """
    # Find share link
    share_link = share_links.get(token)

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or expired"
        )

    # Check expiry
    if datetime.utcnow() > share_link.expires_at:
        del share_links[token]
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link has expired"
        )

    # Check password if required
    if share_link.password_hash:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required to access this contract"
            )
        if not verify_password(password, share_link.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )

    # Get contract
    result = await db.execute(
        select(Contract)
        .options(selectinload(Contract.documents))
        .where(Contract.id == share_link.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Increment access count
    share_link.access_count += 1

    # Prepare documents list
    documents = []
    for doc in contract.documents:
        if doc.is_latest:
            doc_info = {
                "id": str(doc.id),
                "file_name": doc.file_name,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "version": doc.version,
                "created_at": doc.created_at.isoformat()
            }
            if share_link.allow_download:
                doc_info["download_url"] = doc.file_url
            documents.append(doc_info)

    return SharedContractResponse(
        contract_id=contract.id,
        title=contract.title,
        description=contract.description,
        status=contract.status.value,
        safety_score=contract.safety_score,
        created_at=contract.created_at,
        documents=documents
    )


@router.put("/update/{token}", response_model=ShareLinkResponse)
async def update_share_settings(
    token: str,
    request: UpdateShareSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update share link settings."""
    share_link = share_links.get(token)

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )

    # Verify ownership
    result = await db.execute(
        select(Contract).where(Contract.id == share_link.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract or contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own share links"
        )

    # Update settings
    if request.expires_in_hours is not None:
        share_link.expires_at = datetime.utcnow() + timedelta(hours=request.expires_in_hours)

    if request.allow_download is not None:
        share_link.allow_download = request.allow_download

    if request.remove_password:
        share_link.password_hash = None
    elif request.password:
        share_link.password_hash = hash_password(request.password)

    return ShareLinkResponse(
        contract_id=share_link.contract_id,
        share_url=get_share_url(token),
        share_token=token,
        expires_at=share_link.expires_at,
        allow_download=share_link.allow_download,
        password_protected=share_link.password_hash is not None
    )


@router.delete("/revoke/{token}")
async def revoke_share_link(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a share link."""
    share_link = share_links.get(token)

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )

    # Verify ownership
    result = await db.execute(
        select(Contract).where(Contract.id == share_link.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract or contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revoke your own share links"
        )

    # Remove share link
    del share_links[token]

    # Clear share URL from contract
    contract.share_url = None
    await db.flush()

    return {"message": "Share link revoked successfully"}


@router.get("/my-links")
async def get_my_share_links(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all share links created by the current user."""
    # Get user's contracts
    result = await db.execute(
        select(Contract.id).where(Contract.user_id == current_user.id)
    )
    user_contract_ids = {r[0] for r in result.all()}

    # Filter share links
    my_links = []
    for token, link in share_links.items():
        if link.contract_id in user_contract_ids:
            # Check if expired
            if datetime.utcnow() > link.expires_at:
                continue

            my_links.append({
                "token": token,
                "contract_id": str(link.contract_id),
                "share_url": get_share_url(token),
                "expires_at": link.expires_at.isoformat(),
                "allow_download": link.allow_download,
                "password_protected": link.password_hash is not None,
                "access_count": link.access_count
            })

    return my_links


@router.get("/stats/{token}")
async def get_share_stats(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a share link."""
    share_link = share_links.get(token)

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )

    # Verify ownership
    result = await db.execute(
        select(Contract).where(Contract.id == share_link.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract or contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view stats for your own share links"
        )

    time_remaining = share_link.expires_at - datetime.utcnow()
    hours_remaining = max(0, time_remaining.total_seconds() / 3600)

    return {
        "token": token,
        "contract_id": str(share_link.contract_id),
        "access_count": share_link.access_count,
        "expires_at": share_link.expires_at.isoformat(),
        "hours_remaining": round(hours_remaining, 1),
        "is_expired": datetime.utcnow() > share_link.expires_at,
        "allow_download": share_link.allow_download,
        "password_protected": share_link.password_hash is not None
    }
