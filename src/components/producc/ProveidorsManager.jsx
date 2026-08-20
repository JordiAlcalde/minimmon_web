import React, { useState } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, Phone, Mail, Globe, ExternalLink, X, Save } from 'lucide-react';

export default function ProveidorsManager({ proveidors, setProveidors, isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProveidor, setEditingProveidor] = useState(null);

  const [formData, setFormData] = useState({
    empresa: '',
    telefon: '',
    email: '',
    web: ''
  });

  const handleOpenCreate = () => {
    setEditingProveidor(null);
    setFormData({ empresa: '', telefon: '', email: '', web: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (prov) => {
    setEditingProveidor(prov);
    setFormData({ ...prov });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest proveïdor?')) {
      setProveidors(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.empresa.trim()) return;

    if (editingProveidor) {
      setProveidors(prev => prev.map(p => p.id === editingProveidor.id ? { ...formData, id: p.id } : p));
    } else {
      const newId = `prov-${Date.now()}`;
      setProveidors(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredProveidors = proveidors
    .filter(p => 
      p.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telefon?.includes(searchTerm)
    )
    .sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-500" />
            Proveïdors & Subministradors
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió de les empreses que subministren els materials del taller.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Proveïdor
        </button>
      </div>

      {/* Search */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom d'empresa, telèfon o email..."
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

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProveidors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap proveïdor.
          </div>
        ) : (
          filteredProveidors.map(p => (
            <div 
              key={p.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm font-serif">{p.empresa}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  {p.telefon && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <a href={`tel:${p.telefon}`} className="hover:underline">{p.telefon}</a>
                    </div>
                  )}

                  {p.email && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <a href={`mailto:${p.email}`} className="hover:underline truncate">{p.email}</a>
                    </div>
                  )}

                  {p.web && (
                    <div className="flex items-center gap-2 text-amber-400 font-medium">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <a 
                        href={p.web.startsWith('http') ? p.web : `https://${p.web}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="hover:underline truncate flex items-center gap-1"
                      >
                        {p.web.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingProveidor ? 'Editar Proveïdor' : 'Crear Nou Proveïdor'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="prov-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Proveïdor"
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

            <form id="prov-modal-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom de l'Empresa *</label>
                <input
                  type="text"
                  required
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Fustes Girona S.L."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Telèfon de Contacte</label>
                <input
                  type="text"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="+34 93..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email de Comandes</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="comandes@empresa.com"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Lloc Web</label>
                <input
                  type="text"
                  value={formData.web}
                  onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
