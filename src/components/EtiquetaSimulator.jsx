import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';
import FontSelectorDropdown, { AVAILABLE_FONTS } from './FontSelectorDropdown';

// Configuració completa de Formes, Mides Reals, Plantilles oficials '_blank' i Coordenades Calibrades de Forats
export const ETIQUETA_SHAPES = {
  rectangular: {
    id: 'rectangular',
    nom: 'Rectangular',
    prefix: 'XR',
    templateImg: 'images/etiqueta_plantilla_r_blank.png',
    overviewImg: 'images/etiqueta_rectangular.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 132,
    aspect: '283 / 132',
    templateW: 209,
    templateH: 115,
    templateAspect: '209 / 115',
    templateHotspots: {
      A: { label: 'A', x: 9.1, y: 16.0 },
      B: { label: 'B', x: 50.0, y: 16.5 },
      C: { label: 'C', x: 89.5, y: 16.5 },
      D: { label: 'D', x: 9.1, y: 49.6 },
      E: { label: 'E', x: 89.5, y: 49.6 },
      F: { label: 'F', x: 9.1, y: 81.0 },
      G: { label: 'G', x: 50.0, y: 82.8 },
      H: { label: 'H', x: 89.5, y: 82.8 }
    },
    defaultMides: ['15 x 50 mm', '20 x 60 mm', '25 x 60 mm'],
    mides: [
      {
        id: '1550',
        label: '15 x 50 mm',
        codeNum: '1550',
        img: 'images/etiqueta_xr1550.png',
        wMm: 50,
        hMm: 15,
        holes: {
          A: { x: 62, y: 47 },
          B: { x: 141.5, y: 47 },
          C: { x: 221, y: 47 },
          D: { x: 62, y: 65.5 },
          E: { x: 221, y: 65.5 },
          F: { x: 62, y: 84 },
          G: { x: 141.5, y: 84 },
          H: { x: 221, y: 84 }
        }
      },
      {
        id: '2060',
        label: '20 x 60 mm',
        codeNum: '2060',
        img: 'images/etiqueta_xr2060.png',
        wMm: 60,
        hMm: 20,
        holes: {
          A: { x: 48, y: 39 },
          B: { x: 141.5, y: 39 },
          C: { x: 235, y: 39 },
          D: { x: 48, y: 65.5 },
          E: { x: 235, y: 65.5 },
          F: { x: 48, y: 92 },
          G: { x: 141.5, y: 92 },
          H: { x: 235, y: 92 }
        }
      },
      {
        id: '2560',
        label: '25 x 60 mm',
        codeNum: '2560',
        img: 'images/etiqueta_xr2560.png',
        wMm: 60,
        hMm: 25,
        holes: {
          A: { x: 50, y: 31 },
          B: { x: 141.5, y: 31 },
          C: { x: 233, y: 31 },
          D: { x: 50, y: 65.5 },
          E: { x: 233, y: 65.5 },
          F: { x: 50, y: 100 },
          G: { x: 141.5, y: 100 },
          H: { x: 233, y: 100 }
        }
      }
    ]
  },
  arrodonida: {
    id: 'arrodonida',
    nom: 'Arrodonida',
    prefix: 'XD',
    templateImg: 'images/etiqueta_plantilla_d_blank.png',
    overviewImg: 'images/etiqueta_arrodonida.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 132,
    aspect: '283 / 132',
    templateW: 190,
    templateH: 58,
    templateAspect: '190 / 58',
    templateHotspots: {
      A: { label: 'A', x: 10.6, y: 47.4 },
      B: { label: 'B', x: 89.6, y: 47.4 }
    },
    defaultMides: ['15 x 50 mm', '20 x 60 mm', '25 x 60 mm'],
    mides: [
      {
        id: '1550',
        label: '15 x 50 mm',
        codeNum: '1550',
        img: 'images/etiqueta_xd1550.png',
        wMm: 50,
        hMm: 15,
        holes: {
          A: { x: 64, y: 65.5 },
          B: { x: 219, y: 65.5 }
        }
      },
      {
        id: '2060',
        label: '20 x 60 mm',
        codeNum: '2060',
        img: 'images/etiqueta_xd2060.png',
        wMm: 60,
        hMm: 20,
        holes: {
          A: { x: 50, y: 65.5 },
          B: { x: 233, y: 65.5 }
        }
      },
      {
        id: '2560',
        label: '25 x 60 mm',
        codeNum: '2560',
        img: 'images/etiqueta_xd2560.png',
        wMm: 60,
        hMm: 25,
        holes: {
          A: { x: 52, y: 65.5 },
          B: { x: 231, y: 65.5 }
        }
      }
    ]
  },
  circular: {
    id: 'circular',
    nom: 'Circular',
    prefix: 'XC',
    templateImg: 'images/etiqueta_plantilla_c_blank.png',
    overviewImg: 'images/etiqueta_circular.png',
    hasCustomHoles: true,
    canvasW: 265,
    canvasH: 265,
    aspect: '1 / 1',
    templateW: 115,
    templateH: 115,
    templateAspect: '1 / 1',
    templateHotspots: {
      B: { label: 'B', x: 49.6, y: 14.7 },
      D: { label: 'D', x: 13.0, y: 49.6 },
      F: { label: 'F', x: 84.1, y: 50.2 },
      H: { label: 'H', x: 49.6, y: 87.8 }
    },
    defaultMides: ['Ø 40 mm', 'Ø 50 mm', 'Ø 60 mm'],
    mides: [
      {
        id: '40',
        label: 'Ø 40 mm',
        codeNum: '40',
        img: 'images/etiqueta_xc40.png',
        wMm: 40,
        hMm: 40,
        holes: {
          B: { x: 132.5, y: 68 },
          D: { x: 68, y: 132.5 },
          F: { x: 197, y: 132.5 },
          H: { x: 132.5, y: 197 }
        }
      },
      {
        id: '50',
        label: 'Ø 50 mm',
        codeNum: '50',
        img: 'images/etiqueta_xc50.png',
        wMm: 50,
        hMm: 50,
        holes: {
          B: { x: 132.5, y: 50 },
          D: { x: 50, y: 132.5 },
          F: { x: 215, y: 132.5 },
          H: { x: 132.5, y: 215 }
        }
      },
      {
        id: '60',
        label: 'Ø 60 mm',
        codeNum: '60',
        img: 'images/etiqueta_xc60.png',
        wMm: 60,
        hMm: 60,
        holes: {
          B: { x: 132.5, y: 32 },
          D: { x: 32, y: 132.5 },
          F: { x: 233, y: 132.5 },
          H: { x: 132.5, y: 233 }
        }
      }
    ]
  },
  ovalada: {
    id: 'ovalada',
    nom: 'Ovalada',
    prefix: 'XV',
    templateImg: 'images/etiqueta_plantilla_v_blank.png',
    overviewImg: 'images/etiqueta_ovalada.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 208,
    aspect: '283 / 208',
    templateW: 153,
    templateH: 115,
    templateAspect: '153 / 115',
    templateHotspots: {
      B: { label: 'B', x: 49.7, y: 14.2 },
      D: { label: 'D', x: 10.2, y: 49.4 },
      F: { label: 'F', x: 87.9, y: 49.6 },
      H: { label: 'H', x: 49.7, y: 84.8 }
    },
    defaultMides: ['35 x 50 mm', '45 x 60 mm', '55 x 75 mm'],
    mides: [
      {
        id: '3550',
        label: '35 x 50 mm',
        codeNum: '3550',
        img: 'images/etiqueta_xv3550.png',
        wMm: 50,
        hMm: 35,
        holes: {
          B: { x: 141.5, y: 50 },
          D: { x: 62, y: 103.5 },
          F: { x: 221, y: 103.5 },
          H: { x: 141.5, y: 157 }
        }
      },
      {
        id: '4560',
        label: '45 x 60 mm',
        codeNum: '4560',
        img: 'images/etiqueta_xv4560.png',
        wMm: 60,
        hMm: 45,
        holes: {
          B: { x: 141.5, y: 32 },
          D: { x: 44, y: 103.5 },
          F: { x: 239, y: 103.5 },
          H: { x: 141.5, y: 175 }
        }
      },
      {
        id: '5575',
        label: '55 x 75 mm',
        codeNum: '5575',
        img: 'images/etiqueta_xv5575.png',
        wMm: 75,
        hMm: 55,
        holes: {
          B: { x: 141.5, y: 22 },
          D: { x: 24, y: 103.5 },
          F: { x: 259, y: 103.5 },
          H: { x: 141.5, y: 185 }
        }
      }
    ]
  },
  medalla: {
    id: 'medalla',
    nom: 'Medalla',
    prefix: 'XM',
    templateImg: null,
    overviewImg: 'images/etiqueta_medalla.png',
    hasCustomHoles: false,
    canvasW: 283,
    canvasH: 283,
    aspect: '1 / 1',
    defaultMides: ['Ø 45 mm', 'Ø 50 mm', 'Ø 55 mm', 'Ø 60 mm'],
    mides: [
      { id: '45', label: 'Ø 45 mm', codeNum: '45', img: 'images/etiqueta_xm45.png', wMm: 45, hMm: 45 },
      { id: '50', label: 'Ø 50 mm', codeNum: '50', img: 'images/etiqueta_xm50.png', wMm: 50, hMm: 50 },
      { id: '55', label: 'Ø 55 mm', codeNum: '55', img: 'images/etiqueta_xm55.png', wMm: 55, hMm: 55 },
      { id: '60', label: 'Ø 60 mm', codeNum: '60', img: 'images/etiqueta_xm60.png', wMm: 60, hMm: 60 }
    ]
  }
};

