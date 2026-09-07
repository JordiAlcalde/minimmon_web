import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Package, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Minus, 
  Factory, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  ArrowUpDown, 
  ClipboardList,
  Filter,
  Eye,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { resolveMediaUrl, resolveProducteMediaUrl } from '../../utils/mediaUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function EstocProductesManager({
  productes = [],
  setProductes,
  families = [],
  gammes = [],
  escandalls = [],
  ordresFabricacio = [],
  setActiveProduccSubtab,
  isDark = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGammaFilter, setSelectedGammaFilter] = useState('all');
  const [selectedFamiliaFilter, setSelectedFamiliaFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'low' | 'in_stock' | 'out_of_stock' | 'has_samples'
  const [sortBy, setSortBy] = useState('nom'); // 'nom' | 'codi' | 'estocActual' | 'estocMostres'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [editingUbicacioId, setEditingUbicacioId] = useState(null);
  const [tempUbicacio, setTempUbicacio] = useState('');

  // Càlcul de mètriques globals
  const stats = useMemo(() => {
    let totalVenda = 0;
    let totalMostres = 0;
    let sotaMinims = 0;
    let esgotats = 0;

    productes.forEach(p => {
      const venda = Math.max(0, parseInt(p.estocActual, 10) || 0);
      const mostres = Math.max(0, parseInt(p.estocMostres, 10) || 0);
      const minim = p.estocMinim !== undefined ? parseInt(p.estocMinim, 10) : 2;

      totalVenda += venda;
      totalMostres += mostres;
      if (venda === 0) esgotats += 1;
      else if (venda <= minim) sotaMinims += 1;
    });

    return { totalVenda, totalMostres, sotaMinims, esgotats, totalProductes: productes.length };
  }, [productes]);

  // Actualització ràpida d'un camp numèric a un producte (reactivitat immediata + Firestore directe)
  const handleUpdateStockField = async (productId, field, deltaOrValue, isAbsolute = false) => {
    const targetProduct = productes.find(p => p.id === productId);
    if (!targetProduct) return;

    let currentVal = parseInt(targetProduct[field], 10) || 0;
    let newVal;
    if (isAbsolute) {
      if (deltaOrValue === '' || deltaOrValue === null || deltaOrValue === undefined) {
        newVal = '';
      } else {
        newVal = Math.max(0, parseInt(deltaOrValue, 10) || 0);
      }
    } else {
      newVal = Math.max(0, currentVal + deltaOrValue);
    }

    // 1. Actualització immediata de l'estat local
    if (setProductes) {
      setProductes(prev => prev.map(p => p.id === productId ? { ...p, [field]: newVal } : p));
    }

    // 2. Gravació directa a Firestore sense re-serialitzar tota la col·lecció
    try {
      const dbVal = newVal === '' ? 0 : Number(newVal);
      await updateDoc(doc(db, "productes", productId), {
        [field]: dbVal
      });
    } catch (err) {
      console.error(`Error guardant ${field} per a ${productId}:`, err);
    }
  };

  // Desar canvi d'ubicació
  const handleSaveUbicacio = async (productId) => {
    const trimmed = tempUbicacio.trim();
    if (setProductes) {
      setProductes(prev => prev.map(p => p.id === productId ? { ...p, ubicacioTaller: trimmed } : p));
    }
    setEditingUbicacioId(null);
    try {
      await updateDoc(doc(db, "productes", productId), {
        ubicacioTaller: trimmed
      });
    } catch (err) {
      console.error("Error guardant ubicació:", err);
    }
  };

  // Resolució del nom de gamma del producte
  const getProductGamma = (p) => {
    if (Array.isArray(p.gammaIds) && p.gammaIds.length > 0) {
      return p.gammaIds[0];
    }
    return 'Sense gamma';
  };

  // Filtratge i ordenació
  const filteredProducts = useMemo(() => {
    return productes.filter(p => {
      const nom = (p.nom || '').toLowerCase();
      const codi = (p.codi || '').toLowerCase();
      const ubi = (p.ubicacioTaller || '').toLowerCase();
      const s = searchTerm.toLowerCase();

      // Cerca
      if (searchTerm && !nom.includes(s) && !codi.includes(s) && !ubi.includes(s)) {
        return false;
      }

      // Gamma
      if (selectedGammaFilter !== 'all') {
        const gam = getProductGamma(p);
        if (gam !== selectedGammaFilter) return false;
      }

      // Família
      if (selectedFamiliaFilter !== 'all') {
        const fams = Array.isArray(p.familaIds) ? p.familaIds : [];
        if (!fams.includes(selectedFamiliaFilter)) return false;
      }

      // Estat d'estoc
      const venda = Math.max(0, parseInt(p.estocActual, 10) || 0);
      const mostres = Math.max(0, parseInt(p.estocMostres, 10) || 0);
      const minim = p.estocMinim !== undefined ? parseInt(p.estocMinim, 10) : 2;

      if (stockStatusFilter === 'low') return venda > 0 && venda <= minim;
      if (stockStatusFilter === 'in_stock') return venda > 0;
      if (stockStatusFilter === 'out_of_stock') return venda === 0;
      if (stockStatusFilter === 'has_samples') return mostres > 0;

      return true;
    }).sort((a, b) => {
      let valA, valB;
      if (sortBy === 'nom') {
        valA = a.nom || '';
        valB = b.nom || '';
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB, 'ca') 
          : valB.localeCompare(valA, 'ca');
      }
      if (sortBy === 'codi') {
        valA = a.codi || '';
        valB = b.codi || '';
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB, 'ca') 
          : valB.localeCompare(valA, 'ca');
      }
      if (sortBy === 'estocActual') {
        valA = parseInt(a.estocActual, 10) || 0;
        valB = parseInt(b.estocActual, 10) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'estocMostres') {
        valA = parseInt(a.estocMostres, 10) || 0;
        valB = parseInt(b.estocMostres, 10) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [productes, searchTerm, selectedGammaFilter, selectedFamiliaFilter, stockStatusFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* 1. Header i Targetes Resum (KPIs) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <span>Estoc de Productes i Mostres de Taller</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control d'unitats acabades per a la venda immediata i peces d'exposició o taller.
          </p>
        </div>

        {/* Accions ràpides */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveProduccSubtab && setActiveProduccSubtab('ordres_fabricacio')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Factory className="w-4 h-4" />
            <span>Ordres de Fabricació (OF)</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Venda */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total En Venda</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.totalVenda}
            </span>
            <span className="text-xs text-slate-500">unitats llestes</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Badge immediat (24/48h) al web
          </p>
        </div>

        {/* Mostres de Taller */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mostres de Taller</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.totalMostres}
            </span>
            <span className="text-xs text-slate-500">peces d'exposició</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
            Conservades al taller per ensenyar
          </p>
        </div>

        {/* Sota Mínims */}
        <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          stockStatusFilter === 'low' ? 'ring-2 ring-amber-500' : ''
        } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sota Mínims</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-500">
              {stats.sotaMinims}
            </span>
            <span className="text-xs text-slate-500">productes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Convé llançar OF de reposició
          </p>
        </div>

        {/* Esgotats */}
        <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          stockStatusFilter === 'out_of_stock' ? 'ring-2 ring-red-500' : ''
        } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          onClick={() => setStockStatusFilter(stockStatusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Esgotats (0 Venda)</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-red-500">
              {stats.esgotats}
            </span>
            <span className="text-xs text-slate-500">sota comanda (3-5d)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            S'informa del termini de fabricació
          </p>
        </div>
      </div>

      {/* 2. Barra de Filtres i Cercador */}
      <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row gap-3 items-center justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Cercador */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cercar producte, codi o calaix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200'
            }`}
          />
        </div>

        {/* Desplegables de Gamma i Estat */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Estat d'estoc */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="all">📦 Tots els Estats</option>
            <option value="in_stock">🟢 Amb Estoc de Venda</option>
            <option value="low">🟡 Sota Mínims</option>
            <option value="out_of_stock">🔴 Esgotat (0 Venda)</option>
            <option value="has_samples">✨ Amb Mostres de Taller</option>
          </select>

          {/* Gammes */}
          <select
            value={selectedGammaFilter}
            onChange={(e) => setSelectedGammaFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="all">📁 Totes les Gammes</option>
            {gammes.map(g => (
              <option key={g.id || g.nom} value={g.nom}>{g.nom}</option>
            ))}
          </select>

          {/* Famílies */}
          {families.length > 0 && (
            <select
              value={selectedFamiliaFilter}
              onChange={(e) => setSelectedFamiliaFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">🏷️ Totes les Famílies</option>
              {families.map(f => (
                <option key={f.id || f.nom} value={f.nom}>{f.nom}</option>
              ))}
            </select>
          )}

          {/* Ordenació */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
            }`}
            title="Invertir ordre"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>
        </div>
      </div>

      {/* 3. Taula Principal d'Estoc */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-semibold text-[11px] ${
              isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5 pl-4">Producte</th>
                <th className="p-3.5">Gamma</th>
                <th className="p-3.5 text-center">🟢 Estoc Venda</th>
                <th className="p-3.5 text-center">🟡 Mostres Taller</th>
                <th className="p-3.5 text-center">Mínim</th>
                <th className="p-3.5">📍 Ubicació Taller</th>
                <th className="p-3.5">Estat</th>
                <th className="p-3.5 pr-4 text-right">Acció</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-500">
                    No s'ha trobat cap producte que coincideixi amb els criteris de cerca.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const venda = p.estocActual === '' ? '' : Math.max(0, parseInt(p.estocActual, 10) || 0);
                  const mostres = p.estocMostres === '' ? '' : Math.max(0, parseInt(p.estocMostres, 10) || 0);
                  const minim = p.estocMinim === '' ? '' : (p.estocMinim !== undefined ? parseInt(p.estocMinim, 10) : 2);
                  const numVenda = Number(venda || 0);
                  const numMinim = Number(minim || 2);
                  const isLow = numVenda > 0 && numVenda <= numMinim;
                  const isOut = numVenda === 0;

                  // Imatge
                  let img = p.imatgePrincipal || (Array.isArray(p.imatges) && p.imatges[0]) || '';
                  img = resolveProducteMediaUrl(img) || resolveMediaUrl('images/tots_productes.jpg');

                  const gamma = getProductGamma(p);

                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-slate-500/5 transition-colors ${
                        isLow ? (isDark ? 'bg-amber-950/10' : 'bg-amber-50/40') : ''
                      }`}
                    >
                      {/* Producte (Foto + Nom + Codi) */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 shrink-0 relative">
                            <img 
                              src={img} 
                              alt={p.nom} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = resolveMediaUrl('images/tots_productes.jpg');
                              }}
                            />
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-amber-500 font-bold block">
                              {p.codi || 'PRDT-0000'}
                            </span>
                            <span className="font-semibold text-sm text-slate-200 dark:text-slate-100 block">
                              {p.nom}
                            </span>
                            {p.preu && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatCurrency(p.preu, 2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Gamma */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-block ${
                          isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {gamma}
                        </span>
                      </td>

                      {/* Estoc de Venda (Interactive Counter) */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocActual', -1)}
                            className="w-6 h-6 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                            title="Restar 1 unitat de venda"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={venda}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateStockField(p.id, 'estocActual', val, true);
                            }}
                            onBlur={() => {
                              if (p.estocActual === '' || p.estocActual === undefined) {
                                handleUpdateStockField(p.id, 'estocActual', 0, true);
                              }
                            }}
                            className="w-12 text-center p-0 bg-transparent font-mono font-bold text-sm text-emerald-400 outline-none border-0 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocActual', 1)}
                            className="w-6 h-6 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                            title="Sumar 1 unitat de venda"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Mostres de Taller (Interactive Counter) */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-amber-950/20 border border-amber-500/30">
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocMostres', -1)}
                            className="w-6 h-6 rounded-lg bg-amber-900/50 hover:bg-amber-800 text-amber-200 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                            title="Restar 1 mostra de taller"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={mostres}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateStockField(p.id, 'estocMostres', val, true);
                            }}
                            onBlur={() => {
                              if (p.estocMostres === '' || p.estocMostres === undefined) {
                                handleUpdateStockField(p.id, 'estocMostres', 0, true);
                              }
                            }}
                            className="w-12 text-center p-0 bg-transparent font-mono font-bold text-sm text-amber-400 outline-none border-0 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocMostres', 1)}
                            className="w-6 h-6 rounded-lg bg-amber-900/50 hover:bg-amber-800 text-amber-200 font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                            title="Sumar 1 mostra de taller"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Estoc Mínim */}
                      <td className="p-3.5 text-center font-mono">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={minim}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleUpdateStockField(p.id, 'estocMinim', val, true);
                          }}
                          onBlur={() => {
                            if (p.estocMinim === '' || p.estocMinim === undefined) {
                              handleUpdateStockField(p.id, 'estocMinim', 2, true);
                            }
                          }}
                          className={`w-12 text-center py-1 px-1 rounded-lg border font-mono text-xs font-semibold outline-none focus:ring-1 focus:ring-amber-500 ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
                          }`}
                          title="Llindar d'estoc mínim"
                        />
                      </td>

                      {/* Ubicació al Taller */}
                      <td className="p-3.5">
                        {editingUbicacioId === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempUbicacio}
                              onChange={(e) => setTempUbicacio(e.target.value)}
                              placeholder="Ex: Calaix A3"
                              className="px-2 py-1 rounded border text-xs font-mono bg-slate-950 text-slate-100 outline-none w-28"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveUbicacio(p.id);
                                if (e.key === 'Escape') setEditingUbicacioId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveUbicacio(p.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUbicacioId(p.id);
                              setTempUbicacio(p.ubicacioTaller || '');
                            }}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-mono group cursor-pointer"
                            title="Fes clic per editar la ubicació"
                          >
                            <MapPin className="w-3 h-3 text-amber-500/70 group-hover:text-amber-400" />
                            <span>{p.ubicacioTaller || 'Definir calaix...'}</span>
                          </button>
                        )}
                      </td>

                      {/* Estat d'estoc */}
                      <td className="p-3.5">
                        {isOut ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/30 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Esgotat
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Sota mínims
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Correcte
                          </span>
                        )}
                      </td>

                      {/* Acció: Llançar OF */}
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (setActiveProduccSubtab) {
                              sessionStorage.setItem('producc_initial_subtab', 'ordres_fabricacio');
                              sessionStorage.setItem('producc_initial_of_product_nom', p.nom);
                              setActiveProduccSubtab('ordres_fabricacio');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          title="Llançar Ordre de Fabricació (OF) per reposar aquest producte"
                        >
                          <Factory className="w-3.5 h-3.5" />
                          <span>Llançar OF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
