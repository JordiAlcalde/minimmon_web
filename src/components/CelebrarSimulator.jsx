import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';
import FontSelectorDropdown, { AVAILABLE_FONTS } from './FontSelectorDropdown';

/**
 * Processa una imatge de client per donar-li efecte de gravat làser transparent i monocrom sobre fusta
 */
function processImageToLaserEngraving(imageSource, callback) {
  if (!imageSource) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(imageSource);
        return;
      }

      // Resolució estàndard per a renderitzat nítid i ràpid
      const maxDim = 400;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Llindar de lluminositat i conversió a to de gravat làser sobre fusta noble (#2B180D)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 25) {
          data[i + 3] = 0;
          continue;
        }

        // Lluminositat percebuda
        const lum = (0.299 * r + 0.587 * g + 0.114 * b);

        // Fons blanc o molt clar -> Transparent
        if (lum > 225) {
          data[i + 3] = 0;
        } else {
          // Pixels més foscos -> Color cremat làser fusta noble
          const darkness = 1 - (lum / 255);
          data[i] = 43;     // R: #2B
          data[i + 1] = 24; // G: #18
          data[i + 2] = 13; // B: #0D
          data[i + 3] = Math.min(255, Math.round(a * (0.45 + darkness * 0.55)));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      callback(canvas.toDataURL('image/png'));
    } catch (e) {
      console.warn("No s'ha pogut processar el filtre de gravat canvas:", e);
      callback(imageSource);
    }
  };
  img.onerror = () => {
    callback(imageSource);
  };
  img.src = imageSource;
}