export default function EtiquetaSimulator({
  productNom = 'Etiquetes Identificatives',
  productCodi = '',
  simType = 'auto',
  midesDisponibles = [],
  selectedOptions = {},
  setSelectedOptions = () => {},
  phraseText = '',
  phraseTextB = ''
}) {
  // Determinar la forma de l'etiqueta
  const shapeConfig = useMemo(() => {
    const sType = String(simType || '').toLowerCase();
    const pNom = String(productNom || '').toLowerCase();

    if (sType === 'etiqueta_medalla' || pNom.includes('medall')) return ETIQUETA_SHAPES.medalla;
    if (sType === 'etiqueta_arrodonida' || pNom.includes('arrodonid')) return ETIQUETA_SHAPES.arrodonida;
    if (sType === 'etiqueta_ovalada' || pNom.includes('oval')) return ETIQUETA_SHAPES.ovalada;
    if (sType === 'etiqueta_circular' || pNom.includes('circul') || (/\b(rodona|rodo|rodó|rodons|rodones)\b/i.test(pNom))) return ETIQUETA_SHAPES.circular;
    if (sType === 'etiqueta_rectangular' || pNom.includes('rectang')) return ETIQUETA_SHAPES.rectangular;
    return ETIQUETA_SHAPES.rectangular;
  }, [simType, productNom]);

  // Llista de mides disponibles
  const availableMides = useMemo(() => {
    if (Array.isArray(midesDisponibles) && midesDisponibles.length > 0) {
      return midesDisponibles;
    }
    return shapeConfig.defaultMides || shapeConfig.mides.map(m => m.label);
  }, [midesDisponibles, shapeConfig]);

  // Mida seleccionada actual
  const selectedMidaLabel = selectedOptions['Mida de l\'etiqueta'] || 
                           selectedOptions['Mida'] || 
                           availableMides[0] || 
                           shapeConfig.defaultMides[0];

  // Sincronitzar mida inicial si no està definida a selectedOptions
  React.useEffect(() => {
    if (!selectedOptions['Mida de l\'etiqueta'] && selectedMidaLabel) {
      setSelectedOptions(prev => {
        const next = { ...prev, 'Mida de l\'etiqueta': selectedMidaLabel };
        Object.keys(prev).forEach(k => {
          if (k.toLowerCase().includes('mida')) next[k] = selectedMidaLabel;
        });
        return next;
      });
    }
  }, [selectedMidaLabel]);

  // Objecte de dades de la mida triada (imatge real, mides, coordenades de forats)
  const currentMidaObj = useMemo(() => {
    const clean = String(selectedMidaLabel || '').toLowerCase().replace(/\s+/g, '');
    const found = shapeConfig.mides.find(m => {
      const mClean = m.label.toLowerCase().replace(/\s+/g, '');
      const codeClean = m.codeNum.toLowerCase();
      return clean.includes(mClean) || mClean.includes(clean) || clean.includes(codeClean);
    });
    return found || shapeConfig.mides[0];
  }, [selectedMidaLabel, shapeConfig]);

  // Estat de la cara activa ('caraA' = Frontal, 'caraB' = Posterior)
  const [activeSide, setActiveSide] = useState('caraA');
  const [isFlipping, setIsFlipping] = useState(false);

  // Text per a Cara Frontal i Posterior
  const textA = phraseText || selectedOptions['Text (Cara A)'] || selectedOptions['Text Cara A'] || '';
  const textB = phraseTextB || selectedOptions['Text (Cara B)'] || selectedOptions['Text Cara B'] || '';

  // Tipografia seleccionada per al gravat
  const selectedFontName = selectedOptions['Tipografia'] || selectedOptions['Font'] || AVAILABLE_FONTS[0].name;
  const currentFontObj = useMemo(() => {
    return AVAILABLE_FONTS.find(f => f.name === selectedFontName || f.id === selectedFontName) || AVAILABLE_FONTS[0];
  }, [selectedFontName]);

  // Sincronitzar tipografia inicial si no està definida
  useEffect(() => {
    if (!selectedOptions['Tipografia'] && !selectedOptions['Font']) {
      setSelectedOptions(prev => ({
        ...prev,
        'Tipografia': AVAILABLE_FONTS[0].name
      }));
    }
  }, []);

  const handleSelectFont = (fontName) => {
    setSelectedOptions(prev => ({
      ...prev,
      'Tipografia': fontName
    }));
  };

  // Forats seleccionats
  const activeHoles = useMemo(() => {
    if (!shapeConfig.hasCustomHoles) {
      return [];
    }
    const raw = selectedOptions['Forats seleccionats'];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',').map(s => s.trim().toUpperCase());
    }
    return []; // Per defecte SENSE cap forat (preu base net)
  }, [selectedOptions['Forats seleccionats'], shapeConfig]);

  // Codi de model generat (p.ex. XR1550AC)
  const generatedCode = useMemo(() => {
    const holesSuffix = shapeConfig.hasCustomHoles ? activeHoles.slice().sort().join('') : '';
    return `${shapeConfig.prefix}${currentMidaObj.codeNum}${holesSuffix}`;
  }, [shapeConfig, currentMidaObj, activeHoles]);

  // Commutar forat (A - H / I)
  const handleToggleHole = (holeKey) => {
    if (!shapeConfig.hasCustomHoles) return;

    let nextHoles;
    if (activeHoles.includes(holeKey)) {
      nextHoles = activeHoles.filter(h => h !== holeKey);
    } else {
      nextHoles = [...activeHoles, holeKey].sort();
    }

    const holesStr = nextHoles.join(', ');
    const code = `${shapeConfig.prefix}${currentMidaObj.codeNum}${nextHoles.join('')}`;

    setSelectedOptions(prev => ({
      ...prev,
      'Mida de l\'etiqueta': selectedMidaLabel,
      'Forats seleccionats': nextHoles,
      'Forats (Resum)': holesStr ? `${holesStr} (${code})` : `Sense forats (${code})`,
      'Codi Model Generat': code
    }));
  };

  // Triar Mida
  const handleSelectMida = (midaLabel) => {
    const clean = String(midaLabel || '').toLowerCase().replace(/\s+/g, '');
    const foundObj = shapeConfig.mides.find(m => {
      const mClean = m.label.toLowerCase().replace(/\s+/g, '');
      return clean.includes(mClean) || mClean.includes(clean);
    }) || shapeConfig.mides[0];

    const holesSuffix = shapeConfig.hasCustomHoles ? activeHoles.slice().sort().join('') : '';
    const code = `${shapeConfig.prefix}${foundObj.codeNum}${holesSuffix}`;
    const holesStr = activeHoles.join(', ');

    setSelectedOptions(prev => {
      const next = { ...prev };
      next['Mida de l\'etiqueta'] = midaLabel;
      next['Mida'] = midaLabel;
      Object.keys(prev).forEach(k => {
        if (k.toLowerCase().includes('mida')) next[k] = midaLabel;
      });
      if (shapeConfig.hasCustomHoles) {
        next['Forats (Resum)'] = holesStr ? `${holesStr} (${code})` : `Sense forats (${code})`;
      } else {
        delete next['Forats seleccionats'];
        delete next['Forats (Resum)'];
      }
      next['Codi Model Generat'] = code;
      return next;
    });
  };

  // Netejar forats
  const handleClearHoles = () => {
    if (!shapeConfig.hasCustomHoles) return;
    const code = `${shapeConfig.prefix}${currentMidaObj.codeNum}`;
    setSelectedOptions(prev => ({
      ...prev,
      'Forats seleccionats': [],
      'Forats (Resum)': `Sense forats (${code})`,
      'Codi Model Generat': code
    }));
  };

  // Girar la peça amb efecte 3D
  const handleFlipPiece = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setActiveSide(prev => prev === 'caraA' ? 'caraB' : 'caraA');
      setIsFlipping(false);
    }, 150);
  };

  // Mida del text gravat (proporció base multiplicada per la mida escollida: Petita, Mitjana, Gran)
  const selectedFontSize = selectedOptions['Mida de la font'] || selectedOptions['Mida del text'] || 'Mitjana';

  const handleSelectFontSize = (sizeLabel) => {
    setSelectedOptions(prev => ({
      ...prev,
      'Mida de la font': sizeLabel
    }));
  };

  // Mida dinàmica calibrada del text gravat (Petita: 0.75x, Mitjana: 1.0x, Gran: 1.40x)
  const getPhraseFontSizeStyle = (txt) => {
    const len = (txt || '').length;
    const sLower = String(selectedFontSize || '').toLowerCase();
    const isSmall = sLower === 'petita' || sLower === 'p';
    const isLarge = sLower === 'gran' || sLower === 'g';

    // Mida base calibrada en px segons la longitud del text
    let basePx = 16;
    if (len <= 8) basePx = 22;
    else if (len <= 20) basePx = 17;
    else if (len <= 40) basePx = 13.5;
    else basePx = 11;

    const factor = isSmall ? 0.75 : (isLarge ? 1.40 : 1.0);
    const finalPx = Math.round(basePx * factor * 10) / 10;

    return {
      fontSize: `${finalPx}px`,
      lineHeight: 1.25
    };
  };

  const currentVisibleText = activeSide === 'caraA' ? textA : textB;
  const viewBoxW = shapeConfig.canvasW || 283;
  const viewBoxH = shapeConfig.canvasH || 132;
  const shapeAspect = shapeConfig.aspect || '283 / 132';

  return (
    <div className="w-full bg-surface-container-lowest border border-outline/15 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs select-none">
      
      {/* LÍNIA 1: Selector de Mides del Producte */}
      <div className="flex flex-wrap gap-2 items-center">
        {availableMides.map((mida, idx) => {
          const isSelected = selectedMidaLabel === mida;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectMida(mida)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-[#3D2B1F] text-white ring-2 ring-primary/40 font-bold'
                  : 'bg-surface hover:bg-surface-container text-primary border border-outline/25'
              }`}
            >
              {mida}
            </button>
          );
        })}
      </div>

      {/* LÍNIA 2: Eines de Gravat (Tipografia + Mida de Font + Commutador Anterior/Posterior) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-outline/10">
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
            onClick={() => setActiveSide('caraA')}
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
            title="Girar etiqueta (180°)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('caraB')}
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

      {/* VISTA REAL PROPORCIONAL DE LA PEÇA DE FUSTA AMB GRAVAT I FORATS */}
      <div className="relative w-full py-4 px-3 flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline/15 shadow-inner min-h-[180px]">
        
        {/* Container Proporcional segons la mida de llenç de la forma */}
        <div
          className={`relative w-full max-w-[320px] sm:max-w-[360px] flex items-center justify-center shadow-lg rounded-xl my-1 transition-all duration-300 ${
            isFlipping ? 'scale-95 opacity-50 rotate-y-90' : 'scale-100 opacity-100 rotate-y-0'
          }`}
          style={{ aspectRatio: shapeAspect }}
        >
          {/* Imatge de fons de fusta autèntica de la mida triada (amb flip únicament horitzontal a la cara posterior per invertir les vetes) */}
          <img
            src={resolveMediaUrl(currentMidaObj.img)}
            alt={`${shapeConfig.nom} ${currentMidaObj.label}`}
            className={`w-full h-full object-contain pointer-events-none drop-shadow-md select-none transition-transform duration-300 ${
              activeSide === 'caraB' ? '-scale-x-100' : 'scale-x-100'
            }`}
            style={{
              transform: activeSide === 'caraB' ? 'scaleX(-1)' : 'scaleX(1)'
            }}
            onError={(e) => {
              e.target.onerror = null;
              if (shapeConfig.overviewImg) {
                e.target.src = resolveMediaUrl(shapeConfig.overviewImg);
              }
            }}
          />

          {/* SVG Overlay per als forats calats (Cercle blanc amb filet negre) */}
          {shapeConfig.hasCustomHoles && (
            <svg viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {currentMidaObj.holes && Object.keys(currentMidaObj.holes).map((key) => {
                const pos = currentMidaObj.holes[key];
                const isActive = activeHoles.includes(key);
                if (!isActive || !pos) return null;

                // Invertir horitzontalment si estem a la cara B
                const cx = activeSide === 'caraA' ? pos.x : (viewBoxW - pos.x);
                const cy = pos.y;

                return (
                  <g key={key} className="animate-fadeIn">
                    {/* Cercle blanc buit amb filet negre fi */}
                    <circle cx={cx} cy={cy} r="4.8" fill="#FFFFFF" stroke="#000000" strokeWidth="1.2" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* GRAVAT DE TEXT EN TEMPS REAL A L'ETIQUETA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none z-10">
            {currentVisibleText && currentVisibleText.trim() ? (
              <p
                style={{ 
                  fontFamily: currentFontObj.fontFamily,
                  ...getPhraseFontSizeStyle(currentVisibleText)
                }}
                className="text-[#24170E] font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] animate-fadeIn max-w-[80%] whitespace-pre-wrap transition-all duration-200"
              >
                {currentVisibleText}
              </p>
            ) : (
              <p
                style={{ fontFamily: currentFontObj.fontFamily }}
                className="text-[10px] italic text-[#6E4F39]/70"
              >
                {activeSide === 'caraA' ? '(Text gravat Anterior...)' : '(Text gravat Posterior...)'}
              </p>
            )}
          </div>
        </div>

        {/* Peus explicatius */}
        {activeSide === 'caraB' && shapeConfig.hasCustomHoles && (
          <p className="text-[10px] text-amber-800 dark:text-amber-300 font-mono mt-2 text-center">
            * Cara Posterior: Els forats es mostren invertits d'esquerra a dreta pel gir de la peça.
          </p>
        )}
      </div>

      {/* SECCIÓ: Selecciona els forats utilitzant la plantilla gràfica interactiva (només per a formes amb forats personalitzables) */}
      {shapeConfig.hasCustomHoles && (
        <div className="space-y-3 pt-2 border-t border-outline/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-mono font-bold uppercase text-on-surface-variant">
              Selecciona els forats:
            </label>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {activeHoles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHoles}
                  className="text-[11px] text-error hover:underline font-mono cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Netejar forats</span>
                </button>
              )}
              {generatedCode && (
                <span className="text-[11px] font-mono font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Ref.: {generatedCode}
                </span>
              )}
            </div>
          </div>

          {/* Plantilla Gràfica Interactiva de Selecció */}
          <div className="relative mx-auto flex items-center justify-center p-3 bg-surface-container/30 rounded-2xl border border-outline/15 shadow-2xs max-w-[260px]">
            <div
              className="relative w-full"
              style={{ aspectRatio: shapeConfig.templateAspect || '209 / 115' }}
            >
              {/* Imatge Oficial de la Plantilla _blank */}
              <img
                src={resolveMediaUrl(shapeConfig.templateImg)}
                alt={`Plantilla de forats ${shapeConfig.nom}`}
                className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
              />

              {/* Botons / Hotspots interactius directament a sobre de cada forat de la plantilla (sense lletres) */}
              {shapeConfig.templateHotspots && Object.keys(shapeConfig.templateHotspots).map((key) => {
                const spot = shapeConfig.templateHotspots[key];
                const isActive = activeHoles.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHole(key)}
                    title={`Forat ${key} (${isActive ? 'Actiu' : 'Inactiu'})`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all cursor-pointer group z-20"
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    {isActive ? (
                      <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-amber-500 shadow-md ring-2 ring-amber-400 border border-amber-600 flex items-center justify-center animate-scaleIn">
                        <span className="w-2 h-2 rounded-full bg-amber-950"></span>
                      </span>
                    ) : (
                      <span className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-black/30 hover:border-amber-500 bg-black/5 hover:bg-amber-500/30 transition-all"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
