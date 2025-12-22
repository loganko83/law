"""Contract signature API endpoints with W3C VC support."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import hashlib
import base64

from app.db.base import get_db
from app.models.user import User, UserDID, DidStatus
from app.models.contract import Contract, ContractParty
from app.models.signature import ContractSignature, SignatureStatus, SignatureType, SignatureVerification
from app.api.auth import get_current_user
from app.services.did_baas import get_did_baas_client, DidBaasClient, DidBaasError

router = APIRouter(prefix="/signatures", tags=["Contract Signatures"])


# ==================== Schemas ====================

class SignatureCreateRequest(BaseModel):
    contract_id: UUID
    signature_type: str  # draw, type, image
    signature_data: Optional[str] = None  # Base64 encoded
    document_hash: str  # SHA-256 of document being signed


class SignatureResponse(BaseModel):
    id: UUID
    contract_id: UUID
    signer_did: str
    signer_name: Optional[str]
    signature_type: str
    status: str
    credential_id: Optional[str]
    signed_at: datetime

    class Config:
        from_attributes = True


class SignatureWithCredentialResponse(SignatureResponse):
    credential: Optional[dict] = None
    document_hash: str


class SignatureVerifyRequest(BaseModel):
    signature_id: UUID


class SignatureVerifyResponse(BaseModel):
    valid: bool
    signature_id: UUID
    signer_did: str
    document_hash: str
    credential_verified: bool
    message: str


class ContractSignaturesResponse(BaseModel):
    contract_id: UUID
    signatures: List[SignatureResponse]
    all_parties_signed: bool
    total_parties: int
    signed_count: int


# ==================== Endpoints ====================

@router.post("/sign", response_model=SignatureWithCredentialResponse)
async def sign_contract(
    request: SignatureCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Sign a contract with DID-backed W3C Verifiable Credential.

    Requires the user to have a confirmed DID.
    Creates a signature and issues a W3C VC via DID BaaS.
    """
    # Check user has confirmed DID
    result = await db.execute(
        select(UserDID).where(UserDID.user_id == current_user.id)
    )
    user_did = result.scalar_one_or_none()

    if not user_did or user_did.status != DidStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must have a confirmed DID to sign contracts"
        )

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

    # Check if user is authorized to sign (either owner or party)
    is_owner = contract.user_id == current_user.id
    party = None
    for p in contract.parties:
        if p.email == current_user.email:
            party = p
            break

    if not is_owner and not party:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to sign this contract"
        )

    # Check if already signed
    result = await db.execute(
        select(ContractSignature).where(
            ContractSignature.contract_id == request.contract_id,
            ContractSignature.signer_did == user_did.did_address
        )
    )
    existing_signature = result.scalar_one_or_none()

    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already signed this contract"
        )

    # Validate signature type
    try:
        sig_type = SignatureType(request.signature_type.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid signature type. Must be one of: {[t.value for t in SignatureType]}"
        )

    # Calculate signature hash if data provided
    signature_hash = None
    if request.signature_data:
        signature_hash = hashlib.sha256(request.signature_data.encode()).hexdigest()

    try:
        # Issue W3C Verifiable Credential via DID BaaS
        credential = await did_client.issue_signature_credential(
            signer_did=user_did.did_address,
            contract_id=str(request.contract_id),
            contract_hash=request.document_hash,
            signature_type=sig_type.value,
            signature_data=request.signature_data
        )

        credential_id = credential.get("id")
        credential_proof = None
        if credential.get("proof"):
            credential_proof = credential["proof"].get("jws")

    except DidBaasError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=f"Failed to issue signature credential: {e.message}"
        )

    # Create signature record
    signature = ContractSignature(
        contract_id=request.contract_id,
        party_id=party.id if party else None,
        signer_did=user_did.did_address,
        signer_name=current_user.name,
        signer_email=current_user.email,
        signature_type=sig_type,
        signature_data=request.signature_data,
        signature_hash=signature_hash,
        document_hash=request.document_hash,
        credential_id=credential_id,
        credential=credential,
        credential_proof=credential_proof,
        status=SignatureStatus.SIGNED,
        verified=True,
        verified_at=datetime.utcnow(),
        signed_at=datetime.utcnow()
    )

    db.add(signature)

    # Update party status if applicable
    if party:
        party.has_signed = True
        party.signed_at = datetime.utcnow()

    await db.flush()

    return SignatureWithCredentialResponse(
        id=signature.id,
        contract_id=signature.contract_id,
        signer_did=signature.signer_did,
        signer_name=signature.signer_name,
        signature_type=signature.signature_type.value,
        status=signature.status.value,
        credential_id=signature.credential_id,
        credential=signature.credential,
        document_hash=signature.document_hash,
        signed_at=signature.signed_at
    )


