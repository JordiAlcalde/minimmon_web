import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Package, Save } from 'lucide-react';

export default function GrupsManager({ grups, setGrups, materials, isDark }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGrup, setEditingGrup] = useState(null);
  const [formData, setFormData] = useState({ grup: '' });

  const handleOpenCreate = () => {
    setEditingGrup(null);
    setFormData({ grup: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (g) => {
    setEditingGrup(g);
    setFormData({ ...g });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    const associatedMaterials = materials.filter(m => m.grupId === id);
    if (associatedMaterials.length > 0) {
      alert(`No es pot eliminar aquest grup perquè té ${associatedMaterials.length} materials associats.`);
      return;
    }
    if (window.confirm('Estàs segur que vols eliminar aquest grup de materials?')) {
      setGrups(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.grup.trim()) return;

    if (editingGrup) {
      setGrups(prev => prev.map(g => g.id === editingGrup.id ? { ...formData, id: g.id } : g));
    } else {
      const newId = `grup-${Date.now()}`;
      setGrups(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            Grups & Tipus de Materials
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorització i classificació dels materials del magatzem.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Grup
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...grups]
          .sort((a, b) => (a.grup || '').localeCompare(b.grup || '', 'ca', { sensitivity: 'base' }))
          .map(g => {
            const count = materials.filter(m => m.grupId === g.id).length;

          return (
            <div
              key={g.id}
              className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${
                isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-sm font-serif">{g.grup}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <Package className="w-3 h-3 text-amber-500" />
                    <span>{count} material{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(g)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Layers className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingGrup ? 'Editar Grup' : 'Crear Nou Grup'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="grup-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Grup"
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

            <form id="grup-modal-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom del Grup / Categoria *</label>
                <input
                  type="text"
                  required
                  value={formData.grup}
                  onChange={(e) => setFormData({ ...formData, grup: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Fustes i Xapes"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
