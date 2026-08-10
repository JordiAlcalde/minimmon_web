import React, { useState, useEffect } from 'react';
import { STITCH_GIFTS } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { renderFormattedText } from '../utils/textUtils';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag, Plus, Minus, Check, Clock, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { DEFAULT_FAMILIES, getEffectiveProductOrder } from './PrivateAreaSection';

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

  // Quan es clica el botó "CATÀLEG DE REGALS" a la navbar, es recarrega la portada principal del catàleg
  useEffect(() => {
    if (catalogResetKey > 0) {
      setCurrentView('catalog');
      setSelectedFamilia('Tots');
      setSelectedGamma('Tots');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [catalogResetKey]);

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
    if (selectedFamilia === 'Tots' && selectedGamma === 'Tots') return true;

    if (selectedGamma !== 'Tots') {
      const matchGam = (p.gammaIds || []).some(g => g.toLowerCase().includes(selectedGamma.toLowerCase()));
      if (matchGam) return true;
    }
    if (selectedFamilia !== 'Tots') {
      const matchFam = (p.gammaIds || []).some(g => g.toLowerCase().includes(selectedFamilia.toLowerCase())) ||
        (p.familaIds || []).some(f => f.toLowerCase().includes(selectedFamilia.toLowerCase())) ||
        p.nom.toLowerCase().includes(selectedFamilia.toLowerCase());
      if (matchFam && selectedGamma === 'Tots') return true;
    }
    return false;
  }).sort((a, b) => {
    const gamFilter = selectedGamma !== 'Tots' ? selectedGamma : null;
    const ordA = getEffectiveProductOrder(a, gamFilter);
    const ordB = getEffectiveProductOrder(b, gamFilter);
    if (ordA !== ordB) return ordA - ordB;

    return (a.codi || '').localeCompare(b.codi || '');
  });

  // Obtenir la imatge activa per a la miniatura del filtre (amb fallback a images/tots_productes.jpg)
  const currentFamObj = activeFamilies.find(f => f.nom.toLowerCase() === selectedFamilia.toLowerCase());
  const activeFamilyImage = currentFamObj?.imatge 
    ? resolveMediaUrl(currentFamObj.imatge) 
    : resolveMediaUrl('images/tots_productes.jpg');

  // Obtenir les gammes disponibles per a la família seleccionada
  const getSubGammesForSelectedFamily = () => {
    if (selectedFamilia === 'Tots') return [];

    return dbGammes
      .filter(g => g.familiaNom && g.familiaNom.toLowerCase().includes(selectedFamilia.toLowerCase()))
      .sort((a, b) => (a.ordre || 1) - (b.ordre || 1))
      .map(g => g.nom);
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
                g.familiaNom && g.familiaNom.toLowerCase().includes(fam.nom.toLowerCase())
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
                  {activeFamilies.map(famObj => {
                    const fam = famObj.nom;
                    const isActive = selectedFamilia.toLowerCase() === fam.toLowerCase();
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
                      const isGamActive = selectedGamma.toLowerCase() === gam.toLowerCase();
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
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))
            )}
          </section>
        </div>
      )}

      {/* Custom Order Callout */}
      <div className="mt-20 max-w-xl mx-auto text-center px-6">
        <h3 className="font-serif text-2xl text-primary mb-3">Busques un detall totalment a mida?</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          Tot el catàleg es pot adaptar amb noms, dates, frases o dissenys exclusius en marcatge làser.
        </p>
        <button
          onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="bg-primary text-on-primary px-8 py-3.5 rounded-DEFAULT font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer"
        >
          Demana la teva personalització
        </button>
      </div>
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

// Subcomponent per a cada Fitxa de Producte amb opcions de personalització i quantitat
function ProductCard({ product, onAddToCart }) {
  // Llista d'imatges vàlides
  const rawImages = (product.imatges && product.imatges.length > 0) ? product.imatges : [product.imatgePrincipal].filter(Boolean);
  const imagesList = rawImages.filter(isValidImagePath).length > 0 ? rawImages.filter(isValidImagePath) : rawImages;

  // Imatge principal per defecte (privilegia la primera imatge vàlida)
  const defaultMainImage = (isValidImagePath(product.imatgePrincipal) ? product.imatgePrincipal : null) || imagesList[0] || product.imatgePrincipal || '';

  const [selectedImg, setSelectedImg] = useState(defaultMainImage);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = {};
    (product.opcionsPersonalitzacio || []).forEach(opc => {
      if (opc.tipus === 'desplegable' && opc.valors) {
        const valorsArr = opc.valors.split(',').map(s => s.trim());
        initial[opc.titol] = valorsArr[0] || '';
      } else {
        initial[opc.titol] = '';
      }
    });
    return initial;
  });
  const [addedToast, setAddedToast] = useState(false);

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
    <article className="bg-surface-container-lowest rounded-xl border border-outline/15 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-start">

      {/* Columna Imatges (5 cols) */}
      <div className="md:col-span-5 space-y-4">
        <div className="aspect-square bg-surface-container rounded-lg overflow-hidden border border-outline/10 shadow-xs relative">
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
        <div>
          <h2 className="font-serif text-2xl md:text-3xl text-primary font-semibold">{product.nom}</h2>
        </div>

        {/* Descripció Formatada (Rich Text) */}
        <div className="text-on-surface-variant text-sm leading-relaxed border-t border-outline/10 pt-4">
          {renderFormattedText(product.descripcio)}
        </div>

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
            <h4 className="text-xs uppercase tracking-wider font-semibold text-primary font-mono">PERSONALITZA AL TEU GUST:</h4>

            <div className="flex flex-col gap-3">
              {product.opcionsPersonalitzacio.map((opc, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="block text-xs font-medium text-on-surface-variant">{opc.titol}</label>
                  {opc.tipus === 'desplegable' && opc.valors ? (
                    <select
                      value={selectedOptions[opc.titol] || ''}
                      onChange={(e) => setSelectedOptions({ ...selectedOptions, [opc.titol]: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans"
                    >
                      {opc.valors.split(',').map((val, vIdx) => (
                        <option key={vIdx} value={val.trim()}>{val.trim()}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={opc.valors || "Escriu la teva opció..."}
                      value={selectedOptions[opc.titol] || ''}
                      onChange={(e) => setSelectedOptions({ ...selectedOptions, [opc.titol]: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
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
              <ShoppingBag className="w-4 h-4" />
              <span>Demanar Pressupost (+ Afegir a la Cistella)</span>
            </button>

            {addedToast && (
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" /> Afegit a la teva cistella!
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
