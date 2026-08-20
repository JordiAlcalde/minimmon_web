import React, { useState } from 'react';
import { 
  Calculator, Plus, Search, Edit2, Trash2, Package, Wrench, Cpu, 
  DollarSign, TrendingUp, AlertCircle, FileText, ChevronRight, X, Percent, Save 
} from 'lucide-react';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';
import { STITCH_PROJECTS } from '../../data/stitchData';

export default function EscandallsManager({ 
  escandalls, setEscandalls, materials, operacions, maquinaria, isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscandall, setEditingEscandall] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    producteNom: '',
    producteId: '',
    tipus: 'Producte Web',
    mermePercent: 8,
    margePercent: 65,
    notes: '',
    materials: [],
    operacions: [],
    maquinaria: []
  });

  const handleOpenCreate = () => {
    setEditingEscandall(null);
    setFormData({
      producteNom: '',
      producteId: '',
      tipus: 'Producte Web',
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (esc) => {
    setEditingEscandall(esc);
    setFormData({
      ...esc,
      materials: esc.materials ? esc.materials.map(m => ({ ...m })) : [],
      operacions: esc.operacions ? esc.operacions.map(o => ({ ...o })) : [],
      maquinaria: esc.maquinaria ? esc.maquinaria.map(mq => ({ ...mq })) : []
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest escandall?')) {
      setEscandalls(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.producteNom.trim()) return;

    if (editingEscandall) {
      setEscandalls(prev => prev.map(e => e.id === editingEscandall.id ? { ...formData, id: e.id } : e));
    } else {
      const newId = `esc-${Date.now()}`;
      setEscandalls(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  // Helper calculations for an escandall
  const calculateCosts = (esc) => {
    const costMat = (esc.materials || []).reduce((acc, item) => {
      const mat = materials.find(m => m.id === item.materialId);
      const unitCost = item.costUnitari ?? (mat ? mat.preuProPrin : 0);
      return acc + (Number(item.quantitat || 0) * Number(unitCost || 0));
    }, 0);

    const costOp = (esc.operacions || []).reduce((acc, item) => {
      const op = operacions.find(o => o.id === item.operacioId);
      const hourCost = item.costHora ?? (op ? op.preuHora : 0);
      return acc + ((Number(item.tempsMinuts || 0) / 60) * Number(hourCost || 0));
    }, 0);

    const costMaq = (esc.maquinaria || []).reduce((acc, item) => {
      const maq = maquinaria.find(m => m.id === item.maquinaId);
      const hourCost = item.costHora ?? (maq ? maq.preuHora : 0);
      return acc + ((Number(item.tempsMinuts || 0) / 60) * Number(hourCost || 0));
    }, 0);

    const baseCost = costMat + costOp + costMaq;
    const mermeAmount = baseCost * ((esc.mermePercent || 0) / 100);
    const totalCost = baseCost + mermeAmount;

    const marginAmount = totalCost * ((esc.margePercent || 0) / 100);
    const pvpRecomanat = totalCost + marginAmount;

    return {
      costMat,
      costOp,
      costMaq,
      baseCost,
      mermeAmount,
      totalCost,
      marginAmount,
      pvpRecomanat
    };
  };

  // Preset Selection Helper
  const handleSelectWebPreset = (e) => {
    const val = e.target.value;
    if (!val) return;

    // Search in GIFT_PRODUCTS or STITCH_PROJECTS or MINIATURE_WORLDS
    const foundGift = GIFT_PRODUCTS.find(g => g.id === val);
    const foundStitch = STITCH_PROJECTS.find(s => s.id === val);
    const foundWorld = MINIATURE_WORLDS.find(w => w.id === val);

    if (foundGift) {
      setFormData(prev => ({
        ...prev,
        producteNom: foundGift.title,
        producteId: foundGift.id,
        tipus: 'Regal / Producte'
      }));
    } else if (foundStitch) {
      setFormData(prev => ({
        ...prev,
        producteNom: foundStitch.titol,
        producteId: foundStitch.id,
        tipus: 'Projecte Món Mínim'
      }));
    } else if (foundWorld) {
      setFormData(prev => ({
        ...prev,
        producteNom: foundWorld.title,
        producteId: foundWorld.id,
        tipus: 'Món Mínim'
      }));
    }
  };

  const filteredEscandalls = escandalls
    .filter(e =>
      e.producteNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.producteNom || '').localeCompare(b.producteNom || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-500" />
            Escandalls & Càlcul de Costos i Preus
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Desglossament tècnic de materials, hores de taller i càlcul automàtic del PVP recomanat.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Escandall
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom de producte o notes..."
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

      {/* Grid of Escandalls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEscandalls.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap escandall creat.
          </div>
        ) : (
          filteredEscandalls.map(esc => {
            const costs = calculateCosts(esc);
            const matPct = costs.baseCost > 0 ? (costs.costMat / costs.baseCost) * 100 : 0;
            const opPct = costs.baseCost > 0 ? (costs.costOp / costs.baseCost) * 100 : 0;
            const maqPct = costs.baseCost > 0 ? (costs.costMaq / costs.baseCost) * 100 : 0;

            return (
              <div
                key={esc.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
                        {esc.tipus || 'Escandall'}
                      </span>
                      <h3 className="font-bold text-slate-100 text-base font-serif">{esc.producteNom}</h3>
                      {esc.notes && <p className="text-xs text-slate-400 mt-1">{esc.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(esc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Escandall"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(esc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar Escandall"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Materials ({matPct.toFixed(0)}%)</span>
                      <span>Mà d'Obra ({opPct.toFixed(0)}%)</span>
                      <span>Maquinària ({maqPct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex">
                      <div style={{ width: `${matPct}%` }} className="bg-amber-500 h-full" title="Materials" />
                      <div style={{ width: `${opPct}%` }} className="bg-emerald-500 h-full" title="Mà d'Obra" />
                      <div style={{ width: `${maqPct}%` }} className="bg-sky-500 h-full" title="Maquinària" />
                    </div>
                  </div>

                  {/* Detailed Components Counts */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                    <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-500" /> Materials
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-1">
                        {costs.costMat.toFixed(2)} €
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {esc.materials?.length || 0} ítems
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-500" /> Mà d'Obra
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-1">
                        {costs.costOp.toFixed(2)} €
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {esc.operacions?.length || 0} operacions
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-sky-500" /> Maquinària
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-1">
                        {costs.costMaq.toFixed(2)} €
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {esc.maquinaria?.length || 0} màquines
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Footer */}
                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cost de Fabricació</span>
                    <span className="font-mono font-bold text-slate-300 text-xs">
                      {costs.totalCost.toFixed(2)} €
                    </span>
                    <span className="text-[9px] text-slate-500 block">inclou {esc.mermePercent || 0}% mermes</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Marge Comercial</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      +{esc.margePercent || 0}%
                    </span>
                    <span className="text-[9px] text-slate-500 block">({costs.marginAmount.toFixed(2)} €)</span>
                  </div>

                  <div className="col-span-2 text-right p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 block">PVP Suggerit</span>
                    <span className="font-mono font-extrabold text-amber-400 text-lg">
                      {costs.pvpRecomanat.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form amb Capçalera Fixa i Màxim Espai */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Calculator className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {editingEscandall ? (
                    <>
                      Editar Escandall : <span className="text-amber-400 font-semibold">{formData.producteNom || 'Sense nom'}</span>
                    </>
                  ) : (
                    'Crear Nou Escandall'
                  )}
                </span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="escandall-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Escandall"
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

            <form id="escandall-modal-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Product selector preset */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                <span className="font-semibold text-amber-400 block">Vincular a Producte / Projecte Web</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Carregar des del catàleg actual</label>
                    <select
                      onChange={handleSelectWebPreset}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="">-- Selecciona del web o crea personalitzat --</option>
                      <optgroup label="Regals del Web">
                        {GIFT_PRODUCTS.map(g => (
                          <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Projectes Móns Mínims">
                        {STITCH_PROJECTS.map(s => (
                          <option key={s.id} value={s.id}>{s.titol}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Obres Singulars">
                        {MINIATURE_WORLDS.map(w => (
                          <option key={w.id} value={w.id}>{w.title}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nom del Producte / Escandall *</label>
                    <input
                      type="text"
                      required
                      value={formData.producteNom}
                      onChange={(e) => setFormData({ ...formData, producteNom: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                      }`}
                      placeholder="Nom del producte..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Notes / Observacions de fabricació</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200'
                    }`}
                    placeholder="Instrucions tècniques o variants..."
                  />
                </div>
              </div>

              {/* Bloc 1: Materials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> 1. Materials Utilitzats
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMat = materials[0];
                      setFormData(prev => ({
                        ...prev,
                        materials: [
                          ...prev.materials,
                          { materialId: firstMat?.id || '', quantitat: 1, costUnitari: firstMat?.preuProPrin || 0 }
                        ]
                      }));
                    }}
                    className="text-amber-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Afegir Material
                  </button>
                </div>

                {formData.materials.map((mItem, idx) => {
                  const selectedMat = materials.find(m => m.id === mItem.materialId);

                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      <div className="md:col-span-2">
                        <select
                          value={mItem.materialId}
                          onChange={(e) => {
                            const newMatId = e.target.value;
                            const targetMat = materials.find(m => m.id === newMatId);
                            const updated = [...formData.materials];
                            updated[idx] = {
                              ...updated[idx],
                              materialId: newMatId,
                              costUnitari: targetMat ? targetMat.preuProPrin : 0
                            };
                            setFormData({ ...formData, materials: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200"
                        >
                          {[...materials].sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca')).map(m => (
                            <option key={m.id} value={m.id}>
                              {m.material} ({m.preuProPrin} € / {m.unitat})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="any"
                          placeholder="Quantitat"
                          value={mItem.quantitat}
                          onChange={(e) => {
                            const updated = [...formData.materials];
                            updated[idx].quantitat = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, materials: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 ml-1">{selectedMat?.unitat || 'unitats'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-amber-400 font-bold">
                          {(Number(mItem.quantitat || 0) * Number(mItem.costUnitari || 0)).toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              materials: prev.materials.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1 text-red-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bloc 2: Operacions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" /> 2. Operacions de Mà d'Obra (Temps de Taller)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstOp = operacions[0];
                      setFormData(prev => ({
                        ...prev,
                        operacions: [
                          ...prev.operacions,
                          { operacioId: firstOp?.id || '', tempsMinuts: 15, costHora: firstOp?.preuHora || 0 }
                        ]
                      }));
                    }}
                    className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Afegir Operació
                  </button>
                </div>

                {formData.operacions.map((opItem, idx) => {
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      <div className="md:col-span-2">
                        <select
                          value={opItem.operacioId}
                          onChange={(e) => {
                            const newOpId = e.target.value;
                            const targetOp = operacions.find(o => o.id === newOpId);
                            const updated = [...formData.operacions];
                            updated[idx] = {
                              ...updated[idx],
                              operacioId: newOpId,
                              costHora: targetOp ? targetOp.preuHora : 0
                            };
                            setFormData({ ...formData, operacions: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200"
                        >
                          {[...operacions].sort((a, b) => (a.operacio || '').localeCompare(b.operacio || '', 'ca')).map(o => (
                            <option key={o.id} value={o.id}>
                              {o.operacio} ({o.preuHora} €/h)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="Minuts"
                          value={opItem.tempsMinuts}
                          onChange={(e) => {
                            const updated = [...formData.operacions];
                            updated[idx].tempsMinuts = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, operacions: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 ml-1">minuts</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-emerald-400 font-bold">
                          {((Number(opItem.tempsMinuts || 0) / 60) * Number(opItem.costHora || 0)).toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              operacions: prev.operacions.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1 text-red-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bloc 3: Maquinaria */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> 3. Temps d'Ús de Maquinària
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMaq = maquinaria[0];
                      setFormData(prev => ({
                        ...prev,
                        maquinaria: [
                          ...prev.maquinaria,
                          { maquinaId: firstMaq?.id || '', tempsMinuts: 10, costHora: firstMaq?.preuHora || 0 }
                        ]
                      }));
                    }}
                    className="text-sky-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Afegir Màquina
                  </button>
                </div>

                {formData.maquinaria.map((maqItem, idx) => {
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      <div className="md:col-span-2">
                        <select
                          value={maqItem.maquinaId}
                          onChange={(e) => {
                            const newMaqId = e.target.value;
                            const targetMaq = maquinaria.find(m => m.id === newMaqId);
                            const updated = [...formData.maquinaria];
                            updated[idx] = {
                              ...updated[idx],
                              maquinaId: newMaqId,
                              costHora: targetMaq ? targetMaq.preuHora : 0
                            };
                            setFormData({ ...formData, maquinaria: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200"
                        >
                          {[...maquinaria].sort((a, b) => (a.maquina || '').localeCompare(b.maquina || '', 'ca')).map(m => (
                            <option key={m.id} value={m.id}>
                              {m.maquina} ({m.preuHora} €/h)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="Minuts"
                          value={maqItem.tempsMinuts}
                          onChange={(e) => {
                            const updated = [...formData.maquinaria];
                            updated[idx].tempsMinuts = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, maquinaria: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 ml-1">minuts</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sky-400 font-bold">
                          {((Number(maqItem.tempsMinuts || 0) / 60) * Number(maqItem.costHora || 0)).toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              maquinaria: prev.maquinaria.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1 text-red-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mermes i Marge Comercial */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">% Mermes / Desperdici de Material</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.mermePercent}
                      onChange={(e) => setFormData({ ...formData, mermePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">% Marge Comercial Desitjat</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.margePercent}
                      onChange={(e) => setFormData({ ...formData, margePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-amber-400 font-bold"
                    />
                    <span className="text-amber-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
