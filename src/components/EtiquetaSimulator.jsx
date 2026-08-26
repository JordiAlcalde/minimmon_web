import React, { useState, useMemo } from 'react';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';

// Configuració completa de Formes, Mides Reals, Plantilles oficials i Coordenades Calibrades de Forats
export const ETIQUETA_SHAPES = {
  rectangular: {
    id: 'rectangular',
    nom: 'Rectangular',
    prefix: 'XR',
    templateImg: 'images/etiqueta_plantilla_rd.png',
    overviewImg: 'images/etiqueta_rectangular.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 132,
    aspect: '283 / 132',
    templateW: 209,
    templateH: 115,
    templateAspect: '209 / 115',
    templateHotspots: {
      A: { label: 'A', x: 13.5, y: 18 },
      B: { label: 'B', x: 50.0, y: 18 },
      C: { label: 'C', x: 86.5, y: 18 },
      D: { label: 'D', x: 13.5, y: 50 },
      E: { label: 'E', x: 86.5, y: 50 },
      F: { label: 'F', x: 13.5, y: 82 },
      G: { label: 'G', x: 50.0, y: 82 },
      H: { label: 'H', x: 86.5, y: 82 }
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
    templateImg: 'images/etiqueta_plantilla_rd.png',
    overviewImg: 'images/etiqueta_arrodonida.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 132,
    aspect: '283 / 132',
    templateW: 209,
    templateH: 115,
    templateAspect: '209 / 115',
    templateHotspots: {
      A: { label: 'A', x: 13.5, y: 18 },
      B: { label: 'B', x: 50.0, y: 18 },
      C: { label: 'C', x: 86.5, y: 18 },
      D: { label: 'D', x: 13.5, y: 50 },
      E: { label: 'E', x: 86.5, y: 50 },
      F: { label: 'F', x: 13.5, y: 82 },
      G: { label: 'G', x: 50.0, y: 82 },
      H: { label: 'H', x: 86.5, y: 82 }
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
          A: { x: 64, y: 47 },
          B: { x: 141.5, y: 47 },
          C: { x: 219, y: 47 },
          D: { x: 64, y: 65.5 },
          E: { x: 219, y: 65.5 },
          F: { x: 64, y: 84 },
          G: { x: 141.5, y: 84 },
          H: { x: 219, y: 84 }
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
          A: { x: 50, y: 39 },
          B: { x: 141.5, y: 39 },
          C: { x: 233, y: 39 },
          D: { x: 50, y: 65.5 },
          E: { x: 233, y: 65.5 },
          F: { x: 50, y: 92 },
          G: { x: 141.5, y: 92 },
          H: { x: 233, y: 92 }
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
          A: { x: 52, y: 31 },
          B: { x: 141.5, y: 31 },
          C: { x: 231, y: 31 },
          D: { x: 52, y: 65.5 },
          E: { x: 231, y: 65.5 },
          F: { x: 52, y: 100 },
          G: { x: 141.5, y: 100 },
          H: { x: 231, y: 100 }
        }
      }
    ]
  },
  circular: {
    id: 'circular',
    nom: 'Circular',
    prefix: 'XC',
    templateImg: 'images/etiqueta_plantilla_c.png',
    overviewImg: 'images/etiqueta_circular.png',
    hasCustomHoles: true,
    canvasW: 265,
    canvasH: 265,
    aspect: '1 / 1',
    templateW: 115,
    templateH: 115,
    templateAspect: '1 / 1',
    templateHotspots: {
      A: { label: 'A', x: 23, y: 23 },
      B: { label: 'B', x: 50, y: 12 },
      C: { label: 'C', x: 77, y: 23 },
      D: { label: 'D', x: 12, y: 50 },
      E: { label: 'E', x: 50, y: 50 },
      F: { label: 'F', x: 88, y: 50 },
      G: { label: 'G', x: 23, y: 77 },
      H: { label: 'H', x: 50, y: 88 },
      I: { label: 'I', x: 77, y: 77 }
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
          A: { x: 86, y: 86 },
          B: { x: 132.5, y: 68 },
          C: { x: 179, y: 86 },
          D: { x: 68, y: 132.5 },
          E: { x: 132.5, y: 132.5 },
          F: { x: 197, y: 132.5 },
          G: { x: 86, y: 179 },
          H: { x: 132.5, y: 197 },
          I: { x: 179, y: 179 }
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
          A: { x: 74, y: 74 },
          B: { x: 132.5, y: 50 },
          C: { x: 191, y: 74 },
          D: { x: 50, y: 132.5 },
          E: { x: 132.5, y: 132.5 },
          F: { x: 215, y: 132.5 },
          G: { x: 74, y: 191 },
          H: { x: 132.5, y: 215 },
          I: { x: 191, y: 191 }
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
          A: { x: 62, y: 62 },
          B: { x: 132.5, y: 32 },
          C: { x: 203, y: 62 },
          D: { x: 32, y: 132.5 },
          E: { x: 132.5, y: 132.5 },
          F: { x: 233, y: 132.5 },
          G: { x: 62, y: 203 },
          H: { x: 132.5, y: 233 },
          I: { x: 203, y: 203 }
        }
      }
    ]
  },
  ovalada: {
    id: 'ovalada',
    nom: 'Ovalada',
    prefix: 'XV',
    templateImg: 'images/etiqueta_plantilla_v.png',
    overviewImg: 'images/etiqueta_ovalada.png',
    hasCustomHoles: true,
    canvasW: 283,
    canvasH: 208,
    aspect: '283 / 208',
    templateW: 153,
    templateH: 115,
    templateAspect: '153 / 115',
    templateHotspots: {
      A: { label: 'A', x: 19, y: 23 },
      B: { label: 'B', x: 50, y: 13 },
      C: { label: 'C', x: 81, y: 23 },
      D: { label: 'D', x: 10, y: 50 },
      E: { label: 'E', x: 50, y: 50 },
      F: { label: 'F', x: 90, y: 50 },
      G: { label: 'G', x: 19, y: 77 },
      H: { label: 'H', x: 50, y: 87 },
      I: { label: 'I', x: 81, y: 77 }
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
          A: { x: 80, y: 64 },
          B: { x: 141.5, y: 50 },
          C: { x: 203, y: 64 },
          D: { x: 62, y: 103.5 },
          E: { x: 141.5, y: 103.5 },
          F: { x: 221, y: 103.5 },
          G: { x: 80, y: 143 },
          H: { x: 141.5, y: 157 },
          I: { x: 203, y: 143 }
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
          A: { x: 68, y: 48 },
          B: { x: 141.5, y: 32 },
          C: { x: 215, y: 48 },
          D: { x: 44, y: 103.5 },
          E: { x: 141.5, y: 103.5 },
          F: { x: 239, y: 103.5 },
          G: { x: 68, y: 159 },
          H: { x: 141.5, y: 175 },
          I: { x: 215, y: 159 }
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
          A: { x: 55, y: 40 },
          B: { x: 141.5, y: 22 },
          C: { x: 228, y: 40 },
          D: { x: 24, y: 103.5 },
          E: { x: 141.5, y: 103.5 },
          F: { x: 259, y: 103.5 },
          G: { x: 55, y: 167 },
          H: { x: 141.5, y: 185 },
          I: { x: 228, y: 167 }
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
      { id: '45', label: 'Ø 45 mm', codeNum: '45', img: 'images/etiqueta_xm45.png', wMm: 45, hMm: 45, holes: { B: { x: 141.5, y: 35 } } },
      { id: '50', label: 'Ø 50 mm', codeNum: '50', img: 'images/etiqueta_xm50.png', wMm: 50, hMm: 50, holes: { B: { x: 141.5, y: 30 } } },
      { id: '55', label: 'Ø 55 mm', codeNum: '55', img: 'images/etiqueta_xm55.png', wMm: 55, hMm: 55, holes: { B: { x: 141.5, y: 24 } } },
      { id: '60', label: 'Ø 60 mm', codeNum: '60', img: 'images/etiqueta_xm60.png', wMm: 60, hMm: 60, holes: { B: { x: 141.5, y: 18 } } }
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
    if (sType === 'etiqueta_circular' || pNom.includes('circul') || pNom.includes('rodó') || pNom.includes('rodo')) return ETIQUETA_SHAPES.circular;
    if (sType === 'etiqueta_ovalada' || pNom.includes('oval')) return ETIQUETA_SHAPES.ovalada;
    if (sType === 'etiqueta_arrodonida' || pNom.includes('arrodonid')) return ETIQUETA_SHAPES.arrodonida;
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
  const selectedMidaLabel = selectedOptions['Mida de l\'etiqueta'] || availableMides[0] || shapeConfig.defaultMides[0];

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

  // Forats seleccionats
  const activeHoles = useMemo(() => {
    if (!shapeConfig.hasCustomHoles) {
      return ['B']; // Medalla sempre té el forat superior B
    }
    const raw = selectedOptions['Forats seleccionats'];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',').map(s => s.trim().toUpperCase());
    }
    return ['A']; // Per defecte forat A
  }, [selectedOptions['Forats seleccionats'], shapeConfig]);

  // Commutar forat (A - I)
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

    const holesSuffix = shapeConfig.hasCustomHoles ? activeHoles.sort().join('') : '';
    const code = `${shapeConfig.prefix}${foundObj.codeNum}${holesSuffix}`;
    const holesStr = activeHoles.join(', ');

    setSelectedOptions(prev => ({
      ...prev,
      'Mida de l\'etiqueta': midaLabel,
      'Forats (Resum)': shapeConfig.hasCustomHoles ? (holesStr ? `${holesStr} (${code})` : `Sense forats (${code})`) : `1 forat superior (${code})`,
      'Codi Model Generat': code
    }));
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

  // Mida del text gravat
  const getPhraseFontSize = (txt) => {
    const len = (txt || '').length;
    if (len <= 8) return 'text-sm sm:text-base';
    if (len <= 20) return 'text-xs sm:text-sm';
    if (len <= 40) return 'text-[11px] sm:text-xs';
    return 'text-[9px] sm:text-[10px]';
  };

  const currentVisibleText = activeSide === 'caraA' ? textA : textB;
  const viewBoxW = shapeConfig.canvasW || 283;
  const viewBoxH = shapeConfig.canvasH || 132;
  const shapeAspect = shapeConfig.aspect || '283 / 132';

  return (
    <div className="w-full bg-surface-container-lowest border border-outline/15 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs select-none">
      
      {/* SECCIÓ: Selector de Mides i Commutador de Cara (Frontal / Posterior) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Selector de Mides */}
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

        {/* Commutador de Cara: Frontal ⇄ Posterior */}
        <div className="flex items-center bg-surface border border-outline/25 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveSide('caraA')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeSide === 'caraA'
                ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Frontal
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
          {/* Imatge de fons de fusta autèntica de la mida triada (amb flip horitzontal i vertical a la cara posterior per invertir les vetes) */}
          <img
            src={resolveMediaUrl(currentMidaObj.img)}
            alt={`${shapeConfig.nom} ${currentMidaObj.label}`}
            className={`w-full h-full object-contain pointer-events-none drop-shadow-md select-none transition-transform duration-300 ${
              activeSide === 'caraB' ? '-scale-x-100 -scale-y-100' : 'scale-x-100 scale-y-100'
            }`}
            style={{
              transform: activeSide === 'caraB' ? 'scale(-1, -1)' : 'scale(1, 1)'
            }}
            onError={(e) => {
              if (shapeConfig.overviewImg) {
                e.target.src = resolveMediaUrl(shapeConfig.overviewImg);
              }
            }}
          />

          {/* SVG Overlay per als forats calats (Cercle blanc amb filet negre) */}
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

          {/* GRAVAT DE TEXT EN TEMPS REAL A L'ETIQUETA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none z-10">
            {currentVisibleText && currentVisibleText.trim() ? (
              <p className={`text-[#24170E] font-serif font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] ${getPhraseFontSize(currentVisibleText)} animate-fadeIn max-w-[80%] whitespace-pre-wrap leading-snug`}>
                {currentVisibleText}
              </p>
            ) : (
              <p className="text-[10px] font-serif italic text-[#6E4F39]/70">
                {activeSide === 'caraA' ? '(Text gravat Frontal...)' : '(Text gravat Posterior...)'}
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

      {/* SECCIÓ: Selecciona els forats utilitzant la plantilla gràfica interactiva */}
      {shapeConfig.hasCustomHoles ? (
        <div className="space-y-3 pt-2 border-t border-outline/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-mono font-bold uppercase text-on-surface-variant">
              Selecciona els forats:
            </label>
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
          </div>

          {/* Plantilla Gràfica Interactiva de Selecció */}
          <div className="relative mx-auto flex items-center justify-center p-3 bg-surface-container/30 rounded-2xl border border-outline/15 shadow-2xs max-w-[260px]">
            <div
              className="relative w-full"
              style={{ aspectRatio: shapeConfig.templateAspect || '209 / 115' }}
            >
              {/* Imatge Oficial de la Plantilla */}
              <img
                src={resolveMediaUrl(shapeConfig.templateImg)}
                alt={`Plantilla de forats ${shapeConfig.nom}`}
                className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
              />

              {/* Botons / Hotspots interactius directament a sobre de cada lletra de la plantilla */}
              {shapeConfig.templateHotspots && Object.keys(shapeConfig.templateHotspots).map((key) => {
                const spot = shapeConfig.templateHotspots[key];
                const isActive = activeHoles.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHole(key)}
                    title={`Forat ${key} (${isActive ? 'Actiu' : 'Inactiu'})`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer group z-20"
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    {isActive ? (
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-amber-950 font-bold font-mono text-xs flex items-center justify-center shadow-md ring-2 ring-amber-400 ring-offset-1 border border-amber-600 animate-scaleIn">
                        {key}
                      </span>
                    ) : (
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/10 hover:bg-amber-500/30 text-primary font-bold font-mono text-[11px] flex items-center justify-center transition-all border border-transparent hover:border-amber-500/50">
                        {key}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Indicador per a Medalla (1 forat fix integrat) */
        <div className="p-3.5 bg-surface border border-outline/20 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-center shrink-0 font-mono font-bold text-xs border border-amber-500/40">
            1
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-primary">Forat de Suspensió Fix Integrat</p>
            <p className="text-[11px] text-on-surface-variant">
              Aquest model de medalla incorpora 1 forat superior fix de fàbrica per penjar o collar.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
