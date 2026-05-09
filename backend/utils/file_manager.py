# =============================================================================
# utils/file_manager.py
# Manages output folder creation and file path generation.
# =============================================================================

import os
import uuid
from utils.constants import OUTPUT_IMAGES, OUTPUT_JSON, OUTPUT_EXCEL, LOG_DIR
from utils.logger import logger


def ensure_output_dirs(base_dir: str = ".") -> dict:
    """
    Create all required output subdirectories relative to the given base directory.

    Args:
        base_dir: Root directory where 'output/' will be created.

    Returns:
        Dictionary mapping directory keys to their absolute paths.
    """
    dirs = {
        "images": os.path.join(base_dir, OUTPUT_IMAGES),
        "json":   os.path.join(base_dir, OUTPUT_JSON),
        "excel":  os.path.join(base_dir, OUTPUT_EXCEL),
        "logs":   os.path.join(base_dir, LOG_DIR),
    }
    for key, path in dirs.items():
        os.makedirs(path, exist_ok=True)
        logger.debug(f"Directory ensured: {path}")
    return dirs


def generate_unique_id() -> str:
    """Generate a short, unique identifier string (8 hex chars)."""
    return uuid.uuid4().hex[:8].upper()


def get_image_save_path(dirs: dict, unique_id: str) -> str:
    """
    Build the full file path for a cropped section image.

    Args:
        dirs: Directory mapping from ensure_output_dirs().
        unique_id: The unique identifier for this section.

    Returns:
        Full absolute path string, e.g. '.../output/images/A1B2C3D4.png'
    """
    return os.path.join(dirs["images"], f"{unique_id}.png")


def get_json_save_path(dirs: dict, unique_id: str) -> str:
    """
    Build the full file path for an individual JSON record.

    Args:
        dirs: Directory mapping from ensure_output_dirs().
        unique_id: The unique identifier for this section.

    Returns:
        Full absolute path string, e.g. '.../output/json/A1B2C3D4.json'
    """
    return os.path.join(dirs["json"], f"{unique_id}.json")


def list_pdfs(folder: str) -> list:
    """
    Recursively scan a folder and return paths to all PDF files.

    Args:
        folder: Root folder to scan.

    Returns:
        Sorted list of absolute PDF file paths.
    """
    from utils.constants import SUPPORTED_EXTENSIONS
    pdf_files = []
    for root, _, files in os.walk(folder):
        for f in files:
            if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS:
                pdf_files.append(os.path.join(root, f))
    pdf_files.sort()
    logger.info(f"Found {len(pdf_files)} PDF file(s) in '{folder}'")
    return pdf_files
