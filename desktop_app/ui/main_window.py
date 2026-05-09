# desktop_app/ui/main_window.py
import os
import cv2
import numpy as np
import json
import uuid
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, 
    QLabel, QFileDialog, QProgressBar, QTextEdit, QListWidget,
    QSplitter, QScrollArea, QFrame, QMessageBox
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QSize, QRect, QPoint
from PyQt6.QtGui import QIcon, QPixmap, QImage, QColor, QPalette, QAction, QPainter, QPen
from desktop_app.core.processor import PDFProcessor

class ClickableLabel(QLabel):
    crop_selected = pyqtSignal(QRect)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.begin = QPoint()
        self.end = QPoint()
        self.is_drawing = False

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.begin = event.pos()
            self.end = event.pos()
            self.is_drawing = True
            self.update()

    def mouseMoveEvent(self, event):
        if self.is_drawing:
            self.end = event.pos()
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.is_drawing = False
            rect = QRect(self.begin, self.end).normalized()
            if rect.width() > 10 and rect.height() > 10:
                self.crop_selected.emit(rect)
            self.update()

    def paintEvent(self, event):
        super().paintEvent(event)
        if self.is_drawing:
            painter = QPainter(self)
            painter.setPen(QPen(Qt.GlobalColor.red, 2, Qt.PenStyle.SolidLine))
            painter.drawRect(QRect(self.begin, self.end).normalized())

