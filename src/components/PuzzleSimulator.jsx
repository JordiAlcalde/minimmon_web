import React, { useState, useMemo } from 'react';
import { Sun, FileText } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';

/**
 * Extreu les columnes i files del nom del puzle (ex: "Puzle 10x6" -> 10 cols, 6 rows; "Puzle 6x10" -> 6 cols, 10 rows)
 */
function parsePuzzleDimensions(productNom = '') {
  const match = String(productNom).match(/\b(\d+)\s*x\s*(\d+)\b/i);
  if (match) {
    const d1 = parseInt(match[1], 10);
    const d2 = parseInt(match[2], 10);
    if (!isNaN(d1) && !isNaN(d2) && d1 > 0 && d2 > 0) {
      // Convenció Ample x Alt: Primer número = Columnes (Ample), Segon número = Files (Alt)
      return { cols: Math.min(d1, 16), rows: Math.min(d2, 16) };
    }
  }
  return { cols: 4, rows: 4 }; // Fallback per defecte (4x4 quadrat)
}

/**
 * Genera el camí SVG de la retícula de puzle realista amb nòduls rodons (jigsaw tabs)
 */
function generateJigsawSvgPaths(width, height, rows, cols) {
  const cellW = width / cols;
  const cellH = height / rows;
  const paths = [];

  // Patró alternat determinista per a la direcció dels nòduls (+1 o -1)
  const getTabDirection = (r, c, isVert) => {
    const val = (r * 13 + c * 29 + (isVert ? 7 : 3)) % 2;
    return val === 0 ? 1 : -1;
  };

  // 1. Línies horitzontals internes
  for (let r = 1; r < rows; r++) {
    const y = r * cellH;
    for (let c = 0; c < cols; c++) {
      const x1 = c * cellW;
      const x2 = (c + 1) * cellW;
      const L = cellW;
      const dir = getTabDirection(r, c, false);
      const mid = (x1 + x2) / 2;
      const headR = cellH * 0.16;

      // Corba de nòdul rodó de puzle realista
      const pathD = `M ${x1},${y} ` +
        `L ${mid - L * 0.14},${y} ` +
        `C ${mid - L * 0.10},${y} ${mid - L * 0.08},${y + dir * headR * 0.35} ${mid - L * 0.06},${y + dir * headR * 0.85} ` +
        `C ${mid - L * 0.11},${y + dir * headR * 2.2} ${mid + L * 0.11},${y + dir * headR * 2.2} ${mid + L * 0.06},${y + dir * headR * 0.85} ` +
        `C ${mid + L * 0.08},${y + dir * headR * 0.35} ${mid + L * 0.10},${y} ${mid + L * 0.14},${y} ` +
        `L ${x2},${y}`;

      paths.push(pathD);
    }
  }

  // 2. Línies verticals internes
  for (let c = 1; c < cols; c++) {
    const x = c * cellW;
    for (let r = 0; r < rows; r++) {
      const y1 = r * cellH;
      const y2 = (r + 1) * cellH;
      const L = cellH;
      const dir = getTabDirection(r, c, true);
      const mid = (y1 + y2) / 2;
      const headR = cellW * 0.16;

      const pathD = `M ${x},${y1} ` +
        `L ${x},${mid - L * 0.14} ` +
        `C ${x},${mid - L * 0.10} ${x + dir * headR * 0.35},${mid - L * 0.08} ${x + dir * headR * 0.85},${mid - L * 0.06} ` +
        `C ${x + dir * headR * 2.2},${mid - L * 0.11} ${x + dir * headR * 2.2},${mid + L * 0.11} ${x + dir * headR * 0.85},${mid + L * 0.06} ` +
        `C ${x + dir * headR * 0.35},${mid + L * 0.08} ${x},${mid + L * 0.10} ${x},${mid + L * 0.14} ` +
        `L ${x},${y2}`;

      paths.push(pathD);
    }
  }

  return paths;
}

