# =============================================================================
# core/table_extractor.py
# Specialized table extraction for technical datasheets.
# Uses pdfplumber and Camelot.
# =============================================================================

import pdfplumber
import pandas as pd
from typing import List, Dict, Any
from utils.logger import logger

class TableExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path

    def extract_tables_plumber(self, page_num: int) -> List[Dict[str, Any]]:
        """
        Extract tables using pdfplumber (best for text-aligned tables).
        """
        tables_data = []
        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                page = pdf.pages[page_num - 1]
                tables = page.extract_tables()
                for i, table in enumerate(tables):
                    if not table: continue
                    df = pd.DataFrame(table[1:], columns=table[0])
                    tables_data.append({
                        "table_id": i,
                        "data": df.to_dict(orient="records"),
                        "raw": table
                    })
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
        
        return tables_data

    def extract_tables_camelot(self, page_num: int) -> List[pd.DataFrame]:
        """
        Extract tables using Camelot (best for grid-heavy tables).
        Requires ghostscript to be installed on the system.
        """
        try:
            import camelot
            tables = camelot.read_pdf(self.pdf_path, pages=str(page_num), flavor='lattice')
            return [t.df for t in tables]
        except Exception as e:
            logger.warning(f"Camelot extraction skipped or failed: {e}. Ensure ghostscript is installed.")
            return []

    def get_structured_specs(self, page_num: int) -> Dict[str, str]:
        """
        Converts extracted tables into a flat dictionary of specifications.
        """
        tables = self.extract_tables_plumber(page_num)
        specs = {}
        for table in tables:
            for row in table["data"]:
                # Basic Key-Value extraction heuristic
                keys = list(row.keys())
                if len(keys) >= 2:
                    k = str(row[keys[0]]).strip()
                    v = str(row[keys[1]]).strip()
                    if k and v:
                        specs[k] = v
        return specs
