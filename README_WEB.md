# Advanced PDF Section Processor (Web V1)

A high-performance, full-stack web application for automated PDF processing, section detection, and interactive rearrangement. Built without AI/ML models, relying on traditional computer vision (OpenCV) and rule-based extraction.

## 🚀 Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (Python) + OpenCV + Tesseract + PyMuPDF
- **Storage**: In-memory session tracking + Local Filesystem (No Database)

## 🛠️ Features
- **Intelligent Upload**: Drag-and-drop multiple PDFs with progress tracking.
- **Auto-Segmentation**: OpenCV contour detection splits pages into product blocks, tables, and images.
- **Rearrangement Workspace**: Interactive drag-and-drop interface to reorder or delete detected sections.
- **Structured Export**: Download results as JSON, Styled Excel, or rearranged PDFs.
- **Strictly Non-AI**: Uses deterministic algorithms for reliability and speed.

## 📦 Installation & Setup

### Windows / Local Setup
1. **System Dependencies**:
   - Install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
   - Install [Poppler](https://github.com/oschwartz10612/poppler-windows/releases) (Add to PATH)

2. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Docker Setup
```bash
docker-compose up --build
```

## 📁 Folder Structure
```
backend/
 ├── core/         # Image & PDF processing logic
 ├── api/          # FastAPI routes
 ├── output/       # Storage for crops, json, excel
 ├── main.py       # API Entry point
frontend/
 ├── src/pages/    # Dashboard, Upload, Editor
 ├── src/services/ # API Client
```

## 🛡️ Security & Performance
- Filesystem cleanup tasks for temp data.
- Asynchronous background processing for large PDFs.
- Strict file type validation (.pdf only).
