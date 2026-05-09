# desktop_app/build_exe.py
import PyInstaller.__main__
import os
import platform

def build():
    # Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(script_dir, "main.py")
    
    # Common arguments
    args = [
        main_script,
        "--onefile",
        "--windowed",
        "--name=AltiusNxtPDFProcessor",
        f"--workpath={os.path.join(script_dir, 'build')}",
        f"--distpath={os.path.join(script_dir, 'dist')}",
        f"--specpath={script_dir}",
    ]
    
    # Add data files (if any)
    # args.extend(["--add-data", f"ui;ui"])
    
    # Hidden imports if needed
    args.extend(["--hidden-import", "PyQt6.sip"])
    args.extend(["--hidden-import", "easyocr"])
    args.extend(["--hidden-import", "cv2"])
    
    print(f"Starting build for {platform.system()}...")
    PyInstaller.__main__.run(args)
    print("Build complete! Check the 'dist' folder.")

if __name__ == "__main__":
    build()
