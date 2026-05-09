# =============================================================================
# core/image_processor.py
# Detects and crops individual sections/cards/records from a page image
# using an OpenCV contour-detection pipeline.
# =============================================================================

from typing import List, Tuple
import cv2
import numpy as np
from PIL import Image

from utils.constants import (
    MIN_SECTION_AREA,
    MAX_SECTION_AREA_RATIO,
    MIN_ASPECT_RATIO,
    MAX_ASPECT_RATIO,
    CROP_PADDING,
)
from utils.logger import logger


# ---------------------------------------------------------------------------
# Type alias: A "BoundingBox" is (x, y, width, height) in pixel coordinates.
# ---------------------------------------------------------------------------
BoundingBox = Tuple[int, int, int, int]


def pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Convert a PIL Image (RGB) to an OpenCV array (BGR)."""
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv2_img: np.ndarray) -> Image.Image:
    """Convert an OpenCV array (BGR) to a PIL Image (RGB)."""
    return Image.fromarray(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB))


def detect_sections(
    pil_img: Image.Image,
    min_area: int = MIN_SECTION_AREA,
    max_area_ratio: float = MAX_SECTION_AREA_RATIO,
    min_aspect: float = MIN_ASPECT_RATIO,
    max_aspect: float = MAX_ASPECT_RATIO,
) -> List[BoundingBox]:
    """
    Detect rectangular section boundaries in a page image.

    Pipeline:
        1. Grayscale conversion.
        2. Gaussian blur to reduce noise.
        3. Adaptive thresholding to create a binary image.
        4. Morphological closing to connect nearby edges.
        5. Contour detection.
        6. Filtering by area, aspect ratio, and overlap.
        7. Sorting top-to-bottom, left-to-right.

    Args:
        pil_img: The full page as a PIL Image.
        min_area: Minimum pixel area for a contour to be a valid section.
        max_area_ratio: Max fraction of page area a section may occupy.
        min_aspect: Minimum width/height ratio allowed.
        max_aspect: Maximum width/height ratio allowed.

    Returns:
        List of (x, y, w, h) bounding boxes, sorted reading-order.
    """
    cv_img = pil_to_cv2(pil_img)
    page_h, page_w = cv_img.shape[:2]
    page_area = page_h * page_w
    max_area = page_area * max_area_ratio

    # --- Step 1-2: Grayscale + Blur ---
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # --- Step 3: Adaptive threshold ---
    binary = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15,
        C=4,
    )

    # --- Step 4: Morphological closing to merge nearby edges ---
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 10))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    # --- Step 5: Find external contours ---
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes: List[BoundingBox] = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        aspect = w / h if h > 0 else 0

        # --- Step 6: Filter by area and aspect ratio ---
        if area < min_area:
            continue
        if area > max_area:
            continue
        if aspect < min_aspect or aspect > max_aspect:
            continue

        boxes.append((x, y, w, h))

    # --- Remove heavily overlapping duplicates ---
    boxes = _suppress_overlapping(boxes, iou_threshold=0.3)

    # --- Step 7: Sort top-to-bottom, left-to-right (reading order) ---
    boxes.sort(key=lambda b: (b[1], b[0]))

    logger.debug(f"Detected {len(boxes)} section(s) on page.")
    return boxes


def crop_section(
    pil_img: Image.Image,
    bbox: BoundingBox,
    padding: int = CROP_PADDING,
) -> Image.Image:
    """
    Crop a rectangular section from a page image with optional padding.

    Args:
        pil_img: Full page PIL Image.
        bbox: (x, y, w, h) bounding box to crop.
        padding: Extra pixels to add on all sides.

    Returns:
        Cropped PIL Image of the section.
    """
    x, y, w, h = bbox
    img_w, img_h = pil_img.size

    left   = max(0, x - padding)
    top    = max(0, y - padding)
    right  = min(img_w, x + w + padding)
    bottom = min(img_h, y + h + padding)

    return pil_img.crop((left, top, right, bottom))


def draw_detections(pil_img: Image.Image, boxes: List[BoundingBox]) -> Image.Image:
    """
    Draw colored bounding boxes on the page image for preview purposes.

    Args:
        pil_img: Original full page PIL Image.
        boxes: List of (x, y, w, h) detected sections.

    Returns:
        Annotated PIL Image with bounding rectangles drawn.
    """
    cv_img = pil_to_cv2(pil_img).copy()
    for i, (x, y, w, h) in enumerate(boxes):
        color = (0, 200, 255)   # Vivid cyan/yellow in BGR
        cv2.rectangle(cv_img, (x, y), (x + w, y + h), color, thickness=3)
        label = f"#{i + 1}"
        cv2.putText(
            cv_img, label,
            (x + 4, y + 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9, color, 2, cv2.LINE_AA,
        )
    return cv2_to_pil(cv_img)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _iou(a: BoundingBox, b: BoundingBox) -> float:
    """Compute Intersection-over-Union for two bounding boxes."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    ix = max(ax, bx)
    iy = max(ay, by)
    ix2 = min(ax + aw, bx + bw)
    iy2 = min(ay + ah, by + bh)

    inter_w = max(0, ix2 - ix)
    inter_h = max(0, iy2 - iy)
    intersection = inter_w * inter_h

    union = aw * ah + bw * bh - intersection
    return intersection / union if union > 0 else 0.0


def _suppress_overlapping(
    boxes: List[BoundingBox], iou_threshold: float = 0.3
) -> List[BoundingBox]:
    """
    Simple greedy non-maximum suppression to remove heavily overlapping boxes.
    Keeps the box with the larger area when overlap exceeds iou_threshold.
    """
    # Sort by area descending so we keep larger boxes first
    sorted_boxes = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)
    kept: List[BoundingBox] = []

    for box in sorted_boxes:
        dominated = False
        for kept_box in kept:
            if _iou(box, kept_box) > iou_threshold:
                dominated = True
                break
        if not dominated:
            kept.append(box)

    return kept
