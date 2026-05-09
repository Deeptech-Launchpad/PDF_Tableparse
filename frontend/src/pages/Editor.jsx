// frontend/src/pages/Editor.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { pdfService } from '../services/api';
import { 
  Maximize2, Trash2, GripVertical, Check, 
  Download, Eye, Grid3X3, List as ListIcon,
  Scissors, X, FileArchive, Square, CheckSquare,
  FileCode, LayoutDashboard, UploadCloud, Settings,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import ManualCropModal from '../components/ManualCropModal';
import JsonModal from '../components/JsonModal';
import AttributeEditor from '../components/AttributeEditor';

const Editor = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [jsonModalData, setJsonModalData] = useState(null);
  const [cardModes, setCardModes] = useState(new Map()); // id -> 'form' | 'json'
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const dragControls = useDragControls();

  const toggleRowExpand = (id) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    const res = await pdfService.list();
    const completed = res.data.filter(p => p.status === 'completed');
    setPdfs(completed);
    if (completed.length > 0) handleSelectPdf(completed[0].id);
  };

  const handleSelectPdf = async (id) => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await pdfService.getDetails(id);
      setSelectedPdf(res.data);
      // Flatten all sections from all pages
      const allSections = res.data.pages.flatMap(p => 
        p.sections.map(s => ({ ...s, pageNum: p.page_num }))
      );
      setSections(allSections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await pdfService.delete(id);
      if (selectedPdf?.id === id) {
        setSelectedPdf(null);
        setSections([]);
      }
      loadPdfs();
    } catch (err) {
      console.error("Error deleting PDF:", err);
    }
  };

  const removeSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sections.map(s => s.id)));
    }
  };

  const downloadFile = (url, filename) => {
    // Convert /output/path to /download/path
    const downloadUrl = url.replace('/output/', '/download/');
    const link = document.createElement('a');
    link.href = `http://localhost:8000${downloadUrl}`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    const paths = sections
      .filter(s => selectedIds.has(s.id))
      .map(s => s.image_path);
    
    try {
      const res = await pdfService.downloadBatch(paths);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'selected_images.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Batch download failed");
    }
  };

  const handleExport = async (type) => {
    if (!selectedPdf) return;
    try {
      const res = await pdfService.export(selectedPdf.id, type);
      const filename = `${selectedPdf.filename.split('.')[0]}_export.${type === 'excel' ? 'xlsx' : 'json'}`;
      downloadFile(res.data.file_url, filename);
    } catch (err) {
      alert("Export failed");
    }
  };

  const handleDownloadBySku = async (skuId) => {
    if (!skuId || skuId === "N/A" || skuId === "Unknown") {
      alert("No valid SKU ID found for this row");
      return;
    }
    window.open(`http://localhost:8000/download-by-sku/${skuId}`, '_blank');
  };

  const handleViewJson = (data) => {
    setJsonModalData(data);
  };

  const handleUpdatePdfSku = async (pdfId, skuId) => {
    // Update local state
    setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, sku_id: skuId } : p));
    if (selectedPdf?.id === pdfId) {
      setSelectedPdf(prev => ({ ...prev, sku_id: skuId }));
    }

    // Sync with backend
    try {
      await pdfService.updatePdf(pdfId, { sku_id: skuId });
    } catch (err) {
      console.error("Failed to update PDF SKU", err);
    }
  };

  const updateSectionField = async (sectionId, fieldKey, value) => {
    // Update local state immediately for responsiveness
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, fields: { ...s.fields, [fieldKey]: value } } : s
    ));

    // Sync with backend
    if (selectedPdf) {
      try {
        await pdfService.updateFields(selectedPdf.id, sectionId, { [fieldKey]: value });
      } catch (err) {
        console.error("Failed to sync field update", err);
      }
    }
  };

  const [skuSearch, setSkuSearch] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());

  const toggleBatchSelect = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedBatchIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBatchIds(next);
  };

  const handleBatchExport = async () => {
    if (selectedBatchIds.size === 0) {
      alert("Please select at least one PDF to export");
      return;
    }
    try {
      const res = await pdfService.exportBatch(Array.from(selectedBatchIds), 'excel');
      const filename = `consolidated_batch_export_${Date.now()}.xlsx`;
      downloadFile(res.data.file_url, filename);
    } catch (err) {
      alert("Batch export failed");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-white bg-dark-900">
      {/* PDF List Topbar */}
      <div className="h-[90px] border-b border-dark-600 flex items-center bg-dark-900 px-6 shrink-0 z-20 shadow-xl shadow-black/20">
        <div className="flex items-center gap-4 pr-8 border-r border-dark-600 shrink-0 h-10">
          <div className="p-2.5 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
            <Grid3X3 size={18} className="text-accent-blue" />
          </div>
          <div>
            <h2 className="font-black text-xs text-dark-200 uppercase tracking-[0.2em]">Processed</h2>
            <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mt-0.5">PDF Library</p>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedBatchIds.size > 0 && (
          <div className="ml-6 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="h-8 w-px bg-dark-600" />
            <button 
              onClick={handleBatchExport}
              className="flex items-center gap-3 px-6 py-2.5 bg-accent-green rounded-xl font-black text-[10px] text-white uppercase tracking-widest shadow-lg shadow-accent-green/20 hover:scale-105 transition-all"
            >
              <FileArchive size={16} />
              Consolidate Export ({selectedBatchIds.size})
            </button>
            <button 
              onClick={() => setSelectedBatchIds(new Set())}
              className="text-[10px] font-black text-dark-500 uppercase hover:text-white transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-4 px-6 h-full custom-scrollbar">
          {pdfs.map(pdf => (
            <div
              key={pdf.id}
              onClick={() => handleSelectPdf(pdf.id)}
              className={`w-[320px] shrink-0 text-left p-3.5 rounded-2xl border transition-all duration-300 group relative cursor-pointer flex flex-col justify-center ${
                selectedPdf?.id === pdf.id 
                  ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/20 shadow-lg shadow-accent-blue/10' 
                  : 'border-dark-600 bg-dark-800 hover:border-dark-400 hover:bg-dark-700/50'
              }`}
            >
              {/* Multi-Select Checkbox */}
              <div 
                onClick={(e) => toggleBatchSelect(e, pdf.id)}
                className={`absolute -top-2 -left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10 ${
                  selectedBatchIds.has(pdf.id)
                    ? 'bg-accent-green border-accent-green scale-110 shadow-lg shadow-accent-green/30'
                    : 'bg-dark-900 border-dark-600 opacity-0 group-hover:opacity-100 hover:border-accent-green'
                }`}
              >
                {selectedBatchIds.has(pdf.id) && <Check size={14} className="text-white" />}
              </div>

              <div className="flex justify-between items-center">
                <div className="truncate flex-1 pr-4">
                  <p className={`font-bold text-xs truncate ${selectedPdf?.id === pdf.id ? 'text-white' : 'text-dark-200'}`}>
                    {pdf.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-dark-400 font-bold">{pdf.pages.length} Pages</p>
                    <div className="h-3 w-px bg-dark-600" />
                    <input 
                      type="text"
                      placeholder="Doc SKU..."
                      value={pdf.sku_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdatePdfSku(pdf.id, e.target.value)}
                      className="bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1 text-[10px] font-black text-accent-blue w-24 focus:border-accent-blue outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPdf(pdf.id);
                      setIsCropModalOpen(true);
                    }}
                    className="p-2 bg-dark-700 hover:bg-accent-blue rounded-xl text-dark-400 hover:text-white transition-all shadow-sm"
                    title="Manual Crop"
                  >
                    <Scissors size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewJson(pdf);
                    }}
                    className="p-2 bg-dark-700 hover:bg-accent-blue rounded-xl text-dark-400 hover:text-white transition-all shadow-sm"
                    title="View PDF JSON"
                  >
                    <FileCode size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDeletePdf(e, pdf.id)}
                    className="p-2 bg-dark-700 hover:bg-red-500/90 rounded-xl text-dark-400 hover:text-white transition-all shadow-sm"
                    title="Delete PDF"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-col bg-dark-800 overflow-hidden relative">
        <header className="p-4 border-b border-dark-600 flex justify-between items-center bg-dark-800/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-xl tracking-tight text-dark-200">Auto Crop and Manual Crop</h2>
            <div className="h-4 w-px bg-dark-600 mx-2" />
            <div className="flex bg-dark-900 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-dark-700 text-accent-blue' : 'text-dark-400'}`}
              >
                <Grid3X3 size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-dark-700 text-accent-blue' : 'text-dark-400'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>

            {selectedIds.size > 0 && (
              <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleBatchDownload}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue rounded-xl font-bold text-sm text-white shadow-lg shadow-accent-blue/20 hover:bg-accent-blue/80 transition-all"
              >
                <FileArchive size={16} /> Download Selected ({selectedIds.size})
              </motion.button>
            )}
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={toggleSelectAll}
               className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-dark-600 rounded-xl font-bold text-sm hover:bg-dark-600 transition-all text-dark-300"
             >
               {selectedIds.size === sections.length ? <CheckSquare size={16} className="text-accent-blue" /> : <Square size={16} />}
               {selectedIds.size === sections.length ? "Deselect All" : "Select All"}
             </button>
            <button 
              onClick={() => setIsCropModalOpen(true)}
              disabled={!selectedPdf}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-dark-600 rounded-xl font-bold text-sm hover:bg-dark-600 transition-all disabled:opacity-30"
            >
              <Scissors size={16} className="text-accent-blue" /> Manual Crop
            </button>
            <button 
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-dark-600 rounded-xl font-bold text-sm hover:bg-dark-600 transition-all"
            >
              <FileCode size={16} /> JSON
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 text-accent-green border border-accent-green/20 rounded-xl font-bold text-sm hover:bg-accent-green/30 transition-all"
            >
              <Download size={16} /> Excel
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {!selectedPdf ? (
            <div className="flex-1 flex items-center justify-center text-dark-400 flex-col gap-4">
              <Eye size={64} className="opacity-10" />
              <p>Select a PDF from the sidebar to start processing</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-12">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-12 max-w-6xl mx-auto">
                  {sections.map((section) => (
                    <motion.div 
                      key={section.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`bg-dark-800 rounded-3xl border transition-all duration-300 grid grid-cols-[1fr,400px] overflow-hidden group hover:border-accent-blue/50 shadow-xl shadow-black/20 ${
                        selectedIds.has(section.id) ? 'border-accent-blue ring-2 ring-accent-blue/20' : 'border-dark-600'
                      }`}
                    >
                      {/* Left: Extraction JSON Data */}
                      <div className="flex flex-col p-10 border-r border-dark-600 bg-dark-950/40 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 px-4 py-1.5 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
                               <span className="text-[11px] uppercase tracking-[0.2em] font-black text-accent-blue">
                                 Page {section.pageNum}
                               </span>
                             </div>
                             <span className="text-[10px] text-dark-500 font-mono tracking-tighter uppercase">ID: {section.id.split('_').pop()}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleSelect(section.id); }}
                                className={`p-2.5 rounded-2xl transition-all duration-300 ${
                                  selectedIds.has(section.id) 
                                    ? 'bg-accent-blue text-white shadow-xl shadow-accent-blue/30 scale-105' 
                                    : 'bg-dark-800 text-dark-500 border border-dark-600 hover:border-accent-blue hover:text-accent-blue'
                                }`}
                              >
                                {selectedIds.has(section.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                           </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-[280px]">
                           <div className="flex items-center justify-between mb-3 px-2">
                             <span className="text-[9px] font-black text-dark-500 uppercase tracking-widest flex items-center gap-2">
                               <FileCode size={12} className="text-accent-blue" />
                               Live JSON Editor
                             </span>
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                               <span className="text-[8px] font-bold text-dark-400 uppercase tracking-tighter">Sync Active</span>
                             </div>
                           </div>
                           <div className="flex-1 relative group/json">
                             <textarea 
                               spellCheck="false"
                               className="w-full h-full bg-dark-950 rounded-2xl border border-dark-600 p-6 font-mono text-[11px] text-accent-blue/90 outline-none focus:border-accent-blue/50 focus:ring-4 focus:ring-accent-blue/5 transition-all resize-none custom-scrollbar shadow-inner leading-relaxed"
                               value={JSON.stringify(section.fields, null, 2)}
                               onChange={(e) => {
                                 try {
                                   const newData = JSON.parse(e.target.value);
                                   // Sync entire object back
                                   Object.entries(newData).forEach(([key, val]) => {
                                     updateSectionField(section.id, key, val);
                                   });
                                 } catch (err) {
                                   // Keep local text state if we had one, but here we're using controlled value from sections
                                   console.warn("Invalid JSON input");
                                 }
                               }}
                             />
                             <div className="absolute top-4 right-4 opacity-0 group-hover/json:opacity-100 transition-opacity pointer-events-none">
                               <div className="px-2 py-1 bg-dark-800/80 backdrop-blur-md rounded text-[8px] font-black text-dark-400 border border-dark-600">
                                 EDITABLE
                               </div>
                             </div>
                           </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                           <div className="flex flex-col">
                             <span className="text-[8px] font-black text-dark-500 uppercase tracking-widest mb-1">Stock ID Reference</span>
                             <p className="text-sm font-black text-dark-200">
                               {section.fields?.rs_stock_no !== 'N/A' ? section.fields?.rs_stock_no : 'Pending Identification'}
                             </p>
                           </div>
                           <button 
                             onClick={() => setJsonModalData(section)}
                             className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-xl text-[10px] font-black text-accent-blue uppercase tracking-widest hover:bg-dark-700 transition-all"
                           >
                             Full Data View
                           </button>
                        </div>
                      </div>

                      {/* Right: Premium Visual Proof */}
                      <div className="bg-[#f8fafc] relative flex flex-col p-12 items-center justify-center overflow-hidden">
                        <div className="relative w-full h-full flex items-center justify-center">
                           <img 
                            src={`http://localhost:8000${section.image_path.startsWith('/') ? '' : '/'}${section.image_path}`} 
                            alt="Visual Segment" 
                            className="max-w-full max-h-full object-contain shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-lg transition-transform duration-700 group-hover:scale-105"
                          />
                          
                          <div className="absolute inset-0 bg-dark-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 z-10">
                            <button 
                              onClick={() => setPreviewImage(section.image_path)} 
                              className="p-5 bg-accent-blue rounded-3xl text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                            >
                              <Eye size={28} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(section.image_path, `segment_${section.id}.png`);
                              }} 
                              className="p-5 bg-dark-700/80 rounded-3xl text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                              title="Download Segment Image"
                            >
                              <Download size={28} />
                            </button>
                            <button 
                              onClick={() => removeSection(section.id)} 
                              className="p-5 bg-accent-red rounded-3xl text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                            >
                              <Trash2 size={28} />
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-8 right-10 flex items-center gap-3 px-5 py-2.5 bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                          <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-sm">Extraction Match</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-dark-900 rounded-3xl border border-dark-600 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-dark-800/50 border-b border-dark-600">
                          <th className="p-4 w-12">
                            <button onClick={toggleSelectAll} className="text-dark-500 hover:text-accent-blue transition-colors">
                              {selectedIds.size === sections.length ? <CheckSquare size={20} className="text-accent-blue" /> : <Square size={20} />}
                            </button>
                          </th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">Image</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-center w-40 min-w-[160px]">RS Stock No</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-center w-40 min-w-[160px]">Mfr PN</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">Manufacturer</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">Description</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">Category</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">PDF Name</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-center">Page</th>
                          <th className="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sections.map((section) => (
                          <React.Fragment key={section.id}>
                            <tr 
                              className={`border-b border-dark-600/50 hover:bg-dark-800/30 transition-colors group ${
                                selectedIds.has(section.id) ? 'bg-accent-blue/5' : ''
                              }`}
                            >
                              <td className="p-4 flex items-center gap-2">
                                <button 
                                  onClick={() => toggleRowExpand(section.id)}
                                  className="p-1 hover:bg-dark-700 rounded text-dark-500 hover:text-accent-blue transition-all"
                                >
                                  {expandedRows.has(section.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <button 
                                  onClick={() => toggleSelect(section.id)}
                                  className={`transition-colors ${selectedIds.has(section.id) ? 'text-accent-blue' : 'text-dark-700 hover:text-dark-500'}`}
                                >
                                  {selectedIds.has(section.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                              </td>
                              <td className="p-4">
                                <div className="w-16 h-10 rounded-lg bg-white overflow-hidden border border-dark-600 flex items-center justify-center p-1 cursor-pointer" onClick={() => setPreviewImage(section.image_path)}>
                                  <img src={`http://localhost:8000${section.image_path}`} alt="thumb" className="max-w-full max-h-full object-contain" />
                                </div>
                              </td>
                              <td className="p-4 w-40">
                                <input 
                                  type="text"
                                  value={(section.fields?.rs_stock_no === 'N/A' ? '' : section.fields?.rs_stock_no) || ''}
                                  onChange={(e) => updateSectionField(section.id, 'rs_stock_no', e.target.value)}
                                  className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-bold text-white w-full focus:border-accent-blue outline-none text-center shadow-inner"
                                  placeholder="No..."
                                />
                              </td>
                              <td className="p-4 w-40">
                                <input 
                                  type="text"
                                  value={(section.fields?.mfr_pn === 'N/A' ? '' : section.fields?.mfr_pn) || ''}
                                  onChange={(e) => updateSectionField(section.id, 'mfr_pn', e.target.value)}
                                  className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-dark-200 w-full focus:border-accent-blue outline-none text-center shadow-inner"
                                  placeholder="PN..."
                                />
                              </td>
                              <td className="p-4 text-sm text-dark-300">
                                 {section.fields?.mfr_name === 'Unknown' ? '-' : section.fields?.mfr_name || '-'}
                              </td>
                              <td className="p-4 text-sm text-dark-400 max-w-xs truncate">{section.fields?.short_desc || section.text || '-'}</td>
                              <td className="p-4 text-sm text-dark-400">
                                <span className="px-2 py-1 bg-dark-800 rounded text-[10px] font-bold text-dark-300 whitespace-nowrap">
                                  {section.fields?.category || 'General'}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-dark-500 truncate max-w-[120px]">{selectedPdf.filename}</td>
                              <td className="p-4 text-sm text-dark-500 text-center font-bold">{section.pageNum}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setPreviewImage(section.image_path)}
                                    className="p-1.5 text-dark-400 hover:text-accent-blue transition-colors"
                                    title="View Full Size"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleViewJson(section)}
                                    className="p-1.5 text-dark-400 hover:text-accent-blue transition-colors"
                                    title="View JSON"
                                  >
                                    <FileCode size={16} />
                                  </button>
                                  <button 
                                    onClick={() => removeSection(section.id)}
                                    className="p-1.5 text-dark-400 hover:text-accent-red transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedRows.has(section.id) && (
                              <tr className="bg-dark-900/40 border-b border-dark-600/50">
                                <td colSpan={10} className="p-4 pl-16">
                                  <AttributeEditor 
                                    fields={section.fields} 
                                    onUpdate={(key, val) => updateSectionField(section.id, key, val)} 
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isCropModalOpen && selectedPdf && (
        <ManualCropModal 
          pdf={selectedPdf} 
          onClose={() => setIsCropModalOpen(false)}
          onCropSuccess={(newSection, pageNum) => {
            setSections(prev => [...prev, { ...newSection, pageNum }]);
          }}
        />
      )}

      {/* Image Preview Lightbox - High Priority */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-12 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-accent-red rounded-full text-white transition-all z-[10000]"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            >
              <X size={28} />
            </button>
            <img 
              src={`http://localhost:8000${previewImage}`} 
              alt="Full Preview" 
              className="max-w-full max-h-[85vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-0 right-0 text-center text-dark-400 text-sm font-medium">
              Click anywhere outside to close
            </div>
          </div>
        </div>
      )}

      {/* JSON Preview Modal */}
      {jsonModalData && (
        <JsonModal 
          data={jsonModalData} 
          onClose={() => setJsonModalData(null)} 
        />
      )}
    </div>
  );
};

export default Editor;
