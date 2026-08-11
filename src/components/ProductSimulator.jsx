import React, { useState } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';

export default function ProductSimulator({ initialLetter = '', phraseText = '', onInitialChange, onPhraseChange }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Netejar inicial: 1 sola lletra majúscula
  const cleanInitial = (initialLetter || '').trim().charAt(0).toUpperCase();

  // Netejar frase: màxim 80 caràcters
  const cleanPhrase = (phraseText || '').slice(0, 80);

  // Mida dinàmica de la font per a la Cara B (Molt més gran i ocupant la fusta)
  const getPhraseFontSize = (text) => {
    const len = text.length;
    if (len <= 15) return 'text-xl md:text-2xl font-bold font-serif leading-snug';
    if (len <= 35) return 'text-lg md:text-xl font-bold font-serif leading-snug';
    if (len <= 55) return 'text-base md:text-lg font-bold font-serif leading-snug';
    return 'text-sm md:text-base font-bold font-serif leading-tight';
  };

  return (
    <div className="space-y-4 my-6">
      {/* Barra de control del simulador */}
      <div className="flex items-center justify-between bg-surface-container/60 px-4 py-2.5 rounded-xl border border-outline/15 text-xs font-mono">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Simulador de Gravat en Temps Real</span>
        </div>
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          <span>{isFlipped ? 'Girar a Cara A (Inicial)' : 'Girar a Cara B (Frase)'}</span>
        </button>
      </div>

      {/* Escenari 3D del Clauer amb la silueta real de la peca */}
      <div className="relative w-full py-8 flex flex-col items-center justify-center bg-gradient-to-b from-surface-container-lowest via-surface-container/30 to-surface-container-lowest rounded-2xl border border-outline/15 shadow-inner min-h-[330px] overflow-hidden select-none">
        
        {/* Anella metàl·lica superior passant pel forat de la peca */}
        <div className="absolute top-2 flex flex-col items-center z-20 pointer-events-none">
          <div className="w-9 h-9 rounded-full border-4 border-slate-300 shadow-md bg-transparent"></div>
          <div className="w-2.5 h-5 bg-slate-400/90 rounded-sm -mt-2 shadow-xs border border-slate-500"></div>
        </div>

        {/* Contenidor 3D Flip Card amb la silueta exacta de la peca */}
        <div className="w-56 h-72 perspective-1000 mt-5 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div 
            className="relative w-full h-full duration-700 transform-style-3d transition-transform"
            style={{
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            
            {/* FRONT FACE: CARA A (INICIAL AMB SILUETA REAL I LLETRA GRAVADA) */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                zIndex: isFlipped ? 1 : 2
              }}
            >
              <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-xl overflow-visible">
                <defs>
                  {/* Fusta clara de bedoll / pollancre */}
                  <linearGradient id="woodBase" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F7EBD9" />
                    <stop offset="50%" stopColor="#EFE1C9" />
                    <stop offset="100%" stopColor="#E4D1B5" />
                  </linearGradient>

                  {/* Ombra de vora cremada làser */}
                  <filter id="laserEdge" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2B1A0E" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Cos de la peca amb la silueta exacta (sostre en angle, costats rectes i base corbada) */}
                <path 
                  d="M 100,6 L 194,52 L 194,160 C 194,242 6,242 6,160 L 6,52 Z" 
                  fill="url(#woodBase)" 
                  stroke="#4A3222" 
                  strokeWidth="3.5" 
                  strokeLinejoin="round" 
                  filter="url(#laserEdge)"
                />

                {/* Forat superior per a l'anella */}
                <circle cx="100" cy="24" r="8" fill="#3D2B1F" stroke="#2B1A0E" strokeWidth="1.5" />

                {/* Etiqueta discreta de cara */}
                <text x="100" y="44" textAnchor="middle" fill="#6B4E3D" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.6">
                  CARA A
                </text>

                {/* Inicial gravada en fusta fosca (estil idèntic a la foto real, cos gran) */}
                {cleanInitial ? (
                  <text 
                    x="100" 
                    y="172" 
                    textAnchor="middle" 
                    fill="#24170E" 
                    fontSize="145" 
                    fontFamily="serif" 
                    fontWeight="bold"
                    style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.4), -1px -1px 2px rgba(0,0,0,0.6)' }}
                  >
                    {cleanInitial}
                  </text>
                ) : (
                  <text 
                    x="100" 
                    y="155" 
                    textAnchor="middle" 
                    fill="#A88C78" 
                    fontSize="75" 
                    fontFamily="serif" 
                    fontStyle="italic"
                    opacity="0.5"
                  >
                    ?
                  </text>
                )}
              </svg>
            </div>

            {/* BACK FACE: CARA B (FRASE / DEDICATÒRIA AMB LA MATEIXA SILUETA REAL) */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{
                transform: 'rotateY(180deg)',
                WebkitTransform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                zIndex: isFlipped ? 2 : 1
              }}
            >
              <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-xl overflow-visible">
                {/* Cos de la peca amb la silueta exacta */}
                <path 
                  d="M 100,6 L 194,52 L 194,160 C 194,242 6,242 6,160 L 6,52 Z" 
                  fill="url(#woodBase)" 
                  stroke="#4A3222" 
                  strokeWidth="3.5" 
                  strokeLinejoin="round" 
                  filter="url(#laserEdge)"
                />

                {/* Forat superior per a l'anella */}
                <circle cx="100" cy="24" r="8" fill="#3D2B1F" stroke="#2B1A0E" strokeWidth="1.5" />

                {/* Etiqueta de cara */}
                <text x="100" y="44" textAnchor="middle" fill="#6B4E3D" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.6">
                  CARA B
                </text>
              </svg>

              {/* Frase / Dedicatòria gravada centrada dins de la silueta (fidel a la placa real) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pt-8 text-center pointer-events-none">
                {cleanPhrase ? (
                  <p className={`text-[#24170E] font-serif font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] ${getPhraseFontSize(cleanPhrase)} animate-fadeIn max-w-[178px] whitespace-pre-wrap leading-snug`}>
                    {cleanPhrase}
                  </p>
                ) : (
                  <p className="text-xs font-serif italic text-[#8B6E59]/70">
                    (Escriu la teva frase a sota...)
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Indicador de gir */}
        <p className="text-[11px] font-mono text-on-surface-variant/70 mt-4 flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 text-primary" />
          <span>Fes clic sobre la peça per girar el clauer</span>
        </p>
      </div>
    </div>
  );
}
