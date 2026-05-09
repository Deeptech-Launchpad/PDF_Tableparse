// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Editor from './pages/Editor';
import ManualCrop from './pages/ManualCrop';

function App() {
  return (
    <Router>
      <div className="flex w-full min-h-screen bg-dark-900 text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/manual-crop" element={<ManualCrop />} />
            <Route path="/export" element={<Editor />} />
            <Route path="/settings" element={<div className="p-10">Settings coming soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
