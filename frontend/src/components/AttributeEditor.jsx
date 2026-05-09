// frontend/src/components/AttributeEditor.jsx
import React from 'react';
import { Plus, Trash2, Settings2 } from 'lucide-react';

const AttributeEditor = ({ fields, onUpdate }) => {
  const attributes = [];
  for (let i = 1; i <= 10; i++) {
    if (fields[`attr_${i}`] || fields[`val_${i}`]) {
      attributes.push({
        id: i,
        name: fields[`attr_${i}`] || '',
        value: fields[`val_${i}`] || ''
      });
    }
  }

  const handleUpdate = (id, key, val) => {
    onUpdate(`attr_${id}`, key);
    onUpdate(`val_${id}`, val);
  };

  const addAttribute = () => {
    const nextId = attributes.length + 1;
    if (nextId <= 10) {
      handleUpdate(nextId, 'New Attr', '');
    }
  };

  const removeAttribute = (id) => {
    onUpdate(`attr_${id}`, '');
    onUpdate(`val_${id}`, '');
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-dark-900/50 rounded-xl border border-dark-600/30 mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-dark-500 uppercase tracking-widest flex items-center gap-1">
          <Settings2 size={10} />
          Technical Specs
        </span>
        <button 
          onClick={addAttribute}
          className="p-1 hover:bg-dark-700 rounded text-accent-blue transition-all"
          title="Add Specification"
        >
          <Plus size={14} />
        </button>
      </div>
      
      <div className="space-y-1.5">
        {attributes.length === 0 ? (
          <p className="text-[10px] text-dark-500 italic py-1 px-1">No specs extracted</p>
        ) : (
          attributes.map((attr) => (
            <div key={attr.id} className="grid grid-cols-[1fr,1.2fr,auto] gap-2 items-center group">
              <input 
                type="text"
                value={attr.name}
                onChange={(e) => handleUpdate(attr.id, e.target.value, attr.value)}
                placeholder="Attribute..."
                className="w-full bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] font-bold text-dark-300 focus:border-accent-blue outline-none transition-all"
              />
              <div className="flex items-center gap-1">
                <input 
                  type="text"
                  value={attr.value}
                  onChange={(e) => handleUpdate(attr.id, attr.name, e.target.value)}
                  placeholder="Value..."
                  className="w-full bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white focus:border-accent-blue outline-none transition-all"
                />
                <button 
                  onClick={() => removeAttribute(attr.id)}
                  className="p-1 text-dark-600 hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AttributeEditor;
