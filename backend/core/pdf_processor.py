# =============================================================================
# core/pdf_processor.py
# Converts PDF pages to PIL Image objects using pdf2image (Poppler backend).
# =============================================================================

from typing import List, Tuple
from PIL import Image

from utils.constants import PDF_DPI, PDF_FORMAT
from utils.logger import logger
import platform
import os


def pdf_to_images(pdf_path: str, dpi: int = PDF_DPI) -> List[Tuple[int, Image.Image]]:
    """
    Convert every page of a PDF file into a high-resolution PIL Image.

    Args:
        pdf_path: Absolute path to the .pdf file.
        dpi: Rendering resolution in dots-per-inch. Default from constants.

    Returns:
        List of (page_number, PIL.Image) tuples, 1-indexed page numbers.

    Raises:
        FileNotFoundError: If pdf_path does not exist.
        Exception: Propagates pdf2image errors (e.g., Poppler not found).
    """
    import os
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # Lazy import so the app doesn't crash at startup if pdf2image isn't installed
    try:
        from pdf2image import convert_from_path
    except ImportError as exc:
        raise ImportError(
            "pdf2image is not installed. Run: pip install pdf2image"
        ) from exc

    logger.info(f"Converting PDF → images: {os.path.basename(pdf_path)} @ {dpi} DPI")

    # ── Windows: set explicit Poppler path ────────────────────────────────────
    poppler_path = None
    if platform.system() == "Windows":
        # Check standard WinGet path from previous install
        _p = r"C:\Users\sasikumar\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin"
        if os.path.isdir(_p):
            poppler_path = _p

    pages = convert_from_path(
        pdf_path,
        dpi=dpi,
        fmt=PDF_FORMAT.lower(),
        thread_count=2,
        use_pdftocairo=True,
        poppler_path=poppler_path
    )

    result = []
    for page_num, img in enumerate(pages, start=1):
        result.append((page_num, img))
        logger.debug(f"  Page {page_num}/{len(pages)} converted — size {img.size}")

    logger.info(f"Converted {len(result)} page(s) from {os.path.basename(pdf_path)}")
    return result
