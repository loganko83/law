"""Contract party and multi-party signing API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import secrets
import hashlib

from app.db.base import get_db
from app.models.user import User, UserDID, DidStatus
from app.models.contract import Contract, ContractParty, ContractStatus, PartyRole
from app.models.signature import ContractSignature, SignatureStatus, SignatureType
from app.api.auth import get_current_user
from app.services.did_baas import get_did_baas_client, DidBaasClient, DidBaasError

router = APIRouter(prefix="/parties", tags=["Contract Parties"])


# ==================== Schemas ====================

class PartyInviteRequest(BaseModel):
    contract_id: UUID
    role: str  # party_a, party_b, witness
    name: str
    email: EmailStr
    phone: Optional[str] = None


class PartyResponse(BaseModel):
    id: UUID
    contract_id: UUID
    role: str
    name: str | None
    email: str | None
    has_signed: bool
    signed_at: datetime | None
    invite_sent: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PartyInviteResponse(BaseModel):
    party_id: UUID
    contract_id: UUID
    invite_token: str
    invite_url: str
    message: str


class AcceptInviteRequest(BaseModel):
    token: str


class AcceptInviteResponse(BaseModel):
    contract_id: UUID
    party_id: UUID
    contract_title: str
    role: str
    message: str


class SigningOrderRequest(BaseModel):
    contract_id: UUID
    party_order: List[UUID]  # Ordered list of party IDs


class ContractPartiesResponse(BaseModel):
    contract_id: UUID
    parties: List[PartyResponse]
    total_parties: int
    signed_count: int
    pending_count: int
    all_signed: bool


# ==================== Helper Functions ====================

def generate_invite_token() -> str:
    """Generate a secure invite token."""
    return secrets.token_urlsafe(32)


def generate_invite_url(token: str) -> str:
    """Generate the full invite URL."""
    base_url = "https://trendy.storydot.kr/law"
    return f"{base_url}/accept-invite?token={token}"


# ==================== Endpoints ====================

@router.post("/invite", response_model=PartyInviteResponse)
async def invite_party(
    request: PartyInviteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a party to sign a contract.

    Sends an invitation email with a secure token link.
    """
    # Get contract
    result = await db.execute(
        select(Contract)
        .options(selectinload(Contract.parties))
        .where(Contract.id == request.contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Only owner can invite parties
    if contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only contract owner can invite parties"
        )

    # Check if email already invited
    for party in contract.parties:
        if party.email == request.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email has already been invited"
            )

    # Validate role
    try:
        role = PartyRole(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in PartyRole]}"
        )

    # Generate invite token
    invite_token = generate_invite_token()
    invite_url = generate_invite_url(invite_token)

    # Create party record
    party = ContractParty(
        contract_id=request.contract_id,
        role=role,
        name=request.name,
        email=request.email,
        phone=request.phone,
        invite_token=invite_token,
        invite_sent_at=datetime.utcnow()
    )

    db.add(party)

    # Update contract status if still draft
    if contract.status == ContractStatus.DRAFT:
        contract.status = ContractStatus.PENDING_SIGNATURE

    await db.flush()

    # Queue email sending (background task)
    background_tasks.add_task(
        send_invite_email,
        email=request.email,
        name=request.name,
        contract_title=contract.title,
        inviter_name=current_user.name or current_user.email,
        invite_url=invite_url
    )

    return PartyInviteResponse(
        party_id=party.id,
        contract_id=party.contract_id,
        invite_token=invite_token,
        invite_url=invite_url,
        message=f"Invitation sent to {request.email}"
    )


async def send_invite_email(
    email: str,
    name: str,
    contract_title: str,
    inviter_name: str,
    invite_url: str
):
    """Background task to send invite email."""
    # In production, integrate with email service (SendGrid, SES, etc.)
    # For now, just log
    print(f"Sending invite email to {email}")
    print(f"  Contract: {contract_title}")
    print(f"  Inviter: {inviter_name}")
    print(f"  URL: {invite_url}")


