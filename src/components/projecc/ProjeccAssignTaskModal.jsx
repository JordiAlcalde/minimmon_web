import React, { useState } from 'react';
import { 
  X, Plus, Play, Check, ListChecks, Sparkles, 
  Settings, FolderPlus, Package, ArrowRight 
} from 'lucide-react';
import { generateProjeccId } from '../../data/projeccInitialData';

export function ProjeccAssignTaskModal({ 
  isOpen, 
  onClose, 
  item, 
  isDark, 
  mestreTasques = [], 
  onAssignTask, 
  onStartTaskDirectly,
  onOpenMestreCatalog 
}) {
  const [selectedMestreId, setSelectedMestreId] = useState('');
  const [customNom, setCustomNom] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [activeTab, setActiveTab] = useState('cataleg'); // 'cataleg' | 'personalitzada'

  if (!isOpen || !item) return null;

  const currentTaskIds = new Set((item.tasques || []).map(t => t.nom.toLowerCase().trim()));

  // Filtrar tasques per tipus de projecte o producte
  const relevantMestre = mestreTasques.filter(t => t.tipus === item.tipus || !t.tipus);

  const handleSelectFromMestre = (mTask, startImmediately = false) => {
    // Comprovar si ja està afegida
    let existingTask = (item.tasques || []).find(t => t.nom.toLowerCase().trim() === mTask.nom.toLowerCase().trim());
    let taskToUse = existingTask;

    if (!taskToUse) {
      taskToUse = {
        id: generateProjeccId('task'),
        nom: mTask.nom,
        descripcio: mTask.descripcio || '',
        sessions: []
      };
      onAssignTask(taskToUse);
    }

    if (startImmediately) {
      onStartTaskDirectly(taskToUse);
    }
    onClose();
  };

  const handleCreateCustom = (startImmediately = false) => {
    if (!customNom.trim()) return;
    const newTask = {
      id: generateProjeccId('task'),
      nom: customNom.trim(),
      descripcio: customDesc.trim(),
      sessions: []
    };
    onAssignTask(newTask);
    if (startImmediately) {
      onStartTaskDirectly(newTask);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Capçalera */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50/70 border-amber-200/60'
        }`}>
          <div>
            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
              item.tipus === 'projecte' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {item.tipus === 'projecte' ? 'Projecte a Mida' : 'Producte de Catàleg'}
            </span>
            <h2 className="text-lg font-bold font-serif text-slate-100 mt-1">
              Triar Tasca de Treball
            </h2>
            <p className="text-xs text-slate-400">
              Selecciona una tasca del catàleg mestre o crea una tasca a mida per iniciar la feina.
            </p>
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

        {/* Pestanyes Selector */}
        <div className={`px-4 sm:px-5 py-2.5 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cataleg')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cataleg'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Catàleg Comú de Tasques ({relevantMestre.length})
            </button>

            <button
              onClick={() => setActiveTab('personalitzada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'personalitzada'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}
            >
              + Tasca a Mida
            </button>
          </div>

          {onOpenMestreCatalog && (
            <button
              onClick={() => {
                onClose();
                onOpenMestreCatalog();
              }}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Editar Catàleg Mestre
            </button>
          )}
        </div>

        {/* Cos de Selecció */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'cataleg' ? (
            <div className="space-y-2.5">
              {relevantMestre.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hi ha tasques al catàleg mestre per aquest tipus. Pots afegir-ne una a mida.
                </div>
              ) : (
                relevantMestre.map((mTask, idx) => {
                  const alreadyAssigned = currentTaskIds.has(mTask.nom.toLowerCase().trim());

                  return (
                    <div
                      key={mTask.id || idx}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/50' : 'bg-white border-slate-200 shadow-sm hover:border-amber-400'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 font-serif">
                            {mTask.nom}
                          </h4>
                          {alreadyAssigned && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                              Ja Assignada
                            </span>
                          )}
                        </div>
                        {mTask.descripcio && (
                          <p className="text-xs text-slate-400">{mTask.descripcio}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!alreadyAssigned && (
                          <button
                            onClick={() => handleSelectFromMestre(mTask, false)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                              isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Assignar
                          </button>
                        )}

                        <button
                          onClick={() => handleSelectFromMestre(mTask, true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{alreadyAssigned ? 'Reprendre' : 'Iniciar Ara'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Nom de la Nova Tasca a Mida:</label>
                <input
                  type="text"
                  value={customNom}
                  onChange={(e) => setCustomNom(e.target.value)}
                  placeholder="Ex: Prova de pintura especial / Mecanitzat suport..."
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Descripció o Detalls (Opcional):</label>
                <textarea
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Instruccions o passos concrets..."
                  rows={3}
                  className={`w-full p-2.5 rounded-xl border outline-none resize-y ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => handleCreateCustom(false)}
                  className={`px-3.5 py-2 rounded-xl font-semibold cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Només Afegir a la Llista
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateCustom(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Crear i Iniciar Ara</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
            Tancar
          </button>
        </div>

      </div>
    </div>
  );
}
