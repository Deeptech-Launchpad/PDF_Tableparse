# =============================================================================
# core/pdf_rearranger.py
# Rearrangement engine using ReportLab.
# Redesigns industrial datasheets into clean, card-based layouts.
# =============================================================================

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
from typing import List, Dict, Any
import os

from utils.logger import logger

class PDFRearranger:
    def __init__(self, output_path: str):
        self.output_path = output_path
        self.c = canvas.Canvas(output_path, pagesize=A4)
        self.width, self.height = A4

    def add_product_card(self, data: Dict[str, Any]):
        """
        Adds a stylized product card to the current page.
        data includes: product_name, model_number, image_path, specifications.
        """
        # Define card area
        x, y = 0.5 * inch, self.height - 4 * inch
        w, h = self.width - 1 * inch, 3.5 * inch

        # Draw Card Border
        self.c.setStrokeColor(colors.lightgrey)
        self.c.roundRect(x, y, w, h, 10, stroke=1, fill=0)

        # Title
        self.c.setFont("Helvetica-Bold", 16)
        self.c.setFillColor(colors.black)
        self.c.drawString(x + 0.2 * inch, y + h - 0.4 * inch, data.get("product_name", "Unknown Product"))

        # Model Number
        self.c.setFont("Helvetica", 10)
        self.c.setFillColor(colors.grey)
        self.c.drawString(x + 0.2 * inch, y + h - 0.6 * inch, f"Model: {data.get("model_number", "N/A")}")

        # Image (if exists)
        img_path = data.get("image_path")
        if img_path and os.path.exists(img_path):
            try:
                self.c.drawImage(img_path, x + 0.2 * inch, y + 0.2 * inch, width=2*inch, height=2*inch, preserveAspectRatio=True)
            except Exception as e:
                logger.error(f"Could not add image to rearranged PDF: {e}")

        # Specifications (Mini-table)
        self.c.setFont("Helvetica", 9)
        self.c.setFillColor(colors.black)
        specs = data.get("specifications", {})
        curr_y = y + h - 1.0 * inch
        for i, (k, v) in enumerate(list(specs.items())[:8]):
            self.c.drawString(x + 2.5 * inch, curr_y, f"• {k}: {v}")
            curr_y -= 0.2 * inch

        # Advance Y or Page
        # (For simplicity in this module, we assume one card per page or manage manually)

    def save(self):
        self.c.save()
        logger.info(f"Rearranged PDF saved to {self.output_path}")

def rearrange_datasheet(records: List[Dict[str, Any]], output_file: str):
    """
    Helper to process a batch of records into a new PDF.
    """
    rearranger = PDFRearranger(output_file)
    for record in records:
        rearranger.add_product_card(record)
        rearranger.c.showPage()
    rearranger.save()
