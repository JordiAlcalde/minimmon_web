import React from 'react';
import { 
  ArrowLeft, PieChart, BarChart3, Clock, Calendar, 
  TrendingUp, CheckCircle2, Award, Zap, Layers 
} from 'lucide-react';
import { formatSecondsToHMS, formatSecondsHuman, formatDateDMY } from '../../data/projeccInitialData';

const COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export function ProjeccAnalytics({ item, isDark, onBack }) {
  if (!item) return null;

  const tasks = Array.isArray(item.tasques) ? item.tasques : [];
  
  // Càlculs de mètriques
  const taskStats = tasks.map((t, idx) => {
    const sessions = Array.isArray(t.sessions) ? t.sessions : [];
    const totalSec = sessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);
    return {
      id: t.id,
      nom: t.nom,
      totalSec,
      sessionCount: sessions.length,
      color: COLORS[idx % COLORS.length]
    };
  }).filter(t => t.totalSec > 0 || t.sessionCount > 0);

  const grandTotalSeconds = taskStats.reduce((acc, t) => acc + t.totalSec, 0);
  const totalSessionsCount = taskStats.reduce((acc, t) => acc + t.sessionCount, 0);
  const avgSessionSeconds = totalSessionsCount > 0 ? Math.round(grandTotalSeconds / totalSessionsCount) : 0;
  
  // Tasca amb més temps
  const mostIntensiveTask = taskStats.slice().sort((a, b) => b.totalSec - a.totalSec)[0] || null;

  // Agrupació de sessions per data
  const dateMap = {};
  tasks.forEach(t => {
    (t.sessions || []).forEach(s => {
      const d = s.data || 'Sense data';
      dateMap[d] = (dateMap[d] || 0) + (Number(s.duradaSegons) || 0);
    });
  });
  const dateEntries = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Capçalera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                item.tipus === 'projecte' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}
              </span>
              <span className="text-xs text-slate-400">Anàlisi i Gràfics</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-amber-500">
              {item.nomDefinitiu || item.nomProvisional || item.nom}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Targetes de Mètriques Clau */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Temps Total</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-amber-400">
              {formatSecondsToHMS(grandTotalSeconds)}
            </div>
            <p className="text-[11px] text-slate-400">{formatSecondsHuman(grandTotalSeconds)} de feina</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Sessions</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
              {totalSessionsCount}
            </div>
            <p className="text-[11px] text-slate-400">en {taskStats.length} tasques actives</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>Mitjana / Sessió</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-blue-400">
              {formatSecondsHuman(avgSessionSeconds)}
            </div>
            <p className="text-[11px] text-slate-400">{formatSecondsToHMS(avgSessionSeconds)}</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Award className="w-4 h-4 text-purple-500" />
              <span>Tasca Principal</span>
            </div>
            <div className="text-sm font-bold text-purple-400 truncate" title={mostIntensiveTask?.nom || 'Cap'}>
              {mostIntensiveTask ? mostIntensiveTask.nom : 'Sense dades'}
            </div>
            <p className="text-[11px] text-slate-400">
              {mostIntensiveTask ? `${formatSecondsHuman(mostIntensiveTask.totalSec)} (${Math.round((mostIntensiveTask.totalSec / (grandTotalSeconds || 1)) * 100)}%)` : '-'}
            </p>
          </div>

        </div>

        {/* Distribució del Temps per Tasques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gràfic de barres percentuals */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border space-y-5 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-serif flex items-center gap-2 text-slate-200">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Desglossament de Temps per Tasca
              </h2>
              <span className="text-xs text-slate-400">{taskStats.length} tasques</span>
            </div>

            {taskStats.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No hi ha temps comptabilitzats encara.</p>
            ) : (
              <div className="space-y-4">
                {taskStats.map((t) => {
                  const percent = grandTotalSeconds > 0 ? ((t.totalSec / grandTotalSeconds) * 100) : 0;
                  return (
                    <div key={t.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 truncate pr-2" title={t.nom}>
                          {t.nom}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-amber-400">{formatSecondsToHMS(t.totalSec)}</span>
                          <span className="text-slate-400 text-[11px] w-12 text-right">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percent}%`, 
                            backgroundColor: t.color 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{t.sessionCount} {t.sessionCount === 1 ? 'sessió' : 'sessions'}</span>
                        <span>{formatSecondsHuman(t.totalSec)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gràfic d'evolució per dies */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h2 className="text-base font-bold font-serif flex items-center gap-2 text-slate-200">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Activitat per Dates
            </h2>

            {dateEntries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Sense sessions registrades.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {dateEntries.map(([dateStr, sec]) => (
                  <div key={dateStr} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{formatDateDMY(dateStr)}</span>
                      <span className="text-[10px] text-slate-400">{formatSecondsHuman(sec)}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {formatSecondsToHMS(sec)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
