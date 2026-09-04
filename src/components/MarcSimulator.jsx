import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Upload, Trash2, Smartphone, Monitor } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';
import VisualOptionCarousel from './common/VisualOptionCarousel';
import { analyzeNameContour, buildBottomPath } from '../utils/contourGenerator';

// Els 17 models de marcs gravats disponibles per a Marcs Zenit (abans Tradicional)
export const MARC_MODELS = [
  { id: 'diamants', nom: 'Diamants', fitxer: 'marc_diamants.png', imatge: 'imatges/productes/marc_diamants.png' },
  { id: 'dispersio', nom: 'Dispersió', fitxer: 'marc_dispersió.png', imatge: 'imatges/productes/marc_dispersió.png' },
  { id: 'flors', nom: 'Flors', fitxer: 'marc_flors.png', imatge: 'imatges/productes/marc_flors.png' },
  { id: 'fosc', nom: 'Fosc', fitxer: 'marc_fosc.png', imatge: 'imatges/productes/marc_fosc.png' },
  { id: 'fulles', nom: 'Fulles', fitxer: 'marc_fulles.png', imatge: 'imatges/productes/marc_fulles.png' },
  { id: 'fulletes', nom: 'Fulletes', fitxer: 'marc_fulletes.png', imatge: 'imatges/productes/marc_fulletes.png' },
  { id: 'natural', nom: 'Natural', fitxer: 'marc_natural.png', imatge: 'imatges/productes/marc_natural.png' },
  { id: 'onades', nom: 'Onades', fitxer: 'marc_onades.png', imatge: 'imatges/productes/marc_onades.png' },
  { id: 'organigrama', nom: 'Organigrama', fitxer: 'marc_organigrama.png', imatge: 'imatges/productes/marc_organigrama.png' },
  { id: 'palmera', nom: 'Palmera', fitxer: 'marc_palmera.png', imatge: 'imatges/productes/marc_palmera.png' },
  { id: 'parquet', nom: 'Parquet', fitxer: 'marc_parquet.png', imatge: 'imatges/productes/marc_parquet.png' },
  { id: 'pics', nom: 'Pics', fitxer: 'marc_pics.png', imatge: 'imatges/productes/marc_pics.png' },
  { id: 'psicodelia', nom: 'Psicodèlia', fitxer: 'marc_psicodelia.png', imatge: 'imatges/productes/marc_psicodelia.png' },
  { id: 'puntets', nom: 'Puntets', fitxer: 'marc_puntets.png', imatge: 'imatges/productes/marc_puntets.png' },
  { id: 'punts', nom: 'Punts', fitxer: 'marc_punts.png', imatge: 'imatges/productes/marc_punts.png' },
  { id: 'rusc', nom: 'Rusc', fitxer: 'marc_rusc.png', imatge: 'imatges/productes/marc_rusc.png' },
  { id: 'teulada', nom: 'Teulada', fitxer: 'marc_teulada.png', imatge: 'imatges/productes/marc_teulada.png' }
];

// Els 3 models de Marcs Finestra en l'ordre requerit: Onada, Núvol, Batec
export const FINESTRA_MODELS = [
  { id: 'onada', nom: 'Onada', fitxer: 'marc_finestra_onada.png', imatge: 'imatges/productes/marc_finestra_onada.png' },
  { id: 'nuvol', nom: 'Núvol', fitxer: 'marc_finestra_núvol.png', imatge: 'imatges/productes/marc_finestra_núvol.png' },
  { id: 'batec', nom: 'Batec', fitxer: 'marc_finestra_batec.png', imatge: 'imatges/productes/marc_finestra_batec.png' }
];

// Banc de fotografies reals d'exemple per a marcs verticals (10 models)
export const SAMPLE_PHOTOS_V = [
  'imatges/productes/marc_exemple_v_01.png',
  'imatges/productes/marc_exemple_v_02.png',
  'imatges/productes/marc_exemple_v_03.png',
  'imatges/productes/marc_exemple_v_04.png',
  'imatges/productes/marc_exemple_v_05.png',
  'imatges/productes/marc_exemple_v_06.png',
  'imatges/productes/marc_exemple_v_07.png',
  'imatges/productes/marc_exemple_v_08.png',
  'imatges/productes/marc_exemple_v_09.png',
  'imatges/productes/marc_exemple_v_10.png'
];

