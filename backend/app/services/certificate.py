"""Certificate generation service for blockchain-verified documents."""
import os
import io
from datetime import datetime
from typing import Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

from app.utils.qrcode import generate_qr_code
from app.core.config import settings


# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


class CertificateService:
    """Service for generating verification certificates."""

    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=True
        )

    def generate_certificate_html(
        self,
        certificate_number: str,
        contract_title: str,
        document_hash: str,
        tx_hash: str,
        block_number: int,
        network: str,
        anchored_at: datetime,
        verification_url: str,
    ) -> str:
        """
        Generate certificate HTML from template.

        Args:
            certificate_number: Unique certificate ID (e.g., SC-2024-000001)
            contract_title: Title of the contract
            document_hash: SHA-256 hash of the document
            tx_hash: Blockchain transaction hash
            block_number: Block number where anchored
            network: Blockchain network name
            anchored_at: When document was anchored
            verification_url: URL for online verification

        Returns:
            Rendered HTML string
        """
        # Generate QR code for verification URL
        qr_code_base64 = generate_qr_code(verification_url, size=200)

        # Load and render template
        template = self.env.get_template("certificate.html")

        html = template.render(
            certificate_number=certificate_number,
            contract_title=contract_title,
            document_hash=document_hash,
            tx_hash=tx_hash,
            block_number=block_number,
            network=network.upper(),
            anchored_at=anchored_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            issued_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            verification_url=verification_url,
            qr_code_base64=qr_code_base64,
        )

        return html

    async def generate_certificate_pdf(
        self,
        certificate_number: str,
        contract_title: str,
        document_hash: str,
        tx_hash: str,
        block_number: int,
        network: str,
        anchored_at: datetime,
        verification_url: str,
    ) -> Optional[bytes]:
        """
        Generate certificate PDF.

        Uses weasyprint or playwright for HTML to PDF conversion.

        Returns:
            PDF bytes or None if conversion fails
        """
        html = self.generate_certificate_html(
            certificate_number=certificate_number,
            contract_title=contract_title,
            document_hash=document_hash,
            tx_hash=tx_hash,
            block_number=block_number,
            network=network,
            anchored_at=anchored_at,
            verification_url=verification_url,
        )

        # Try weasyprint first (lighter dependency)
        try:
            from weasyprint import HTML

            pdf_buffer = io.BytesIO()
            HTML(string=html).write_pdf(pdf_buffer)
            pdf_buffer.seek(0)
            return pdf_buffer.getvalue()
        except ImportError:
            pass

        # Fallback to playwright if available
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch()
                page = await browser.new_page()
                await page.set_content(html)
                pdf_bytes = await page.pdf(
                    format="A4",
                    print_background=True,
                    margin={
                        "top": "20mm",
                        "bottom": "20mm",
                        "left": "15mm",
                        "right": "15mm"
                    }
                )
                await browser.close()
                return pdf_bytes
        except ImportError:
            pass

        # If no PDF library available, return None
        return None


# Singleton instance
certificate_service = CertificateService()


def get_certificate_service() -> CertificateService:
    """Get certificate service instance."""
    return certificate_service
