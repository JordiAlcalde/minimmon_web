import React, { useState } from 'react';
import { 
  X, Plus, Edit3, Trash2, Check, Sparkles, 
  Layers, FolderPlus, Package, ListChecks, ArrowRight 
} from 'lucide-react';
import { generateProjeccId } from '../../data/projeccInitialData';

export function ProjeccMestreTasquesModal({ 
  isOpen, 
  onClose, 
  isDark, 
  mestreTasques = [], 
  onSaveMestreTasques 
}) {
  const [filterType, setFilterType] = useState('tots'); // 'tots' | 'projecte' | 'producte'
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editNom, setEditNom] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTipus, setEditTipus] = useState('projecte');

  const [newNom, setNewNom] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTipus, setNewTipus] = useState('projecte');

  if (!isOpen) return null;

  const filteredTasks = mestreTasques.filter(t => {
    if (filterType === 'tots') return true;
    return t.tipus === filterType;
  });

  const handleStartEdit = (t) => {
    setEditingTaskId(t.id);
    setEditNom(t.nom || '');
    setEditDesc(t.descripcio || '');
    setEditTipus(t.tipus || 'projecte');
  };

  const handleSaveEdit = (taskId) => {
    if (!editNom.trim()) return;
    const updated = mestreTasques.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          nom: editNom.trim(),
          descripcio: editDesc.trim(),
          tipus: editTipus
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
      descripcio: newDesc.trim(),
      tipus: newTipus
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
                Catàleg Comú de Tasques de Taller
              </h2>
              <p className="text-xs text-slate-400">
                Llistat mestre de tasques reutilitzables en Projectes i Productes.
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

        {/* Filtres de pestanyes */}
        <div className={`px-4 sm:px-5 py-2.5 border-b flex items-center gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={() => setFilterType('tots')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'tots'
                ? 'bg-amber-600 text-white shadow-sm'
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Totes ({mestreTasques.length})
          </button>

          <button
            onClick={() => setFilterType('projecte')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'projecte'
                ? 'bg-amber-600 text-white shadow-sm'
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Projectes a Mida ({mestreTasques.filter(t => t.tipus === 'projecte').length})
          </button>

          <button
            onClick={() => setFilterType('producte')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'producte'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Productes de Catàleg ({mestreTasques.filter(t => t.tipus === 'producte').length})
          </button>
        </div>

        {/* Llistat de tasques mestres */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredTasks.map((t, idx) => {
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
                    <div className="flex items-center gap-2">
                      <select
                        value={editTipus}
                        onChange={(e) => setEditTipus(e.target.value)}
                        className={`p-1.5 rounded-lg border outline-none font-bold ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <option value="projecte">Projecte</option>
                        <option value="producte">Producte</option>
                      </select>
                      <input
                        type="text"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        placeholder="Nom de la tasca..."
                        className={`flex-1 p-1.5 rounded-lg border outline-none font-semibold ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
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
                        onClick={() => setEditingTaskId(null)}
                        className="px-2.5 py-1 rounded bg-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel·lar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(t.id)}
                        className="px-3 py-1 rounded bg-amber-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Desar Canvis
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                          t.tipus === 'projecte' 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {t.tipus === 'projecte' ? 'Projecte' : 'Producte'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 font-serif">
                          {t.nom}
                        </h4>
                      </div>
                      {t.descripcio && (
                        <p className="text-xs text-slate-400">{t.descripcio}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 rounded cursor-pointer"
                        title="Editar tasca mestre"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                        title="Eliminar tasca mestre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formulari per afegir nova tasca mestre */}
        <form onSubmit={handleAddNewTask} className={`p-4 border-t space-y-2.5 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-500" />
            Afegir Nova Tasca al Catàleg Mestre
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <select
                value={newTipus}
                onChange={(e) => setNewTipus(e.target.value)}
                className={`w-full p-2 rounded-xl border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="projecte">Per a Projectes a Mida</option>
                <option value="producte">Per a Productes de Catàleg</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <input
                type="text"
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                placeholder="Nom de la tasca (ex: Gravat Làser Detalls)..."
                className={`w-full p-2 rounded-xl border outline-none font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripció breu o instruccions de taller (opcional)..."
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