// Banc de fotografies reals d'exemple per a marcs horitzontals (10 models)
export const SAMPLE_PHOTOS_H = [
  'imatges/productes/marc_exemple_h_01.png',
  'imatges/productes/marc_exemple_h_02.png',
  'imatges/productes/marc_exemple_h_03.png',
  'imatges/productes/marc_exemple_h_04.png',
  'imatges/productes/marc_exemple_h_05.png',
  'imatges/productes/marc_exemple_h_06.png',
  'imatges/productes/marc_exemple_h_07.png',
  'imatges/productes/marc_exemple_h_08.png',
  'imatges/productes/marc_exemple_h_09.png',
  'imatges/productes/marc_exemple_h_10.png'
];

// Funció per generar una baralla aleatòria de totes les fotos sense repeticions
// Garanteix que la primera imatge d'un nou cicle mai no coincideixi amb l'última del cicle anterior
function generateShuffledDeck(length, lastElement = null) {
  const deck = Array.from({ length }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  // Si la primera del nou cicle coincideix amb l'última de l'anterior, la canviem amb una altra
  if (lastElement !== null && deck.length > 1 && deck[0] === lastElement) {
    const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
  }
  return deck;
}

export const SAMPLE_PHOTOS = SAMPLE_PHOTOS_V;

export default function MarcSimulator({
  productNom = '',
  product = null,
  simType = 'auto',
  variant = null,
  selectedOptions = {},
  setSelectedOptions = () => {},
  attachedFiles = {},
  setAttachedFiles = () => {}
}) {
  // Detecció de si és el simulador de Marcs Finestra o Marcs Zenit (Tradicional)
  const isFinestra = useMemo(() => {
    const nameStr = String(productNom || (product?.nom) || '').toLowerCase();
    if (nameStr.includes('finestra')) return true;
    if (variant === 'finestra' || simType === 'marc_finestra' || simType === 'finestra') return true;
    if (product && (product.simulador === 'marc_finestra' || product.simulador === 'finestra')) return true;
    if (product && Array.isArray(product.gammaIds) && product.gammaIds.some(g => String(g).toLowerCase().includes('finestra'))) return true;
    if (product && Array.isArray(product.familaIds) && product.familaIds.some(f => String(f).toLowerCase().includes('finestra'))) return true;
    if (variant === 'zenit' || simType === 'marc' || simType === 'marc_zenit') return false;
    return false;
  }, [variant, simType, productNom, product]);

  // Models actius segons el tipus de simulador
  const activeModels = isFinestra ? FINESTRA_MODELS : MARC_MODELS;

  // Clau d'opció per al model de marc a selectedOptions
  const optionKey = useMemo(() => {
    const existingKey = Object.keys(selectedOptions).find(k => {
      const lk = k.toLowerCase();
      if (isFinestra) {
        return lk.includes('finestra') || lk.includes('model') || lk.includes('forma') || lk.includes('dibuix');
      }
      return lk.includes('gravat') || lk.includes('dibuix') || lk.includes('model') || lk.includes('marc');
    });
    return existingKey || (isFinestra ? 'Model de finestra' : 'Model de gravat');
  }, [selectedOptions, isFinestra]);

  // Model de marc seleccionat
  const currentSelectedValue = selectedOptions[optionKey] || '';
  const currentModel = useMemo(() => {
    if (!currentSelectedValue) return activeModels[0];
    return activeModels.find(m => 
      m.nom.toLowerCase() === currentSelectedValue.toLowerCase() ||
      m.fitxer.toLowerCase() === currentSelectedValue.toLowerCase() ||
      m.id.toLowerCase() === currentSelectedValue.toLowerCase()
    ) || activeModels[0];
  }, [currentSelectedValue, activeModels]);

  // Orientació: 'Vertical' o 'Horitzontal' (Marcs Finestra sempre és Vertical)
  const [orientation, setOrientation] = useState(() => (isFinestra ? 'Vertical' : (selectedOptions['Orientació'] || 'Vertical')));
  const isHorizontal = isFinestra ? false : orientation === 'Horitzontal';

  // Extreure el text de la primera línia (Nom) i segona línia (Text / Dedicatòria / Data)
  const { nomText, segonaLiniaText } = useMemo(() => {
    if (!selectedOptions || typeof selectedOptions !== 'object') {
      return { nomText: '', segonaLiniaText: '' };
    }

    const reservedWords = ['model', 'finestra', 'gravat', 'orientació', 'mida', 'format', 'foto'];
    
    // 1. Cercar segons l'ordre definit a opcionsPersonalitzacio del producte si existeix
    const productOptions = Array.isArray(product?.opcionsPersonalitzacio) 
      ? product.opcionsPersonalitzacio
          .map((o, idx) => o.titol || o.nom || `Opció ${idx + 1}`)
          .filter(Boolean)
      : [];

    const textProductKeys = productOptions.filter(k => {
      const lk = k.toLowerCase();
      return !reservedWords.some(rw => lk.includes(rw));
    });

    // 2. Totes les claus amb text introduït a selectedOptions
    const activeTextKeys = Object.entries(selectedOptions)
      .filter(([k, v]) => typeof v === 'string' && !reservedWords.some(rw => k.toLowerCase().includes(rw)))
      .map(([k]) => k);

    // Llista unificada de claus candidates en ordre
    const allKeys = Array.from(new Set([...textProductKeys, ...activeTextKeys]));

    let foundNomKey = allKeys.find(k => {
      const lk = k.toLowerCase();
      return lk.includes('nom') || lk.includes('primera') || lk.includes('línia 1') || lk.includes('linea 1') || lk.includes('1');
    }) || allKeys[0];

    let foundSegonaKey = allKeys.find(k => {
      if (k === foundNomKey) return false;
      const lk = k.toLowerCase();
      return lk.includes('segona') || lk.includes('línia 2') || lk.includes('linea 2') || lk.includes('2') || lk.includes('frase') || lk.includes('text') || lk.includes('data') || lk.includes('dedicatòria');
    }) || allKeys.find(k => k !== foundNomKey);

    return {
      nomText: foundNomKey ? String(selectedOptions[foundNomKey] || '').trim() : '',
      segonaLiniaText: foundSegonaKey ? String(selectedOptions[foundSegonaKey] || '').trim() : ''
    };
  }, [selectedOptions, product]);

  // Estat per forçar re-càlcul un cop les tipografies estiguin llestes
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    } else {
      setFontsLoaded(true);
    }
  }, []);

  // Generació de la silueta inferior adaptada al perfil del nom per a Finestra
  const dynamicContour = useMemo(() => {
    if (!isFinestra) return { points: [], bottomPathD: '' };
    const effectiveText = nomText || 'Nom';
    const points = analyzeNameContour(effectiveText, 457, 646);
    const bottomPathD = buildBottomPath(points, currentModel.id);
    return { points, bottomPathD };
  }, [isFinestra, nomText, currentModel.id, fontsLoaded]);

  // Llista de fotos de mostra segons l'orientació activa
  const samplePhotosList = isHorizontal ? SAMPLE_PHOTOS_H : SAMPLE_PHOTOS_V;

  // Estat independent de cues de fotografies per a Vertical i Horitzontal
  // Cada orientació té la seva baralla barrejada (deck) i el punter de posició (pointer)
  const [photoDecks, setPhotoDecks] = useState(() => ({
    Vertical: {
      deck: generateShuffledDeck(SAMPLE_PHOTOS_V.length),
      pointer: 0
    },
    Horitzontal: {
      deck: generateShuffledDeck(SAMPLE_PHOTOS_H.length),
      pointer: 0
    }
  }));

  // Foto personalitzada que l'usuari pot pujar per provar
  const [userCustomPhoto, setUserCustomPhoto] = useState(null);

  // Sincronitzar selecció inicial
  useEffect(() => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => {
        const next = { ...prev };
        let modified = false;
        if (!next[optionKey]) {
          next[optionKey] = activeModels[0]?.nom || '';
          modified = true;
        }
        if (!next['Orientació']) {
          next['Orientació'] = orientation;
          modified = true;
        }
        return modified ? next : prev;
      });
    }
  }, [optionKey, orientation, activeModels]);

  // Avançar a la següent foto del cicle garantint 0 repeticions dins del mateix cicle
  // i evitant que la primera del cicle nou sigui igual a l'última del cicle anterior
  const advancePhoto = (targetOrient = orientation) => {
    setUserCustomPhoto(null);
    setPhotoDecks(prev => {
      const current = prev[targetOrient] || {
        deck: generateShuffledDeck(targetOrient === 'Horitzontal' ? SAMPLE_PHOTOS_H.length : SAMPLE_PHOTOS_V.length),
        pointer: 0
      };
      const photosCount = targetOrient === 'Horitzontal' ? SAMPLE_PHOTOS_H.length : SAMPLE_PHOTOS_V.length;
      let nextDeck = current.deck;
      let nextPointer = current.pointer + 1;

      if (nextPointer >= current.deck.length) {
        // Nou cicle: generem una nova baralla aleatòria on la primera no sigui l'última de l'anterior
        const lastPhotoIdx = current.deck[current.deck.length - 1];
        nextDeck = generateShuffledDeck(photosCount, lastPhotoIdx);
        nextPointer = 0;
      }

      return {
        ...prev,
        [targetOrient]: {
          deck: nextDeck,
          pointer: nextPointer
        }
      };
    });
  };

  // Canviar model de marc i avançar a la següent foto aleatòria sense repeticions
  const handleSelectModel = (model) => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        [optionKey]: model.nom
      }));
    }
    if (!userCustomPhoto) {
      advancePhoto(orientation);
    }
  };

  // Commutar orientació Vertical / Horitzontal
  const handleToggleOrientation = () => {
    const nextOrient = orientation === 'Vertical' ? 'Horitzontal' : 'Vertical';
    setOrientation(nextOrient);
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        'Orientació': nextOrient
      }));
    }
  };

  // Botó per canviar manualment la foto d'exemple
  const handleShufflePhoto = () => {
    advancePhoto(orientation);
  };

  // Pujar foto pròpia de l'usuari
  const handleUploadUserPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUserCustomPhoto(ev.target.result);
      if (setAttachedFiles) {
        setAttachedFiles(prev => ({
          ...prev,
          'Foto per al marc': {
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            dataUrl: ev.target.result,
            isImage: true
          }
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUserPhoto = () => {
    setUserCustomPhoto(null);
    if (setAttachedFiles) {
      setAttachedFiles(prev => {
        const copy = { ...prev };
        delete copy['Foto per al marc'];
        return copy;
      });
    }
  };

  // Obtenir la foto activa segons la baralla i posició actual de l'orientació
  const currentDeckObj = photoDecks[orientation] || photoDecks.Vertical;
  const currentPhotoIndex = currentDeckObj.deck[currentDeckObj.pointer % currentDeckObj.deck.length] ?? 0;
  const activeSamplePhoto = samplePhotosList[currentPhotoIndex] || samplePhotosList[0];
  const currentPhotoUrl = userCustomPhoto || resolveMediaUrl(activeSamplePhoto);
  const currentFrameOverlayUrl = resolveMediaUrl(currentModel.imatge);

  return (
    <div className="space-y-3 my-3">
      {/* 1. Carrusel de Selecció de Models (Finestra o Gravat Zenit) */}
      <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline/15 shadow-xs space-y-2">
        <VisualOptionCarousel
          title={isFinestra ? "Model de finestra" : "Dibuix que es grava al marc"}
          subtitle={isFinestra
            ? "Desplaça't pel carrusel per triar la finestra que més t'agradi:"
            : "Desplaça't pel carrusel per triar el model de gravat que més t'agradi:"}
          options={activeModels}
          selectedId={currentModel.nom}
          onSelect={handleSelectModel}
          itemWidth="w-20 sm:w-24"
          aspectRatio="aspect-[1/1.41]"
          showLabel={true}
        />
      </div>

      {/* 2. Simulador en Temps Real (mida ~2/3 de l'original, cantonades quadrades) */}
      <div className="relative w-full rounded-xl border border-primary/20 bg-gradient-to-b from-surface-container-lowest via-amber-950/5 to-surface-container-lowest p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden shadow-inner select-none animate-fadeIn">
        
        {/* Barra superior de controls i model actiu */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-outline/10 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold text-primary text-xs sm:text-sm">
              Model: <span className="text-amber-800 dark:text-amber-300 font-extrabold">{currentModel.nom}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Botó Orientació Vertical / Horitzontal (Només per a Marcs Zenit / Tradicional; Finestra és sempre vertical) */}
            {!isFinestra && (
              <button
                type="button"
                onClick={handleToggleOrientation}
                className="px-2.5 py-1 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/25 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40"
                title={`Canviar a orientació ${isHorizontal ? 'vertical' : 'horitzontal'}`}
              >
                {isHorizontal ? (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Horitzontal</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Vertical</span>
                  </>
                )}
              </button>
            )}

            {/* Botó Canviar foto d'exemple */}
            <button
              type="button"
              onClick={handleShufflePhoto}
              className="px-2.5 py-1 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/25 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40"
              title="Mostrar una altra fotografia de mostra"
            >
              <RefreshCw className="w-3 h-3 text-primary shrink-0" />
              <span>Canviar foto d'exemple</span>
            </button>

            {/* Pujar foto pròpia */}
            {!userCustomPhoto ? (
              <label className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                <Upload className="w-3 h-3 text-primary shrink-0" />
                <span>Prova la teva foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadUserPhoto}
                  className="hidden"
                />
              </label>
            ) : (
              <button
                type="button"
                onClick={handleRemoveUserPhoto}
                className="px-2 py-1 bg-error-container/30 hover:bg-error-container text-error rounded-lg border border-error/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Tornar a les fotos d'exemple"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>Treure foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Marc Físic amb Cantonades Quadrades (rounded-none) i mida 2/3 */}
        <div className={`relative my-2 w-full transition-all duration-300 flex items-center justify-center ${
          isHorizontal 
            ? 'max-w-[280px] sm:max-w-[310px] aspect-[646/457]' 
            : 'max-w-[200px] sm:max-w-[225px] aspect-[457/646]'
        }`}>
          
          <div className="relative w-full h-full rounded-none overflow-hidden shadow-xl border border-amber-950/30 bg-amber-100/30 dark:bg-amber-950/20">
            
            {/* Capa 1: Fotografia (de mostra o de l'usuari) encaixada exactament al marc interior */}
            <div
              className="absolute z-10 rounded-none overflow-hidden flex items-center justify-center bg-black/5"
              style={
                isFinestra
                  ? {
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0
                    }
                  : (isHorizontal
                      ? {
                          left: `${(51 / 646) * 100}%`,
                          right: `${(51 / 646) * 100}%`,
                          top: `${(51 / 457) * 100}%`,
                          bottom: `${(51 / 457) * 100}%`
                        }
                      : {
                          left: `${(51 / 457) * 100}%`,
                          right: `${(51 / 457) * 100}%`,
                          top: `${(51 / 646) * 100}%`,
                          bottom: `${(51 / 646) * 100}%`
                        })
              }
            >
              {currentPhotoUrl ? (
                <img
                  key={currentPhotoUrl + (isHorizontal ? '-h' : '-v')}
                  src={currentPhotoUrl}
                  alt="Fotografia emmarcada"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className="text-xs text-on-surface-variant/70 font-mono text-center p-2">
                  Fotografia
                </div>
              )}
            </div>

            {/* Capa 2: Marc de Fusta Gravat */}
            {isHorizontal ? (
              /* En horitzontal: el marc es gira 90 graus per encaixar de forma exacta (Zenit) */
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden">
                <img
                  key={currentFrameOverlayUrl + '-horiz'}
                  src={currentFrameOverlayUrl}
                  alt={`Marc ${currentModel.nom}`}
                  className="max-w-none max-h-none object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(43,24,13,0.35)] rotate-90 origin-center"
                  style={{
                    width: '70.743%',
                    height: '141.357%'
                  }}
                />
              </div>
            ) : (
              /* En vertical: el marc s'ajusta directament a la mida completa */
              <div className="absolute inset-0 z-30 pointer-events-none">
                {/* Per al model Onada de Finestra: es genera completament en vectorial amb fusta de til·ler i filet làser per eliminar qualsevol interferència de línies estàtiques */}
                {isFinestra && currentModel.id === 'onada' ? (
                  <svg
                    viewBox="0 0 457 646"
                    className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_1px_2px_rgba(43,24,13,0.35)]"
                    style={{ zIndex: 35 }}
                  >
                    <defs>
                      <pattern id="tilLerWoodPatternOnada" patternUnits="userSpaceOnUse" width="457" height="646" y="0">
                        <image
                          href="/images/fusta_de_til%C2%B7ler.png"
                          x="0"
                          y="0"
                          width="457"
                          height="646"
                          preserveAspectRatio="none"
                        />
                      </pattern>
                    </defs>

                    {/* Marc complet de fusta amb obertura interior adaptada a l'onada dinàmica */}
                    <path
                      d={`M 0 0 L 457 0 L 457 646 L 0 646 Z M 54 59 L 54 498 ${dynamicContour.bottomPathD || 'L 54 498'} L 403 59 Z`}
                      fill="url(#tilLerWoodPatternOnada)"
                      fillRule="evenodd"
                    />

                    {/* Filet de tall làser (#473636 / rgb(71, 54, 54)) que perfila tota la finestra interior incloent l'onada */}
                    <path
                      d={`M 54 59 L 54 498 ${dynamicContour.bottomPathD || 'L 54 498'} L 403 59 Z`}
                      fill="none"
                      stroke="#473636"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <>
                    <img
                      key={currentFrameOverlayUrl + '-vert'}
                      src={currentFrameOverlayUrl}
                      alt={`Marc ${currentModel.nom}`}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(43,24,13,0.35)]"
                      style={isFinestra ? { clipPath: 'polygon(0% 0%, 100% 0%, 100% 77.09%, 0% 77.09%)' } : undefined}
                    />

                    {/* Per a Marc Finestra (Núvol i Batec): Capa inferior de fusta de til·ler amb filet de tall làser #473636 que s'adapta al perfil del nom */}
                    {isFinestra && dynamicContour.bottomPathD && (
                      <svg
                        viewBox="0 0 457 646"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ zIndex: 35 }}
                      >
                        <defs>
                          {/* Patró de textura de fusta de til·ler aplicat a la zona inferior */}
                          <pattern id="tilLerWoodPattern" patternUnits="userSpaceOnUse" width="457" height="646" y="0">
                            <image
                              href="/images/fusta_de_til%C2%B7ler.png"
                              x="0"
                              y="0"
                              width="457"
                              height="646"
                              preserveAspectRatio="none"
                            />
                          </pattern>
                        </defs>

                        {/* Faldó de fusta inferior que s'uneix als laterals a Y=498 */}
                        <path
                          d={`M 0 646 L 0 498 L 54 498 ${dynamicContour.bottomPathD} L 403 498 L 457 498 L 457 646 Z`}
                          fill="url(#tilLerWoodPattern)"
                        />

                        {/* Filet de tall làser (#473636 / rgb(71, 54, 54)) que perfila la corba dinàmica del nom */}
                        <path
                          d={`M 54 498 ${dynamicContour.bottomPathD} L 403 498`}
                          fill="none"
                          stroke="#473636"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Capa 2.5: Text personalitzat per a Marcs Finestra */}
            {isFinestra && (
              <>
                {/* Quadrat 1: Nom (Opció 1) amb tipologia Modernline Bold a la zona de fusta sota la silueta */}
                <div
                  className="absolute pointer-events-none flex items-center justify-center text-center px-2"
                  style={{
                    zIndex: 45,
                    top: '73%',
                    bottom: '8.5%',
                    left: '4%',
                    right: '4%',
                    overflow: 'visible'
                  }}
                >
                  {nomText ? (
                    <span
                      className="font-bold select-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-200 whitespace-nowrap overflow-visible max-w-full"
                      style={{
                        fontFamily: "'Modernline Bold', 'Modernline', cursive, sans-serif",
                        fontWeight: 'bold',
                        fontSize: nomText.length > 20 ? '1.05rem' : (nomText.length > 14 ? '1.25rem' : (nomText.length > 9 ? '1.55rem' : '1.95rem')),
                        color: '#1a0d05',
                        lineHeight: 1.25,
                        display: 'inline-block'
                      }}
                    >
                      {nomText}
                    </span>
                  ) : (
                    <span
                      className="text-primary/40 italic font-bold select-none text-xs border border-dashed border-primary/30 rounded px-1.5 py-0.5 bg-amber-50/20 whitespace-nowrap"
                      style={{ fontFamily: "'Modernline Bold', 'Modernline', cursive, sans-serif", fontWeight: 'bold', lineHeight: 1.25 }}
                    >
                      Nom (Modernline Bold)
                    </span>
                  )}
                </div>

                {/* Quadrat 2: Segona línia (Opció 2) amb tipologia Montserrat al llindar inferior de fusta */}
                <div
                  className="absolute pointer-events-none flex items-center justify-center text-center px-2"
                  style={{
                    zIndex: 45,
                    top: '91%',
                    bottom: '1%',
                    left: '4%',
                    right: '4%',
                    overflow: 'visible'
                  }}
                >
                  {segonaLiniaText ? (
                    <span
                      className="font-semibold tracking-wider select-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 whitespace-nowrap overflow-visible max-w-full"
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: segonaLiniaText.length > 28 ? '0.55rem' : (segonaLiniaText.length > 18 ? '0.65rem' : '0.75rem'),
                        color: '#1a0d05',
                        lineHeight: 1.2
                      }}
                    >
                      {segonaLiniaText}
                    </span>
                  ) : (
                    <span
                      className="text-primary/40 font-medium tracking-wider select-none text-[8px] border border-dashed border-primary/25 rounded px-1 py-0.5 bg-amber-50/20 whitespace-nowrap"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      Segona línia (Montserrat)
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Capa 3: Marc exterior i relleu net amb cantonades quadrades */}
            <div className="absolute inset-0 z-40 pointer-events-none rounded-none border border-black/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.3)]" />

          </div>
        </div>

      </div>
    </div>
  );
}
