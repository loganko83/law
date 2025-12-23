"""Blockchain anchoring API endpoints for content proof."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import hashlib
import secrets
import json

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract, ContractDocument
from app.models.blockchain import BlockchainRecord, Certificate, AnchorStatus
from app.api.auth import get_current_user
from app.services.did_baas import get_did_baas_client, DidBaasClient, DidBaasError
from app.services.certificate import get_certificate_service
from app.core.config import settings

router = APIRouter(prefix="/blockchain", tags=["Blockchain Anchoring"])


# ==================== Schemas ====================

class AnchorRequest(BaseModel):
    contract_id: UUID
    document_id: Optional[UUID] = None
    document_hash: str  # SHA-256 of document


class AnchorResponse(BaseModel):
    id: UUID
    contract_id: UUID
    document_hash: str
    status: str
    tx_hash: Optional[str]
    block_number: Optional[int]
    network: str
    created_at: datetime
    confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnchorStatusResponse(BaseModel):
    id: UUID
    status: str
    tx_hash: Optional[str]
    block_number: Optional[int]
    confirmations: int
    network: str
    merkle_root: Optional[str]
    merkle_proof: Optional[List[str]]


class VerifyRequest(BaseModel):
    document_hash: str


class VerifyResponse(BaseModel):
    verified: bool
    document_hash: str
    anchor_id: Optional[UUID]
    tx_hash: Optional[str]
    block_number: Optional[int]
    anchored_at: Optional[datetime]
    network: str
    message: str


class CertificateResponse(BaseModel):
    id: UUID
    certificate_number: str
    contract_id: UUID
    document_hash: str
    tx_hash: str
    block_number: int
    network: str
    pdf_url: Optional[str]
    qr_code_url: Optional[str]
    verification_url: str
    created_at: datetime


class BatchAnchorRequest(BaseModel):
    hashes: List[str]  # List of document hashes to anchor


class BatchAnchorResponse(BaseModel):
    batch_id: str
    merkle_root: str
    total_documents: int
    status: str
    tx_hash: Optional[str]


# ==================== Helper Functions ====================

def compute_merkle_root(hashes: List[str]) -> tuple[str, List[List[str]]]:
    """
    Compute Merkle root from list of hashes.
    Returns (root, proof_tree).
    """
    if not hashes:
        return "", []

    # Ensure even number of leaves
    if len(hashes) % 2 == 1:
        hashes = hashes + [hashes[-1]]

    tree = [hashes]

    while len(hashes) > 1:
        next_level = []
        for i in range(0, len(hashes), 2):
            combined = hashes[i] + hashes[i + 1]
            next_hash = hashlib.sha256(combined.encode()).hexdigest()
            next_level.append(next_hash)

        if len(next_level) > 1 and len(next_level) % 2 == 1:
            next_level = next_level + [next_level[-1]]

        tree.append(next_level)
        hashes = next_level

    return hashes[0], tree


def get_merkle_proof(hash_value: str, tree: List[List[str]]) -> List[dict]:
    """Get Merkle proof for a specific hash."""
    proof = []

    if not tree or hash_value not in tree[0]:
        return []

    index = tree[0].index(hash_value)

    for level in tree[:-1]:  # Exclude root
        if index % 2 == 0:
            sibling_index = index + 1
            position = "right"
        else:
            sibling_index = index - 1
            position = "left"

        if sibling_index < len(level):
            proof.append({
                "hash": level[sibling_index],
                "position": position
            })

        index = index // 2

    return proof


async def generate_certificate_number(db: AsyncSession) -> str:
    """Generate unique certificate number."""
    year = datetime.utcnow().year
    result = await db.execute(
        select(func.count(Certificate.id))
        .where(Certificate.certificate_number.like(f"SC-{year}-%"))
    )
    count = result.scalar() or 0
    return f"SC-{year}-{count + 1:06d}"


# ==================== Endpoints ====================

@router.post("/anchor", response_model=AnchorResponse)
async def anchor_document(
    request: AnchorRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    did_client: DidBaasClient = Depends(get_did_baas_client)
):
    """
    Anchor a document hash to Xphere blockchain.

    Creates a blockchain record that proves the document
    existed at a specific point in time.
    """
    # Verify contract access
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
            detail="You are not authorized to anchor this contract"
        )

    # Check for existing anchor with same hash
    result = await db.execute(
        select(BlockchainRecord).where(
            BlockchainRecord.contract_id == request.contract_id,
            BlockchainRecord.document_hash == request.document_hash,
            BlockchainRecord.status.in_([AnchorStatus.PENDING, AnchorStatus.CONFIRMED])
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        return AnchorResponse(
            id=existing.id,
            contract_id=existing.contract_id,
            document_hash=existing.document_hash,
            status=existing.status.value,
            tx_hash=existing.tx_hash,
            block_number=existing.block_number,
            network=existing.network,
            created_at=existing.created_at,
            confirmed_at=existing.confirmed_at
        )

    # Generate salt for privacy
    salt = secrets.token_hex(32)
    salted_hash = hashlib.sha256(
        (request.document_hash + salt).encode()
    ).hexdigest()

    # Create blockchain record
    record = BlockchainRecord(
        contract_id=request.contract_id,
        document_id=request.document_id,
        document_hash=request.document_hash,
        salt=salt,
        network="xphere",
        status=AnchorStatus.PENDING
    )

    db.add(record)
    await db.flush()

    # Queue for blockchain anchoring (background task)
    # In production, this would submit to blockchain via DID BaaS
    background_tasks.add_task(
        process_anchor,
        record_id=record.id,
        salted_hash=salted_hash
    )

    return AnchorResponse(
        id=record.id,
        contract_id=record.contract_id,
        document_hash=record.document_hash,
        status=record.status.value,
        tx_hash=record.tx_hash,
        block_number=record.block_number,
        network=record.network,
        created_at=record.created_at,
        confirmed_at=record.confirmed_at
    )


async def process_anchor(record_id: UUID, salted_hash: str):
    """Background task to process blockchain anchoring."""
    # This would connect to DID BaaS and submit to Xphere blockchain
    # For now, simulating the process
    pass


@router.get("/anchor/{anchor_id}", response_model=AnchorStatusResponse)
async def get_anchor_status(
    anchor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get blockchain anchor status."""
    result = await db.execute(
        select(BlockchainRecord)
        .options(selectinload(BlockchainRecord.contract))
        .where(BlockchainRecord.id == anchor_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anchor record not found"
        )

    # Authorization check
    if record.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this anchor"
        )

    # Calculate confirmations (if confirmed)
    confirmations = 0
    if record.block_number:
        # In production, query current block and calculate
        confirmations = 12  # Placeholder

    return AnchorStatusResponse(
        id=record.id,
        status=record.status.value,
        tx_hash=record.tx_hash,
        block_number=record.block_number,
        confirmations=confirmations,
        network=record.network,
        merkle_root=record.merkle_root,
        merkle_proof=record.merkle_proof
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify_document(
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify a document hash against blockchain records.

    This is a public endpoint - no authentication required.
    """
    # Search for matching anchor
    result = await db.execute(
        select(BlockchainRecord).where(
            BlockchainRecord.document_hash == request.document_hash,
            BlockchainRecord.status == AnchorStatus.CONFIRMED
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        return VerifyResponse(
            verified=False,
            document_hash=request.document_hash,
            anchor_id=None,
            tx_hash=None,
            block_number=None,
            anchored_at=None,
            network="xphere",
            message="Document hash not found in blockchain records"
        )

    return VerifyResponse(
        verified=True,
        document_hash=request.document_hash,
        anchor_id=record.id,
        tx_hash=record.tx_hash,
        block_number=record.block_number,
        anchored_at=record.confirmed_at,
        network=record.network,
        message="Document verified on Xphere blockchain"
    )


@router.post("/batch-anchor", response_model=BatchAnchorResponse)
async def batch_anchor_documents(
    request: BatchAnchorRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Batch anchor multiple document hashes using Merkle tree.

    This is more efficient for anchoring multiple documents
    as only one blockchain transaction is needed.
    """
    if len(request.hashes) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch anchor requires at least 2 hashes"
        )

    if len(request.hashes) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 hashes per batch"
        )

    # Compute Merkle root
    merkle_root, tree = compute_merkle_root(request.hashes)
    batch_id = f"BATCH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(4)}"

    # Create records for each hash
    for doc_hash in request.hashes:
        proof = get_merkle_proof(doc_hash, tree)

        record = BlockchainRecord(
            contract_id=None,  # Batch doesn't have single contract
            document_hash=doc_hash,
            merkle_root=merkle_root,
            merkle_proof=proof,
            batch_id=batch_id,
            network="xphere",
            status=AnchorStatus.QUEUED
        )
        db.add(record)

    await db.flush()

    # Queue batch for anchoring
    background_tasks.add_task(
        process_batch_anchor,
        batch_id=batch_id,
        merkle_root=merkle_root
    )

    return BatchAnchorResponse(
        batch_id=batch_id,
        merkle_root=merkle_root,
        total_documents=len(request.hashes),
        status="queued",
        tx_hash=None
    )


