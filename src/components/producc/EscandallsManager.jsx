import React, { useState, useMemo } from 'react';
import { 
  Calculator, Plus, Search, Edit2, Trash2, Copy, Package, Wrench, Cpu, 
  DollarSign, TrendingUp, AlertCircle, FileText, ChevronRight, ChevronDown, ChevronUp, 
  X, Percent, Save, Sparkles, Filter, Layers, CheckCircle2, ArrowRight, ExternalLink, 
  Image as ImageIcon, Sliders, Check, Palette, Type, ZoomIn
} from 'lucide-react';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';
import { STITCH_PROJECTS } from '../../data/stitchData';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';

// Helper per determinar si una opció és de text lliure (gravat, inicial, etc.)
const isTextOption = (op) => {
  const t = (op.tipus || '').toLowerCase().trim();
  return t === 'text' || t === 'textarea' || t === 'string' || t === 'camp text' || t === 'camp de text';
};

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
  const [activeScope, setActiveScope] = useState('productes'); // 'productes' | 'projectes'
  const [filterFamilia, setFilterFamilia] = useState('all');
  const [filterGamma, setFilterGamma] = useState('all');

  // Modal d'Edició / Formulari Principal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscandall, setEditingEscandall] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('base'); // 'base' | 'personalitzacio' | 'resum'
  const [expandedOptionKey, setExpandedOptionKey] = useState(null);

  // Estat per a visualitzar la imatge ampliada (Lightbox)
  const [zoomedImage, setZoomedImage] = useState(null);

  // Finestra Flotant de Selecció de Producte (per a Nou Escandall)
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerFamilia, setPickerFamilia] = useState('all');
  const [pickerGamma, setPickerGamma] = useState('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Finestra Flotant de Selecció de Projecte
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectPickerType, setProjectPickerType] = useState('stitch'); // 'stitch' | 'worlds' | 'custom'

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
    opcionsCostos: {}
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

  // Gammes disponibles per al filtre de la barra superior
  const availableGammesForMain = useMemo(() => {
    if (filterFamilia === 'all') return gammes;
    const selectedFamObj = families.find(f => f.id === filterFamilia || f.nom === filterFamilia);
    const famNom = selectedFamObj ? selectedFamObj.nom : filterFamilia;
    return gammes.filter(g => g.familiaNom === famNom || g.familiaId === filterFamilia);
  }, [gammes, families, filterFamilia]);

  // Gammes filtrades per a la finestra flotant de selecció
  const availableGammesForPicker = useMemo(() => {
    if (pickerFamilia === 'all') return gammes;
    const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
    const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
    return gammes.filter(g => g.familiaNom === famNom || g.familiaId === pickerFamilia);
  }, [gammes, families, pickerFamilia]);

  // Productes filtrats a la finestra flotant de selecció
  const filteredPickerProducts = useMemo(() => {
    return allCatalogProducts.filter(p => {
      if (pickerFamilia !== 'all') {
        const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
        const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
        const matchesFam = (Array.isArray(p.familaIds) && p.familaIds.includes(famNom)) ||
                           (Array.isArray(p.familiaIds) && p.familiaIds.includes(pickerFamilia)) ||
                           p.familia === famNom;
        if (!matchesFam) return false;
      }

      if (pickerGamma !== 'all') {
        const matchesGam = (Array.isArray(p.gammaIds) && p.gammaIds.includes(pickerGamma)) ||
                           p.gammaId === pickerGamma;
        if (!matchesGam) return false;
      }

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

  // Obrir el selector segons l'àmbit actiu
  const handleOpenCreateClick = () => {
    if (activeScope === 'productes') {
      setPickerFamilia(filterFamilia);
      setPickerGamma(filterGamma);
      setPickerSearch('');
      setProductPickerOpen(true);
    } else {
      setProjectPickerType('stitch');
      setProjectPickerOpen(true);
    }
  };

  // En seleccionar un producte des de la finestra flotant -> obre directament l'edició omplint els camps
  const handleSelectProductAndOpenEdit = (prod) => {
    const rawImage = prod.imatgePrincipal || (Array.isArray(prod.imatges) && prod.imatges[0]) || prod.image || prod.imatge || '';
    
    // Inicialitzar opcions si en té
    const initialOpcionsCostos = {};
    if (Array.isArray(prod.opcionsPersonalitzacio)) {
      prod.opcionsPersonalitzacio.forEach(op => {
        const titol = op.titol || 'Opció';
        initialOpcionsCostos[titol] = {};
        
        if (isTextOption(op)) {
          // Camp de text lliure: 1 única entrada de cost
          initialOpcionsCostos[titol]['Text Personalitzat'] = {
            sobrecost: 0,
            tempsMinuts: 0,
            isBase: true
          };
        } else {
          // Desplegable o selecció de valors
          let vList = [];
          if (typeof op.valors === 'string') {
            vList = op.valors.split(',').map(v => v.trim()).filter(v => v && v !== '...');
          } else if (Array.isArray(op.valors)) {
            vList = op.valors.filter(v => v && v !== '...');
          }
          if (vList.length === 0) {
            vList = ['Opció Estàndard'];
          }
          vList.forEach((val, idx) => {
            initialOpcionsCostos[titol][val] = {
              sobrecost: 0,
              tempsMinuts: 0,
              isBase: idx === 0
            };
          });
        }
      });
    }

    setEditingEscandall(null);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      producteNom: prod.nom || prod.title || prod.titol || 'Sense nom',
      producteId: prod.id,
      producteCodi: prod.codi || prod.code || '',
      producteImatge: rawImage,
      preuWebActual: Number(prod.preu || prod.price || 0),
      tipus: 'Producte Web',
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: [],
      opcionsCostos: initialOpcionsCostos
    });

    setProductPickerOpen(false);
    setModalOpen(true);
  };

  // En seleccionar un projecte des de la finestra flotant
  const handleSelectProjectAndOpenEdit = (proj, tipusLabel) => {
    setEditingEscandall(null);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      producteNom: proj.titol || proj.title || 'Projecte Nou',
      producteId: proj.id || `proj-${Date.now()}`,
      producteCodi: proj.codi || proj.id || '',
      producteImatge: proj.imatge || proj.image || '',
      preuWebActual: Number(proj.price || 0),
      tipus: tipusLabel,
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: [],
      opcionsCostos: {}
    });

    setProjectPickerOpen(false);
    setModalOpen(true);
  };

  // Obrir modal per editar un escandall existent
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
      alert('Si us plau, especifica el nom del producte o projecte.');
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

  // Detectar producte vinculat
  const currentLinkedProduct = useMemo(() => {
    if (!formData.producteId) return null;
    return allCatalogProducts.find(p => p.id === formData.producteId) || null;
  }, [allCatalogProducts, formData.producteId]);

  // Resolució del nom de Família i Gamma per al producte vinculat
  const currentFamiliaNom = useMemo(() => {
    if (!currentLinkedProduct) return '';
    if (currentLinkedProduct.familia) return currentLinkedProduct.familia;
    if (Array.isArray(currentLinkedProduct.familaIds) && currentLinkedProduct.familaIds.length > 0) {
      const fId = currentLinkedProduct.familaIds[0];
      const famObj = families.find(f => f.id === fId || f.nom === fId);
      return famObj ? famObj.nom : fId;
    }
    if (Array.isArray(currentLinkedProduct.familiaIds) && currentLinkedProduct.familiaIds.length > 0) {
      const fId = currentLinkedProduct.familiaIds[0];
      const famObj = families.find(f => f.id === fId || f.nom === fId);
      return famObj ? famObj.nom : fId;
    }
    return '';
  }, [currentLinkedProduct, families]);

  const currentGammaNom = useMemo(() => {
    if (!currentLinkedProduct) return '';
    if (currentLinkedProduct.gamma) return currentLinkedProduct.gamma;
    if (currentLinkedProduct.gammaNom) return currentLinkedProduct.gammaNom;
    if (Array.isArray(currentLinkedProduct.gammaIds) && currentLinkedProduct.gammaIds.length > 0) {
      const gId = currentLinkedProduct.gammaIds[0];
      const gamObj = gammes.find(g => g.id === gId || g.nom === gId);
      return gamObj ? gamObj.nom : gId;
    }
    if (currentLinkedProduct.gammaId) {
      const gamObj = gammes.find(g => g.id === currentLinkedProduct.gammaId || g.nom === currentLinkedProduct.gammaId);
      return gamObj ? gamObj.nom : currentLinkedProduct.gammaId;
    }
    return '';
  }, [currentLinkedProduct, gammes]);

  // Detectar opcions de personalització disponibles per al producte vinculat
  const detectedCustomizationOptions = useMemo(() => {
    if (!currentLinkedProduct) return [];
    const ops = currentLinkedProduct.opcionsPersonalitzacio;
    if (!Array.isArray(ops)) return [];

    return ops.map(op => {
      const isText = isTextOption(op);
      let valuesList = [];

      if (isText) {
        // Camp de text (gravat, inicial, etc.): només 1 cost de personalització
        valuesList = ['Text Personalitzat'];
      } else {
        if (typeof op.valors === 'string') {
          valuesList = op.valors.split(',').map(v => v.trim()).filter(v => v && v !== '...');
        } else if (Array.isArray(op.valors)) {
          valuesList = op.valors.filter(v => v && v !== '...');
        }
        if (valuesList.length === 0) {
          valuesList = ['Opció Estàndard'];
        }
      }

      return {
        titol: op.titol || 'Opció',
        tipus: isText ? 'text' : (op.tipus || 'desplegable'),
        isText,
        valors: valuesList
      };
    });
  }, [currentLinkedProduct]);

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

  // Recomptes per àmbit
  const countProductes = escandalls.filter(e => !e.tipus || e.tipus === 'Producte Web').length;
  const countProjectes = escandalls.filter(e => e.tipus && e.tipus !== 'Producte Web').length;

  // Filtrar llista d'escandalls segons l'àmbit triat, Família, Gamma i cerca
  const filteredEscandalls = escandalls
    .filter(e => {
      const isProducte = !e.tipus || e.tipus === 'Producte Web';
      if (activeScope === 'productes' && !isProducte) return false;
      if (activeScope === 'projectes' && isProducte) return false;

      // Filtres específics de Família i Gamma per a Productes
      if (activeScope === 'productes') {
        const prod = allCatalogProducts.find(p => p.id === e.producteId || p.codi === e.producteCodi || p.nom === e.producteNom);
        
        if (filterFamilia !== 'all') {
          const selFam = families.find(f => f.id === filterFamilia || f.nom === filterFamilia);
          const famNom = selFam ? selFam.nom : filterFamilia;
          const matchesFam = prod && (
            (Array.isArray(prod.familaIds) && prod.familaIds.includes(famNom)) ||
            (Array.isArray(prod.familiaIds) && prod.familiaIds.includes(filterFamilia)) ||
            prod.familia === famNom ||
            e.familia === famNom
          );
          if (!matchesFam) return false;
        }

        if (filterGamma !== 'all') {
          const matchesGam = prod && (
            (Array.isArray(prod.gammaIds) && prod.gammaIds.includes(filterGamma)) ||
            prod.gammaId === filterGamma ||
            e.gamma === filterGamma
          );
          if (!matchesGam) return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (e.producteNom || '').toLowerCase().includes(q) ||
                              (e.producteCodi || '').toLowerCase().includes(q) ||
                              (e.notes || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
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
          onClick={handleOpenCreateClick}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {activeScope === 'productes' ? 'Nou Escandall de Producte' : 'Nou Escandall de Projecte'}
        </button>
      </div>

      {/* Selectors d'Àmbit (Productes vs Projectes), Filtres de Família/Gamma i Cerca */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* 1. Botons de Selecció: Productes vs Projectes */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveScope('productes');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'productes'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Productes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeScope === 'productes' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {countProductes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScope('projectes');
              setFilterFamilia('all');
              setFilterGamma('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'projectes'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Projectes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeScope === 'projectes' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {countProjectes}
            </span>
          </button>
        </div>

        {/* 2. Filtres Dinàmics de Família i Gamma (Només quan s'ha triat 'Productes') */}
        {activeScope === 'productes' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Desplegable Família */}
            <select
              value={filterFamilia}
              onChange={(e) => {
                setFilterFamilia(e.target.value);
                setFilterGamma('all');
              }}
              className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Filtrar per Família"
            >
              <option value="all">Totes les Famílies</option>
              {families.map(f => (
                <option key={f.id} value={f.nom || f.id}>{f.nom}</option>
              ))}
            </select>

            {/* Desplegable Gamma */}
            <select
              value={filterGamma}
              onChange={(e) => setFilterGamma(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Filtrar per Gamma"
            >
              <option value="all">Totes les Gammes</option>
              {availableGammesForMain.map(g => (
                <option key={g.id} value={g.nom || g.id}>{g.nom}</option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Barra de Cerca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeScope === 'productes' ? "Cerca producte de catàleg, codi, descripció..." : "Cerca projecte món mínim, singular o a mida..."}
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

      {/* LLISTAT EN FORMAT D'AMPLE A AMPLE (Fitxes Horitzontals Compactes) */}
      <div className="space-y-3">
        {filteredEscandalls.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
            {activeScope === 'productes' 
              ? "No hi ha cap escandall de Productes de Catàleg amb els filtres seleccionats."
              : "No hi ha cap escandall de Projectes amb els filtres seleccionats."
            }
          </div>
        ) : (
          filteredEscandalls.map(esc => {
            const costs = calculateCosts(esc);
            const matPct = costs.baseCost > 0 ? (costs.costMat / costs.baseCost) * 100 : 0;
            const opPct = costs.baseCost > 0 ? (costs.costOp / costs.baseCost) * 100 : 0;
            const maqPct = costs.baseCost > 0 ? (costs.costMaq / costs.baseCost) * 100 : 0;
            
            const preuWeb = Number(esc.preuWebActual || 0);

            const displayImage = esc.producteImatge 
              ? (resolveProducteMediaUrl(esc.producteImatge) || resolveMediaUrl(esc.producteImatge))
              : '';

            return (
              <div
                key={esc.id}
                className={`w-full p-3 sm:p-4 rounded-2xl border flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* 1. Bloc Esquerre: Identificació Producte / Projecte */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    onClick={() => displayImage && setZoomedImage(displayImage)}
                    className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative group ${
                      displayImage ? 'cursor-pointer hover:border-amber-500/60 transition-all' : ''
                    }`}
                    title={displayImage ? "Clica per ampliar la imatge" : ""}
                  >
                    {displayImage ? (
                      <>
                        <img
                          src={displayImage}
                          alt={esc.producteNom}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </>
                    ) : (
                      activeScope === 'productes' ? <Package className="w-5 h-5 text-amber-500/50" /> : <Palette className="w-5 h-5 text-amber-500/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h3 className="font-bold text-slate-100 text-sm sm:text-base font-serif truncate mr-1" title={esc.producteNom}>
                        {esc.producteNom}
                      </h3>
                      {esc.producteCodi && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                          {esc.producteCodi}
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        {esc.tipus || 'Producte Web'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1" title={esc.notes || 'Sense descripció addicional'}>
                      {esc.notes || (esc.materials?.length ? `${esc.materials.length} materials, ${esc.operacions?.length || 0} operacions` : 'Sense descripció')}
                    </p>
                  </div>
                </div>

                {/* Blocs Numèrics de la Targeta Horitzontal */}
                <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 shrink-0 text-xs">
                  
                  {/* 2. Bloc: Desglossament de Costos */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 min-w-[170px] flex-1 sm:flex-none flex flex-col justify-center space-y-0.5">
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Materials ({matPct.toFixed(0)}%):</span>
                      <strong className="font-mono text-slate-200 ml-2">{costs.costMat.toFixed(2)} €</strong>
                    </div>
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Mà d'obra ({opPct.toFixed(0)}%):</span>
                      <strong className="font-mono text-slate-200 ml-2">{costs.costOp.toFixed(2)} €</strong>
                    </div>
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Maquinària ({maqPct.toFixed(0)}%):</span>
                      <strong className="font-mono text-slate-200 ml-2">{costs.costMaq.toFixed(2)} €</strong>
                    </div>
                  </div>

                  {/* 3. Bloc: Cost de Fabricació & Marges */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 min-w-[210px] flex-1 sm:flex-none flex flex-col justify-center space-y-0.5">
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Cost de fabricació:</span>
                      <strong className="font-mono text-slate-200 ml-2">{costs.totalCost.toFixed(2)} €</strong>
                    </div>
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">Marge comercial (+{esc.margePercent || 65}%):</span>
                      <strong className="font-mono text-slate-200 ml-2">{costs.marginAmount.toFixed(2)} €</strong>
                    </div>
                    <div className="text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400">PVP suggerit:</span>
                      <strong className="font-mono text-amber-400 font-bold ml-2">{costs.pvpRecomanat.toFixed(2)} €</strong>
                    </div>
                  </div>

                  {/* 4. Bloc: PVP Web / Venda */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 min-w-[110px] text-center flex flex-col justify-center shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium">PVP Web:</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-0.5">
                      {preuWeb > 0 ? `${preuWeb.toFixed(2)} €` : `${costs.pvpRecomanat.toFixed(2)} €`}
                    </span>
                  </div>

                  {/* 5. Bloc: Botons d'Acció */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(esc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar Escandall"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(esc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Duplicar / Clonar Escandall"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(esc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar Escandall"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT: SELECTOR DE PRODUCTE A ESCANDALLAR */}
      {/* ========================================================================= */}
      {productPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-3xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera del Selector */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 text-slate-100">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>Selecciona el Producte a Escandallar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtra per Família i Gamma per localitzar la peça ràpidament.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProductPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra Superior de Filtres (Família, Gamma i Cerca) */}
            <div className={`p-4 border-b flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Filtre Família */}
              <select
                value={pickerFamilia}
                onChange={(e) => {
                  setPickerFamilia(e.target.value);
                  setPickerGamma('all');
                }}
                className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer flex-1 sm:flex-none sm:w-48 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">Totes les Famílies</option>
                {families.map(f => (
                  <option key={f.id} value={f.nom || f.id}>{f.nom}</option>
                ))}
              </select>

              {/* Filtre Gamma */}
              <select
                value={pickerGamma}
                onChange={(e) => setPickerGamma(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer flex-1 sm:flex-none sm:w-48 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">Totes les Gammes</option>
                {availableGammesForPicker.map(g => (
                  <option key={g.id} value={g.nom || g.id}>{g.nom}</option>
                ))}
              </select>

              {/* Cerca Ràpida */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca per nom o codi..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Llista de Productes per Seleccionar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPickerProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No s'ha trobat cap producte que coincideixi amb els filtres seleccionats.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredPickerProducts.map(p => {
                    const pImg = p.imatgePrincipal || (Array.isArray(p.imatges) && p.imatges[0]) || p.image || '';
                    const resImg = resolveProducteMediaUrl(pImg) || resolveMediaUrl(pImg);

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProductAndOpenEdit(p)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isDark 
                            ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/[0.04]' 
                            : 'bg-white border-slate-200 hover:border-amber-500 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {resImg ? (
                              <img src={resImg} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <Package className="w-5 h-5 text-amber-500/50" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {p.codi && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {p.codi}
                                </span>
                              )}
                              {Array.isArray(p.opcionsPersonalitzacio) && p.opcionsPersonalitzacio.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                                  {p.opcionsPersonalitzacio.length} opcions
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-100 text-xs truncate">
                              {p.nom || p.title}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {p.preu ? (
                            <span className="font-mono font-bold text-xs text-amber-400 block">{p.preu} €</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block">Sense preu</span>
                          )}
                          <span className="text-[10px] text-amber-400/80 hover:underline flex items-center justify-end gap-1 mt-0.5 font-semibold">
                            Triar <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT: SELECTOR DE PROJECTE */}
      {/* ========================================================================= */}
      {projectPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 text-slate-100">
                  <Palette className="w-5 h-5 text-amber-500" />
                  <span>Selecciona el Projecte a Escandallar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tria entre projectes de Móns Mínims, obres singulars o crea'n un a mida.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProjectPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 border-b flex items-center gap-2 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setProjectPickerType('stitch')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'stitch' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Móns Mínims
              </button>
              <button
                type="button"
                onClick={() => setProjectPickerType('worlds')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'worlds' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Obres Singulars
              </button>
              <button
                type="button"
                onClick={() => setProjectPickerType('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'custom' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Nou a Mida
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projectPickerType === 'stitch' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STITCH_PROJECTS.map(sp => (
                    <div
                      key={sp.id}
                      onClick={() => handleSelectProjectAndOpenEdit(sp, 'Projecte Món Mínim')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60' : 'bg-white border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-400 font-mono block">{sp.escala || 'Món Mínim'}</span>
                        <h4 className="font-bold text-slate-100 text-xs truncate">{sp.titol}</h4>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold shrink-0 flex items-center gap-1">
                        Triar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {projectPickerType === 'worlds' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MINIATURE_WORLDS.map(mw => (
                    <div
                      key={mw.id}
                      onClick={() => handleSelectProjectAndOpenEdit(mw, 'Obra Singular')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60' : 'bg-white border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-400 font-mono block">{mw.price ? `${mw.price} €` : 'Exposició'}</span>
                        <h4 className="font-bold text-slate-100 text-xs truncate">{mw.title}</h4>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold shrink-0 flex items-center gap-1">
                        Triar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {projectPickerType === 'custom' && (
                <div className="p-6 text-center space-y-4">
                  <p className="text-xs text-slate-300">
                    Crea un escandall per a un projecte personalitzat o encàrrec a mida des de zero.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectProjectAndOpenEdit({ titol: 'Nou Projecte a Mida' }, 'A Mida')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
                  >
                    Començar Escandall a Mida
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT D'EDICIÓ DE L'ESCANDALL (CENTRADOR EN LA PEÇA TRIADA) */}
      {/* ========================================================================= */}
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
                    activeScope === 'productes' ? 'Nou Escandall de Producte' : 'Nou Escandall de Projecte'
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
                <span>1. Escandall Base & Dades</span>
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
                  
                  {/* IDENTIFICADOR NET DE LA PEÇA / PRODUCTE TRIAT */}
                  {(() => {
                    const displayModalImage = formData.producteImatge 
                      ? (resolveProducteMediaUrl(formData.producteImatge) || resolveMediaUrl(formData.producteImatge))
                      : '';

                    return (
                      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Miniatura amb clic per ampliar (Lightbox) */}
                          <div 
                            onClick={() => displayModalImage && setZoomedImage(displayModalImage)}
                            className={`w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative group ${
                              displayModalImage ? 'cursor-pointer hover:border-amber-500/60 transition-all' : ''
                            }`}
                            title={displayModalImage ? "Clica per ampliar la imatge" : ""}
                          >
                            {displayModalImage ? (
                              <>
                                <img
                                  src={displayModalImage}
                                  alt={formData.producteNom}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </>
                            ) : (
                              <Package className="w-6 h-6 text-amber-500/50" />
                            )}
                          </div>

                          <div className="min-w-0">
                            {/* Píndoles: Tipus + Família + Gamma */}
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {formData.tipus || 'Producte Web'}
                              </span>
                              {currentFamiliaNom && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                  {currentFamiliaNom}
                                </span>
                              )}
                              {currentGammaNom && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                  {currentGammaNom}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-100 text-sm sm:text-base font-serif truncate">
                              {formData.producteNom || 'Sense nom'}
                            </h4>
                          </div>
                        </div>

                        {formData.preuWebActual > 0 && (
                          <div className="text-left sm:text-right shrink-0 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">PVP Botiga Web</span>
                            <span className="font-mono font-bold text-sm text-slate-200">{Number(formData.preuWebActual).toFixed(2)} €</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Taula 1: MATERIALS DE FABRICACIÓ */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-amber-500" /> 1. Consum de Materials
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            materials: [...prev.materials, { materialId: materials[0]?.id || '', quantitat: 1 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        + Afegir Material
                      </button>
                    </div>

                    {formData.materials.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">No s'ha assignat cap material encara.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.materials.map((item, idx) => {
                          const matObj = materials.find(m => m.id === item.materialId);
                          const unitCost = item.costUnitari ?? (matObj ? matObj.preuProPrin : 0);
                          const subtotal = Number(item.quantitat || 0) * Number(unitCost || 0);

                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <div className="col-span-6">
                                <select
                                  value={item.materialId}
                                  onChange={(e) => {
                                    const next = [...formData.materials];
                                    next[idx].materialId = e.target.value;
                                    setFormData({ ...formData, materials: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                                >
                                  {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.material} ({m.preuProPrin} € / {m.unitat})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-3 flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.quantitat}
                                  onChange={(e) => {
                                    const next = [...formData.materials];
                                    next[idx].quantitat = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, materials: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                                  placeholder="Quantitat"
                                />
                                <span className="text-[10px] text-slate-400">{matObj?.unitat || 'u'}</span>
                              </div>

                              <div className="col-span-2 text-right font-mono text-amber-400 font-semibold">
                                {subtotal.toFixed(2)} €
                              </div>

                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      materials: formData.materials.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Taula 2: OPERACIONS DE TALLER */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-emerald-500" /> 2. Operacions de Mà d'Obra (Taller)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            operacions: [...prev.operacions, { operacioId: operacions[0]?.id || '', tempsMinuts: 10 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        + Afegir Operació
                      </button>
                    </div>

                    {formData.operacions.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">No s'ha assignat cap operació encara.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.operacions.map((item, idx) => {
                          const opObj = operacions.find(o => o.id === item.operacioId);
                          const hourCost = item.costHora ?? (opObj ? opObj.preuHora : 0);
                          const subtotal = (Number(item.tempsMinuts || 0) / 60) * Number(hourCost || 0);

                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <div className="col-span-6">
                                <select
                                  value={item.operacioId}
                                  onChange={(e) => {
                                    const next = [...formData.operacions];
                                    next[idx].operacioId = e.target.value;
                                    setFormData({ ...formData, operacions: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                                >
                                  {operacions.map(o => (
                                    <option key={o.id} value={o.id}>{o.operacio} ({o.preuHora} €/h)</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-3 flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.tempsMinuts}
                                  onChange={(e) => {
                                    const next = [...formData.operacions];
                                    next[idx].tempsMinuts = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, operacions: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                                  placeholder="Minuts"
                                />
                                <span className="text-[10px] text-slate-400">min</span>
                              </div>

                              <div className="col-span-2 text-right font-mono text-emerald-400 font-semibold">
                                {subtotal.toFixed(2)} €
                              </div>

                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      operacions: formData.operacions.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Taula 3: MAQUINÀRIA */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-sky-500" /> 3. Amortització & Ús de Maquinària
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            maquinaria: [...prev.maquinaria, { maquinaId: maquinaria[0]?.id || '', tempsMinuts: 5 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-sky-600/80 hover:bg-sky-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        + Afegir Màquina
                      </button>
                    </div>

                    {formData.maquinaria.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">No s'ha assignat cap maquinària.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.maquinaria.map((item, idx) => {
                          const maqObj = maquinaria.find(m => m.id === item.maquinaId);
                          const hourCost = item.costHora ?? (maqObj ? maqObj.preuHora : 0);
                          const subtotal = (Number(item.tempsMinuts || 0) / 60) * Number(hourCost || 0);

                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <div className="col-span-6">
                                <select
                                  value={item.maquinaId}
                                  onChange={(e) => {
                                    const next = [...formData.maquinaria];
                                    next[idx].maquinaId = e.target.value;
                                    setFormData({ ...formData, maquinaria: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                                >
                                  {maquinaria.map(m => (
                                    <option key={m.id} value={m.id}>{m.maquina} ({m.preuHora} €/h)</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-3 flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.tempsMinuts}
                                  onChange={(e) => {
                                    const next = [...formData.maquinaria];
                                    next[idx].tempsMinuts = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, maquinaria: next });
                                  }}
                                  className="w-full p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                                  placeholder="Minuts"
                                />
                                <span className="text-[10px] text-slate-400">min</span>
                              </div>

                              <div className="col-span-2 text-right font-mono text-sky-400 font-semibold">
                                {subtotal.toFixed(2)} €
                              </div>

                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      maquinaria: formData.maquinaria.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= PESTANYA 2: OPCIONS DE PERSONALITZACIÓ ================= */}
              {activeModalTab === 'personalitzacio' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
                    <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs mb-1">
                      <Sliders className="w-4 h-4" /> Sobrecostos de Personalització segons Variants del Catàleg
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configura el sobrecost directe o minuts addicionals de taller que requereix cadascuna de les opcions que el client pot triar o escriure a la botiga web.
                    </p>
                  </div>

                  {detectedCustomizationOptions.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500">
                      Aquest producte no té opcions de personalització definides al catàleg de la botiga.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectedCustomizationOptions.map(op => {
                        const isExpanded = expandedOptionKey === op.titol;
                        const currentValObj = formData.opcionsCostos[op.titol] || {};

                        return (
                          <div key={op.titol} className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                            <div
                              onClick={() => setExpandedOptionKey(isExpanded ? null : op.titol)}
                              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{op.titol}</span>
                                {op.isText ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold flex items-center gap-1">
                                    <Type className="w-3 h-3" /> Camp de Text Lliure
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                    {op.valors.length} valors seleccionables
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-slate-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-4 pt-2 border-t border-slate-800 space-y-3">
                                {op.isText ? (
                                  // OPCIÓ DE TEXT LLIURE (1 ÚNICA FILA PER ASSIGNAR COST DE GRAVAT/TEXT)
                                  (() => {
                                    const valConfig = currentValObj['Text Personalitzat'] || 
                                                      currentValObj[Object.keys(currentValObj)[0]] || 
                                                      { sobrecost: 0, tempsMinuts: 0 };

                                    return (
                                      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                            <Type className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Personalització de Text / Gravat</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            El client introdueix el text/inicial a la botiga web. Defineix el cost fix o temps extra si s'aplica.
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] text-slate-400">Sobrecost directe (€):</label>
                                            <input
                                              type="number"
                                              step="any"
                                              value={valConfig.sobrecost || 0}
                                              onChange={(e) => handleUpdateOptionSurcharge(op.titol, 'Text Personalitzat', 'sobrecost', parseFloat(e.target.value) || 0)}
                                              className="w-20 p-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right"
                                            />
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] text-slate-400">Minuts extra:</label>
                                            <input
                                              type="number"
                                              step="any"
                                              value={valConfig.tempsMinuts || 0}
                                              onChange={(e) => handleUpdateOptionSurcharge(op.titol, 'Text Personalitzat', 'tempsMinuts', parseFloat(e.target.value) || 0)}
                                              className="w-16 p-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  // OPCIONS DESPLEGABLES / SELECCIÓ
                                  op.valors.map(valName => {
                                    const valConfig = currentValObj[valName] || { sobrecost: 0, tempsMinuts: 0 };

                                    return (
                                      <div key={valName} className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                          <div className="font-semibold text-slate-200">{valName}</div>
                                          <div className="text-[10px] text-slate-500">Opció: {op.titol}</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] text-slate-400">Sobrecost directe (€):</label>
                                            <input
                                              type="number"
                                              step="any"
                                              value={valConfig.sobrecost || 0}
                                              onChange={(e) => handleUpdateOptionSurcharge(op.titol, valName, 'sobrecost', parseFloat(e.target.value) || 0)}
                                              className="w-20 p-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right"
                                            />
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] text-slate-400">Minuts extra:</label>
                                            <input
                                              type="number"
                                              step="any"
                                              value={valConfig.tempsMinuts || 0}
                                              onChange={(e) => handleUpdateOptionSurcharge(op.titol, valName, 'tempsMinuts', parseFloat(e.target.value) || 0)}
                                              className="w-16 p-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono text-right"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= PESTANYA 3: RESUM I MARGES ================= */}
              {activeModalTab === 'resum' && (
                <div className="space-y-6">
                  {/* Paràmetres Econòmics Globals */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Percentatge de Mermes / Desperdici (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.mermePercent}
                        onChange={(e) => setFormData({ ...formData, mermePercent: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        placeholder="Ex: 8"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Marge Comercial Desitjat (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.margePercent}
                        onChange={(e) => setFormData({ ...formData, margePercent: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 font-mono"
                        placeholder="Ex: 65"
                      />
                    </div>
                  </div>

                  {/* Quadre Resum Econòmic */}
                  {(() => {
                    const previewCosts = calculateCosts(formData);
                    return (
                      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
                        <h4 className="font-bold text-amber-400 text-sm font-serif flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> Resultat del Càlcul Tècnic d'Escandall
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Cost Materials</span>
                            <span className="font-mono font-bold text-sm text-slate-200">{previewCosts.costMat.toFixed(2)} €</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Cost Mà d'Obra</span>
                            <span className="font-mono font-bold text-sm text-slate-200">{previewCosts.costOp.toFixed(2)} €</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Cost Maquinària</span>
                            <span className="font-mono font-bold text-sm text-slate-200">{previewCosts.costMaq.toFixed(2)} €</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Mermes (+{formData.mermePercent}%)</span>
                            <span className="font-mono font-bold text-sm text-slate-200">{previewCosts.mermeAmount.toFixed(2)} €</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Cost Total de Fabricació</span>
                            <span className="font-mono font-extrabold text-base text-slate-100">{previewCosts.totalCost.toFixed(2)} €</span>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300">
                            <span className="text-[10px] uppercase block font-semibold">PVP Recomanat (+{formData.margePercent}% marge)</span>
                            <span className="font-mono font-extrabold text-lg block">{previewCosts.pvpRecomanat.toFixed(2)} €</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block">Preu Actual a la Botiga Web</span>
                            <span className="font-mono font-bold text-base text-slate-200">
                              {formData.preuWebActual > 0 ? `${Number(formData.preuWebActual).toFixed(2)} €` : 'No vinculat'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes Internes */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Notes i Observacions Tècniques de Fabricació</label>
                    <textarea
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 outline-none resize-none"
                      placeholder="Observacions del procés de fabricació, consells de muntatge..."
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LIGHTBOX: VISUALITZACIÓ D'IMATGE AMPLIADA */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 transition-colors z-10 cursor-pointer shadow-lg"
              title="Tancar"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={zoomedImage}
              alt="Imatge ampliada"
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