@router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(
    request: AcceptInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a contract signing invitation.

    Links the current user to the party record.
    """
    # Find party by invite token
    result = await db.execute(
        select(ContractParty)
        .options(selectinload(ContractParty.contract))
        .where(ContractParty.invite_token == request.token)
    )
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation"
        )

    # Check if already accepted
    if party.user_id:
        if party.user_id == current_user.id:
            return AcceptInviteResponse(
                contract_id=party.contract_id,
                party_id=party.id,
                contract_title=party.contract.title,
                role=party.role.value,
                message="You have already accepted this invitation"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation has already been accepted by another user"
            )

    # Verify email matches (optional but recommended)
    if party.email and party.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address"
        )

    # Link user to party
    party.user_id = current_user.id
    party.invite_token = None  # Invalidate token after use

    await db.flush()

    return AcceptInviteResponse(
        contract_id=party.contract_id,
        party_id=party.id,
        contract_title=party.contract.title,
        role=party.role.value,
        message="Invitation accepted. You can now sign the contract."
    )


@router.get("/contract/{contract_id}", response_model=ContractPartiesResponse)
async def get_contract_parties(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all parties for a contract."""
    # Get contract with parties
    result = await db.execute(
        select(Contract)
        .options(selectinload(Contract.parties))
        .where(Contract.id == contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Check authorization (owner or party)
    is_owner = contract.user_id == current_user.id
    is_party = any(p.user_id == current_user.id for p in contract.parties)

    if not is_owner and not is_party:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this contract"
        )

    # Count signatures
    signed_count = sum(1 for p in contract.parties if p.signed_at)
    pending_count = len(contract.parties) - signed_count

    return ContractPartiesResponse(
        contract_id=contract_id,
        parties=[
            PartyResponse(
                id=p.id,
                contract_id=p.contract_id,
                role=p.role.value,
                name=p.name,
                email=p.email,
                has_signed=p.signed_at is not None,
                signed_at=p.signed_at,
                invite_sent=p.invite_sent_at is not None,
                created_at=p.created_at
            )
            for p in contract.parties
        ],
        total_parties=len(contract.parties),
        signed_count=signed_count,
        pending_count=pending_count,
        all_signed=pending_count == 0
    )


@router.delete("/{party_id}")
async def remove_party(
    party_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a party from a contract (only if not signed)."""
    result = await db.execute(
        select(ContractParty)
        .options(selectinload(ContractParty.contract))
        .where(ContractParty.id == party_id)
    )
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )

    # Only contract owner can remove
    if party.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only contract owner can remove parties"
        )

    # Cannot remove if already signed
    if party.signed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove a party that has already signed"
        )

    await db.delete(party)
    await db.flush()

    return {"message": "Party removed successfully"}


@router.post("/{party_id}/resend-invite")
async def resend_invite(
    party_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Resend invitation email to a party."""
    result = await db.execute(
        select(ContractParty)
        .options(selectinload(ContractParty.contract))
        .where(ContractParty.id == party_id)
    )
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )

    # Only owner can resend
    if party.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only contract owner can resend invitations"
        )

    # Already accepted or signed
    if party.user_id or party.signed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Party has already accepted the invitation or signed"
        )

    # Generate new token
    new_token = generate_invite_token()
    invite_url = generate_invite_url(new_token)

    party.invite_token = new_token
    party.invite_sent_at = datetime.utcnow()

    await db.flush()

    # Queue email
    background_tasks.add_task(
        send_invite_email,
        email=party.email,
        name=party.name,
        contract_title=party.contract.title,
        inviter_name=current_user.name or current_user.email,
        invite_url=invite_url
    )

    return {"message": f"Invitation resent to {party.email}"}


@router.get("/my-pending")
async def get_my_pending_signatures(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get contracts where current user is invited but hasn't signed."""
    result = await db.execute(
        select(ContractParty)
        .options(selectinload(ContractParty.contract))
        .where(
            ContractParty.user_id == current_user.id,
            ContractParty.signed_at.is_(None)
        )
    )
    parties = result.scalars().all()

    return [
        {
            "party_id": p.id,
            "contract_id": p.contract_id,
            "contract_title": p.contract.title,
            "role": p.role.value,
            "invited_at": p.invite_sent_at,
            "contract_status": p.contract.status.value
        }
        for p in parties
    ]


@router.get("/signing-status/{contract_id}")
async def get_signing_status(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed signing status for a contract.

    Public endpoint for checking contract completion status.
    """
    result = await db.execute(
        select(Contract)
        .options(selectinload(Contract.parties))
        .where(Contract.id == contract_id)
    )
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    parties_status = []
    for party in contract.parties:
        parties_status.append({
            "role": party.role.value,
            "name": party.name,
            "has_signed": party.signed_at is not None,
            "signed_at": party.signed_at
        })

    all_signed = all(p.signed_at for p in contract.parties) if contract.parties else False

    return {
        "contract_id": contract_id,
        "contract_status": contract.status.value,
        "parties": parties_status,
        "total_parties": len(contract.parties),
        "signed_count": sum(1 for p in contract.parties if p.signed_at),
        "all_signed": all_signed,
        "completed_at": contract.signed_at if all_signed else None
    }
