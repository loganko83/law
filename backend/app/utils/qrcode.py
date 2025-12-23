"""QR code generation utility for certificates."""
import io
import base64
from typing import Optional

try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False


def generate_qr_code(
    data: str,
    size: int = 200,
    border: int = 2,
    error_correction: str = "H"
) -> Optional[str]:
    """
    Generate a QR code as a base64-encoded PNG.

    Args:
        data: The data to encode in the QR code
        size: Size of the QR code in pixels
        border: Border size in modules
        error_correction: Error correction level (L, M, Q, H)

    Returns:
        Base64-encoded PNG image string, or None if qrcode not installed
    """
    if not HAS_QRCODE:
        return None

    # Map error correction levels
    ec_levels = {
        "L": qrcode.constants.ERROR_CORRECT_L,
        "M": qrcode.constants.ERROR_CORRECT_M,
        "Q": qrcode.constants.ERROR_CORRECT_Q,
        "H": qrcode.constants.ERROR_CORRECT_H,
    }

    qr = qrcode.QRCode(
        version=1,
        error_correction=ec_levels.get(error_correction, qrcode.constants.ERROR_CORRECT_H),
        box_size=10,
        border=border,
    )

    qr.add_data(data)
    qr.make(fit=True)

    # Create image with rounded modules for modern look
    try:
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer()
        )
    except Exception:
        # Fallback to basic image if styled fails
        img = qr.make_image(fill_color="black", back_color="white")

    # Resize to requested size
    img = img.resize((size, size))

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def generate_qr_code_svg(data: str, size: int = 200) -> Optional[str]:
    """
    Generate a QR code as an SVG string.

    Args:
        data: The data to encode
        size: Size of the SVG

    Returns:
        SVG string or None if qrcode not installed
    """
    if not HAS_QRCODE:
        return None

    try:
        import qrcode.image.svg

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)

        factory = qrcode.image.svg.SvgPathImage
        img = qr.make_image(image_factory=factory)

        buffer = io.BytesIO()
        img.save(buffer)
        buffer.seek(0)

        return buffer.getvalue().decode("utf-8")
    except Exception:
        return None
