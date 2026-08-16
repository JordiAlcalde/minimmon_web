import React, { useState, useEffect } from 'react';
import { STITCH_GIFTS } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { renderFormattedText } from '../utils/textUtils';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag, Plus, Minus, Check, Clock, ArrowLeft, ArrowRight, Sparkles, Upload, FileText, Trash2, Paperclip, Share2, Info, X, ChevronDown } from 'lucide-react';
import { DEFAULT_FAMILIES, getEffectiveProductOrder } from './PrivateAreaSection';
import { copyDirectLink } from '../utils/shareUtils';
import ProductSimulator from './ProductSimulator';
import PuzzleSimulator from './PuzzleSimulator';
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

export default function RegalsCatalogSection({ setActiveTab, catalogResetKey }) {
  const { addToCart } = useBudget();
  const [dbProducts, setDbProducts] = useState([]);
  const [dbGammes, setDbGammes] = useState([]);
  const [dbFamilies, setDbFamilies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegació de dues pàgines: 'catalog' (Vista principal de blocs de famílies) | 'products' (Vista detallada de productes)
  const [currentView, setCurrentView] = useState('catalog');
  const [selectedFamilia, setSelectedFamilia] = useState('Tots');
  const [selectedGamma, setSelectedGamma] = useState('Tots');

  const [selectedModalImage, setSelectedModalImage] = useState(null);

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
        setDbGammes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    const qFam = query(collection(db, "families"), orderBy("ordre", "asc"));
    const unsubFam = onSnapshot(qFam, (snapshot) => {
      if (!snapshot.empty) {
        setDbFamilies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    return () => {
      unsubProd();
      unsubGam();
      unsubFam();
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

  // Filtrar i ordenar productes per la jerarquia Família / Gamma / Ordre
  const filteredProducts = dbProducts.filter(p => {
    if (!p) return false;
    if (p.actiu === false) return false;
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
  }).sort((a, b) => {
    const gamFilter = selectedGamma !== 'Tots' ? selectedGamma : null;
    const ordA = getEffectiveProductOrder(a, gamFilter);
    const ordB = getEffectiveProductOrder(b, gamFilter);
    if (ordA !== ordB) return ordA - ordB;

    return String(a?.codi || '').localeCompare(String(b?.codi || ''));
  });

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
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest block mb-2 font-semibold">Catàleg d'Artesania</span>
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
                  className="group block relative overflow-hidden rounded-xl aspect-[4/3] bg-surface-container-low transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer border border-outline/10 shadow-md"
                >
                  {/* Fotografia de Fons de la Família */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
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
        <div className="space-y-10 animate-fadeIn">

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

          {/* Grid de Productes en Detall */}
          <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-10">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-outline/15 p-8">
                <p className="font-serif text-lg text-primary">No s'han trobat peces per al filtre triat.</p>
                <button
                  onClick={() => { setSelectedFamilia('Tots'); setSelectedGamma('Tots'); }}
                  className="mt-4 text-xs text-primary underline cursor-pointer font-semibold"
                >
                  Mostrar tot el catàleg
                </button>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCardErrorBoundary key={product.id || product.nom}>
                  <ProductCard
                    product={product}
                    onAddToCart={addToCart}
                    selectedGamma={selectedGamma}
                    dbGammes={dbGammes}
                    onSelectImageModal={setSelectedModalImage}
                  />
                </ProductCardErrorBoundary>
              ))
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
      {selectedModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
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
        </div>
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
function ProductCard({ product, onAddToCart, selectedGamma = 'Tots', dbGammes = [], onSelectImageModal }) {
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

  // Aquest desplegable només apareix si la llista de productes NO està filtrada per la gamma del producte
  const shouldShowMoreInfoAccordion = selectedGamma === 'Tots' && hasGammaCommonData;

  // Llista d'imatges vàlides (Garanteix que rawImages sigui SEMPRE un Array)
  const rawImages = Array.isArray(product.imatges)
    ? product.imatges
    : (typeof product.imatges === 'string' && product.imatges.trim() ? [product.imatges.trim()] : [product.imatgePrincipal].filter(Boolean));

  const validImgs = Array.isArray(rawImages) ? rawImages.filter(isValidImagePath) : [];
  const imagesList = validImgs.length > 0 ? validImgs : (Array.isArray(rawImages) ? rawImages : []);

  // Imatge principal per defecte (privilegia la primera imatge vàlida)
  const defaultMainImage = (isValidImagePath(product.imatgePrincipal) ? product.imatgePrincipal : null) || imagesList[0] || product.imatgePrincipal || '';

  const [selectedImg, setSelectedImg] = useState(defaultMainImage);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
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

  // Detectar si el producte és específicament el clauer "Inicial" o un Puzle (ex: "Puzle 4x4", "Puzle 5x5", "Puzle 8x8")
  const isInicialKeychain = String(product.nom || '').toLowerCase().includes('inicial');
  const isPuzzleProduct = String(product.nom || '').toLowerCase().includes('puzle') && /\d+\s*x\s*\d+/i.test(product.nom);

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

  const simInitial = typeof selectedOptions[initialKey] === 'string' ? selectedOptions[initialKey] : '';
  const simPhrase = typeof selectedOptions[phraseKey] === 'string' ? selectedOptions[phraseKey] : '';

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
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
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

  const handleAdd = () => {
    onAddToCart({
      producteId: product.id,
      nom: product.nom,
      imatge: currentDisplayImg || product.imatgePrincipal,
      quantitat: quantity,
      observacions: notes,
      opcionsTriades: selectedOptions,
      terminiFabricacio: product.terminiFabricacio || ''
    });

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  return (
    <article id={`producte-${product.id}`} className="bg-surface-container-lowest rounded-xl border border-outline/15 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 p-6 md:p-8 items-start">

      {/* Títol del Producte en vista Mòbil (es mostra A DALT de la imatge com a inici de la fitxa) */}
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
        {/* Títol del Producte en vista Desktop (ocult en mòbil per evitar duplicitat) */}
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

        {/* Descripció Formatada (Rich Text) */}
        <div className="text-on-surface-variant text-sm leading-relaxed border-t border-outline/10 pt-4">
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
          <div className="space-y-3 pt-3 border-t border-outline/10">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-primary font-mono">
              {(isInicialKeychain || isPuzzleProduct) ? "PERSONALITZACIÓ - Mira el simulador en temps real:" : "PERSONALITZACIÓ:"}
            </h4>

            <div className="flex flex-col gap-3">
              {(product.opcionsPersonalitzacio || []).map((opc, idx) => {
                if (!opc || typeof opc !== 'object') return null;
                const key = opc.titol || opc.nom || `Opció ${idx + 1}`;
                const opcType = (opc.tipus || '').toLowerCase();
                const valorsStr = typeof opc.valors === 'string' ? opc.valors : '';
                const lowerKey = key.toLowerCase();
                const isInitialField = isInicialKeychain && (lowerKey.includes('inicial') || lowerKey.includes('lletra') || (lowerKey.includes('cara a') && !lowerKey.includes('text')));
                const isPhraseField = (isInicialKeychain && (lowerKey.includes('frase') || lowerKey.includes('cara b'))) || lowerKey.includes('dedicatòria') || opcType === 'textarea';

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-medium text-on-surface-variant">
                        {key}
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
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans"
                      >
                        {valorsStr.split(',').map((val, vIdx) => (
                          <option key={vIdx} value={val.trim()}>{val.trim()}</option>
                        ))}
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
                    ) : isPhraseField ? (
                      <textarea
                        rows={3}
                        maxLength={80}
                        placeholder={`Escriu aquí el teu missatge.
Pots deixar-ho en blanc, si ho prefereixes.`}
                        value={typeof selectedOptions[key] === 'string' ? selectedOptions[key] : ''}
                        onChange={(e) => setSelectedOptions({ ...selectedOptions, [key]: e.target.value.slice(0, 80) })}
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans resize-none"
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

        {/* Termini de fabricació estimat (Ubicat just abans de la quantitat) */}
        {product.terminiFabricacio && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono pt-3 border-t border-outline/10">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Termini de fabricació estimat: <strong>{product.terminiFabricacio}</strong></span>
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

          {/* Botó Afegir al Pressupost */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full sm:w-auto bg-primary text-on-primary px-8 py-3.5 rounded font-body-md text-sm hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <img src="/images/icon-pressupost.png" alt="" className="w-5 h-5 object-contain brightness-0 invert shrink-0" />
              <span>Demanar pressupost</span>
            </button>

            {addedToast && (
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" /> Afegit a la teva cistella!
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
