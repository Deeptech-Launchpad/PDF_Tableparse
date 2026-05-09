# =============================================================================
# core/ocr_engine.py
# Text extraction from cropped section images using pytesseract.
# =============================================================================

from typing import Dict, Any, List
from PIL import Image
from utils.constants import TESSERACT_PSM, TESSERACT_LANG
from utils.logger import logger
import platform
import os
import re

if platform.system() == "Windows":
    import pytesseract
    _tess_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.isfile(_tess_path):
        pytesseract.pytesseract.tesseract_cmd = _tess_path

def extract_text(pil_img: Image.Image, psm: int = 6, lang: str = TESSERACT_LANG) -> str:
    try:
        import pytesseract
    except ImportError:
        return "OCR Library missing"

    processed = _preprocess_for_ocr(pil_img)
    config = f"--psm {psm} --oem 3"
    try:
        raw_text = pytesseract.image_to_string(processed, lang=lang, config=config)
        return raw_text.strip()
    except Exception as exc:
        logger.warning(f"OCR failed: {exc}")
        return ""

def _preprocess_for_ocr(pil_img: Image.Image) -> Image.Image:
    import cv2
    import numpy as np
    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2GRAY)
    h, w = cv_img.shape
    if w < 500:
        scale = 500 / w
        cv_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    cv_img = cv2.adaptiveThreshold(cv_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return Image.fromarray(cv_img)

def parse_structured_table(text: str) -> Dict[str, Any]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    section_name = "Data Table"
    accuracy_note = "N/A"
    headers = []
    rows = []
    
    # Technical keywords to help identify structure
    header_keywords = ["characteristics", "specifications", "performance", "parameters", "features", "specs"]
    column_keywords = ["range", "resolution", "band", "tcal", "year", "measurement", "function", "temp", "type", "accuracy", "resolution", "resistance"]
    
    pending_group = None
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean: continue
        
        # 1. Detect Section Header
        if any(k.lower() in line_clean.lower() for k in header_keywords) and len(line_clean) < 100:
            # If accuracy is on the same line, split it
            if "accuracy" in line_clean.lower():
                parts_header = re.split(r'\||(?=accuracy)', line_clean, flags=re.I)
                section_name = parts_header[0].strip()
                if len(parts_header) > 1:
                    accuracy_note = parts_header[1].strip()
            else:
                section_name = line_clean
            continue
            
        # 2. Detect Accuracy Note (standalone)
        if "accuracy" in line_clean.lower() and ("±" in line_clean or ":" in line_clean or "%" in line_clean or "+" in line_clean):
            accuracy_note = line_clean
            continue

        # Split by double space, tab, or pipe
        parts = [p.strip() for p in re.split(r'\s{2,}|\t|\|', line_clean) if p.strip()]
        
        # Fuzzy Split for single-spaced rows
        if len(parts) == 1:
            # Enhanced fuzzy split: look for technical patterns and numeric blocks
            fuzzy_parts = re.findall(r'[\d\.]+\s*[\+\±]\s*[\d\.]+|[\d\.]+\s*(?:mv|ma|μa|khz|mhz|v|a|hz|ω|ohm|kω|mω|gω|µa|pf|nf|µf|khz|mhz)|[<>]?\s*[\d\.]+\s*[A-ZΩµμ\°]+|\b\d+\s*[A-Z]{1,3}\b', line_clean, re.I)
            if len(fuzzy_parts) >= 3:
                parts = fuzzy_parts
        
        # 3. Detect Headers
        if not headers and any(k.lower() in line_clean.lower() for k in column_keywords):
            if len(parts) >= 2:
                headers = parts
                continue

        # 4. Detect Data Rows
        if len(parts) >= 2:
            if pending_group:
                rows.append([pending_group] + parts)
                pending_group = None
            else:
                # Basic alignment if headers are present
                if headers and len(parts) < len(headers):
                    rows.append([""] + parts)
                else:
                    rows.append(parts)
        elif len(parts) == 1:
            pending_group = parts[0]
            
    # Final check: if we have rows but no headers, create generic headers
    if rows and not headers:
        max_cols = max(len(r) for r in rows)
        headers = [f"Column {i+1}" for i in range(max_cols)]
            
    return {
        "section": section_name,
        "accuracy_note": accuracy_note,
        "headers": headers,
        "rows": rows
    }

def extract_datasheet_fields(text: str) -> Dict[str, Any]:
    lines = text.split('\n')
    text_lower = text.lower()
    
    # Strong table indicators
    table_keywords = ["accuracy", "tcal", "range", "resolution", "characteristics", "specifications", "frequency", "coefficient", "±"]
    
    # Check if this looks like a technical table
    has_table_indicators = any(k in text_lower for k in table_keywords)
    
    # Detect multi-column rows even with single spaces
    multi_part_lines = 0
    for l in lines:
        l = l.strip()
        if not l: continue
        # Split by 2+ spaces, tab, pipe
        parts = [p.strip() for p in re.split(r'\s{2,}|\t|\|', l) if p.strip()]
        if len(parts) >= 3:
            multi_part_lines += 1
        else:
            # Fallback for single-spaced tables: look for 3+ numeric/technical tokens
            tokens = [t for t in l.split() if re.search(r'\d', t) or t.lower() in ["hz", "v", "a", "ohm", "±"]]
            if len(tokens) >= 3:
                multi_part_lines += 1

    if has_table_indicators or multi_part_lines >= 2:
        return parse_structured_table(text)

    # Fallback to standard KV extraction
    fields = {
        "rs_stock_no": "N/A", "mfr_pn": "N/A", "mfr_name": "Unknown",
        "short_desc": "N/A", "long_desc": "N/A", "status": "Active",
        "uom": "EA", "brand_name": "N/A", "category": "Industrial Component"
    }
    
    # Add empty attributes for ERP alignment
    for i in range(1, 11):
        fields[f"attr_{i}"] = ""
        fields[f"val_{i}"] = ""
    
    rs_match = re.search(r'(?:RS\s+)?Stock\s*(?:No|Number)[:\s]*([\d-]{7,15})', text, re.I)
    if rs_match: fields["rs_stock_no"] = rs_match.group(1).strip()
    
    mpn_match = re.search(r'(?:Mfr\s*PN|Part\s*No|Model)[:\s]*([A-Z0-9\-/]{4,30})', text, re.I)
    if mpn_match: fields["mfr_pn"] = mpn_match.group(1).strip()

    lines_clean = [l.strip() for l in lines if l.strip()]
    if lines_clean:
        fields["short_desc"] = lines_clean[0][:200]
        fields["long_desc"] = " ".join(lines_clean[:10])[:1000]

    return fields


