import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Camera, Upload, Check, FolderPlus, 
  Package, Sparkles, Calendar, User, FileText, ListChecks 
} from 'lucide-react';
import { 
  DEFAULT_TASKS_PROJECTE, DEFAULT_TASKS_PRODUCTE, generateProjeccId,
  compressImageFile, formatDateDMY 
} from '../../data/projeccInitialData';

export function ProjeccFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isDark, 
  existingProjects = [], 
  existingProducts = [],
  initialData = null 
}) {
  const [tipus, setTipus] = useState('projecte'); // 'projecte' | 'producte'
  const [origen, setOrigen] = useState('nou'); // 'nou' | 'existent'
  const [selectedExistentId, setSelectedExistentId] = useState('');
  
  const [nomProvisional, setNomProvisional] = useState('');
  const [nomDefinitiu, setNomDefinitiu] = useState('');
  const [nomClient, setNomClient] = useState('');
  const [dataInici, setDataInici] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [mostresClient, setMostresClient] = useState([]);
  const [tasques, setTasques] = useState([]);
  const [novaTascaNom, setNovaTascaNom] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setTipus(initialData.tipus || 'projecte');
      setOrigen(initialData.origen || 'nou');
      setSelectedExistentId(initialData.existentId || '');
      setNomProvisional(initialData.nomProvisional || '');
      setNomDefinitiu(initialData.nomDefinitiu || initialData.nom || '');
      setNomClient(initialData.nomClient || '');
      setDataInici(initialData.dataInici || new Date().toISOString().split('T')[0]);
      setNotes(initialData.notes || '');
      setMostresClient(Array.isArray(initialData.mostresClient) ? initialData.mostresClient : []);
      setTasques(Array.isArray(initialData.tasques) ? initialData.tasques : []);
    } else {
      // Per defecte nou
      setTipus('projecte');
      setOrigen('nou');
      setSelectedExistentId('');
      setNomProvisional('');
      setNomDefinitiu('');
      setNomClient('');
      setDataInici(new Date().toISOString().split('T')[0]);
      setNotes('');
      setMostresClient([]);
      setTasques(DEFAULT_TASKS_PROJECTE.map(t => ({ ...t, sessions: [] })));
    }
  }, [initialData, isOpen]);

  // Canviar plantilles de tasques en canviar el tipus si és un nou registre
  const handleTipusChange = (newTipus) => {
    setTipus(newTipus);
    if (!initialData) {
      if (newTipus === 'projecte') {
        setTasques(DEFAULT_TASKS_PROJECTE.map(t => ({ ...t, sessions: [] })));
      } else {
        setTasques(DEFAULT_TASKS_PRODUCTE.map(t => ({ ...t, sessions: [] })));
      }
    }
  };

  // En triar un element existent de la BD
  const handleSelectExistent = (id) => {
    setSelectedExistentId(id);
    if (tipus === 'projecte') {
      const found = existingProjects.find(p => p.id === id);
      if (found) {
        setNomDefinitiu(found.title || found.titol || found.nom || '');
        setNomProvisional('');
        if (found.client) setNomClient(found.client);
      }
    } else {
      const found = existingProducts.find(p => p.id === id);
      if (found) {
        setNomDefinitiu(found.name || found.nom || '');
        setNomProvisional('');
      }
    }
  };

  // Gestió d'afegir i treure tasques a la llista
  const handleAddTasca = () => {
    if (!novaTascaNom.trim()) return;
    setTasques(prev => [
      ...prev,
      {
        id: generateProjeccId('task'),
        nom: novaTascaNom.trim(),
        descripcio: '',
        sessions: []
      }
    ]);
    setNovaTascaNom('');
  };

  const handleRemoveTasca = (taskId) => {
    setTasques(prev => prev.filter(t => t.id !== taskId));
  };

  // Càrrega d'imatges / mostres del client amb compressió
  const handleUploadMostres = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.65);
        if (compressedUrl) {
          setMostresClient(prev => [
            ...prev,
            {
              id: generateProjeccId('cli_img'),
              url: compressedUrl,
              nom: file.name
            }
          ]);
        }
      } catch (err) {
        console.warn("Error comprimint mostra:", err);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveMostra = (imgId) => {
    setMostresClient(prev => prev.filter(m => m.id !== imgId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalNom = nomDefinitiu.trim() || nomProvisional.trim();
    if (!finalNom) {
      alert("Cal indicar com a mínim un Nom Provisional o Nom Definitiu.");
      return;
    }

    const payload = {
      ...(initialData || {}),
      id: initialData?.id || generateProjeccId(tipus === 'projecte' ? 'proj' : 'prod'),
      tipus,
      origen,
      existentId: origen === 'existent' ? selectedExistentId : null,
      nomProvisional: nomProvisional.trim(),
      nomDefinitiu: nomDefinitiu.trim(),
      nom: finalNom,
      nomClient: nomClient.trim(),
      dataInici: dataInici || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      estat: initialData?.estat || 'en_curs',
      mostresClient,
      tasques,
      dataModificacio: new Date().toISOString()
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Capçalera */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50/70 border-amber-200/60'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              {tipus === 'projecte' ? <FolderPlus className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            </div>
            <h2 className="text-lg font-bold font-serif text-slate-100">
              {initialData ? 'Editar Control de Desenvolupament' : 'Nou Control de Desenvolupament'}
            </h2>
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

        {/* Formulari amb Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* 1. Selector de Tipus (Projecte o Producte) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Tipus de Gestió:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTipusChange('projecte')}
                className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  tipus === 'projecte'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                Projecte a Mida
              </button>

              <button
                type="button"
                onClick={() => handleTipusChange('producte')}
                className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  tipus === 'producte'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Package className="w-4 h-4" />
                Producte de Catàleg
              </button>
            </div>
          </div>

          {/* 2. Origen: Nou vs Existent a la BD */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Origen de la Dades:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrigen('nou')}
                className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  origen === 'nou'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Nou (Crear des de zero)
              </button>

              <button
                type="button"
                onClick={() => setOrigen('existent')}
                className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  origen === 'existent'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Existent a la Base de Dades
              </button>
            </div>
          </div>

          {/* Si és existent, desplegable per triar de la BD */}
          {origen === 'existent' && (
            <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-1.5">
              <label className="font-bold text-amber-400 block">
                Triar {tipus === 'projecte' ? 'Projecte' : 'Producte'} de la BD:
              </label>
              <select
                value={selectedExistentId}
                onChange={(e) => handleSelectExistent(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="">-- Selecciona de la llista --</option>
                {tipus === 'projecte' ? (
                  existingProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.titol || p.nom} {p.client ? `(${p.client})` : ''}
                    </option>
                  ))
                ) : (
                  existingProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.nom}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* 3. Noms (Provisional i Definitiu) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Nom Provisional:</label>
              <input
                type="text"
                value={nomProvisional}
                onChange={(e) => setNomProvisional(e.target.value)}
                placeholder="Ex: Prototip Caixa Llums v1..."
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 block">Útil mentre està en fase d'estudi</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Nom Definitiu:</label>
              <input
                type="text"
                value={nomDefinitiu}
                onChange={(e) => setNomDefinitiu(e.target.value)}
                placeholder="Ex: Diorama Casa Pairal..."
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 block">Nom que constarà a la BD oficial</span>
            </div>
          </div>

          {/* 4. Client i Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                Nom del Client:
              </label>
              <input
                type="text"
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                placeholder="Nom del client o particular..."
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Data d'Inici:
              </label>
              <input
                type="date"
                value={dataInici}
                onChange={(e) => setDataInici(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          {/* 5. Notes Generals */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Notes i Objectius Generals:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalls de la comanda, materials clau, requisits del client, etc."
              rows={2}
              className={`w-full p-2.5 rounded-xl border outline-none resize-y ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>

          {/* 6. Fitxers i Imatges de Mostra del Client */}
          <div className="space-y-2 p-3.5 rounded-xl border bg-slate-950/30 border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                Fitxers / Imatges de mostra del Client ({mostresClient.length}):
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-semibold cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                Afegir Mostres
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleUploadMostres} 
              />
            </div>

            {mostresClient.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                {mostresClient.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                    <img src={img.url} alt="Mostra" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMostra(img.id)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Pots pujar fotos de referència, plànols, croquis o mostres que hagi facilitat el client.
              </p>
            )}
          </div>

          {/* 7. Conjunt de Tasques Personalitzables */}
          <div className="space-y-2.5 p-3.5 rounded-xl border bg-slate-950/30 border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-amber-500" />
                Conjunt de Tasques ({tasques.length}):
              </label>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {tasques.map((t, idx) => (
                <div key={t.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-medium text-slate-200 truncate pr-2">{t.nom}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTasca(t.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded cursor-pointer shrink-0"
                    title="Eliminar tasca de la llista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Afegir nova tasca personalitzada */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={novaTascaNom}
                onChange={(e) => setNovaTascaNom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTasca(); } }}
                placeholder="Afegir tasca a mida..."
                className={`flex-1 p-2 rounded-lg border outline-none text-xs ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={handleAddTasca}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Afegir
              </button>
            </div>
          </div>

          {/* Botons de Formulari */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-semibold cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              Cancel·lar
            </button>
            
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {initialData ? 'Desar Canvis' : 'Crear Control'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
