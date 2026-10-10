import React, { useState, useMemo, useCallback } from 'react';
import { 
  Printer, 
  ListChecks, 
  CheckSquare, 
  Square, 
  Package, 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  RotateCcw, 
  Download, 
  SlidersHorizontal, 
  Filter, 
  ShoppingBag, 
  Wrench, 
  Lightbulb, 
  CreditCard, 
  Store,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../../utils/numberUtils';

// Llista predefinida d'elements imprescindibles habituals de fira / mercat
const PRESETS_MATERIAL_FIRA = [
  // Parada & Mobiliari
  { concepte: 'Taula plegable de parada (180cm / 200cm)', quantitat: 1, ubicacio: 'Vehicle / Maleter', tipus: 'lliure', notes: 'Comprovar estabilitat' },
  { concepte: 'Cavallets de fusta / suports de taula', quantitat: 2, ubicacio: 'Vehicle / Maleter', tipus: 'lliure', notes: 'Si cal reforç' },
  { concepte: 'Cadires o tamborets plegables', quantitat: 2, ubicacio: 'Vehicle / Maleter', tipus: 'lliure', notes: 'Còmodes per a jornades llargues' },
  { concepte: 'Estovalles de fira corporatives (negres/fusta)', quantitat: 2, ubicacio: 'Bossa Parada', tipus: 'lliure', notes: 'Planxades i netes' },
  { concepte: 'Expositors de fusta per a peces i miniatures', quantitat: 3, ubicacio: 'Caixa Expositors', tipus: 'lliure', notes: 'Diferents alçades per a visibilitat' },

  // Cobraments & Gestió
  { concepte: 'Caixa o bossa de canvi (monedes i bitllets petits)', quantitat: 1, ubicacio: 'Bossa de mà / Personal', tipus: 'lliure', notes: 'Fons de caixa recomanat 100€' },
  { concepte: 'Datàfon TPV (SumUp / mòbil) + carregador', quantitat: 1, ubicacio: 'Bossa de mà / Personal', tipus: 'lliure', notes: 'Bateria carregada al 100%' },
  { concepte: 'Bateria externa (Powerbank) + cables USB', quantitat: 1, ubicacio: 'Bossa de mà / Personal', tipus: 'lliure', notes: 'Per no quedar-se sense mòbil' },

  // Imatge, Màrqueting & Clients
  { concepte: 'Targetes de visita NFC intel·ligents de fusta', quantitat: 1, ubicacio: 'Bossa Parada', tipus: 'lliure', notes: 'Per fer contactes i demostració' },
  { concepte: 'Marcadors de taulell NFC / QR per a ressenyes Google', quantitat: 2, ubicacio: 'Bossa Parada', tipus: 'lliure', notes: 'Posar al costat del TPV' },
  { concepte: 'Bosses kraft de regal per a compres de clients', quantitat: 50, ubicacio: 'Caixa Packaging', tipus: 'lliure', notes: 'Diverses mides' },
  { concepte: 'Cartell o lona amb el logotip de Mínim Món', quantitat: 1, ubicacio: 'Bossa Parada', tipus: 'lliure', notes: 'Penjar a la part davantera' },

  // Llum & Electricitat
  { concepte: 'Focus LED / Llums càlids per a la parada', quantitat: 2, ubicacio: 'Caixa Elèctrica', tipus: 'lliure', notes: 'Llum càlida per destacar la fusta' },
  { concepte: 'Allargador elèctric (15-25m) + regleta de preses', quantitat: 1, ubicacio: 'Caixa Elèctrica', tipus: 'lliure', notes: 'Amb presa de terra' },

  // Eines & Emergències
  { concepte: 'Kit d\'eines (tisores, cúter, cinta adhesiva, brides)', quantitat: 1, ubicacio: 'Maleta Eines', tipus: 'lliure', notes: 'Imprescindible per a qualsevol imprevist' },
  { concepte: 'Drap de microfibra i netejador de fusta', quantitat: 1, ubicacio: 'Maleta Eines', tipus: 'lliure', notes: 'Per netejar la pols de les peces' },
  { concepte: 'Llibreta de notes i bolígrafs', quantitat: 2, ubicacio: 'Bossa de mà / Personal', tipus: 'lliure', notes: 'Per apuntar encàrrecs personalitzats' }
];

export default function EsdevenimentChecklist({
  currentEvent,
  setEsdeveniments,
  productes = [],
  isDark = true,
  getProductImage = () => ''
}) {
  // Estat de filtres i vista
  const [filtreCaixa, setFiltreCaixa] = useState('totes');
  const [filtreEstat, setFiltreEstat] = useState('tots'); // 'tots' | 'pendents' | 'preparats'
  const [cercaText, setCercaText] = useState('');
  const [modeAgrupacio, setModeAgrupacio] = useState('caixes'); // 'caixes' | 'llista'
  
  // Modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState({});

  // Formulari d'afegir element de text lliure ràpid
  const [nouConcepte, setNouConcepte] = useState('');
  const [novaQuantitat, setNovaQuantitat] = useState(1);
  const [novaUbicacio, setNovaUbicacio] = useState('');
  const [novesNotes, setNovesNotes] = useState('');

  // Edició inline
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Selecció de producte des del catàleg
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [catalogQty, setCatalogQty] = useState(1);
  const [catalogUbicacio, setCatalogUbicacio] = useState('Caixa Productes');

  // Llista actual del checklist de l'esdeveniment
  const checklist = useMemo(() => {
    return Array.isArray(currentEvent?.checklist) ? currentEvent.checklist : [];
  }, [currentEvent]);

  // Actualitzar el checklist a l'estat i a Firestore
  const updateChecklist = useCallback((newList) => {
    if (!currentEvent || !setEsdeveniments) return;
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return { ...ev, checklist: newList };
      }
      return ev;
    }));
  }, [currentEvent, setEsdeveniments]);

  // Llistat únic de caixes / ubicacions existents
  const caixesDisponibles = useMemo(() => {
    const s = new Set();
    checklist.forEach(item => {
      const u = (item.ubicacio || '').trim();
      if (u) s.add(u);
    });
    return Array.from(s).sort();
  }, [checklist]);

  // Estadístiques del checklist
  const stats = useMemo(() => {
    const total = checklist.length;
    const preparats = checklist.filter(i => i.preparat).length;
    const pendents = total - preparats;
    const percent = total > 0 ? Math.round((preparats / total) * 100) : 0;

    const totalUnitats = checklist.reduce((acc, i) => acc + (Number(i.quantitat) || 1), 0);
    const unitatsPreparades = checklist.filter(i => i.preparat).reduce((acc, i) => acc + (Number(i.quantitat) || 1), 0);

    return { total, preparats, pendents, percent, totalUnitats, unitatsPreparades };
  }, [checklist]);

  // Toggle preparat
  const toggleItemPreparat = (itemId) => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, preparat: !item.preparat };
      }
      return item;
    });
    updateChecklist(updated);
  };

  // Afegir element lliure
  const handleAddCustomItem = (e) => {
    if (e) e.preventDefault();
    if (!nouConcepte.trim()) return;

    const newItem = {
      id: 'chk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      tipus: 'lliure',
      concepte: nouConcepte.trim(),
      quantitat: Math.max(1, parseInt(novaQuantitat) || 1),
      ubicacio: (novaUbicacio.trim() || 'Sense assignar'),
      notes: novesNotes.trim(),
      preparat: false
    };

    updateChecklist([...checklist, newItem]);

    // Netejar formulari
    setNouConcepte('');
    setNovaQuantitat(1);
    setNovesNotes('');
  };

  // Afegir producte des del catàleg
  const handleAddCatalogProduct = () => {
    if (!selectedCatalogProduct) return;

    const newItem = {
      id: 'chk_prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      tipus: 'producte',
      concepte: selectedCatalogProduct.nom || 'Producte',
      quantitat: Math.max(1, parseInt(catalogQty) || 1),
      ubicacio: catalogUbicacio.trim() || 'Caixa Productes',
      notes: selectedCatalogProduct.codi ? `Codi: ${selectedCatalogProduct.codi}` : '',
      preparat: false,
      productId: selectedCatalogProduct.id,
      codi: selectedCatalogProduct.codi || '',
      foto: selectedCatalogProduct.foto || ''
    };

    updateChecklist([...checklist, newItem]);
    setSelectedCatalogProduct(null);
    setShowAddProductModal(false);
    setCatalogQty(1);
  };

  // Importar directament des de la dotació d'estoc de la fira
  const handleImportFromDotacio = () => {
    const linies = Array.isArray(currentEvent?.linies) ? currentEvent.linies : [];
    if (linies.length === 0) {
      alert("Aquest esdeveniment encara no té cap producte assignat a la pestanya '1. Dotació d'Estoc'.");
      return;
    }

    let afegits = 0;
    const nous = [...checklist];

    linies.forEach(l => {
      // Comprovar si ja és a la llista
      const jaExisteix = nous.some(item => 
        item.productId === l.productId || 
        (item.codi && item.codi === l.codi) || 
        (item.concepte && item.concepte.toLowerCase() === (l.nom || '').toLowerCase())
      );

      if (!jaExisteix) {
        nous.push({
          id: 'chk_dot_' + (l.id || l.productId || Date.now()) + '_' + Math.random().toString(36).substr(2, 4),
          tipus: 'producte',
          concepte: l.nom || 'Producte artesanal',
          quantitat: Math.max(1, parseInt(l.unitatsInicials || l.unitatsPrevistes) || 1),
          ubicacio: 'Caixa Productes',
          notes: l.codi ? `Ref: ${l.codi}` : '',
          preparat: false,
          productId: l.productId || l.id,
          codi: l.codi || '',
          foto: l.foto || ''
        });
        afegits++;
      }
    });

    if (afegits === 0) {
      alert("Tots els productes de la dotació ja estaven inclosos al checklist.");
    } else {
      updateChecklist(nous);
      alert(`S'han incorporat ${afegits} productes de la dotació al checklist de caixes.`);
    }
  };

  // Afegir presets seleccionats
  const handleApplyPresets = () => {
    const selectedIndices = Object.keys(selectedPresets).filter(k => selectedPresets[k]);
    if (selectedIndices.length === 0) return;

    const nous = [...checklist];
    let afegits = 0;

    selectedIndices.forEach(idx => {
      const p = PRESETS_MATERIAL_FIRA[parseInt(idx)];
      if (p) {
        // Evitar afegir duplicats exactes
        const jaExisteix = nous.some(item => item.concepte.toLowerCase() === p.concepte.toLowerCase());
        if (!jaExisteix) {
          nous.push({
            id: 'chk_pre_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            tipus: p.tipus || 'lliure',
            concepte: p.concepte,
            quantitat: p.quantitat,
            ubicacio: p.ubicacio,
            notes: p.notes || '',
            preparat: false
          });
          afegits++;
        }
      }
    });

    updateChecklist(nous);
    setShowPresetsModal(false);
    setSelectedPresets({});
  };

  // Eliminar un element
  const handleDeleteItem = (itemId) => {
    if (confirm("Segur que vols eliminar aquest element del checklist?")) {
      updateChecklist(checklist.filter(i => i.id !== itemId));
    }
  };

  // Guardar edició inline
  const handleSaveEdit = (itemId) => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          concepte: editFormData.concepte?.trim() || item.concepte,
          quantitat: Math.max(1, parseInt(editFormData.quantitat) || 1),
          ubicacio: editFormData.ubicacio?.trim() || item.ubicacio,
          notes: editFormData.notes !== undefined ? editFormData.notes.trim() : item.notes
        };
      }
      return item;
    });
    updateChecklist(updated);
    setEditingItemId(null);
  };

  // Marcar tots o desmarcar tots
  const handleSetAllChecked = (status) => {
    const updated = checklist.map(i => ({ ...i, preparat: status }));
    updateChecklist(updated);
  };

  // Elements filtrats per cerca, caixa i estat
  const filteredItems = useMemo(() => {
    return checklist.filter(item => {
      // Filtre per text
      if (cercaText.trim()) {
        const query = cercaText.toLowerCase();
        const matchConcepte = (item.concepte || '').toLowerCase().includes(query);
        const matchUbicacio = (item.ubicacio || '').toLowerCase().includes(query);
        const matchNotes = (item.notes || '').toLowerCase().includes(query);
        if (!matchConcepte && !matchUbicacio && !matchNotes) return false;
      }

      // Filtre per Caixa
      if (filtreCaixa !== 'totes') {
        const u = (item.ubicacio || '').trim() || 'Sense assignar';
        if (u !== filtreCaixa) return false;
      }

      // Filtre per Estat
      if (filtreEstat === 'pendents' && item.preparat) return false;
      if (filtreEstat === 'preparats' && !item.preparat) return false;

      return true;
    });
  }, [checklist, cercaText, filtreCaixa, filtreEstat]);

  // Agrupació per Caixes
  const itemsGroupedByCaixa = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const u = (item.ubicacio || '').trim() || 'Sense assignar';
      if (!groups[u]) groups[u] = [];
      groups[u].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div className="space-y-6">

      {/* ===================================================================
          BARRA DE CONTROL PRINCIPAL I RESUM DE CÀRREGA
          =================================================================== */}
      <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <ListChecks className="w-5 h-5" />
              </span>
              <h3 className={`text-lg font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Checklist de Càrrega i Caixes per a l'Esdeveniment
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Controla tot el material, mobiliari, eines i peces d'artesania que t'has d'endur. Assigna cada element a una caixa o bossa i marca'l a mida que ho preparis al taller.
            </p>
          </div>

          {/* Botons d'Acció Superior */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs bg-amber-600 hover:bg-amber-500 text-white"
              title="Obrir vista optimitzada per a impressió en paper o PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Llista</span>
            </button>

            <button
              type="button"
              onClick={handleImportFromDotacio}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Carregar automàticament els productes assignats a la dotació d'aquesta fira"
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>Importar de Dotació ({currentEvent.linies?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                // Seleccionar tots els presets per defecte
                const all = {};
                PRESETS_MATERIAL_FIRA.forEach((_, idx) => { all[idx] = true; });
                setSelectedPresets(all);
                setShowPresetsModal(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Carregar llista de material habitual de mercat (taula, llums, canvi, datàfon, targetes NFC...)"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Imprescindibles de Fira</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              <span>+ Producte de Catàleg</span>
            </button>
          </div>
        </div>

        {/* Barra de Progrés Visual de Càrrega */}
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Boxes className="w-4 h-4 text-amber-500" />
              <span>Estat de Càrrega: {stats.preparats} de {stats.total} elements llestos ({stats.unitatsPreparades} de {stats.totalUnitats} unitats)</span>
            </span>
            <span className={`font-black text-sm ${stats.percent === 100 ? 'text-emerald-400' : 'text-amber-500'}`}>
              {stats.percent}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700/50">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                stats.percent === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-amber-600 to-amber-400'
              }`}
              style={{ width: `${stats.percent}%` }}
            />
          </div>

          {stats.percent === 100 && stats.total > 0 && (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tot el material i caixes estan llestos per sortir cap a l'esdeveniment! Bon viatge i bones vendes!</span>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================
          FORMULARI RÀPID D'AFEGIR TEXT LLIURE / MATERIAL
          =================================================================== */}
      <div className={`p-4 rounded-2xl border shadow-xs ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h4 className={`text-xs font-mono uppercase font-bold tracking-wider mb-3 flex items-center gap-2 ${
          isDark ? 'text-amber-400' : 'text-amber-800'
        }`}>
          <PlusCircle className="w-4 h-4" />
          <span>Apuntar nou material o caixa (Text Lliure)</span>
        </h4>

        <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className={`text-[10px] font-mono uppercase block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Material / Concepte *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Taula plegable, Focus LED, Canvi de caixa, Targetes NFC..."
              value={nouConcepte}
              onChange={(e) => setNouConcepte(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 outline-none border transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
              }`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={`text-[10px] font-mono uppercase block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Unitats
            </label>
            <input
              type="number"
              min="1"
              value={novaQuantitat}
              onChange={(e) => setNovaQuantitat(e.target.value)}
              className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none border transition-all text-center ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
              }`}
            />
          </div>

          <div className="sm:col-span-3">
            <label className={`text-[10px] font-mono uppercase block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Caixa / Bossa / Ubicació
            </label>
            <div className="relative">
              <input
                type="text"
                list="llista-caixes-suggerides"
                placeholder="Ex: Caixa 1, Bossa Eines..."
                value={novaUbicacio}
                onChange={(e) => setNovaUbicacio(e.target.value)}
                className={`w-full text-xs rounded-xl px-3 py-2.5 outline-none border transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
                }`}
              />
              <datalist id="llista-caixes-suggerides">
                {caixesDisponibles.map(c => <option key={c} value={c} />)}
                <option value="Caixa 1" />
                <option value="Caixa 2" />
                <option value="Caixa Productes" />
                <option value="Bossa Parada" />
                <option value="Maleta Eines" />
                <option value="Vehicle / Maleter" />
              </datalist>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Afegir</span>
            </button>
          </div>
        </form>
      </div>

      {/* ===================================================================
          BARRA DE FILTRES I VISUALITZACIÓ
          =================================================================== */}
      <div className={`p-3 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cercador */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cercar material o caixa..."
              value={cercaText}
              onChange={(e) => setCercaText(e.target.value)}
              className={`pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none w-44 sm:w-56 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            {cercaText && (
              <button 
                onClick={() => setCercaText('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtre per Caixa */}
          <select
            value={filtreCaixa}
            onChange={(e) => setFiltreCaixa(e.target.value)}
            className={`text-xs py-1.5 px-3 rounded-xl border outline-none font-medium cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="totes">Totes les caixes / bosses ({checklist.length})</option>
            {caixesDisponibles.map(c => {
              const count = checklist.filter(i => (i.ubicacio || '').trim() === c).length;
              return (
                <option key={c} value={c}>📦 {c} ({count})</option>
              );
            })}
          </select>

          {/* Filtre per Estat */}
          <div className="flex items-center rounded-xl p-0.5 border border-slate-700/50 bg-slate-950">
            <button
              onClick={() => setFiltreEstat('tots')}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                filtreEstat === 'tots' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tots
            </button>
            <button
              onClick={() => setFiltreEstat('pendents')}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                filtreEstat === 'pendents' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pendents ({stats.pendents})
            </button>
            <button
              onClick={() => setFiltreEstat('preparats')}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
                filtreEstat === 'preparats' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Llestos ({stats.preparats})
            </button>
          </div>
        </div>

        {/* Mode de Vista i Accions Massives */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Commutador de Vista: Agrupat per Caixes vs Llista Plana */}
          <div className="flex items-center rounded-xl p-0.5 border border-slate-700/50 bg-slate-950">
            <button
              onClick={() => setModeAgrupacio('caixes')}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                modeAgrupacio === 'caixes' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Veure organitzat per Caixes i Bosses"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Per Caixes</span>
            </button>
            <button
              onClick={() => setModeAgrupacio('llista')}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                modeAgrupacio === 'llista' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Veure com a llista contínua"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Llista Plana</span>
            </button>
          </div>

          {/* Botons massius */}
          <button
            onClick={() => handleSetAllChecked(true)}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Marcar tots com a preparats"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => handleSetAllChecked(false)}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Desmarcar tots (reiniciar)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* ===================================================================
          LLISTAT DEL CHECKLIST (MODES D'AGRUPACIÓ)
          =================================================================== */}
      {checklist.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border border-dashed ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-slate-50'
        }`}>
          <Package className="w-12 h-12 mx-auto text-amber-500/50 mb-3" />
          <h4 className={`text-base font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Encara no has afegit cap element al checklist d'aquest esdeveniment
          </h4>
          <p className={`text-xs max-w-md mx-auto mt-1 mb-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Pots importar els productes assignats a la dotació, carregar la plantilla d'imprescindibles de mercat o apuntar elements lliures directament.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={handleImportFromDotacio}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Importar Productes de la Dotació</span>
            </button>
            <button
              onClick={() => {
                const all = {};
                PRESETS_MATERIAL_FIRA.forEach((_, idx) => { all[idx] = true; });
                setSelectedPresets(all);
                setShowPresetsModal(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isDark ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Carregar Imprescindibles de Fira</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl border ${
          isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <Search className="w-8 h-8 mx-auto text-slate-500 mb-2" />
          <p className="text-xs">No hi ha elements que coincideixin amb els filtres seleccionats.</p>
          <button 
            onClick={() => { setCercaText(''); setFiltreCaixa('totes'); setFiltreEstat('tots'); }}
            className="mt-2 text-xs text-amber-500 underline font-bold cursor-pointer"
          >
            Netejar tots els filtres
          </button>
        </div>
      ) : modeAgrupacio === 'caixes' ? (
        // ==========================================
        // VISTA 1: AGRUPAT PER CAIXES / BOSSES
        // ==========================================
        <div className="space-y-4">
          {Object.entries(itemsGroupedByCaixa).map(([caixaNom, items]) => {
            const caixaTotal = items.length;
            const caixaPreparats = items.filter(i => i.preparat).length;
            const caixaPercent = caixaTotal > 0 ? Math.round((caixaPreparats / caixaTotal) * 100) : 0;
            const esComplet = caixaPreparats === caixaTotal;

            return (
              <div 
                key={caixaNom}
                className={`rounded-2xl border overflow-hidden transition-all shadow-xs ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Capçalera de la Caixa / Bossa */}
                <div className={`p-3.5 px-4 flex items-center justify-between border-b ${
                  esComplet
                    ? (isDark ? 'bg-emerald-950/40 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200')
                    : (isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-xl text-white ${
                      esComplet ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}>
                      <Package className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        <span>{caixaNom}</span>
                        {esComplet && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                            COMPLETADA
                          </span>
                        )}
                      </h4>
                      <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {caixaPreparats} de {caixaTotal} elements preparats ({caixaPercent}%)
                      </p>
                    </div>
                  </div>

                  {/* Acció ràpida per a tota la caixa */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetState = !esComplet;
                        const updated = checklist.map(item => {
                          const u = (item.ubicacio || '').trim() || 'Sense assignar';
                          if (u === caixaNom) {
                            return { ...item, preparat: targetState };
                          }
                          return item;
                        });
                        updateChecklist(updated);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                        esComplet
                          ? (isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')
                          : (isDark ? 'border-emerald-700/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900' : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200')
                      }`}
                    >
                      {esComplet ? 'Desmarcar caixa' : 'Completar caixa'}
                    </button>
                  </div>
                </div>

                {/* Llistat d'elements d'aquesta caixa */}
                <div className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {items.map(item => renderChecklistRow(item))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ==========================================
        // VISTA 2: LLISTA PLANA
        // ==========================================
        <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
          isDark ? 'bg-slate-900/90 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
        }`}>
          {filteredItems.map(item => renderChecklistRow(item))}
        </div>
      )}

      {/* ===================================================================
          MODAL D'IMPRESSIÓ (PRINTABLE VIEW PROFESSIONAL)
          =================================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            
            {/* Barra superior (Amagada a la impressió) */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Previsualització d'Impressió del Checklist</h4>
                  <p className="text-[11px] text-slate-500">Format A4 optimitzat per a paper o arxiu PDF de control de càrrega</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir ara (Ctrl+P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FULL IMPRIMIBLE (Format net en fons blanc per a impressió perfecta) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-slate-900 print:p-0 print:overflow-visible">
              
              {/* Capçalera del Document */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block mb-1">
                    MÍNIM MÓN • ARTESANIA EN FUSTA & MINIATURES
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900">
                    Checklist de Càrrega i Material
                  </h2>
                  <h3 className="text-sm font-semibold text-amber-800 mt-1">
                    {currentEvent.nom} ({currentEvent.edicioAny || new Date().getFullYear()})
                  </h3>
                </div>

                <div className="text-right text-xs font-mono space-y-1">
                  <div><strong>Lloc:</strong> {currentEvent.lloc || 'No especificat'}</div>
                  <div><strong>Dates:</strong> {currentEvent.dataInici} {currentEvent.dataFi && currentEvent.dataFi !== currentEvent.dataInici ? `fins ${currentEvent.dataFi}` : ''}</div>
                  <div><strong>Fons Caixa:</strong> {formatCurrency(currentEvent.fonsCaixaInicial || 0)}</div>
                </div>
              </div>

              {/* Resum ràpid de caixes */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Total Elements</span>
                  <span className="text-base font-bold text-slate-900">{stats.total}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Unitats Físiques</span>
                  <span className="text-base font-bold text-slate-900">{stats.totalUnitats}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Caixes / Bosses</span>
                  <span className="text-base font-bold text-slate-900">{caixesDisponibles.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Estat Digital</span>
                  <span className="text-base font-bold text-emerald-700">{stats.preparats}/{stats.total} ({stats.percent}%)</span>
                </div>
              </div>

              {/* Taula Imprimible d'Elements */}
              <div className="space-y-4">
                {Object.entries(itemsGroupedByCaixa).map(([caixaNom, items]) => (
                  <div key={caixaNom} className="space-y-1.5 break-inside-avoid">
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs">
                      <span>📦 {caixaNom}</span>
                      <span className="font-mono text-[11px] text-slate-600">{items.length} elements</span>
                    </div>

                    <table className="w-full text-left text-xs border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 font-mono text-[10px] uppercase text-slate-600">
                          <th className="py-1.5 px-2.5 w-12 text-center">[ ] Fet</th>
                          <th className="py-1.5 px-3">Element / Concepte</th>
                          <th className="py-1.5 px-2 w-16 text-center">Quantitat</th>
                          <th className="py-1.5 px-3">Observacions / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 text-center">
                              <span className="inline-block w-4 h-4 border-2 border-slate-800 rounded-xs font-mono font-bold leading-none text-center">
                                {item.preparat ? '✓' : ''}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold">{item.concepte}</span>
                              {item.codi && <span className="ml-2 font-mono text-[10px] text-slate-500">({item.codi})</span>}
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-bold">
                              {item.quantitat}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px] italic">
                              {item.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Peu de Pàgina Imprimible amb Espai de Signatura */}
              <div className="border-t-2 border-slate-300 pt-6 mt-8 flex justify-between items-end text-xs font-mono text-slate-600 break-inside-avoid">
                <div>
                  <p>Document imprès el {new Date().toLocaleDateString('ca-ES')} a les {new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Mínim Món • Taller d'Artesania i Espais en Miniatura</p>
                </div>
                <div className="w-64 border-t border-slate-400 pt-1 text-center text-[11px]">
                  Signatura / Verificació de càrrega
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL D'IMPRESCINDIBLES DE FIRA (PRESETS)
          =================================================================== */}
      {showPresetsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          } max-w-xl w-full rounded-2xl border p-6 space-y-4 shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col`}>
            
            <div className="flex items-center justify-between border-b pb-3 shrink-0 border-slate-700/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-serif font-bold text-base">Material Imprescindible de Mercat</h3>
                  <p className="text-[11px] text-slate-400">Selecciona els elements típics que vols afegir al teu checklist</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPresetsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {PRESETS_MATERIAL_FIRA.map((p, idx) => {
                const isSelected = !!selectedPresets[idx];
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? (isDark ? 'bg-amber-950/40 border-amber-600/60' : 'bg-amber-50 border-amber-300')
                        : (isDark ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        setSelectedPresets(prev => ({ ...prev, [idx]: e.target.checked }));
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{p.concepte}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {p.quantitat} u. • {p.ubicacio}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic">{p.notes}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const all = {};
                  PRESETS_MATERIAL_FIRA.forEach((_, idx) => { all[idx] = true; });
                  setSelectedPresets(all);
                }}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                Seleccionar tots
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(false)}
                  className="px-3.5 py-2 text-xs rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  onClick={handleApplyPresets}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Afegir seleccionats</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL PER SELECCIONAR PRODUCTE DEL CATÀLEG
          =================================================================== */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          } max-w-xl w-full rounded-2xl border p-6 space-y-4 shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col`}>
            
            <div className="flex items-center justify-between border-b pb-3 shrink-0 border-slate-700/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-serif font-bold text-base">Afegir Producte de Catàleg al Checklist</h3>
                  <p className="text-[11px] text-slate-400">Selecciona qualsevol peça per afegir-la a una caixa o bossa</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cercador de productes */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cercar per nom o codi..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Llistat de productes filtrats */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
              {productes
                .filter(p => {
                  if (!catalogSearch.trim()) return true;
                  const q = catalogSearch.toLowerCase();
                  return (p.nom || '').toLowerCase().includes(q) || (p.codi || '').toLowerCase().includes(q);
                })
                .slice(0, 30)
                .map(prod => {
                  const isSel = selectedCatalogProduct?.id === prod.id;
                  const img = getProductImage(prod);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedCatalogProduct(prod)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isSel
                          ? (isDark ? 'bg-emerald-950/50 border-emerald-500' : 'bg-emerald-50 border-emerald-600')
                          : (isDark ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {img ? (
                          <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 text-xs">
                          <h5 className="font-bold truncate">{prod.nom}</h5>
                          <span className="font-mono text-[10px] text-slate-400">Ref: {prod.codi || '-'}</span>
                        </div>
                      </div>

                      {isSel && (
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Quantitat i Caixa */}
            {selectedCatalogProduct && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 grid grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1 text-slate-300">
                    Unitats a portar
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={catalogQty}
                    onChange={(e) => setCatalogQty(e.target.value)}
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1 text-slate-300">
                    Caixa / Bossa on va
                  </label>
                  <input
                    type="text"
                    list="llista-caixes-suggerides"
                    value={catalogUbicacio}
                    onChange={(e) => setCatalogUbicacio(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-3.5 py-2 text-xs rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                disabled={!selectedCatalogProduct}
                onClick={handleAddCatalogProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Afegir al Checklist</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  // Renderitzador d'una fila d'element del checklist
  function renderChecklistRow(item) {
    const isEditing = editingItemId === item.id;
    const img = item.foto ? getProductImage(item) : '';

    if (isEditing) {
      return (
        <div 
          key={item.id} 
          className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
            isDark ? 'bg-amber-950/30' : 'bg-amber-50'
          }`}
        >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
            <input
              type="text"
              value={editFormData.concepte}
              onChange={(e) => setEditFormData({ ...editFormData, concepte: e.target.value })}
              className={`sm:col-span-5 text-xs px-2.5 py-1.5 rounded-lg border outline-none font-bold ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
            <input
              type="number"
              min="1"
              value={editFormData.quantitat}
              onChange={(e) => setEditFormData({ ...editFormData, quantitat: e.target.value })}
              className={`sm:col-span-2 text-xs px-2.5 py-1.5 rounded-lg border outline-none font-mono font-bold text-center ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
            <input
              type="text"
              list="llista-caixes-suggerides"
              value={editFormData.ubicacio}
              onChange={(e) => setEditFormData({ ...editFormData, ubicacio: e.target.value })}
              placeholder="Caixa..."
              className={`sm:col-span-3 text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
            <input
              type="text"
              value={editFormData.notes || ''}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              placeholder="Notes..."
              className={`sm:col-span-2 text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => handleSaveEdit(item.id)}
              className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              title="Guardar canvis"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingItemId(null)}
              className="p-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
              title="Cancel·lar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors group ${
          item.preparat
            ? (isDark ? 'bg-emerald-950/20 text-slate-400' : 'bg-emerald-50/50 text-slate-500')
            : (isDark ? 'hover:bg-slate-800/40' : 'hover:bg-amber-50/40')
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Casella de Verificació Gran */}
          <button
            type="button"
            onClick={() => toggleItemPreparat(item.id)}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
              item.preparat
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                : (isDark ? 'border-slate-600 hover:border-amber-400 bg-slate-950/60' : 'border-slate-400 hover:border-amber-600 bg-white')
            }`}
            title={item.preparat ? "Marcar com a pendent" : "Marcar com a preparat / desat a la caixa"}
          >
            {item.preparat && <Check className="w-4 h-4 stroke-[3]" />}
          </button>

          {/* Miniatura si és producte amb foto */}
          {img && (
            <img 
              src={img} 
              alt="" 
              className={`w-8 h-8 rounded-lg object-cover shrink-0 border ${
                item.preparat ? 'opacity-50 grayscale' : 'border-slate-700'
              }`} 
            />
          )}

          {/* Detalls de l'element */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${
                item.preparat
                  ? (isDark ? 'line-through text-slate-400 font-normal' : 'line-through text-slate-500')
                  : (isDark ? 'text-white' : 'text-slate-900')
              }`}>
                {item.concepte}
              </span>

              {item.tipus === 'producte' ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Producte
                </span>
              ) : null}

              {item.codi && (
                <span className="text-[10px] font-mono text-slate-500">
                  Ref: {item.codi}
                </span>
              )}
            </div>

            {/* Notes opcionals */}
            {item.notes && (
              <p className={`text-[11px] italic mt-0.5 truncate ${
                isDark ? 'text-slate-500' : 'text-slate-600'
              }`}>
                {item.notes}
              </p>
            )}
          </div>
        </div>

        {/* Quantitat, Caixa i Botons d'Edició */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Caixa / Bossa on es guarda */}
          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border hidden sm:inline-flex items-center gap-1 ${
            item.preparat
              ? (isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500')
              : (isDark ? 'bg-slate-950 border-slate-700 text-amber-300' : 'bg-slate-100 border-slate-300 text-amber-800 font-bold')
          }`}>
            <Package className="w-3 h-3" />
            <span>{item.ubicacio || 'Sense assignar'}</span>
          </span>

          {/* Quantitat */}
          <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
            item.preparat
              ? 'bg-slate-800 text-slate-400'
              : (isDark ? 'bg-amber-950 text-amber-300 border border-amber-700/40' : 'bg-amber-100 text-amber-900')
          }`}>
            {item.quantitat} u.
          </span>

          {/* Botons d'acció */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                setEditingItemId(item.id);
                setEditFormData({
                  concepte: item.concepte,
                  quantitat: item.quantitat,
                  ubicacio: item.ubicacio || '',
                  notes: item.notes || ''
                });
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Editar element"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="Eliminar de la llista"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
