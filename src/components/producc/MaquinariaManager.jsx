import React, { useState } from 'react';
import { Cpu, Plus, Search, Edit2, Trash2, Calendar, DollarSign, Clock, Wrench, X, Save } from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal, formatCurrency } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';

export default function MaquinariaManager({ maquinaria, setMaquinaria, isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);

  const [formData, setFormData] = useState({
    maquina: '',
    descripcio: '',
    fabricant: '',
    codiFabricant: '',
    numSerie: '',
    dataCompra: '',
    preuHora: 0
  });

  const handleOpenCreate = () => {
    setEditingMaquina(null);
    setFormData({
      maquina: '',
      descripcio: '',
      fabricant: '',
      codiFabricant: '',
      numSerie: '',
      dataCompra: '',
      preuHora: 0
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (maq) => {
    setEditingMaquina(maq);
    setFormData({ ...maq });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta màquina del taller?')) {
      setMaquinaria(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.maquina.trim()) return;

    if (editingMaquina) {
      setMaquinaria(prev => prev.map(m => m.id === editingMaquina.id ? { ...formData, id: m.id } : m));
    } else {
      const newId = getNextSequentialId('maq', maquinaria);
      setMaquinaria(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredMaquinaria = maquinaria
    .filter(m =>
      m.maquina.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fabricant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descripcio?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.maquina || '').localeCompare(b.maquina || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold font-serif flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Cpu className="w-6 h-6 text-amber-500" />
            Maquinària & Equipament del Taller
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Càlcul d'amortització, consum elèctric, manteniment i cost d'hora màquina.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Màquina
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom de màquina, fabricant, codi..."
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
        {filteredMaquinaria.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap maquinària registrat.
          </div>
        ) : (
          filteredMaquinaria.map(m => (
            <div 
              key={m.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm font-serif">{m.maquina}</h3>
                      <p className="text-[11px] text-amber-400 font-medium">{m.fabricant || 'Fabricant no especificat'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{m.descripcio}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Codi Fabricant</span>
                    <span className="font-mono text-slate-300 font-semibold">{m.codiFabricant || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Núm. Sèrie</span>
                    <span className="font-mono text-slate-300">{m.numSerie || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500" />
                  <span>{m.dataCompra || 'Data desconnectada'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Cost / Hora</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatDecimal(m.preuHora, 2)} €/h
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
                <Cpu className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingMaquina ? 'Editar Màquina' : 'Crear Nova Màquina'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="maq-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Màquina"
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

            <form id="maq-modal-form" onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom de la Màquina *</label>
                <input
                  type="text"
                  required
                  value={formData.maquina}
                  onChange={(e) => setFormData({ ...formData, maquina: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Màquina Làser CO2 (60W)"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Descripció Tècnica</label>
                <textarea
                  rows="2"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Característiques de treball..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Fabricant / Marca</label>
                  <input
                    type="text"
                    value={formData.fabricant}
                    onChange={(e) => setFormData({ ...formData, fabricant: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="P. ex. Epilog / Thunder"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Codi Fabricant</label>
                  <input
                    type="text"
                    value={formData.codiFabricant}
                    onChange={(e) => setFormData({ ...formData, codiFabricant: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Model / Codi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Número de Sèrie</label>
                  <input
                    type="text"
                    value={formData.numSerie}
                    onChange={(e) => setFormData({ ...formData, numSerie: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Data de Compra</label>
                  <input
                    type="date"
                    value={formData.dataCompra}
                    onChange={(e) => setFormData({ ...formData, dataCompra: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Preu / Hora (€/h)</label>
                  <DecimalInput
                    value={formData.preuHora}
                    onChange={(e, num) => setFormData({ ...formData, preuHora: num })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
