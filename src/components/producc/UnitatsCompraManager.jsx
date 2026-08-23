import React, { useState } from 'react';
import { Box, Plus, Search, Edit2, Trash2, X, Save, ArrowRightLeft, Hash } from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';

export default function UnitatsCompraManager({ unitatsCompra, setUnitatsCompra, materials = [], isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnitat, setEditingUnitat] = useState(null);
  const [formData, setFormData] = useState({ unitatCompra: '', factorConversio: 1 });

  const handleOpenCreate = () => {
    setEditingUnitat(null);
    setFormData({ unitatCompra: '', factorConversio: 1 });
    setModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUnitat(u);
    setFormData({ 
      unitatCompra: u.unitatCompra || '', 
      factorConversio: u.factorConversio !== undefined ? u.factorConversio : 1 
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    const targetUnit = unitatsCompra.find(u => u.id === id);
    const associatedMaterials = materials.filter(m => m.unitatCompraId === id || m.unitatCompra === targetUnit?.unitatCompra);
    if (associatedMaterials.length > 0) {
      if (!window.confirm(`Aquest format de packaging '${targetUnit?.unitatCompra}' s'utilitza en ${associatedMaterials.length} materials. Vols eliminar-lo igualment?`)) {
        return;
      }
    } else {
      if (!window.confirm('Estàs segur que vols eliminar aquesta unitat de compra / packaging?')) return;
    }
    setUnitatsCompra(prev => prev.filter(u => u.id !== id));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.unitatCompra.trim()) return;

    const parsedData = {
      unitatCompra: formData.unitatCompra.trim(),
      factorConversio: Math.max(0.0001, parseDecimal(formData.factorConversio, 1))
    };

    if (editingUnitat) {
      setUnitatsCompra(prev => prev.map(u => u.id === editingUnitat.id ? { ...parsedData, id: u.id } : u));
    } else {
      const newId = getNextSequentialId('ucomp', unitatsCompra);
      setUnitatsCompra(prev => [...prev, { ...parsedData, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredUnitats = unitatsCompra
    .filter(u =>
      u.unitatCompra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.factorConversio).includes(searchTerm) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.unitatCompra || '').localeCompare(b.unitatCompra || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Box className="w-6 h-6 text-amber-500" />
            Unitats de Compra (Packaging)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Formats d'embalatge i venda dels proveïdors amb el seu factor de conversió per traspassar automàticament a les unitats d'estoc.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Unitat de Compra
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per packaging, factor de conversió o ID..."
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
        {filteredUnitats.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap unitat de compra registrada.
          </div>
        ) : (
          filteredUnitats.map(u => {
            const count = materials.filter(m => m.unitatCompraId === u.id || m.unitatCompra === u.unitatCompra).length;

            return (
              <div
                key={u.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm font-serif ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{u.unitatCompra}</h3>
                        <div className={`flex items-center gap-1 text-[11px] mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          <span>ID: {u.id}</span>
                          {count > 0 && (
                            <>
                              <span>·</span>
                              <span className={isDark ? 'text-amber-400' : 'text-amber-800'}>{count} materials</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-800 hover:bg-slate-200'}`}
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-200'}`}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Factor de Conversió Badge */}
                  <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-300 bg-amber-50'}`}>
                    <div className="flex items-center gap-2 text-xs">
                      <ArrowRightLeft className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Factor conversió estoc:</span>
                    </div>
                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded-md border ${isDark ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-amber-900 bg-amber-100 border-amber-300'}`}>
                      ×{u.factorConversio !== undefined ? u.factorConversio : 1}
                    </span>
                  </div>
                </div>

                <p className={`text-[11px] mt-3 italic ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  {u.factorConversio > 1 
                    ? `1 embalatge = ${u.factorConversio} unitats d'estoc.` 
                    : `S'estoca directament com a 1 unitat.`}
                </p>
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
                <Box className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingUnitat ? 'Editar Unitat de Compra' : 'Nova Unitat de Compra'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="unitat-compra-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Unitat de Compra"
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

            <form id="unitat-compra-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Format de Packaging / Unitat de Compra *</label>
                <input
                  type="text"
                  required
                  value={formData.unitatCompra}
                  onChange={(e) => setFormData({ ...formData, unitatCompra: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Caixa 50 unitats, Paquet 10 plaques, Bobina 100m..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>Factor de Conversió per l'Estoc *</span>
                  <span className="text-[11px] text-amber-400 font-normal">Ex: 10 per paquet de 10u / 1 per estocar paquet</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    required
                    value={formData.factorConversio}
                    onChange={(e, num) => setFormData({ ...formData, factorConversio: e.target.value })}
                    className={`w-full p-2.5 pl-9 rounded-xl border outline-none font-mono text-amber-400 font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">×</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Indica quantes unitats d'estoc equivalen a 1 unitat d'aquest packaging (Exemple: si compres 1 paquet i l'estoc es compta en peces soltes, posa el nombre de peces que porta).
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
