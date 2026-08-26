import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { STITCH_GIFTS } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { resolveMediaUrl, resolveProducteMediaUrl } from '../utils/mediaUtils';
import { renderFormattedText } from '../utils/textUtils';
import { formatDecimal, formatCurrency, parseDecimal } from '../utils/numberUtils';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag, Plus, Minus, Check, Clock, ArrowLeft, ArrowRight, Sparkles, Upload, FileText, Trash2, Paperclip, Share2, Info, X, ChevronDown, Search, Star, Tag, Layers } from 'lucide-react';
import { DEFAULT_FAMILIES, getEffectiveProductOrder, sortProductsWithGammaOrder, getProductEscandallData, getAvailableMidesForProduct } from './PrivateAreaSection';
import { copyDirectLink } from '../utils/shareUtils';
import ProductSimulator from './ProductSimulator';
import PuzzleSimulator from './PuzzleSimulator';
import EtiquetaSimulator from './EtiquetaSimulator';
import CommentsSection from './CommentsSection';

const MOTIVATIONAL_PILLS = [
  {
    doubtImg: 'images/noia_dubtes_01.jpg',
    happyImg: 'images/noia_contenta.jpg',
    title: "No trobes exactament el que busques?",
    subtitle: "Si no ho has vist al catàleg, ho podem dissenyar i fabricar exclusivament per a tu."
  },
  {
    doubtImg: 'images/noi_dubtes_01.jpg',
    happyImg: 'images/noi_content.jpg',
    title: "Tens una idea al cap que no està a la llista?",
    subtitle: "Fem realitat peces a mida: des d'un gravat personalitzat fins a una creació des de zero."
  },
  {
    doubtImg: 'images/noia_dubtes_02.jpg',
    happyImg: 'images/noia_contenta.jpg',
    title: "Vols un detall 100% únic i personalitzat?",
    subtitle: "Explica'ns el teu projecte i li donarem forma artesanalment al nostre taller."
  },
  {
    doubtImg: 'images/noi_dubtes_02.jpg',
    happyImg: 'images/noi_content.jpg',
    title: "Cerques una mida o disseny diferent?",
    subtitle: "Adaptem qualsevol model o dissenyem una peça completament nova per a tu."
  }
];

// Helper per calcular els sobrecostos de personalització dinàmics en temps real (sense interpretacions ocultes de codi)
export function computeOptionSurcharges(product, selectedOptions = {}) {
  if (!product) return 0;
  let totalSurcharge = 0;

  const opcions = Array.isArray(product.opcionsPersonalitzacio) ? product.opcionsPersonalitzacio : [];

  opcions.forEach((opc) => {
    if (!opc || typeof opc !== 'object') return;
    const opKey = opc.titol || opc.nom || '';
    const selectedVal = selectedOptions[opKey];
    if (selectedVal === undefined || selectedVal === null) return;

    if (opc.tipus === 'desplegable') {
      const valStr = String(selectedVal).trim();
      if (valStr) {
        const preusValors = opc.preusValors || {};
        let valPrice = preusValors[valStr];
        if (valPrice === undefined) {
          const matched = Object.entries(preusValors).find(([k]) => k.trim().toLowerCase() === valStr.toLowerCase());
          if (matched) valPrice = matched[1];
        }
        if (valPrice !== undefined && !isNaN(Number(valPrice))) {
          totalSurcharge += Number(valPrice);
        }
      }
    } else if (opc.tipus === 'fitxer' || opc.tipus === 'imatge') {
      // S'aplica sobrecost si s'ha adjuntat un fitxer o imatge
      const hasFile = (typeof selectedVal === 'object' && (selectedVal.fileName || selectedVal.dataUrl)) || 
                      (typeof selectedVal === 'string' && selectedVal.trim().length > 0);
      if (hasFile && opc.preu && !isNaN(Number(opc.preu))) {
        totalSurcharge += Number(opc.preu);
      }
    } else {
      // Per a text, memo, etc.: S'aplica sobrecost si l'usuari ha escrit contingut
      const hasText = (typeof selectedVal === 'string' && selectedVal.trim().length > 0) || 
                      (typeof selectedVal === 'number' && selectedVal > 0);
      if (hasText && opc.preu && !isNaN(Number(opc.preu))) {
        totalSurcharge += Number(opc.preu);
      }
    }
  });

  // Sobrecost per forats afegits a l'etiqueta (segons preuPerForat configurable a l'àrea privada)
  const preuForat = Number(product.preuPerForat || 0);
  if (preuForat > 0) {
    const rawHoles = selectedOptions['Forats seleccionats'];
    const numHoles = Array.isArray(rawHoles) ? rawHoles.length : (typeof rawHoles === 'string' && rawHoles.trim() ? rawHoles.split(',').map(s => s.trim()).filter(Boolean).length : 0);
    if (numHoles > 0) {
      totalSurcharge += numHoles * preuForat;
    }
  }

  return totalSurcharge;
}

