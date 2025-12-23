"""OCR Service for extracting text from documents and images."""
import io
from typing import Optional, List, Dict, Any
from pathlib import Path
from abc import ABC, abstractmethod

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("ocr")


class OCRError(Exception):
    """Custom exception for OCR errors."""
    pass


class OCRResult:
    """OCR extraction result."""

    def __init__(
        self,
        text: str,
        confidence: float = 0.0,
        pages: int = 1,
        language: str = "ko",
        metadata: Dict[str, Any] = None
    ):
        self.text = text
        self.confidence = confidence
        self.pages = pages
        self.language = language
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "pages": self.pages,
            "language": self.language,
            "metadata": self.metadata
        }


class OCRProvider(ABC):
    """Abstract base class for OCR providers."""

    @abstractmethod
    async def extract_text(
        self,
        content: bytes,
        filename: str,
        language: str = "kor"
    ) -> OCRResult:
        """Extract text from document or image."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is available."""
        pass


class TesseractOCR(OCRProvider):
    """Tesseract OCR provider."""

    def __init__(self):
        self._available = None
        logger.info("TesseractOCR provider initialized")

    async def is_available(self) -> bool:
        """Check if Tesseract is installed."""
        if self._available is not None:
            return self._available

        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self._available = True
        except Exception:
            self._available = False

        return self._available

    async def extract_text(
        self,
        content: bytes,
        filename: str,
        language: str = "kor"
    ) -> OCRResult:
        """Extract text using Tesseract."""
        if not await self.is_available():
            raise OCRError("Tesseract is not available")

        try:
            import pytesseract
            from PIL import Image
            import pdf2image
        except ImportError as e:
            raise OCRError(f"Required packages not installed: {e}")

        ext = Path(filename).suffix.lower()
        all_text = []
        total_pages = 1

        try:
            if ext == ".pdf":
                # Convert PDF to images
                images = pdf2image.convert_from_bytes(content)
                total_pages = len(images)

                for i, image in enumerate(images):
                    text = pytesseract.image_to_string(image, lang=language)
                    all_text.append(text)
                    logger.debug(f"Processed PDF page {i + 1}/{total_pages}")

            elif ext in [".jpg", ".jpeg", ".png", ".tiff", ".bmp"]:
                # Process image directly
                image = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(image, lang=language)
                all_text.append(text)

            else:
                raise OCRError(f"Unsupported file type: {ext}")

        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            raise OCRError(f"Text extraction failed: {str(e)}")

        combined_text = "\n\n".join(all_text)

        return OCRResult(
            text=combined_text,
            confidence=0.85,  # Tesseract doesn't provide overall confidence
            pages=total_pages,
            language=language,
            metadata={"provider": "tesseract"}
        )


class MockOCR(OCRProvider):
    """Mock OCR provider for development/testing."""

    def __init__(self):
        logger.warning("MockOCR provider initialized - no real OCR processing")

    async def is_available(self) -> bool:
        return True

    async def extract_text(
        self,
        content: bytes,
        filename: str,
        language: str = "kor"
    ) -> OCRResult:
        """Return mock extracted text."""
        ext = Path(filename).suffix.lower()

        # Generate mock contract text
        mock_text = """
[계약서]

제1조 (목적)
본 계약은 갑과 을 사이의 용역 서비스 제공에 관한 사항을 정함을 목적으로 한다.

제2조 (계약 기간)
본 계약의 유효 기간은 계약 체결일로부터 1년으로 한다.

제3조 (계약 금액)
1. 총 계약 금액: 금 10,000,000원 (부가가치세 별도)
2. 대금 지급: 착수금 30%, 중도금 40%, 잔금 30%

제4조 (의무사항)
갑은 을에게 업무 수행에 필요한 자료를 제공하여야 한다.
을은 성실히 업무를 수행하고 결과물을 기한 내에 납품하여야 한다.

제5조 (계약 해지)
당사자 일방이 본 계약을 위반할 경우 상대방은 서면 통보로 계약을 해지할 수 있다.

본 계약의 체결을 증명하기 위하여 본 계약서 2통을 작성하고
갑과 을이 서명 날인 후 각 1통씩 보관한다.

2024년 1월 1일

갑: _________________ (인)
을: _________________ (인)
"""

        logger.info(f"[MOCK] OCR processed: {filename}")

        return OCRResult(
            text=mock_text.strip(),
            confidence=0.95,
            pages=1,
            language=language,
            metadata={"provider": "mock", "original_filename": filename}
        )


class PDFTextExtractor:
    """Extract text directly from PDF (when OCR not needed)."""

    @staticmethod
    async def extract(content: bytes) -> Optional[str]:
        """Extract text from PDF using PyPDF2 or similar."""
        try:
            import PyPDF2
        except ImportError:
            logger.warning("PyPDF2 not installed, skipping direct PDF extraction")
            return None

        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            text_parts = []

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            if text_parts:
                return "\n\n".join(text_parts)

        except Exception as e:
            logger.warning(f"Direct PDF extraction failed: {e}")

        return None


class OCRService:
    """
    Unified OCR service that handles text extraction from various document types.
    Automatically selects the best provider based on configuration.
    """

    def __init__(self):
        self._provider: Optional[OCRProvider] = None
        self._initialize_provider()

    def _initialize_provider(self):
        """Initialize OCR provider based on settings."""
        provider_name = settings.OCR_PROVIDER.lower()

        if not settings.OCR_ENABLED:
            self._provider = MockOCR()
            logger.info("OCR disabled, using MockOCR")
            return

        if provider_name == "tesseract":
            self._provider = TesseractOCR()
        else:
            # Default to mock for unknown providers
            self._provider = MockOCR()
            logger.warning(f"Unknown OCR provider '{provider_name}', using MockOCR")

    async def extract_text(
        self,
        content: bytes,
        filename: str,
        language: str = "kor",
        force_ocr: bool = False
    ) -> OCRResult:
        """
        Extract text from document or image.

        Args:
            content: File content as bytes
            filename: Original filename with extension
            language: OCR language (default: Korean)
            force_ocr: Force OCR even for text PDFs

        Returns:
            OCRResult with extracted text and metadata
        """
        ext = Path(filename).suffix.lower()

        # For PDFs, try direct text extraction first (faster, more accurate for text PDFs)
        if ext == ".pdf" and not force_ocr:
            direct_text = await PDFTextExtractor.extract(content)
            if direct_text and len(direct_text.strip()) > 100:
                logger.info(f"Direct PDF text extraction succeeded for: {filename}")
                return OCRResult(
                    text=direct_text,
                    confidence=1.0,
                    pages=1,
                    language=language,
                    metadata={"provider": "pdf_direct", "extraction_method": "text"}
                )

        # Fall back to OCR
        if not await self._provider.is_available():
            logger.warning("OCR provider not available, using mock")
            self._provider = MockOCR()

        return await self._provider.extract_text(content, filename, language)

    async def is_available(self) -> bool:
        """Check if OCR service is available."""
        return await self._provider.is_available()


# Singleton instance
ocr_service = OCRService()


async def get_ocr_service() -> OCRService:
    """Dependency for getting OCR service."""
    return ocr_service
