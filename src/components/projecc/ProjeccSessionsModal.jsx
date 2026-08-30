import React, { useState } from 'react';
import { 
  X, Clock, Calendar, MessageSquare, Trash2, Edit3, Check, 
  Camera, Image as ImageIcon, Plus, Sparkles 
} from 'lucide-react';
import { formatSecondsToHMS, formatSecondsHuman, formatDateDMY } from '../../data/projeccInitialData';

export function ProjeccSessionsModal({ 
  task, 
  item, 
  isDark, 
  onClose, 
  onUpdateSessions,
  onStartNewSession 
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (!task || !item) return null;

  const sessions = Array.isArray(task.sessions) ? task.sessions : [];
  const totalSeconds = sessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);
  const isClosed = item.estat === 'tancat';

  const handleStartEdit = (session) => {
    setEditingSessionId(session.id);
    setEditNotes(session.notes || '');
  };

  const handleSaveEdit = (sessionId) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, notes: editNotes } : s);
    onUpdateSessions(task.id, updated);
    setEditingSessionId(null);
  };

  const handleDeleteSession = (sessionId) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    onUpdateSessions(task.id, updated);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Capçalera */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50/70 border-amber-200/60'
        }`}>
          <div className="space-y-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                item.tipus === 'projecte' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}
              </span>
              <span className="text-xs text-slate-400">
                {item.nomDefinitiu || item.nomProvisional || item.nom}
              </span>
            </div>
            <h3 className="text-lg font-bold font-serif leading-snug text-amber-500">
              {task.nom}
            </h3>
            {task.descripcio && (
              <p className="text-xs text-slate-400 line-clamp-2">{task.descripcio}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resum de Temps de la Tasca */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-400">Temps Total Acumulat:</span>
            <span className="font-mono text-base font-bold text-amber-400">
              {formatSecondsToHMS(totalSeconds)}
            </span>
            <span className="text-xs text-slate-400">({formatSecondsHuman(totalSeconds)})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {sessions.length} {sessions.length === 1 ? 'sessió realitzada' : 'sessions realitzades'}
            </span>
            {!isClosed && onStartNewSession && (
              <button
                onClick={() => {
                  onClose();
                  onStartNewSession(task);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Sessió
              </button>
            )}
          </div>
        </div>

        {/* Llistat de Sessions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">Encara no s'ha enregistrat cap sessió</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Inicia el cronòmetre per començar a comptar el temps de desenvolupament d'aquesta tasca.
              </p>
            </div>
          ) : (
            sessions.slice().reverse().map((session, index) => {
              const revIndex = sessions.length - index;
              const isEditing = editingSessionId === session.id;

              return (
                <div 
                  key={session.id || index}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isDark ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center">
                        #{revIndex}
                      </span>
                      <span className="text-xs font-semibold flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateDMY(session.data) || 'Data sense especificar'}
                      </span>
                      {session.horaInici && (
                        <span className="text-[11px] text-slate-400">
                          {session.horaInici} {session.horaFi ? `- ${session.horaFi}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {formatSecondsToHMS(session.duradaSegons)}
                      </span>

                      {!isClosed && (
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveEdit(session.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
                              title="Desar notes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(session)}
                              className="p-1 text-slate-400 hover:text-amber-400 rounded cursor-pointer"
                              title="Editar comentaris de la sessió"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {confirmDeleteId === session.id ? (
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              title="Confirmar eliminació"
                            >
                              Eliminar
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(session.id)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                              title="Eliminar sessió"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes / Memo de la sessió */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Anotacions, procediments, dificultats o mides emprades..."
                          rows={2}
                          className={`w-full p-2 text-xs rounded-lg border outline-none resize-y ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            Cancel·lar
                          </button>
                          <button
                            onClick={() => handleSaveEdit(session.id)}
                            className="px-2.5 py-1 text-[11px] rounded bg-amber-600 text-white font-bold cursor-pointer"
                          >
                            Desar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                        {session.notes || <span className="text-slate-400 not-italic">Sense comentaris registrats en aquesta sessió.</span>}
                      </p>
                    )}
                  </div>

                  {/* Imatges adjuntes a la sessió */}
                  {Array.isArray(session.fotos) && session.fotos.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1">
                      {session.fotos.map((foto, fIdx) => (
                        <div key={fIdx} className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-600 bg-slate-950">
                          <img 
                            src={typeof foto === 'string' ? foto : foto.url} 
                            alt={`Foto procés ${fIdx + 1}`} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(typeof foto === 'string' ? foto : foto.url, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Peu del Modal */}
        <div className={`p-4 border-t flex justify-end ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Tancar
          </button>
        </div>

      </div>
    </div>
  );
}
