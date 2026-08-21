import React, { useState } from 'react';
import { Wrench, Plus, Search, Edit2, Trash2, Clock, DollarSign, Activity, X, Save } from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';

export default function OperacionsManager({ operacions, setOperacions, isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperacio, setEditingOperacio] = useState(null);

  const [formData, setFormData] = useState({
    operacio: '',
    descripcio: '',
    preuHora: 0
  });

  const handleOpenCreate = () => {
    setEditingOperacio(null);
    setFormData({ operacio: '', descripcio: '', preuHora: 0 });
    setModalOpen(true);
  };

  const handleOpenEdit = (op) => {
    setEditingOperacio(op);
    setFormData({ ...op });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta operació de producció?')) {
      setOperacions(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.operacio.trim()) return;

    if (editingOperacio) {
      setOperacions(prev => prev.map(o => o.id === editingOperacio.id ? { ...formData, id: o.id } : o));
    } else {
      const newId = getNextSequentialId('op', operacions);
      setOperacions(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredOperacions = operacions
    .filter(o =>
      o.operacio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.descripcio?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.operacio || '').localeCompare(b.operacio || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            Operacions & Maniobres de Producció
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió de procediments de tall, assemblatge, disseny i el seu cost d'hora de mà d'obra.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Operació
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom d'operació o descripció..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOperacions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap operació registrada.
          </div>
        ) : (
          filteredOperacions.map(op => (
            <div 
              key={op.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm font-serif">{op.operacio}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {op.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(op)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(op.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-3">{op.descripcio}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mà d'obra artesana</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Preu / Hora</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {Number(op.preuHora || 0).toFixed(2)} €/h
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Wrench className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingOperacio ? 'Editar Operació' : 'Crear Nova Operació'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="op-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Operació"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                  title="Tancar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form id="op-modal-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom de l'Operació *</label>
                <input
                  type="text"
                  required
                  value={formData.operacio}
                  onChange={(e) => setFormData({ ...formData, operacio: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Ensamble i Calibrat Manual"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Descripció del Procediment</label>
                <textarea
                  rows="3"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Detalls del procés de fabricació..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Preu Hora de Mà d'Obra (€/h)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.preuHora}
                  onChange={(e) => setFormData({ ...formData, preuHora: parseFloat(e.target.value) || 0 })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
