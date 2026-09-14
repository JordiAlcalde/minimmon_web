import React, { useState } from 'react';
import { 
  X, Plus, Edit3, Trash2, Check, Sparkles, 
  Search, ListChecks, ArrowRight 
} from 'lucide-react';
import { generateProjeccId } from '../../data/projeccInitialData';

export function ProjeccMestreTasquesModal({ 
  isOpen, 
  onClose, 
  isDark, 
  mestreTasques = [], 
  onSaveMestreTasques 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editNom, setEditNom] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [newNom, setNewNom] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const filteredTasks = mestreTasques.filter(t => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (t.nom || '').toLowerCase().includes(q) || (t.descripcio || '').toLowerCase().includes(q);
  });

  const handleStartEdit = (t) => {
    setEditingTaskId(t.id);
    setEditNom(t.nom || '');
    setEditDesc(t.descripcio || '');
  };

  const handleSaveEdit = (taskId) => {
    if (!editNom.trim()) return;
    const updated = mestreTasques.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          nom: editNom.trim(),
          descripcio: editDesc.trim()
        };
      }
      return t;
    });
    onSaveMestreTasques(updated);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Vols eliminar aquesta tasca del Catàleg Mestre de taller?")) {
      const updated = mestreTasques.filter(t => t.id !== taskId);
      onSaveMestreTasques(updated);
    }
  };

  const handleAddNewTask = (e) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    const newTask = {
      id: generateProjeccId('mtask'),
      nom: newNom.trim(),
      descripcio: newDesc.trim()
    };
    onSaveMestreTasques([...mestreTasques, newTask]);
    setNewNom('');
    setNewDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Capçalera */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50/70 border-amber-200/60'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-100">
                Catàleg de Tasques de Taller
              </h2>
              <p className="text-xs text-slate-400">
                Llistat unificat de tasques reutilitzables per a qualsevol feina ({mestreTasques.length} tasques disponibles).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cerca ràpida */}
        <div className={`px-4 sm:px-5 py-2.5 border-b flex items-center gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cercar tasca al catàleg..."
              className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 cursor-pointer"
            >
              Netejar
            </button>
          )}
        </div>

        {/* Llistat de tasques mestres */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {searchTerm ? 'Cap tasca coincideix amb la cerca.' : 'El catàleg de tasques està buit. Afegeix-ne una a continuació.'}
            </div>
          ) : (
            filteredTasks.map((t, idx) => {
              const isEditing = editingTaskId === t.id;

              return (
                <div 
                  key={t.id || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2 text-xs">
                      <input
                        type="text"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        placeholder="Nom de la tasca..."
                        className={`w-full p-2 rounded-lg border outline-none font-semibold ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripció o indicacions de la tasca..."
                        rows={2}
                        className={`w-full p-2 rounded-lg border outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-2.5 py-1 rounded bg-slate-700 text-slate-300 text-xs cursor-pointer"
                        >
                          Cancel·lar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(t.id)}
                          className="px-3 py-1 rounded bg-amber-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Desar Canvis
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-bold text-slate-200 font-serif">
                          {t.nom}
                        </h4>
                        {t.descripcio && (
                          <p className="text-xs text-slate-400 leading-relaxed">{t.descripcio}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded cursor-pointer"
                          title="Editar tasca"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                          title="Eliminar tasca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Formulari per afegir nova tasca mestre */}
        <form onSubmit={handleAddNewTask} className={`p-4 border-t space-y-2.5 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-500" />
            Afegir Nova Tasca al Catàleg
          </div>

          <div className="space-y-2 text-xs">
            <input
              type="text"
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              placeholder="Nom de la tasca (ex: Gravat Làser Detalls)..."
              className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripció breu o indicacions de taller (opcional)..."
                className={`flex-1 p-2 rounded-xl border outline-none text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Afegir
              </button>
            </div>
          </div>
        </form>

        {/* Peu */}
        <div className={`p-4 border-t flex justify-end ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Fet / Tancar
          </button>
        </div>

      </div>
    </div>
  );
}
