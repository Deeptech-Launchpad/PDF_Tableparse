# backend/main.py
import os
import shutil
import uuid
import json
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.pdf_processor import pdf_to_images
from core.image_processor import detect_sections, crop_section
from core.ocr_engine import extract_text, extract_datasheet_fields
from core.pdf_builder import generate_pdf_from_json
from core.exporter import save_combined_json, save_excel
from utils.file_manager import ensure_output_dirs
from utils.logger import logger
import traceback
from PIL import Image

# Path for persistence
STORE_PATH = "output/store.json"

def save_store():
    with open(STORE_PATH, "w") as f:
        json.dump(STORE, f, indent=4)

def load_store():
    global STORE
    if os.path.exists(STORE_PATH):
        try:
            with open(STORE_PATH, "r") as f:
                STORE = json.load(f)
            logger.info("Store loaded from disk.")
        except Exception as e:
            logger.error(f"Error loading store: {e}")
            STORE = {}
    else:
        STORE = {}

app = FastAPI(title="PDF Processor API (Persistent Version)")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output Directories
DIRS = ensure_output_dirs(".")
TEMP_DIR = "output/temp"
os.makedirs(TEMP_DIR, exist_ok=True)

# Static Files for serving images
app.mount("/output", StaticFiles(directory="output"), name="output")

from fastapi.responses import FileResponse
import zipfile
import io
from fastapi.responses import StreamingResponse

@app.get("/download/{path:path}")
async def download_file_api(path: str):
    file_path = os.path.join("output", path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Extract filename
    filename = os.path.basename(file_path)
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='application/octet-stream'
    )

@app.post("/download-batch")
async def download_batch(data: Dict[str, List[str]]):
    image_paths = data.get("paths", [])
    if not image_paths:
        raise HTTPException(status_code=400, detail="No images selected")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for img_path in image_paths:
            # Convert /output/images/x.png to output/images/x.png
            local_path = img_path.lstrip("/")
            # If it has /output/ prefix
            if local_path.startswith("output/"):
                pass 
            else:
                local_path = os.path.join("output", local_path)
            
            if os.path.exists(local_path):
                zip_file.write(local_path, os.path.basename(local_path))
    
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": "attachment; filename=selected_sections.zip"}
    )

# In-memory store (Persistent)
STORE: Dict[str, Any] = {}
load_store()