async def process_batch_anchor(batch_id: str, merkle_root: str):
    """Background task to process batch blockchain anchoring."""
    # Submit merkle_root to Xphere blockchain
    pass


@router.get("/certificate/{anchor_id}", response_model=CertificateResponse)
async def get_certificate(
    anchor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get or generate certificate for a confirmed anchor."""
    result = await db.execute(
        select(BlockchainRecord)
        .options(
            selectinload(BlockchainRecord.contract),
            selectinload(BlockchainRecord.certificate)
        )
        .where(BlockchainRecord.id == anchor_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anchor record not found"
        )

    if record.status != AnchorStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate only available for confirmed anchors"
        )

    # Authorization check
    if record.contract and record.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this certificate"
        )

    # Generate certificate if not exists
    if not record.certificate:
        cert_number = await generate_certificate_number(db)
        verification_url = f"https://trendy.storydot.kr/law/verify/{record.id}"

        certificate = Certificate(
            blockchain_record_id=record.id,
            certificate_number=cert_number,
            verification_url=verification_url
        )
        db.add(certificate)
        await db.flush()
        record.certificate = certificate

    return CertificateResponse(
        id=record.certificate.id,
        certificate_number=record.certificate.certificate_number,
        contract_id=record.contract_id,
        document_hash=record.document_hash,
        tx_hash=record.tx_hash,
        block_number=record.block_number,
        network=record.network,
        pdf_url=record.certificate.pdf_url,
        qr_code_url=record.certificate.qr_code_url,
        verification_url=record.certificate.verification_url,
        created_at=record.certificate.created_at
    )


@router.get("/certificate/{anchor_id}/pdf")
async def download_certificate_pdf(
    anchor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download certificate as PDF."""
    result = await db.execute(
        select(BlockchainRecord)
        .options(
            selectinload(BlockchainRecord.contract),
            selectinload(BlockchainRecord.certificate)
        )
        .where(BlockchainRecord.id == anchor_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anchor record not found"
        )

    if record.status != AnchorStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate only available for confirmed anchors"
        )

    # Authorization check
    if record.contract and record.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this certificate"
        )

    # Generate certificate if not exists
    if not record.certificate:
        cert_number = await generate_certificate_number(db)
        verification_url = f"https://trendy.storydot.kr/law/verify/{record.id}"

        certificate = Certificate(
            blockchain_record_id=record.id,
            certificate_number=cert_number,
            verification_url=verification_url
        )
        db.add(certificate)
        await db.flush()
        record.certificate = certificate

    # Generate PDF
    cert_service = get_certificate_service()
    contract_title = record.contract.title if record.contract else "Untitled Contract"

    pdf_bytes = await cert_service.generate_certificate_pdf(
        certificate_number=record.certificate.certificate_number,
        contract_title=contract_title,
        document_hash=record.document_hash,
        tx_hash=record.tx_hash or "pending",
        block_number=record.block_number or 0,
        network=record.network,
        anchored_at=record.confirmed_at or datetime.utcnow(),
        verification_url=record.certificate.verification_url,
    )

    if pdf_bytes:
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=SafeCon_Certificate_{record.certificate.certificate_number}.pdf"
            }
        )

    # Fallback: Return HTML for printing
    html = cert_service.generate_certificate_html(
        certificate_number=record.certificate.certificate_number,
        contract_title=contract_title,
        document_hash=record.document_hash,
        tx_hash=record.tx_hash or "pending",
        block_number=record.block_number or 0,
        network=record.network,
        anchored_at=record.confirmed_at or datetime.utcnow(),
        verification_url=record.certificate.verification_url,
    )

    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f"inline; filename=SafeCon_Certificate_{record.certificate.certificate_number}.html"
        }
    )


