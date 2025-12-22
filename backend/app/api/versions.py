"""Contract document version control API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import hashlib
import os

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract, ContractDocument
from app.api.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/versions", tags=["Document Versions"])


# ==================== Schemas ====================

class DocumentVersionResponse(BaseModel):
    id: UUID
    contract_id: UUID
    file_name: str
    file_type: str
    file_size: int
    content_hash: str
    version: int
    is_latest: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VersionHistoryResponse(BaseModel):
    contract_id: UUID
    document_name: str
    current_version: int
    versions: List[DocumentVersionResponse]


class VersionCompareResponse(BaseModel):
    version_a: DocumentVersionResponse
    version_b: DocumentVersionResponse
    hash_match: bool
    size_difference: int


class RevertVersionRequest(BaseModel):
    version: int


# ==================== Helper Functions ====================

def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()


async def save_file(content: bytes, filename: str, contract_id: str) -> str:
    """Save file to storage and return URL."""
    # Create directory structure
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(contract_id))
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(upload_dir, safe_filename)

    # Write file
    with open(file_path, "wb") as f:
        f.write(content)

    # Return relative URL
    return f"/uploads/{contract_id}/{safe_filename}"


# ==================== Endpoints ====================

@router.post("/upload/{contract_id}", response_model=DocumentVersionResponse)
async def upload_new_version(
    contract_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a new version of a contract document.

    Automatically increments version number and updates is_latest flags.
    """
    # Verify contract access
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
            detail="You are not authorized to upload documents to this contract"
        )

    # Validate file type
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum: {settings.MAX_FILE_SIZE // 1024 // 1024}MB"
        )

    # Calculate hash
    content_hash = calculate_file_hash(content)

    # Get current latest version
    result = await db.execute(
        select(ContractDocument)
        .where(
            ContractDocument.contract_id == contract_id,
            ContractDocument.is_latest == True
        )
    )
    latest_doc = result.scalar_one_or_none()

    # Check if same content already exists
    if latest_doc and latest_doc.content_hash == content_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document with identical content already exists"
        )

    # Determine version number
    new_version = (latest_doc.version + 1) if latest_doc else 1

    # Save file
    file_url = await save_file(content, file.filename, str(contract_id))

    # Mark previous versions as not latest
    if latest_doc:
        result = await db.execute(
            select(ContractDocument)
            .where(
                ContractDocument.contract_id == contract_id,
                ContractDocument.is_latest == True
            )
        )
        for doc in result.scalars():
            doc.is_latest = False

    # Create new document version
    new_doc = ContractDocument(
        contract_id=contract_id,
        file_name=file.filename,
        file_url=file_url,
        file_type=file_ext,
        file_size=len(content),
        content_hash=content_hash,
        version=new_version,
        is_latest=True
    )

    db.add(new_doc)
    await db.flush()

    return DocumentVersionResponse(
        id=new_doc.id,
        contract_id=new_doc.contract_id,
        file_name=new_doc.file_name,
        file_type=new_doc.file_type,
        file_size=new_doc.file_size,
        content_hash=new_doc.content_hash,
        version=new_doc.version,
        is_latest=new_doc.is_latest,
        created_at=new_doc.created_at
    )