@app.get("/")
def read_root():
    return {"message": "PDF Processor API is running (Persistent)"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(content=b"", media_type="image/x-icon", status_code=204)

@app.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    pdf_ids = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            continue
        
        pdf_id = uuid.uuid4().hex[:8]
        file_path = os.path.join(TEMP_DIR, f"{pdf_id}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        STORE[pdf_id] = {
            "id": pdf_id,
            "filename": file.filename,
            "status": "processing",
            "pages": [],
            "created_at": str(uuid.uuid4()) # placeholder for timestamp
        }
        
        pdf_ids.append(pdf_id)
        background_tasks.add_task(process_pdf_task, pdf_id, file_path)
    
    return {"pdf_ids": pdf_ids}

from pydantic import BaseModel
import requests

class UrlUploadRequest(BaseModel):
    url: str

@app.post("/upload-url")
async def upload_pdf_url(
    req: UrlUploadRequest,
    background_tasks: BackgroundTasks
):
    url = req.url
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    try:
        response = requests.get(url, stream=True, timeout=15, headers=headers)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch PDF from URL: {e}")
        
    filename = url.split("/")[-1]
    if not filename.lower().endswith(".pdf"):
        filename = "downloaded_document.pdf"
        
    pdf_id = uuid.uuid4().hex[:8]
    file_path = os.path.join(TEMP_DIR, f"{pdf_id}_{filename}")
    
    with open(file_path, "wb") as buffer:
        for chunk in response.iter_content(chunk_size=8192):
            buffer.write(chunk)
            
    STORE[pdf_id] = {
        "id": pdf_id,
        "filename": filename,
        "status": "processing",
        "pages": [],
        "created_at": str(uuid.uuid4())
    }
    
    background_tasks.add_task(process_pdf_task, pdf_id, file_path)
    return {"pdf_ids": [pdf_id]}

def process_pdf_task(pdf_id: str, file_path: str):
    try:
        # 1. Convert PDF to Images
        pages = pdf_to_images(file_path, dpi=200)
        
        for page_num, pil_img in pages:
            page_uid = uuid.uuid4().hex[:6]
            img_rel_path = f"images/page_{pdf_id}_{page_num}_{page_uid}.png"
            img_full_path = os.path.join("output", img_rel_path)
            pil_img.save(img_full_path, "PNG")
            
            page_data = {
                "page_num": page_num,
                "image_path": f"/output/{img_rel_path}",
                "sections": []
            }
            
            # 2. Detect and Crop Sections
            boxes = detect_sections(pil_img)
            for i, bbox in enumerate(boxes):
                x, y, w, h = bbox
                crop_uid = uuid.uuid4().hex[:6]
                crop_rel_path = f"images/crop_{pdf_id}_{page_num}_{i}_{crop_uid}.png"
                crop_full_path = os.path.join("output", crop_rel_path)
                
                cropped = crop_section(pil_img, bbox)
                cropped.save(crop_full_path, "PNG")
                
                # 3. OCR
                text = extract_text(cropped)
                fields = extract_datasheet_fields(text)
                
                section_data = {
                    "id": f"{pdf_id}_{page_num}_{i}",
                    "bbox": {"x": x, "y": y, "w": w, "h": h},
                    "image_path": f"/output/{crop_rel_path}",
                    "text": text,
                    "fields": fields
                }
                page_data["sections"].append(section_data)
            
            STORE[pdf_id]["pages"].append(page_data)
        
        STORE[pdf_id]["status"] = "completed"
        save_store()
        
    except Exception as e:
        logger.error(f"Error processing PDF {pdf_id}: {e}")
        logger.error(traceback.format_exc())
        if pdf_id in STORE:
            STORE[pdf_id]["status"] = "error"
            STORE[pdf_id]["error_msg"] = str(e)

@app.get("/pdfs")
def list_pdfs():
    return list(STORE.values())

@app.get("/pdfs/{pdf_id}")
def get_pdf_details(pdf_id: str):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    return STORE[pdf_id]

@app.delete("/pdfs/{pdf_id}")
def delete_pdf(pdf_id: str):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    del STORE[pdf_id]
    save_store()
    return {"status": "success", "message": "PDF deleted"}

@app.patch("/pdfs/{pdf_id}")
def update_pdf(pdf_id: str, data: Dict[str, Any]):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Update root level fields
    for key, value in data.items():
        if key not in ["id", "pages", "filename", "status"]: # Protected fields
            STORE[pdf_id][key] = value
            
    save_store()
    return STORE[pdf_id]

@app.get("/download-by-sku/{sku_id}")
async def download_by_sku(sku_id: str):
    found_pdf_id = None
    found_filename = None
    
    # Search for the SKU in all processed PDFs
    for pdf_id, pdf_data in STORE.items():
        for page in pdf_data.get("pages", []):
            for section in page.get("sections", []):
                fields = section.get("fields", {})
                # Check both rs_stock_no and mfr_pn
                if fields.get("rs_stock_no") == sku_id or fields.get("mfr_pn") == sku_id:
                    found_pdf_id = pdf_id
                    found_filename = pdf_data["filename"]
                    break
            if found_pdf_id: break
        if found_pdf_id: break

    if not found_pdf_id:
        raise HTTPException(status_code=404, detail=f"No PDF found for SKU ID: {sku_id}")

    # Find the original PDF file in TEMP_DIR
    pdf_path = os.path.join(TEMP_DIR, f"{found_pdf_id}_{found_filename}")
    
    if not os.path.exists(pdf_path):
         raise HTTPException(status_code=404, detail="Original PDF file not found on server")

    return FileResponse(
        path=pdf_path,
        filename=f"{sku_id}.pdf",
        media_type='application/pdf'
    )

@app.get("/download-pdf/{pdf_id}")
async def download_pdf(pdf_id: str):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    filename = STORE[pdf_id]["filename"]
    pdf_path = os.path.join(TEMP_DIR, f"{pdf_id}_{filename}")
    
    if not os.path.exists(pdf_path):
         raise HTTPException(status_code=404, detail="Original PDF file not found on server")

    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type='application/pdf'
    )

