import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, Check, RefreshCw, RotateCw, Layers, ArrowLeftRight, HelpCircle } from 'lucide-react';

// Posicions normalitzades % a la CARA FRONTAL (Cara A) per a la matriu 3x3 (A a I)
const HOLE_POSITIONS = {
  A: { label: 'A', x: 14, y: 18, desc: 'Sup. Esquerre', row: 'sup' },
  B: { label: 'B', x: 50, y: 18, desc: 'Sup. Centre', row: 'sup' },
  C: { label: 'C', x: 86, y: 18, desc: 'Sup. Dret', row: 'sup' },
  D: { label: 'D', x: 14, y: 50, desc: 'Central Esquerre', row: 'mid' },
  E: { label: 'E', x: 50, y: 50, desc: 'Centre Absolut', row: 'mid' },
  F: { label: 'F', x: 86, y: 50, desc: 'Central Dret', row: 'mid' },
  G: { label: 'G', x: 14, y: 82, desc: 'Inf. Esquerre', row: 'inf' },
  H: { label: 'H', x: 50, y: 82, desc: 'Inf. Centre', row: 'inf' },
  I: { label: 'I', x: 86, y: 82, desc: 'Inf. Dret', row: 'inf' }
};

// Presets típics de perforació
const HOLE_PRESETS = [
  { label: 'Sense forats', holes: [] },
  { label: '2 laterals (D + F)', holes: ['D', 'F'] },
  { label: '4 cantons (A+C+G+I)', holes: ['A', 'C', 'G', 'I'] },
  { label: '1 sup. centre (B)', holes: ['B'] },
  { label: '2 sup. cantons (A + C)', holes: ['A', 'C'] }
];

