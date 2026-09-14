import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, ArrowRight, Maximize2, X } from 'lucide-react';
import { formatSecondsToHMS } from '../../data/projeccInitialData';

export function ProjeccActiveTimersDock({
  activeTimers = [],
  onOpenTimer,
  onTogglePause,
  isDark
}) {
  const [, setTick] = useState(0);

  // Interval per actualitzar el comptador en temps real al dock
  useEffect(() => {
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers.length]);

  if (!activeTimers || activeTimers.length === 0) return null;

  const calculateElapsed = (t) => {
    if (!t) return 0;
    const accumulated = Number(t.accumulatedSeconds) || 0;
    if (t.isRunning && t.startTimestamp) {
      const live = Math.floor((Date.now() - t.startTimestamp) / 1000);
      return Math.max(0, accumulated + (live > 0 ? live : 0));
    }
    return accumulated;
  };

  return (
    <aside 
      aria-label="Cronòmetres simultanis en curs"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl pointer-events-none animate-slideUp"
    >
      <div className={`pointer-events-auto p-2 sm:p-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-2 transition-all ${
        isDark 
          ? 'bg-slate-900/95 border-amber-500/30 text-slate-100 shadow-amber-950/20' 
          : 'bg-white/95 border-amber-400 text-slate-900 shadow-slate-900/15'
      }`}>
        
        {/* Capçalera compacta del Dock */}
        <div className="flex items-center gap-2 px-2 py-0.5 text-xs font-bold shrink-0 self-start sm:self-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-amber-500 font-mono tracking-wider uppercase text-[11px]">
            Taller Actiu ({activeTimers.length}/3)
          </span>
        </div>

        {/* Llista de ranures actives */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
          {activeTimers.map((t, idx) => {
            const elapsed = calculateElapsed(t);
            const isRunning = t.isRunning;

            return (
              <div
                key={t.id || idx}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none group ${
                  isRunning
                    ? isDark 
                      ? 'bg-slate-800/90 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800' 
                      : 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-500'
                    : isDark 
                      ? 'bg-slate-950/70 border-slate-700 hover:border-amber-400/50' 
                      : 'bg-slate-100 border-slate-300 hover:border-amber-400'
                }`}
                onClick={() => onOpenTimer(t.id)}
                title="Clica per obrir el cronòmetre d'aquesta tasca a pantalla completa"
              >
                {/* Indicador d'estat */}
                <span className="flex h-2 w-2 relative shrink-0">
                  {isRunning ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                  )}
                </span>

                {/* Nom tasca i comptador */}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[11px] font-bold truncate max-w-[110px] sm:max-w-[130px] leading-tight">
                    {t.taskNom}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {formatSecondsToHMS(elapsed)}
                    </span>
                    <span className="truncate max-w-[70px] hidden sm:inline">
                      • {t.itemNom}
                    </span>
                  </div>
                </div>

                {/* Botó pausa / reprendre ràpid */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePause(t.id);
                  }}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isRunning 
                      ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-700/50' 
                      : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50'
                  }`}
                  title={isRunning ? 'Pausar tasca' : 'Reprendre tasca'}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>

                {/* Icona obrir */}
                <div className="text-slate-500 group-hover:text-amber-400 transition-colors shrink-0">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </aside>
  );
}
