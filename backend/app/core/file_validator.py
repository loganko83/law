"""
File Validation Utilities

Validates uploaded files by checking magic bytes (file signatures)
to ensure the file content matches the declared file type.
"""
from typing import Optional, Tuple

# Magic byte signatures for common file types
MAGIC_SIGNATURES = {
    # PDF
    "pdf": [b"%PDF"],
    # Images
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "gif": [b"GIF87a", b"GIF89a"],
    "webp": [b"RIFF"],  # RIFF....WEBP
    "bmp": [b"BM"],
    "tiff": [b"II\x2a\x00", b"MM\x00\x2a"],
    # Documents
    "docx": [b"PK\x03\x04"],  # ZIP-based (Office Open XML)
    "doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],  # OLE compound
    "xlsx": [b"PK\x03\x04"],
    "pptx": [b"PK\x03\x04"],
    # Archives
    "zip": [b"PK\x03\x04", b"PK\x05\x06"],
}

# File types that don't have magic bytes (text-based)
TEXT_BASED_EXTENSIONS = {"txt", "csv", "json", "xml", "html", "md", "yml", "yaml"}


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_magic_bytes(content: bytes, expected_extension: str) -> Tuple[bool, Optional[str]]:
    """
    Validate file content against expected magic bytes.

    Args:
        content: File content bytes
        expected_extension: Expected file extension (e.g., 'pdf', 'png')

    Returns:
        Tuple of (is_valid, error_message)
    """
    ext = expected_extension.lower()

    # Text-based files don't have magic bytes
    if ext in TEXT_BASED_EXTENSIONS:
        # Try to decode as text
        try:
            content[:1000].decode("utf-8")
            return True, None
        except UnicodeDecodeError:
            try:
                content[:1000].decode("cp949")  # Korean encoding
                return True, None
            except UnicodeDecodeError:
                return False, f"File content is not valid text for .{ext} extension"

    # Check magic bytes for known file types
    if ext in MAGIC_SIGNATURES:
        signatures = MAGIC_SIGNATURES[ext]
        for sig in signatures:
            if content.startswith(sig):
                # Additional check for WEBP
                if ext == "webp" and len(content) > 12:
                    if content[8:12] != b"WEBP":
                        continue
                return True, None
        return False, f"File content does not match .{ext} signature"

    # Unknown extension - allow by default but log warning
    return True, None


def validate_file_size(content: bytes, max_size_bytes: int) -> Tuple[bool, Optional[str]]:
    """
    Validate file size.

    Args:
        content: File content bytes
        max_size_bytes: Maximum allowed file size

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(content) > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        actual_mb = len(content) / (1024 * 1024)
        return False, f"File too large ({actual_mb:.1f}MB). Maximum size is {max_mb:.1f}MB."
    return True, None


def validate_uploaded_file(
    content: bytes,
    filename: str,
    allowed_extensions: list,
    max_size_bytes: int = 50 * 1024 * 1024
) -> Tuple[bool, Optional[str]]:
    """
    Comprehensive file validation.

    Args:
        content: File content bytes
        filename: Original filename
        allowed_extensions: List of allowed file extensions
        max_size_bytes: Maximum file size in bytes

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file size first
    is_valid, error = validate_file_size(content, max_size_bytes)
    if not is_valid:
        return False, error

    # Get and validate extension
    ext = get_file_extension(filename)
    if not ext:
        return False, "File must have an extension"

    if ext not in allowed_extensions:
        return False, f"File type .{ext} is not allowed. Allowed types: {', '.join(allowed_extensions)}"

    # Validate magic bytes
    is_valid, error = validate_magic_bytes(content, ext)
    if not is_valid:
        return False, error

    return True, None
