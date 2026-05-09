// frontend/src/pages/ManualCrop.jsx
import React, { useState, useEffect } from 'react';
import { pdfService } from '../services/api';
import { 
  Scissors, Eye, FileCode, CheckCircle2,
  ChevronRight, Search, FileText, Trash2, Download,
  Check, FileArchive
} from 'lucide-react';
import ManualCropModal from '../components/ManualCropModal';
import JsonModal from '../components/JsonModal';
import TemplateModal from '../components/TemplateModal';
import { Layout } from 'lucide-react';

const ManualCrop = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [jsonModalData, setJsonModalData] = useState(null);
  const [cardModes, setCardModes] = useState(new Map()); // id -> 'form' | 'json'
  const [search, setSearch] = useState("");
  const [lastCrop, setLastCrop] = useState(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    const res = await pdfService.list();
    setPdfs(res.data.filter(p => p.status === 'completed'));
  };

  const handleSelectPdf = async (id) => {
    setLoading(true);
    try {
      const res = await pdfService.getDetails(id);
      setSelectedPdf(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchSelect = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedBatchIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBatchIds(next);
  };

  const handleBatchManualExport = async () => {
    if (selectedBatchIds.size === 0) return;
    try {
      const res = await pdfService.exportBatch(Array.from(selectedBatchIds), 'excel', true);
      const filename = `consolidated_manual_batch_${Date.now()}.xlsx`;
      
      const link = document.createElement('a');
      link.href = `http://localhost:8000${res.data.file_url}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Batch Export failed");
    }
  };

  const handleDeletePdf = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await pdfService.delete(id);
      if (selectedPdf?.id === id) {
        setSelectedPdf(null);
      }
      loadPdfs();
    } catch (err) {
      console.error("Error deleting PDF:", err);
    }
  };

  const handleManualExport = async () => {
    if (!selectedPdf) return;
    try {
      const res = await pdfService.export(selectedPdf.id, 'excel', true);
      const filename = `${selectedPdf.filename.split('.')[0]}_Manual_Export.xlsx`;
      const link = document.createElement('a');
      link.href = `http://localhost:8000${res.data.file_url}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Manual Export failed");
    }
  };

  const handleBuildPdf = async (fields) => {
    try {
      const res = await pdfService.generatePdf(fields, selectedTemplateId);
      const link = document.createElement('a');
      link.href = `http://localhost:8000${res.data.file_url}`;
      link.setAttribute('download', `report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("PDF Build failed");
    }
  };

  const handleDownloadJson = (section) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(section.fields, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `segment_${section.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredPdfs = pdfs.filter(p => 
    p.filename.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku_id && p.sku_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden text-white bg-dark-900">
      {/* PDF Selection Topbar */}
      <div className="h-[90px] border-b border-dark-600 flex items-center bg-dark-800 px-6 shrink-0 z-20 shadow-xl shadow-black/20">
        <div className="flex flex-col justify-center gap-2 pr-8 border-r border-dark-600 shrink-0 h-full w-[300px]">
          <h2 className="font-black text-xs flex items-center gap-2 text-dark-200 uppercase tracking-widest">
            <FileText size={16} className="text-accent-blue" />
            PDF Library
          </h2>
          <div className="relative w-full">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input 
              type="text" 
              placeholder="Search PDFs or SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-8 pr-3 py-1.5 text-[10px] focus:border-accent-blue outline-none transition-all text-dark-200 shadow-inner font-bold"
            />
          </div>
        </div>

        {/* Batch Actions */}
        {selectedBatchIds.size > 0 && (
          <div className="ml-6 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="h-8 w-px bg-dark-600" />
            <button 
              onClick={handleBatchManualExport}
              className="flex items-center gap-3 px-6 py-2.5 bg-accent-green rounded-xl font-black text-[10px] text-white uppercase tracking-widest shadow-lg shadow-accent-green/20 hover:scale-105 transition-all"
            >
              <FileArchive size={16} />
              Consolidate Manual Export ({selectedBatchIds.size})
            </button>
            <button 
              onClick={() => setSelectedBatchIds(new Set())}
              className="text-[10px] font-black text-dark-500 uppercase hover:text-white transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}

        <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-3 px-6 h-full custom-scrollbar">
          {filteredPdfs.map(pdf => (
            <button
              key={pdf.id}
              onClick={() => handleSelectPdf(pdf.id)}
              className={`w-[260px] shrink-0 text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between group relative ${
                selectedPdf?.id === pdf.id 
                  ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/20 shadow-lg shadow-accent-blue/10' 
                  : 'border-dark-600 bg-dark-900 hover:border-dark-400 hover:bg-dark-700/50'
              }`}
            >
              {/* Multi-Select Checkbox */}
              <div 
                onClick={(e) => toggleBatchSelect(e, pdf.id)}
                className={`absolute -top-1 -left-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all z-10 ${
                  selectedBatchIds.has(pdf.id)
                    ? 'bg-accent-green border-accent-green scale-110 shadow-lg shadow-accent-green/30'
                    : 'bg-dark-900 border-dark-600 opacity-0 group-hover:opacity-100 hover:border-accent-green'
                }`}
              >
                {selectedBatchIds.has(pdf.id) && <Check size={12} className="text-white" />}
              </div>
              <div className="truncate flex-1 pr-4">
                <p className={`font-black text-[11px] truncate ${selectedPdf?.id === pdf.id ? 'text-white' : 'text-dark-200'}`}>
                  {pdf.filename}
                </p>
                <p className="text-[9px] text-dark-500 mt-1 uppercase tracking-widest font-bold">
                  SKU: <span className={pdf.sku_id ? "text-accent-blue" : ""}>{pdf.sku_id || "Unassigned"}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleDeletePdf(e, pdf.id)}
                  className="p-1.5 rounded-lg bg-dark-800 text-dark-500 hover:text-white hover:bg-red-500/90 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  title="Delete PDF"
                >
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={16} className={`transition-transform ${selectedPdf?.id === pdf.id ? 'translate-x-1 text-accent-blue' : 'text-dark-600'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Crop Workspace */}
      <div className="flex-1 flex flex-col bg-dark-900 overflow-hidden relative">
        {!selectedPdf ? (
          <div className="flex-1 flex items-center justify-center text-dark-400 flex-col gap-6">
            <div className="p-8 rounded-full bg-white border border-dark-600 shadow-xl shadow-slate-200/50">
              <Scissors size={64} className="text-accent-blue/20" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black text-dark-200 mb-2">Manual Crop Mode</h3>
              <p className="text-dark-400 font-medium">Select a document from the library to start manual selection</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-10">
              <div className="bg-dark-800 rounded-3xl border border-dark-600 p-10 shadow-xl shadow-black/20">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-accent-blue mb-3 block">Document Context</span>
                    <h1 className="text-4xl font-black text-dark-200">{selectedPdf.filename}</h1>
                    <p className="text-dark-400 mt-3 flex items-center gap-2 font-medium">
                      {selectedPdf.pages.length} Pages • SKU: <span className="text-accent-blue font-bold px-2 py-0.5 bg-accent-blue/10 rounded-lg">{selectedPdf.sku_id || "N/A"}</span>
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsTemplateModalOpen(true)}
                      className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all active:scale-95 border ${
                        selectedTemplateId 
                          ? 'bg-accent-yellow/10 border-accent-yellow text-accent-yellow' 
                          : 'bg-dark-700 border-dark-600 text-dark-200 hover:bg-dark-600'
                      }`}
                      title={selectedTemplateId ? `Template: ${selectedTemplateId}` : "Select PDF Template"}
                    >
                      <Layout size={20} />
                      {selectedTemplateId ? "Template Active" : "Config Template"}
                    </button>
                    <button 
                      onClick={handleManualExport}
                      className="flex items-center gap-3 px-8 py-4 bg-dark-700 border border-dark-600 rounded-2xl font-black text-dark-200 hover:bg-dark-600 transition-all active:scale-95 shadow-xl shadow-black/10"
                    >
                      <Download size={20} className="text-accent-green" />
                      Export Manual Only
                    </button>
                    <button 
                      onClick={() => setIsCropModalOpen(true)}
                      className="flex items-center gap-3 px-10 py-4 bg-accent-blue rounded-2xl font-black text-white shadow-xl shadow-accent-blue/20 hover:bg-accent-blue/80 transition-all active:scale-95"
                    >
                      <Scissors size={20} />
                      Launch Selection Mode
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="p-6 bg-dark-700/30 rounded-2xl border border-dark-600">
                    <p className="text-[10px] font-black text-dark-500 uppercase mb-3">Doc Status</p>
                    <div className="flex items-center gap-2 text-accent-green font-black">
                      <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                      Active
                    </div>
                  </div>
                  <div className="p-6 bg-dark-700/30 rounded-2xl border border-dark-600">
                    <p className="text-[10px] font-black text-dark-500 uppercase mb-3">Extracted Points</p>
                    <div className="text-2xl font-black text-dark-200">
                      {selectedPdf.pages.reduce((acc, p) => acc + p.sections.length, 0)}
                    </div>
                  </div>
                  <div className="p-6 bg-dark-700/30 rounded-2xl border border-dark-600">
                    <p className="text-[10px] font-black text-dark-500 uppercase mb-3">Process Info</p>
                    <div className="text-dark-200 font-black uppercase tracking-wide text-xs">Manual Feed</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between border-b border-dark-600 pb-6">
                  <h4 className="font-black text-2xl text-dark-200 flex items-center gap-3">
                    <div className="w-2 h-8 bg-accent-blue rounded-full" />
                    Live Data Feed
                    <span className="text-xs font-black text-accent-blue bg-accent-blue/10 px-3 py-1 rounded-xl ml-4">
                      {selectedPdf.pages.flatMap(p => p.sections).filter(s => s.id.startsWith('manual_') || s.image_path?.includes('manual_')).length} Manual Selections
                    </span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {selectedPdf.pages.flatMap(p => p.sections).filter(s => s.id.startsWith('manual_') || s.image_path?.includes('manual_')).length === 0 ? (
                    <div className="bg-dark-800 rounded-3xl border border-dashed border-dark-600 p-24 flex flex-col items-center gap-6 text-center">
                      <div className="p-6 bg-dark-700/30 rounded-3xl text-dark-400">
                        <Scissors size={64} className="opacity-20" />
                      </div>
                      <div>
                        <h5 className="text-xl font-black text-dark-200 mb-2">No manual extractions yet</h5>
                        <p className="text-dark-400 text-sm max-w-sm leading-relaxed">
                          This feed only displays sections created via manual selection. 
                          Launch the selection mode to start.
                        </p>
                      </div>
                    </div>
                  ) : (
                    selectedPdf.pages.flatMap(p => p.sections)
                      .filter(s => s.id.startsWith('manual_') || s.image_path?.includes('manual_'))
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .map((section) => (
                      <div key={section.id} className="bg-dark-800 rounded-3xl border border-dark-600 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 grid grid-cols-[1fr,350px] h-80 group">
                         {/* Left: JSON & Metadata */}
                         <div className="flex flex-col p-8 bg-dark-950/50 border-r border-dark-600 overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-5 bg-accent-blue rounded-full" />
                                 <span className="text-xs font-black text-dark-200 uppercase tracking-widest">
                                   Extraction Segment
                                 </span>
                               </div>
                               <span className="text-[10px] text-dark-500 font-mono bg-dark-900 px-3 py-1 rounded-full border border-dark-600">
                                 PAGE {section.pageNum} • {section.id.split('_').pop()}
                               </span>
                            </div>
                            
                            <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[10px] text-dark-300 bg-dark-950 p-5 rounded-2xl border border-dark-600 shadow-inner">
                               <pre className="leading-relaxed">
                                 {JSON.stringify(section.fields, null, 2)}
                               </pre>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                               <p className="text-sm font-black text-dark-200">
                                 {section.fields?.rs_stock_no !== 'N/A' ? section.fields?.rs_stock_no : 'Manual ID Pending'}
                               </p>
                               <button 
                                 onClick={() => setJsonModalData(section)}
                                 className="text-[10px] font-black text-accent-blue hover:underline uppercase tracking-widest"
                               >
                                 Expand Full Data
                               </button>
                            </div>
                         </div>

                         {/* Right: Image Preview */}
                         <div className="bg-white relative p-6 flex items-center justify-center overflow-hidden">
                           {section.image_path ? (
                             <img 
                               src={`http://localhost:8000${section.image_path.startsWith('/') ? '' : '/'}${section.image_path}`} 
                               alt="Manual Crop" 
                               className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                             />
                           ) : (
                             <div className="flex flex-col items-center gap-2 text-dark-500">
                               <Scissors size={32} className="opacity-20" />
                               <span className="text-[8px] font-black uppercase">No Image Data</span>
                             </div>
                           )}
                           
                           <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => handleBuildPdf(section.fields)}
                                 className="w-10 h-10 bg-accent-blue text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-accent-blue/80 transition-all active:scale-90"
                                 title="Build PDF from this data"
                               >
                                 <FileText size={18} />
                               </button>
                              <button 
                                onClick={() => {
                                  const link = document.createElement('a');
                                  const downloadUrl = section.image_path.replace('/output/', '/download/');
                                  link.href = `http://localhost:8000${downloadUrl}`;
                                  link.setAttribute('download', `manual_crop_${section.id}.png`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.parentNode.removeChild(link);
                                }}
                                className="p-3 bg-accent-blue rounded-2xl text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                                title="Download Image"
                              >
                                <Download size={20} />
                              </button>
                              <button 
                                onClick={() => setJsonModalData(section)}
                                className="p-3 bg-dark-800 rounded-2xl text-accent-blue shadow-xl border border-dark-600 hover:scale-110 active:scale-95 transition-all"
                              >
                                <FileCode size={20} />
                              </button>
                           </div>
                           <div className="absolute bottom-4 right-6 px-3 py-1 bg-dark-900/80 backdrop-blur-md rounded-lg text-[8px] font-black text-dark-400 uppercase tracking-widest border border-dark-600">
                             Manual Selection
                           </div>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isTemplateModalOpen && (
        <TemplateModal 
          selectedId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}

      {isCropModalOpen && selectedPdf && (
        <ManualCropModal 
          pdf={selectedPdf} 
          onClose={() => setIsCropModalOpen(false)}
          onCropSuccess={(newSection) => {
            setIsCropModalOpen(false);
            // Refresh the selected PDF to show the new section
            if (selectedPdf) {
              handleSelectPdf(selectedPdf.id);
            }
          }}
        />
      )}

      {jsonModalData && (
        <JsonModal 
          data={jsonModalData} 
          onClose={() => setJsonModalData(null)} 
        />
      )}
    </div>
  );
};

export default ManualCrop;