@app.patch("/pdfs/{pdf_id}/sections/{section_id}/fields")
def update_section_fields(pdf_id: str, section_id: str, fields: Dict[str, Any]):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_data = STORE[pdf_id]
    found = False
    for page in pdf_data["pages"]:
        for section in page["sections"]:
            if section["id"] == section_id:
                # Update existing fields or add new ones
                section["fields"].update(fields)
                found = True
                break
        if found: break
    
    if not found:
        raise HTTPException(status_code=404, detail="Section not found")
    
    save_store()
    return {"status": "success", "fields": fields}

def get_pdf_records(pdf_id: str, manual_only: bool = False):
    if pdf_id not in STORE:
        return []
    
    pdf_name = STORE[pdf_id]["filename"]
    pdf_sku = STORE[pdf_id].get("sku_id", "")
    
    sections_json = []
    for page in STORE[pdf_id].get("pages", []):
        for section in page["sections"]:
            if manual_only and not section.get("id", "").startswith("manual_"):
                continue
                
            fields = section.get("fields", {})
            if not pdf_sku and fields.get("rs_stock_no"):
                pdf_sku = fields.get("rs_stock_no")
            elif not pdf_sku and fields.get("mfr_pn"):
                pdf_sku = fields.get("mfr_pn")
            
            sections_json.append(json.dumps(fields, ensure_ascii=False))
            
    rec = {
        "SKU ID": pdf_sku,
        "PDF Name": pdf_name,
        "PDF URL": ""
    }
    
    for i, sj in enumerate(sections_json, start=1):
        rec[f"Json-{i}"] = sj
            
    return [rec]

@app.get("/pdfs/{pdf_id}/export")
async def export_results(pdf_id: str, export_type: str = "json", manual_only: bool = False):
    records = get_pdf_records(pdf_id, manual_only)
    if not records:
        raise HTTPException(status_code=404, detail="PDF not found or no data")
    
    folder = "output/json" if export_type == "json" else "output/excel"
    ext = "json" if export_type == "json" else "xlsx"
    os.makedirs(folder, exist_ok=True)
    
    suffix = "_manual" if manual_only else ""
    path = os.path.join(folder, f"{pdf_id}{suffix}.{ext}")
    
    if export_type == "json":
        with open(path, "w") as f:
            json.dump(records, f, indent=4)
    else:
        save_excel(records, path)
        
    return {"file_url": f"/{path}"}

@app.post("/pdfs/export-batch")
async def export_batch(data: Dict[str, Any]):
    pdf_ids = data.get("pdf_ids", [])
    export_type = data.get("export_type", "excel")
    manual_only = data.get("manual_only", False)
    
    all_records = []
    for pid in pdf_ids:
        all_records.extend(get_pdf_records(pid, manual_only))
    
    if not all_records:
        raise HTTPException(status_code=400, detail="No data to export")
        
    folder = "output/json" if export_type == "json" else "output/excel"
    ext = "json" if export_type == "json" else "xlsx"
    os.makedirs(folder, exist_ok=True)
    
    batch_id = uuid.uuid4().hex[:6]
    path = os.path.join(folder, f"batch_{batch_id}.{ext}")
    
    if export_type == "json":
        with open(path, "w") as f:
            json.dump(all_records, f, indent=4)
    else:
        save_excel(all_records, path)
        
    return {"file_url": f"/{path}"}

