// frontend/src/pages/Upload.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, File, X, Check, Loader2, Link } from 'lucide-react';
import { pdfService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [urlUploading, setUrlUploading] = useState(false);
  const navigate = useNavigate();

  const onDrop = useCallback(acceptedFiles => {
    const pdfs = acceptedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfs]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const removeFile = (name) => {
    setFiles(files.filter(f => f.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await pdfService.upload(files);
      navigate('/');
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!url) return;
    setUrlUploading(true);
    try {
      await pdfService.uploadUrl(url);
      navigate('/');
    } catch (err) {
      alert("URL upload failed: " + err.message);
    } finally {
      setUrlUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black mb-4 text-dark-200">Ingest Documents</h1>
        <p className="text-dark-300 max-w-xl mx-auto text-lg">
          Upload your technical PDFs, catalogs, or datasheets. Our OpenCV engine will automatically segment them into processed blocks.
        </p>
      </header>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-3xl p-16 transition-all duration-300 cursor-pointer text-center ${
          isDragActive ? 'border-accent-blue bg-accent-blue/5' : 'border-dark-600 bg-dark-800/50 hover:bg-dark-800'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6 text-accent-blue shadow-inner">
          <UploadIcon size={40} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-dark-200">Drag & drop PDFs here</h2>
        <p className="text-dark-300 font-medium">or click to browse from your computer</p>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <Link size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            type="text" 
            placeholder="Or enter PDF URL (e.g., https://example.com/datasheet.pdf)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-dark-900 border border-dark-600 rounded-2xl pl-14 pr-6 py-4 font-bold text-dark-200 focus:border-accent-blue outline-none transition-all shadow-inner"
          />
        </div>
        <button 
          onClick={handleUrlUpload}
          disabled={!url || urlUploading}
          className="px-8 py-4 bg-dark-700 hover:bg-accent-blue rounded-2xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-dark-700 flex items-center gap-2"
        >
          {urlUploading ? <Loader2 size={24} className="animate-spin" /> : 'Fetch URL'}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-10 space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="font-bold text-dark-200">{files.length} Files Ready</h3>
            <button 
              onClick={() => setFiles([])}
              className="text-sm text-accent-red hover:underline"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div key={file.name} className="bg-dark-800 p-4 rounded-2xl border border-dark-600 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-dark-900 rounded-lg text-accent-blue flex-shrink-0">
                    <File size={18} />
                  </div>
                  <span className="truncate font-medium text-sm">{file.name}</span>
                </div>
                <button onClick={() => removeFile(file.name)} className="p-1 hover:text-accent-red transition-colors">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-8 bg-accent-blue py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Uploading & Initializing...
              </>
            ) : (
              <>
                <Check size={24} />
                Start Processing
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;
