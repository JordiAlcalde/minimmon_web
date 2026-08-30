import React, { useState } from 'react';
import { 
  ArrowLeft, Clock, Calendar, User, FileText, Lock, Unlock, 
  BarChart3, Printer, Edit, Play, Plus, Trash2, Eye, 
  Camera, Image as ImageIcon, CheckCircle, AlertTriangle, Layers,
  Database, Send, ChevronRight, Sparkles, Settings, ListChecks
} from 'lucide-react';
import { 
  formatSecondsToHMS, formatSecondsHuman, generateProjeccId, formatDateDMY 
} from '../../data/projeccInitialData';
import { ProjeccAssignTaskModal } from './ProjeccAssignTaskModal';

export function ProjeccDetail({ 
  item, 
  isDark, 
  onBack, 
  onEdit, 
  onStartTimer, 
  onViewSessions, 
  onViewAnalytics, 
  onViewReport, 
  onToggleLock,
  onUpdateTasks,
  onTransferToDb,
  mestreTasques = [],
  onOpenMestreCatalog
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  if (!item) return null;

  const tasks = Array.isArray(item.tasques) ? item.tasques : [];
  const isClosed = item.estat === 'tancat';

  // Càlcul del temps total acumulat de totes les tasques i sessions
  let grandTotalSeconds = 0;
  let totalSessions = 0;
  tasks.forEach(t => {
    const sList = Array.isArray(t.sessions) ? t.sessions : [];
    sList.forEach(s => {
      grandTotalSeconds += Number(s.duradaSegons) || 0;
      totalSessions += 1;
    });
  });

  // Assignar una tasca nova a aquest projecte
  const handleAssignTask = (newTask) => {
    const updated = [...tasks, newTask];
    onUpdateTasks(item.id, updated);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Vols eliminar aquesta tasca i totes les seves sessions registrades?")) {
      const updated = tasks.filter(t => t.id !== taskId);
      onUpdateTasks(item.id, updated);
    }
  };

  // Traspàs a BD oficial
  const handleTransfer = async () => {
    if (!item.nomDefinitiu && !item.nom) {
      alert("Cal assignar un Nom Definitiu abans de traspassar a la base de dades.");
      return;
    }
    if (window.confirm(`Vols traspassar aquest ${item.tipus === 'projecte' ? 'Projecte' : 'Producte'} a la Base de Dades oficial de Mínim Món?`)) {
      if (onTransferToDb) {
        await onTransferToDb(item);
        setTransferSuccess(true);
        setTimeout(() => setTransferSuccess(false), 4000);
      }
    }
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Barra de navegació superior */}
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
                {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isClosed ? 'Control Tancat' : 'En Curs'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 mt-1">
              {item.nomDefinitiu || item.nomProvisional || item.nom}
            </h1>
          </div>
        </div>

        {/* Botonera d'Accions Ràpides */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onViewAnalytics(item)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-blue-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-blue-600 shadow-sm'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gràfics</span>
          </button>

          <button
            onClick={() => onViewReport(item)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-amber-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-amber-700 shadow-sm'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Informe PDF</span>
          </button>

          <button
            onClick={() => onEdit(item)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
          >
            <Edit className="w-4 h-4" />
            <span>Editar</span>
          </button>

          {/* Botó Tancar / Reobrir Control */}
          <button
            onClick={() => onToggleLock(item.id, !isClosed)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              isClosed
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-red-600/90 hover:bg-red-600 text-white'
            }`}
          >
            {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isClosed ? 'Reobrir Control' : 'Tancar Control'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Banner de Temps Total Acumulat */}
        <section className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 border-amber-500/30 shadow-xl' 
            : 'bg-gradient-to-r from-amber-500/10 via-amber-100/40 to-white border-amber-300 shadow-md'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">
                ⏱️ Temps Total de Desenvolupament Acumulat
              </span>
              <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black text-amber-400 tracking-tight">
                {formatSecondsToHMS(grandTotalSeconds)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Equival a <strong>{formatSecondsHuman(grandTotalSeconds)}</strong> repartits en <strong>{totalSessions}</strong> sessions de feina.
              </p>
            </div>

            {/* Traspàs a BD oficial si és un nou propro */}
            {item.origen === 'nou' && !item.traspassat && (
              <div className="sm:text-right shrink-0">
                <button
                  onClick={handleTransfer}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  Traspassar a BD Oficial
                </button>
                <span className="text-[10px] text-slate-400 block mt-1">Crea fitxa a la col·lecció de {item.tipus === 'projecte' ? 'Projectes' : 'Productes'}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Traspassat correctament a la Base de Dades oficial!
              </div>
            )}
          </div>
        </section>

        {/* Dades Complementàries & Mostres del Client */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Targeta de dades */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Dades de la Gestió
            </h3>

            <div className="space-y-2 text-xs">
              {item.nomProvisional && item.nomDefinitiu && item.nomProvisional !== item.nomDefinitiu && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Nom Provisional:</span>
                  <span className="font-semibold text-slate-300">{item.nomProvisional}</span>
                </div>
              )}
              {item.nomClient && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Client:</span>
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {item.nomClient}
                  </span>
                </div>
              )}
              {item.dataInici && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Data d'Inici:</span>
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDateDMY(item.dataInici)}
                  </span>
                </div>
              )}
              {item.notes && (
                <div className="pt-1 border-t border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Notes & Instruccions:</span>
                  <p className="text-slate-300 italic text-[11px] mt-0.5">{item.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mostres del Client */}
          <div className={`md:col-span-2 p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                Fitxers / Imatges de mostra del Client ({Array.isArray(item.mostresClient) ? item.mostresClient.length : 0})
              </h3>
            </div>

            {Array.isArray(item.mostresClient) && item.mostresClient.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {item.mostresClient.map((m, idx) => (
                  <div key={m.id || idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img 
                      src={typeof m === 'string' ? m : m.url} 
                      alt="Mostra" 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(typeof m === 'string' ? m : m.url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No s'han adjuntat fitxers de mostra del client.
              </p>
            )}
          </div>

        </div>

        {/* Secció de Tasques (Conjunt de Tasques) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Tasques de Treball ({tasks.length})
              </h2>
              <p className="text-xs text-slate-400">
                Tria una tasca ja assignada o selecciona'n una de nova del catàleg comú per iniciar el cronòmetre.
              </p>
            </div>

            {!isClosed && (
              <div className="flex items-center gap-2 flex-wrap">
                {onOpenMestreCatalog && (
                  <button
                    onClick={onOpenMestreCatalog}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                    title="Editar el catàleg comú de tasques de taller"
                  >
                    <ListChecks className="w-3.5 h-3.5 text-amber-400" />
                    Catàleg Mestre
                  </button>
                )}

                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Triar / Assignar Tasca
                </button>
              </div>
            )}
          </div>

          {/* Llista de targetes de tasques */}
          {tasks.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center space-y-3 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <p className="text-xs text-slate-400">Encara no s'ha assignat cap tasca a aquest {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}.</p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Triar Tasca del Catàleg
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {tasks.map((task, tIdx) => {
                const sessions = Array.isArray(task.sessions) ? task.sessions : [];
                const taskSeconds = sessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);
                const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

                return (
                  <div 
                    key={task.id || tIdx}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center justify-center">
                            {tIdx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-100 font-serif">
                            {task.nom}
                          </h3>
                        </div>

                        <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shrink-0">
                          {formatSecondsToHMS(taskSeconds)}
                        </span>
                      </div>

                      {task.descripcio && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.descripcio}</p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>{sessions.length} {sessions.length === 1 ? 'sessió' : 'sessions'}</span>
                        {lastSession && (
                          <span>Última: {formatDateDMY(lastSession.data)}</span>
                        )}
                      </div>
                    </div>

                    {/* Botons d'acció de la tasca */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onViewSessions(task)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Sessions ({sessions.length})</span>
                        </button>

                        {!isClosed && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                            title="Eliminar tasca d'aquest projecte"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {!isClosed ? (
                        <button
                          onClick={() => onStartTimer(item, task)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{sessions.length === 0 ? 'Iniciar' : 'Reprendre'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tancat</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Modal per triar o assignar tasques del catàleg comú */}
      {showAssignModal && (
        <ProjeccAssignTaskModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          item={item}
          isDark={isDark}
          mestreTasques={mestreTasques}
          onAssignTask={handleAssignTask}
          onStartTaskDirectly={(assignedTask) => onStartTimer(item, assignedTask)}
          onOpenMestreCatalog={onOpenMestreCatalog}
        />
      )}

    </div>
  );
}
