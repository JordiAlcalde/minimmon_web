import React, { useState } from 'react';
import { 
  ShoppingCart, Plus, Search, CheckCircle, Clock, AlertTriangle, 
  Building2, Package, FileText, Copy, ExternalLink, Edit2, Trash2, X, ArrowDownRight, RefreshCw, Save 
} from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal, formatCurrency, formatDecimalInput } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';

export default function CompresManager({ 
  compres, setCompres, materials, setMaterials, proveidors, isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstat, setFilterEstat] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState(null);
  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [selectedComandaToReceive, setSelectedComandaToReceive] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // New Order Form state
  const [formData, setFormData] = useState({
    proveidorId: '',
    dataCreacio: new Date().toISOString().split('T')[0],
    estat: 'Pendent',
    numAlbara: '',
    observacions: '',
    linies: []
  });

  // Reception Form state
  const [receptionData, setReceptionData] = useState({
    numAlbara: '',
    updatePrices: true,
    receivedLines: []
  });

  const handleOpenCreate = () => {
    setEditingComanda(null);
    setFormData({
      proveidorId: proveidors[0]?.id || '',
      dataCreacio: new Date().toISOString().split('T')[0],
      estat: 'Pendent',
      numAlbara: '',
      observacions: '',
      linies: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (com) => {
    setEditingComanda(com);
    setFormData({
      ...com,
      linies: com.linies ? com.linies.map(l => ({ ...l })) : []
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta ordre de compra?')) {
      setCompres(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!formData.proveidorId) return;

    if (editingComanda) {
      setCompres(prev => prev.map(c => c.id === editingComanda.id ? { ...formData, id: c.id } : c));
    } else {
      const newId = getNextSequentialId('com', compres);
      setCompres(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  // Open Reception Modal workflow
  const handleOpenReception = (com) => {
    setSelectedComandaToReceive(com);
    setReceptionData({
      numAlbara: com.numAlbara || '',
      updatePrices: true,
      receivedLines: (com.linies || []).map(l => ({
        materialId: l.materialId,
        quantitatDemanada: l.quantitatDemanada,
        quantitatRebuda: l.quantitatRebuda > 0 ? l.quantitatRebuda : l.quantitatDemanada,
        preuPactat: l.preuPactat
      }))
    });
    setReceptionModalOpen(true);
  };

  // Confirm Reception & Stock Update
  const handleConfirmReception = (e) => {
    e.preventDefault();
    if (!selectedComandaToReceive) return;

    // 1. Update order status and received lines
    setCompres(prev => prev.map(c => {
      if (c.id === selectedComandaToReceive.id) {
        return {
          ...c,
          estat: 'Rebut',
          numAlbara: receptionData.numAlbara,
          linies: receptionData.receivedLines
        };
      }
      return c;
    }));

    // 2. Automatically update materials stock & prices
    setMaterials(prevMaterials => {
      return prevMaterials.map(mat => {
        const receivedItem = receptionData.receivedLines.find(r => r.materialId === mat.id);
        if (receivedItem) {
          const qtyAdded = Number(receivedItem.quantitatRebuda || 0);
          const newStock = Number(mat.estocActual || 0) + qtyAdded;
          const newPrice = receptionData.updatePrices ? Number(receivedItem.preuPactat || mat.preuProPrin) : mat.preuProPrin;

          return {
            ...mat,
            estocActual: newStock,
            preuProPrin: newPrice
          };
        }
        return mat;
      });
    });

    setReceptionModalOpen(false);
    alert('Comanda rebuda amb èxit! S\'ha actualitzat l\'estoc i els preus dels materials.');
  };

  // Helper to generate text copy format
  const generateOrderText = (com) => {
    const prov = proveidors.find(p => p.id === com.proveidorId);
    let text = `ORDRE DE COMPRA - MÍNIM MÓN\n`;
    text += `Data: ${com.dataCreacio}\n`;
    text += `Proveïdor: ${prov ? prov.empresa : ''}\n`;
    text += `Ref. Interna: ${com.id}\n`;
    text += `------------------------------------\n`;
    (com.linies || []).forEach(l => {
      const mat = materials.find(m => m.id === l.materialId);
      text += `- ${mat ? mat.material : 'Material'}: ${l.quantitatDemanada} ${mat?.unitat || 'u'} (${l.preuPactat} €/${mat?.unitat || 'u'})\n`;
      if (mat?.codiProPrin) text += `  Codi Ref: ${mat.codiProPrin}\n`;
    });
    text += `------------------------------------\n`;
    if (com.observacions) text += `Observacions: ${com.observacions}\n`;
    return text;
  };

  const handleCopyOrderText = (com) => {
    const txt = generateOrderText(com);
    navigator.clipboard.writeText(txt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const filteredCompres = compres
    .filter(c => {
      const prov = proveidors.find(p => p.id === c.proveidorId);
      const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            prov?.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.observacions?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstat = filterEstat === 'all' || c.estat === filterEstat;
      return matchesSearch && matchesEstat;
    })
    .sort((a, b) => {
      const provA = proveidors.find(p => p.id === a.proveidorId)?.empresa || '';
      const provB = proveidors.find(p => p.id === b.proveidorId)?.empresa || '';
      const comp = provA.localeCompare(provB, 'ca', { sensitivity: 'base' });
      if (comp !== 0) return comp;
      return (b.dataCreacio || '').localeCompare(a.dataCreacio || '');
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            Compres & Ordres d'Aprovisionament
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió de comandes de material faltant, recepció d'albarans i actualització automàtica d'estoc.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Comanda Interna
        </button>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per ref, proveïdor o observacions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterEstat}
            onChange={(e) => setFilterEstat(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Estats</option>
            <option value="Pendent">Pendent</option>
            <option value="Demanat">Demanat</option>
            <option value="Rebut">Rebut</option>
            <option value="Cancel·lat">Cancel·lat</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredCompres.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap comanda registrat.
          </div>
        ) : (
          filteredCompres.map(com => {
            const prov = proveidors.find(p => p.id === com.proveidorId);
            const totalComanda = (com.linies || []).reduce((acc, l) => acc + (Number(l.quantitatDemanada || 0) * Number(l.preuPactat || 0)), 0);

            return (
              <div
                key={com.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-sm font-serif">{prov ? prov.empresa : 'Proveïdor'}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          com.estat === 'Rebut' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          com.estat === 'Demanat' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                          com.estat === 'Cancel·lat' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {com.estat}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                        <span className="font-mono">Ref: {com.id}</span>
                        <span>📅 {com.dataCreacio}</span>
                        {com.numAlbara && <span className="font-mono text-amber-400">📄 Albarà: {com.numAlbara}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {com.estat !== 'Rebut' && (
                      <button
                        onClick={() => handleOpenReception(com)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Rebre Comanda
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyOrderText(com)}
                      className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Copiar format text per enviar al proveïdor"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(com)}
                      className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(com.id)}
                      className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lines Table */}
                <div className="pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800/60">
                          <th className="py-2">Material</th>
                          <th className="py-2 text-center">Qty Demanada</th>
                          <th className="py-2 text-center">Qty Rebuda</th>
                          <th className="py-2 text-right">Preu Pactat</th>
                          <th className="py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {(com.linies || []).map((l, i) => {
                          const mat = materials.find(m => m.id === l.materialId);

                          return (
                            <tr key={i} className="text-slate-300">
                              <td className="py-2">
                                <div className="font-medium text-slate-200">{mat ? mat.material : 'Material'}</div>
                                {mat?.codiProPrin && <span className="text-[10px] font-mono text-slate-500">Ref: {mat.codiProPrin}</span>}
                              </td>
                              <td className="py-2 text-center font-mono">
                                {l.quantitatDemanada} {mat?.unitat || 'u'}
                              </td>
                              <td className="py-2 text-center font-mono">
                                {l.quantitatRebuda || 0} {mat?.unitat || 'u'}
                              </td>
                              <td className="py-2 text-right font-mono">
                                {formatCurrency(l.preuPactat, 2)}
                              </td>
                              <td className="py-2 text-right font-mono font-semibold text-amber-400">
                                {formatCurrency(Number(l.quantitatDemanada || 0) * Number(l.preuPactat || 0), 2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-3 text-xs border-t border-slate-800/60 mt-2">
                    <p className="text-slate-400 italic line-clamp-1 max-w-xl">
                      {com.observacions ? `Obs: ${com.observacions}` : ''}
                    </p>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 mr-2">Total Comanda:</span>
                      <span className="font-mono font-extrabold text-amber-400 text-sm">
                        {formatCurrency(totalComanda, 2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova / Editar Comanda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <ShoppingCart className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingComanda ? 'Editar Comanda' : 'Crear Nova Ordre de Compra'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="comanda-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Comanda"
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

            <form id="comanda-modal-form" onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Proveïdor *</label>
                  <select
                    value={formData.proveidorId}
                    onChange={(e) => setFormData({ ...formData, proveidorId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
                      <option key={p.id} value={p.id}>{p.empresa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estat de la Comanda</label>
                  <select
                    value={formData.estat}
                    onChange={(e) => setFormData({ ...formData, estat: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Pendent">Pendent</option>
                    <option value="Demanat">Demanat</option>
                    <option value="Rebut">Rebut</option>
                    <option value="Cancel·lat">Cancel·lat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Data de Creació</label>
                  <input
                    type="date"
                    value={formData.dataCreacio}
                    onChange={(e) => setFormData({ ...formData, dataCreacio: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Observacions</label>
                <input
                  type="text"
                  value={formData.observacions}
                  onChange={(e) => setFormData({ ...formData, observacions: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Observacions per al proveïdor o internes..."
                />
              </div>

              {/* Línies de comanda */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400">Línies de Material</span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMat = materials[0];
                      setFormData(prev => ({
                        ...prev,
                        linies: [
                          ...prev.linies,
                          { materialId: firstMat?.id || '', quantitatDemanada: 1, quantitatRebuda: 0, preuPactat: firstMat?.preuProPrin || 0 }
                        ]
                      }));
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    + Afegir Línia
                  </button>
                </div>

                {formData.linies.map((l, idx) => {
                  const mat = materials.find(m => m.id === l.materialId);

                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-5">
                        <label className="block text-[10px] text-slate-500 mb-1">Material</label>
                        <select
                          value={l.materialId}
                          onChange={(e) => {
                            const newMat = materials.find(m => m.id === e.target.value);
                            const updated = [...formData.linies];
                            updated[idx].materialId = e.target.value;
                            if (newMat) updated[idx].preuPactat = newMat.preuProPrin || 0;
                            setFormData({ ...formData, linies: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs"
                        >
                          {[...materials].sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca')).map(m => (
                            <option key={m.id} value={m.id}>{m.material} ({m.unitat})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1">Quantitat ({mat?.unitat || 'u'})</label>
                        <DecimalInput
                          value={l.quantitatDemanada}
                          onChange={(e, num) => {
                            const updated = [...formData.linies];
                            updated[idx].quantitatDemanada = num;
                            setFormData({ ...formData, linies: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-1">Preu Unitari (€)</label>
                        <DecimalInput
                          value={l.preuPactat}
                          onChange={(e, num) => {
                            const updated = [...formData.linies];
                            updated[idx].preuPactat = num;
                            setFormData({ ...formData, linies: updated });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs font-mono"
                        />
                      </div>

                      <div className="md:col-span-1 flex items-center justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              linies: prev.linies.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1.5 text-red-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recepció de Comanda */}
      {receptionModalOpen && selectedComandaToReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-xl max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">Recepció de Comanda {selectedComandaToReceive.id}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="reception-modal-form"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Confirmar Recepció"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setReceptionModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                  title="Tancar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form id="reception-modal-form" onSubmit={handleConfirmReception} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Núm. d'Albarà / Factura de Entrada</label>
                <input
                  type="text"
                  required
                  value={receptionData.numAlbara}
                  onChange={(e) => setReceptionData({ ...receptionData, numAlbara: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. ALB-2026-8812"
                />
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="updatePricesCheck"
                  checked={receptionData.updatePrices}
                  onChange={(e) => setReceptionData({ ...receptionData, updatePrices: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="updatePricesCheck" className="text-slate-200 font-medium cursor-pointer">
                  Actualitzar el preu de cost del material segons el preu d'aquesta comanda
                </label>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-semibold text-slate-300 block">Comprovació de Quantitats Rebudes:</span>
                {receptionData.receivedLines && receptionData.receivedLines.map((l, idx) => {
                  const mat = materials.find(m => m.id === l.materialId);

                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-200">{mat?.material}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">Demanat: {l.quantitatDemanada} {mat?.unitat} · Preu: {formatCurrency(l.preuPactat, 2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-400">Rebut:</label>
                        <DecimalInput
                          value={l.quantitatRebuda}
                          onChange={(e, num) => {
                            const updated = [...receptionData.receivedLines];
                            updated[idx].quantitatRebuda = num;
                            setReceptionData({ ...receptionData, receivedLines: updated });
                          }}
                          className="w-24 p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono text-center text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