@router.get("/contract/{contract_id}", response_model=ContractSignaturesResponse)
async def get_contract_signatures(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all signatures for a contract."""
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

    # Check authorization
    is_owner = contract.user_id == current_user.id
    is_party = any(p.email == current_user.email for p in contract.parties)

    if not is_owner and not is_party:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this contract"
        )

    # Get signatures
    result = await db.execute(
        select(ContractSignature)
        .where(ContractSignature.contract_id == contract_id)
        .order_by(ContractSignature.signed_at)
    )
    signatures = result.scalars().all()

    # Calculate signing status
    total_parties = len(contract.parties) + 1  # parties + owner
    signed_count = len(signatures)

    return ContractSignaturesResponse(
        contract_id=contract_id,
        signatures=[
            SignatureResponse(
                id=sig.id,
                contract_id=sig.contract_id,
                signer_did=sig.signer_did,
                signer_name=sig.signer_name,
                signature_type=sig.signature_type.value,
                status=sig.status.value,
                credential_id=sig.credential_id,
                signed_at=sig.signed_at
            )
            for sig in signatures
        ],
        all_parties_signed=signed_count >= total_parties,
        total_parties=total_parties,
        signed_count=signed_count
    )


@router.get("/{signature_id}", response_model=SignatureWithCredentialResponse)
async def get_signature(
    signature_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get signature details including W3C credential."""
    result = await db.execute(
        select(ContractSignature)
        .options(selectinload(ContractSignature.contract))
        .where(ContractSignature.id == signature_id)
    )
    signature = result.scalar_one_or_none()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    # Authorization check via contract
    contract = signature.contract
    is_owner = contract.user_id == current_user.id
    is_signer = signature.signer_email == current_user.email

    if not is_owner and not is_signer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this signature"
        )

    return SignatureWithCredentialResponse(
        id=signature.id,
        contract_id=signature.contract_id,
        signer_did=signature.signer_did,
        signer_name=signature.signer_name,
        signature_type=signature.signature_type.value,
        status=signature.status.value,
        credential_id=signature.credential_id,
        credential=signature.credential,
        document_hash=signature.document_hash,
        signed_at=signature.signed_at
    )


@router.post("/verify", response_model=SignatureVerifyResponse)
async def verify_signature(
    request: SignatureVerifyRequest,
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Verify a signature's W3C credential.

    This is a public endpoint - no authentication required.
    Verifies the credential with DID BaaS.
    """
    result = await db.execute(
        select(ContractSignature).where(ContractSignature.id == request.signature_id)
    )
    signature = result.scalar_one_or_none()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    if not signature.credential:
        return SignatureVerifyResponse(
            valid=False,
            signature_id=signature.id,
            signer_did=signature.signer_did,
            document_hash=signature.document_hash,
            credential_verified=False,
            message="No credential attached to signature"
        )

    # Log verification attempt
    verification = SignatureVerification(
        signature_id=signature.id,
        verified=False,
        verification_method="did_baas"
    )

    try:
        # Verify credential via DID BaaS
        result = await did_client.verify_w3c_credential(signature.credential)

        is_valid = result.get("valid", False)

        verification.verified = is_valid
        if not is_valid:
            verification.error_message = str(result.get("errors", []))

        db.add(verification)
        await db.flush()

        return SignatureVerifyResponse(
            valid=is_valid,
            signature_id=signature.id,
            signer_did=signature.signer_did,
            document_hash=signature.document_hash,
            credential_verified=is_valid,
            message="Credential verified successfully" if is_valid else f"Verification failed: {result.get('errors', [])}"
        )

    except DidBaasError as e:
        verification.error_message = e.message
        db.add(verification)
        await db.flush()

        raise HTTPException(
            status_code=e.status_code,
            detail=f"Verification error: {e.message}"
        )


@router.post("/{signature_id}/revoke")
async def revoke_signature(
    signature_id: UUID,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """Revoke a signature (only by the signer)."""
    result = await db.execute(
        select(ContractSignature).where(ContractSignature.id == signature_id)
    )
    signature = result.scalar_one_or_none()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    # Only signer can revoke
    if signature.signer_email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the signer can revoke their signature"
        )

    if signature.status == SignatureStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature is already revoked"
        )

    # Revoke credential if exists
    if signature.credential_id:
        try:
            await did_client.revoke_credential(signature.credential_id, reason)
        except DidBaasError as e:
            # Log but don't fail - still revoke locally
            pass

    signature.status = SignatureStatus.REVOKED
    signature.verified = False

    await db.flush()

    return {"message": "Signature revoked successfully"}