export default function RegalsCatalogSection({ 
  setActiveTab, 
  catalogResetKey,
  catalogSearchQuery = '',
  setCatalogSearchQuery = () => {}
}) {
  const { addToCart } = useBudget();
  const [dbProducts, setDbProducts] = useState([]);
  const [dbGammes, setDbGammes] = useState([]);
  const [dbFamilies, setDbFamilies] = useState([]);
  const [dbEscandalls, setDbEscandalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegació de dues pàgines: 'catalog' (Vista principal de blocs de famílies) | 'products' (Vista detallada de productes)
  const [currentView, setCurrentView] = useState('catalog');
  const [selectedFamilia, setSelectedFamilia] = useState('Tots');
  const [selectedGamma, setSelectedGamma] = useState('Tots');

  // Commutar automàticament a la vista de productes en escriure una cerca al Header i desplaçar a l'inici
  useEffect(() => {
    if (catalogSearchQuery && catalogSearchQuery.trim()) {
      setCurrentView('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [catalogSearchQuery]);

  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [activeModalProduct, setActiveModalProduct] = useState(null);

  // Bloquejar l'scroll de fons quan el modal o la imatge estiguin oberts
  useEffect(() => {
    if (activeModalProduct || selectedModalImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModalProduct, selectedModalImage]);

  // Estat per a la Píndola Motivadora Dinàmica amb cadència de 5.5 segons
  const [pillIndex, setPillIndex] = useState(0);
  const [isPillFading, setIsPillFading] = useState(false);
  const [isPillHovered, setIsPillHovered] = useState(false);

  useEffect(() => {
    if (isPillHovered) return;
    const interval = setInterval(() => {
      setIsPillFading(true);
      setTimeout(() => {
        setPillIndex((prev) => (prev + 1) % MOTIVATIONAL_PILLS.length);
        setIsPillFading(false);
      }, 400);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPillHovered]);

  const currentPill = MOTIVATIONAL_PILLS[pillIndex];

  // Quan es clica el botó "CATÀLEG DE REGALS" a la navbar, es recarrega la portada principal del catàleg
  useEffect(() => {
    if (catalogResetKey > 0) {
      setCurrentView('catalog');
      setSelectedFamilia('Tots');
      setSelectedGamma('Tots');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [catalogResetKey]);

  // Control de deep linking per a productes directes (?producte=... / #producte-...)
  useEffect(() => {
    const checkProducteDeepLink = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const productId = urlParams.get('producte') || (hash.startsWith('#producte-') ? hash.replace('#producte-', '') : null);

      if (productId) {
        setCurrentView('products');
        setSelectedFamilia('Tots');
        setSelectedGamma('Tots');

        // Quan els productes estiguin al DOM, fer scroll automàtic i ressaltar
        setTimeout(() => {
          const el = document.getElementById(`producte-${productId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-primary/60', 'transition-all', 'duration-500');
            setTimeout(() => el.classList.remove('ring-4', 'ring-primary/60'), 4000);
          }
        }, 400);
      }
    };

    checkProducteDeepLink();
    window.addEventListener('popstate', checkProducteDeepLink);
    return () => window.removeEventListener('popstate', checkProducteDeepLink);
  }, [dbProducts.length]);

  useEffect(() => {
    const qProd = query(collection(db, "productes"), orderBy("dataCreacio", "desc"));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      if (!snapshot.empty) {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbProducts(prods);
      } else {
        setDbProducts(STITCH_GIFTS.map((g, idx) => ({
          id: g.id || `gift-${idx}`,
          codi: `PRDT-000${idx + 1}`,
          nom: g.title,
          descripcio: g.subtitle,
          imatgePrincipal: g.image,
          imatges: [g.image],
          gammaIds: g.items || [g.title],
          terminiFabricacio: '3 - 5 dies feiners',
          opcionsPersonalitzacio: [
            { tipus: 'desplegable', titol: 'Material de Fusta', valors: 'Fusta de Noguer, Roure natural, Bedoll' },
            { tipus: 'text', titol: 'Text o Nom a gravar', valors: 'Escriu el nom o frase curta...' }
          ]
        })));
      }
      setLoading(false);
    }, () => setLoading(false));

    const qGam = query(collection(db, "gammes"), orderBy("ordre", "asc"));
    const unsubGam = onSnapshot(qGam, (snapshot) => {
      if (!snapshot.empty) {
        setDbGammes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(g => g.actiu !== false));
      }
    });

    const qFam = query(collection(db, "families"), orderBy("ordre", "asc"));
    const unsubFam = onSnapshot(qFam, (snapshot) => {
      if (!snapshot.empty) {
        setDbFamilies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    const qEsc = query(collection(db, "producc_escandalls"));
    const unsubEsc = onSnapshot(qEsc, (snapshot) => {
      if (!snapshot.empty) {
        setDbEscandalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }, () => {});

    return () => {
      unsubProd();
      unsubGam();
      unsubFam();
      unsubEsc();
    };
  }, []);

  // Llista de Famílies activa i dinàmica de Firestore (ordenada per ordre)
  const activeFamilies = dbFamilies && dbFamilies.length > 0
    ? [...dbFamilies].sort((a, b) => (a.ordre || 1) - (b.ordre || 1))
    : DEFAULT_FAMILIES;

  const handleSelectFamilia = (famName) => {
    setSelectedFamilia(famName);
    setSelectedGamma('Tots');
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGamma = (famName, gamName) => {
    setSelectedFamilia(famName);
    setSelectedGamma(gamName);
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrar i ordenar productes per la jerarquia Família / Gamma / Ordre o per la Cerca Activa
  const rawFilteredProducts = dbProducts.filter(p => {
    if (!p) return false;
    if (p.actiu === false) return false;

    // Si el producte pertany a gammes i cap d'elles és activa al web, s'oculta temporalment
    if (Array.isArray(p.gammaIds) && p.gammaIds.length > 0 && dbGammes.length > 0) {
      const hasAnyActiveGamma = p.gammaIds.some(gName => 
        dbGammes.some(g => (g.nom || '').toLowerCase() === gName.toLowerCase())
      );
      if (!hasAnyActiveGamma) return false;
    }

    // 1. Filtrar per Cerca Activa des del Header (si hi ha text d'usuari)
    if (catalogSearchQuery && catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.trim().toLowerCase();
      const matchNom = String(p.nom || '').toLowerCase().includes(q);
      const matchDesc = String(p.descripcio || '').toLowerCase().includes(q);
      const matchConcepte = String(p.concepte || '').toLowerCase().includes(q);
      const matchMaterials = String(p.materials || '').toLowerCase().includes(q);
      const matchOpcions = (p.opcionsPersonalitzacio || []).some(o => 
        String(o?.titol || '').toLowerCase().includes(q) || 
        String(o?.valors || '').toLowerCase().includes(q)
      );

      return matchNom || matchDesc || matchConcepte || matchMaterials || matchOpcions;
    }

    // 2. Filtrar per Filtre de Família / Gamma
    if (selectedFamilia === 'Novetats') {
      return p.novetat === true;
    }
    if (selectedFamilia === 'Tots' && selectedGamma === 'Tots') return true;

    const selGamLower = String(selectedGamma || '').toLowerCase();
    const selFamLower = String(selectedFamilia || '').toLowerCase();

    if (selectedGamma !== 'Tots') {
      const matchGam = (p.gammaIds || []).some(g => String(g || '').toLowerCase().includes(selGamLower));
      if (matchGam) return true;
    }
    if (selectedFamilia !== 'Tots') {
      const matchFam = (p.gammaIds || []).some(g => String(g || '').toLowerCase().includes(selFamLower)) ||
        (p.familaIds || []).some(f => String(f || '').toLowerCase().includes(selFamLower)) ||
        String(p.nom || '').toLowerCase().includes(selFamLower);
      if (matchFam && selectedGamma === 'Tots') return true;
    }
    return false;
  });

  const filteredProducts = sortProductsWithGammaOrder(rawFilteredProducts, selectedGamma, dbGammes);

  // Obtenir la imatge activa per a la miniatura del filtre (amb fallback a images/tots_productes.jpg)
  const currentFamObj = activeFamilies.find(f => f && String(f.nom || '').toLowerCase() === String(selectedFamilia || '').toLowerCase());
  const activeFamilyImage = currentFamObj?.imatge
    ? resolveMediaUrl(currentFamObj.imatge)
    : resolveMediaUrl('images/tots_productes.jpg');

  // Obtenir les gammes disponibles per a la família seleccionada
  const getSubGammesForSelectedFamily = () => {
    if (selectedFamilia === 'Tots') return [];
    const selFamLower = String(selectedFamilia || '').toLowerCase();

    return dbGammes
      .filter(g => g && g.familiaNom && String(g.familiaNom).toLowerCase().includes(selFamLower))
      .sort((a, b) => (a.ordre || 1) - (b.ordre || 1))
      .map(g => g.nom)
      .filter(Boolean);
  };

  const currentSubGammes = getSubGammesForSelectedFamily();

  return (
    <div className="pt-28 pb-24 animate-fadeIn">

      {/* ========================================================================= */}
      {/* VISTA 1: CATÀLEG PRINCIPAL DE REGALS (Grid Dinàmic de Famílies)            */}
      {/* ========================================================================= */}
      {currentView === 'catalog' && (
        <div className="space-y-16 animate-fadeIn">
          {/* Hero Section */}
          <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
            <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">
              Petites peces amb ànima.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Descobreix la nostra selecció de peces úniques, on la calidesa de la fusta i la precisió artesanal s'uneixen per crear records inesborrables.
            </p>
          </section>

          {/* Grid 100% Dinàmic de Famílies de Firestore */}
          <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {activeFamilies.map((fam) => {
              // Obtenir les Gammes d'aquesta Família ordenades per ordre
              const famGammes = dbGammes.filter(g =>
                g && g.familiaNom && String(g.familiaNom).toLowerCase().includes(String(fam?.nom || '').toLowerCase())
              ).sort((a, b) => (a.ordre || 1) - (b.ordre || 1));

              const cardImg = fam.imatge ? resolveMediaUrl(fam.imatge) : '';

              return (
                <div
                  key={fam.id || fam.nom}
                  onClick={() => handleSelectFamilia(fam.nom)}
                  className="group block relative overflow-hidden rounded-xl h-[270px] sm:h-[285px] md:h-[300px] bg-surface-container-low transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer border border-outline/10 shadow-md"
                >
                  {/* Fotografia de Fons de la Família (Manté la part inferior) */}
                  <div
                    className="absolute inset-0 bg-cover bg-bottom transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url("${cardImg}")` }}
                  ></div>

                  {/* Degradat fosc/càlid inferior per garantir lectura cristal·lina */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-container/95 via-primary-container/40 to-transparent"></div>

                  {/* Contingut i Píndoles de Gammes */}
                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex justify-between items-end">
                    <div className="space-y-2 max-w-xl">
                      <h2 className="font-headline-md text-headline-md text-on-primary font-serif text-2xl md:text-3xl font-semibold">
                        {fam.nom}
                      </h2>
                      {fam.descripcio && (
                        <p className="font-body-md text-inverse-on-surface opacity-90 text-xs md:text-sm font-sans line-clamp-2">
                          {fam.descripcio}
                        </p>
                      )}

                      {/* Píndoles Dinàmiques de les Gammes */}
                      {famGammes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {famGammes.map((gam, gIdx) => (
                            <button
                              key={gam.id || gIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectGamma(fam.nom, gam.nom);
                              }}
                              className="bg-surface/25 hover:bg-surface/45 backdrop-blur-md px-3 py-1 rounded-full text-xs text-on-primary font-medium transition-colors border border-white/20 shadow-2xs cursor-pointer"
                            >
                              {gam.nom}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="material-symbols-outlined text-on-primary group-hover:translate-x-2 transition-transform text-3xl notranslate shrink-0 ml-4" translate="no" aria-hidden="true">
                      arrow_forward
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: LLISTA DETALLADA DE PRODUCTES (Pàgina de peces i pressupost)    */}
      {/* ========================================================================= */}
      {currentView === 'products' && (
        <div className="space-y-8 animate-fadeIn">

          {/* Si hi ha una Cerca Activa des del Header, el Banner de Resultats es mostra A DALT DE TOT */}
          {catalogSearchQuery && catalogSearchQuery.trim() ? (
            <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="bg-surface-container-lowest border border-primary/25 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-2 text-primary font-medium text-xs sm:text-sm text-center sm:text-left">
                  <Search className="w-4 h-4 text-primary shrink-0" />
                  <span>Resultats de cerca per a: <strong>"{catalogSearchQuery}"</strong> ({filteredProducts.length} {filteredProducts.length === 1 ? 'peça trobada' : 'peces trobades'})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCatalogSearchQuery('')}
                  className="px-4 py-2 bg-[#3D2B1F] text-white rounded-full text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Netejar cerca</span>
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* BARRA DE FILTRES AMB PALETA PRIMÀRIA (#3D2B1F / #F3ECE4) I VERDA PER A SUB-GAMMES */}
              <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline/15 shadow-sm">

                  {/* 1. Botó "Tot el Catàleg" */}
                  <button
                    onClick={() => {
                      setSelectedFamilia('Tots');
                      setSelectedGamma('Tots');
                    }}
                    className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs flex items-center justify-center text-center shrink-0 ${selectedFamilia === 'Tots' && selectedGamma === 'Tots'
                      ? 'bg-[#3D2B1F] text-white font-semibold shadow-md'
                      : 'bg-[#F3ECE4] text-[#3D2B1F] hover:bg-[#E8DDD0]'
                      }`}
                  >
                    Tot el<br />Catàleg
                  </button>

                  {/* 2. Miniatura de la Família Seleccionada */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline/20 shadow-xs shrink-0 bg-surface-container relative">
                    <img
                      src={activeFamilyImage}
                      alt={selectedFamilia}
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                  </div>

                  {/* 3. Filera de Botons de Famílies i Sub-Gammes */}
                  <div className="flex-1 space-y-3">
                    {/* Fila 1: Botons de Famílies (Colors Primaris) */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botó Novetats integrat en el disseny del catàleg */}
                      <button
                        onClick={() => {
                          setSelectedFamilia('Novetats');
                          setSelectedGamma('Tots');
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${selectedFamilia === 'Novetats'
                          ? 'bg-[#3D2B1F] text-amber-200 shadow-md border border-amber-200/40'
                          : 'bg-[#F3ECE4] text-[#3D2B1F] hover:bg-[#E8DDD0]'
                          }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${selectedFamilia === 'Novetats' ? 'text-amber-400' : 'text-amber-700'}`} />
                        <span>Novetats</span>
                      </button>

                      {activeFamilies.map(famObj => {
                        const fam = famObj.nom;
                        const isActive = String(selectedFamilia || '').toLowerCase() === String(fam || '').toLowerCase();
                        return (
                          <button
                            key={famObj.id || fam}
                            onClick={() => {
                              setSelectedFamilia(fam);
                              setSelectedGamma('Tots');
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${isActive
                              ? 'bg-[#3D2B1F] text-white font-semibold shadow-xs'
                              : 'bg-[#F3ECE4] text-[#3D2B1F] hover:bg-[#E8DDD0]'
                              }`}
                          >
                            {fam}
                          </button>
                        );
                      })}
                    </div>

                    {/* Fila 2: Sub-Gammes (Només quan s'ha seleccionat una Família) */}
                    {selectedFamilia !== 'Tots' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline/10">
                        {/* Botó "Tot" per a aquesta Família */}
                        <button
                          onClick={() => setSelectedGamma('Tots')}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${selectedGamma === 'Tots'
                            ? 'bg-[#404A39] text-white font-semibold shadow-xs'
                            : 'bg-[#DBE6CF] text-[#404A39] hover:bg-[#cddabf]'
                            }`}
                        >
                          Tot
                        </button>

                        {/* Sub-Gammes individuals */}
                        {currentSubGammes.map(gam => {
                          const isGamActive = String(selectedGamma || '').toLowerCase() === String(gam || '').toLowerCase();
                          return (
                            <button
                              key={gam}
                              onClick={() => setSelectedGamma(gam)}
                              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${isGamActive
                                ? 'bg-[#404A39] text-white font-semibold shadow-xs'
                                : 'bg-[#DBE6CF] text-[#404A39] hover:bg-[#cddabf]'
                                }`}
                            >
                              {gam}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Nota Tècnica / Avís d'Artesania sobre Fusta Natural */}
              <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
                <div className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl border border-primary/20 shadow-xs flex items-start gap-3.5 text-xs text-on-surface-variant">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-primary text-sm">És important saber que...</p>
                    <p className="leading-relaxed text-on-surface-variant">
                      Tot i que les fustes que utilitzem són de la millor qualitat, s'ha de tenir en compte que es tracta d'un suport natural i que es poden apreciar les vetes i els petits nusos propis de la fusta. Això pot comportar un canvi de tonalitat en parts de les peces que no podem evitar.
                    </p>
                  </div>
                </div>
              </section>

              {/* Nova Secció d'Informació Comuna de la Gamma (Caixetí 1: Text informatiu, Caixetí 2/3: Fins a 5 imatges) */}
              {(() => {
                const activeGammaObj = selectedGamma && selectedGamma !== 'Tots'
                  ? dbGammes.find(g => g && String(g.nom || '').toLowerCase() === String(selectedGamma || '').toLowerCase())
                  : null;

                const gammaHasText = Boolean(activeGammaObj?.textInformatiu && activeGammaObj.textInformatiu.trim());
                const validGammaImages = (activeGammaObj?.imatges || []).filter(img => typeof img === 'string' && img.trim() !== '');
                const gammaHasImages = validGammaImages.length > 0;
                const hasGammaInfo = activeGammaObj && (gammaHasText || gammaHasImages);

                if (!hasGammaInfo) return null;

                return (
                  <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop animate-fadeIn">
                    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary/25 shadow-md space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-outline/15">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Info className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-sm">
                            Dades comunes a {activeGammaObj.nom}
                          </p>
                        </div>
                      </div>

                      {/* Caixetí 1: Text Informatiu Comú */}
                      {gammaHasText && (
                        <div className="text-sm text-on-surface-variant leading-relaxed font-body-md bg-surface-container/30 p-4 rounded-xl border border-outline/10">
                          <p className="whitespace-pre-line">{activeGammaObj.textInformatiu}</p>
                        </div>
                      )}

                      {/* Caixetins 2 & 3: Imatges Ilustratives (~200x200px, aliniades per l'esquerra) */}
                      {gammaHasImages && (
                        <div className="pt-1">
                          <div className="flex flex-wrap items-center justify-start gap-4">
                            {validGammaImages.map((imgUrl, idx) => {
                              const resolved = resolveMediaUrl(imgUrl);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedModalImage(resolved)}
                                  className="w-[200px] h-[200px] rounded-2xl bg-surface border border-outline/20 overflow-hidden relative shadow-md group shrink-0 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
                                  title="Fes clic per ampliar imatge"
                                >
                                  <img
                                    src={resolved}
                                    alt={`${activeGammaObj.nom} - detalls ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-xs px-3 py-1 rounded-full backdrop-blur-xs transition-opacity font-medium shadow">
                                      Ampliar 🔍
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}
            </>
          )}

          {/* Grid de Mini-Fitxes de Productes (Files de 3 columnes en PC, 2 en Tauleta, 1 en Mòbil) */}
          <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-outline/15 p-8">
                <p className="font-serif text-lg text-primary">
                  {catalogSearchQuery 
                    ? `No s'ha trobat cap peça per a "${catalogSearchQuery}".`
                    : "No s'han trobat peces per al filtre triat."}
                </p>
                <button
                  onClick={() => { 
                    setCatalogSearchQuery('');
                    setSelectedFamilia('Tots'); 
                    setSelectedGamma('Tots'); 
                  }}
                  className="mt-4 text-xs text-primary underline cursor-pointer font-semibold"
                >
                  Mostrar tot el catàleg
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((product) => (
                  <ProductCardErrorBoundary key={product.id || product.nom}>
                    <MiniProductCard
                      product={product}
                      dbEscandalls={dbEscandalls}
                      onClick={(selectedQty) => setActiveModalProduct({ ...product, initialQty: typeof selectedQty === 'number' ? selectedQty : 1 })}
                      onAddToCart={addToCart}
                    />
                  </ProductCardErrorBoundary>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Dynamic Motivational Pill Card (Píndola Motivadora Dinàmica) */}
      <div className="mt-20 max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop">
        <div
          onMouseEnter={() => setIsPillHovered(true)}
          onMouseLeave={() => setIsPillHovered(false)}
          className="bg-surface-container-lowest border border-primary/20 rounded-3xl p-5 md:p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden"
        >
          <div className={`transition-all duration-500 ease-in-out ${isPillFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>

            {/* Layout per a Desktop (Flanquejat per les dues cares) i Mòbil (Avatares agrupats a dalt) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">

              {/* Avatares Mòbil (Visibles només en pantalles petites < md, d'almenys 100px de mida) */}
              <div className="flex md:hidden items-center justify-center gap-4">
                <img
                  src={resolveMediaUrl(currentPill.doubtImg)}
                  alt="Dubte"
                  className="w-[100px] h-[100px] rounded-full object-cover border-2 border-primary/20 shadow-sm shrink-0"
                />
                <span className="text-primary/40 font-serif text-xl font-bold">➔</span>
                <img
                  src={resolveMediaUrl(currentPill.happyImg)}
                  alt="Solució"
                  className="w-[100px] h-[100px] rounded-full object-cover border-2 border-primary/20 shadow-sm shrink-0"
                />
              </div>

              {/* Cara 1 (Dubte) - Visible només en Desktop (md:flex, mida 110px) */}
              <div className="hidden md:flex flex-col items-center shrink-0">
                <img
                  src={resolveMediaUrl(currentPill.doubtImg)}
                  alt="Dubte"
                  className="w-[110px] h-[110px] rounded-full object-cover border-2 border-primary/20 shadow-md hover:scale-105 transition-transform"
                />
              </div>

              {/* Text Central & Botó CTA */}
              <div className="flex-1 space-y-2 md:px-6">
                <h3 className="font-serif text-xl md:text-2xl text-primary font-semibold leading-snug">
                  {currentPill.title}
                </h3>
                <p className="font-body-md text-xs md:text-sm text-on-surface-variant leading-relaxed max-w-xl">
                  {currentPill.subtitle}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="bg-primary text-on-primary px-7 py-3 rounded-xl text-xs md:text-sm font-semibold hover:bg-primary-container transition-colors shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Demana la teva personalització</span>
                    <span className="material-symbols-outlined text-sm notranslate" translate="no">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Cara 2 (Solució / Contenta) - Visible només en Desktop (md:flex, mida 110px) */}
              <div className="hidden md:flex flex-col items-center shrink-0">
                <img
                  src={resolveMediaUrl(currentPill.happyImg)}
                  alt="Solució"
                  className="w-[110px] h-[110px] rounded-full object-cover border-2 border-primary/20 shadow-md hover:scale-105 transition-transform"
                />
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Modal Lightbox per a la imatge ampliada de la Gamma */}
      {selectedModalImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-2xl p-2 border border-outline/20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedModalImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full z-10 transition-colors cursor-pointer"
              title="Tancar"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedModalImage}
              alt="Imatge ampliada de la gamma"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL FLOTANT: FITXA REAL COMPLETA DEL PRODUCTE SELECCIONAT               */}
      {/* ========================================================================= */}
      {activeModalProduct && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xs overflow-y-auto p-0 sm:p-4 md:p-6 flex flex-col items-center justify-start animate-fadeIn"
          onClick={() => setActiveModalProduct(null)}
        >
          <div 
            className="relative w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-y-auto bg-surface sm:rounded-3xl border-0 sm:border border-outline/20 shadow-2xl p-0 my-0 sm:my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Capçalera Fixa Flotant amb Títol, Enllaç i Botó de Tancar */}
            <div className="sticky top-0 bg-surface/98 backdrop-blur-md z-30 px-4 py-3 sm:px-6 sm:py-4 border-b border-outline/15 flex items-center justify-between gap-3 shadow-xs shrink-0">
              <h2 className="font-serif text-lg sm:text-2xl font-bold text-primary truncate max-w-[55%] sm:max-w-xl">
                {activeModalProduct.nom}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyDirectLink(activeModalProduct)}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary rounded-xl border border-outline/20 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-medium"
                  title="Copiar enllaç directe d'aquest producte"
                >
                  <Share2 className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Copiar enllaç</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalProduct(null)}
                  className="p-2 rounded-full bg-surface-container hover:bg-surface-container-high text-primary border border-outline/20 shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Tancar fitxa"
                  aria-label="Tancar fitxa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fitxa Real Completa (ProductCard) amb màxim aprofitament horitzontal */}
            <div className="p-3 sm:p-6 md:p-8 flex-1">
              <ProductCardErrorBoundary key={activeModalProduct.id || activeModalProduct.nom}>
                <ProductCard
                  product={activeModalProduct}
                  onAddToCart={(item) => {
                    addToCart(item);
                  }}
                  selectedGamma={selectedGamma}
                  dbGammes={dbGammes}
                  dbEscandalls={dbEscandalls}
                  onSelectImageModal={setSelectedModalImage}
                  isModalView={true}
                />
              </ProductCardErrorBoundary>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Comprova si un text és un camí o URL d'imatge vàlid
function isValidImagePath(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  return trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('images/') ||
    trimmed.startsWith('imatges/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(trimmed);
}

// Subcomponent Mini-Fitxa neta per a la graella de 3 columnes
function MiniProductCard({ product, onClick, onAddToCart, dbEscandalls = [] }) {
  const [addedToast, setAddedToast] = useState(false);
  const mainImage = product.imatgePrincipal || (Array.isArray(product.imatges) && product.imatges[0]) || product.imatge || '';
  const resolvedImg = resolveProducteMediaUrl(mainImage) || resolveMediaUrl('images/tots_productes.jpg');
  const escData = getProductEscandallData(product, dbEscandalls);
  const hasTextPrice = typeof product.preu === 'string' && isNaN(parseFloat(product.preu.replace(',', '.'))) && product.preu.trim() !== '';
  const textPriceValue = hasTextPrice ? product.preu.trim() : (product.preuOrientatiu && isNaN(parseFloat(product.preuOrientatiu.replace(',', '.'))) ? product.preuOrientatiu.trim() : null);
  const rawPrice = (escData.hasEscandall && escData.preu > 0)
    ? escData.preu
    : (product.preuBase !== undefined ? Number(product.preuBase) : (product.preu !== undefined ? parseDecimal(product.preu, 0) : 0));
  
  // Lògica de Preus per Quantitat (Trams) i Mides
  const hasQtyPricing = Boolean(product.preuPerQuantitat?.actiu === true);
  const preusPerMidaMap = product.preuPerQuantitat?.preusPerMida || {};
  const allTier2 = Object.values(preusPerMidaMap).map(v => Number(v?.preuMesLlindar ?? v)).filter(n => !isNaN(n) && n > 0);
  const priceTier2 = allTier2.length > 0 
    ? Math.min(...allTier2) 
    : Number(product.preuPerQuantitat?.preuMesLlindar ?? rawPrice);

  // Preu base inferior per mida si no té preus per volum
  const basePreusPerMida = Object.values(product.preusPerMida || {}).map(Number).filter(n => !isNaN(n) && n > 0);
  const minBasePrice = basePreusPerMida.length > 0 ? Math.min(...basePreusPerMida) : rawPrice;

  // Preu de referència a mostrar a la targeta (el preu inferior per volum o per mida)
  const displayedPrice = hasQtyPricing ? priceTier2 : minBasePrice;
  const isZeroPrice = !displayedPrice || isNaN(displayedPrice) || displayedPrice <= 0;
  const isBudgetRequired = product.requereixPressupost === true && !hasQtyPricing;
  const isPreuDesDe = hasQtyPricing ? true : ((basePreusPerMida.length > 1) || product.preuDesDe === true || product.isPreuDesDe === true);

  const hasCustomization = Array.isArray(product.opcionsPersonalitzacio) && product.opcionsPersonalitzacio.length > 0;
  const deliveryTime = product.terminiFabricacio || product.terminiLliurament || '3-5 dies';
  const ratingScore = product.rating || 5.0;
  const commentsCount = Array.isArray(product.comentaris) ? product.comentaris.length : (product.numComentaris || 0);

  return (
    <div 
      onClick={() => onClick && onClick(1)}
      className="group bg-surface-container-lowest border border-outline/15 hover:border-primary/40 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full relative"
    >
      {/* Part Superior: Imatge a l'esquerra + Dades a la dreta */}
      <div className="flex gap-3.5 items-start">
        {/* Imatge a l'esquerra */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-container border border-outline/10 shrink-0 relative">
          <img 
            src={resolvedImg} 
            alt={product.nom}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.target.src = resolveMediaUrl('images/tots_productes.jpg'); }}
          />
          {product.novetat && (
            <span className="absolute top-1 left-1 bg-amber-400 text-amber-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow-xs">
              NOU
            </span>
          )}
        </div>

        {/* Text i Detalls a la dreta */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-serif text-sm sm:text-base font-semibold text-primary group-hover:text-primary-container transition-colors line-clamp-1">
            {product.nom}
          </h3>

          <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 leading-snug">
            {product.descripcio || product.concepte || 'Peça artesanal elaborada a mà en fusta de primera qualitat.'}
          </p>

          {/* Valoracions */}
          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>{formatDecimal(ratingScore, 1)}</span>
            {commentsCount > 0 && (
              <span className="text-on-surface-variant/70 text-[10px]">({commentsCount})</span>
            )}
          </div>

          {/* Termini de Lliurament */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-on-surface-variant/80">
            <Clock className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span>Lliurament: <strong className="text-primary font-medium">{deliveryTime}</strong></span>
          </div>
        </div>
      </div>

      {/* Barra Inferior: Preu i Botó d'Acció en una sola línia */}
      <div className="mt-3.5 pt-2.5 border-t border-outline/10 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[10px] text-on-surface-variant/75 uppercase tracking-wider font-mono font-medium whitespace-nowrap">
            {isPreuDesDe ? "PREU DES DE:" : (isBudgetRequired ? "Preu orientatiu:" : "Preu:")}
          </span>
          <span className={textPriceValue ? "font-sans text-xs font-semibold text-primary" : "font-sans text-xs sm:text-sm font-bold text-primary tracking-tight whitespace-nowrap"}>
            {textPriceValue ? textPriceValue : (isZeroPrice ? "- - -" : `${displayedPrice.toFixed(2).replace('.', ',')} €`)}
          </span>
        </div>

        {/* Botó segons si té personalització o és compra/pressupost */}
        {hasCustomization ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick(1);
            }}
            className="px-3.5 py-1.5 bg-[#3D2B1F] text-white text-xs font-semibold rounded-xl hover:bg-primary-container transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Personalitzar</span>
          </button>
        ) : isBudgetRequired ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick(1);
            }}
            className="px-3.5 py-1.5 bg-[#3D2B1F] text-white text-xs font-semibold rounded-xl hover:bg-primary-container transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Pressupost</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick(1);
            }}
            className="px-3.5 py-1.5 bg-[#3D2B1F] text-white text-xs font-semibold rounded-xl hover:bg-primary-container transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            <span>Afegir</span>
          </button>
        )}
      </div>

      {/* Feedback visual si s'afegeix directament */}
      {addedToast && (
        <div className="w-full text-right text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-end gap-1 animate-fadeIn">
          <Check className="w-3.5 h-3.5" /> {isBudgetRequired ? 'Afegit a la sol·licitud!' : 'Afegit a la cistella!'}
        </div>
      )}
    </div>
  );
}

// Error Boundary per prevenir que un error a la fitxa d'un regal faci caure el catàleg en blanc
class ProductCardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error al carregar la fitxa de producte:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/20 text-xs text-on-surface-variant space-y-2">
          <p className="font-semibold text-primary">⚠️ No s'ha pogut renderitzar aquesta fitxa de regal específicament.</p>
          {this.state.error && (
            <p className="font-mono text-[10px] text-error/80 bg-error/5 p-2 rounded border border-error/20">
              Detall tècnic: {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <p>Revisa les opcions de personalització o les dades de la peça a l'àrea privada.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Subcomponent per a cada Fitxa de Producte amb opcions de personalització i quantitat
function ProductCard({ product, onAddToCart, selectedGamma = 'Tots', dbGammes = [], dbEscandalls = [], onSelectImageModal, isModalView = false }) {
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);

  // Trobar si aquest producte pertany a una Gamma amb dades comunes
  const matchedGammaObj = React.useMemo(() => {
    if (!dbGammes || dbGammes.length === 0) return null;
    const prodGammas = Array.isArray(product.gammaIds)
      ? product.gammaIds
      : [product.gammaNom || product.gamma].filter(Boolean);

    if (prodGammas.length === 0) return null;

    return dbGammes.find(g =>
      g && g.nom && prodGammas.some(pg => String(pg).toLowerCase().trim() === String(g.nom).toLowerCase().trim())
    ) || null;
  }, [dbGammes, product]);

  const gammaHasText = Boolean(matchedGammaObj?.textInformatiu && matchedGammaObj.textInformatiu.trim());
  const validGammaImages = (matchedGammaObj?.imatges || []).filter(img => typeof img === 'string' && img.trim() !== '');
  const gammaHasImages = validGammaImages.length > 0;
  const hasGammaCommonData = matchedGammaObj && (gammaHasText || gammaHasImages);

  // Desplegable de Dades Comunes de la Gamma (sempre disponible si la gamma té dades comunes)
  const shouldShowMoreInfoAccordion = Boolean(hasGammaCommonData);

  // Preus i Requisit de Pressupost (Si té escandall actiu, utilitza el preu calculat de l'escandall)
  const escData = getProductEscandallData(product, dbEscandalls);
  const rawPrice = (escData.hasEscandall && escData.preu > 0)
    ? escData.preu
    : (product.preuBase !== undefined ? Number(product.preuBase) : (product.preu !== undefined ? parseDecimal(product.preu, 0) : 0));
  const hasQtyPricing = Boolean(product.preuPerQuantitat?.actiu === true);
  const hasTextPrice = typeof product.preu === 'string' && isNaN(parseFloat(product.preu.replace(',', '.'))) && product.preu.trim() !== '';
  const textPriceValue = (!hasQtyPricing && hasTextPrice) 
    ? product.preu.trim() 
    : (!hasQtyPricing && product.preuOrientatiu && isNaN(parseFloat(product.preuOrientatiu.replace(',', '.'))) ? product.preuOrientatiu.trim() : null);
  const isBudgetRequired = product.requereixPressupost === true && !hasQtyPricing;

  // Llista d'imatges vàlides (Garanteix que rawImages sigui SEMPRE un Array)
  const rawImages = Array.isArray(product.imatges)
    ? product.imatges
    : (typeof product.imatges === 'string' && product.imatges.trim() ? [product.imatges.trim()] : [product.imatgePrincipal].filter(Boolean));

  const validImgs = Array.isArray(rawImages) ? rawImages.filter(isValidImagePath) : [];
  const imagesList = validImgs.length > 0 ? validImgs : (Array.isArray(rawImages) ? rawImages : []);

  // Imatge principal per defecte (privilegia la primera imatge vàlida)
  const defaultMainImage = (isValidImagePath(product.imatgePrincipal) ? product.imatgePrincipal : null) || imagesList[0] || product.imatgePrincipal || '';

  const [selectedImg, setSelectedImg] = useState(defaultMainImage);
  const [quantity, setQuantity] = useState(product.initialQty || 1);
  const [notes, setNotes] = useState('');

  // Sincronitzar quantitat inicial si s'ha triat des de la targeta prèviament
  useEffect(() => {
    if (product.initialQty) {
      setQuantity(product.initialQty);
    }
  }, [product.initialQty]);
  const safeOpcions = Array.isArray(product.opcionsPersonalitzacio) ? product.opcionsPersonalitzacio : [];

  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = {};
    safeOpcions.forEach((opc, idx) => {
      if (!opc || typeof opc !== 'object') return;
      const key = opc.titol || `Opció ${idx + 1}`;
      if (opc.tipus === 'desplegable' && opc.valors && typeof opc.valors === 'string') {
        const valorsArr = opc.valors.split(',').map(s => s.trim());
        initial[key] = valorsArr[0] || '';
      } else {
        initial[key] = '';
      }
    });
    return initial;
  });
  const [addedToast, setAddedToast] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Detectar el simulador assignat (configurat manualment a l'àrea privada o per detecció automàtica)
  const simType = product.simulador || 'auto';

  const isInicialKeychain = simType === 'inicial' || (simType === 'auto' && String(product.nom || '').toLowerCase().includes('inicial'));
  const isPuzzleProduct = simType === 'puzle' || (simType === 'auto' && String(product.nom || '').toLowerCase().includes('puzle') && /\d+\s*x\s*\d+/i.test(product.nom));
  const isEtiquetaProduct = simType.startsWith('etiqueta') || simType === 'xapa' || (simType === 'auto' && (
    String(product.nom || '').toLowerCase().includes('etiquet') ||
    String(product.nom || '').toLowerCase().includes('xap') ||
    String(product.nom || '').toLowerCase().includes('medall') ||
    (Array.isArray(product.familaIds) && product.familaIds.some(f => String(f).toLowerCase().includes('etiquet') || String(f).toLowerCase().includes('xap') || String(f).toLowerCase().includes('medall'))) ||
    (Array.isArray(product.gammaIds) && product.gammaIds.some(g => String(g).toLowerCase().includes('etiquet') || String(g).toLowerCase().includes('xap') || String(g).toLowerCase().includes('medall')))
  ));

  // Trobar el primer fitxer adjuntat per l'usuari per passar-ho al simulador de puzle
  const firstUserFile = React.useMemo(() => {
    const firstKey = Object.keys(attachedFiles)[0];
    return firstKey ? attachedFiles[firstKey] : null;
  }, [attachedFiles]);

  const initialKey = safeOpcions.find(o => {
    const t = String(o?.titol || '').toLowerCase();
    return t.includes('inicial') || t.includes('cara a') || t.includes('lletra');
  })?.titol || (safeOpcions[0]?.titol || 'Inicial (Cara A)');

  const phraseKey = safeOpcions.find(o => {
    const t = String(o?.titol || '').toLowerCase();
    return t.includes('frase') || t.includes('cara b') || t.includes('text') || t.includes('dedicatòria');
  })?.titol || (safeOpcions[1]?.titol || 'Text (Cara B)');

  // Detecció de Text Cara A i Text Cara B per a etiquetes bifacials
  const textKeyA = safeOpcions.find(o => {
    const t = String(o?.titol || '').toLowerCase();
    return t.includes('cara a') || t.includes('frontal') || t.includes('davantera') || t.includes('text 1');
  })?.titol || phraseKey;

  const textKeyB = safeOpcions.find(o => {
    const t = String(o?.titol || '').toLowerCase();
    return t.includes('cara b') || t.includes('posterior') || t.includes('darrere') || t.includes('revers') || t.includes('text 2');
  })?.titol;

  const simInitial = typeof selectedOptions[initialKey] === 'string' ? selectedOptions[initialKey] : '';
  const simPhrase = typeof selectedOptions[phraseKey] === 'string' ? selectedOptions[phraseKey] : '';
  const simPhraseA = textKeyA && typeof selectedOptions[textKeyA] === 'string' ? selectedOptions[textKeyA] : simPhrase;
  const simPhraseB = textKeyB && typeof selectedOptions[textKeyB] === 'string' ? selectedOptions[textKeyB] : '';

  const handleShareProductLink = async () => {
    await copyDirectLink('producte', product.id);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFileUpload = (title, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El fitxer és massa gran (màxim 5 MB). Utilitza una imatge o PDF més petit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const isImg = file.type.startsWith('image/');
      const formattedSize = file.size > 1024 * 1024
        ? `${formatDecimal(file.size / (1024 * 1024), 1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const fileObj = {
        fileName: file.name,
        fileSize: formattedSize,
        fileType: file.type,
        isImage: isImg,
        dataUrl: dataUrl
      };

      setAttachedFiles(prev => ({ ...prev, [title]: fileObj }));
      setSelectedOptions(prev => ({ ...prev, [title]: fileObj }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (title) => {
    setAttachedFiles(prev => {
      const updated = { ...prev };
      delete updated[title];
      return updated;
    });
    setSelectedOptions(prev => {
      const updated = { ...prev };
      delete updated[title];
      return updated;
    });
  };

  // Sincronitzar la imatge seleccionada quan carreguen dades noves de Firestore
  useEffect(() => {
    const bestImg = (isValidImagePath(product.imatgePrincipal) ? product.imatgePrincipal : null) || imagesList[0] || product.imatgePrincipal || '';
    setSelectedImg(bestImg);
  }, [product.id, product.imatgePrincipal, JSON.stringify(product.imatges)]);

  const currentDisplayImg = selectedImg || defaultMainImage;

  // Obtenir totes les mides disponibles d'aquest producte
  const availableProductMides = React.useMemo(() => {
    return getAvailableMidesForProduct(product);
  }, [product]);

  // Mida triada al simulador o formulari (amb fallback a la primera mida disponible)
  const rawSelectedMida = selectedOptions['Mida de l\'etiqueta'] || 
                          selectedOptions['Mida'] || 
                          selectedOptions['Dimensions'] || 
                          selectedOptions['Mesura'] || 
                          Object.entries(selectedOptions).find(([k]) => k.toLowerCase().includes('mida'))?.[1] ||
                          '';

  const selectedMida = rawSelectedMida || (availableProductMides.length > 0 ? availableProductMides[0] : '');

  // Lògica de Preus per Quantitat (Trams)
  const qtyThreshold = Number(product.preuPerQuantitat?.llindar || 10);

  // Funció de normalització de mides per comparar cadenes de text
  const cleanMidaKey = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/ø/g, '')
      .replace(/mm/g, '')
      .replace(/cm/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .trim();
  };

  // Buscar configuració de preus per a la mida seleccionada
  const preusPerMidaObj = product.preuPerQuantitat?.preusPerMida || {};
  const normalizedSelectedMida = cleanMidaKey(selectedMida);

  const matchedMidaEntry = Object.entries(preusPerMidaObj).find(([k]) => {
    if (!normalizedSelectedMida) return false;
    const normalizedKey = cleanMidaKey(k);
    return normalizedSelectedMida === normalizedKey ||
           normalizedSelectedMida.includes(normalizedKey) ||
           normalizedKey.includes(normalizedSelectedMida);
  });
  const midaPricing = matchedMidaEntry ? matchedMidaEntry[1] : null;

  // Extreure Preu 1 i Preu 2
  const rawP1 = typeof midaPricing === 'object' && midaPricing !== null
    ? (midaPricing.preuFinsLlindar ?? midaPricing.preu1 ?? midaPricing.preu)
    : (midaPricing !== null && midaPricing !== undefined && !isNaN(Number(midaPricing)) ? midaPricing : null);
  
  const rawP2 = typeof midaPricing === 'object' && midaPricing !== null
    ? (midaPricing.preuMesLlindar ?? midaPricing.preu2)
    : null;

  const priceTier1 = (rawP1 !== null && rawP1 !== undefined && rawP1 !== '' && !isNaN(Number(rawP1)) && Number(rawP1) > 0)
    ? Number(rawP1)
    : Number(product.preuPerQuantitat?.preuFinsLlindar ?? rawPrice);

  const priceTier2 = (rawP2 !== null && rawP2 !== undefined && rawP2 !== '' && !isNaN(Number(rawP2)) && Number(rawP2) > 0)
    ? Number(rawP2)
    : Number(product.preuPerQuantitat?.preuMesLlindar ?? priceTier1);

  // Preu base si no és preu per quantitat
  const basePreuPerMidaMap = product.preusPerMida || {};
  const matchedBaseEntry = Object.entries(basePreuPerMidaMap).find(([k]) => {
    if (!normalizedSelectedMida) return false;
    const normalizedKey = cleanMidaKey(k);
    return normalizedSelectedMida === normalizedKey ||
           normalizedSelectedMida.includes(normalizedKey) ||
           normalizedKey.includes(normalizedSelectedMida);
  });
  const basePriceForMida = matchedBaseEntry && !isNaN(Number(matchedBaseEntry[1])) && Number(matchedBaseEntry[1]) > 0
    ? Number(matchedBaseEntry[1])
    : rawPrice;

  const isPreuDesDe = hasQtyPricing ? true : (product.preuDesDe === true || product.isPreuDesDe === true);

  // Preu base dinàmic segons quantitat i mida
  const activeBasePrice = hasQtyPricing
    ? (quantity > qtyThreshold ? priceTier2 : priceTier1)
    : basePriceForMida;

  // Sobrecostos dinàmics de personalització segons la configuració explícita de l'àrea privada
  const currentSurcharge = computeOptionSurcharges(product, selectedOptions);
  const baseUnitPrice = activeBasePrice;
  const finalUnitPrice = baseUnitPrice + currentSurcharge;
  const isZeroPrice = !finalUnitPrice || isNaN(finalUnitPrice) || finalUnitPrice <= 0;

  const handleAdd = () => {
    onAddToCart({
      producteId: product.id,
      nom: product.nom,
      imatge: currentDisplayImg || product.imatgePrincipal,
      quantitat: quantity,
      observacions: notes,
      opcionsTriades: selectedOptions,
      preuUnitari: finalUnitPrice,
      preuBase: baseUnitPrice,
      sobrecost: currentSurcharge,
      terminiFabricacio: product.terminiFabricacio || ''
    });

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  return (
    <article id={`producte-${product.id}`} className={`${isModalView ? 'bg-transparent border-0 shadow-none p-0 w-full' : 'bg-surface-container-lowest rounded-xl border border-outline/15 shadow-sm p-6 md:p-8'} overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start`}>

      {/* Títol del Producte en vista Mòbil (ocult si ja és dins del Modal flotant) */}
      {!isModalView && (
        <div className="flex md:hidden justify-between items-start gap-4 w-full border-b border-outline/10 pb-3">
          <h2 className="font-serif text-2xl text-primary font-semibold leading-snug">{product.nom}</h2>
          <button
            type="button"
            onClick={handleShareProductLink}
            className="p-2 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/20 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 text-xs font-medium"
            title="Copiar enllaç directe d'aquest producte"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-primary" />}
          </button>
        </div>
      )}

      {/* Columna Imatges (5 cols) */}
      <div className="md:col-span-5 space-y-4">
        <div className="aspect-square bg-surface-container rounded-lg overflow-hidden border border-outline/10 shadow-xs relative">
          {product.novetat && (
            <div className="absolute top-3 left-3 bg-[#3D2B1F] text-amber-200 font-bold font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 z-10 border border-amber-200/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>NOVETAT</span>
            </div>
          )}
          {currentDisplayImg ? (
            <img
              src={resolveMediaUrl(currentDisplayImg)}
              alt={product.nom}
              className="w-full h-full object-cover transition-all duration-300"
              onError={(e) => {
                if (imagesList.length > 0 && e.target.src !== resolveMediaUrl(imagesList[0])) {
                  e.target.src = resolveMediaUrl(imagesList[0]);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline text-xs">Sense imatge</div>
          )}
          {/* Sense badge de codi de producte segons petició */}
        </div>

        {/* Galeria de miniatures (Fins a 5 imatges) */}
        {imagesList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imagesList.slice(0, 5).map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImg(imgUrl)}
                className={`w-14 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${(selectedImg === imgUrl || (!selectedImg && idx === 0)) ? 'border-primary shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
              >
                <img src={resolveMediaUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Columna Informació i Formulari de Pressupost (7 cols) */}
      <div className="md:col-span-7 space-y-5">
        {/* Títol del Producte en vista Desktop (ocult si ja és dins del Modal flotant) */}
        {!isModalView && (
          <div className="hidden md:flex justify-between items-start gap-4">
            <h2 className="font-serif text-2xl md:text-3xl text-primary font-semibold">{product.nom}</h2>
            <button
              type="button"
              onClick={handleShareProductLink}
              className="p-2 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/20 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5 text-xs font-medium"
              title="Copiar enllaç directe d'aquest producte per a màrqueting"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-primary" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiat!' : 'Copiar enllaç'}</span>
            </button>
          </div>
        )}

        {/* Descripció Formatada (Rich Text) */}
        <div className={`text-on-surface-variant text-sm leading-relaxed ${isModalView ? '' : 'border-t border-outline/10 pt-4'}`}>
          {renderFormattedText(product.descripcio)}
        </div>

        {/* Desplegable "Més informació" amb les Dades Comunes de la Gamma (si la llista no està filtrada per aquesta gamma) */}
        {shouldShowMoreInfoAccordion && (
          <div className="border-t border-outline/10 pt-3">
            <button
              type="button"
              onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}
              className="w-full flex items-center justify-between text-xs font-semibold text-primary hover:text-primary-container transition-colors py-1.5 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span>Dades comunes a {matchedGammaObj.nom}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-300 ${isMoreInfoOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreInfoOpen && (
              <div className="mt-2.5 p-3.5 bg-surface-container/40 rounded-xl border border-primary/15 text-xs text-on-surface-variant space-y-3 animate-fadeIn">
                {gammaHasText && (
                  <div className="leading-relaxed font-body-md whitespace-pre-line">
                    {matchedGammaObj.textInformatiu}
                  </div>
                )}
                {gammaHasImages && (
                  <div className="flex flex-wrap items-center justify-start gap-2.5 pt-1">
                    {validGammaImages.map((imgUrl, idx) => {
                      const resolved = resolveMediaUrl(imgUrl);
                      return (
                        <div
                          key={idx}
                          onClick={() => onSelectImageModal && onSelectImageModal(resolved)}
                          className="w-20 h-20 rounded-lg bg-surface border border-outline/20 overflow-hidden relative shadow-xs group shrink-0 cursor-pointer hover:scale-105 transition-all"
                          title="Fes clic per ampliar imatge"
                        >
                          <img
                            src={resolved}
                            alt={`${matchedGammaObj.nom} - detall ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Especificacions Tècniques (Sense títol de grup, només si tenen contingut) */}
        {(product.material || product.dimensions || product.gruix || product.pes || product.acabat) && (
          <div className="space-y-1.5 border-t border-outline/10 pt-3 text-xs">
            {product.material && (
              <div className="flex items-baseline gap-4">
                <span className="w-28 font-bold text-primary shrink-0">Material</span>
                <span className="text-on-surface-variant flex-1">{product.material}</span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex items-baseline gap-4">
                <span className="w-28 font-bold text-primary shrink-0">Dimensions</span>
                <span className="text-on-surface-variant flex-1">{product.dimensions}</span>
              </div>
            )}
            {product.gruix && (
              <div className="flex items-baseline gap-4">
                <span className="w-28 font-bold text-primary shrink-0">Gruix</span>
                <span className="text-on-surface-variant flex-1">{product.gruix}</span>
              </div>
            )}
            {product.pes && (
              <div className="flex items-baseline gap-4">
                <span className="w-28 font-bold text-primary shrink-0">Pes</span>
                <span className="text-on-surface-variant flex-1">{product.pes}</span>
              </div>
            )}
            {product.acabat && (
              <div className="flex items-baseline gap-4">
                <span className="w-28 font-bold text-primary shrink-0">Acabat</span>
                <span className="text-on-surface-variant flex-1">{product.acabat}</span>
              </div>
            )}
          </div>
        )}

        {/* Opcions de Personalització en Vertical */}
        {(product.opcionsPersonalitzacio || []).length > 0 && (
          <div className="space-y-2 pt-3 border-t border-outline/10">
            {/* Títol amb icona i la paraula Personalitzar */}
            <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Personalitzar</span>
            </div>

            {/* Text explicatiu / Títol personalitzat */}
            {(product.titolPersonalitzacio || ((isInicialKeychain || isPuzzleProduct) ? "Mira el simulador en temps real per veure el resultat:" : "")) && (
              <p className="text-xs text-on-surface-variant font-mono">
                {product.titolPersonalitzacio || ((isInicialKeychain || isPuzzleProduct) ? "Mira el simulador en temps real per veure el resultat:" : "")}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {(product.opcionsPersonalitzacio || []).map((opc, idx) => {
                if (!opc || typeof opc !== 'object') return null;
                const key = opc.titol || opc.nom || `Opció ${idx + 1}`;
                const opcType = (opc.tipus || '').toLowerCase();
                const valorsStr = typeof opc.valors === 'string' ? opc.valors : '';
                const lowerKey = key.toLowerCase();
                const isInitialField = isInicialKeychain && (lowerKey.includes('inicial') || lowerKey.includes('lletra') || (lowerKey.includes('cara a') && !lowerKey.includes('text')));
                const isPhraseField = (isInicialKeychain && (lowerKey.includes('frase') || lowerKey.includes('cara b'))) || lowerKey.includes('dedicatòria') || opcType === 'textarea';

                const singlePrice = Number(opc.preu || 0);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-medium text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                        <span>{key}</span>
                        {opcType !== 'desplegable' && singlePrice > 0 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            +{singlePrice.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                        {isInitialField && <span className="text-[10px] text-primary/70 font-mono ml-1">(1 lletra majúscula)</span>}
                        {isPhraseField && <span className="text-[10px] text-primary/70 font-mono ml-1">(Màxim 80 caràcters, admet salts de línia amb CTRL+INTRO)</span>}
                      </label>
                      {isPhraseField && (
                        <span className={`text-[10px] font-mono font-semibold ${(selectedOptions[key] || '').length >= 70 ? 'text-amber-600 font-bold' : 'text-on-surface-variant/70'}`}>
                          {(selectedOptions[key] || '').length} / 80
                        </span>
                      )}
                    </div>

                    {opcType === 'desplegable' && valorsStr ? (
                      <select
                        value={typeof selectedOptions[key] === 'string' ? selectedOptions[key] : ''}
                        onChange={(e) => setSelectedOptions({ ...selectedOptions, [key]: e.target.value })}
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans font-medium"
                      >
                        {valorsStr.split(',').map((val, vIdx) => {
                          const trimmedVal = val.trim();
                          const itemPrice = Number(opc.preusValors?.[trimmedVal] || 0);
                          const priceBadge = itemPrice > 0 ? ` (+${itemPrice.toFixed(2).replace('.', ',')} €)` : '';
                          return (
                            <option key={vIdx} value={trimmedVal}>
                              {trimmedVal}{priceBadge}
                            </option>
                          );
                        })}
                      </select>
                    ) : opcType === 'fitxer' || opcType === 'imatge' ? (
                      <div className="space-y-2">
                        <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-surface border border-dashed border-primary/40 hover:border-primary rounded-xl transition-all cursor-pointer text-xs text-primary font-semibold shadow-2xs hover:bg-primary/5">
                          <Paperclip className="w-4 h-4 text-primary shrink-0" />
                          <span>{attachedFiles[key] ? "Canviar fitxer / imatge" : "Adjuntar imatge o logotip (PNG, SVG, JPG, PDF)"}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            onChange={(e) => handleFileUpload(key, e)}
                            className="hidden"
                          />
                        </label>

                        {attachedFiles[key] && (
                          <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {attachedFiles[key].isImage ? (
                                <img src={attachedFiles[key].dataUrl} alt="Preview" className="w-9 h-9 rounded-lg object-cover border border-outline/20 shrink-0 shadow-xs" />
                              ) : (
                                <FileText className="w-7 h-7 text-primary shrink-0" />
                              )}
                              <div className="truncate">
                                <p className="font-semibold text-primary truncate">{attachedFiles[key].fileName}</p>
                                <p className="text-[10px] text-on-surface-variant font-mono">{attachedFiles[key].fileSize}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(key)}
                              className="p-1.5 text-error hover:bg-error-container/30 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Eliminar fitxer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isInitialField ? (
                      <input
                        type="text"
                        maxLength={1}
                        placeholder="Ex: J"
                        value={typeof selectedOptions[key] === 'string' ? selectedOptions[key] : ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-ZÀ-ÜÑ]/gi, '');
                          setSelectedOptions({ ...selectedOptions, [key]: val });
                        }}
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-sm text-primary font-bold tracking-widest outline-none focus:border-primary uppercase"
                      />
                    ) : (opcType === 'memo' || opcType === 'textarea' || opcType === 'textllarg' || isPhraseField) ? (
                      <textarea
                        rows={2}
                        maxLength={isPhraseField ? 80 : 500}
                        placeholder={valorsStr || `Escriu aquí el teu text o observacions.
Pots deixar-ho en blanc si ho prefereixes.`}
                        value={typeof selectedOptions[key] === 'string' ? selectedOptions[key] : ''}
                        onChange={(e) => setSelectedOptions({ ...selectedOptions, [key]: isPhraseField ? e.target.value.slice(0, 80) : e.target.value })}
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-1.5 text-xs text-primary outline-none focus:border-primary font-sans resize-y min-h-[48px]"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={valorsStr || "Escriu la teva opció..."}
                        value={typeof selectedOptions[key] === 'string' ? selectedOptions[key] : ''}
                        onChange={(e) => setSelectedOptions({ ...selectedOptions, [key]: e.target.value })}
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Simulador de Clauer Inicial en Temps Real */}
        {isInicialKeychain && (
          <ProductSimulator
            initialLetter={selectedOptions[initialKey] || ''}
            phraseText={selectedOptions[phraseKey] || ''}
          />
        )}

        {/* Simulador de Puzle en Temps Real */}
        {isPuzzleProduct && (
          <PuzzleSimulator
            productNom={product.nom}
            selectedOptions={selectedOptions}
            userAttachedFile={firstUserFile}
          />
        )}

        {/* Simulador d'Etiqueta i Forats Interactiu */}
        {isEtiquetaProduct && (
          <EtiquetaSimulator
            productNom={product.nom}
            productCodi={product.codi || 'XR'}
            simType={simType}
            midesDisponibles={(() => {
              const opMida = safeOpcions.find(o => String(o?.titol || '').toLowerCase().includes('mida'));
              if (opMida && typeof opMida.valors === 'string') {
                return opMida.valors.split(',').map(s => s.trim()).filter(Boolean);
              }
              return [];
            })()}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            phraseText={simPhraseA}
            phraseTextB={simPhraseB}
          />
        )}

        {/* Preu o Preu Orientatiu */}
        <div className="flex items-baseline gap-3 pt-3 border-t border-outline/10 flex-wrap">
          <span className="text-xs uppercase font-mono tracking-wider text-on-surface-variant font-semibold">
            {isBudgetRequired ? "PREU ORIENTATIU:" : (hasQtyPricing ? "PREU UNITARI:" : (isPreuDesDe ? "PREU DES DE:" : "PREU:"))}
          </span>
          <span className={textPriceValue ? "font-sans text-sm sm:text-base font-semibold text-primary" : "font-sans text-2xl sm:text-3xl font-bold text-primary tracking-tight"}>
            {textPriceValue ? textPriceValue : (isZeroPrice ? "- - -" : `${finalUnitPrice.toFixed(2).replace('.', ',')} €`)}
          </span>
          {!isBudgetRequired && !isZeroPrice && (
            <span className="text-xs text-on-surface-variant/80 font-mono">(IVA inclòs)</span>
          )}
          {!isBudgetRequired && !isZeroPrice && quantity > 1 && (
            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Total: {(finalUnitPrice * quantity).toFixed(2).replace('.', ',')} €
            </span>
          )}
        </div>

        {/* Trams de Preu per Quantitat */}
        {hasQtyPricing && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 font-mono text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Trams de preu per quantitat:</span>
            </div>
            <div className="pl-5 space-y-0.5 text-xs font-mono">
              <p className={`flex items-center gap-2 transition-all ${quantity <= qtyThreshold ? 'text-black dark:text-white font-bold' : 'text-black/60 dark:text-white/60 font-normal'}`}>
                <span>De 1 a {qtyThreshold} unitats = {priceTier1.toFixed(2).replace('.', ',')} €</span>
                {quantity <= qtyThreshold && (
                  <svg className="w-3 h-3 text-red-600 fill-current shrink-0 animate-fadeIn" viewBox="0 0 24 24">
                    <polygon points="22,4 22,20 4,12" />
                  </svg>
                )}
              </p>
              <p className={`flex items-center gap-2 transition-all ${quantity > qtyThreshold ? 'text-black dark:text-white font-bold' : 'text-black/60 dark:text-white/60 font-normal'}`}>
                <span>Més de {qtyThreshold} unitats = {priceTier2.toFixed(2).replace('.', ',')} €</span>
                {quantity > qtyThreshold && (
                  <svg className="w-3 h-3 text-red-600 fill-current shrink-0 animate-fadeIn" viewBox="0 0 24 24">
                    <polygon points="22,4 22,20 4,12" />
                  </svg>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Quantitat i Observacions */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">

            {/* Quantitat */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-on-surface-variant uppercase font-mono">Quantitat:</span>
              <div className="flex items-center border border-outline/25 rounded bg-surface">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-surface-container text-primary transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-xs font-mono font-semibold text-primary">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-surface-container text-primary transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Observacions individuals */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Vols afegir res més?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Termini de fabricació estimat (Just abans del botó) */}
          {(product.terminiFabricacio || product.terminiLliurament) && (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono pt-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Termini de fabricació estimat: <strong>{product.terminiFabricacio || product.terminiLliurament}</strong></span>
            </div>
          )}

          {/* Botó Afegir a la Cistella o Demanar Pressupost */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full sm:w-auto bg-primary text-on-primary px-8 py-3.5 rounded font-body-md text-sm hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {isBudgetRequired ? (
                <>
                  <img src="/images/icon-pressupost.png" alt="" className="w-5 h-5 object-contain brightness-0 invert shrink-0" />
                  <span>Demanar pressupost</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  <span>Afegir a la cistella</span>
                </>
              )}
            </button>

            {addedToast && (
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" /> {isBudgetRequired ? 'Afegit a la sol·licitud de pressupost!' : 'Afegit a la teva cistella!'}
              </span>
            )}
          </div>

          {/* Secció de Valoracions i Comentaris del Producte */}
          <CommentsSection targetId={product.id} targetType="producte" targetTitol={product.nom} />
        </div>
      </div>
    </article>
  );
}
