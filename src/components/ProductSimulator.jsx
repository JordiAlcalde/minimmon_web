import React, { useState } from 'react';
import { RotateCw, Sun } from 'lucide-react';

export default function ProductSimulator({ initialLetter = '', phraseText = '' }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLit, setIsLit] = useState(true);

  // Netejar inicial: 1 sola lletra majúscula
  const cleanInitial = (initialLetter || '').trim().charAt(0).toUpperCase();

  // Netejar frase: màxim 80 caràcters
  const cleanPhrase = (phraseText || '').slice(0, 80);

  // Mida dinàmica de la font per a la Cara B
  const getPhraseFontSize = (text) => {
    const len = text.length;
    if (len <= 15) return 'text-sm sm:text-base md:text-lg font-bold font-serif leading-snug';
    if (len <= 35) return 'text-xs sm:text-sm md:text-base font-bold font-serif leading-snug';
    if (len <= 55) return 'text-[11px] sm:text-xs md:text-sm font-bold font-serif leading-snug';
    return 'text-[10px] sm:text-[11px] md:text-xs font-bold font-serif leading-tight';
  };

  return (
    <div className="space-y-2 my-3">
      {/* Escenari 3D del Clauer (Mida molt compacta per veure canvis mentre s'edita en mòbil) */}
      <div className={`relative w-full py-3 px-2 flex flex-col items-center justify-center rounded-2xl border border-outline/15 shadow-inner min-h-[195px] sm:min-h-[235px] overflow-hidden select-none transition-colors duration-300 ${isLit ? 'bg-gradient-to-b from-surface-container-lowest via-amber-950/5 to-surface-container-lowest' : 'bg-surface-container-lowest'}`}>
        
        {/* Controls integrats dibuixats en blau (A B a l'esquerra, Bombeta al centre, Gir a la dreta) */}
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-30 pointer-events-auto">
          {/* Selector A / B (AB en blau) */}
          <div className="flex items-center bg-surface/90 backdrop-blur-xs border border-outline/25 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${!isFlipped ? 'bg-primary text-on-primary shadow-xs' : 'text-primary/70 hover:text-primary'}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${isFlipped ? 'bg-primary text-on-primary shadow-xs' : 'text-primary/70 hover:text-primary'}`}
            >
              B
            </button>
          </div>

          {/* Botó de girar (Icona de gir en blau) */}
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-1.5 bg-surface/90 hover:bg-surface text-primary rounded-lg border border-outline/25 shadow-xs transition-transform cursor-pointer active:scale-95"
            title="Girar la peça"
          >
            <RotateCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Anella metàl·lica superior passant pel forat de la peca */}
        <div className="relative flex flex-col items-center z-20 pointer-events-none mt-4">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-3 border-slate-300 shadow-md bg-transparent"></div>
          <div className="w-2 h-3 sm:w-2.5 sm:h-3.5 bg-slate-400/90 rounded-sm -mt-1.5 shadow-xs border border-slate-500"></div>
        </div>

        {/* Contenidor 3D Flip Card amb la silueta exacta (Mida molt compacta per veure canvis mentre s'edita) */}
        <div className="w-36 h-48 sm:w-44 sm:h-56 perspective-1000 -mt-1 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div 
            className="relative w-full h-full duration-700 transform-style-3d transition-transform"
            style={{
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            
            {/* FRONT FACE: CARA A */}
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

                {/* Etiqueta discreta de cara */}
                <text x="100" y="44" textAnchor="middle" fill="#6B4E3D" fontSize="9" fontFamily="monospace" letterSpacing="1.5" opacity="0.6">
                  CARA A
                </text>

                {/* Inicial gravada en fusta fosca */}
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

            {/* BACK FACE: CARA B */}
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
                <text x="100" y="44" textAnchor="middle" fill="#6B4E3D" fontSize="9" fontFamily="monospace" letterSpacing="1.5" opacity="0.6">
                  CARA B
                </text>
              </svg>

              {/* Frase / Dedicatòria gravada centrada dins de la silueta */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2.5 pt-5 text-center pointer-events-none">
                {cleanPhrase ? (
                  <p className={`text-[#24170E] font-serif font-bold tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] ${getPhraseFontSize(cleanPhrase)} animate-fadeIn max-w-[130px] sm:max-w-[150px] whitespace-pre-wrap leading-snug`}>
                    {cleanPhrase}
                  </p>
                ) : (
                  <p className="text-[10px] font-serif italic text-[#8B6E59]/70">
                    (Escriu la teva frase a sobre...)
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Llegenda explicativa del simulador */}
      <p className="text-[10px] text-on-surface-variant/70 font-mono text-center pt-1 px-1">
        Simulació del resultat, que pot no coincidir amb la peça real.<br />
        La imatge s'ajustarà al espai disponible.
      </p>
    </div>
  );
}



