import React, { useState } from 'react';
import { Factory, Plus, Search, Edit2, Trash2, Globe, ExternalLink, X, Save } from 'lucide-react';

export default function FabricantsManager({ fabricants, setFabricants, materials = [], isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFabricant, setEditingFabricant] = useState(null);
  const [formData, setFormData] = useState({
    fabricant: '',
    pais: '',
    web: '',
    descripcio: ''
  });

  const handleOpenCreate = () => {
    setEditingFabricant(null);
    setFormData({
      fabricant: '',
      pais: '',
      web: '',
      descripcio: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (f) => {
    setEditingFabricant(f);
    setFormData({ ...f });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    const targetFab = fabricants.find(f => f.id === id);
    const associatedMaterials = materials.filter(m => m.fabricantId === id || m.fabricant === targetFab?.fabricant);
    if (associatedMaterials.length > 0) {
      if (!window.confirm(`Aquest fabricant '${targetFab?.fabricant}' té ${associatedMaterials.length} materials associats. Vols eliminar-lo igualment?`)) {
        return;
      }
    } else {
      if (!window.confirm('Estàs segur que vols eliminar aquest fabricant?')) return;
    }
    setFabricants(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.fabricant.trim()) return;

    if (editingFabricant) {
      setFabricants(prev => prev.map(f => f.id === editingFabricant.id ? { ...formData, id: f.id } : f));
    } else {
      const newId = `fab-${Date.now()}`;
      setFabricants(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredFabricants = fabricants
    .filter(f =>
      f.fabricant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.pais && f.pais.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.descripcio && f.descripcio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Factory className="w-6 h-6 text-amber-500" />
            Fabricants
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Empreses o marques que produeixen els materials (poden ser diferents del proveïdor o distribuïdor).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Fabricant
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom de fabricant, país, descripció..."
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFabricants.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap fabricant registrat.
          </div>
        ) : (
          filteredFabricants.map(f => {
            const count = materials.filter(m => m.fabricantId === f.id || m.fabricant === f.fabricant).length;

            return (
              <div
                key={f.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                        <Factory className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm font-serif">{f.fabricant}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          {f.pais && <span className="text-amber-400 font-medium">{f.pais}</span>}
                          {f.pais && count > 0 && <span>·</span>}
                          {count > 0 && <span>{count} materials</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {f.descripcio && (
                    <p className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60 line-clamp-2">
                      {f.descripcio}
                    </p>
                  )}
                </div>

                {f.web && (
                  <div className="mt-4 pt-3 border-t border-slate-800/40">
                    <a
                      href={f.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1.5 truncate"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{f.web.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form amb Botó Guardar a la Capçalera */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Factory className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingFabricant ? 'Editar Fabricant' : 'Nou Fabricant'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="fabricant-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Fabricant"
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

            <form id="fabricant-modal-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom del Fabricant / Marca *</label>
                <input
                  type="text"
                  required
                  value={formData.fabricant}
                  onChange={(e) => setFormData({ ...formData, fabricant: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Plywood Nordic AB, Anycubic, Epilog..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">País d'Origen / Seu</label>
                <input
                  type="text"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Finlàndia, Alemanya, EUA..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Lloc Web Oficial</label>
                <input
                  type="text"
                  value={formData.web}
                  onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="https://www.fabricant.com"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Descripció o Detalls Tècnics</label>
                <textarea
                  rows="2"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Detalls sobre especialitat, especificacions o línies de producte..."
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
