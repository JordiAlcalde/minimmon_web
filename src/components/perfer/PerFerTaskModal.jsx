import React, { useState, useEffect } from 'react';
import { 
  X, Save, Trash2, Calendar, Clock, AlertTriangle, Coffee, 
  Palette, Hammer, Share2, Globe, ShoppingBag, Sparkles, Tag, 
  Plus, CheckSquare, Square, Camera, Image as ImageIcon, Eye,
  Link2, Check, ArrowRight, Lightbulb, ListTodo, Hourglass, CheckCircle2,
  Edit2
} from 'lucide-react';
import { PER_FER_COLUMNS, PER_FER_AMBITS, PER_FER_PRIORITATS } from '../../data/perFerInitialData';
import { compressImageFile } from '../../data/projeccInitialData';
import { getPlanificacioLabel, getEffectivePlanningDate } from '../../utils/perFerPlanificacioUtils';

export default function PerFerTaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  dbProductes = [],
  dbProjects = [],
  dbMaquinaria = [],
  dbEsdeveniments = [],
  isDark = true
}) {
  const [formData, setFormData] = useState({
    titol: '',
    estat: 'per_fer',
    ambit: 'taller',
    prioritat: 'normal',
    descripcio: '',
    dataLimit: '',
    planificacio: null,
    planificacioDataUltimCanvi: null,
    subtasques: [],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' }
  });

  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  useEffect(() => {
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
    if (task) {
      setFormData({
        id: task.id,
        titol: task.titol || '',
        estat: task.estat || 'per_fer',
        ambit: task.ambit || 'taller',
        prioritat: task.prioritat || 'normal',
        descripcio: task.descripcio || '',
        dataLimit: task.dataLimit || '',
        planificacio: task.planificacio || null,
        planificacioDataUltimCanvi: task.planificacioDataUltimCanvi || null,
        subtasques: Array.isArray(task.subtasques) ? [...task.subtasques] : [],
        imatges: Array.isArray(task.imatges) ? [...task.imatges] : [],
        vinculacio: task.vinculacio || { tipus: 'cap', id: '', nom: '' },
        ordre: task.ordre ?? Date.now(),
        dataCreacio: task.dataCreacio || new Date().toISOString(),
        dataCompletat: task.dataCompletat || null
      });
    } else {
      setFormData({
        titol: '',
        estat: 'per_fer',
        ambit: 'taller',
        prioritat: 'normal',
        descripcio: '',
        dataLimit: '',
        planificacio: null,
        planificacioDataUltimCanvi: null,
        subtasques: [],
        imatges: [],
        vinculacio: { tipus: 'cap', id: '', nom: '' },
        ordre: Date.now(),
        dataCreacio: new Date().toISOString(),
        dataCompletat: null
      });
    }
    setNewSubtaskText('');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    if (!newSubtaskText.trim()) return;

    const newSubtask = {
      id: 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      text: newSubtaskText.trim(),
      completada: false
    };

    setFormData(prev => ({
      ...prev,
      subtasques: [...prev.subtasques, newSubtask]
    }));
    setNewSubtaskText('');
  };

  const handleStartEditSubtask = (st) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskText(st.text || '');
  };

  const handleSaveSubtaskEdit = (subtaskId) => {
    if (!editingSubtaskText.trim()) return;
    setFormData(prev => ({
      ...prev,
      subtasques: prev.subtasques.map(st => 
        st.id === subtaskId ? { ...st, text: editingSubtaskText.trim() } : st
      )
    }));
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const handleCancelSubtaskEdit = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const handleToggleSubtask = (subtaskId) => {
    setFormData(prev => ({
      ...prev,
      subtasques: prev.subtasques.map(st => 
        st.id === subtaskId ? { ...st, completada: !st.completada } : st
      )
    }));
  };

  const handleDeleteSubtask = (subtaskId) => {
    if (editingSubtaskId === subtaskId) {
      setEditingSubtaskId(null);
      setEditingSubtaskText('');
    }
    setFormData(prev => ({
      ...prev,
      subtasques: prev.subtasques.filter(st => st.id !== subtaskId)
    }));
  };

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploadingPhoto(true);
    try {
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 900, 900, 0.7);
        if (compressedBase64) {
          newImages.push({
            id: 'img-' + Date.now().toString(36) + '-' + i,
            url: compressedBase64,
            nom: file.name || `Foto ${formData.imatges.length + i + 1}`
          });
        }
      }
      setFormData(prev => ({
        ...prev,
        imatges: [...prev.imatges, ...newImages]
      }));
    } catch (err) {
      console.error("Error processant fotos:", err);
      alert("No s'han pogut processar algunes fotos.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = (imgId) => {
    setFormData(prev => ({
      ...prev,
      imatges: prev.imatges.filter(img => img.id !== imgId)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titol.trim()) {
      alert("Si us plau, indica un títol per a la tasca o idea.");
      return;
    }

    const isDone = formData.estat === 'enllestit';
    const planificacioChanged = formData.planificacio !== (task?.planificacio || null);
    const finalPlanificacio = (isDone && formData.planificacio) ? 'avui' : (formData.planificacio || null);
    const planificacioDataUltimCanvi = planificacioChanged || (isDone && formData.planificacio)
      ? (finalPlanificacio ? getEffectivePlanningDate() : null)
      : (task?.planificacioDataUltimCanvi || (finalPlanificacio ? getEffectivePlanningDate() : null));

    const updatedData = {
      ...formData,
      titol: formData.titol.trim(),
      planificacio: finalPlanificacio,
      planificacioDataUltimCanvi,
      dataCompletat: isDone ? (formData.dataCompletat || new Date().toISOString()) : null
    };

    onSave(updatedData);
  };

  // Helper per renderitzar icona de columna
  const renderColumnIcon = (iconName) => {
    switch (iconName) {
      case 'Lightbulb': return <Lightbulb className="w-3.5 h-3.5" />;
      case 'ListTodo': return <ListTodo className="w-3.5 h-3.5" />;
      case 'Hammer': return <Hammer className="w-3.5 h-3.5" />;
      case 'Hourglass': return <Hourglass className="w-3.5 h-3.5" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const completedSubtasksCount = formData.subtasques.filter(st => st.completada).length;
  const totalSubtasksCount = formData.subtasques.length;
  const progressPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-surface-container-lowest text-on-surface rounded-2xl border border-outline/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
              {formData.estat === 'idees' ? <Lightbulb className="w-5 h-5" /> : <ListTodo className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-primary">
                {task ? 'Editar Tasca / Idea' : 'Nova Tasca o Idea'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {task ? 'Modifica els detalls, subtasques o canvia d\'estat' : 'Afegeix una tasca pendent o anota una nova idea per al taller'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Títol */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Títol de la tasca / idea *
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="Ex: Proves làser fusta olivera, Comprar cola Titebond, Disseny nou clauer..."
              value={formData.titol}
              onChange={e => setFormData({ ...formData, titol: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-outline/20 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-medium outline-none transition-all"
            />
          </div>

          {/* Columna / Estat & Àmbit & Prioritat (3 columnes) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Estat / Columna */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Columna / Estat
              </label>
              <select
                value={formData.estat}
                onChange={e => setFormData({ ...formData, estat: e.target.value })}
                className="w-full px-3 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs font-medium outline-none focus:border-primary transition-all cursor-pointer"
              >
                {PER_FER_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.titol}
                  </option>
                ))}
              </select>
            </div>

            {/* Àmbit */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Àmbit / Categoria
              </label>
              <select
                value={formData.ambit}
                onChange={e => setFormData({ ...formData, ambit: e.target.value })}
                className="w-full px-3 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs font-medium outline-none focus:border-primary transition-all cursor-pointer"
              >
                {PER_FER_AMBITS.map(amb => (
                  <option key={amb.id} value={amb.id}>
                    {amb.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Prioritat */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Prioritat
              </label>
              <select
                value={formData.prioritat}
                onChange={e => setFormData({ ...formData, prioritat: e.target.value })}
                className="w-full px-3 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs font-medium outline-none focus:border-primary transition-all cursor-pointer"
              >
                {PER_FER_PRIORITATS.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data límit & Vinculació */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3.5">
            {/* Data límit (opcional) - amplada continguda */}
            <div className="w-full sm:w-44 shrink-0">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Data límit / Objectiu
              </label>
              <input
                type="date"
                value={formData.dataLimit}
                onChange={e => setFormData({ ...formData, dataLimit: e.target.value })}
                className="w-full px-3 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            {/* Vinculació opcional amb Producte / Projecte / Màquina / Esdeveniment - ampliat */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                Vincular amb... (opcional)
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.vinculacio?.tipus || 'cap'}
                  onChange={e => {
                    const tipus = e.target.value;
                    setFormData({
                      ...formData,
                      vinculacio: { tipus, id: '', nom: '' }
                    });
                  }}
                  className="w-32 sm:w-36 shrink-0 px-2.5 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs font-medium outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="cap">Cap</option>
                  <option value="producte">Producte</option>
                  <option value="projecte">Projecte</option>
                  <option value="maquina">Màquina</option>
                  <option value="esdeveniment">Esdeveniment</option>
                </select>

                {formData.vinculacio?.tipus === 'producte' && (
                  <select
                    value={formData.vinculacio?.id || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const found = dbProductes.find(p => p.id === id);
                      setFormData({
                        ...formData,
                        vinculacio: { tipus: 'producte', id, nom: found?.nom || id }
                      });
                    }}
                    className="flex-1 min-w-0 px-2.5 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs outline-none focus:border-primary transition-all truncate"
                  >
                    <option value="">Selecciona producte...</option>
                    {dbProductes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nom} {p.codi ? `(${p.codi})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {formData.vinculacio?.tipus === 'projecte' && (
                  <select
                    value={formData.vinculacio?.id || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const found = dbProjects.find(p => p.id === id);
                      setFormData({
                        ...formData,
                        vinculacio: { tipus: 'projecte', id, nom: found?.titol || found?.nom || id }
                      });
                    }}
                    className="flex-1 min-w-0 px-2.5 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs outline-none focus:border-primary transition-all truncate"
                  >
                    <option value="">Selecciona projecte...</option>
                    {dbProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titol || p.nom}
                      </option>
                    ))}
                  </select>
                )}

                {formData.vinculacio?.tipus === 'maquina' && (
                  <select
                    value={formData.vinculacio?.id || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const found = dbMaquinaria.find(m => m.id === id);
                      setFormData({
                        ...formData,
                        vinculacio: { tipus: 'maquina', id, nom: found?.nom || id }
                      });
                    }}
                    className="flex-1 min-w-0 px-2.5 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs outline-none focus:border-primary transition-all truncate"
                  >
                    <option value="">Selecciona màquina...</option>
                    {dbMaquinaria.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nom} {m.model ? `(${m.model})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {formData.vinculacio?.tipus === 'esdeveniment' && (
                  <select
                    value={formData.vinculacio?.id || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const found = dbEsdeveniments.find(ev => ev.id === id);
                      setFormData({
                        ...formData,
                        vinculacio: { tipus: 'esdeveniment', id, nom: found?.nom || id }
                      });
                    }}
                    className="flex-1 min-w-0 px-2.5 py-2 bg-surface text-on-surface rounded-xl border border-outline/20 text-xs outline-none focus:border-primary transition-all truncate"
                  >
                    <option value="">
                      {dbEsdeveniments.length === 0 ? "Cap esdeveniment disponible..." : "Selecciona esdeveniment..."}
                    </option>
                    {dbEsdeveniments.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.nom} {ev.edicioAny ? `(${ev.edicioAny})` : ''} {ev.lloc ? `- ${ev.lloc}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {formData.vinculacio?.tipus === 'cap' && (
                  <div className="flex-1 px-3 py-2 bg-surface-container-low rounded-xl border border-dashed border-outline/20 text-xs text-on-surface-variant flex items-center">
                    Sense vincle extern
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Planificació del Dia de Treball (Ahir / Avui / Demà) */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline/15 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Planificació del Dia de Treball
              </label>
              {formData.planificacio && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface border border-outline/20 text-on-surface">
                  Estat: <strong className="text-primary">{getPlanificacioLabel(formData.planificacio)}</strong>
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant/80">
              Assigna la tasca a la teva jornada per saber què vas deixar pendent, què fas avui i què faràs demà. A les 00:05 s'avança automàticament.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planificacio: null })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                  !formData.planificacio
                    ? 'bg-surface border-outline/40 text-on-surface shadow-xs font-semibold'
                    : 'bg-surface/50 border-outline/15 text-on-surface-variant hover:text-on-surface hover:bg-surface'
                }`}
              >
                Sense planificar
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planificacio: formData.planificacio && formData.planificacio.startsWith('-') ? formData.planificacio : 'ahir' })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                  formData.planificacio === 'ahir' || (formData.planificacio && formData.planificacio.startsWith('-'))
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-xs font-bold'
                    : 'bg-surface/50 border-outline/15 text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10'
                }`}
              >
                {formData.planificacio && (formData.planificacio === 'ahir' || formData.planificacio.startsWith('-'))
                  ? getPlanificacioLabel(formData.planificacio)
                  : 'Ahir'}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planificacio: 'avui' })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                  formData.planificacio === 'avui'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md ring-2 ring-amber-500/30'
                    : 'bg-surface/50 border-outline/15 text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                🌟 Avui
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planificacio: 'dema' })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                  formData.planificacio === 'dema'
                    ? 'bg-sky-500/25 text-sky-300 border-sky-400/60 shadow-xs font-bold'
                    : 'bg-surface/50 border-outline/15 text-sky-400/70 hover:text-sky-300 hover:bg-sky-500/10'
                }`}
              >
                Demà
              </button>
            </div>
          </div>

          {/* Camp Memo / Descripció detallada */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Descripció / Memo detallat (eines, mides, passos clau)
            </label>
            <textarea
              rows={3}
              placeholder="Explica els detalls a tenir en compte, enllaços, materials o instruccions per fer la tasca correctament..."
              value={formData.descripcio}
              onChange={e => setFormData({ ...formData, descripcio: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-outline/20 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-mono outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Llista de Subtasques (Micro-Checklist) */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Subtasques (Checklist)
                </span>
                {totalSubtasksCount > 0 && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {completedSubtasksCount} de {totalSubtasksCount} ({progressPercent}%)
                  </span>
                )}
              </div>
            </div>

            {/* Barra de progrés */}
            {totalSubtasksCount > 0 && (
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Llistat de subtasques existents */}
            {formData.subtasques.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {formData.subtasques.map((st, idx) => {
                  const isEditing = editingSubtaskId === st.id;

                  if (isEditing) {
                    return (
                      <div 
                        key={st.id || idx}
                        className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-surface-container-high/60 border-primary/40 text-xs"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingSubtaskText}
                          onChange={e => setEditingSubtaskText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveSubtaskEdit(st.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelSubtaskEdit();
                            }
                          }}
                          className="flex-1 px-2.5 py-1 bg-surface text-on-surface rounded border border-outline/20 text-xs outline-none focus:border-primary transition-colors"
                          placeholder="Text de la subtasca..."
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveSubtaskEdit(st.id)}
                          disabled={!editingSubtaskText.trim()}
                          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                          title="Desar canvis (Intro)"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelSubtaskEdit}
                          className="p-1 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded transition-colors cursor-pointer shrink-0"
                          title="Cancel·lar (Esc)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={st.id || idx}
                      className={`group flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                        st.completada 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-on-surface-variant line-through' 
                          : 'bg-surface border-outline/15 text-on-surface'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer select-none mr-2"
                      >
                        {st.completada ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-on-surface-variant hover:text-primary shrink-0" />
                        )}
                        <span 
                          className={`break-words ${st.completada ? 'opacity-70' : 'font-medium'}`}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEditSubtask(st);
                          }}
                          title="Fes doble clic per editar o fes servir el botó de llapis"
                        >
                          {st.text}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditSubtask(st)}
                          className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                          title="Editar text de la subtasca"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors cursor-pointer"
                          title="Eliminar subtasca"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant/70 italic">
                No hi ha subtasques afegides. Pots dividir aquesta tasca en petits passos per anar marcant-los.
              </p>
            )}

            {/* Afegir subtasca ràpida */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Afegeix un pas o comprovació..."
                value={newSubtaskText}
                onChange={e => setNewSubtaskText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-surface text-on-surface rounded-lg border border-outline/20 text-xs outline-none focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskText.trim()}
                className="px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Afegir</span>
              </button>
            </div>
          </div>

          {/* Imatges / Esbossos de referència */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" />
                <span>Fotografies / Esbossos d'inspiració ({formData.imatges.length})</span>
              </label>
              
              <label className="px-3 py-1 bg-surface hover:bg-surface-container text-primary border border-outline/20 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Afegir Fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadImages}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>

            {isUploadingPhoto && (
              <p className="text-xs text-amber-500 animate-pulse mb-2">
                Processant i optimitzant fotografies...
              </p>
            )}

            {formData.imatges.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {formData.imatges.map((img, idx) => (
                  <div 
                    key={img.id || idx}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-outline/20 bg-surface shadow-xs"
                  >
                    <img 
                      src={img.url} 
                      alt={img.nom || `Foto ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setEnlargedPhoto(img)}
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                      #{idx + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEnlargedPhoto(img)}
                        className="p-1.5 rounded-full bg-white/80 hover:bg-white text-stone-900 transition-colors cursor-pointer"
                        title="Ampliar imatge"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1.5 rounded-full bg-error hover:bg-red-700 text-white transition-colors cursor-pointer"
                        title="Eliminar imatge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-outline/20 rounded-xl p-4 text-center text-xs text-on-surface-variant/70">
                Pots afegir fotos d'esbossos en paper, mostres de peces o inspiració visual.
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-outline/10 flex items-center justify-between gap-3">
            {task && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Estàs segur que vols eliminar aquesta tasca?")) {
                    onDelete(task.id);
                  }
                }}
                className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface-variant rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{task ? 'Guardar Canvis' : 'Crear Tasca'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Lightbox ampliat per a fotos */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={enlargedPhoto.url} 
              alt={enlargedPhoto.nom}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            />
            {enlargedPhoto.nom && (
              <p className="text-white/80 text-sm mt-3 font-medium bg-black/60 px-4 py-1.5 rounded-full">
                {enlargedPhoto.nom}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
