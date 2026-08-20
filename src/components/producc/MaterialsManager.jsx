import React, { useState } from 'react';
import { 
  Package, Plus, Search, Filter, Edit2, Trash2, ExternalLink, 
  AlertTriangle, Image as ImageIcon, Layers, DollarSign, Clock, Building2, Check, X, Save, Box, Factory 
} from 'lucide-react';

export default function MaterialsManager({ 
  materials, setMaterials, 
  grups = [], setGrups, 
  unitats = [], setUnitats, 
  unitatsCompra = [], setUnitatsCompra, 
  fabricants = [], setFabricants, 
  proveidors = [], setProveidors, 
  isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrup, setSelectedGrup] = useState('all');
  const [selectedProveidor, setSelectedProveidor] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    material: '',
    descripcio: '',
    imatge: '',
    grupId: '',
    unitat: 'm²',
    unitatCompraId: '',
    fabricantId: '',
    estocActual: 0,
    estocMinim: 0,
    proPrinId: '',
    codiProPrin: '',
    enllacProPrin: '',
    preuProPrin: 0,
    terminiProPrin: '',
    altresProveidors: []
  });

  // Quick Inline Creation Handlers
  const handleQuickAddGrup = () => {
    const nom = window.prompt('Nom del nou grup / categoria de materials:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const existing = grups.find(g => g.grup.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setFormData(prev => ({ ...prev, grupId: existing.id }));
      } else {
        const newId = `grup-${Date.now()}`;
        const newGrup = { id: newId, grup: trimmed };
        if (setGrups) setGrups(prev => [...prev, newGrup]);
        setFormData(prev => ({ ...prev, grupId: newId }));
      }
    }
  };

  const handleQuickAddUnitat = () => {
    const nom = window.prompt('Nom de la nova unitat de mesura (ex: m², Litre, kg, cm, u...):');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const existing = unitats.find(u => u.unitat.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setFormData(prev => ({ ...prev, unitat: existing.unitat }));
      } else {
        const newId = `unit-${Date.now()}`;
        const newUnit = { id: newId, unitat: trimmed };
        if (setUnitats) setUnitats(prev => [...prev, newUnit]);
        setFormData(prev => ({ ...prev, unitat: trimmed }));
      }
    }
  };

  const handleQuickAddPackaging = () => {
    const nom = window.prompt('Format de la nova unitat de compra / packaging (ex: Caixa 100u, Paquet 5 plaques):');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const factorStr = window.prompt('Factor de conversió per a l\'estoc (ex: 100, o 1 si s\'estoca el packaging sencer):', '1');
      const factor = Math.max(0.0001, parseFloat(factorStr) || 1);
      const newId = `ucomp-${Date.now()}`;
      const newPackaging = { id: newId, unitatCompra: trimmed, factorConversio: factor };
      if (setUnitatsCompra) setUnitatsCompra(prev => [...prev, newPackaging]);
      setFormData(prev => ({ ...prev, unitatCompraId: newId }));
    }
  };

  const handleQuickAddFabricant = () => {
    const nom = window.prompt('Nom del nou fabricant / marca:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const newId = `fab-${Date.now()}`;
      const newFab = { id: newId, fabricant: trimmed, pais: '', web: '', descripcio: '' };
      if (setFabricants) setFabricants(prev => [...prev, newFab]);
      setFormData(prev => ({ ...prev, fabricantId: newId }));
    }
  };

  const handleQuickAddProveidor = () => {
    const nom = window.prompt('Nom de la nova empresa proveïdora:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const newId = `prov-${Date.now()}`;
      const newProv = { id: newId, empresa: trimmed, telefon: '', email: '', web: '' };
      if (setProveidors) setProveidors(prev => [...prev, newProv]);
      setFormData(prev => ({ ...prev, proPrinId: newId }));
    }
  };

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setFormData({
      material: '',
      descripcio: '',
      imatge: '',
      grupId: grups[0]?.id || '',
      unitat: 'm²',
      unitatCompraId: unitatsCompra[0]?.id || '',
      fabricantId: fabricants[0]?.id || '',
      estocActual: 0,
      estocMinim: 0,
      proPrinId: proveidors[0]?.id || '',
      codiProPrin: '',
      enllacProPrin: '',
      preuProPrin: 0,
      terminiProPrin: '',
      altresProveidors: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (mat) => {
    setEditingMaterial(mat);
    setFormData({
      ...mat,
      unitatCompraId: mat.unitatCompraId || '',
      fabricantId: mat.fabricantId || '',
      altresProveidors: mat.altresProveidors ? [...mat.altresProveidors] : []
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest material?')) {
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.material.trim()) return;

    if (editingMaterial) {
      setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...formData, id: m.id } : m));
    } else {
      const newId = `mat-${Date.now()}`;
      setMaterials(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  const handleAddAltSupplier = () => {
    setFormData(prev => ({
      ...prev,
      altresProveidors: [
        ...prev.altresProveidors,
        { proveidorId: proveidors[0]?.id || '', codi: '', enllac: '', preu: 0, termini: '' }
      ]
    }));
  };

  const handleUpdateAltSupplier = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.altresProveidors];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, altresProveidors: updated };
    });
  };

  const handleRemoveAltSupplier = (index) => {
    setFormData(prev => ({
      ...prev,
      altresProveidors: prev.altresProveidors.filter((_, i) => i !== index)
    }));
  };

  const filteredMaterials = materials
    .filter(m => {
      const matchesSearch = (m.material || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.descripcio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.codiProPrin?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrup = selectedGrup === 'all' || m.grupId === selectedGrup;
      const matchesProv = selectedProveidor === 'all' || m.proPrinId === selectedProveidor;
      const matchesLowStock = !onlyLowStock || (Number(m.estocActual) <= Number(m.estocMinim));
      return matchesSearch && matchesGrup && matchesProv && matchesLowStock;
    })
    .sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      {/* Header section with search and actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Materials & Matèries Primes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió de la matèria prima per a la fabricació de productes i projectes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Material
        </button>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca material, descripció, codi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedGrup}
            onChange={(e) => setSelectedGrup(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Grups</option>
            {grups.map(g => (
              <option key={g.id} value={g.id}>{g.grup}</option>
            ))}
          </select>

          <select
            value={selectedProveidor}
            onChange={(e) => setSelectedProveidor(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Proveïdors</option>
            {proveidors.map(p => (
              <option key={p.id} value={p.id}>{p.empresa}</option>
            ))}
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
              onlyLowStock
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Faltant Estoc ({materials.filter(m => Number(m.estocActual) <= Number(m.estocMinim)).length})
          </button>
        </div>
      </div>

      {/* Table of Materials */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-semibold ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <th className="py-3.5 px-4">Material</th>
                <th className="py-3.5 px-4">Grup</th>
                <th className="py-3.5 px-4">Proveïdor Principal</th>
                <th className="py-3.5 px-4 text-right">Preu ProPrin</th>
                <th className="py-3.5 px-4 text-center">Estoc</th>
                <th className="py-3.5 px-4 text-right">Accions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500">
                    No s'han trobat materials amb els filtres seleccionats.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(m => {
                  const grup = grups.find(g => g.id === m.grupId);
                  const prov = proveidors.find(p => p.id === m.proPrinId);
                  const isLow = Number(m.estocActual) <= Number(m.estocMinim);

                  return (
                    <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {m.imatge ? (
                            <img src={m.imatge} alt={m.material} className="w-10 h-10 rounded-lg object-cover border border-slate-700/50 shrink-0" />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-2">
                              {m.material}
                              {isLow && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Faltant
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{m.descripcio}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] border font-medium ${
                          isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {grup ? grup.grup : 'Sense Grup'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {prov ? prov.empresa : m.proPrinId || '-'}
                          </div>
                          {m.codiProPrin && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              Codi: {m.codiProPrin}
                            </div>
                          )}
                          {m.enllacProPrin && (
                            <a
                              href={m.enllacProPrin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                              Veure Enllaç <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-slate-200">
                        {Number(m.preuProPrin || 0).toFixed(2)} € / {m.unitat || 'u'}
                        {m.terminiProPrin && (
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            ⏱️ {m.terminiProPrin}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-200">
                          {m.estocActual} <span className="text-[10px] text-slate-400 font-sans">{m.unitat}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mínim: {m.estocMinim} {m.unitat}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar Material"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Eliminar Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal amb Capçalera Fixa i Màxim Espai d'Edició */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header Fix Superior amb Botó de Guardar i Tancar */}
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Package className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {editingMaterial ? (
                    <>
                      Editar Material : <span className="text-amber-400 font-semibold">{formData.material || editingMaterial.material || 'Sense nom'}</span>
                    </>
                  ) : (
                    'Crear Nou Material'
                  )}
                </span>
              </h3>
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="submit"
                  form="material-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Canvis"
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

            {/* Formulari amb Cos Scrollable (Sense peu per aprofitar tot l'espai) */}
            <form id="material-modal-form" onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Cos amb Scroll Intern */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* Nom del Material i Grup amb proporció adaptada */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block text-slate-400 mb-1 font-medium">Nom del Material *</label>
                    <input
                      type="text"
                      required
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                      placeholder="P. ex. Bedoll Natural 1.5mm"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium">Grup / Categoria</label>
                      <button
                        type="button"
                        onClick={handleQuickAddGrup}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nou grup ràpidament"
                      >
                        <Plus className="w-3 h-3" /> Nou
                      </button>
                    </div>
                    <select
                      value={formData.grupId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          handleQuickAddGrup();
                        } else {
                          setFormData({ ...formData, grupId: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {[...grups].sort((a, b) => (a.grup || '').localeCompare(b.grup || '', 'ca')).map(g => (
                        <option key={g.id} value={g.id}>{g.grup}</option>
                      ))}
                      <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou grup...</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Descripció</label>
                  <textarea
                    rows="2"
                    value={formData.descripcio}
                    onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Detalls tècnics del material..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium">Unitat de Mesura *</label>
                      <button
                        type="button"
                        onClick={handleQuickAddUnitat}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nova unitat de mesura"
                      >
                        <Plus className="w-3 h-3" /> Nova
                      </button>
                    </div>
                    {unitats && unitats.length > 0 ? (
                      <select
                        value={formData.unitat}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddUnitat();
                          } else {
                            setFormData({ ...formData, unitat: e.target.value });
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {[...unitats].sort((a, b) => (a.unitat || '').localeCompare(b.unitat || '', 'ca')).map(u => (
                          <option key={u.id} value={u.unitat}>{u.unitat}</option>
                        ))}
                        {!unitats.some(u => u.unitat === formData.unitat) && (
                          <option value={formData.unitat}>{formData.unitat}</option>
                        )}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nova unitat...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.unitat}
                        onChange={(e) => setFormData({ ...formData, unitat: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="m², u, Litre, kg..."
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Estoc Actual</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.estocActual}
                      onChange={(e) => setFormData({ ...formData, estocActual: parseFloat(e.target.value) || 0 })}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Estoc Mínim Alertes</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.estocMinim}
                      onChange={(e) => setFormData({ ...formData, estocMinim: parseFloat(e.target.value) || 0 })}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Packaging (Unitat de Compra) i Fabricant */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-amber-500" />
                        Unitat de Compra (Packaging)
                      </label>
                      <button
                        type="button"
                        onClick={handleQuickAddPackaging}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nou format de packaging"
                      >
                        <Plus className="w-3 h-3" /> Nou
                      </button>
                    </div>
                    <select
                      value={formData.unitatCompraId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          handleQuickAddPackaging();
                        } else {
                          setFormData({ ...formData, unitatCompraId: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="">-- Selecciona format de packaging --</option>
                      {[...unitatsCompra].sort((a, b) => (a.unitatCompra || '').localeCompare(b.unitatCompra || '', 'ca')).map(uc => (
                        <option key={uc.id} value={uc.id}>{uc.unitatCompra} (×{uc.factorConversio !== undefined ? uc.factorConversio : 1})</option>
                      ))}
                      <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou packaging...</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-amber-500" />
                        Fabricant de la Matèria Prima
                      </label>
                      <button
                        type="button"
                        onClick={handleQuickAddFabricant}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nou fabricant"
                      >
                        <Plus className="w-3 h-3" /> Nou
                      </button>
                    </div>
                    <select
                      value={formData.fabricantId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          handleQuickAddFabricant();
                        } else {
                          setFormData({ ...formData, fabricantId: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="">-- Selecciona fabricant --</option>
                      {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
                        <option key={f.id} value={f.id}>{f.fabricant} {f.pais ? `(${f.pais})` : ''}</option>
                      ))}
                      <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou fabricant...</option>
                    </select>
                  </div>
                </div>

                {/* URL Imatge amb miniatura incorporada */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">URL Imatge</label>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
                    }`}>
                      {formData.imatge ? (
                        <img
                          src={formData.imatge}
                          alt={formData.material || 'Miniatura'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.imatge}
                        onChange={(e) => setFormData({ ...formData, imatge: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Proveïdor Principal */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> Proveïdor Principal (ProPrin)
                    </h4>
                    <button
                      type="button"
                      onClick={handleQuickAddProveidor}
                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                      title="Afegir nou proveïdor"
                    >
                      <Plus className="w-3 h-3" /> Nou Proveïdor
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Proveïdor Principal</label>
                      <select
                        value={formData.proPrinId}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddProveidor();
                          } else {
                            setFormData({ ...formData, proPrinId: e.target.value });
                          }
                        }}
                        className={`w-full p-2 rounded-lg border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
                          <option key={p.id} value={p.id}>{p.empresa}</option>
                        ))}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou proveïdor...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Codi ProPrin</label>
                      <input
                        type="text"
                        value={formData.codiProPrin}
                        onChange={(e) => setFormData({ ...formData, codiProPrin: e.target.value })}
                        className={`w-full p-2 rounded-lg border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                        }`}
                        placeholder="Ref. proveïdor"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Preu (€ / {formData.unitat})</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.preuProPrin}
                        onChange={(e) => setFormData({ ...formData, preuProPrin: parseFloat(e.target.value) || 0 })}
                        className={`w-full p-2 rounded-lg border outline-none font-mono ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Termini Entrega</label>
                      <input
                        type="text"
                        value={formData.terminiProPrin}
                        onChange={(e) => setFormData({ ...formData, terminiProPrin: e.target.value })}
                        className={`w-full p-2 rounded-lg border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                        }`}
                        placeholder="P. ex. 24/48h, 5 dies..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Enllaç al Producte</label>
                      <input
                        type="text"
                        value={formData.enllacProPrin}
                        onChange={(e) => setFormData({ ...formData, enllacProPrin: e.target.value })}
                        className={`w-full p-2 rounded-lg border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                        }`}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Altres Proveïdors */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Altres Proveïdors Alternatius</span>
                    <button
                      type="button"
                      onClick={handleAddAltSupplier}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      + Afegir Proveïdor
                    </button>
                  </div>

                  {formData.altresProveidors.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic">No hi ha proveïdors alternatius definits.</p>
                  )}

                  {formData.altresProveidors.map((alt, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select
                          value={alt.proveidorId}
                          onChange={(e) => handleUpdateAltSupplier(idx, 'proveidorId', e.target.value)}
                          className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-200"
                        >
                          {proveidors.map(p => (
                            <option key={p.id} value={p.id}>{p.empresa}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Codi Ref."
                          value={alt.codi}
                          onChange={(e) => handleUpdateAltSupplier(idx, 'codi', e.target.value)}
                          className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-200"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Preu €"
                          value={alt.preu}
                          onChange={(e) => handleUpdateAltSupplier(idx, 'preu', parseFloat(e.target.value) || 0)}
                          className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Termini"
                          value={alt.termini}
                          onChange={(e) => handleUpdateAltSupplier(idx, 'termini', e.target.value)}
                          className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-200"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveAltSupplier(idx)}
                            className="text-red-400 p-1 hover:bg-slate-800 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
