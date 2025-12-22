"""DID management API endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.base import get_db
from app.models.user import User, UserDID, DidStatus, AuthLevel
from app.api.auth import get_current_user
from app.services.did_baas import get_did_baas_client, DidBaasClient, DidBaasError
from app.core.exceptions import (
    DIDNotFoundError,
    DIDAlreadyExistsError,
    DIDServiceError,
    BusinessLogicError,
    ErrorCode
)

router = APIRouter(prefix="/did", tags=["DID Management"])


# ==================== Schemas ====================

class DidIssueResponse(BaseModel):
    did_address: str
    status: str
    message: str

    class Config:
        from_attributes = True


class DidStatusResponse(BaseModel):
    did_address: str
    status: str
    tx_hash: Optional[str] = None
    block_number: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DidVerifyResponse(BaseModel):
    valid: bool
    did_address: str
    on_chain_status: Optional[dict] = None
    message: str


class DidDocumentResponse(BaseModel):
    did_address: str
    document: dict


# ==================== Endpoints ====================

@router.post("/issue", response_model=DidIssueResponse)
async def issue_did(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Issue a new DID for the current user.

    This creates a DID on the Xphere blockchain via DID BaaS.
    The DID status will be PENDING until blockchain confirmation.
    """
    # Check if user already has a DID
    if current_user.user_did:
        raise DIDAlreadyExistsError()

    try:
        # Issue DID via DID BaaS
        # Use user ID as civil_id for DID issuance
        result = await did_client.issue_did(civil_id=str(current_user.id))

        did_address = result.get("didAddress")
        if not did_address:
            raise DIDServiceError("No DID address returned from DID BaaS")

        # Create UserDID record
        user_did = UserDID(
            user_id=current_user.id,
            did_address=did_address,
            status=DidStatus.PENDING,
            tx_hash=result.get("transactionHash")
        )
        db.add(user_did)
        await db.flush()

        return DidIssueResponse(
            did_address=did_address,
            status="PENDING",
            message="DID creation initiated. Waiting for blockchain confirmation."
        )

    except DidBaasError as e:
        raise DIDServiceError(e.message, status_code=e.status_code)


@router.get("/status", response_model=DidStatusResponse)
async def get_did_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Get the current user's DID status.

    If status is PENDING, this will check blockchain for confirmation.
    """
    # Get user's DID
    result = await db.execute(
        select(UserDID).where(UserDID.user_id == current_user.id)
    )
    user_did = result.scalar_one_or_none()

    if not user_did:
        raise DIDNotFoundError()

    # If pending, check for confirmation
    if user_did.status == DidStatus.PENDING:
        try:
            verify_result = await did_client.verify_did(user_did.did_address)

            if verify_result.get("valid") and verify_result.get("onChainStatus", {}).get("isValid"):
                # Update status to confirmed
                user_did.status = DidStatus.CONFIRMED
                user_did.confirmed_at = datetime.utcnow()

                # Update user auth level
                current_user.auth_level = AuthLevel.DID

                await db.flush()

        except DidBaasError:
            pass  # Still pending

    return DidStatusResponse(
        did_address=user_did.did_address,
        status=user_did.status.value.upper(),
        tx_hash=user_did.tx_hash,
        block_number=user_did.block_number,
        confirmed_at=user_did.confirmed_at
    )


@router.get("/verify/{did_address}", response_model=DidVerifyResponse)
async def verify_did(
    did_address: str,
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Verify a DID on the blockchain.

    This is a public endpoint - no authentication required.
    """
    try:
        result = await did_client.verify_did(did_address)

        return DidVerifyResponse(
            valid=result.get("valid", False),
            did_address=did_address,
            on_chain_status=result.get("onChainStatus"),
            message="DID verified successfully" if result.get("valid") else "DID not valid"
        )

    except DidBaasError as e:
        if e.status_code == 404:
            return DidVerifyResponse(
                valid=False,
                did_address=did_address,
                on_chain_status=None,
                message="DID not found"
            )
        raise DIDServiceError(e.message, status_code=e.status_code)


@router.get("/document", response_model=DidDocumentResponse)
async def get_did_document(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """Get the current user's DID Document."""
    # Get user's DID
    result = await db.execute(
        select(UserDID).where(UserDID.user_id == current_user.id)
    )
    user_did = result.scalar_one_or_none()

    if not user_did:
        raise DIDNotFoundError()

    try:
        document = await did_client.get_did_document(user_did.did_address)

        # Cache document in database
        import json
        user_did.did_document = json.dumps(document)
        await db.flush()

        return DidDocumentResponse(
            did_address=user_did.did_address,
            document=document
        )

    except DidBaasError as e:
        raise DIDServiceError(f"Failed to get DID document: {e.message}", status_code=e.status_code)


@router.post("/revoke")
async def revoke_did(
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """Revoke the current user's DID."""
    # Get user's DID
    result = await db.execute(
        select(UserDID).where(UserDID.user_id == current_user.id)
    )
    user_did = result.scalar_one_or_none()

    if not user_did:
        raise DIDNotFoundError()

    if user_did.status == DidStatus.REVOKED:
        raise BusinessLogicError(
            message="DID is already revoked",
            error_code=ErrorCode.DID_REVOKED
        )

    try:
        await did_client.revoke_did(user_did.did_address, reason)

        # Update status
        user_did.status = DidStatus.REVOKED
        current_user.auth_level = AuthLevel.BASIC

        await db.flush()

        return {"success": True, "message": "DID revoked successfully"}

    except DidBaasError as e:
        raise DIDServiceError(f"Failed to revoke DID: {e.message}", status_code=e.status_code)
