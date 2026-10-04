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
  Info,
  X,
  Hammer,
  Lock
} from 'lucide-react';
import { resolveMediaUrl, resolveProducteMediaUrl } from '../../utils/mediaUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { isProductInGamma, getProductGammaLabel } from '../PrivateAreaSection';
import { getProductStockMetrics } from '../../utils/productStockUtils';

export default function EstocProductesManager({
  productes = [],
  setProductes,
  families = [],
  gammes = [],
  escandalls = [],
  ordresFabricacio = [],
  pressupostos = [],
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

  // Càlcul memoitzat de mètriques d'estoc, fabricació i reserves per a cada producte
  const productMetricsMap = useMemo(() => {
    const map = {};
    productes.forEach(p => {
      map[p.id] = getProductStockMetrics(p, ordresFabricacio, pressupostos, escandalls);
    });
    return map;
  }, [productes, ordresFabricacio, pressupostos, escandalls]);

  // Càlcul de mètriques globals
  const stats = useMemo(() => {
    let totalVenda = 0;
    let totalMostres = 0;
    let totalFabricantSe = 0;
    let totalReservat = 0;
    let sotaMinims = 0;
    let esgotats = 0;

    productes.forEach(p => {
      const m = productMetricsMap[p.id] || {
        estocActual: Math.max(0, parseInt(p.estocActual, 10) || 0),
        estocMostres: Math.max(0, parseInt(p.estocMostres, 10) || 0),
        estocMinim: p.estocMinim !== undefined ? parseInt(p.estocMinim, 10) : 2,
        fabricantSe: 0,
        reservat: 0
      };

      totalVenda += m.estocActual;
      totalMostres += m.estocMostres;
      totalFabricantSe += m.fabricantSe;
      totalReservat += m.reservat;

      if (m.estocActual === 0) esgotats += 1;
      else if (m.estocActual <= m.estocMinim) sotaMinims += 1;
    });

    return { 
      totalVenda, 
      totalMostres, 
      totalFabricantSe, 
      totalReservat, 
      sotaMinims, 
      esgotats, 
      totalProductes: productes.length 
    };
  }, [productes, productMetricsMap]);

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
    return getProductGammaLabel(p, gammes) || (Array.isArray(p.gammaIds) && p.gammaIds.length > 0 ? p.gammaIds[0] : 'Sense gamma');
  };

  // Llista de gammes disponibles segons la família seleccionada
  const availableGammes = useMemo(() => {
    if (selectedFamiliaFilter === 'all') return gammes;
    return gammes.filter(g => {
      const famNom = (g.familiaNom || '').toLowerCase();
      const selFam = selectedFamiliaFilter.toLowerCase();
      return famNom.includes(selFam) || selFam.includes(famNom);
    });
  }, [gammes, selectedFamiliaFilter]);

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

      // Gamma (resilient matching per nom exacte, normalitzat o inclusió)
      if (selectedGammaFilter !== 'all') {
        const gamList = [
          ...(Array.isArray(p.gammaIds) ? p.gammaIds : (p.gammaIds ? [p.gammaIds] : [])),
          ...(p.gamma ? [p.gamma] : []),
          ...(p.gammaNom ? [p.gammaNom] : [])
        ];
        const matchGam = isProductInGamma(gamList, selectedGammaFilter, gammes);
        if (!matchGam) return false;
      }

      // Família (per familaIds, familiaIds, familiaNom o a través de la gamma)
      if (selectedFamiliaFilter !== 'all') {
        const famList = [
          ...(Array.isArray(p.familaIds) ? p.familaIds : []),
          ...(Array.isArray(p.familiaIds) ? p.familiaIds : []),
          ...(p.familia ? [p.familia] : []),
          ...(p.familiaNom ? [p.familiaNom] : [])
        ];
        const gamList = [
          ...(Array.isArray(p.gammaIds) ? p.gammaIds : (p.gammaIds ? [p.gammaIds] : [])),
          ...(p.gamma ? [p.gamma] : []),
          ...(p.gammaNom ? [p.gammaNom] : [])
        ];
        const gammaMatchesFamily = gamList.some(gName => {
          const gObj = gammes.find(g => isProductInGamma([gName], g.nom, gammes));
          return gObj?.familiaNom && gObj.familiaNom.toLowerCase().includes(selectedFamiliaFilter.toLowerCase());
        });

        const matchFam = famList.some(f => f.toLowerCase().includes(selectedFamiliaFilter.toLowerCase())) ||
          isProductInGamma(p.gammaIds, selectedFamiliaFilter, gammes) ||
          gammaMatchesFamily;

        if (!matchFam) return false;
      }

      // Estat d'estoc
      const m = productMetricsMap[p.id] || { estocActual: 0, estocMostres: 0, estocMinim: 2, fabricantSe: 0, reservat: 0 };
      const venda = m.estocActual;
      const mostres = m.estocMostres;
      const minim = m.estocMinim;

      if (stockStatusFilter === 'low') return venda > 0 && venda <= minim;
      if (stockStatusFilter === 'in_stock') return venda > 0;
      if (stockStatusFilter === 'out_of_stock') return venda === 0;
      if (stockStatusFilter === 'has_samples') return mostres > 0;
      if (stockStatusFilter === 'fabricating') return m.fabricantSe > 0;
      if (stockStatusFilter === 'reserved') return m.reservat > 0;

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
      if (sortBy === 'fabricantSe') {
        valA = productMetricsMap[a.id]?.fabricantSe || 0;
        valB = productMetricsMap[b.id]?.fabricantSe || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'reservat') {
        valA = productMetricsMap[a.id]?.reservat || 0;
        valB = productMetricsMap[b.id]?.reservat || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'estocMostres') {
        valA = parseInt(a.estocMostres, 10) || 0;
        valB = parseInt(b.estocMostres, 10) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [productes, searchTerm, selectedGammaFilter, selectedFamiliaFilter, stockStatusFilter, sortBy, sortOrder, gammes, productMetricsMap]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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

        {/* Fabricant-se (OFs actives) */}
        <div 
          onClick={() => setStockStatusFilter(stockStatusFilter === 'fabricating' ? 'all' : 'fabricating')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stockStatusFilter === 'fabricating' ? 'ring-2 ring-sky-500' : ''
          } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          title="Filtra productes que s'estan fabricant ara mateix"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fabricant-se</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
              {stats.totalFabricantSe}
            </span>
            <span className="text-xs text-slate-500">peces en OFs</span>
          </div>
          <p className="text-[11px] text-sky-600/80 dark:text-sky-400/80 mt-1">
            En curs o cua de taller
          </p>
        </div>

        {/* Reservat en Comandes */}
        <div 
          onClick={() => setStockStatusFilter(stockStatusFilter === 'reserved' ? 'all' : 'reserved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            stockStatusFilter === 'reserved' ? 'ring-2 ring-amber-500' : ''
          } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          title="Filtra productes amb reserves de clients"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reservat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.totalReservat}
            </span>
            <span className="text-xs text-slate-500">peces comandes</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
            Compromeses per clients
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
            <span className="text-xs text-slate-500">peces exposició</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
            Conservades al taller
          </p>
        </div>

        {/* Sota Mínims / Esgotats */}
        <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          stockStatusFilter === 'low' ? 'ring-2 ring-amber-500' : ''
        } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sota Mínims / 0</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-500">
              {stats.sotaMinims}
            </span>
            <span className="text-xs text-slate-500">({stats.esgotats} a zero)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Convé llançar OF de reposició
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

        {/* Desplegables de Família, Gamma i Estat */}
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
            <option value="fabricating">🔨 Fabricant-se (OFs actives)</option>
            <option value="reserved">🔒 Amb Reserves (Comandes)</option>
            <option value="low">🟡 Sota Mínims</option>
            <option value="out_of_stock">🔴 Esgotat (0 Venda)</option>
            <option value="has_samples">✨ Amb Mostres de Taller</option>
          </select>

          {/* Famílies */}
          {families.length > 0 && (
            <select
              value={selectedFamiliaFilter}
              onChange={(e) => {
                const newFam = e.target.value;
                setSelectedFamiliaFilter(newFam);
                if (newFam !== 'all' && selectedGammaFilter !== 'all') {
                  const gamObj = gammes.find(g => isProductInGamma([selectedGammaFilter], g.nom, gammes));
                  if (gamObj && gamObj.familiaNom && !gamObj.familiaNom.toLowerCase().includes(newFam.toLowerCase())) {
                    setSelectedGammaFilter('all');
                  }
                }
              }}
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

          {/* Gammes */}
          <select
            value={selectedGammaFilter}
            onChange={(e) => setSelectedGammaFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="all">📁 Totes les Gammes</option>
            {availableGammes.map(g => (
              <option key={g.id || g.nom} value={g.nom}>
                {selectedFamiliaFilter === 'all' && g.familiaNom ? `(${g.familiaNom}) ${g.nom}` : g.nom}
              </option>
            ))}
          </select>

          {/* Botó Netejar filtres */}
          {(selectedFamiliaFilter !== 'all' || selectedGammaFilter !== 'all' || stockStatusFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedFamiliaFilter('all');
                setSelectedGammaFilter('all');
                setStockStatusFilter('all');
                setSearchTerm('');
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                isDark 
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-300 hover:bg-rose-900/40' 
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
              title="Netejar tots els filtres"
            >
              <X className="w-3.5 h-3.5" />
              <span>Netejar</span>
            </button>
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
                <th className="p-3 text-center">🟢 Estoc Venda</th>
                <th className="p-2.5 text-center whitespace-nowrap">
                  <div className="flex flex-col items-center text-[10px] font-bold leading-tight">
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">🔨 Fabricant-se</span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">🔒 Reservat</span>
                  </div>
                </th>
                <th className="p-3 text-center">🟡 Mostres</th>
                <th className="p-3 text-center">Mínim</th>
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
                  const m = productMetricsMap[p.id] || getProductStockMetrics(p, ordresFabricacio, pressupostos, escandalls);
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
                      {/* Producte (Foto + Gamma + Nom + Preu) */}
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
                            <span className={`font-mono text-[10px] font-bold block truncate max-w-[200px] ${
                              isDark ? 'text-amber-400' : 'text-amber-700'
                            }`} title={`Gamma: ${gamma}`}>
                              {gamma || 'Sense gamma'}
                            </span>
                            <span className={`font-semibold text-sm block ${
                              isDark ? 'text-slate-100' : 'text-slate-900 font-bold'
                            }`}>
                              {p.nom}
                            </span>
                            {p.preu && (
                              <span className={`text-[11px] font-mono ${
                                isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
                              }`}>
                                {formatCurrency(p.preu, 2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Estoc de Venda (Interactive Counter Estret) */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg border ${
                            isDark 
                              ? 'bg-emerald-950/30 border-emerald-500/30' 
                              : 'bg-emerald-50 border-emerald-300 shadow-2xs'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleUpdateStockField(p.id, 'estocActual', -1)}
                              className={`w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                                isDark 
                                  ? 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200' 
                                  : 'bg-emerald-200/90 hover:bg-emerald-300 text-emerald-950 font-extrabold shadow-2xs'
                              }`}
                              title="Restar 1 unitat de venda"
                            >
                              <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
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
                              className={`w-8 text-center p-0 bg-transparent font-mono font-black text-xs outline-none border-0 focus:ring-0 ${
                                isDark ? 'text-emerald-400' : 'text-emerald-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateStockField(p.id, 'estocActual', 1)}
                              className={`w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                                isDark 
                                  ? 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200' 
                                  : 'bg-emerald-200/90 hover:bg-emerald-300 text-emerald-950 font-extrabold shadow-2xs'
                              }`}
                              title="Sumar 1 unitat de venda"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                          </div>
                          {m.reservat > 0 && (
                            <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              Disp: {m.estocDisponible} u
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fabricant-se i Reservat (en dues línies, model Materials) */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {m.fabricantSe === 0 && m.reservat === 0 ? (
                          <span className="text-slate-300 dark:text-slate-600 font-mono text-xs">-</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* Línia 1: Fabricant-se */}
                            {m.fabricantSe > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (setActiveProduccSubtab) {
                                    sessionStorage.setItem('producc_initial_subtab', 'ordres_fabricacio');
                                    sessionStorage.setItem('producc_initial_of_product_nom', p.nom);
                                    setActiveProduccSubtab('ordres_fabricacio');
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 font-mono text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all border border-sky-500/20 shadow-2xs"
                                title={`Fabricant-se en ${m.ofsFabricant.length} OF${m.ofsFabricant.length > 1 ? 's' : ''}:\n${m.ofsFabricant.map(o => `• ${o.codi}: ${o.quantitat} u (${o.estat})`).join('\n')}\n\n(Fes clic per anar a Ordres de Fabricació)`}
                              >
                                <Hammer className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                                <span>{m.fabricantSe} u</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-[10px] font-mono leading-none">-</span>
                            )}

                            {/* Línia 2: Reservat */}
                            {m.reservat > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold inline-flex items-center gap-1 cursor-default border border-amber-500/20 shadow-2xs"
                                title={`Reservades en ${m.comandesReservades.length} comanda${m.comandesReservades.length > 1 ? 'es' : ''}:\n${m.comandesReservades.map(c => `• ${c.codi} (${c.client}): ${c.quantitat} u [${c.estatComanda}]`).join('\n')}`}
                              >
                                <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                <span>{m.reservat} u</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-[10px] font-mono leading-none">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Mostres de Taller (Interactive Counter Estret) */}
                      <td className="p-3 text-center">
                        <div className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg border ${
                          isDark 
                            ? 'bg-amber-950/30 border-amber-500/30' 
                            : 'bg-amber-50 border-amber-300 shadow-2xs'
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocMostres', -1)}
                            className={`w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                              isDark 
                                ? 'bg-amber-900/50 hover:bg-amber-800 text-amber-200' 
                                : 'bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-extrabold shadow-2xs'
                            }`}
                            title="Restar 1 mostra de taller"
                          >
                            <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
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
                            className={`w-8 text-center p-0 bg-transparent font-mono font-black text-xs outline-none border-0 focus:ring-0 ${
                              isDark ? 'text-amber-400' : 'text-amber-950'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStockField(p.id, 'estocMostres', 1)}
                            className={`w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                              isDark 
                                ? 'bg-amber-900/50 hover:bg-amber-800 text-amber-200' 
                                : 'bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-extrabold shadow-2xs'
                            }`}
                            title="Sumar 1 mostra de taller"
                          >
                            <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
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
                          className={`w-12 text-center py-1 px-1 rounded-lg border font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-900'
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
                              className={`px-2 py-1 rounded border text-xs font-mono outline-none w-28 ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
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
                            className={`flex items-center gap-1 text-xs font-mono group cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900 font-medium'
                            }`}
                            title="Fes clic per editar la ubicació"
                          >
                            <MapPin className="w-3 h-3 text-amber-500/70 group-hover:text-amber-500" />
                            <span>{p.ubicacioTaller || 'Definir calaix...'}</span>
                          </button>
                        )}
                      </td>

                      {/* Estat d'estoc */}
                      <td className="p-3.5">
                        {isOut ? (
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${
                            isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            <XCircle className="w-3 h-3" /> Esgotat
                          </span>
                        ) : isLow ? (
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${
                            isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <AlertTriangle className="w-3 h-3" /> Sota mínims
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${
                            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all border ${
                            isDark 
                              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold'
                          }`}
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
