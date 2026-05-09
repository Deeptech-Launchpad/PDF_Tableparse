# AltiusNxt PDF Processor - Desktop Application

A production-ready desktop application to automatically process PDF files, detect sections/records, extract text via OCR, and export to Excel/JSON.

## Features
- **Batch Processing**: Handle 100+ PDFs automatically.
- **Auto-Section Detection**: Uses OpenCV to find records/cards on each page.
- **OCR**: Integrated OCR for text extraction.
- **Manual Crop**: Click and drag on the preview to manually define extraction areas.
- **Preview Window**: View PDF pages before processing.
- **Drag & Drop**: Easily add files or folders.
- **Dark Mode**: Premium UI aesthetics.
- **Export**: Generates structured JSON and Excel files.

## Installation Instructions

### 1. Prerequisites
- **Python 3.10+** installed.
- **Poppler**: Required for PDF to image conversion.
  - Windows: The app checks for Poppler in common paths. If not found, download from [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases) and add the `bin` folder to your PATH.
- **Tesseract (Optional)**: If you prefer Tesseract over EasyOCR, install it from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki).

### 2. Install Dependencies
Navigate to the `desktop_app` folder and run:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python main.py
```

## Executable Build Steps (PyInstaller)

To create a standalone `.exe` for distribution:

1. Ensure `pyinstaller` is installed:
   ```bash
   pip install pyinstaller
   ```

2. Run the build script:
   ```bash
   python build_exe.py
   ```

3. The executable will be available in the `dist/` folder.

## Folder Structure
- `desktop_app/`: Main application code.
- `output/`: Processed results.
  - `images/`: Cropped section images.
  - `json/`: Individual JSON files for each record.
  - `excel/`: Combined Excel report.