export default function CelebrarSimulator({
  productNom = '',
  selectedOptions = {},
  setSelectedOptions = () => {},
  attachedFiles = {},
  setAttachedFiles = () => {}
}) {
  // Cara activa a la vista: 'caraA' (Anterior / Frontal) o 'caraB' (Posterior)
  const [activeSide, setActiveSide] = useState('caraA');
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlipPiece = () => {
    const nextSide = activeSide === 'caraA' ? 'caraB' : 'caraA';
    setActiveSide(nextSide);
    setIsFlipped(nextSide === 'caraB');
  };

  // Tipografia seleccionada per al gravat
  const selectedFontName = selectedOptions['Tipografia'] || selectedOptions['Font'] || AVAILABLE_FONTS[0].name;
  const currentFontObj = useMemo(() => {
    return AVAILABLE_FONTS.find(f => f.name === selectedFontName || f.id === selectedFontName) || AVAILABLE_FONTS[0];
  }, [selectedFontName]);

  // Sincronitzar tipografia per defecte si no està definida
  useEffect(() => {
    if (setSelectedOptions && !selectedOptions['Tipografia'] && !selectedOptions['Font']) {
      setSelectedOptions(prev => ({
        ...prev,
        'Tipografia': AVAILABLE_FONTS[0].name
      }));
    }
  }, []);

  const handleSelectFont = (fontName) => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        'Tipografia': fontName
      }));
    }
  };

  // Mida del text gravat (Petita, Mitjana, Gran)
  const selectedFontSize = selectedOptions['Mida de la font'] || selectedOptions['Mida del text'] || 'Mitjana';

  const handleSelectFontSize = (sizeLabel) => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        'Mida de la font': sizeLabel
      }));
    }
  };

  // 1. Extreure Text Cara Anterior (Frontal) directament de les opcions del producte
  const textA = useMemo(() => {
    const keys = Object.keys(selectedOptions || {});
    // Cercar opció que contingui frontal / cara a / anterior / davanter
    const keyA = keys.find(k => {
      const kl = k.toLowerCase();
      return (kl.includes('frontal') || kl.includes('cara a') || kl.includes('anterior') || kl.includes('davanter')) && 
             !kl.includes('imatge') && !kl.includes('logo') && !kl.includes('fitxer') && !kl.includes('arxiu') && !kl.includes('mida') && !kl.includes('font');
    });
    if (keyA && typeof selectedOptions[keyA] === 'string') return selectedOptions[keyA];

    // Fallback: primer camp de text que no sigui posterior ni mida ni font
    const genericTextKey = keys.find(k => {
      const kl = k.toLowerCase();
      return (kl.includes('text') || kl.includes('nom') || kl.includes('frase') || kl.includes('dedicat')) && 
             !kl.includes('posterior') && !kl.includes('cara b') && !kl.includes('revers') && !kl.includes('darrere') &&
             !kl.includes('mida') && !kl.includes('font') && !kl.includes('tipografia');
    });
    if (genericTextKey && typeof selectedOptions[genericTextKey] === 'string') return selectedOptions[genericTextKey];

    return selectedOptions['Text cara frontal'] || selectedOptions['Text Cara Frontal'] || selectedOptions['Cara A'] || selectedOptions['Text Frontal'] || '';
  }, [selectedOptions]);

  // 2. Extreure Text Cara Posterior directament de les opcions del producte
  const textB = useMemo(() => {
    const keys = Object.keys(selectedOptions || {});
    const keyB = keys.find(k => {
      const kl = k.toLowerCase();
      return (kl.includes('posterior') || kl.includes('cara b') || kl.includes('revers') || kl.includes('darrere') || (kl.includes('dedicat') && !kl.includes('frontal'))) && 
             !kl.includes('imatge') && !kl.includes('logo') && !kl.includes('fitxer') && !kl.includes('arxiu') && !kl.includes('mida') && !kl.includes('font');
    });
    if (keyB && typeof selectedOptions[keyB] === 'string') return selectedOptions[keyB];

    return selectedOptions['Text cara posterior'] || selectedOptions['Text Cara Posterior'] || selectedOptions['Cara B'] || selectedOptions['Text Posterior'] || '';
  }, [selectedOptions]);

  // 3. Extreure Imatge / Logo Cara Anterior (Frontal) dels fitxers adjuntats
  const fileA = useMemo(() => {
    const allFiles = { ...(selectedOptions || {}), ...(attachedFiles || {}) };
    const keys = Object.keys(allFiles || {});
    const keyA = keys.find(k => {
      const kl = k.toLowerCase();
      return (kl.includes('frontal') || kl.includes('cara a') || kl.includes('anterior') || kl.includes('davanter') || kl.includes('logo') || kl.includes('imatge') || kl.includes('arxiu') || kl.includes('fitxer')) &&
             !kl.includes('posterior') && !kl.includes('cara b') && !kl.includes('revers') && !kl.includes('darrere');
    });
    if (keyA && allFiles[keyA]) {
      const item = allFiles[keyA];
      if (item.dataUrl) return item.dataUrl;
      if (item.url) return item.url;
      if (typeof item === 'string') return item;
    }
    const directFile = attachedFiles?.['Imatge cara frontal'] || attachedFiles?.['Imatge Cara Frontal'] || attachedFiles?.['Logo / Imatge Cara A'];
    return directFile?.dataUrl || directFile?.url || (typeof directFile === 'string' ? directFile : null);
  }, [attachedFiles, selectedOptions]);

  // 4. Extreure Imatge / Logo Cara Posterior dels fitxers adjuntats
  const fileB = useMemo(() => {
    const allFiles = { ...(selectedOptions || {}), ...(attachedFiles || {}) };
    const keys = Object.keys(allFiles || {});
    const keyB = keys.find(k => {
      const kl = k.toLowerCase();
      return (kl.includes('posterior') || kl.includes('cara b') || kl.includes('revers') || kl.includes('darrere')) &&
             (kl.includes('logo') || kl.includes('imatge') || kl.includes('arxiu') || kl.includes('fitxer'));
    });
    if (keyB && allFiles[keyB]) {
      const item = allFiles[keyB];
      if (item.dataUrl) return item.dataUrl;
      if (item.url) return item.url;
      if (typeof item === 'string') return item;
    }
    const directFile = attachedFiles?.['Imatge cara posterior'] || attachedFiles?.['Imatge Cara Posterior'] || attachedFiles?.['Logo / Imatge Cara B'];
    return directFile?.dataUrl || directFile?.url || (typeof directFile === 'string' ? directFile : null);
  }, [attachedFiles, selectedOptions]);

  // Imatges processades amb filtre gravat làser
  const [engravedImgA, setEngravedImgA] = useState(null);
  const [engravedImgB, setEngravedImgB] = useState(null);

  useEffect(() => {
    if (fileA) {
      processImageToLaserEngraving(fileA, (res) => setEngravedImgA(res));
    } else {
      setEngravedImgA(null);
    }
  }, [fileA]);

  useEffect(() => {
    if (fileB) {
      processImageToLaserEngraving(fileB, (res) => setEngravedImgB(res));
    } else {
      setEngravedImgB(null);
    }
  }, [fileB]);

  // Mida calibrada de la font segons llargada del text i opció triada
  const getCalculatedFontSize = (text, sizeLabel) => {
    const len = (text || '').length;
    const sLower = String(sizeLabel || '').toLowerCase();
    const isSmall = sLower === 'petita' || sLower === 'p';
    const isLarge = sLower === 'gran' || sLower === 'g';

    let base = 12.5;
    if (len <= 8) base = 16.5;
    else if (len <= 16) base = 13.5;
    else if (len <= 30) base = 11.5;
    else if (len <= 50) base = 9.5;
    else base = 8;

    const factor = isSmall ? 0.78 : (isLarge ? 1.35 : 1.0);
    return Math.round(base * factor * 10) / 10;
  };

  const templateImgUrl = resolveMediaUrl('clauer_plantilla_celebrar.png');

  return (
    <div className="w-full bg-surface-container-lowest border border-outline/15 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs select-none my-3">
      
      {/* LÍNIA DE CONTROLS: Tipografia + Mida de Font + Commutador Anterior / Posterior */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Desplegable visual de Tipografia */}
          <FontSelectorDropdown
            selectedFontName={selectedFontName}
            onSelectFont={handleSelectFont}
          />

          {/* Selector de Mida de la Font (Petita / Mitjana / Gran) */}
          <div className="flex items-center bg-surface border border-outline/25 rounded-xl p-1 gap-1">
            <span className="text-[10px] text-on-surface-variant font-mono font-semibold px-1 hidden xs:inline">
              Mida:
            </span>
            {[
              { id: 'petita', label: 'Petita', short: 'P' },
              { id: 'mitjana', label: 'Mitjana', short: 'M' },
              { id: 'gran', label: 'Gran', short: 'G' }
            ].map((sz) => {
              const isSelected = selectedFontSize.toLowerCase() === sz.id || selectedFontSize.toLowerCase() === sz.label.toLowerCase();
              return (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => handleSelectFontSize(sz.label)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  }`}
                  title={`Mida de lletra: ${sz.label}`}
                >
                  <span className="hidden sm:inline">{sz.label}</span>
                  <span className="sm:hidden">{sz.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Commutador de Cara: Anterior ⇄ Posterior */}
        <div className="flex items-center bg-surface border border-outline/25 rounded-xl p-1 gap-1 ml-auto">
          <button
            type="button"
            onClick={() => {
              setActiveSide('caraA');
              setIsFlipped(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeSide === 'caraA'
                ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={handleFlipPiece}
            className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
            title="Girar clauer (180°)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSide('caraB');
              setIsFlipped(true);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeSide === 'caraB'
                ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Posterior
          </button>
        </div>
      </div>

      {/* VISTA REAL PROPORCIONAL DEL CLAUER AMB GRAVAT */}
      <div className="relative w-full py-4 px-3 flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline/15 shadow-inner min-h-[240px]">
        
        {/* Contenidor 3D Flip Card */}
        <div
          className="w-44 h-56 sm:w-52 sm:h-64 cursor-pointer relative perspective-1000 my-1 transition-all duration-300"
          onClick={handleFlipPiece}
          title="Fes clic per girar el clauer (Anterior / Posterior)"
        >
          <div
            className="relative w-full h-full duration-700 transform-style-3d transition-transform"
            style={{
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            
            {/* CARA A (ANTERIOR) */}
            <div
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                zIndex: isFlipped ? 1 : 2
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={templateImgUrl}
                  alt="Plantilla Clauer Celebrar Cara Anterior"
                  className="w-full h-full object-contain filter drop-shadow-xl select-none"
                />

                {/* Àrea Circular de Gravat Cara Anterior */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-3"
                  style={{
                    top: '25%',
                    left: '8%',
                    right: '8%',
                    bottom: '5%',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Logo / Imatge Cara Anterior */}
                  {engravedImgA && (
                    <div className="flex-1 flex items-center justify-center max-h-[58%] max-w-[85%] my-auto">
                      <img
                        src={engravedImgA}
                        alt="Logo Gravat Cara Anterior"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>
                  )}

                  {/* Text Cara Anterior */}
                  {textA ? (
                    <div
                      className="font-bold text-[#24170E] leading-tight px-2 break-words max-w-full my-auto"
                      style={{
                        fontFamily: currentFontObj.fontFamily,
                        fontSize: `${getCalculatedFontSize(textA, selectedFontSize)}px`,
                        textShadow: '0.5px 0.5px 1px rgba(255,255,255,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.5)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {textA}
                    </div>
                  ) : !engravedImgA && (
                    <div className="text-[#8c6b54]/60 font-mono text-[10px] italic px-2">
                      (Text o imatge cara frontal...)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARA B (POSTERIOR) */}
            <div
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                zIndex: isFlipped ? 2 : 1
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={templateImgUrl}
                  alt="Plantilla Clauer Celebrar Cara Posterior"
                  className="w-full h-full object-contain filter drop-shadow-xl select-none"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Àrea Circular de Gravat Cara Posterior */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-3"
                  style={{
                    top: '25%',
                    left: '8%',
                    right: '8%',
                    bottom: '5%',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Logo / Imatge Cara Posterior */}
                  {engravedImgB && (
                    <div className="flex-1 flex items-center justify-center max-h-[58%] max-w-[85%] my-auto">
                      <img
                        src={engravedImgB}
                        alt="Logo Gravat Cara Posterior"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>
                  )}

                  {/* Text Cara Posterior */}
                  {textB ? (
                    <div
                      className="font-bold text-[#24170E] leading-tight px-2 break-words max-w-full my-auto"
                      style={{
                        fontFamily: currentFontObj.fontFamily,
                        fontSize: `${getCalculatedFontSize(textB, selectedFontSize)}px`,
                        textShadow: '0.5px 0.5px 1px rgba(255,255,255,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.5)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {textB}
                    </div>
                  ) : !engravedImgB && (
                    <div className="text-[#8c6b54]/60 font-mono text-[10px] italic px-2">
                      (Text o imatge cara posterior...)
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        <span className="text-[10px] font-mono text-outline/80 mt-2 flex items-center gap-1">
          <span>Fes clic sobre la peça per girar entre Anterior i Posterior</span>
        </span>
      </div>
    </div>
  );
}
