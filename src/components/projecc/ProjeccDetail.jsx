import React, { useState } from 'react';
import { 
  ArrowLeft, Clock, Calendar, User, FileText, Lock, Unlock, 
  BarChart3, Printer, Edit, Play, Plus, Trash2, Eye, 
  Camera, Image as ImageIcon, CheckCircle, AlertTriangle, Layers,
  Database, Send, ChevronRight, Sparkles, Settings, ListChecks,
  X, Download, ExternalLink, ZoomIn
} from 'lucide-react';
import { 
  formatSecondsToHMS, formatSecondsHuman, generateProjeccId, formatDateDMY 
} from '../../data/projeccInitialData';
import { ProjeccAssignTaskModal } from './ProjeccAssignTaskModal';

// Obre imatges de forma segura evitant bloquejos per data: URIs a Chromium/Edge
function openImageSafely(imgUrl) {
  if (!imgUrl) return;
  if (imgUrl.startsWith('data:')) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mostra del Client - Projecc</title>
            <style>
              body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; }
            </style>
          </head>
          <body>
            <img src="${imgUrl}" alt="Mostra" />
          </body>
        </html>
      `);
      win.document.close();
      return;
    }
  }
  window.open(imgUrl, '_blank');
}

export function ProjeccDetail({ 
  item, 
  isDark, 
  onBack, 
  onEdit, 
  onStartTimer, 
  onViewSessions, 
  onAddManualTime,
  onViewAnalytics, 
  onViewReport, 
  onToggleLock,
  onUpdateTasks,
  onTransferToDb,
  mestreTasques = [],
  onOpenMestreCatalog,
  onDeleteItem,
  activeTimers = []
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
            title="Tornar a la llista de projectes i productes"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tornar al llistat</span>
          </button>
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
                : 'bg-amber-700/80 hover:bg-amber-700 text-white'
            }`}
          >
            {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isClosed ? 'Reobrir Control' : 'Tancar Control'}</span>
          </button>

          {/* Botó Eliminar Projecte */}
          {onDeleteItem && (
            <button
              onClick={() => onDeleteItem(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 hover:border-red-500/30' 
                  : 'bg-white border-slate-300 hover:bg-red-50 text-slate-500 hover:text-red-600 shadow-sm'
              }`}
              title="Eliminar aquest projecte i totes les seves tasques de forma permanent"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Banner Hero: Títol del Projecte (Esquerra) + Temps Acumulat (Dreta) */}
        <section className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/30 border-amber-500/30 shadow-xl' 
            : 'bg-gradient-to-r from-white via-amber-50/50 to-amber-100/40 border-amber-300 shadow-md'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* 1. TÍTOL DEL PROJECTE (PRIMER LLOC, ESQUERRA, BEN VISIBLE) */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  item.tipus === 'projecte' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}
                </span>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  isClosed
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {isClosed ? 'Control Tancat' : 'En Curs'}
                </span>

                {item.nomProvisional && item.nomDefinitiu && item.nomProvisional !== item.nomDefinitiu && (
                  <span className="text-xs text-slate-400 italic">
                    (Provisional: {item.nomProvisional})
                  </span>
                )}
              </div>

              {/* Nom ben visible */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-slate-100 tracking-tight leading-tight">
                {item.nomDefinitiu || item.nomProvisional || item.nom}
              </h1>

              {/* Dades ràpides: Client i Data d'inici */}
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-0.5">
                {item.nomClient && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Client: <strong className="text-white">{item.nomClient}</strong></span>
                  </span>
                )}
                {item.dataInici && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inici: <strong className="text-white">{formatDateDMY(item.dataInici)}</strong></span>
                  </span>
                )}
              </div>
            </div>

            {/* 2. TEMPS ACUMULAT (A LA SEVA DRETA, AMB NÚMEROS MÉS PETITS) */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap lg:flex-nowrap shrink-0">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-inner">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                  ⏱️ Temps Total Acumulat
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  {formatSecondsToHMS(grandTotalSeconds)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Equival a <strong className="text-slate-300">{formatSecondsHuman(grandTotalSeconds)}</strong> ({totalSessions} {totalSessions === 1 ? 'sessió' : 'sessions'})
                </p>
              </div>

              {/* Botó Traspàs a BD oficial */}
              {item.origen === 'nou' && !item.traspassat && (
                <div className="shrink-0">
                  <button
                    onClick={handleTransfer}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>Traspassar a BD Oficial</span>
                  </button>
                  <span className="text-[10px] text-slate-400 block mt-1 text-center sm:text-left">
                    Crea fitxa a col·lecció
                  </span>
                </div>
              )}
            </div>

          </div>

          {transferSuccess && (
            <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Traspassat correctament a la Base de Dades oficial!
            </div>
          )}
        </section>

        {/* Notes Descriptives & Imatges de Mostra */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Targeta Esquerra: Notes Descriptives del Projecte (Scroll Vertical) */}
          <div className={`p-4 rounded-2xl border flex flex-col h-52 transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-2 shrink-0">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Notes Descriptives del Projecte
              </h3>
              {item.notes && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Desplaçament vertical ↕
                </span>
              )}
            </div>

            {/* Contingut amb barra de desplaçament vertical */}
            <div className="flex-1 overflow-y-auto pr-2 text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
              {item.notes ? (
                <p className="italic">{item.notes}</p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-3">
                  <FileText className="w-6 h-6 stroke-[1.5] text-slate-600 mb-1" />
                  <p className="italic text-[11px]">Sense notes descriptives registrades.</p>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="mt-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    + Afegir notes editant la fitxa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Targeta Dreta: Imatges / Mostres del Client (Scroll Horitzontal) */}
          <div className={`p-4 rounded-2xl border flex flex-col h-52 transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-2 shrink-0">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                Fitxers / Imatges de Mostra ({Array.isArray(item.mostresClient) ? item.mostresClient.length : 0})
              </h3>
              {Array.isArray(item.mostresClient) && item.mostresClient.length > 0 && (
                <span className="text-[10px] text-slate-500">
                  Desplaçament horitzontal ↔
                </span>
              )}
            </div>

            {/* Contingut amb desplaçament horitzontal */}
            <div className="flex-1 flex items-center overflow-x-auto gap-3 py-1">
              {Array.isArray(item.mostresClient) && item.mostresClient.length > 0 ? (
                item.mostresClient.map((m, idx) => (
                  <div 
                    key={m.id || idx} 
                    className="relative group shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer shadow-sm hover:border-amber-400 transition-colors"
                    onClick={() => setPreviewImageUrl(typeof m === 'string' ? m : m.url)}
                    title="Clica per veure la mostra ampliada"
                  >
                    <img 
                      src={typeof m === 'string' ? m : m.url} 
                      alt="Mostra" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                      <ZoomIn className="w-5 h-5 text-amber-300" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-500 py-3">
                  <Camera className="w-6 h-6 stroke-[1.5] text-slate-600 mb-1" />
                  <p className="italic text-[11px]">No s'han adjuntat fitxers de mostra del client.</p>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="mt-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    + Adjuntar mostres editant la fitxa
                  </button>
                </div>
              )}
            </div>
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

                const runningTimer = activeTimers.find(t => t.itemId === item.id && t.taskId === task.id);

                return (
                  <div 
                    key={task.id || tIdx}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      runningTimer
                        ? isDark 
                          ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                          : 'bg-emerald-50/50 border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                        : isDark 
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
                          : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'
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
                          {runningTimer && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {runningTimer.isRunning ? 'En marxa ara' : 'En pausa'}
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shrink-0">
                          {formatSecondsToHMS(taskSeconds)}
                        </span>
                      </div>

                      {task.descripcio && (
                        <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{task.descripcio}</p>
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

                        {!isClosed && onAddManualTime && (
                          <button
                            onClick={() => onAddManualTime(task)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                              isDark 
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                            title="Afegir temps manualment per a una acció no cronometrada en directe"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">+ Temps manual</span>
                          </button>
                        )}

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
                          className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 ${
                            runningTimer
                              ? runningTimer.isRunning
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                          }`}
                        >
                          {runningTimer ? (
                            runningTimer.isRunning ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span>Veure Cronòmetre</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Reprendre (Pausa)</span>
                              </>
                            )
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{sessions.length === 0 ? 'Iniciar' : 'Reprendre'}</span>
                            </>
                          )}
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

      {/* Lightbox / Visor d'Imatges Ampliades */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 animate-fadeIn"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center" 
            onClick={e => e.stopPropagation()}
          >
            {/* Botó tancar superior */}
            <div className="w-full flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1.5 px-3 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700 shadow-lg"
              >
                <X className="w-4 h-4" />
                <span className="font-semibold">Tancar</span>
              </button>
            </div>

            {/* Contenidor de la imatge gran */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl max-h-[75vh] flex items-center justify-center p-1">
              <img 
                src={previewImageUrl} 
                alt="Mostra ampliada del client" 
                className="max-w-full max-h-[72vh] object-contain rounded-xl"
              />
            </div>

            {/* Botons d'accions */}
            <div className="mt-3 flex items-center gap-2.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewImageUrl;
                  link.download = `projecc_mostra_${Date.now()}.jpg`;
                  link.click();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Descarregar imatge</span>
              </button>

              <button
                type="button"
                onClick={() => openImageSafely(previewImageUrl)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Obrir en pestanya nova</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
