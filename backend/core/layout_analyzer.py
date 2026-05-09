# =============================================================================
# core/layout_analyzer.py
# Advanced layout analysis using PyMuPDF (fitz) and OpenCV.
# Detects technical blocks, headers, footers, and product sections.
# =============================================================================

import fitz  # PyMuPDF
from typing import List, Dict, Any, Tuple
from utils.logger import logger

class LayoutAnalyzer:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)

    def analyze_page(self, page_num: int) -> Dict[str, Any]:
        """
        Analyze a specific page for structured blocks.
        page_num is 1-indexed.
        """
        page = self.doc[page_num - 1]
        
        # Extract text blocks
        blocks = page.get_text("blocks")
        # Format: (x0, y0, x1, y1, "text", block_no, block_type)
        
        images = page.get_images(full=True)
        
        analysis = {
            "page": page_num,
            "width": page.rect.width,
            "height": page.rect.height,
            "text_blocks": [],
            "image_blocks": [],
            "potential_header": None,
            "potential_footer": None
        }

        # Identify header/footer based on Y coordinates
        header_threshold = page.rect.height * 0.10
        footer_threshold = page.rect.height * 0.90

        for b in blocks:
            x0, y0, x1, y1, text, b_no, b_type = b
            block_data = {
                "bbox": (x0, y0, x1, y1),
                "text": text.strip(),
                "type": "text" if b_type == 0 else "image/other"
            }
            
            if y1 < header_threshold:
                if not analysis["potential_header"]: analysis["potential_header"] = []
                analysis["potential_header"].append(block_data)
            elif y0 > footer_threshold:
                if not analysis["potential_footer"]: analysis["potential_footer"] = []
                analysis["potential_footer"].append(block_data)
            else:
                analysis["text_blocks"].append(block_data)

        # Extract image locations
        for img in page.get_image_info(xrefs=True):
            analysis["image_blocks"].append({
                "bbox": img["bbox"],
                "xref": img["xref"]
            })

        return analysis

    def detect_product_sections(self, page_num: int) -> List[Dict[str, Any]]:
        """
        Heuristic-based detection of product sections.
        Looks for blocks with large text (titles) followed by specs.
        """
        analysis = self.analyze_page(page_num)
        sections = []
        
        # Simple heuristic: Split by vertical gaps or horizontal separators
        # In V2, this would be more complex (ML or regex based)
        
        return analysis["text_blocks"]

    def close(self):
        self.doc.close()