export default function EtiquetaSimulator({
  productNom = 'Etiquetes Identificatives',
  productCodi = 'XR',
  midesDisponibles = [],
  selectedOptions = {},
  setSelectedOptions = () => {},
  phraseText = '',
  phraseTextB = ''
}) {
  // 1. Mides per defecte
  const defaultMides = useMemo(() => {
    if (Array.isArray(midesDisponibles) && midesDisponibles.length > 0) {
      return midesDisponibles;
    }
    return ['15 x 50 mm', '15 x 60 mm', '25 x 60 mm'];
  }, [midesDisponibles]);

  // Estat de la mida seleccionada
  const selectedMida = selectedOptions['Mida de l\'etiqueta'] || defaultMides[0] || '15 x 60 mm';

  // Estat de la cara activa ('caraA' = Frontal / Davantera, 'caraB' = Posterior / Darrere)
  const [activeSide, setActiveSide] = useState('caraA');
  const [isFlipping, setIsFlipping] = useState(false);

  // Text per a Cara A i Cara B
  const textA = phraseText || selectedOptions['Text (Cara A)'] || selectedOptions['Text Cara A'] || '';
  const textB = phraseTextB || selectedOptions['Text (Cara B)'] || selectedOptions['Text Cara B'] || '';

  // Estat dels forats seleccionats (Conjunt de lletres, p. ex. ['A', 'F'])
  const activeHoles = useMemo(() => {
    const raw = selectedOptions['Forats seleccionats'];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',').map(s => s.trim().toUpperCase()).filter(s => HOLE_POSITIONS[s]);
    }
    return ['A']; // Per defecte 1 forat a la A (Superior Esquerre)
  }, [selectedOptions['Forats seleccionats']]);

  // Commutar selecció d'un forat (A - I)
  const handleToggleHole = (holeKey) => {
    let nextHoles;
    if (activeHoles.includes(holeKey)) {
      nextHoles = activeHoles.filter(h => h !== holeKey);
    } else {
      nextHoles = [...activeHoles, holeKey].sort();
    }

    const holesStr = nextHoles.join(', ');
    const calculatedCode = generateGeneratedCode(productCodi, selectedMida, nextHoles);

    setSelectedOptions(prev => ({
      ...prev,
      'Mida de l\'etiqueta': selectedMida,
      'Forats seleccionats': nextHoles,
      'Forats (Resum)': holesStr ? `${holesStr} (${calculatedCode})` : `Sense forats (${calculatedCode})`,
      'Codi Model Generat': calculatedCode
    }));
  };

  // Aplicar un preset de forats
  const handleApplyPreset = (presetHoles) => {
    const nextHoles = [...presetHoles].sort();
    const holesStr = nextHoles.join(', ');
    const calculatedCode = generateGeneratedCode(productCodi, selectedMida, nextHoles);

    setSelectedOptions(prev => ({
      ...prev,
      'Mida de l\'etiqueta': selectedMida,
      'Forats seleccionats': nextHoles,
      'Forats (Resum)': holesStr ? `${holesStr} (${calculatedCode})` : `Sense forats (${calculatedCode})`,
      'Codi Model Generat': calculatedCode
    }));
  };

  // Seleccionar Mida
  const handleSelectMida = (midaStr) => {
    const calculatedCode = generateGeneratedCode(productCodi, midaStr, activeHoles);
    const holesStr = activeHoles.join(', ');

    setSelectedOptions(prev => ({
      ...prev,
      'Mida de l\'etiqueta': midaStr,
      'Forats (Resum)': holesStr ? `${holesStr} (${calculatedCode})` : `Sense forats (${calculatedCode})`,
      'Codi Model Generat': calculatedCode
    }));
  };

  // Netejar tots els forats
  const handleClearHoles = () => {
    const calculatedCode = generateGeneratedCode(productCodi, selectedMida, []);
    setSelectedOptions(prev => ({
      ...prev,
      'Forats seleccionats': [],
      'Forats (Resum)': `Sense forats (${calculatedCode})`,
      'Codi Model Generat': calculatedCode
    }));
  };

  // Girar la peça amb animació 3D
  const handleFlipPiece = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setActiveSide(prev => prev === 'caraA' ? 'caraB' : 'caraA');
      setIsFlipping(false);
    }, 150);
  };

  // Generar codi intern de fabricació (ex: XR1560AF)
  function generateGeneratedCode(baseCodi, midaStr, holesArr) {
    const base = (baseCodi || 'XR').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'XR';
    const nums = (midaStr || '').replace(/[^0-9]/g, '');
    const cleanNums = nums.length >= 4 ? nums.slice(0, 4) : (nums || '1560');
    const holesSuffix = (holesArr || []).sort().join('');
    return `${base}${cleanNums}${holesSuffix}`;
  }

  const generatedCode = useMemo(() => {
    return generateGeneratedCode(productCodi, selectedMida, activeHoles);
  }, [productCodi, selectedMida, activeHoles]);

  // Determinar la forma geomètrica segons el nom del producte
  const shapeType = useMemo(() => {
    const nom = (productNom || '').toLowerCase();
    if (nom.includes('circul') || nom.includes('rodó')) return 'circle';
    if (nom.includes('oval')) return 'ellipse';
    if (nom.includes('medall')) return 'medal';
    return 'rounded_rect';
  }, [productNom]);

  // Càlcul de dimensions de l'etiqueta
  const { widthMm, heightMm, viewBoxW, viewBoxH, aspectStyle } = useMemo(() => {
    const numbers = (selectedMida || '').match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const n1 = parseInt(numbers[0], 10);
      const n2 = parseInt(numbers[1], 10);
      if (n1 > 0 && n2 > 0) {
        const w = Math.max(n1, n2);
        const h = Math.min(n1, n2);
        const vw = 300;
        const vh = Math.max(75, Math.round(300 * (h / w)));
        return {
          widthMm: w,
          heightMm: h,
          viewBoxW: vw,
          viewBoxH: vh,
          aspectStyle: { aspectRatio: `${w} / ${h}` }
        };
      }
    }
    return {
      widthMm: 60,
      heightMm: 15,
      viewBoxW: 300,
      viewBoxH: 75,
      aspectStyle: { aspectRatio: '60 / 15' }
    };
  }, [selectedMida]);

  // Ajustar la mida de la font del gravat de text
  const getPhraseFontSize = (txt) => {
    const len = (txt || '').length;
    if (len <= 10) return 'text-xs sm:text-sm';
    if (len <= 25) return 'text-[11px] sm:text-xs';
    if (len <= 45) return 'text-[10px] sm:text-[11px]';
    return 'text-[9px] sm:text-[10px]';
  };

  // Text visible segons la cara activa
  const currentVisibleText = activeSide === 'caraA' ? textA : textB;

  return (
    <div className="w-full bg-surface-container-lowest border border-outline/15 rounded-2xl p-4 sm:p-5 space-y-5 shadow-xs">
      
      {/* Capçalera del Simulador */}
      <div className="flex items-center justify-between border-b border-outline/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-serif font-bold text-primary tracking-wide uppercase">
            Simulador d'Etiqueta & Forats Interactiu
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Model: {generatedCode}
          </span>
        </div>
      </div>

      {/* SECCIÓ 1: Selector de Mida i Commutador de Cara (Frontal / Posterior) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <label className="block text-xs font-mono font-bold uppercase text-on-surface-variant">
            1. Mida de l'Etiqueta:
          </label>
          <div className="flex flex-wrap gap-2">
            {defaultMides.map((mida, idx) => {
              const isSelected = selectedMida === mida;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectMida(mida)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-primary text-on-primary ring-2 ring-primary/40 font-bold'
                      : 'bg-surface hover:bg-surface-container text-primary border border-outline/25'
                  }`}
                >
                  {mida}
                </button>
              );
            })}
          </div>
        </div>

        {/* Commutador de Cara (Cara A / Cara B) */}
        <div className="space-y-1.5 shrink-0">
          <label className="block text-xs font-mono font-bold uppercase text-on-surface-variant text-left sm:text-right">
            Vista de Cara:
          </label>
          <div className="flex items-center bg-surface border border-outline/25 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveSide('caraA')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeSide === 'caraA'
                  ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Cara A (Frontal)
            </button>
            <button
              type="button"
              onClick={handleFlipPiece}
              className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
              title="Girar etiqueta (efecte flip 180°)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('caraB')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeSide === 'caraB'
                  ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Cara B (Posterior)
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓ 2: VISTA 2D DE L'ETIQUETA SIMULADA (Fusta Natural + Forats Invertits en Gir + Gravat) */}
      <div className="relative w-full py-4 px-3 flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline/15 shadow-inner select-none">
        
        {/* Indicador de Cara Visible */}
        <div className="flex items-center justify-between w-full max-w-[360px] mb-2 px-1 text-[11px] font-mono">
          <span className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
            {activeSide === 'caraA' ? '🏷️ Cara A (Davantera)' : '🔄 Cara B (Darrere / Posterior)'}
          </span>
          <button
            type="button"
            onClick={handleFlipPiece}
            className="text-primary hover:underline flex items-center gap-1 cursor-pointer text-[10px] font-medium"
          >
            <RotateCw className="w-3 h-3" />
            <span>Girar etiqueta</span>
          </button>
        </div>

        {/* Container dinàmic de l'etiqueta amb perspectiva 3D per al gir */}
        <div
          className={`relative w-full max-w-[300px] sm:max-w-[360px] flex items-center justify-center shadow-md rounded-xl my-1 transition-all duration-300 ${
            isFlipping ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
          }`}
          style={aspectStyle}
        >
          {/* Renderitzat de Fusta amb SVG segons Forma */}
          <svg viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} className="w-full h-full drop-shadow-md overflow-visible">
            <defs>
              {/* Textura fusta natural */}
              <linearGradient id="etiquetaWood" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF4EC" />
                <stop offset="35%" stopColor="#F2E6D8" />
                <stop offset="70%" stopColor="#EAD8C3" />
                <stop offset="100%" stopColor="#DFCAAF" />
              </linearGradient>

              {/* Ombra interna de perforació de forat */}
              <radialGradient id="holeInnerShadow" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#2B1A0E" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4A3222" stopOpacity="1" />
              </radialGradient>
            </defs>

            {/* Silueta de l'etiqueta */}
            {shapeType === 'circle' ? (
              <circle cx={viewBoxW / 2} cy={viewBoxH / 2} r={Math.min(viewBoxW, viewBoxH) / 2 - 5} fill="url(#etiquetaWood)" stroke="#4A3222" strokeWidth="3" />
            ) : shapeType === 'ellipse' ? (
              <ellipse cx={viewBoxW / 2} cy={viewBoxH / 2} rx={viewBoxW / 2 - 5} ry={viewBoxH / 2 - 5} fill="url(#etiquetaWood)" stroke="#4A3222" strokeWidth="3" />
            ) : (
              <rect x="5" y="5" width={viewBoxW - 10} height={viewBoxH - 10} rx={Math.min(16, viewBoxH * 0.22)} fill="url(#etiquetaWood)" stroke="#4A3222" strokeWidth="3" />
            )}

            {/* RENDERITZAT DELS FORATS ACTIVATS A LES POSICIONS (A - I) */}
            {/* Si estem a la Cara B, s'inverteix horitzontalment la posició X (100% - x) */}
            {Object.keys(HOLE_POSITIONS).map((key) => {
              const pos = HOLE_POSITIONS[key];
              const isActive = activeHoles.includes(key);
              if (!isActive) return null;

              // Coordenada X adaptada segons la cara (Frontal vs Posterior invertida)
              const normalizedX = activeSide === 'caraA' ? pos.x : (100 - pos.x);
              const cx = (normalizedX / 100) * viewBoxW;
              const cy = (pos.y / 100) * viewBoxH;

              return (
                <g key={key} className="animate-fadeIn">
                  {/* Vora de cremat làser al voltant del forat */}
                  <circle cx={cx} cy={cy} r="6.5" fill="none" stroke="#4A3222" strokeWidth="1.5" />
                  {/* Forat calat fosquíssim */}
                  <circle cx={cx} cy={cy} r="5" fill="url(#holeInnerShadow)" />
                  {/* Lletra identificadora del forat físic */}
                  <text x={cx} y={cy + 2.2} textAnchor="middle" fill="#FAF4EC" fontSize="6" fontFamily="monospace" fontWeight="bold" opacity="0.95">
                    {key}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* GRAVAT DE TEXT EN TEMPS REAL AL CENTRE DE L'ETIQUETA (Cara A o Cara B) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none z-10">
            {currentVisibleText && currentVisibleText.trim() ? (
              <p className={`text-[#24170E] font-serif font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] ${getPhraseFontSize(currentVisibleText)} animate-fadeIn max-w-[82%] whitespace-pre-wrap leading-snug`}>
                {currentVisibleText}
              </p>
            ) : (
              <p className="text-[10px] font-serif italic text-[#8B6E59]/60">
                {activeSide === 'caraA' ? '(Text Cara A gravat aquí...)' : '(Text Cara B gravat aquí...)'}
              </p>
            )}
          </div>
        </div>

        {/* Nota explicativa de gir quan s'està a la Cara B */}
        {activeSide === 'caraB' && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400/90 font-mono mt-1 text-center">
            * Vista Cara Posterior: Els forats es mostren invertits d'esquerra a dreta per efecte del gir físic de la peça.
          </p>
        )}
      </div>

      {/* SECCIÓ 3: Panell Interactiu de Forats Endreçat per Files (Esquema A - I) */}
      <div className="space-y-3 pt-2 border-t border-outline/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-mono font-bold uppercase text-on-surface-variant">
            2. Matriu de Forats (Referència Cara Frontal):
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

        {/* Presets ràpids */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-on-surface-variant/80 font-mono">Configuracions ràpides:</span>
          {HOLE_PRESETS.map((preset, pIdx) => {
            const isPresetActive = preset.holes.length === activeHoles.length &&
              preset.holes.every(h => activeHoles.includes(h));

            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleApplyPreset(preset.holes)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                  isPresetActive
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant border-outline/20'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Graella 3x3 Interactiva Endreçada per Files (Superior, Mig, Inferior) */}
        <div className="max-w-sm mx-auto p-3 bg-surface-container/40 rounded-xl border border-outline/15 space-y-2">
          {/* Fila 1: Superior (A, B, C) */}
          <div>
            <span className="text-[9px] font-mono uppercase text-on-surface-variant/60 block mb-1">Fila Superior</span>
            <div className="grid grid-cols-3 gap-2">
              {['A', 'B', 'C'].map(key => {
                const pos = HOLE_POSITIONS[key];
                const isActive = activeHoles.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHole(key)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                      isActive
                        ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                        : 'bg-surface hover:bg-surface-container-high text-primary border-outline/25 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{key}</span>
                      {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-[8px] font-sans font-normal opacity-80 truncate">{pos.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 2: Central (D, E, F) */}
          <div>
            <span className="text-[9px] font-mono uppercase text-on-surface-variant/60 block mb-1">Fila Central</span>
            <div className="grid grid-cols-3 gap-2">
              {['D', 'E', 'F'].map(key => {
                const pos = HOLE_POSITIONS[key];
                const isActive = activeHoles.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHole(key)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                      isActive
                        ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                        : 'bg-surface hover:bg-surface-container-high text-primary border-outline/25 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{key}</span>
                      {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-[8px] font-sans font-normal opacity-80 truncate">{pos.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Inferior (G, H, I) */}
          <div>
            <span className="text-[9px] font-mono uppercase text-on-surface-variant/60 block mb-1">Fila Inferior</span>
            <div className="grid grid-cols-3 gap-2">
              {['G', 'H', 'I'].map(key => {
                const pos = HOLE_POSITIONS[key];
                const isActive = activeHoles.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHole(key)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                      isActive
                        ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                        : 'bg-surface hover:bg-surface-container-high text-primary border-outline/25 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{key}</span>
                      {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-[8px] font-sans font-normal opacity-80 truncate">{pos.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resum de forats seleccionats */}
        <div className="flex items-center justify-between text-[11px] font-mono bg-surface border border-outline/15 rounded-xl p-2.5">
          <span className="text-on-surface-variant">Forats actius:</span>
          <span className="font-bold text-primary">
            {activeHoles.length > 0 ? activeHoles.join(', ') : 'Cap forat (peça cega)'}
          </span>
        </div>
      </div>

    </div>
  );
}
