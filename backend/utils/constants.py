# =============================================================================
# utils/constants.py
# Global constants for the PDF Section Processor application.
# =============================================================================

import os

# --- Application Metadata ---
APP_NAME = "PDF Section Processor"
APP_VERSION = "1.0.0"
APP_AUTHOR = "AltiusNxt"

# --- Output Directory Structure ---
OUTPUT_ROOT = "output"
OUTPUT_IMAGES = os.path.join(OUTPUT_ROOT, "images")
OUTPUT_JSON   = os.path.join(OUTPUT_ROOT, "json")
OUTPUT_EXCEL  = os.path.join(OUTPUT_ROOT, "excel")
LOG_DIR       = os.path.join(OUTPUT_ROOT, "logs")

# --- PDF Conversion Settings ---
PDF_DPI = 200           # DPI for pdf2image rendering (higher = better quality, slower)
PDF_FORMAT = "PNG"      # Output format for rendered PDF pages

# --- OpenCV Section Detection Thresholds ---
# Minimum contour area to be considered a "section" (in pixels^2)
MIN_SECTION_AREA = 5000
# Maximum fraction of the full page area a section can occupy
MAX_SECTION_AREA_RATIO = 0.90
# Minimum aspect ratio (width/height) for a valid section
MIN_ASPECT_RATIO = 0.1
# Maximum aspect ratio (width/height) for a valid section
MAX_ASPECT_RATIO = 15.0
# Padding to add around each cropped section (pixels)
CROP_PADDING = 8

# --- OCR Settings ---
# Tesseract page segmentation modes:
# 6 = Assume a single uniform block of text
# 11 = Sparse text — find as much text as possible
TESSERACT_PSM = 6
TESSERACT_LANG = "eng"  # Language code; use "eng+hin" for multiple languages

# --- Processing ---
MAX_WORKER_THREADS = 4   # Max concurrent PDF-processing threads
SUPPORTED_EXTENSIONS = [".pdf"]

# --- Excel ---
EXCEL_FILENAME = "results.xlsx"
EXCEL_SHEET_NAME = "Extracted Data"

# --- JSON ---
COMBINED_JSON_FILENAME = "combined_results.json"
