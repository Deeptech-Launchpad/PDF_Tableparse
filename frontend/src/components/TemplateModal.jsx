// frontend/src/components/TemplateModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Layout, Plus } from 'lucide-react';
import { pdfService } from '../services/api';

const TemplateModal = ({ onClose, onSelect, selectedId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await pdfService.listTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await pdfService.uploadTemplate(file);
      await loadTemplates();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90 backdrop-blur-md p-8">
      <div className="bg-dark-800 w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-dark-600 overflow-hidden shadow-2xl">
        <header className="p-8 border-b border-dark-600 flex justify-between items-center bg-dark-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-blue/10 rounded-2xl flex items-center justify-center">
              <Layout className="text-accent-blue" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">PDF Templates</h3>
              <p className="text-dark-400 font-medium">Select a background for your PDF generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-dark-700 rounded-full transition-all text-dark-400 hover:text-white">
            <X size={28} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-3 gap-6">
            {/* Upload New Card */}
            <label className="relative group cursor-pointer aspect-[1.414/1] rounded-2xl border-2 border-dashed border-dark-600 hover:border-accent-blue/50 flex flex-col items-center justify-center gap-4 transition-all hover:bg-accent-blue/5 bg-dark-900/30 overflow-hidden">
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase text-accent-blue">Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="text-dark-300" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-dark-200 uppercase tracking-widest">Add Template</p>
                    <p className="text-[10px] text-dark-500 font-bold mt-1">PNG or JPG Recommended</p>
                  </div>
                </>
              )}
            </label>

            {/* Template List */}
            {templates.map((t) => (
              <div 
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={`group relative aspect-[1.414/1] rounded-2xl border-2 cursor-pointer transition-all overflow-hidden ${
                  selectedId === t.id ? 'border-accent-blue shadow-lg shadow-accent-blue/20' : 'border-dark-600 hover:border-dark-400'
                }`}
              >
                <img 
                  src={`http://localhost:8000${t.url}`} 
                  alt="Template" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter truncate max-w-[70%]">
                    {t.id}
                  </span>
                  {selectedId === t.id && (
                    <div className="w-6 h-6 bg-accent-blue rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {loading && templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <div className="w-12 h-12 border-4 border-dark-600 border-t-dark-300 rounded-full animate-spin mb-4" />
               <p className="font-black uppercase text-xs tracking-widest">Loading Library...</p>
            </div>
          )}
        </div>

        <footer className="p-6 border-t border-dark-600 bg-dark-900/50 flex justify-end gap-4">
           <button 
             onClick={() => onSelect(null)}
             className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
               selectedId === null ? 'bg-dark-500 text-white' : 'text-dark-400 hover:text-white'
             }`}
           >
             No Template (Default)
           </button>
           <button 
             onClick={onClose}
             className="px-10 py-3 bg-accent-blue rounded-xl font-black text-xs text-white uppercase tracking-widest shadow-xl shadow-accent-blue/20 hover:bg-accent-blue/80 transition-all active:scale-95"
           >
             Finish Setup
           </button>
        </footer>
      </div>
    </div>
  );
};

export default TemplateModal;
