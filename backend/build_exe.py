# backend/build_exe.py
import PyInstaller.__main__
import os
import shutil

def build():
    print("Starting PyInstaller build process...")
    
    # Path to main desktop entry point
    entry_point = "main_desktop.py"
    
    if not os.path.exists(entry_point):
        print(f"Error: {entry_point} not found. Creating a default launcher...")
        # (I will create main_desktop.py in the next step)

    params = [
        entry_point,
        '--onefile',
        '--windowed',
        '--name=PDFProcessorPro',
        '--add-data=core;core',
        '--add-data=utils;utils',
        '--hidden-import=pytesseract',
        '--hidden-import=pdf2image',
        '--hidden-import=opencv-python',
    ]

    PyInstaller.__main__.run(params)
    print("Build complete! Check the 'dist' folder.")

if __name__ == "__main__":
    build()
