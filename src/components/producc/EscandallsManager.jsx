import React, { useState, useMemo } from 'react';
import { 
  Calculator, Plus, Search, Edit2, Trash2, Copy, Package, Wrench, Cpu, 
  DollarSign, TrendingUp, AlertCircle, FileText, ChevronRight, ChevronDown, ChevronUp, 
  X, Percent, Save, Sparkles, Filter, Layers, CheckCircle2, ArrowRight, ExternalLink, 
  Image as ImageIcon, Sliders, Check
} from 'lucide-react';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';
import { STITCH_PROJECTS } from '../../data/stitchData';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';

export default function EscandallsManager({ 
  escandalls = [], 
  setEscandalls, 
  materials = [], 
  operacions = [], 
  maquinaria = [], 
  productes = [], 
  families = [], 
  gammes = [], 
  isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipus, setFilterTipus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscandall, setEditingEscandall] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('base'); // 'base' | 'personalitzacio' | 'resum'
  const [expandedOptionKey, setExpandedOptionKey] = useState(null);

  // Filtres per al selector de producte del catàleg
  const [pickerScope, setPickerScope] = useState('cataleg'); // 'cataleg' | 'stitch' | 'worlds' | 'custom'
  const [pickerFamilia, setPickerFamilia] = useState('all');
  const [pickerGamma, setPickerGamma] = useState('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Estat del formulari de l'escandall
  const [formData, setFormData] = useState({
    producteNom: '',
    producteId: '',
    producteCodi: '',
    producteImatge: '',
    preuWebActual: 0,
    tipus: 'Producte Web', // 'Producte Web' | 'Projecte Món Mínim' | 'Obra Singular' | 'A Mida'
    mermePercent: 8,
    margePercent: 65,
    notes: '',
    materials: [],
    operacions: [],
    maquinaria: [],
    opcionsCostos: {} // { [opcioTitol]: { [valor]: { sobrecost: number, tempsMinuts?: number, materials?: [], operacions?: [] } } }
  });

  // Obtenir productes combinats (Firestore "productes" + fallbacks)
  const allCatalogProducts = useMemo(() => {
    if (productes && productes.length > 0) return productes;
    return GIFT_PRODUCTS.map(g => ({
      id: g.id,
      nom: g.title,
      codi: g.code || `REG-${g.id}`,
      preu: g.price || 0,
      imatgePrincipal: g.image,
      opcionsPersonalitzacio: g.customOptions || []
    }));
  }, [productes]);

  // Gammes filtrades per la família triada al selector
  const availableGammesForPicker = useMemo(() => {
    if (pickerFamilia === 'all') return gammes;
    const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
    const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
    return gammes.filter(g => g.familiaNom === famNom || g.familiaId === pickerFamilia);
  }, [gammes, families, pickerFamilia]);

  // Productes filtrats al selector jeràrquic (Família -> Gamma -> Cerca)
  const filteredPickerProducts = useMemo(() => {
    return allCatalogProducts.filter(p => {
      // Filtre de família
      if (pickerFamilia !== 'all') {
        const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
        const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
        const matchesFam = (Array.isArray(p.familaIds) && p.familaIds.includes(famNom)) ||
                           (Array.isArray(p.familiaIds) && p.familiaIds.includes(pickerFamilia)) ||
                           p.familia === famNom;
        if (!matchesFam) return false;
      }

      // Filtre de gamma
      if (pickerGamma !== 'all') {
        const matchesGam = (Array.isArray(p.gammaIds) && p.gammaIds.includes(pickerGamma)) ||
                           p.gammaId === pickerGamma;
        if (!matchesGam) return false;
      }

      // Filtre de cerca lliure
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const matchesName = (p.nom || p.title || '').toLowerCase().includes(q);
        const matchesCode = (p.codi || '').toLowerCase().includes(q);
        const matchesDesc = (p.descripcio || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }

      return true;
    });
  }, [allCatalogProducts, pickerFamilia, pickerGamma, pickerSearch, families]);

  // Obrir modal per crear
  const handleOpenCreate = () => {
    setEditingEscandall(null);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setPickerScope('cataleg');
    setPickerFamilia('all');
    setPickerGamma('all');
    setPickerSearch('');
    setFormData({
      producteNom: '',
      producteId: '',
      producteCodi: '',
      producteImatge: '',
      preuWebActual: 0,
      tipus: 'Producte Web',
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: [],
      opcionsCostos: {}
    });
    setModalOpen(true);
  };

  // Obrir modal per editar
  const handleOpenEdit = (esc) => {
    setEditingEscandall(esc);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      ...esc,
      materials: esc.materials ? esc.materials.map(m => ({ ...m })) : [],
      operacions: esc.operacions ? esc.operacions.map(o => ({ ...o })) : [],
      maquinaria: esc.maquinaria ? esc.maquinaria.map(mq => ({ ...mq })) : [],
      opcionsCostos: esc.opcionsCostos ? JSON.parse(JSON.stringify(esc.opcionsCostos)) : {}
    });
    setModalOpen(true);
  };

  // Duplicar / Clonar Escandall
  const handleDuplicate = (esc) => {
    const newId = getNextSequentialId('esc', escandalls);
    const cloned = {
      ...esc,
      id: newId,
      producteNom: `${esc.producteNom} (Còpia)`,
      materials: esc.materials ? esc.materials.map(m => ({ ...m })) : [],
      operacions: esc.operacions ? esc.operacions.map(o => ({ ...o })) : [],
      maquinaria: esc.maquinaria ? esc.maquinaria.map(mq => ({ ...mq })) : [],
      opcionsCostos: esc.opcionsCostos ? JSON.parse(JSON.stringify(esc.opcionsCostos)) : {}
    };
    setEscandalls(prev => [...prev, cloned]);
  };

  // Eliminar escandall
  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest escandall de fabricació?')) {
      setEscandalls(prev => prev.filter(e => e.id !== id));
    }
  };

  // Guardar escandall
  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.producteNom.trim()) {
      alert('Si us plau, especifica el nom del producte.');
      return;
    }

    if (editingEscandall) {
      setEscandalls(prev => prev.map(e => e.id === editingEscandall.id ? { ...formData, id: e.id } : e));
    } else {
      const newId = getNextSequentialId('esc', escandalls);
      setEscandalls(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  // Helper càlculs de costos globals d'un escandall
  const calculateCosts = (esc) => {
    if (!esc) return { costMat: 0, costOp: 0, costMaq: 0, baseCost: 0, mermeAmount: 0, totalCost: 0, marginAmount: 0, pvpRecomanat: 0 };

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

  // Detectar opcions de personalització disponibles per al producte vinculat
  const currentLinkedProduct = useMemo(() => {
    if (!formData.producteId) return null;
    return allCatalogProducts.find(p => p.id === formData.producteId) || null;
  }, [allCatalogProducts, formData.producteId]);

  const detectedCustomizationOptions = useMemo(() => {
    if (!currentLinkedProduct) return [];
    const ops = currentLinkedProduct.opcionsPersonalitzacio;
    if (!Array.isArray(ops)) return [];

    return ops.map(op => {
      // Parsejar valors (si és string separat per comes o array)
      let valuesList = [];
      if (typeof op.valors === 'string') {
        valuesList = op.valors.split(',').map(v => v.trim()).filter(Boolean);
      } else if (Array.isArray(op.valors)) {
        valuesList = op.valors;
      }
      if (valuesList.length === 0 && op.tipus === 'text') {
        valuesList = ['Text Personalitzat'];
      }
      return {
        titol: op.titol || 'Opció',
        tipus: op.tipus || 'desplegable',
        valors: valuesList
      };
    });
  }, [currentLinkedProduct]);

  // Vincular producte triat del selector
  const handleSelectProduct = (prod, tipusLabel = 'Producte Web') => {
    const rawImage = prod.imatgePrincipal || (Array.isArray(prod.imatges) && prod.imatges[0]) || prod.image || prod.imatge || '';
    
    // Inicialitzar estructura d'opcions si en té
    const initialOpcionsCostos = {};
    if (Array.isArray(prod.opcionsPersonalitzacio)) {
      prod.opcionsPersonalitzacio.forEach(op => {
        const titol = op.titol || 'Opció';
        initialOpcionsCostos[titol] = {};
        let vList = [];
        if (typeof op.valors === 'string') {
          vList = op.valors.split(',').map(v => v.trim()).filter(Boolean);
        } else if (Array.isArray(op.valors)) {
          vList = op.valors;
        }
        if (vList.length === 0 && op.tipus === 'text') {
          vList = ['Text Personalitzat'];
        }
        vList.forEach((val, idx) => {
          initialOpcionsCostos[titol][val] = {
            sobrecost: 0,
            tempsMinuts: 0,
            isBase: idx === 0
          };
        });
      });
    }

    setFormData(prev => ({
      ...prev,
      producteNom: prod.nom || prod.title || prod.titol || 'Sense nom',
      producteId: prod.id,
      producteCodi: prod.codi || prod.code || '',
      producteImatge: rawImage,
      preuWebActual: Number(prod.preu || prod.price || 0),
      tipus: tipusLabel,
      opcionsCostos: Object.keys(prev.opcionsCostos || {}).length > 0 ? prev.opcionsCostos : initialOpcionsCostos
    }));
  };

  // Canviar sobrecost d'un valor d'opció
  const handleUpdateOptionSurcharge = (opTitol, valorName, field, value) => {
    setFormData(prev => {
      const current = { ...(prev.opcionsCostos || {}) };
      if (!current[opTitol]) current[opTitol] = {};
      if (!current[opTitol][valorName]) current[opTitol][valorName] = { sobrecost: 0 };

      current[opTitol][valorName] = {
        ...current[opTitol][valorName],
        [field]: value
      };
      return { ...prev, opcionsCostos: current };
    });
  };

  // Filtrar llista d'escandalls
  const filteredEscandalls = escandalls
    .filter(e => {
      const matchesSearch = (e.producteNom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (e.producteCodi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipus = filterTipus === 'all' || e.tipus === filterTipus;
      return matchesSearch && matchesTipus;
    })
    .sort((a, b) => (a.producteNom || '').localeCompare(b.producteNom || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      {/* Capçalera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-500" />
            Escandalls & Càlcul de Costos i Preus
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Desglossament tècnic de materials, hores de taller, maquinària i sobrecostos de personalització.
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

      {/* Barra de Cerca i Filtre de Tipus */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom de producte, codi o notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterTipus}
            onChange={(e) => setFilterTipus(e.target.value)}
            className={`p-2 rounded-xl text-xs border outline-none cursor-pointer w-full md:w-auto ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els tipus</option>
            <option value="Producte Web">Productes de Catàleg</option>
            <option value="Projecte Món Mínim">Projectes Móns Mínims</option>
            <option value="Obra Singular">Obres Singulars</option>
            <option value="A Mida">A Mida / Personalitzats</option>
          </select>
        </div>
      </div>

      {/* Llistat d'Escandalls en Targetes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEscandalls.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap escandall creat amb els filtres actuals.
          </div>
        ) : (
          filteredEscandalls.map(esc => {
            const costs = calculateCosts(esc);
            const matPct = costs.baseCost > 0 ? (costs.costMat / costs.baseCost) * 100 : 0;
            const opPct = costs.baseCost > 0 ? (costs.costOp / costs.baseCost) * 100 : 0;
            const maqPct = costs.baseCost > 0 ? (costs.costMaq / costs.baseCost) * 100 : 0;
            
            // Opcions configurades
            const opcionsEntries = Object.entries(esc.opcionsCostos || {});
            const hasOptionsConfigured = opcionsEntries.some(([_, valObj]) => 
              Object.values(valObj || {}).some(v => Number(v.sobrecost || 0) > 0)
            );

            // Comparativa de Preu Web vs PVP Recomanat
            const preuWeb = Number(esc.preuWebActual || 0);
            const margeHealthy = preuWeb > 0 ? (preuWeb >= costs.pvpRecomanat) : true;

            const displayImage = esc.producteImatge 
              ? (resolveProducteMediaUrl(esc.producteImatge) || resolveMediaUrl(esc.producteImatge))
              : '';

            return (
              <div
                key={esc.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Capçalera de la Targeta: Imatge, Codi, Títol i Accions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={esc.producteNom}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-amber-500/50" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {esc.tipus || 'Producte Web'}
                          </span>
                          {esc.producteCodi && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                              {esc.producteCodi}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: {esc.id}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-100 text-sm sm:text-base font-serif truncate" title={esc.producteNom}>
                          {esc.producteNom}
                        </h3>

                        {esc.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={esc.notes}>
                            {esc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDuplicate(esc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Duplicar / Clonar Escandall"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(esc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Escandall"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(esc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar Escandall"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Barra Visual de Proporció de Costos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Materials ({matPct.toFixed(0)}%)</span>
                      <span>Mà d'Obra ({opPct.toFixed(0)}%)</span>
                      <span>Maquinària ({maqPct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
                      <div style={{ width: `${matPct}%` }} className="bg-amber-500 h-full" title={`Materials: ${costs.costMat.toFixed(2)} €`} />
                      <div style={{ width: `${opPct}%` }} className="bg-emerald-500 h-full" title={`Mà d'Obra: ${costs.costOp.toFixed(2)} €`} />
                      <div style={{ width: `${maqPct}%` }} className="bg-sky-500 h-full" title={`Maquinària: ${costs.costMaq.toFixed(2)} €`} />
                    </div>
                  </div>

                  {/* Desglossament d'ítems: Materials | Mà d'Obra | Maquinària */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-500" /> Materials
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {costs.costMat.toFixed(2)} €
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {esc.materials?.length || 0} materials
                      </div>
                    </div>

                    <div className="p-2 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-500" /> Mà d'Obra
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {costs.costOp.toFixed(2)} €
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {esc.operacions?.length || 0} tasques
                      </div>
                    </div>

                    <div className="p-2 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-sky-500" /> Màquines
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {costs.costMaq.toFixed(2)} €
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {esc.maquinaria?.length || 0} màquines
                      </div>
                    </div>
                  </div>

                  {/* Opcions de Personalització detectades a la Targeta */}
                  {opcionsEntries.length > 0 && (
                    <div className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/30 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-400 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-amber-500" /> Opcions de Personalització ({opcionsEntries.length}):
                        </span>
                        {hasOptionsConfigured ? (
                          <span className="text-emerald-400 font-medium">Amb sobrecostos calculats</span>
                        ) : (
                          <span className="text-slate-500">Sense sobrecostos adicionals</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {opcionsEntries.map(([titol, vals]) => {
                          const surcharges = Object.entries(vals || {})
                            .filter(([_, v]) => Number(v.sobrecost || 0) > 0)
                            .map(([vName, v]) => `${vName} (+${Number(v.sobrecost).toFixed(2)} €)`);

                          return (
                            <span 
                              key={titol}
                              className={`px-2 py-0.5 rounded text-[10px] border ${
                                surcharges.length > 0
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                              title={surcharges.length > 0 ? surcharges.join(', ') : 'Totes les variants a cost base'}
                            >
                              <strong>{titol}</strong>{surcharges.length > 0 ? `: ${surcharges.join(', ')}` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Panell Econòmic Inferior: Cost Fabricació vs Preu Web vs PVP Suggerit */}
                <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 items-center text-center">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Cost Fabricació</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">
                      {costs.totalCost.toFixed(2)} €
                    </span>
                    <span className="text-[8px] text-slate-500 block">+{esc.mermePercent || 0}% mermes</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">PVP Suggerit</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {costs.pvpRecomanat.toFixed(2)} €
                    </span>
                    <span className="text-[8px] text-slate-500 block">marge +{esc.margePercent || 0}%</span>
                  </div>

                  <div className={`p-2 rounded-xl border ${
                    preuWeb > 0
                      ? margeHealthy 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[9px] block uppercase font-medium">Preu Web Actual</span>
                    <span className="font-mono font-extrabold text-xs block">
                      {preuWeb > 0 ? `${preuWeb.toFixed(2)} €` : 'No definit'}
                    </span>
                    <span className="text-[8px] block opacity-80">
                      {preuWeb > 0 ? (margeHealthy ? 'Marge sa' : 'Revisar marge') : 'Sense vincle'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form amb Pestanyes i Selector Jeràrquic de Productes */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera Modal */}
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
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
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Escandall"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Escandall</span>
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

            {/* Selector de Pestanyes del Modal */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950 px-6 gap-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveModalTab('base')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'base'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>1. Producte & Escandall Base</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('personalitzacio')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'personalitzacio'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2. Opcions de Personalització ({detectedCustomizationOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('resum')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'resum'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>3. Resum de Costos & PVP</span>
              </button>
            </div>

            {/* Contingut del Formulari */}
            <form id="escandall-modal-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* ================= PESTANYA 1: PRODUCTE & BASE ================= */}
              {activeModalTab === 'base' && (
                <div className="space-y-6">
                  {/* Selector Jeràrquic de Producte / Projecte */}
                  <div className="p-4 rounded-2xl border border-amber-500/20 bg-slate-950/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4" /> Selector Jeràrquic de Producte / Projecte a Escandallar
                      </span>
                      {formData.producteId && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Producte vinculat
                        </span>
                      )}
                    </div>

                    {/* Filtres de Selecció (Àmbit -> Família -> Gamma -> Cerca) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Àmbit / Tipus</label>
                        <select
                          value={pickerScope}
                          onChange={(e) => setPickerScope(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                        >
                          <option value="cataleg">Productes de Catàleg Web</option>
                          <option value="stitch">Projectes Móns Mínims</option>
                          <option value="worlds">Obres Singulars</option>
                          <option value="custom">Producte Personalitzat / A Mida</option>
                        </select>
                      </div>

                      {pickerScope === 'cataleg' && (
                        <>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Família</label>
                            <select
                              value={pickerFamilia}
                              onChange={(e) => {
                                setPickerFamilia(e.target.value);
                                setPickerGamma('all');
                              }}
                              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                            >
                              <option value="all">Totes les Famílies</option>
                              {families.map(f => (
                                <option key={f.id} value={f.nom || f.id}>{f.nom}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Gamma</label>
                            <select
                              value={pickerGamma}
                              onChange={(e) => setPickerGamma(e.target.value)}
                              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                            >
                              <option value="all">Totes les Gammes</option>
                              {availableGammesForPicker.map(g => (
                                <option key={g.id} value={g.nom || g.id}>{g.nom}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Cerca ràpida</label>
                            <input
                              type="text"
                              placeholder="Filtra per nom/codi..."
                              value={pickerSearch}
                              onChange={(e) => setPickerSearch(e.target.value)}
                              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Desplegable / Llista de Productes resultants segons l'àmbit triat */}
                    {pickerScope === 'cataleg' && (
                      <div className="space-y-1.5">
                        <label className="block text-slate-400 font-medium">
                          Selecciona el producte resultant ({filteredPickerProducts.length} disponibles):
                        </label>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-1 space-y-1">
                          {filteredPickerProducts.length === 0 ? (
                            <div className="p-3 text-center text-slate-500">
                              No hi ha cap producte que coincideixi amb la Família/Gamma/Cerca seleccionada.
                            </div>
                          ) : (
                            filteredPickerProducts.map(p => {
                              const isSelected = formData.producteId === p.id;
                              const pImg = p.imatgePrincipal || (Array.isArray(p.imatges) && p.imatges[0]) || p.image || '';
                              const resImg = resolveProducteMediaUrl(pImg) || resolveMediaUrl(pImg);

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectProduct(p, 'Producte Web')}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-amber-600 text-white font-semibold shadow-sm' 
                                      : 'hover:bg-slate-800/80 text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-md bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                                      {resImg && (
                                        <img src={resImg} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <span className="font-mono text-[10px] opacity-75 mr-1.5">{p.codi || ''}</span>
                                      <span>{p.nom || p.title}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                    {p.preu && <span className="font-mono opacity-90">{p.preu} €</span>}
                                    {Array.isArray(p.opcionsPersonalitzacio) && p.opcionsPersonalitzacio.length > 0 && (
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${isSelected ? 'bg-amber-700 text-white' : 'bg-slate-800 text-amber-400'}`}>
                                        {p.opcionsPersonalitzacio.length} opcions
                                      </span>
                                    )}
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {pickerScope === 'stitch' && (
                      <div className="space-y-1.5">
                        <label className="block text-slate-400 font-medium">Selecciona Projecte Món Mínim:</label>
                        <select
                          value={formData.producteId}
                          onChange={(e) => {
                            const found = STITCH_PROJECTS.find(s => s.id === e.target.value);
                            if (found) handleSelectProduct(found, 'Projecte Món Mínim');
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                        >
                          <option value="">-- Tria un projecte --</option>
                          {STITCH_PROJECTS.map(s => (
                            <option key={s.id} value={s.id}>{s.titol}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {pickerScope === 'worlds' && (
                      <div className="space-y-1.5">
                        <label className="block text-slate-400 font-medium">Selecciona Obra Singular:</label>
                        <select
                          value={formData.producteId}
                          onChange={(e) => {
                            const found = MINIATURE_WORLDS.find(w => w.id === e.target.value);
                            if (found) handleSelectProduct(found, 'Obra Singular');
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 outline-none"
                        >
                          <option value="">-- Tria una obra --</option>
                          {MINIATURE_WORLDS.map(w => (
                            <option key={w.id} value={w.id}>{w.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Dades del Producte Carregat */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
                      <div className="md:col-span-6">
                        <label className="block text-slate-400 mb-1 font-medium">Nom de l'Article / Escandall *</label>
                        <input
                          type="text"
                          required
                          value={formData.producteNom}
                          onChange={(e) => setFormData({ ...formData, producteNom: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 font-semibold"
                          placeholder="Nom del producte..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-slate-400 mb-1 font-medium">Codi Referència</label>
                        <input
                          type="text"
                          value={formData.producteCodi}
                          onChange={(e) => setFormData({ ...formData, producteCodi: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                          placeholder="Ex: REG-01"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-slate-400 mb-1 font-medium">Preu Web Actual (€)</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.preuWebActual}
                          onChange={(e) => setFormData({ ...formData, preuWebActual: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-amber-400 font-mono font-bold"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-full">
                        <label className="block text-slate-400 mb-1 font-medium">Notes / Observacions tècniques de fabricació</label>
                        <input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200"
                          placeholder="Instruccions tècniques, detalls de tall, gruixos..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloc 1: Materials Base */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                        <Package className="w-4 h-4" /> 1. Materials Base Utilitzats
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
                        className="text-amber-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Afegir Material
                      </button>
                    </div>

                    {formData.materials.length === 0 ? (
                      <p className="text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                        Cap material base afegit encara. Clica a 'Afegir Material'.
                      </p>
                    ) : (
                      formData.materials.map((mItem, idx) => {
                        const selectedMat = materials.find(m => m.id === mItem.materialId);

                        return (
                          <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-6">
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

                            <div className="md:col-span-3 flex items-center gap-1.5">
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
                              <span className="text-[10px] text-slate-500 shrink-0 font-medium">{selectedMat?.unitat || 'u'}</span>
                            </div>

                            <div className="md:col-span-3 flex items-center justify-between gap-2">
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
                      })
                    )}
                  </div>

                  {/* Bloc 2: Operacions de Taller */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                        <Wrench className="w-4 h-4" /> 2. Operacions de Mà d'Obra (Taller)
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
                        className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Afegir Operació
                      </button>
                    </div>

                    {formData.operacions.length === 0 ? (
                      <p className="text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                        Cap operació de mà d'obra afegida encara.
                      </p>
                    ) : (
                      formData.operacions.map((opItem, idx) => {
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-6">
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

                            <div className="md:col-span-3 flex items-center gap-1.5">
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
                              <span className="text-[10px] text-slate-500 shrink-0 font-medium">min</span>
                            </div>

                            <div className="md:col-span-3 flex items-center justify-between gap-2">
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
                      })
                    )}
                  </div>

                  {/* Bloc 3: Maquinària */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                        <Cpu className="w-4 h-4" /> 3. Temps de Maquinària (Làser, 3D, Serres...)
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
                        className="text-sky-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Afegir Màquina
                      </button>
                    </div>

                    {formData.maquinaria.length === 0 ? (
                      <p className="text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                        Cap màquina afegida a l'escandall base.
                      </p>
                    ) : (
                      formData.maquinaria.map((maqItem, idx) => {
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-6">
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

                            <div className="md:col-span-3 flex items-center gap-1.5">
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
                              <span className="text-[10px] text-slate-500 shrink-0 font-medium">min</span>
                            </div>

                            <div className="md:col-span-3 flex items-center justify-between gap-2">
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
                      })
                    )}
                  </div>

                  {/* Paràmetres Financers: Mermes i Marges */}
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">% Mermes / Desperdici Material</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
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
                          step="any"
                          value={formData.margePercent}
                          onChange={(e) => setFormData({ ...formData, margePercent: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-amber-400 font-bold"
                        />
                        <span className="text-amber-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= PESTANYA 2: OPCIONS DE PERSONALITZACIÓ ================= */}
              {activeModalTab === 'personalitzacio' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-amber-500/20 bg-slate-950/60 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                        <Sliders className="w-4 h-4" /> Sobrecostos de Personalització detectats del Producte
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Aquests són els camps que veu el client al web. Per defecte tenen sobrecost 0 €. Introdueix l'increment de cost als valors que realment gastin més material o temps.
                      </p>
                    </div>
                  </div>

                  {detectedCustomizationOptions.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                      <Sliders className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="text-slate-400 font-medium">Aquest producte no té opcions de personalització configurades a la seva fitxa.</p>
                      <p className="text-[11px] text-slate-500">
                        Si és un producte estàndard sense opcions, el cost total és exactament el calculat a l'escandall base.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detectedCustomizationOptions.map((opc, opIdx) => {
                        const opTitol = opc.titol;
                        const isExpanded = expandedOptionKey === opTitol || opIdx === 0;

                        return (
                          <div 
                            key={opTitol} 
                            className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden"
                          >
                            {/* Capçalera de l'Opció */}
                            <div 
                              onClick={() => setExpandedOptionKey(isExpanded ? null : opTitol)}
                              className="p-3.5 bg-slate-900/80 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200 text-xs font-serif">{opTitol}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                  Tipus: {opc.tipus}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ({opc.valors.length} valors possibles)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-400 font-mono">
                                  {Object.values((formData.opcionsCostos || {})[opTitol] || {}).filter(v => Number(v.sobrecost || 0) > 0).length} amb sobrecost
                                </span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </div>

                            {/* Valors de l'Opció */}
                            <div className="p-4 space-y-3 border-t border-slate-800/80">
                              {opc.valors.map((valName, valIdx) => {
                                const currentValData = ((formData.opcionsCostos || {})[opTitol] || {})[valName] || { sobrecost: 0, tempsMinuts: 0 };
                                const sobrecostVal = Number(currentValData.sobrecost || 0);

                                return (
                                  <div 
                                    key={valName}
                                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                      sobrecostVal > 0 
                                        ? 'bg-amber-500/5 border-amber-500/30' 
                                        : 'bg-slate-900/40 border-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${sobrecostVal > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                      <div>
                                        <span className="font-semibold text-slate-200 text-xs block truncate">{valName}</span>
                                        <span className="text-[10px] text-slate-500">
                                          {valIdx === 0 ? 'Opció inicial / per defecte' : `Variant ${valIdx + 1}`}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[11px] text-slate-400 font-medium shrink-0">Sobrecost Directe:</label>
                                        <div className="relative w-28">
                                          <input
                                            type="number"
                                            step="any"
                                            value={currentValData.sobrecost ?? 0}
                                            onChange={(e) => handleUpdateOptionSurcharge(opTitol, valName, 'sobrecost', parseFloat(e.target.value) || 0)}
                                            className="w-full p-1.5 pr-6 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right text-xs"
                                            placeholder="0.00"
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[10px]">€</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[11px] text-slate-400 font-medium shrink-0">Temps extra:</label>
                                        <div className="relative w-20">
                                          <input
                                            type="number"
                                            value={currentValData.tempsMinuts ?? 0}
                                            onChange={(e) => handleUpdateOptionSurcharge(opTitol, valName, 'tempsMinuts', parseInt(e.target.value) || 0)}
                                            className="w-full p-1.5 pr-7 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right text-xs"
                                            placeholder="0"
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">min</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= PESTANYA 3: RESUM FINANCER & COMPARATIVA ================= */}
              {activeModalTab === 'resum' && (() => {
                const costs = calculateCosts(formData);
                const preuWeb = Number(formData.preuWebActual || 0);
                const margeHealthy = preuWeb > 0 ? (preuWeb >= costs.pvpRecomanat) : true;

                return (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4">
                      <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" /> Balanç de Costos i Preu de Venda
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                          <span className="text-[10px] text-slate-400 block">Cost Materials</span>
                          <span className="font-mono font-bold text-slate-200 text-sm">{costs.costMat.toFixed(2)} €</span>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                          <span className="text-[10px] text-slate-400 block">Cost Mà d'Obra</span>
                          <span className="font-mono font-bold text-slate-200 text-sm">{costs.costOp.toFixed(2)} €</span>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                          <span className="text-[10px] text-slate-400 block">Cost Maquinària</span>
                          <span className="font-mono font-bold text-slate-200 text-sm">{costs.costMaq.toFixed(2)} €</span>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                          <span className="text-[10px] text-slate-400 block">Mermes ({formData.mermePercent || 0}%)</span>
                          <span className="font-mono font-bold text-slate-200 text-sm">{costs.mermeAmount.toFixed(2)} €</span>
                        </div>
                      </div>

                      {/* Caixa Principal de PVP */}
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        <div>
                          <span className="text-xs text-slate-400 block uppercase font-medium">Cost Total Fabricació</span>
                          <span className="font-mono font-extrabold text-slate-200 text-xl">{costs.totalCost.toFixed(2)} €</span>
                        </div>

                        <div>
                          <span className="text-xs text-amber-400 block uppercase font-semibold">PVP Suggerit (+{formData.margePercent || 0}% marge)</span>
                          <span className="font-mono font-extrabold text-amber-400 text-2xl">{costs.pvpRecomanat.toFixed(2)} €</span>
                        </div>

                        <div className={`p-3 rounded-xl border text-right ${
                          preuWeb > 0
                            ? margeHealthy 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                              : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          <span className="text-[10px] uppercase font-bold block">Preu Actual a la Botiga</span>
                          <span className="font-mono font-extrabold text-xl block">
                            {preuWeb > 0 ? `${preuWeb.toFixed(2)} €` : 'No definit'}
                          </span>
                          <span className="text-[10px] font-medium block">
                            {preuWeb > 0 
                              ? (margeHealthy 
                                  ? `Marge garantit (+${((preuWeb - costs.totalCost) / costs.totalCost * 100).toFixed(0)}%)` 
                                  : `Marge reduït (+${((preuWeb - costs.totalCost) / costs.totalCost * 100).toFixed(0)}%)`)
                              : 'Sense enllaç web'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
