// frontend/src/components/JsonModal.jsx
import React from 'react';
import { X, Copy, Check, Download } from 'lucide-react';

const JsonModal = ({ data, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  
  // Directly use the fields if it's a section, otherwise use the whole data
  const formattedData = React.useMemo(() => {
    if (data.fields) return data.fields;
    return data;
  }, [data]);

  const jsonString = JSON.stringify(formattedData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `extraction_data.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-8 animate-in fade-in duration-200">
      <div className="bg-dark-800 w-full max-w-4xl max-h-[80vh] flex flex-col rounded-3xl border border-dark-600 overflow-hidden shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200">
        <header className="p-6 border-b border-dark-600 flex justify-between items-center bg-dark-900/50">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-yellow" />
              JSON Data Preview
            </h3>
            <p className="text-dark-400 text-sm">Use this JSON with your PDF Generation tool</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleDownload}
               className="flex items-center gap-2 px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 rounded-xl transition-all text-sm font-bold text-accent-blue"
               title="Download JSON file"
             >
               <Download size={16} />
               Download
             </button>
             <button 
               onClick={handleCopy}
               className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-xl transition-all text-sm font-bold text-dark-200"
             >
               {copied ? <><Check size={16} className="text-accent-green" /> Copied!</> : <><Copy size={16} /> Copy JSON</>}
             </button>
             <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-full transition-all text-dark-400 hover:text-white">
               <X size={24} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-dark-900/30">
          <pre className="text-xs md:text-sm font-mono text-accent-yellow/90 leading-relaxed whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </div>

        <footer className="p-4 border-t border-dark-600 bg-dark-900/50 text-center text-[10px] uppercase font-bold text-dark-500 tracking-widest">
          Optimized for External PDF Generation Tools
        </footer>
      </div>
    </div>
  );
};

export default JsonModal;
