// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { pdfService } from '../services/api';
import { FileText, Clock, CheckCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPdfs();
    const interval = setInterval(fetchPdfs, 5000); // Polling for status
    return () => clearInterval(interval);
  }, []);

  const fetchPdfs = async () => {
    try {
      const res = await pdfService.list();
      setPdfs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PDF?")) return;
    try {
      await pdfService.delete(id);
      fetchPdfs();
    } catch (err) {
      console.error("Failed to delete PDF:", err);
      alert("Failed to delete PDF");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      processing: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
      completed: 'bg-accent-green/10 text-accent-green border-accent-green/20',
      error: 'bg-accent-red/10 text-accent-red border-accent-red/20',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-dark-700'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2 text-dark-200">Workspace Dashboard</h1>
        <p className="text-dark-300">Manage and track your active PDF processing jobs.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Active Jobs" value={pdfs.filter(p => p.status === 'processing').length} icon={Clock} color="text-accent-blue" />
        <StatCard title="Completed" value={pdfs.filter(p => p.status === 'completed').length} icon={CheckCircle} color="text-accent-green" />
        <StatCard title="Total Files" value={pdfs.length} icon={FileText} color="text-white" />
      </div>

      <div className="bg-dark-800 rounded-3xl border border-dark-600 overflow-hidden">
        <div className="p-6 border-b border-dark-600 flex justify-between items-center bg-dark-900/30">
          <h2 className="font-bold text-dark-200">Recent Uploads</h2>
          <button onClick={fetchPdfs} className="text-xs text-accent-blue hover:underline font-bold">Refresh</button>
        </div>
        
        <div className="divide-y divide-dark-600">
          {pdfs.length === 0 ? (
            <div className="p-20 text-center text-dark-400">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No PDFs uploaded yet. Head to the Upload page to start.</p>
            </div>
          ) : (
            pdfs.map((pdf) => (
              <div key={pdf.id} className="p-4 flex items-center justify-between hover:bg-dark-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-dark-900 rounded-2xl text-accent-blue">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-200">{pdf.filename}</h3>
                    <p className="text-xs text-dark-400 font-mono">ID: {pdf.id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {getStatusBadge(pdf.status)}
                  <div className="flex gap-2">
                    <button 
                      disabled={pdf.status !== 'completed'}
                      className="p-2 hover:text-accent-blue disabled:opacity-20 transition-colors"
                    >
                      <ExternalLink size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(pdf.id)}
                      className="p-2 text-dark-400 hover:text-accent-red transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-dark-800 p-6 rounded-3xl border border-dark-600 shadow-lg shadow-black/20 hover:shadow-black/40 transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 bg-dark-900 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
    </div>
    <p className="text-3xl font-bold mb-1 text-dark-200">{value}</p>
    <p className="text-sm text-dark-400 font-medium uppercase tracking-wider">{title}</p>
  </div>
);

export default Dashboard;
