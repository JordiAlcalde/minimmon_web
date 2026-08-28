import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Plus, Search, Filter, Calendar, Clock, AlertTriangle, 
  CheckCircle2, PlayCircle, Eye, Printer, Trash2, X, Save, ArrowRight,
  Package, Wrench, Layers, User, Phone, Sparkles, Check, ChevronDown, 
  ArrowLeft, RotateCw, FileText, Download, ChevronRight, BarChart2, Flame,
  Boxes, Factory, HelpCircle
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { formatDecimal, parseDecimal } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';
import { AVAILABLE_FONTS } from '../FontSelectorDropdown';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';

// Helper per generar el següent ID correlatiu OF-[ANY]-0001
export function getNextOFId(existingOFs = [], targetYear = new Date().getFullYear()) {
  const yearStr = String(targetYear);
  const prefix = `OF-${yearStr}-`;
  
  let maxNum = 0;
  existingOFs.forEach(of => {
    if (of.id && of.id.startsWith(prefix)) {
      const numPart = parseInt(of.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

export default function OrdresFabricacioManager({
  ordresFabricacio = [],
  setOrdresFabricacio,
  materials = [],
  setMaterials,
  escandalls = [],
  productes = [],
  families = [],
  gammes = [],
  maquinaria = [],
  operacions = [],
  isDark = true
}) {
  // Filtres i cerques
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' | 2026 | 2025 ...
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'cua' | 'en_curs' | 'acabats' | 'finalitzada' | 'cancel·lada'
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('all'); // 'all' | 'urgent' | 'normal' | 'baixa'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals d'interacció
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOFDetail, setSelectedOFDetail] = useState(null);
  const [printOF, setPrintOF] = useState(null);

  // Sol·licituds / Pressupostos web pendents (llegits en temps real de Firestore)
  const [webBudgets, setWebBudgets] = useState([]);
  const [isLoadingWebBudgets, setIsLoadingWebBudgets] = useState(false);

  useEffect(() => {
    setIsLoadingWebBudgets(true);
    const unsub = onSnapshot(collection(db, "pressupostos"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setWebBudgets(list);
      setIsLoadingWebBudgets(false);
    }, (err) => {
      console.warn("Error llegint pressupostos per a OF:", err);
      setIsLoadingWebBudgets(false);
    });
    return () => unsub();
  }, []);

  // Llista d'anys presents a les OFs per al selector d'històric
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    ordresFabricacio.forEach(of => {
      if (of.dataCreacio) {
        const y = new Date(of.dataCreacio).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
      if (of.id && of.id.startsWith('OF-')) {
        const parts = of.id.split('-');
        if (parts[1] && !isNaN(parseInt(parts[1], 10))) {
          yearsSet.add(parseInt(parts[1], 10));
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [ordresFabricacio, currentYear]);

  // Recomptes per a les mètriques d'estat
  const stats = useMemo(() => {
    const total = ordresFabricacio.length;
    const cua = ordresFabricacio.filter(o => o.estat === 'cua').length;
    const enCurs = ordresFabricacio.filter(o => o.estat === 'en_curs').length;
    const acabats = ordresFabricacio.filter(o => o.estat === 'acabats').length;
    const finalitzada = ordresFabricacio.filter(o => o.estat === 'finalitzada').length;
    const cancel·lada = ordresFabricacio.filter(o => o.estat === 'cancel·lada').length;
    const urgents = ordresFabricacio.filter(o => o.prioritat === 'urgent' && o.estat !== 'finalitzada' && o.estat !== 'cancel·lada').length;

    return { total, cua, enCurs, acabats, finalitzada, cancel·lada, urgents };
  }, [ordresFabricacio]);

  // Llista filtrada d'OFs per a la taula
  const filteredOFs = useMemo(() => {
    return ordresFabricacio.filter(of => {
      // Filtre d'Any
      if (selectedYear !== 'all') {
        const ofYear = of.dataCreacio ? new Date(of.dataCreacio).getFullYear() : (of.id?.split('-')?.[1] ? parseInt(of.id.split('-')[1], 10) : null);
        if (ofYear !== parseInt(selectedYear, 10)) return false;
      }

      // Filtre d'Estat
      if (selectedStatusFilter !== 'all' && of.estat !== selectedStatusFilter) {
        return false;
      }

      // Filtre de Prioritat
      if (selectedPriorityFilter !== 'all' && of.prioritat !== selectedPriorityFilter) {
        return false;
      }

      // Filtre de Cerca (text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (of.id || '').toLowerCase().includes(q);
        const matchClient = (of.clientNom || '').toLowerCase().includes(q);
        const matchContact = (of.clientContacte || '').toLowerCase().includes(q);
        const matchProd = (of.producteNom || '').toLowerCase().includes(q);
        const matchModel = (of.codiModelGenerat || '').toLowerCase().includes(q);
        const matchRef = (of.comandaRef || '').toLowerCase().includes(q);
        if (!matchId && !matchClient && !matchContact && !matchProd && !matchModel && !matchRef) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Prioritzar urgents i després data de creació descendent
      if (a.prioritat === 'urgent' && b.prioritat !== 'urgent' && a.estat !== 'finalitzada' && a.estat !== 'cancel·lada') return -1;
      if (b.prioritat === 'urgent' && a.prioritat !== 'urgent' && b.estat !== 'finalitzada' && b.estat !== 'cancel·lada') return 1;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [ordresFabricacio, selectedYear, selectedStatusFilter, selectedPriorityFilter, searchQuery]);

  // Canviar estat d'una OF amb gestió d'estoc (Reservat / Físic / Disponible)
  const handleChangeStatus = (ofId, newStatus) => {
    setOrdresFabricacio(prevOFs => {
      const targetOF = prevOFs.find(o => o.id === ofId);
      if (!targetOF) return prevOFs;

      const oldStatus = targetOF.estat;
      if (oldStatus === newStatus) return prevOFs;

      // Actualitzar materials a MaterialsManager segons el canvi d'estat
      if (setMaterials && Array.isArray(targetOF.materials) && targetOF.materials.length > 0) {
        setMaterials(prevMaterials => {
          return prevMaterials.map(mat => {
            const ofMat = targetOF.materials.find(m => m.materialId === mat.id);
            if (!ofMat) return mat;

            const qty = ofMat.quantitatTotal || 0;
            let estocFisic = mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0);
            let estocReservat = mat.estocReservat || 0;

            // 1. Si passa a 'finalitzada' (completada): descomptar estoc físic i alliberar reservat
            if (newStatus === 'finalitzada' && oldStatus !== 'finalitzada') {
              if (oldStatus === 'cua' || oldStatus === 'en_curs' || oldStatus === 'acabats') {
                estocReservat = Math.max(0, estocReservat - qty);
              }
              estocFisic = Math.max(0, estocFisic - qty);
            }

            // 2. Si passa a 'cancel·lada': alliberar reservat sense descomptar estoc físic
            else if (newStatus === 'cancel·lada' && (oldStatus === 'cua' || oldStatus === 'en_curs' || oldStatus === 'acabats')) {
              estocReservat = Math.max(0, estocReservat - qty);
            }

            // 3. Si torna a activar-se des de 'cancel·lada' o 'finalitzada' a 'cua'/'en_curs'
            else if ((newStatus === 'cua' || newStatus === 'en_curs' || newStatus === 'acabats') && (oldStatus === 'cancel·lada' || oldStatus === 'finalitzada')) {
              estocReservat += qty;
              if (oldStatus === 'finalitzada') {
                estocFisic += qty; // Revertir descompte físic
              }
            }

            const estocDisponible = Math.max(0, estocFisic - estocReservat);
            return {
              ...mat,
              estocFisic,
              estocReservat,
              estocDisponible,
              estoc: estocFisic
            };
          });
        });
      }

      return prevOFs.map(o => o.id === ofId ? { ...o, estat: newStatus } : o);
    });

    if (selectedOFDetail && selectedOFDetail.id === ofId) {
      setSelectedOFDetail(prev => prev ? { ...prev, estat: newStatus } : null);
    }
  };

  // Eliminar una OF
  const handleDeleteOF = (ofId) => {
    if (!window.confirm(`Segur que vols eliminar l'Ordre de Fabricació ${ofId}?`)) return;
    
    // Si estava reservant estoc, alliberar-lo
    const targetOF = ordresFabricacio.find(o => o.id === ofId);
    if (targetOF && (targetOF.estat === 'cua' || targetOF.estat === 'en_curs' || targetOF.estat === 'acabats') && setMaterials) {
      setMaterials(prevMats => {
        return prevMats.map(mat => {
          const ofMat = targetOF.materials?.find(m => m.materialId === mat.id);
          if (!ofMat) return mat;
          const qty = ofMat.quantitatTotal || 0;
          const estocFisic = mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0);
          const estocReservat = Math.max(0, (mat.estocReservat || 0) - qty);
          return {
            ...mat,
            estocReservat,
            estocDisponible: Math.max(0, estocFisic - estocReservat)
          };
        });
      });
    }

    setOrdresFabricacio(prev => prev.filter(o => o.id !== ofId));
    if (selectedOFDetail?.id === ofId) setSelectedOFDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* CAPÇALERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2 text-amber-500 dark:text-amber-400">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Ordres de Fabricació (OF)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió integral del procés de fabricació al taller, assignació de materials, reserva d'estocs i full de ruta d'operacions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Ordre de Fabricació
        </button>
      </div>

      {/* TARGETES KPI / MÈTRIQUES RÀPIDES (ALT CONTRAST) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Totes les OFs', count: stats.total, filter: 'all', active: selectedStatusFilter === 'all' },
          { label: 'En Cua', count: stats.cua, filter: 'cua', active: selectedStatusFilter === 'cua' },
          { label: 'En Curs', count: stats.enCurs, filter: 'en_curs', active: selectedStatusFilter === 'en_curs' },
          { label: 'En Acabats', count: stats.acabats, filter: 'acabats', active: selectedStatusFilter === 'acabats' },
          { label: 'Finalitzades', count: stats.finalitzada, filter: 'finalitzada', active: selectedStatusFilter === 'finalitzada' },
          { label: 'Urgents Actives', count: stats.urgents, filter: 'urgent_only', isUrgent: true }
        ].map((kpi, idx) => {
          const isSelected = kpi.active || (kpi.isUrgent && selectedPriorityFilter === 'urgent');

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (kpi.isUrgent) {
                  setSelectedPriorityFilter(selectedPriorityFilter === 'urgent' ? 'all' : 'urgent');
                } else {
                  setSelectedStatusFilter(kpi.filter);
                }
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500/50 shadow-md'
                  : (isDark 
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850' 
                      : 'bg-white border-slate-200 hover:border-amber-500/40 shadow-xs')
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-medium truncate ${
                  isSelected ? 'text-amber-400 font-bold' : (isDark ? 'text-slate-300' : 'text-slate-600')
                }`}>
                  {kpi.label}
                </span>
                {kpi.isUrgent && <Flame className="w-4 h-4 text-rose-500 animate-pulse" />}
              </div>
              <p className={`text-2xl font-bold font-mono mt-1.5 ${
                isSelected ? 'text-amber-400' : (isDark ? 'text-white' : 'text-slate-900')
              }`}>
                {kpi.count}
              </p>
            </button>
          );
        })}
      </div>

      {/* BARRA D'EINES I FILTRES */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Cercador */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Cerca per Codi OF, Client, Producte, Ref Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-white ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtres agrupats */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector d'Any / Històric */}
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}>
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Any:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`bg-transparent text-xs font-mono font-bold outline-none cursor-pointer ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Tots els anys</option>
                {availableYears.map(y => (
                  <option key={y} value={y} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{y}</option>
                ))}
              </select>
            </div>

            {/* Selector de Prioritat */}
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}>
              <Filter className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Prioritat:</span>
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className={`bg-transparent text-xs font-mono font-bold outline-none cursor-pointer ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Totes</option>
                <option value="urgent" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🔴 Urgent</option>
                <option value="normal" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚪ Normal</option>
                <option value="baixa" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🔵 Baixa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TAULA PRINCIPAL D'ORDRES DE FABRICACIÓ */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase text-[11px] tracking-wider ${
                isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <th className="py-3.5 px-4">Codi OF</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Client & Origen</th>
                <th className="py-3.5 px-4">Concepte & Model</th>
                <th className="py-3.5 px-4 text-center">Quantitat</th>
                <th className="py-3.5 px-4">Full de Ruta</th>
                <th className="py-3.5 px-4 text-center">Estat</th>
                <th className="py-3.5 px-4 text-right">Accions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
              {filteredOFs.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`py-12 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No s'ha trobat cap Ordre de Fabricació amb els filtres seleccionats.
                  </td>
                </tr>
              ) : (
                filteredOFs.map((of) => {
                  const totalOps = of.operacions?.length || 0;
                  const completedOps = of.operacions?.filter(o => o.completada)?.length || 0;
                  const percentOps = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

                  return (
                    <tr
                      key={of.id}
                      className={`hover:bg-amber-500/10 transition-colors ${
                        of.prioritat === 'urgent' && of.estat !== 'finalitzada' && of.estat !== 'cancel·lada'
                          ? (isDark ? 'bg-rose-950/20' : 'bg-rose-50/60')
                          : ''
                      }`}
                    >
                      {/* Codi OF + Prioritat */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tracking-tight ${
                            isDark ? 'text-amber-400' : 'text-amber-700'
                          }`}>
                            {of.id}
                          </span>
                          {of.prioritat === 'urgent' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                              <Flame className="w-3 h-3" /> URGENT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dates: Creació & Límit */}
                      <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                            Llançament: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{of.dataCreacio || '-'}</span>
                          </div>
                          {of.dataLimitEntrega && (
                            <div className={isDark ? 'text-amber-300' : 'text-amber-700'}>
                              Límit: <span className="font-bold underline">{of.dataLimitEntrega}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Client & Origen */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className={`font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {of.clientNom || 'Estoc Taller'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className={`px-2 py-0.2 rounded text-[10px] uppercase font-bold border ${
                              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {of.tipusItem === 'projecte' ? 'Projecte' : (of.origen === 'web_pressupost' ? 'Web' : (of.origen === 'estoc' ? 'Estoc' : 'Catàleg'))}
                            </span>
                            {of.comandaRef && (
                              <span className={`truncate max-w-[130px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {of.comandaRef}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Producte / Projecte, Model & Personalització */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="space-y-0.5">
                          <p className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {of.producteNom}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            {of.codiModelGenerat && (
                              <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                {of.codiModelGenerat}
                              </span>
                            )}
                            {of.mida && <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>({of.mida})</span>}
                          </div>
                          {(of.textCaraA || of.tipografia) && (
                            <p className={`text-[11px] italic truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`} style={{ fontFamily: of.tipografia ? AVAILABLE_FONTS.find(f => f.name === of.tipografia)?.fontFamily : undefined }}>
                              {of.textCaraA ? `"${of.textCaraA}"` : ''} {of.tipografia ? `[${of.tipografia}]` : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Quantitat */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`font-mono font-bold text-sm px-3 py-1 rounded-xl border ${
                          isDark 
                            ? 'bg-slate-800 text-white border-slate-700' 
                            : 'bg-slate-100 text-slate-900 border-slate-300'
                        }`}>
                          {of.quantitat} u
                        </span>
                      </td>

                      {/* Full de Ruta (Progrés) */}
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>
                              {completedOps}/{totalOps} passos
                            </span>
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{percentOps}%</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentOps === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percentOps}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Estat interactiu */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={of.estat}
                            onChange={(e) => handleChangeStatus(of.id, e.target.value)}
                            className={`text-xs font-mono font-bold rounded-full px-3.5 py-1.5 outline-none border cursor-pointer appearance-none pr-8 shadow-xs transition-colors ${
                              isDark 
                                ? 'bg-slate-800 border-slate-650 text-white hover:border-amber-500' 
                                : 'bg-white border-slate-300 text-slate-900 hover:border-amber-500'
                            }`}
                          >
                            <option value="cua" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Cua</option>
                            <option value="en_curs" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Curs</option>
                            <option value="acabats" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Acabats</option>
                            <option value="finalitzada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Finalitzada</option>
                            <option value="cancel·lada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Cancel·lada</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </td>

                      {/* Accions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOFDetail(of)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900'
                            }`}
                            title="Veure Fitxa Completa & Full de Ruta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintOF(of)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900'
                            }`}
                            title="Imprimir Full de Taller"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOF(of.id)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-rose-500/20 text-rose-400 border-slate-700 hover:border-rose-500/40' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-300 hover:border-rose-300'
                            }`}
                            title="Eliminar Ordre"
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

      {/* MODAL: NOVA ORDRE DE FABRICACIÓ (PERFECTAMENT ENCAIXAT DINS DE LA PANTALLA) */}
      {isNewModalOpen && (
        <NewOFModal
          onClose={() => setIsNewModalOpen(false)}
          existingOFs={ordresFabricacio}
          materials={materials}
          escandalls={escandalls}
          productes={productes}
          families={families}
          gammes={gammes}
          maquinaria={maquinaria}
          operacions={operacions}
          webBudgets={webBudgets}
          onCreate={(newOF) => {
            setOrdresFabricacio(prev => [newOF, ...prev]);
            // Reservar estoc dels materials associats
            if (setMaterials && Array.isArray(newOF.materials) && newOF.materials.length > 0) {
              setMaterials(prevMats => {
                return prevMats.map(mat => {
                  const ofMat = newOF.materials.find(m => m.materialId === mat.id);
                  if (!ofMat) return mat;
                  const qty = ofMat.quantitatTotal || 0;
                  const estocFisic = mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0);
                  const estocReservat = (mat.estocReservat || 0) + qty;
                  return {
                    ...mat,
                    estocFisic,
                    estocReservat,
                    estocDisponible: Math.max(0, estocFisic - estocReservat),
                    estoc: estocFisic
                  };
                });
              });
            }
            setIsNewModalOpen(false);
          }}
          isDark={isDark}
        />
      )}

      {/* MODAL: DETALL DE L'OF & FULL DE RUTA INTERACTIU */}
      {selectedOFDetail && (
        <OFDetailModal
          ofData={selectedOFDetail}
          onClose={() => setSelectedOFDetail(null)}
          onUpdateOF={(updatedOF) => {
            setOrdresFabricacio(prev => prev.map(o => o.id === updatedOF.id ? updatedOF : o));
            setSelectedOFDetail(updatedOF);
          }}
          materials={materials}
          isDark={isDark}
          onPrint={() => {
            setPrintOF(selectedOFDetail);
          }}
        />
      )}

      {/* MODAL / VISTA IMPRIMIBLE DE DOSSIER DE TALLER */}
      {printOF && (
        <PrintWorkshopDossier
          ofData={printOF}
          onClose={() => setPrintOF(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: MODAL DE CREACIÓ DE NOVA OF
// --------------------------------------------------------------------------
function NewOFModal({
  onClose,
  existingOFs,
  materials,
  escandalls,
  productes,
  families,
  gammes,
  maquinaria,
  operacions,
  webBudgets,
  onCreate,
  isDark
}) {
  // Mode de selecció principal: 'producte' (Catàleg) | 'projecte' (Món Mínim) | 'web' (Pressupostos)
  const [sourceType, setSourceType] = useState('producte');

  // Filtres per a la cerca ràpida de Productes de Catàleg
  const [selectedFamilia, setSelectedFamilia] = useState('all');
  const [selectedGamma, setSelectedGamma] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const nextId = useMemo(() => getNextOFId(existingOFs, currentYear), [existingOFs, currentYear]);

  // Estat del formulari de nova OF
  const [formData, setFormData] = useState({
    id: nextId,
    dataCreacio: new Date().toISOString().split('T')[0],
    dataLimitEntrega: '',
    estat: 'cua',
    prioritat: 'normal',
    origen: 'manual_taller',
    tipusItem: 'producte', // 'producte' | 'projecte'
    comandaRef: '',
    clientNom: '',
    clientContacte: '',
    producteId: '',
    producteNom: '',
    producteCodi: '',
    escandallId: '',
    quantitat: 1,
    mida: '',
    codiModelGenerat: '',
    tipografia: 'Playfair Display',
    midaFont: 'Mitjana',
    forats: [],
    textCaraA: '',
    textCaraB: '',
    notesTaller: '',
    parametresLaser: { potencia: '65%', velocitat: '400 mm/s', passades: '1' }
  });

  // Obtenir tots els productes combinats del catàleg
  const allCatalogProducts = useMemo(() => {
    if (productes && productes.length > 0) return productes;
    return GIFT_PRODUCTS.map(g => ({
      id: g.id,
      nom: g.title,
      codi: g.code || `REG-${g.id}`,
      preu: g.price || 0,
      familiaId: g.category || 'altres',
      familiaNom: g.category || 'Altres',
      gammaId: g.gamma || '',
      gammaNom: g.gamma || '',
      opcionsPersonalitzacio: g.customOptions || []
    }));
  }, [productes]);

  // Obtenir la llista de Productes Escandallats directament des de la col·lecció d'Escandalls de producte
  const escandallatProducts = useMemo(() => {
    return escandalls
      .filter(e => !e.tipus || e.tipus === 'Producte Web' || e.tipus === 'Producte')
      .map(e => {
        const matchedProd = allCatalogProducts.find(p => 
          (p.id && e.producteId && String(p.id) === String(e.producteId)) ||
          (p.codi && e.producteCodi && p.codi === e.producteCodi) ||
          (p.nom && e.producteNom && String(p.nom).toLowerCase().trim() === String(e.producteNom).toLowerCase().trim())
        );

        // Detectar Família
        let famNom = '';
        if (matchedProd) {
          if (matchedProd.familia) famNom = matchedProd.familia;
          else if (matchedProd.familiaNom) famNom = matchedProd.familiaNom;
          else if (Array.isArray(matchedProd.familaIds) && matchedProd.familaIds.length > 0) famNom = matchedProd.familaIds[0];
          else if (Array.isArray(matchedProd.familiaIds) && matchedProd.familiaIds.length > 0) famNom = matchedProd.familiaIds[0];
          else if (matchedProd.categoria) famNom = matchedProd.categoria;
        }
        if (!famNom && e.familia) famNom = e.familia;
        if (!famNom && e.familiaNom) famNom = e.familiaNom;

        // Detectar Gamma
        let gamNom = '';
        if (matchedProd) {
          if (matchedProd.gamma) gamNom = matchedProd.gamma;
          else if (matchedProd.gammaNom) gamNom = matchedProd.gammaNom;
          else if (Array.isArray(matchedProd.gammaIds) && matchedProd.gammaIds.length > 0) gamNom = matchedProd.gammaIds[0];
          else if (matchedProd.gammaId) gamNom = matchedProd.gammaId;
        }
        if (!gamNom && e.gamma) gamNom = e.gamma;
        if (!gamNom && e.gammaNom) gamNom = e.gammaNom;

        return {
          id: matchedProd?.id || e.producteId || e.id,
          nom: e.producteNom || matchedProd?.nom || 'Producte Escandallat',
          codi: e.producteCodi || matchedProd?.codi || '',
          escandallId: e.id,
          escandall: e,
          product: matchedProd,
          familiaNom: famNom,
          gammaNom: gamNom,
          opcionsPersonalitzacio: matchedProd?.opcionsPersonalitzacio || []
        };
      });
  }, [escandalls, allCatalogProducts]);

  // Llista de Famílies disponibles que tenen productes escandallats o que estan definides
  const availableFamilies = useMemo(() => {
    const famMap = new Map();
    // 1. Des de la col·lecció de famílies
    families.forEach(f => {
      const name = f.nom || f.titol || f.id;
      if (name) famMap.set(name, { id: f.id || name, nom: name });
    });
    // 2. Des dels productes escandallats
    escandallatProducts.forEach(p => {
      if (p.familiaNom && !famMap.has(p.familiaNom)) {
        famMap.set(p.familiaNom, { id: p.familiaNom, nom: p.familiaNom });
      }
    });
    return Array.from(famMap.values());
  }, [families, escandallatProducts]);

  // Llista de Gammes filtrades segons la Família triada
  const availableGammes = useMemo(() => {
    const gamMap = new Map();

    // 1. Gammes dels productes escandallats que coincideixen amb la família
    escandallatProducts.forEach(p => {
      if (selectedFamilia !== 'all') {
        const matchesFam = p.familiaNom === selectedFamilia || 
          p.product?.familia === selectedFamilia || 
          (Array.isArray(p.product?.familaIds) && p.product.familaIds.includes(selectedFamilia)) ||
          (Array.isArray(p.product?.familiaIds) && p.product.familiaIds.includes(selectedFamilia));
        if (!matchesFam) return;
      }
      if (p.gammaNom) {
        gamMap.set(p.gammaNom, { id: p.gammaNom, nom: p.gammaNom });
      }
    });

    // 2. Gammes de la col·lecció 'gammes'
    gammes.forEach(g => {
      const gName = g.nom || g.titol || g.id;
      if (selectedFamilia !== 'all') {
        const matchesFam = g.familiaNom === selectedFamilia || g.familiaId === selectedFamilia;
        if (!matchesFam) return;
      }
      if (gName && !gamMap.has(gName)) {
        gamMap.set(gName, { id: g.id || gName, nom: gName });
      }
    });

    return Array.from(gamMap.values());
  }, [escandallatProducts, gammes, selectedFamilia]);

  // Productes escandallats filtrats per Família / Gamma / Cerca
  const filteredEscandallatProducts = useMemo(() => {
    return escandallatProducts.filter(p => {
      // Filtre de Família
      if (selectedFamilia !== 'all') {
        const matchesFam = p.familiaNom === selectedFamilia || 
          p.product?.familia === selectedFamilia || 
          (Array.isArray(p.product?.familaIds) && p.product.familaIds.includes(selectedFamilia)) ||
          (Array.isArray(p.product?.familiaIds) && p.product.familiaIds.includes(selectedFamilia)) ||
          p.product?.categoria === selectedFamilia ||
          p.escandall?.familia === selectedFamilia;
        if (!matchesFam) return false;
      }

      // Filtre de Gamma
      if (selectedGamma !== 'all') {
        const matchesGam = p.gammaNom === selectedGamma || 
          p.product?.gamma === selectedGamma || 
          p.product?.gammaNom === selectedGamma || 
          (Array.isArray(p.product?.gammaIds) && p.product.gammaIds.includes(selectedGamma)) ||
          p.product?.gammaId === selectedGamma ||
          p.escandall?.gamma === selectedGamma;
        if (!matchesGam) return false;
      }

      // Filtre de Cerca
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchNom = (p.nom || '').toLowerCase().includes(q);
        const matchCodi = (p.codi || '').toLowerCase().includes(q);
        if (!matchNom && !matchCodi) return false;
      }

      return true;
    });
  }, [escandallatProducts, selectedFamilia, selectedGamma, productSearch]);

  // Llista de Projectes que disposen d'escandall (Món Mínim, Stitch, etc.)
  const escandallatProjects = useMemo(() => {
    return escandalls.filter(e => {
      const t = (e.tipus || '').toLowerCase();
      const isProj = t.includes('món mínim') || t.includes('mon minim') || t.includes('projecte') || t.includes('obra singular') || t.includes('a mida');
      const isNotWebProd = !escandallatProducts.some(p => p.escandallId === e.id);
      return isProj || isNotWebProd;
    });
  }, [escandalls, escandallatProducts]);

  // Materials i Operacions calculades segons l'escandall seleccionat i la quantitat
  const [calculatedMaterials, setCalculatedMaterials] = useState([]);
  const [calculatedOperacions, setCalculatedOperacions] = useState([]);

  // Auto-càrrega quan canvia escandallId o quantitat
  useEffect(() => {
    if (!formData.escandallId) {
      setCalculatedMaterials([]);
      setCalculatedOperacions([]);
      return;
    }

    const esc = escandalls.find(e => e.id === formData.escandallId);
    if (!esc) return;

    const qty = formData.quantitat || 1;

    // Materials de l'escandall
    const mats = (esc.materials || []).map(em => {
      const matObj = materials.find(m => m.id === em.materialId);
      const qUnit = em.quantitat || 0;
      const qTotal = qUnit * qty;
      return {
        materialId: em.materialId,
        nom: matObj?.material || em.nom || 'Material',
        quantitatTeoricaUnitat: qUnit,
        quantitatTotal: qTotal,
        unitat: matObj?.unitat || 'u',
        estocReservat: qTotal,
        estocDescomptat: false
      };
    });
    setCalculatedMaterials(mats);

    // Operacions de l'escandall
    const ops = (esc.operacions || []).map((eo, idx) => {
      const opObj = operacions.find(o => o.id === eo.operacioId);
      const tempsU = eo.tempsMinuts || 0;
      return {
        id: `op-${idx + 1}`,
        nom: opObj?.operacio || eo.nom || `Operació ${idx + 1}`,
        tempsTeoricMinuts: tempsU * qty,
        tempsRealMinuts: 0,
        completada: false
      };
    });
    setCalculatedOperacions(ops);
  }, [formData.escandallId, formData.quantitat, escandalls, materials, operacions]);

  // Triar un producte del catàleg escandallat
  const handleSelectProduct = (prod) => {
    setFormData(prev => ({
      ...prev,
      tipusItem: 'producte',
      producteId: prod.id,
      producteNom: prod.nom,
      producteCodi: prod.codi || '',
      escandallId: prod.escandallId,
      codiModelGenerat: prod.codi || ''
    }));
  };

  // Triar un projecte escandallat
  const handleSelectProject = (projEsc) => {
    setFormData(prev => ({
      ...prev,
      tipusItem: 'projecte',
      producteId: projEsc.producteId || projEsc.id,
      producteNom: projEsc.nom || projEsc.producteNom || 'Projecte Món Mínim',
      producteCodi: projEsc.producteCodi || 'MM',
      escandallId: projEsc.id,
      codiModelGenerat: projEsc.producteCodi || 'MM-PROJ',
      quantitat: 1
    }));
  };

  // Carregar dades des d'una sol·licitud web
  const handleSelectWebBudget = (budget, item) => {
    const matchedProd = escandallatProducts.find(p => p.id === item.producteId || p.nom === item.nom);
    const matchedEsc = matchedProd?.escandallId ? escandalls.find(e => e.id === matchedProd.escandallId) : escandalls.find(e => e.producteId === item.producteId || e.nom?.includes(item.nom));

    if (!matchedEsc) {
      alert(`Atenció: Aquest producte (${item.nom}) no té cap escandall creat. Per poder fabricar-lo cal escandallar-lo prèviament a la secció d'Escandalls.`);
      return;
    }

    const opc = item.opcionsTriades || {};
    const midaVal = opc['Mida de l\'etiqueta'] || opc['Mida'] || '';
    const codiVal = opc['Codi Model Generat'] || '';
    const tipoVal = opc['Tipografia'] || 'Playfair Display';
    const midaFontVal = opc['Mida de la font'] || 'Mitjana';
    const foratsVal = Array.isArray(opc['Forats seleccionats']) ? opc['Forats seleccionats'] : [];
    const textAVal = opc['Text (Cara A)'] || opc['Text Cara A'] || '';
    const textBVal = opc['Text (Cara B)'] || opc['Text Cara B'] || '';

    setFormData(prev => ({
      ...prev,
      origen: 'web_pressupost',
      tipusItem: 'producte',
      comandaRef: budget.codiReferencia || budget.id,
      clientNom: budget.clientNom || '',
      clientContacte: budget.clientContacte || '',
      producteId: item.producteId || matchedProd?.id || '',
      producteNom: item.nom || '',
      producteCodi: matchedProd?.codi || '',
      escandallId: matchedEsc.id,
      quantitat: item.quantitat || 1,
      mida: midaVal,
      codiModelGenerat: codiVal,
      tipografia: tipoVal,
      midaFont: midaFontVal,
      forats: foratsVal,
      textCaraA: textAVal,
      textCaraB: textBVal,
      notesTaller: item.observacions || budget.observacionsGenerals || ''
    }));

    setSourceType('producte'); // Anar al formulari amb les dades emplenades
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.escandallId) {
      alert("Cal seleccionar un Producte o Projecte que estigui degudament escandallat.");
      return;
    }
    if (!formData.producteNom.trim()) {
      alert("Si us plau, especifica el nom del producte a fabricar.");
      return;
    }

    const newOF = {
      ...formData,
      materials: calculatedMaterials,
      operacions: calculatedOperacions
    };

    onCreate(newOF);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      {/* Contenidor rígid contingut estrictament dins de la pantalla amb alçada màxima de 92vh */}
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white text-slate-900 border-slate-300'
      }`}>
        
        {/* Capçalera Fixa */}
        <div className={`shrink-0 p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-serif font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Nova Ordre de Fabricació
              </h3>
              <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Referència assignada: <span className="font-bold text-amber-500">{formData.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Font d'Origen (Producte del Catàleg vs Projecte Món Mínim vs Comanda Web) */}
        <div className={`shrink-0 flex items-center border-b px-5 pt-3 pb-0 gap-3 overflow-x-auto ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-100/70'
        }`}>
          <button
            type="button"
            onClick={() => setSourceType('producte')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'producte'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Producte del Catàleg ({escandallatProducts.length} escandallats)
          </button>

          <button
            type="button"
            onClick={() => setSourceType('projecte')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'projecte'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Factory className="w-4 h-4" />
            2. Projecte / Món Mínim ({escandallatProjects.length} escandallats)
          </button>

          <button
            type="button"
            onClick={() => setSourceType('web')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'web'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3. Des de Comanda Web ({webBudgets.length})
          </button>
        </div>

        {/* Cos Central amb Scroll Vertical Contingut */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ============================================================ */}
          {/* OPCIÓ 1: SELECCIÓ DE PRODUCTE DE CATÀLEG (FAMÍLIA -> GAMMA -> PRODUCTE) */}
          {/* ============================================================ */}
          {sourceType === 'producte' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    Selecció Jeràrquica de Producte Escandallat
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {filteredEscandallatProducts.length} productes disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Selector Família */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Família
                    </label>
                    <select
                      value={selectedFamilia}
                      onChange={(e) => {
                        setSelectedFamilia(e.target.value);
                        setSelectedGamma('all');
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="all">Totes les famílies</option>
                      {availableFamilies.map(f => (
                        <option key={f.id} value={f.nom}>{f.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selector Gamma */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Gamma
                    </label>
                    <select
                      value={selectedGamma}
                      onChange={(e) => setSelectedGamma(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="all">Totes les gammes</option>
                      {availableGammes.map(g => (
                        <option key={g.id} value={g.nom}>{g.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cercador ràpid */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Cerca per Nom / Codi
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Boig per tu, Bombastic..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Llista de Productes disponibles per triar */}
                <div className="pt-2">
                  <label className={`text-[10px] font-mono uppercase font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tria el Producte a Fabricar:
                  </label>
                  {filteredEscandallatProducts.length === 0 ? (
                    <div className={`p-4 rounded-xl border border-dashed text-center text-xs font-mono ${
                      isDark ? 'border-slate-800 text-amber-400/80 bg-slate-900/50' : 'border-slate-300 text-amber-700 bg-amber-50'
                    }`}>
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                      No s'ha trobat cap producte escandallat amb els filtres actuals.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {filteredEscandallatProducts.map(p => {
                        const isSelected = formData.escandallId === p.escandallId && formData.tipusItem === 'producte';

                        return (
                          <button
                            key={p.escandallId}
                            type="button"
                            onClick={() => handleSelectProduct(p)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                                : (isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-400')
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-xs truncate">{p.nom}</p>
                              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {p.codi || 'CAT'} {p.familiaNom ? `• ${p.familiaNom}` : ''} {p.gammaNom ? `(${p.gammaNom})` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              ✓ Escandallat
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OPCIÓ 2: SELECCIÓ DE PROJECTE / MÓN MÍNIM ESCANDALLAT */}
          {/* ============================================================ */}
          {sourceType === 'projecte' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                  <Factory className="w-4 h-4" />
                  Projectes Món Mínim Escandallats ({escandallatProjects.length})
                </span>

                {escandallatProjects.length === 0 ? (
                  <div className={`p-6 rounded-xl border border-dashed text-center text-xs font-mono ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
                  }`}>
                    No hi ha cap projecte escandallat a la base de dades. Pots crear-ne un a la secció d'Escandalls.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {escandallatProjects.map(proj => {
                      const isSelected = formData.escandallId === proj.id && formData.tipusItem === 'projecte';

                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => handleSelectProject(proj)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                              : (isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-400')
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-xs truncate">{proj.nom || proj.producteNom}</p>
                            <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Tipus: {proj.tipus || 'Món Mínim'} • {proj.materials?.length || 0} materials
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Projecte
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OPCIÓ 3: SELECCIÓ DES DE SOL·LICITUDS / COMANDES WEB */}
          {/* ============================================================ */}
          {sourceType === 'web' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Selecciona una de les sol·licituds web pendents de fabricar per carregar-ne automàticament totes les dades i l'escandall vinculat:
              </p>

              {webBudgets.length === 0 ? (
                <div className={`p-8 text-center border rounded-2xl border-dashed font-mono text-xs ${
                  isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-300 text-slate-500 bg-slate-50'
                }`}>
                  No hi ha cap sol·licitud web pendent en aquest moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {webBudgets.map(budget => (
                    <div
                      key={budget.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`flex items-center justify-between border-b pb-2.5 mb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-500">
                            {budget.codiReferencia || budget.id}
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            • {budget.clientNom || 'Client Anònim'}
                          </span>
                          {budget.clientContacte && (
                            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ({budget.clientContacte})
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                          {Array.isArray(budget.productes) ? budget.productes.length : 1} peces
                        </span>
                      </div>

                      {/* Peces individuals dins de la sol·licitud */}
                      <div className="space-y-2">
                        {(budget.productes || []).map((prodItem, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {prodItem.nom} <span className="text-amber-500 font-mono">x{prodItem.quantitat || 1}</span>
                              </p>
                              {prodItem.opcionsTriades && (
                                <p className={`text-[11px] font-mono truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {Object.entries(prodItem.opcionsTriades).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectWebBudget(budget, prodItem)}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              Carregar a l'OF <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* FORMULARI DETALLAT DE L'ORDRE SELECCIONADA */}
          {/* ============================================================ */}
          {formData.escandallId ? (
            <form id="new-of-form" onSubmit={handleSave} className="space-y-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 border-outline/10">
                  <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Dades de Fabricació & Client
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Escandall vinculat: {formData.escandallId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Element a Fabricar
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.producteNom}
                      onChange={(e) => setFormData({ ...formData, producteNom: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Quantitat a Produir
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantitat}
                      onChange={(e) => setFormData({ ...formData, quantitat: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Prioritat
                    </label>
                    <select
                      value={formData.prioritat}
                      onChange={(e) => setFormData({ ...formData, prioritat: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="normal" className={isDark ? 'bg-slate-900' : 'bg-white'}>⚪ Normal</option>
                      <option value="urgent" className={isDark ? 'bg-slate-900' : 'bg-white'}>🔴 Urgent</option>
                      <option value="baixa" className={isDark ? 'bg-slate-900' : 'bg-white'}>🔵 Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Client / Destinatari
                    </label>
                    <input
                      type="text"
                      placeholder="Nom o Estoc Taller"
                      value={formData.clientNom}
                      onChange={(e) => setFormData({ ...formData, clientNom: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Contacte
                    </label>
                    <input
                      type="text"
                      placeholder="Telèfon / Email"
                      value={formData.clientContacte}
                      onChange={(e) => setFormData({ ...formData, clientContacte: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Data Límit Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.dataLimitEntrega}
                      onChange={(e) => setFormData({ ...formData, dataLimitEntrega: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Personalització si s'aplica */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline/10">
                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Mida / Format
                    </label>
                    <input
                      type="text"
                      placeholder="ex: 20 x 60 mm"
                      value={formData.mida}
                      onChange={(e) => setFormData({ ...formData, mida: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Codi Model Generat
                    </label>
                    <input
                      type="text"
                      placeholder="ex: XR2060AB"
                      value={formData.codiModelGenerat}
                      onChange={(e) => setFormData({ ...formData, codiModelGenerat: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Tipografia Gravat
                    </label>
                    <select
                      value={formData.tipografia}
                      onChange={(e) => setFormData({ ...formData, tipografia: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.name} className={isDark ? 'bg-slate-900' : 'bg-white'}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Text Cara A (Frontal)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Text a gravar a la cara frontal..."
                        value={formData.textCaraA}
                        onChange={(e) => setFormData({ ...formData, textCaraA: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Text Cara B (Posterior)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Text a gravar a la cara posterior..."
                        value={formData.textCaraB}
                        onChange={(e) => setFormData({ ...formData, textCaraB: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resum de Materials i Operacions que es reservaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    Materials que es reservaran ({calculatedMaterials.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {calculatedMaterials.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{m.nom}</span>
                        <span className="font-bold text-emerald-400">
                          {formatDecimal(m.quantitatTotal, 4)} {m.unitat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    Full de ruta d'operacions ({calculatedOperacions.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {calculatedOperacions.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{o.nom}</span>
                        <span className="font-bold text-amber-400">
                          {o.tempsTeoricMinuts} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className={`p-8 text-center border rounded-2xl border-dashed font-mono text-xs ${
              isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-300 text-slate-500 bg-slate-50'
            }`}>
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-amber-500/70" />
              Tria un **Producte del Catàleg** (a dalt) o un **Projecte Món Mínim** per carregar les dades de fabricació.
            </div>
          )}

        </div>

        {/* Peu Fix amb Botons d'Acció (Sempre Visible) */}
        <div className={`shrink-0 p-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="text-xs font-mono text-slate-400">
            {formData.escandallId ? (
              <span className="text-emerald-400 font-bold">✓ Escandall carregat amb èxit ({calculatedMaterials.length} materials)</span>
            ) : (
              <span className="text-amber-500">⚠️ Cal seleccionar un element escandallat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              form="new-of-form"
              disabled={!formData.escandallId}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-md transition-all ${
                formData.escandallId 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' 
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Save className="w-4 h-4" /> Crear i Llançar OF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: MODAL DETALL D'OF & FULL DE RUTA INTERACTIU
// --------------------------------------------------------------------------
function OFDetailModal({ ofData, onClose, onUpdateOF, materials, isDark, onPrint }) {
  const [activeOF, setActiveOF] = useState(ofData);

  useEffect(() => {
    setActiveOF(ofData);
  }, [ofData]);

  // Commutar estat d'un pas del full de ruta
  const handleToggleStep = (stepId) => {
    const updatedOps = (activeOF.operacions || []).map(op => {
      if (op.id === stepId) {
        const nextCompleted = !op.completada;
        return {
          ...op,
          completada: nextCompleted,
          dataCompletada: nextCompleted ? new Date().toISOString() : null
        };
      }
      return op;
    });

    const updatedOF = { ...activeOF, operacions: updatedOps };
    setActiveOF(updatedOF);
    onUpdateOF(updatedOF);
  };

  // Guardar paràmetres làser o notes de taller
  const handleSaveNotes = () => {
    onUpdateOF(activeOF);
    alert("Paràmetres i notes de taller desats correctament.");
  };

  const fontObj = AVAILABLE_FONTS.find(f => f.name === activeOF.tipografia) || AVAILABLE_FONTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white text-slate-900 border-slate-300'
      }`}>
        
        {/* Capçalera Fixa */}
        <div className={`shrink-0 p-4 sm:p-5 border-b flex items-center justify-between flex-wrap gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-sm">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-serif font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeOF.id}
                </h3>
                {activeOF.prioritat === 'urgent' && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    URGENT
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {activeOF.producteNom} • <span className="font-bold text-amber-500">{activeOF.quantitat} u</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-xs ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <Printer className="w-4 h-4 text-amber-500" />
              Imprimir Dossier
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg hover:text-white ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contingut Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Bloc 1: Dades de la comanda i Personalització */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dades Generals */}
            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs font-mono ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs uppercase">
                <User className="w-4 h-4" /> Dades del Client
              </p>
              <div className={`space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <p>Client: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.clientNom || 'Estoc Taller'}</span></p>
                <p>Contacte: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.clientContacte || '-'}</span></p>
                <p>Ref. Comanda: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.comandaRef || 'Llançament Manual'}</span></p>
                <p>Data Límit: <span className="font-bold text-amber-500">{activeOF.dataLimitEntrega || 'Sense límit'}</span></p>
              </div>
            </div>

            {/* Especificacions de Gravat */}
            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
                <Sparkles className="w-4 h-4" /> Especificacions de Gravat
              </p>
              <div className={`space-y-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <p>Mida: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.mida || '-'}</span></p>
                <p>Model / Forats: <span className="font-bold text-amber-400">{activeOF.codiModelGenerat || '-'}</span></p>
                <p>Tipografia: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.tipografia || 'Playfair Display'}</span> ({activeOF.midaFont || 'Mitjana'})</p>
              </div>

              {(activeOF.textCaraA || activeOF.textCaraB) && (
                <div className={`pt-2 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  {activeOF.textCaraA && (
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-750' : 'bg-white border-slate-200'}`}>
                      <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cara A (Frontal):</span>
                      <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: fontObj?.fontFamily }}>
                        "{activeOF.textCaraA}"
                      </p>
                    </div>
                  )}
                  {activeOF.textCaraB && (
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-750' : 'bg-white border-slate-200'}`}>
                      <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cara B (Posterior):</span>
                      <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: fontObj?.fontFamily }}>
                        "{activeOF.textCaraB}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bloc 2: Full de Ruta (Operacions de Taller) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
                <Wrench className="w-4 h-4" /> Full de Ruta de Fabricació (Checklist Taller)
              </p>
              <span className="text-xs font-mono font-bold text-amber-400">
                {(activeOF.operacions || []).filter(o => o.completada).length} / {(activeOF.operacions || []).length} completats
              </span>
            </div>

            <div className="space-y-2">
              {(activeOF.operacions || []).length === 0 ? (
                <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sense operacions definides a l'escandall.
                </p>
              ) : (
                activeOF.operacions.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleToggleStep(op.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      op.completada
                        ? (isDark ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
                        : (isDark ? 'bg-slate-900 border-slate-800 text-white hover:border-amber-500/40' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-500/40')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        op.completada 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-white')
                      }`}>
                        {op.completada && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${op.completada ? 'line-through opacity-70' : ''}`}>
                          {op.nom}
                        </p>
                        {op.tempsTeoricMinuts > 0 && (
                          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Temps teòric: {op.tempsTeoricMinuts} min
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      op.completada 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                    }`}>
                      {op.completada ? 'Fet' : 'Pendent'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Bloc 3: Materials & Explosió BOM */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
              <Package className="w-4 h-4" /> Explosió de Materials (BOM)
            </p>

            <div className="space-y-2">
              {(activeOF.materials || []).map((m, idx) => {
                const matInStock = materials.find(mat => mat.id === m.materialId);
                const estocFisic = matInStock?.estocFisic !== undefined ? matInStock.estocFisic : (matInStock?.estoc || 0);
                const estocDisp = matInStock?.estocDisponible !== undefined ? matInStock.estocDisponible : estocFisic;
                const isShortage = estocDisp < m.quantitatTotal;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.nom}</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDecimal(m.quantitatTeoricaUnitat, 4)} {m.unitat} / unitat
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-amber-400">
                        Total: {formatDecimal(m.quantitatTotal, 4)} {m.unitat}
                      </p>
                      <p className={`text-[11px] font-bold ${isShortage ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isShortage ? '⚠️ Estoc insuficient' : '✓ Estoc disponible'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloc 4: Paràmetres Làser i Notes de Taller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className={`text-[11px] font-mono uppercase font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Paràmetres Màquina Làser
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Potència:</span>
                  <input
                    type="text"
                    value={activeOF.parametresLaser?.potencia || ''}
                    onChange={(e) => setActiveOF({
                      ...activeOF,
                      parametresLaser: { ...(activeOF.parametresLaser || {}), potencia: e.target.value }
                    })}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Velocitat:</span>
                  <input
                    type="text"
                    value={activeOF.parametresLaser?.velocitat || ''}
                    onChange={(e) => setActiveOF({
                      ...activeOF,
                      parametresLaser: { ...(activeOF.parametresLaser || {}), velocitat: e.target.value }
                    })}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Passades:</span>
                  <input
                    type="text"
                    value={activeOF.parametresLaser?.passades || ''}
                    onChange={(e) => setActiveOF({
                      ...activeOF,
                      parametresLaser: { ...(activeOF.parametresLaser || {}), passades: e.target.value }
                    })}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className={`text-[11px] font-mono uppercase font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Notes de Taller & Observacions
              </label>
              <textarea
                rows={2}
                placeholder="Anotacions tècniques per a la fabricació..."
                value={activeOF.notesTaller || ''}
                onChange={(e) => setActiveOF({ ...activeOF, notesTaller: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Peu Fix */}
        <div className={`shrink-0 p-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Estat: <span className="font-bold text-amber-500 uppercase">{activeOF.estat}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Desar Canvis
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: DOSSIER IMPRIMIBLE DE TALLER (PRINT-READY)
// --------------------------------------------------------------------------
function PrintWorkshopDossier({ ofData, onClose }) {
  const fontObj = AVAILABLE_FONTS.find(f => f.name === ofData.tipografia) || AVAILABLE_FONTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white text-black rounded-3xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none print:max-h-none">
        
        {/* Botons no imprimibles */}
        <div className="shrink-0 p-4 flex items-center justify-between border-b border-slate-200 print:hidden">
          <span className="font-mono text-xs font-bold text-slate-600">Vista Prèvia del Full de Taller</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" /> Imprimir Full
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-black rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FULL DE TREBALL TALLER */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 font-sans print:overflow-visible print:p-6">
          {/* Capçalera del Full de Taller */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Mínim Món • Full de Treball Taller</p>
              <h1 className="text-3xl font-black font-mono tracking-tight">{ofData.id}</h1>
              <p className="text-sm font-bold text-slate-800">{ofData.producteNom}</p>
            </div>
            <div className="text-right font-mono text-xs space-y-0.5">
              <p className="text-lg font-black bg-black text-white px-3 py-1 rounded">
                {ofData.quantitat} UNITATS
              </p>
              <p className="pt-1">Data: {ofData.dataCreacio || '-'}</p>
              {ofData.dataLimitEntrega && <p className="font-bold text-red-600">Límit: {ofData.dataLimitEntrega}</p>}
            </div>
          </div>

          {/* Dades del Client & Referències */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded-xl text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Client / Destí:</span>
              <span className="font-bold text-sm">{ofData.clientNom || 'Estoc Taller'}</span>
              {ofData.clientContacte && <p className="text-[11px] text-slate-600">{ofData.clientContacte}</p>}
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Ref. Comanda / Model:</span>
              <span className="font-bold text-sm text-amber-800">{ofData.codiModelGenerat || ofData.comandaRef || '-'}</span>
              {ofData.mida && <p className="text-[11px] text-slate-600">Mida: {ofData.mida}</p>}
            </div>
          </div>

          {/* Gravat i Tipografia */}
          {(ofData.textCaraA || ofData.textCaraB) && (
            <div className="border-2 border-dashed border-slate-400 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold uppercase text-slate-600">Textos de Gravat Làser</span>
                <span className="font-bold">Font: {ofData.tipografia || 'Playfair Display'} ({ofData.midaFont || 'Mitjana'})</span>
              </div>

              {ofData.textCaraA && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Cara A (Frontal):</span>
                  <p className="text-base font-bold text-black" style={{ fontFamily: fontObj?.fontFamily }}>
                    "{ofData.textCaraA}"
                  </p>
                </div>
              )}

              {ofData.textCaraB && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Cara B (Posterior):</span>
                  <p className="text-base font-bold text-black" style={{ fontFamily: fontObj?.fontFamily }}>
                    "{ofData.textCaraB}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paràmetres Màquina & Materials */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="border border-slate-300 p-3 rounded-xl space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Paràmetres Làser:</span>
              <p>Potència: <span className="font-bold">{ofData.parametresLaser?.potencia || '65%'}</span></p>
              <p>Velocitat: <span className="font-bold">{ofData.parametresLaser?.velocitat || '400 mm/s'}</span></p>
              <p>Passades: <span className="font-bold">{ofData.parametresLaser?.passades || '1'}</span></p>
            </div>

            <div className="border border-slate-300 p-3 rounded-xl space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Materials Requerits:</span>
              {(ofData.materials || []).map((m, i) => (
                <p key={i} className="text-[11px]">
                  • {m.nom}: <span className="font-bold">{formatDecimal(m.quantitatTotal, 4)} {m.unitat}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Checklist de Control de Qualitat i Taller */}
          <div className="border border-slate-300 p-4 rounded-xl space-y-2 text-xs font-mono">
            <span className="font-bold text-[10px] uppercase text-slate-500 block">Control de Taller & Operacions:</span>
            <div className="grid grid-cols-2 gap-2">
              {(ofData.operacions || [
                { nom: 'Tall i gravat làser' },
                { nom: 'Poliment i desbarbat' },
                { nom: 'Acabat i vernís' },
                { nom: 'Control de qualitat i anellat' }
              ]).map((op, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-slate-200 py-1">
                  <div className="w-4 h-4 border-2 border-black rounded-sm"></div>
                  <span className="text-[11px] truncate">{op.nom}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes de Taller */}
          {ofData.notesTaller && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <span className="font-mono text-[9px] uppercase font-bold text-amber-800 block">Notes de taller:</span>
              <p className="italic text-slate-800">{ofData.notesTaller}</p>
            </div>
          )}

          {/* Peu de signatura */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-300 text-[10px] font-mono text-slate-500">
            <span>Operari Responsable: ____________________</span>
            <span>Data de Finalització: ____/____/2026</span>
          </div>
        </div>

      </div>
    </div>
  );
}
