import React, { useState, useEffect } from 'react';
import { STITCH_GIFTS, DEFAULT_BRANQUES } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { renderFormattedText } from '../utils/textUtils';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag, Plus, Minus, Check, Clock, Sparkles } from 'lucide-react';

export default function RegalsCatalogSection({ setActiveTab }) {
  const { addToCart } = useBudget();
  const [dbProducts, setDbProducts] = useState([]);
  const [dbBranques, setDbBranques] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres de Família i Gamma
  const [selectedFamilia, setSelectedFamilia] = useState('Tots');
  const [selectedGamma, setSelectedGamma] = useState('Tots');

  // Carregar Productes des de Firestore (amb fallback als regals inicials)
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
          familaIds: [g.title.includes('Jocs') ? 'Jocs i creativitat' : g.title.includes('Records') ? 'Records i fotografia' : 'Complements'],
          gammaIds: g.items || [],
          terminiFabricacio: '3 - 5 dies feiners',
          opcionsPersonalitzacio: [
            { tipus: 'desplegable', titol: 'Material de Fusta', valors: 'Fusta de Noguer, Roure natural, Bedoll' },
            { tipus: 'text', titol: 'Text o Nom a gravar', valors: 'Escriu el nom o frase curta...' }
          ]
        })));
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    const qBranca = query(collection(db, "branques"), orderBy("ordre", "asc"));
    const unsubBranca = onSnapshot(qBranca, (snapshot) => {
      if (!snapshot.empty) {
        setDbBranques(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setDbBranques(DEFAULT_BRANQUES);
      }
    });

    return () => {
      unsubProd();
      unsubBranca();
    };
  }, []);

  // Llista de Famílies i Gammes disponibles
  const families = ['Tots', 'Jocs i creativitat', 'Records i fotografia', 'Complements i quotidiana', 'Dates assenyalades'];
  const gammesByFamilia = {
    'Jocs i creativitat': ['Puzles', 'Jocs tradicionals', 'Infantil'],
    'Records i fotografia': ['Clauers', 'Cartells i plaques', 'Marcs de fotos'],
    'Complements i quotidiana': ['Caixes gravades', 'Embalatges', 'Miscel·lània'],
    'Dates assenyalades': ['Sant Jordi', 'Dia del Pare', 'Nadal']
  };

  // Filtrar productes
  const filteredProducts = dbProducts.filter(p => {
    if (selectedFamilia !== 'Tots') {
      const matchFam = (p.familaIds || []).some(f => f.toLowerCase().includes(selectedFamilia.toLowerCase()) || selectedFamilia.toLowerCase().includes(f.toLowerCase()));
      if (!matchFam && !p.nom.toLowerCase().includes(selectedFamilia.toLowerCase())) return false;
    }
    if (selectedGamma !== 'Tots') {
      const matchGam = (p.gammaIds || []).some(g => g.toLowerCase().includes(selectedGamma.toLowerCase()));
      if (!matchGam && !p.nom.toLowerCase().includes(selectedGamma.toLowerCase()) && !(p.descripcio || '').toLowerCase().includes(selectedGamma.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="pt-28 pb-24 animate-fadeIn">
      {/* Hero Header */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 text-center">
        <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest block mb-2 font-semibold">Catàleg d'Artesania</span>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">
          Obsequis i Regals:<br />petites peces amb ànima.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Descobreix la nostra selecció de peces úniques en fusta. Tria les teves peces i opcions per confeccionar una <strong className="text-primary font-semibold">Cistella de Pressupostos</strong> personalitzada sense cap compromís.
        </p>
      </section>

      {/* Subcategories Navigation Bar */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-12">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 shadow-sm space-y-6">
          
          {/* Famílies (Nivell 1) */}
          <div>
            <span className="text-xs uppercase font-mono font-semibold text-outline tracking-wider block mb-3">Famílies:</span>
            <div className="flex flex-wrap gap-2">
              {families.map(fam => (
                <button
                  key={fam}
                  onClick={() => {
                    setSelectedFamilia(fam);
                    setSelectedGamma('Tots');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    selectedFamilia === fam 
                      ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30' 
                      : 'bg-surface hover:bg-surface-container text-on-surface-variant border border-outline/20'
                  }`}
                >
                  {fam}
                </button>
              ))}
            </div>
          </div>

          {/* Gammes (Nivell 2) - Si s'ha triat una família específica */}
          {selectedFamilia !== 'Tots' && gammesByFamilia[selectedFamilia] && (
            <div className="pt-4 border-t border-outline/10 animate-fadeIn">
              <span className="text-xs uppercase font-mono font-semibold text-outline tracking-wider block mb-3">
                Gammes de "{selectedFamilia}":
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGamma('Tots')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    selectedGamma === 'Tots' 
                      ? 'bg-primary/20 text-primary font-bold border border-primary/40' 
                      : 'bg-surface hover:bg-surface-container text-on-surface-variant border border-outline/15'
                  }`}
                >
                  Tots els de {selectedFamilia}
                </button>
                {gammesByFamilia[selectedFamilia].map(gam => (
                  <button
                    key={gam}
                    onClick={() => setSelectedGamma(gam)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedGamma === gam 
                        ? 'bg-primary/20 text-primary font-bold border border-primary/40' 
                        : 'bg-surface hover:bg-surface-container text-on-surface-variant border border-outline/15'
                    }`}
                  >
                    {gam}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtre actiu indicator */}
          <div className="flex justify-between items-center pt-2 text-xs text-on-surface-variant font-mono">
            <span>
              Filtre actiu: <strong className="text-primary font-semibold">{selectedFamilia} {selectedGamma !== 'Tots' ? `/ ${selectedGamma}` : ''}</strong>
            </span>
            <span>{filteredProducts.length} {filteredProducts.length === 1 ? 'producte trobat' : 'productes trobats'}</span>
          </div>
        </div>
      </section>

      {/* Grid of Product Cards */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-12">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-outline/15 p-8">
            <p className="font-serif text-lg text-primary">No s'han trobat peces en aquesta gamma.</p>
            <button
              onClick={() => { setSelectedFamilia('Tots'); setSelectedGamma('Tots'); }}
              className="mt-4 text-xs text-primary underline cursor-pointer"
            >
              Veure totes les peces del catàleg
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))
        )}
      </section>

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

// Subcomponent per a cada Fitxa de Producte/Regal amb selecció d'opcions
function ProductCard({ product, onAddToCart }) {
  const [selectedImg, setSelectedImg] = useState(product.imatgePrincipal || (product.imatges && product.imatges[0]) || '');
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

  const imagesList = product.imatges && product.imatges.length > 0 ? product.imatges : [product.imatgePrincipal].filter(Boolean);

  const handleAdd = () => {
    onAddToCart({
      producteId: product.id,
      nom: product.nom,
      imatge: selectedImg || product.imatgePrincipal,
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
        <div className="aspect-[4/3] bg-surface-container rounded-lg overflow-hidden border border-outline/10 shadow-xs relative">
          {selectedImg ? (
            <img 
              src={resolveMediaUrl(selectedImg)} 
              alt={product.nom} 
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline text-xs">Sense imatge</div>
          )}
          {product.codi && (
            <span className="absolute top-3 left-3 bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-mono font-bold text-primary border border-primary/20">
              {product.codi}
            </span>
          )}
        </div>

        {/* Galeria de miniatures (Fins a 5 imatges) */}
        {imagesList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imagesList.slice(0, 5).map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImg(imgUrl)}
                className={`w-14 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  selectedImg === imgUrl ? 'border-primary shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
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
          {product.terminiFabricacio && (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Termini de fabricació estimat: <strong>{product.terminiFabricacio}</strong></span>
            </div>
          )}
        </div>

        {/* Descripció Formatada (Rich Text) */}
        <div className="text-on-surface-variant text-sm leading-relaxed border-t border-outline/10 pt-4">
          {renderFormattedText(product.descripcio)}
        </div>

        {/* Opcions de Personalització */}
        {(product.opcionsPersonalitzacio || []).length > 0 && (
          <div className="space-y-3 pt-3 border-t border-outline/10">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-primary font-mono">Opcions de Personalització:</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.opcionsPersonalitzacio.map((opc, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="block text-xs font-medium text-on-surface-variant">{opc.titol}</label>
                  {opc.tipus === 'desplegable' && opc.valors ? (
                    <select
                      value={selectedOptions[opc.titol] || ''}
                      onChange={(e) => setSelectedOptions({ ...selectedOptions, [opc.titol]: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary outline-none focus:border-primary"
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

        {/* Quantitat i Observacions */}
        <div className="space-y-3 pt-3 border-t border-outline/10">
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
                placeholder="Observacions o gravat personalitzat..."
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
