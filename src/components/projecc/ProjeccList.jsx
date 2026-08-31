import React, { useState } from 'react';
import { 
  FolderPlus, Package, Search, Clock, Calendar, User, 
  ChevronRight, Lock, Unlock, Play, Plus, BarChart3, 
  Layers, CheckCircle, Sparkles, Filter, ListChecks, Settings 
} from 'lucide-react';
import { formatSecondsToHMS, formatSecondsHuman, formatDateDMY } from '../../data/projeccInitialData';

export function ProjeccList({ 
  items, 
  isDark, 
  onSelectItem, 
  onNewItem, 
  onStartTimerQuick,
  onOpenMestreCatalog 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tots'); // 'tots' | 'projecte' | 'producte'
  const [statusFilter, setStatusFilter] = useState('tots'); // 'tots' | 'en_curs' | 'tancat'

  // Filtrar llista
  const filteredItems = items.filter(item => {
    // Filtre de tipus
    if (typeFilter !== 'tots' && item.tipus !== typeFilter) return false;
    
    // Filtre d'estat
    if (statusFilter === 'en_curs' && item.estat === 'tancat') return false;
    if (statusFilter === 'tancat' && item.estat !== 'tancat') return false;

    // Cerca de text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNom = (item.nomDefinitiu || item.nomProvisional || item.nom || '').toLowerCase().includes(q);
      const matchClient = (item.nomClient || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchTasks = (item.tasques || []).some(t => (t.nom || '').toLowerCase().includes(q));
      if (!matchNom && !matchClient && !matchNotes && !matchTasks) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Botonera de Creació Ràpida (Projecte o Producte) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNewItem('projecte')}
          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold transition-all shadow-lg shadow-amber-600/20 cursor-pointer group"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm">Nou Projecte a Mida</div>
              <div className="text-[11px] font-normal text-amber-100/80">Comandes a mida i maquetes</div>
            </div>
          </div>
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => onNewItem('producte')}
          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-700/20 cursor-pointer group"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm">Nou Producte de Catàleg</div>
              <div className="text-[11px] font-normal text-emerald-100/80">Desenvolupament per a sèrie</div>
            </div>
          </div>
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {onOpenMestreCatalog && (
          <button
            onClick={onOpenMestreCatalog}
            className={`flex items-center justify-between p-4 rounded-2xl border font-bold transition-all cursor-pointer group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-200' : 'bg-white border-slate-200 shadow-sm hover:border-amber-400 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm">Mestre de Tasques</div>
                <div className="text-[11px] font-normal text-slate-400">Editar tasques comunes</div>
              </div>
            </div>
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-amber-400 group-hover:rotate-45 transition-all" />
          </button>
        )}
      </div>

      {/* Cerca i Filtres */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Camp de Cerca */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cercar per nom, client, notes o tasques..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Filtres de Tipus */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <button
              onClick={() => setTypeFilter('tots')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'tots'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Tots ({items.length})
            </button>

            <button
              onClick={() => setTypeFilter('projecte')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'projecte'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Projectes
            </button>

            <button
              onClick={() => setTypeFilter('producte')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'producte'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Productes
            </button>
          </div>

          {/* Filtres d'Estat */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <button
              onClick={() => setStatusFilter(statusFilter === 'en_curs' ? 'tots' : 'en_curs')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'en_curs'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'
              }`}
            >
              Només En Curs
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'tancat' ? 'tots' : 'tancat')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'tancat'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'
              }`}
            >
              Tancats
            </button>
          </div>

        </div>
      </div>

      {/* Llistat de Targetes de Projectes / Productes */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className={`p-10 rounded-2xl border text-center space-y-3 ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold font-serif text-slate-300">No s'ha trobat cap registre</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Crea un nou Projecte a Mida o Producte de Catàleg per començar a cronometrar les tasques.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isClosed = item.estat === 'tancat';
            let itemTotalSeconds = 0;
            let itemSessionsCount = 0;
            (item.tasques || []).forEach(t => {
              (t.sessions || []).forEach(s => {
                itemTotalSeconds += Number(s.duradaSegons) || 0;
                itemSessionsCount += 1;
              });
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isDark 
                    ? 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900' 
                    : 'bg-white border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.tipus === 'projecte' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      isClosed
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {isClosed ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      {isClosed ? 'Tancat' : 'En Curs'}
                    </span>

                    {item.dataInici && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Inici: {formatDateDMY(item.dataInici)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-serif text-slate-100 group-hover:text-amber-400 transition-colors">
                      {item.nomDefinitiu || item.nomProvisional || item.nom}
                    </h3>
                    {item.nomProvisional && item.nomDefinitiu && item.nomProvisional !== item.nomDefinitiu && (
                      <span className="text-[11px] text-slate-400 italic block">
                        (Nom provisional: {item.nomProvisional})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    {item.nomClient && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Client: <strong className="text-slate-300">{item.nomClient}</strong>
                      </span>
                    )}
                    <span>
                      {(item.tasques || []).length} tasques · {itemSessionsCount} sessions
                    </span>
                  </div>
                </div>

                {/* Temps Acumulat i Acció */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Temps Acumulat</span>
                    <span className="font-mono text-lg sm:text-xl font-bold text-amber-400">
                      {formatSecondsToHMS(itemTotalSeconds)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{formatSecondsHuman(itemTotalSeconds)}</span>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-amber-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
