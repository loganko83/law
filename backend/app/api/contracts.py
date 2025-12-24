from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID, uuid4
import hashlib
import os
import aiofiles

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract, ContractDocument, ContractParty
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    ContractDetailResponse,
    ContractListResponse,
    DocumentResponse
)
from app.api.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new contract."""
    # Generate share URL
    share_token = str(uuid4())[:8]
    share_url = f"/contracts/share/{share_token}"

    # Create contract
    contract = Contract(
        user_id=current_user.id,
        title=contract_data.title,
        contract_type=contract_data.contract_type,
        description=contract_data.description,
        expires_at=contract_data.expires_at,
        share_url=share_url
    )
    db.add(contract)
    await db.flush()

    # Add parties if provided
    if contract_data.parties:
        for party_data in contract_data.parties:
            party = ContractParty(
                contract_id=contract.id,
                role=party_data.role,
                name=party_data.name,
                email=party_data.email,
                phone=party_data.phone
            )
            db.add(party)

    await db.flush()
    await db.refresh(contract)

    return contract


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    contract_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's contracts with pagination."""
    query = select(Contract).where(Contract.user_id == current_user.id)

    if status:
        query = query.where(Contract.status == status)
    if contract_type:
        query = query.where(Contract.contract_type == contract_type)

    query = query.order_by(Contract.created_at.desc())

    # Count total using func.count() for efficiency
    count_query = select(func.count(Contract.id)).where(Contract.user_id == current_user.id)
    if status:
        count_query = count_query.where(Contract.status == status)
    if contract_type:
        count_query = count_query.where(Contract.contract_type == contract_type)

    result = await db.execute(count_query)
    total = result.scalar() or 0

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    contracts = result.scalars().all()

    return ContractListResponse(
        contracts=[ContractResponse.model_validate(c) for c in contracts],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{contract_id}", response_model=ContractDetailResponse)
async def get_contract(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get contract details with documents and parties."""
    result = await db.execute(
        select(Contract)
        .options(
            selectinload(Contract.documents),
            selectinload(Contract.parties)
        )
        .where(Contract.id == contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    return contract


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: UUID,
    update_data: ContractUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update contract."""
    result = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(contract, key, value)

    await db.flush()
    await db.refresh(contract)

    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete contract."""
    result = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    await db.delete(contract)
    await db.flush()


@router.post("/{contract_id}/documents", response_model=DocumentResponse)
async def upload_document(
    contract_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload document to contract."""
    # Verify contract ownership
    result = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Validate file
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Calculate hash
    content_hash = hashlib.sha256(content).hexdigest()

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(contract_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, f"{uuid4()}.{file_ext}")
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Get current version
    result = await db.execute(
        select(ContractDocument)
        .where(ContractDocument.contract_id == contract_id)
        .order_by(ContractDocument.version.desc())
    )
    existing_docs = result.scalars().all()
    version = existing_docs[0].version + 1 if existing_docs else 1

    # Mark old documents as not latest
    for doc in existing_docs:
        doc.is_latest = False

    # Extract text for text files immediately
    ocr_text = None
    ocr_status = "pending"
    if file_ext == "txt":
        try:
            ocr_text = content.decode("utf-8")
            ocr_status = "completed"
        except UnicodeDecodeError:
            try:
                ocr_text = content.decode("cp949")
                ocr_status = "completed"
            except UnicodeDecodeError:
                ocr_status = "failed"

    # Create document record
    document = ContractDocument(
        contract_id=contract_id,
        file_name=file.filename or "unknown",
        file_url=file_path,
        file_type=file_ext,
        file_size=file_size,
        content_hash=content_hash,
        version=version,
        is_latest=True,
        ocr_text=ocr_text,
        ocr_status=ocr_status
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    return document