@app.post("/pdfs/generate-pdf")
async def generate_pdf(data: Dict[str, Any], template_id: str = None):
    os.makedirs("output/generated", exist_ok=True)
    batch_id = uuid.uuid4().hex[:6]
    filename = f"report_{batch_id}.pdf"
    path = os.path.join("output/generated", filename)
    
    template_path = None
    if template_id:
        template_path = os.path.join("output/templates", f"{template_id}.png")
        if not os.path.exists(template_path):
            template_path = None

    try:
        success = generate_pdf_from_json(data, path, template_path)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to generate PDF")
        return {"file_url": f"/{path}"}
    except Exception as e:
        logger.error(f"PDF Generation Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates/upload")
async def upload_template(file: UploadFile = File(...)):
    os.makedirs("output/templates", exist_ok=True)
    template_id = uuid.uuid4().hex[:8]
    path = os.path.join("output/templates", f"{template_id}.png")
    
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    return {"template_id": template_id, "url": f"/output/templates/{template_id}.png"}

@app.get("/templates")
async def list_templates():
    dir_path = "output/templates"
    if not os.path.exists(dir_path):
        return []
    
    templates = []
    for f in os.listdir(dir_path):
        if f.endswith(".png"):
            templates.append({
                "id": f.replace(".png", ""),
                "url": f"/output/templates/{f}"
            })
    return templates

@app.post("/pdfs/{pdf_id}/pages/{page_num}/crop")
async def manual_crop(
    pdf_id: str, 
    page_num: int, 
    crop_data: Dict[str, Any]
):
    if pdf_id not in STORE:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    x, y, w, h = crop_data.get('x'), crop_data.get('y'), crop_data.get('w'), crop_data.get('h')
    if None in [x, y, w, h]:
        raise HTTPException(status_code=400, detail="Invalid crop coordinates")

    # Find the page
    page_data = next((p for p in STORE[pdf_id]["pages"] if p["page_num"] == page_num), None)
    if not page_data:
         raise HTTPException(status_code=404, detail="Page not found")

    # Load original page image
    img_rel_path = page_data["image_path"].replace("/output/", "")
    img_full_path = os.path.join("output", img_rel_path)
    
    if not os.path.exists(img_full_path):
         raise HTTPException(status_code=404, detail="Page image file not found")
    
    pil_img = Image.open(img_full_path)
    
    # Crop
    bbox = (x, y, w, h)
    cropped = crop_section(pil_img, bbox)
    
    # Save
    crop_uid = uuid.uuid4().hex[:6]
    crop_rel_path = f"images/manual_{pdf_id}_{page_num}_{crop_uid}.png"
    crop_full_path = os.path.join("output", crop_rel_path)
    cropped.save(crop_full_path, "PNG")
    
    # OCR
    text = extract_text(cropped)
    fields = extract_datasheet_fields(text)
    
    # Override with custom entries if provided
    custom_rs = crop_data.get('rs_stock_no')
    custom_mfr_pn = crop_data.get('mfr_pn')
    
    if custom_rs:
        fields['rs_stock_no'] = custom_rs
    if custom_mfr_pn:
        fields['mfr_pn'] = custom_mfr_pn

    # Prefix with manual_ to ensure correct filtering in UI and Export
    base_id = custom_rs if custom_rs else (custom_mfr_pn if custom_mfr_pn else "selection")
    section_id = f"manual_{base_id}_{crop_uid}"
    
    section_data = {
        "id": section_id,
        "bbox": {"x": x, "y": y, "w": w, "h": h},
        "image_path": f"/output/{crop_rel_path}",
        "text": text,
        "fields": fields,
        "pageNum": page_num
    }
    
    # Add to page data
    page_data["sections"].append(section_data)
    save_store()
    
    return section_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
