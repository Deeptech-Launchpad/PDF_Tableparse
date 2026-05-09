// frontend/src/components/ManualCropModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, MousePointer2, Scissors, Download } from 'lucide-react';
import { pdfService } from '../services/api';

const ManualCropModal = ({ pdf, onClose, onCropSuccess }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rsStockNo, setRsStockNo] = useState("");
  const [mfrPN, setMfrPN] = useState("");
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelection({ x1: x, y1: y, x2: x, y2: y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelection(prev => ({ ...prev, x2: x, y2: y }));
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCrop = async () => {
    if (!selection) return;
    setLoading(true);
    
    // Calculate relative coordinates for backend
    const rect = imgRef.current.getBoundingClientRect();
    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const x = Math.min(selection.x1, selection.x2) * scaleX;
    const y = Math.min(selection.y1, selection.y2) * scaleY;
    const w = Math.abs(selection.x2 - selection.x1) * scaleX;
    const h = Math.abs(selection.y2 - selection.y1) * scaleY;

    try {
      const page = pdf.pages[currentPage];
      const res = await pdfService.manualCrop(pdf.id, page.page_num, {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        rs_stock_no: rsStockNo,
        mfr_pn: mfrPN
      });
      onCropSuccess(res.data, page.page_num);
      setSelection(null);
      setRsStockNo("");
      setMfrPN("");
    } catch (err) {
      alert("Crop failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentImgPath = pdf.pages[currentPage]?.image_path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="bg-dark-800 w-full max-w-6xl h-full flex flex-col rounded-3xl border border-dark-600 overflow-hidden shadow-2xl">
        <header className="p-6 border-b border-dark-600 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Manual Crop Editor</h3>
            <p className="text-dark-400 text-sm">Select an area to extract as a new record</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-dark-900 rounded-xl p-1">
                {pdf.pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPage(i); setSelection(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currentPage === i ? 'bg-accent-blue text-white' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Page {i + 1}
                  </button>
                ))}
             </div>
             <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-full transition-all">
               <X size={24} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-black/40" ref={containerRef}>
          <div className="relative inline-block cursor-crosshair select-none">
            <img
              ref={imgRef}
              src={`http://localhost:8000${currentImgPath}`}
              alt="Preview"
              className="max-h-[70vh] w-auto border border-dark-600 shadow-xl"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              draggable={false}
            />
            {selection && (
              <div
                className="absolute border-2 border-accent-blue bg-accent-blue/10 pointer-events-none"
                style={{
                  left: `${(Math.min(selection.x1, selection.x2) / (imgRef.current?.width || 1)) * 100}%`,
                  top: `${(Math.min(selection.y1, selection.y2) / (imgRef.current?.height || 1)) * 100}%`,
                  width: `${(Math.abs(selection.x2 - selection.x1) / (imgRef.current?.width || 1)) * 100}%`,
                  height: `${(Math.abs(selection.y2 - selection.y1) / (imgRef.current?.height || 1)) * 100}%`,
                }}
              >
                <div className="absolute -top-8 left-0 bg-accent-blue text-white text-[10px] px-2 py-1 rounded-t-lg font-bold whitespace-nowrap shadow-lg">
                  {rsStockNo || mfrPN ? `Item: ${rsStockNo || mfrPN}` : "New Section"}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="p-6 border-t border-dark-600 bg-dark-900/50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="text-sm text-dark-400 flex items-center gap-2 mr-4 min-w-fit">
              <MousePointer2 size={16} />
              Drag to select
            </div>
            <div className="flex-1 max-w-xs relative">
              <input 
                type="text" 
                placeholder="Enter RS Stock No..." 
                value={rsStockNo}
                onChange={(e) => setRsStockNo(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-sm focus:border-accent-blue outline-none transition-all"
              />
              <div className="absolute -top-6 left-0 text-[10px] uppercase font-bold text-dark-500">RS Stock No</div>
            </div>
            <div className="flex-1 max-w-xs relative">
              <input 
                type="text" 
                placeholder="Enter Mfr PN..." 
                value={mfrPN}
                onChange={(e) => setMfrPN(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-sm focus:border-accent-blue outline-none transition-all"
              />
              <div className="absolute -top-6 left-0 text-[10px] uppercase font-bold text-dark-500">Mfr Part Number</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={() => {
                 if (!selection || !imgRef.current) return;
                 const canvas = document.createElement('canvas');
                 const ctx = canvas.getContext('2d');
                 const rect = imgRef.current.getBoundingClientRect();
                 const naturalWidth = imgRef.current.naturalWidth;
                 const naturalHeight = imgRef.current.naturalHeight;
                 const scaleX = naturalWidth / rect.width;
                 const scaleY = naturalHeight / rect.height;
                 const x = Math.min(selection.x1, selection.x2) * scaleX;
                 const y = Math.min(selection.y1, selection.y2) * scaleY;
                 const w = Math.abs(selection.x2 - selection.x1) * scaleX;
                 const h = Math.abs(selection.y2 - selection.y1) * scaleY;
                 canvas.width = w; canvas.height = h;
                 ctx.drawImage(imgRef.current, x, y, w, h, 0, 0, w, h);
                 const link = document.createElement('a');
                 link.download = `crop_${rsStockNo || 'manual'}_${Date.now()}.png`;
                 link.href = canvas.toDataURL('image/png');
                 link.click();
               }}
               disabled={!selection || loading}
               className="flex items-center gap-2 px-6 py-2.5 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-xl font-bold hover:bg-accent-blue/20 disabled:opacity-50 transition-all"
             >
               <Download size={18} /> Download
             </button>
             <button
               onClick={handleCrop}
               disabled={!selection || loading}
               className="flex items-center gap-2 px-8 py-2.5 bg-accent-blue rounded-xl font-bold text-white hover:bg-accent-blue/80 shadow-lg shadow-accent-blue/20 disabled:opacity-50 transition-all"
             >
               {loading ? "Processing..." : <><Scissors size={18} /> Extract & Save</>}
             </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ManualCropModal;
