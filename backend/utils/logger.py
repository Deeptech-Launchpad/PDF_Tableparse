# =============================================================================
# utils/logger.py
# Centralized logging configuration for the PDF Section Processor.
# =============================================================================

import logging
import os
from datetime import datetime
from utils.constants import LOG_DIR


def setup_logger(name: str = "PDFProcessor") -> logging.Logger:
    """
    Create and configure a logger that writes to both console and a rotating
    log file stored in the output/logs directory.

    Args:
        name: Name for the logger instance.

    Returns:
        Configured logging.Logger instance.
    """
    os.makedirs(LOG_DIR, exist_ok=True)

    log_filename = datetime.now().strftime("%Y%m%d_%H%M%S") + "_processor.log"
    log_filepath = os.path.join(LOG_DIR, log_filename)

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Avoid adding duplicate handlers if logger is requested multiple times
    if logger.handlers:
        return logger

    # --- File Handler (DEBUG level) ---
    file_handler = logging.FileHandler(log_filepath, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(file_formatter)

    # --- Console/Stream Handler (INFO level) ---
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    stream_formatter = logging.Formatter(
        fmt="%(levelname)-8s | %(message)s"
    )
    stream_handler.setFormatter(stream_formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    logger.info(f"Logger initialized. Log file: {log_filepath}")
    return logger


# Module-level default logger instance
logger = setup_logger()
