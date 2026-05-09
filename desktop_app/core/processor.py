# desktop_app/core/processor.py
import os
import cv2
import numpy as np
import pandas as pd
import json
import uuid
import logging
from PIL import Image
from pdf2image import convert_from_path
import platform

# Try to import OCR engines
try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import easyocr
    reader = None # Initialize lazily
except ImportError:
    easyocr = None

class PDFProcessor:
    def __init__(self, output_dir="output", ocr_engine="easyocr"):
        self.output_dir = output_dir
        self.img_dir = os.path.join(output_dir, "images")
        self.json_dir = os.path.join(output_dir, "json")
        self.excel_dir = os.path.join(output_dir, "excel")
        self.ocr_engine = ocr_engine
        self.reader = None
        self.setup_dirs()
        
        # Windows Poppler Path
        self.poppler_path = None
        if platform.system() == "Windows":
             # Common poppler paths - can be adjusted
            _p = r"C:\Users\sasikumar\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin"
            if os.path.isdir(_p):
                self.poppler_path = _p

    def setup_dirs(self):
        for d in [self.img_dir, self.json_dir, self.excel_dir]:
            os.makedirs(d, exist_ok=True)

    def get_reader(self):
        if self.ocr_engine == "easyocr" and self.reader is None:
            if easyocr:
                self.reader = easyocr.Reader(['en'])
        return self.reader

    def detect_sections(self, pil_image):
        """Detect rectangular sections in the image using OpenCV."""
        open_cv_image = np.array(pil_image)
        # Convert RGB to BGR
        open_cv_image = open_cv_image[:, :, ::-1].copy()
        
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR_GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Dilate to connect text into blocks
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        dilate = cv2.dilate(thresh, kernel, iterations=2)

        # Find contours
        cnts = cv2.findContours(dilate, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = cnts[0] if len(cnts) == 2 else cnts[1]

        boxes = []
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            # Filter small boxes
            if w > 100 and h > 50:
                boxes.append((x, y, w, h))
        
        # Sort boxes top to bottom, left to right
        boxes = sorted(boxes, key=lambda b: (b[1], b[0]))
        return boxes

    def extract_text(self, pil_image):
        """Extract text from a PIL image using the selected OCR engine."""
        if self.ocr_engine == "easyocr":
            reader = self.get_reader()
            if reader:
                # EasyOCR takes numpy array or path
                results = reader.readtext(np.array(pil_image))
                return " ".join([res[1] for res in results])
        
        if self.ocr_engine == "tesseract" or not self.reader:
            if pytesseract:
                return pytesseract.image_to_string(pil_image).strip()
        
        return "OCR Engine not available"

    def process_file(self, pdf_path, progress_callback=None):
        """Process a single PDF file."""
        pdf_name = os.path.basename(pdf_path)
        records = []
        
        try:
            pages = convert_from_path(pdf_path, dpi=200, poppler_path=self.poppler_path)
            total_pages = len(pages)
            
            for i, page in enumerate(pages):
                page_num = i + 1
                boxes = self.detect_sections(page)
                
                for j, box in enumerate(boxes):
                    x, y, w, h = box
                    # Crop section
                    cropped = page.crop((x, y, x + w, y + h))
                    
                    # Generate ID and paths
                    unique_id = uuid.uuid4().hex[:8]
                    img_filename = f"{unique_id}.png"
                    img_path = os.path.join(self.img_dir, img_filename)
                    
                    # Save cropped image
                    cropped.save(img_path)
                    
                    # OCR
                    text = self.extract_text(cropped)
                    
                    # Create record
                    record = {
                        "id": unique_id,
                        "pdf_name": pdf_name,
                        "page": page_num,
                        "image_path": f"{self.output_dir}/images/{img_filename}",
                        "text": text
                    }
                    records.append(record)
                    
                    # Save individual JSON
                    json_path = os.path.join(self.json_dir, f"{unique_id}.json")
                    with open(json_path, 'w') as f:
                        json.dump(record, f, indent=4)
                
                if progress_callback:
                    progress_callback(int((page_num / total_pages) * 100))
                    
        except Exception as e:
            logging.error(f"Error processing {pdf_name}: {e}")
            raise e
            
        return records

    def save_to_excel(self, all_records, filename="processed_results.xlsx"):
        df = pd.DataFrame(all_records)
        path = os.path.join(self.excel_dir, filename)
        df.to_excel(path, index=False)
        return path

    def save_combined_json(self, all_records, filename="combined_results.json"):
        path = os.path.join(self.output_dir, filename)
        with open(path, 'w') as f:
            json.dump(all_records, f, indent=4)
        return path
