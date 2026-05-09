# PDF Section Processor

A production-ready desktop application for **automated PDF processing, section detection, OCR, and structured data export**.

Built with **Python · PyQt6 · OpenCV · Tesseract · pdf2image · pandas**.

---

## Features

| Feature | Details |
|---|---|
| **Batch Processing** | Process 100+ PDFs in one session |
| **Auto Section Detection** | OpenCV contour pipeline detects cards, records, tables |
| **OCR** | Tesseract with preprocessing (denoise, sharpen, binarize) |
| **Live Preview** | Real-time thumbnail grid as sections are found |
| **Results Table** | Searchable, sortable table of all extracted sections |
| **JSON Export** | Individual + combined JSON for every section |
| **Excel Export** | Styled dark-theme `.xlsx` with all metadata |
| **Drag & Drop** | Drop folders or individual PDF files |
| **Dark Mode UI** | Premium PyQt6 glassmorphic dark theme |
| **Multi-threaded** | Configurable thread pool (1–16 workers) |
| **Abort Support** | Gracefully stop mid-batch |
| **Logging** | Timestamped log files + in-app log console |

---

## Output Structure

```
output/
├── images/          # Cropped section PNG images  (e.g. A1B2C3D4.png)
├── json/            # Individual JSON per section (e.g. A1B2C3D4.json)
│   └── combined_results.json
├── excel/
│   └── results.xlsx
└── logs/
    └── 20260508_171000_processor.log
```

### JSON Schema

```json
{
  "id":           "A1B2C3D4",
  "pdf_name":     "sample.pdf",
  "page":         1,
  "section_num":  2,
  "image_path":   "output/images/A1B2C3D4.png",
  "text":         "Extracted OCR text here",
  "timestamp":    "2026-05-08T17:10:00",
  "bbox":         { "x": 120, "y": 340, "w": 600, "h": 200 }
}
```

---

## System Requirements (Windows)

### 1 — Install Poppler (for pdf2image)

1. Download from: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract to `C:\poppler\`
3. Add `C:\poppler\Library\bin` to your **System PATH**
4. Verify: open PowerShell → `pdftoppm -v`

### 2 — Install Tesseract OCR

1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer — note the install path (default: `C:\Program Files\Tesseract-OCR\`)
3. Add `C:\Program Files\Tesseract-OCR\` to your **System PATH**
4. Verify: open PowerShell → `tesseract --version`

> **Tip:** If Tesseract is not on PATH, add this line to `core/ocr_engine.py`:
> ```python
> pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
> ```

---

## Python Installation

```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# 2. Install all Python dependencies
pip install -r requirements.txt

# 3. Launch the application
python main.py
```

---

## Usage

1. **Launch**: `python main.py`
2. **Load PDFs**: Click **Browse Folder** or drag-and-drop a folder / PDF files onto the drop zone.
3. **Configure**: Adjust DPI, minimum section area, and thread count in the Settings panel.
4. **Process**: Click **▶ Start Processing** — watch the live preview and log in real time.
5. **Export**: When done, click **📊 Open Excel** or **📂 Open Output** to view results.

---

## Building a Standalone Executable

```powershell
# Install PyInstaller
pip install pyinstaller

# Build (outputs to dist/PDFSectionProcessor/)
pyinstaller pdf_processor.spec

# The executable will be at:
# dist\PDFSectionProcessor\PDFSectionProcessor.exe
```

> **Note:** Poppler and Tesseract must still be installed on the end user's machine
> (or bundled manually into the `dist` folder).

---

## Tuning Section Detection

| Setting | Effect |
|---|---|
| **DPI** (72–600) | Higher = sharper images, better OCR, slower |
| **Min Section Area** | Lower = detect small sections; higher = ignore noise |
| **Worker Threads** | More = faster batch; diminishing returns above CPU core count |

The OpenCV pipeline in `core/image_processor.py` uses:
- **Adaptive thresholding** → handles varying lighting/contrast across pages.
- **Morphological closing** → merges nearby edges into solid regions.
- **Non-Maximum Suppression** → removes duplicate overlapping boxes.

---

## Project Structure

```
PDF/
├── main.py                   # Entry point
├── requirements.txt
├── pdf_processor.spec        # PyInstaller build config
├── README.md
├── core/
│   ├── pdf_processor.py      # pdf2image wrapper
│   ├── image_processor.py    # OpenCV section detection
│   ├── ocr_engine.py         # Tesseract OCR + preprocessing
│   └── exporter.py           # JSON + Excel export
├── gui/
│   ├── main_window.py        # Primary UI window
│   ├── preview_widget.py     # Real-time thumbnail grid
│   ├── worker.py             # QThread background processor
│   └── styles.py             # Complete dark-mode QSS theme
└── utils/
    ├── constants.py          # Global settings
    ├── logger.py             # Logging setup
    └── file_manager.py       # Directory + path utilities
```

---

## License

MIT — Free for commercial and personal use.
