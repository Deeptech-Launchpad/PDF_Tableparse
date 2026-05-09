// frontend/src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Download, Settings, Scissors } from 'lucide-react';

const Sidebar = () => {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload PDFs' },
    { to: '/editor', icon: FileText, label: 'Auto Crop' },
    { to: '/manual-crop', icon: Scissors, label: 'Manual Crop' },
    { to: '/export', icon: Download, label: 'Export' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-600 h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold">
          P
        </div>
        <h1 className="text-xl font-bold tracking-tight text-dark-200">PDF Processor</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                  : 'text-dark-400 hover:bg-dark-700 hover:text-white'
              }`
            }
          >
            <link.icon size={20} />
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="mt-auto p-4 bg-dark-900 rounded-2xl border border-dark-600">
        <p className="text-xs text-dark-400 uppercase font-bold mb-2 tracking-widest">System Status</p>
        <div className="flex items-center gap-2 text-sm text-accent-green">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          Online
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