export default function PuzzleSimulator({ 
  productNom = 'Puzle 5x5', 
  selectedOptions = {}, 
  userAttachedFile = null 
}) {
  const [isLit, setIsLit] = useState(true);
  const [activeTab, setActiveTab] = useState('board'); // 'board' (Tauler puzle) | 'paper' (Mostra en paper)

  // Parsejar matriu de peces (ex: 5x5, 6x10, 10x6)
  const { cols, rows } = useMemo(() => parsePuzzleDimensions(productNom), [productNom]);

  // Proporció d'aspecte real (columnes / files)
  const isSquare = cols === rows;
  const isLandscape = cols > rows;

  // Amplada responsive del contenidor (l'alçada es calcula automàticament per CSS aspectRatio exactament igual a cols/rows)
  const getContainerWidthClass = () => {
    if (isSquare) {
      return 'w-56 sm:w-64';
    }
    if (isLandscape) { // 10x6
      return 'w-64 sm:w-80';
    }
    return 'w-44 sm:w-52'; // 6x10 vertical
  };

  // Detectar opció d'impressió (Gravat làser | Blanc i Negre | Color)
  const printType = useMemo(() => {
    const printKey = Object.keys(selectedOptions).find(k => {
      const l = k.toLowerCase();
      return l.includes('impressió') || l.includes('impressio') || l.includes('acabat') || l.includes('tipus');
    });

    const val = printKey ? String(selectedOptions[printKey] || '').toLowerCase() : '';
    if (val.includes('b/n') || val.includes('blanc') || val.includes('monocrom')) return 'bn';
    if (val.includes('color') || val.includes('normal')) return 'color';
    return 'laser'; // Per defecte: Gravat làser
  }, [selectedOptions]);

  // Detectar opció de mostra en paper (Sí / No)
  const hasSamplePaperOption = useMemo(() => {
    const sampleKey = Object.keys(selectedOptions).find(k => {
      const l = k.toLowerCase();
      return l.includes('mostra') || l.includes('paper');
    });

    if (!sampleKey) return true; // Per defecte mostrar sí
    const val = String(selectedOptions[sampleKey] || '').toLowerCase();
    return val.includes('sí') || val.includes('si') || val.includes('amb');
  }, [selectedOptions]);

  // Imatge activa de mostra (s'utilitzen exclusivament els fitxers en color puzle_exemple_*.png)
  const activeImageSrc = useMemo(() => {
    if (userAttachedFile?.dataUrl) {
      return userAttachedFile.dataUrl;
    }

    if (cols > rows) { // 10x6 (Landscape)
      return resolveMediaUrl('images/puzle_exemple_10x6.png');
    }
    if (rows > cols) { // 6x10 (Portrait)
      return resolveMediaUrl('images/puzle_exemple_6x10.png');
    }
    // Quadrat (4x4, 5x5, 8x8)
    return resolveMediaUrl('images/puzle_exemple_quadrat.png');
  }, [userAttachedFile, cols, rows]);

  // Obtenir la imatge d'overlay PNG de retícula segons les columnes i files (${cols}x${rows})
  const puzzleOverlayImage = useMemo(() => {
    const key = `${cols}x${rows}`;
    const supportedOverlays = ['4x4', '5x5', '6x6', '8x8', '10x6', '6x10'];
    if (supportedOverlays.includes(key)) {
      return resolveMediaUrl(`images/puzle_overlay_${key}.png`);
    }
    return null;
  }, [cols, rows]);

  // Dimensions virtuals SVG segons matriu (cols x 50, rows x 50)
  const svgWidth = cols * 50;
  const svgHeight = rows * 50;

  // Generar camins SVG de la retícula
  const svgPaths = useMemo(() => generateJigsawSvgPaths(svgWidth, svgHeight, rows, cols), [svgWidth, svgHeight, rows, cols]);

  // Estils de filtre segons la tria d'impressió
  const getImageFilterStyle = () => {
    if (printType === 'bn') {
      return { filter: 'grayscale(1) contrast(1.2) brightness(0.98)' };
    }
    if (printType === 'color') {
      return { filter: 'none' };
    }

    // Mode Gravat Làser (To clar i nítid de fusta de bedoll natural amb cremat suau)
    if (userAttachedFile) {
      return { 
        filter: 'url(#laserVectorizeFilter) sepia(0.65) contrast(1.25) brightness(1.02) hue-rotate(-10deg)',
        mixBlendMode: 'multiply'
      };
    }

    // Per als exemples alliberats en color: s'aplica el to de cremat sèpia en fusta clara
    return { 
      filter: 'sepia(0.7) contrast(1.15) brightness(1.04) hue-rotate(-10deg)',
      mixBlendMode: 'multiply'
    };
  };

  return (
    <div className="space-y-2 my-4 animate-fadeIn">
      {/* Escenari del Simulador de Puzle */}
      <div className={`relative w-full py-5 px-3 flex flex-col items-center justify-center rounded-2xl border border-outline/15 shadow-inner min-h-[270px] sm:min-h-[320px] overflow-hidden select-none transition-colors duration-300 ${isLit ? 'bg-gradient-to-b from-surface-container-lowest via-amber-950/5 to-surface-container-lowest' : 'bg-surface-container-lowest'}`}>
        
        {/* Capçalera de Controls Integrats (Pestanya Tauler / Mostra Paper + Llum) */}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-30 pointer-events-auto">
          
          {/* Selector de vista: Tauler de Puzle / Mostra en Paper */}
          <div className="flex items-center bg-surface/90 backdrop-blur-xs border border-outline/25 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'board' ? 'bg-primary text-on-primary shadow-xs' : 'text-primary/70 hover:text-primary'}`}
            >
              <span>Puzle {cols}x{rows}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'paper' ? 'bg-primary text-on-primary shadow-xs' : 'text-primary/70 hover:text-primary'}`}
            >
              <FileText className="w-3 h-3" />
              <span>Full Mostra</span>
            </button>
          </div>

          {/* Badge de to d'impressió */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {printType === 'laser' ? '🔥 Gravat làser' : printType === 'bn' ? '🏁 Blanc i Negre' : '🎨 Color Natural'}
            </span>
          </div>

        </div>

        {/* VISTA 1: TAULER DE PUZLE EN FUSTA AMB PROPORCIÓ EXACTA 100% AJUSTADA */}
        {activeTab === 'board' && (
          <div 
            className={`relative ${getContainerWidthClass()} mt-6 mb-2 rounded-xl overflow-hidden shadow-2xl border-4 border-[#3D2B1F] bg-[#F9F3EA] group transition-all duration-300`}
            style={{ aspectRatio: `${cols} / ${rows}` }}
          >
            {/* Fons de textura de fusta clara de bedoll */}
            <div className="absolute inset-0 bg-[#F9F3EA] opacity-95 mix-blend-multiply pointer-events-none"></div>

            {/* Imatge de la Peça / Exemple amb filtres d'impressió i to de fusta clar */}
            <img 
              src={activeImageSrc} 
              alt="Simulació Puzle" 
              className="w-full h-full object-cover transition-all duration-500"
              style={getImageFilterStyle()}
            />

            {/* Ranures i Marcs de Fusta Cremada Làser */}
            <div className="absolute inset-0 pointer-events-none shadow-inner border border-amber-950/20"></div>

            {/* Capa Retícula de tall del Puzle (PNG d'alta fidelitat per a mides suportades o SVG vectorial com a fallback) */}
            {puzzleOverlayImage ? (
              <img 
                src={puzzleOverlayImage} 
                alt={`Tall Puzle ${cols}x${rows}`} 
                className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-90 mix-blend-multiply drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] z-10"
              />
            ) : (
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] z-10"
              >
                <defs>
                  {/* Filtre de Vectorització Suau Làser per a imatges que pugi l'usuari */}
                  <filter id="laserVectorizeFilter">
                    <feColorMatrix type="saturate" values="0" result="gray" />
                    <feComponentTransfer in="gray" result="posterized">
                      <feFuncR type="discrete" tableValues="0.12 0.40 0.75 0.98" />
                      <feFuncG type="discrete" tableValues="0.12 0.40 0.75 0.98" />
                      <feFuncB type="discrete" tableValues="0.12 0.40 0.75 0.98" />
                    </feComponentTransfer>
                  </filter>

                  <filter id="puzzleCutShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0.3" dy="0.4" stdDeviation="0.4" floodColor="#1A0D05" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Dibuix de cada línia de tall interna amb nòduls rodons i traçat prim */}
                {svgPaths.map((dPath, idx) => (
                  <path 
                    key={idx} 
                    d={dPath} 
                    fill="none" 
                    stroke="#28170D" 
                    strokeWidth="1.2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#puzzleCutShadow)"
                    opacity="0.82"
                  />
                ))}

                {/* Marc de bisellat exterior */}
                <rect x="1" y="1" width={svgWidth - 2} height={svgHeight - 2} fill="none" stroke="#28170D" strokeWidth="1.8" opacity="0.85" />
              </svg>
            )}
          </div>
        )}

        {/* VISTA 2: PREVISUALITZACIÓ DEL FULL DE PAPER DE MOSTRA AMB DIV INFORMATIU A LA DRETA */}
        {activeTab === 'paper' && (
          <div className="mt-6 mb-2 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-fadeIn">
            
            {/* Targeta neta del Full de Paper de Mostra (sense textos a dalt/baix) */}
            <div className="relative w-44 sm:w-52 rounded-xl bg-white shadow-2xl border border-slate-200 p-2.5 flex items-center justify-center transition-all duration-300">
              {hasSamplePaperOption ? (
                <div 
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 overflow-hidden shadow-xs relative"
                  style={{ aspectRatio: `${cols} / ${rows}` }}
                >
                  <img 
                    src={activeImageSrc} 
                    alt="Mostra en Paper" 
                    className={`w-full h-full object-cover transition-all ${(printType === 'bn' || printType === 'laser') ? 'grayscale' : ''}`}
                  />
                </div>
              ) : (
                <div 
                  className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-1"
                  style={{ aspectRatio: `${cols} / ${rows}` }}
                >
                  <FileText className="w-7 h-7 mx-auto opacity-40" />
                  <p className="text-[10px] font-serif italic">Full en blanc</p>
                </div>
              )}
            </div>

            {/* Div informatiu a la dreta amb el text sol·licitat */}
            <div className="bg-surface-container/60 border border-outline/20 p-3.5 rounded-xl text-center sm:text-left max-w-[210px] space-y-1 shadow-2xs">
              <p className="text-xs font-semibold text-primary leading-relaxed font-sans">
                {hasSamplePaperOption 
                  ? "Imatge de mostra impresa en paper." 
                  : "Imatge de mostra en paper en blanc."}
              </p>
              {hasSamplePaperOption && (printType === 'laser' || printType === 'bn') && (
                <p className="text-[10px] text-on-surface-variant/80 font-mono">
                  (Impressió en Blanc i Negre)
                </p>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Llegenda Explicativa del Simulador de Puzle */}
      <p className="text-[10px] text-on-surface-variant/75 font-mono text-center pt-0.5 px-1 leading-snug">
        Simulació del resultat, que pot no coincidir amb la peça real.<br />
        La imatge s'ajustarà al espai disponible.
      </p>
    </div>
  );
}
