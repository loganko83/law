"""Documents API - File upload, download, and OCR processing."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.exceptions import SafeConException, ErrorCode
from app.core.logging import get_logger
from app.services.storage import get_storage_service, StorageService, StorageError
from app.services.ocr import get_ocr_service, OCRService, OCRError

logger = get_logger("documents")

router = APIRouter(prefix="/documents", tags=["Documents"])


# ==================== Response Models ====================

class DocumentUploadResponse(BaseModel):
    """Response for document upload."""
    id: str
    path: str
    original_filename: str
    size: int
    hash: str
    content_type: str
    url: str
    uploaded_at: str


class OCRResponse(BaseModel):
    """Response for OCR extraction."""
    text: str
    confidence: float
    pages: int
    language: str
    document_id: Optional[str] = None


class DocumentInfo(BaseModel):
    """Document information."""
    id: str
    path: str
    original_filename: str
    size: int
    hash: str
    content_type: str
    url: str
    uploaded_at: str
    text_extracted: bool = False
    extracted_text: Optional[str] = None


# ==================== Endpoints ====================

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    storage: StorageService = Depends(get_storage_service)
):
    """
    Upload a document file.

    Supported formats: PDF, DOCX, DOC, JPG, JPEG, PNG

    Returns document metadata including hash for integrity verification.
    """
    if not file.filename:
        raise SafeConException(
            message="Filename is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        content = await file.read()

        result = await storage.upload_file(
            content=content,
            filename=file.filename,
            content_type=file.content_type
        )

        logger.info(
            "document_uploaded",
            filename=file.filename,
            size=result["size"],
            hash=result["hash"]
        )

        return DocumentUploadResponse(**result)

    except StorageError as e:
        logger.warning(f"Upload failed: {e}")
        raise SafeConException(
            message=str(e),
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise SafeConException(
            message="Failed to upload document",
            error_code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/upload-and-extract", response_model=DocumentInfo)
async def upload_and_extract_text(
    file: UploadFile = File(...),
    language: str = "kor",
    storage: StorageService = Depends(get_storage_service),
    ocr: OCRService = Depends(get_ocr_service)
):
    """
    Upload a document and extract text using OCR.

    This is a convenience endpoint that combines upload and OCR extraction.
    Use this when you need both the file stored and text extracted.
    """
    if not file.filename:
        raise SafeConException(
            message="Filename is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        content = await file.read()

        # Upload file
        upload_result = await storage.upload_file(
            content=content,
            filename=file.filename,
            content_type=file.content_type
        )

        # Extract text
        ocr_result = await ocr.extract_text(
            content=content,
            filename=file.filename,
            language=language
        )

        logger.info(
            "document_uploaded_and_extracted",
            filename=file.filename,
            size=upload_result["size"],
            text_length=len(ocr_result.text)
        )

        return DocumentInfo(
            id=upload_result["id"],
            path=upload_result["path"],
            original_filename=upload_result["original_filename"],
            size=upload_result["size"],
            hash=upload_result["hash"],
            content_type=upload_result["content_type"],
            url=upload_result["url"],
            uploaded_at=upload_result["uploaded_at"],
            text_extracted=True,
            extracted_text=ocr_result.text
        )

    except (StorageError, OCRError) as e:
        logger.warning(f"Upload/extract failed: {e}")
        raise SafeConException(
            message=str(e),
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Upload/extract error: {e}")
        raise SafeConException(
            message="Failed to process document",
            error_code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/extract-text", response_model=OCRResponse)
async def extract_text_from_upload(
    file: UploadFile = File(...),
    language: str = "kor",
    force_ocr: bool = False,
    ocr: OCRService = Depends(get_ocr_service)
):
    """
    Extract text from an uploaded document without storing it.

    Use this when you only need the text content and don't need to store the file.

    Args:
        file: The document file
        language: OCR language code (default: kor for Korean)
        force_ocr: Force OCR even for text-based PDFs
    """
    if not file.filename:
        raise SafeConException(
            message="Filename is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        content = await file.read()

        result = await ocr.extract_text(
            content=content,
            filename=file.filename,
            language=language,
            force_ocr=force_ocr
        )

        logger.info(
            "text_extracted",
            filename=file.filename,
            text_length=len(result.text),
            confidence=result.confidence
        )

        return OCRResponse(
            text=result.text,
            confidence=result.confidence,
            pages=result.pages,
            language=result.language
        )

    except OCRError as e:
        logger.warning(f"OCR failed: {e}")
        raise SafeConException(
            message=str(e),
            error_code=ErrorCode.OCR_FAILED,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise SafeConException(
            message="Failed to extract text",
            error_code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/{document_path:path}")
async def download_document(
    document_path: str,
    storage: StorageService = Depends(get_storage_service)
):
    """
    Download a document by its storage path.

    The path is returned in the upload response.
    """
    try:
        content = await storage.download_file(document_path)

        # Determine content type from extension
        from pathlib import Path
        ext = Path(document_path).suffix.lower()
        content_types = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png"
        }
        content_type = content_types.get(ext, "application/octet-stream")

        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={Path(document_path).name}"
            }
        )

    except StorageError:
        raise SafeConException(
            message="Document not found",
            error_code=ErrorCode.DOCUMENT_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND
        )


@router.delete("/{document_path:path}")
async def delete_document(
    document_path: str,
    storage: StorageService = Depends(get_storage_service)
):
    """Delete a document by its storage path."""
    deleted = await storage.delete_file(document_path)

    if not deleted:
        raise SafeConException(
            message="Document not found or already deleted",
            error_code=ErrorCode.DOCUMENT_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND
        )

    logger.info("document_deleted", path=document_path)

    return {"message": "Document deleted successfully"}