class ProcessingThread(QThread):
    progress = pyqtSignal(int)
    log = pyqtSignal(str)
    finished = pyqtSignal(list)
    error = pyqtSignal(str)

    def __init__(self, processor, pdf_paths):
        super().__init__()
        self.processor = processor
        self.pdf_paths = pdf_paths

    def run(self):
        all_records = []
        try:
            total_files = len(self.pdf_paths)
            for i, path in enumerate(self.pdf_paths):
                self.log.emit(f"Processing ({i+1}/{total_files}): {os.path.basename(path)}")
                records = self.processor.process_file(path, progress_callback=lambda p: self.progress.emit(p))
                all_records.extend(records)
            self.finished.emit(all_records)
        except Exception as e:
            self.error.emit(str(e))

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("AltiusNxt PDF Processor")
        self.resize(1200, 800)
        self.processor = PDFProcessor()
        self.selected_files = []
        self.setAcceptDrops(True)
        
        self.init_ui()
        self.apply_dark_theme()

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        # Left Panel - File List & Controls
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        title_label = QLabel("PDF Batch Processor")
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #3498db;")
        left_layout.addWidget(title_label)

        btn_layout = QHBoxLayout()
        self.btn_select_files = QPushButton("Select PDFs")
        self.btn_select_files.clicked.connect(self.select_files)
        btn_layout.addWidget(self.btn_select_files)

        self.btn_select_folder = QPushButton("Select Folder")
        self.btn_select_folder.clicked.connect(self.select_folder)
        btn_layout.addWidget(self.btn_select_folder)
        left_layout.addLayout(btn_layout)

        self.file_list = QListWidget()
        self.file_list.itemClicked.connect(self.preview_selected_file)
        left_layout.addWidget(QLabel("Files to Process (Drag & Drop supported):"))
        left_layout.addWidget(self.file_list)

        self.progress_bar = QProgressBar()
        left_layout.addWidget(self.progress_bar)

        self.btn_start = QPushButton("Start Processing")
        self.btn_start.clicked.connect(self.start_processing)
        self.btn_start.setStyleSheet("background-color: #2ecc71; color: white; font-weight: bold; padding: 12px; border-radius: 5px;")
        left_layout.addWidget(self.btn_start)

        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setStyleSheet("background-color: #1a1a1a; color: #00ff00; font-family: 'Consolas';")
        left_layout.addWidget(QLabel("Logs:"))
        left_layout.addWidget(self.log_output)

        # Right Panel - Preview
        right_panel = QFrame()
        right_panel.setFrameShape(QFrame.Shape.StyledPanel)
        right_layout = QVBoxLayout(right_panel)
        
        preview_header = QLabel("Preview & Manual Crop")
        preview_header.setAlignment(Qt.AlignmentFlag.AlignCenter)
        preview_header.setStyleSheet("font-weight: bold; font-size: 16px;")
        right_layout.addWidget(preview_header)

        self.image_preview = ClickableLabel("Select a file to preview")
        self.image_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.image_preview.setStyleSheet("border: 2px dashed #555; background-color: #000;")
        self.image_preview.crop_selected.connect(self.on_manual_crop)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setWidget(self.image_preview)
        right_layout.addWidget(scroll_area)

        # Manual Adjustment Controls
        help_label = QLabel("Tip: Click and drag on the preview to manually define a crop area.")
        help_label.setStyleSheet("font-style: italic; color: #888;")
        right_layout.addWidget(help_label)

        # Add to main layout
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setStretchFactor(1, 2)
        main_layout.addWidget(splitter)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.accept()
        else:
            event.ignore()

    def dropEvent(self, event):
        for url in event.mimeData().urls():
            path = url.toLocalFile()
            if path.lower().endswith(".pdf"):
                if path not in self.selected_files:
                    self.selected_files.append(path)
                    self.file_list.addItem(os.path.basename(path))
            elif os.path.isdir(path):
                for f in os.listdir(path):
                    if f.lower().endswith(".pdf"):
                        full_path = os.path.join(path, f)
                        if full_path not in self.selected_files:
                            self.selected_files.append(full_path)
                            self.file_list.addItem(f)

    def apply_dark_theme(self):
        palette = QPalette()
        palette.setColor(QPalette.ColorRole.Window, QColor(45, 45, 45))
        palette.setColor(QPalette.ColorRole.WindowText, Qt.GlobalColor.white)
        palette.setColor(QPalette.ColorRole.Base, QColor(30, 30, 30))
        palette.setColor(QPalette.ColorRole.AlternateBase, QColor(45, 45, 45))
        palette.setColor(QPalette.ColorRole.ToolTipBase, Qt.GlobalColor.white)
        palette.setColor(QPalette.ColorRole.ToolTipText, Qt.GlobalColor.white)
        palette.setColor(QPalette.ColorRole.Text, Qt.GlobalColor.white)
        palette.setColor(QPalette.ColorRole.Button, QColor(53, 53, 53))
        palette.setColor(QPalette.ColorRole.ButtonText, Qt.GlobalColor.white)
        palette.setColor(QPalette.ColorRole.Link, QColor(42, 130, 218))
        palette.setColor(QPalette.ColorRole.Highlight, QColor(42, 130, 218))
        palette.setColor(QPalette.ColorRole.HighlightedText, Qt.GlobalColor.black)
        self.setPalette(palette)

    def select_files(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Select PDF Files", "", "PDF Files (*.pdf)")
        if files:
            for f in files:
                if f not in self.selected_files:
                    self.selected_files.append(f)
                    self.file_list.addItem(os.path.basename(f))

    def select_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Select Folder Containing PDFs")
        if folder:
            for f in os.listdir(folder):
                if f.lower().endswith(".pdf"):
                    path = os.path.join(folder, f)
                    if path not in self.selected_files:
                        self.selected_files.append(path)
                        self.file_list.addItem(f)

    def preview_selected_file(self, item):
        index = self.file_list.row(item)
        pdf_path = self.selected_files[index]
        self.log_output.append(f"Previewing: {os.path.basename(pdf_path)}")
        
        # In a real app, we'd render the first page in a thread
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=72, poppler_path=self.processor.poppler_path)
            if pages:
                img = pages[0]
                # Convert PIL to QPixmap
                img = img.convert("RGBA")
                data = img.tobytes("raw", "RGBA")
                qimg = QImage(data, img.size[0], img.size[1], QImage.Format.Format_RGBA8888)
                pixmap = QPixmap.fromImage(qimg)
                self.image_preview.setPixmap(pixmap.scaled(self.image_preview.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        except Exception as e:
            self.log_output.append(f"Preview error: {e}")

    def on_manual_crop(self, rect):
        if not self.file_list.currentItem():
            return
            
        reply = QMessageBox.question(self, 'Manual Crop', f'Extract text from selected area {rect.width()}x{rect.height()}?', 
                                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if reply == QMessageBox.StandardButton.Yes:
            self.log_output.append(f"Manual crop triggered...")
            
            # Get current PDF and page
            pdf_path = self.selected_files[self.file_list.currentRow()]
            
            try:
                from pdf2image import convert_from_path
                # For simplicity, we use the first page previewed
                pages = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200, poppler_path=self.processor.poppler_path)
                if pages:
                    img = pages[0]
                    # We need to map the rect from the label (scaled) back to the original image
                    label_size = self.image_preview.size()
                    pixmap_size = self.image_preview.pixmap().size()
                    
                    # Calculate scaling factors
                    # Note: this is a simplified mapping
                    scale_x = img.size[0] / pixmap_size.width()
                    scale_y = img.size[1] / pixmap_size.height()
                    
                    # Offset if pixmap is centered
                    offset_x = (label_size.width() - pixmap_size.width()) / 2
                    offset_y = (label_size.height() - pixmap_size.height()) / 2
                    
                    real_x = int((rect.x() - offset_x) * scale_x)
                    real_y = int((rect.y() - offset_y) * scale_y)
                    real_w = int(rect.width() * scale_x)
                    real_h = int(rect.height() * scale_y)
                    
                    cropped = img.crop((real_x, real_y, real_x + real_w, real_y + real_h))
                    
                    # Process this one crop
                    unique_id = "manual_" + uuid.uuid4().hex[:6]
                    img_path = os.path.join(self.processor.img_dir, f"{unique_id}.png")
                    cropped.save(img_path)
                    
                    text = self.processor.extract_text(cropped)
                    record = {
                        "id": unique_id,
                        "pdf_name": os.path.basename(pdf_path),
                        "page": 1,
                        "image_path": f"{self.processor.output_dir}/images/{unique_id}.png",
                        "text": text
                    }
                    
                    json_path = os.path.join(self.processor.json_dir, f"{unique_id}.json")
                    with open(json_path, 'w') as f:
                        json.dump(record, f, indent=4)
                        
                    self.log_output.append(f"Manual crop saved: {unique_id}")
                    self.log_output.append(f"OCR Text: {text[:50]}...")
                    QMessageBox.information(self, "Success", "Manual crop processed and saved.")
                    
            except Exception as e:
                self.log_output.append(f"Manual crop error: {e}")
                QMessageBox.critical(self, "Error", f"Failed to process crop: {e}")

    def start_processing(self):
        if not self.selected_files:
            self.log_output.append("No files selected!")
            return

        self.btn_start.setEnabled(False)
        self.progress_bar.setValue(0)
        
        self.thread = ProcessingThread(self.processor, self.selected_files)
        self.thread.progress.connect(self.progress_bar.setValue)
        self.thread.log.connect(self.log_output.append)
        self.thread.finished.connect(self.on_processing_finished)
        self.thread.error.connect(self.on_processing_error)
        self.thread.start()

    def on_processing_finished(self, all_records):
        self.log_output.append("--- Processing Complete! ---")
        excel_path = self.processor.save_to_excel(all_records)
        json_path = self.processor.save_combined_json(all_records)
        self.log_output.append(f"Exported {len(all_records)} records.")
        self.log_output.append(f"Excel: {excel_path}")
        self.log_output.append(f"JSON: {json_path}")
        self.btn_start.setEnabled(True)
        QMessageBox.information(self, "Finished", f"Successfully processed {len(all_records)} items!")

    def on_processing_error(self, error_msg):
        self.log_output.append(f"ERROR: {error_msg}")
        self.btn_start.setEnabled(True)
        QMessageBox.critical(self, "Error", f"An error occurred: {error_msg}")