@router.get("/history/{contract_id}", response_model=VersionHistoryResponse)
async def get_version_history(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all versions of a contract document."""
    # Verify contract access
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
            detail="You are not authorized to view this contract"
        )

    # Get all versions
    result = await db.execute(
        select(ContractDocument)
        .where(ContractDocument.contract_id == contract_id)
        .order_by(ContractDocument.version.desc())
    )
    documents = result.scalars().all()

    if not documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No documents found for this contract"
        )

    latest = next((d for d in documents if d.is_latest), documents[0])

    return VersionHistoryResponse(
        contract_id=contract_id,
        document_name=latest.file_name,
        current_version=latest.version,
        versions=[
            DocumentVersionResponse(
                id=doc.id,
                contract_id=doc.contract_id,
                file_name=doc.file_name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                content_hash=doc.content_hash,
                version=doc.version,
                is_latest=doc.is_latest,
                created_at=doc.created_at
            )
            for doc in documents
        ]
    )


@router.get("/{document_id}", response_model=DocumentVersionResponse)
async def get_document_version(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific document version."""
    result = await db.execute(
        select(ContractDocument)
        .options(selectinload(ContractDocument.contract))
        .where(ContractDocument.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this document"
        )

    return DocumentVersionResponse(
        id=document.id,
        contract_id=document.contract_id,
        file_name=document.file_name,
        file_type=document.file_type,
        file_size=document.file_size,
        content_hash=document.content_hash,
        version=document.version,
        is_latest=document.is_latest,
        created_at=document.created_at
    )


@router.post("/compare", response_model=VersionCompareResponse)
async def compare_versions(
    version_a_id: UUID,
    version_b_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Compare two document versions."""
    # Get both versions
    result = await db.execute(
        select(ContractDocument)
        .options(selectinload(ContractDocument.contract))
        .where(ContractDocument.id.in_([version_a_id, version_b_id]))
    )
    documents = {d.id: d for d in result.scalars()}

    if version_a_id not in documents or version_b_id not in documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both documents not found"
        )

    doc_a = documents[version_a_id]
    doc_b = documents[version_b_id]

    # Verify same contract
    if doc_a.contract_id != doc_b.contract_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Documents must belong to the same contract"
        )

    # Authorization check
    if doc_a.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to compare these documents"
        )

    return VersionCompareResponse(
        version_a=DocumentVersionResponse(
            id=doc_a.id,
            contract_id=doc_a.contract_id,
            file_name=doc_a.file_name,
            file_type=doc_a.file_type,
            file_size=doc_a.file_size,
            content_hash=doc_a.content_hash,
            version=doc_a.version,
            is_latest=doc_a.is_latest,
            created_at=doc_a.created_at
        ),
        version_b=DocumentVersionResponse(
            id=doc_b.id,
            contract_id=doc_b.contract_id,
            file_name=doc_b.file_name,
            file_type=doc_b.file_type,
            file_size=doc_b.file_size,
            content_hash=doc_b.content_hash,
            version=doc_b.version,
            is_latest=doc_b.is_latest,
            created_at=doc_b.created_at
        ),
        hash_match=doc_a.content_hash == doc_b.content_hash,
        size_difference=doc_b.file_size - doc_a.file_size
    )


@router.post("/revert/{contract_id}", response_model=DocumentVersionResponse)
async def revert_to_version(
    contract_id: UUID,
    request: RevertVersionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revert to a previous document version.

    This creates a new version with the same content as the specified version.
    """
    # Verify contract access
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
            detail="You are not authorized to modify this contract"
        )

    # Get the version to revert to
    result = await db.execute(
        select(ContractDocument)
        .where(
            ContractDocument.contract_id == contract_id,
            ContractDocument.version == request.version
        )
    )
    target_doc = result.scalar_one_or_none()

    if not target_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {request.version} not found"
        )

    # Get current latest version number
    result = await db.execute(
        select(ContractDocument)
        .where(
            ContractDocument.contract_id == contract_id,
            ContractDocument.is_latest == True
        )
    )
    latest_doc = result.scalar_one_or_none()

    if latest_doc and latest_doc.version == request.version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already at this version"
        )

    new_version = (latest_doc.version + 1) if latest_doc else 1

    # Mark current as not latest
    if latest_doc:
        latest_doc.is_latest = False

    # Create new document entry pointing to same content
    reverted_doc = ContractDocument(
        contract_id=contract_id,
        file_name=f"reverted_v{request.version}_{target_doc.file_name}",
        file_url=target_doc.file_url,
        file_type=target_doc.file_type,
        file_size=target_doc.file_size,
        content_hash=target_doc.content_hash,
        version=new_version,
        is_latest=True,
        ocr_text=target_doc.ocr_text,
        ocr_status=target_doc.ocr_status
    )

    db.add(reverted_doc)
    await db.flush()

    return DocumentVersionResponse(
        id=reverted_doc.id,
        contract_id=reverted_doc.contract_id,
        file_name=reverted_doc.file_name,
        file_type=reverted_doc.file_type,
        file_size=reverted_doc.file_size,
        content_hash=reverted_doc.content_hash,
        version=reverted_doc.version,
        is_latest=reverted_doc.is_latest,
        created_at=reverted_doc.created_at
    )
