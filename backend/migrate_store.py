import json
import os
import sys

# Add current directory to path to import ocr_engine
sys.path.append(os.getcwd())
from core.ocr_engine import extract_datasheet_fields

STORE_PATH = "output/store.json"

def migrate():
    if not os.path.exists(STORE_PATH):
        print("Store not found.")
        return

    with open(STORE_PATH, "r") as f:
        store = json.load(f)

    changed = False
    for pdf_id, pdf_data in store.items():
        print(f"Migrating PDF: {pdf_data.get('filename')}")
        for page in pdf_data.get("pages", []):
            for section in page.get("sections", []):
                text = section.get("text", "")
                if text:
                    # Re-extract fields using improved logic
                    new_fields = extract_datasheet_fields(text)
                    
                    # Merge with existing fields if any (to keep manual edits if they existed)
                    old_fields = section.get("fields", {})
                    for k, v in old_fields.items():
                        if v and v not in ["N/A", "Unknown", "EA", "Active", "Industrial Component"]:
                            new_fields[k] = v
                    
                    if section.get("fields") != new_fields:
                        section["fields"] = new_fields
                        changed = True

    if changed:
        with open(STORE_PATH, "w") as f:
            json.dump(store, f, indent=4)
        print("Store re-extracted and migrated successfully.")
    else:
        print("No changes needed.")

if __name__ == "__main__":
    migrate()