@router.get("/contract/{contract_id}/anchors", response_model=List[AnchorResponse])
async def get_contract_anchors(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all blockchain anchors for a contract."""
    # Verify access
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
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
            detail="You are not authorized to view this contract's anchors"
        )

    # Get anchors
    result = await db.execute(
        select(BlockchainRecord)
        .where(BlockchainRecord.contract_id == contract_id)
        .order_by(BlockchainRecord.created_at.desc())
    )
    records = result.scalars().all()

    return [
        AnchorResponse(
            id=r.id,
            contract_id=r.contract_id,
            document_hash=r.document_hash,
            status=r.status.value,
            tx_hash=r.tx_hash,
            block_number=r.block_number,
            network=r.network,
            created_at=r.created_at,
            confirmed_at=r.confirmed_at
        )
        for r in records
    ]


@router.get("/stats")
async def get_blockchain_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's blockchain anchoring statistics."""
    # Get user's contracts
    result = await db.execute(
        select(Contract.id).where(Contract.user_id == current_user.id)
    )
    contract_ids = [r[0] for r in result.all()]

    if not contract_ids:
        return {
            "total_anchors": 0,
            "confirmed_anchors": 0,
            "pending_anchors": 0,
            "total_certificates": 0
        }

    # Count anchors
    result = await db.execute(
        select(func.count(BlockchainRecord.id))
        .where(BlockchainRecord.contract_id.in_(contract_ids))
    )
    total = result.scalar() or 0

    result = await db.execute(
        select(func.count(BlockchainRecord.id))
        .where(
            BlockchainRecord.contract_id.in_(contract_ids),
            BlockchainRecord.status == AnchorStatus.CONFIRMED
        )
    )
    confirmed = result.scalar() or 0

    result = await db.execute(
        select(func.count(BlockchainRecord.id))
        .where(
            BlockchainRecord.contract_id.in_(contract_ids),
            BlockchainRecord.status == AnchorStatus.PENDING
        )
    )
    pending = result.scalar() or 0

    # Count certificates
    result = await db.execute(
        select(func.count(Certificate.id))
        .join(BlockchainRecord)
        .where(BlockchainRecord.contract_id.in_(contract_ids))
    )
    certificates = result.scalar() or 0

    return {
        "total_anchors": total,
        "confirmed_anchors": confirmed,
        "pending_anchors": pending,
        "total_certificates": certificates
    }
