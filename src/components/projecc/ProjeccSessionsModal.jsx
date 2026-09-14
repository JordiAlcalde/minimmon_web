import React, { useState, useEffect } from 'react';
import { 
  X, Clock, Calendar, MessageSquare, Trash2, Edit3, Check, 
  Camera, Image as ImageIcon, Plus, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, History, ArrowRight, Download, ExternalLink, ZoomIn
} from 'lucide-react';
import { 
  formatSecondsToHMS, 
  formatSecondsHuman, 
  formatDateDMY, 
  generateProjeccId,
  compressImageFile 
} from '../../data/projeccInitialData';

// Helpers de conversió i coordinació horària
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return null;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '';
  let normalized = Math.round(totalMinutes) % (24 * 60);
  if (normalized < 0) normalized += 24 * 60;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDefaultStartTime() {
  const now = new Date();
  const h = now.getHours();
  const m = Math.floor(now.getMinutes() / 5) * 5;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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
            <title>Imatge del Procés - Projecc</title>
            <style>
              body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; }
            </style>
          </head>
          <body>
            <img src="${imgUrl}" alt="Foto procés" />
          </body>
        </html>
      `);
      win.document.close();
      return;
    }
  }
  window.open(imgUrl, '_blank');
}

export function ProjeccSessionsModal({ 
  task, 
  item, 
  isDark, 
  onClose, 
  onUpdateSessions,
  onStartNewSession,
  initialOpenManual = false
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editHoraInici, setEditHoraInici] = useState('');
  const [editHoraFi, setEditHoraFi] = useState('');
  const [editFotos, setEditFotos] = useState([]);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Formulari de nova sessió manual (hora inici per defecte = hora actual, durada = 30m, hora fi coordinada)
  const [showManualForm, setShowManualForm] = useState(initialOpenManual);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualHoraInici, setManualHoraInici] = useState(() => getDefaultStartTime());
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualHoraFi, setManualHoraFi] = useState(() => {
    const startMin = timeToMinutes(getDefaultStartTime());
    return minutesToTime((startMin || 0) + 30);
  });
  const [manualNotes, setManualNotes] = useState('');
  const [manualFotos, setManualFotos] = useState([]);
  const [isUploadingManualPhoto, setIsUploadingManualPhoto] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  useEffect(() => {
    if (initialOpenManual) {
      setShowManualForm(true);
    }
  }, [initialOpenManual]);

  if (!task || !item) return null;

  const sessions = Array.isArray(task.sessions) ? task.sessions : [];
  const totalSeconds = sessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);
  const isClosed = item.estat === 'tancat';

  // -------------------------------------------------------------
  // COORDINACIÓ FORMULARI MANUAL (Hora Inici <-> Durada <-> Hora Fi)
  // -------------------------------------------------------------

  // 1. Canvi d'hora d'inici manual: manté la durada i mou l'hora de fi
  const handleManualStartTimeChange = (newStart) => {
    setManualHoraInici(newStart);
    const startMin = timeToMinutes(newStart);
    if (startMin !== null) {
      const durMin = (parseInt(manualHours, 10) || 0) * 60 + (parseInt(manualMinutes, 10) || 0);
      if (durMin > 0) {
        setManualHoraFi(minutesToTime(startMin + durMin));
      }
    }
  };

  // 2. Canvi d'hora de finalització manual: recalcula durada (hores i minuts)
  const handleManualEndTimeChange = (newEnd) => {
    setManualHoraFi(newEnd);
    const startMin = timeToMinutes(manualHoraInici);
    const endMin = timeToMinutes(newEnd);
    if (startMin !== null && endMin !== null) {
      let diff = endMin - startMin;
      if (diff < 0) diff += 24 * 60; // Suport per torns que travessen la mitjanit
      setManualHours(Math.floor(diff / 60));
      setManualMinutes(diff % 60);
    }
  };

  // 3. Selecció de botons ràpids (15m, 30m, 45m, 1h, etc.)
  const handlePresetClick = (presetH, presetM) => {
    setManualHours(presetH);
    setManualMinutes(presetM);
    const startMin = timeToMinutes(manualHoraInici);
    if (startMin !== null) {
      setManualHoraFi(minutesToTime(startMin + (presetH * 60 + presetM)));
    }
  };

  // 4. Suma ràpida de minuts (+15m, +30m)
  const handleAddMinutes = (additionalMinutes) => {
    const currentDurMin = (parseInt(manualHours, 10) || 0) * 60 + (parseInt(manualMinutes, 10) || 0);
    const newDurMin = currentDurMin + additionalMinutes;
    const h = Math.floor(newDurMin / 60);
    const m = newDurMin % 60;
    setManualHours(h);
    setManualMinutes(m);
    const startMin = timeToMinutes(manualHoraInici);
    if (startMin !== null) {
      setManualHoraFi(minutesToTime(startMin + newDurMin));
    }
  };

  // 5. Entrada manual directa d'hores i minuts numèrics
  const handleDurationInputsChange = (newH, newM) => {
    const h = Math.max(0, parseInt(newH, 10) || 0);
    const m = Math.max(0, parseInt(newM, 10) || 0);
    setManualHours(h);
    setManualMinutes(m);
    const startMin = timeToMinutes(manualHoraInici);
    if (startMin !== null) {
      setManualHoraFi(minutesToTime(startMin + (h * 60 + m)));
    }
  };

  // Desar nova sessió manual (validant hora inici, fi i durada)
  const handleSaveManualSession = () => {
    if (!manualHoraInici || manualHoraInici.trim() === '') {
      alert("L'hora d'inici és obligatòria.");
      return;
    }
    if (!manualHoraFi || manualHoraFi.trim() === '') {
      alert("L'hora de final és obligatòria (pots indicar-la o usar els botons ràpids).");
      return;
    }

    const hours = parseInt(manualHours, 10) || 0;
    const minutes = parseInt(manualMinutes, 10) || 0;
    const duradaSegons = (hours * 3600) + (minutes * 60);

    if (duradaSegons <= 0) {
      alert("La durada ha de ser superior a 0 minuts.");
      return;
    }

    const newSession = {
      id: generateProjeccId('sess'),
      data: manualDate || new Date().toISOString().split('T')[0],
      horaInici: manualHoraInici,
      horaFi: manualHoraFi,
      duradaSegons: duradaSegons,
      notes: (manualNotes || '').trim(),
      fotos: manualFotos || [],
      manual: true
    };

    const updated = [...sessions, newSession];
    onUpdateSessions(task.id, updated);

    // Netejar estat del formulari manual
    setShowManualForm(false);
    const nextStart = getDefaultStartTime();
    setManualHoraInici(nextStart);
    setManualHours(0);
    setManualMinutes(30);
    setManualHoraFi(minutesToTime((timeToMinutes(nextStart) || 0) + 30));
    setManualNotes('');
    setManualFotos([]);
  };

  // -------------------------------------------------------------
  // EDICIÓ DE SESSIÓ EXISTENT (amb sincronització d'hores i durada)
  // -------------------------------------------------------------
  const handleStartEdit = (session) => {
    setEditingSessionId(session.id);
    setEditNotes(session.notes || '');
    setEditHoraInici(session.horaInici || '');
    setEditHoraFi(session.horaFi || '');
    const initialFotos = Array.isArray(session.fotos)
      ? session.fotos.map((f, idx) => typeof f === 'string' ? { id: generateProjeccId('img'), url: f } : f)
      : [];
    setEditFotos(initialFotos);

    let secs = Number(session.duradaSegons) || 0;
    const startMin = timeToMinutes(session.horaInici);
    const endMin = timeToMinutes(session.horaFi);

    // Si hi ha hora d'inici i final però durada no concordava, corregim la proposta inicial
    if (startMin !== null && endMin !== null) {
      let diffMin = endMin - startMin;
      if (diffMin < 0) diffMin += 24 * 60;
      if (diffMin > 0 && Math.abs(diffMin * 60 - secs) > 60) {
        secs = diffMin * 60;
      }
    }

    setEditHours(Math.floor(secs / 3600));
    setEditMinutes(Math.round((secs % 3600) / 60));
  };

  const handleEditStartTimeChange = (newStart) => {
    setEditHoraInici(newStart);
    const startMin = timeToMinutes(newStart);
    if (startMin !== null) {
      const durMin = (parseInt(editHours, 10) || 0) * 60 + (parseInt(editMinutes, 10) || 0);
      if (durMin > 0) {
        setEditHoraFi(minutesToTime(startMin + durMin));
      }
    }
  };

  const handleEditEndTimeChange = (newEnd) => {
    setEditHoraFi(newEnd);
    const startMin = timeToMinutes(editHoraInici);
    const endMin = timeToMinutes(newEnd);
    if (startMin !== null && endMin !== null) {
      let diff = endMin - startMin;
      if (diff < 0) diff += 24 * 60;
      setEditHours(Math.floor(diff / 60));
      setEditMinutes(diff % 60);
    }
  };

  const handleEditAddMinutes = (additionalMinutes) => {
    const currentDurMin = (parseInt(editHours, 10) || 0) * 60 + (parseInt(editMinutes, 10) || 0);
    const newDurMin = Math.max(1, currentDurMin + additionalMinutes);
    const h = Math.floor(newDurMin / 60);
    const m = newDurMin % 60;
    setEditHours(h);
    setEditMinutes(m);
    const startMin = timeToMinutes(editHoraInici);
    if (startMin !== null) {
      setEditHoraFi(minutesToTime(startMin + newDurMin));
    }
  };

  const handleSaveEdit = (sessionId) => {
    const hours = parseInt(editHours, 10) || 0;
    const minutes = parseInt(editMinutes, 10) || 0;
    const duradaSegons = (hours * 3600) + (minutes * 60);

    const updated = sessions.map(s => s.id === sessionId ? { 
      ...s, 
      horaInici: editHoraInici || s.horaInici || '',
      horaFi: editHoraFi || s.horaFi || '',
      notes: editNotes,
      fotos: editFotos || [],
      duradaSegons: duradaSegons > 0 ? duradaSegons : (s.duradaSegons || 60)
    } : s);
    onUpdateSessions(task.id, updated);
    setEditingSessionId(null);
    setEditFotos([]);
  };

  // Gestió de fotos en edició de sessió
  const handleEditPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingEditPhoto(true);

    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.65);
        if (compressedUrl) {
          setEditFotos(prev => [
            ...prev,
            {
              id: generateProjeccId('img'),
              url: compressedUrl,
              nom: file.name,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.warn("Error comprimint imatge per a l'edició de sessió:", err);
      }
    }
    setIsUploadingEditPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleRemoveEditPhoto = (photoId) => {
    setEditFotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleDeleteSession = (sessionId) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    onUpdateSessions(task.id, updated);
    setConfirmDeleteId(null);
  };

  // Pujada de foto a la sessió manual
  const handleManualPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingManualPhoto(true);

    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.65);
        if (compressedUrl) {
          setManualFotos(prev => [
            ...prev,
            {
              id: generateProjeccId('img'),
              url: compressedUrl,
              nom: file.name,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.warn("Error comprimint imatge per a sessió manual:", err);
      }
    }
    setIsUploadingManualPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleRemoveManualPhoto = (photoId) => {
    setManualFotos(prev => prev.filter(p => p.id !== photoId));
  };

  const manualCalculatedSeconds = ((parseInt(manualHours, 10) || 0) * 3600) + ((parseInt(manualMinutes, 10) || 0) * 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
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
              <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{task.descripcio}</p>
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

        {/* Resum de Temps de la Tasca & Accions */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2.5 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-400">Temps Total:</span>
            <span className="font-mono text-base font-bold text-amber-400">
              {formatSecondsToHMS(totalSeconds)}
            </span>
            <span className="text-xs text-slate-400">({formatSecondsHuman(totalSeconds)})</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">
              {sessions.length} {sessions.length === 1 ? 'sessió' : 'sessions'}
            </span>

            {!isClosed && (
              <>
                {/* Botó per afegir temps manualment */}
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                    showManualForm
                      ? 'bg-amber-600 text-white border-amber-500'
                      : isDark
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  }`}
                  title="Afegir un temps estimat per una feina no cronometrada en directe"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Temps manual</span>
                  {showManualForm ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>

                {/* Botó per iniciar cronòmetre en viu */}
                {onStartNewSession && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartNewSession(task);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    title="Iniciar el cronòmetre de taller en viu"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nou Cronòmetre</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Formulari Desplegable per Afegir Temps Manual */}
        {showManualForm && !isClosed && (
          <div className={`p-4 sm:p-5 border-b animate-fadeIn space-y-4 ${
            isDark ? 'bg-amber-950/25 border-amber-500/30' : 'bg-amber-50/80 border-amber-200'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Entrada de Temps Manual (Coordinada)
                </h4>
              </div>
              <span className="text-[11px] text-amber-400/90 font-medium hidden sm:inline">
                Hora d'inici obligatòria + càlcul automàtic o manual
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Columna Esquerra: Data i Horari Coordinat (Inici obligatòria & Final) */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Data de la feina
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Hora inici <span className="text-amber-500">*</span></span>
                      <span className="text-[9px] text-amber-400 font-semibold">Obligatòria</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={manualHoraInici}
                      onChange={(e) => handleManualStartTimeChange(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border outline-none ${
                        isDark ? 'bg-slate-900 border-amber-500/40 text-amber-300 focus:border-amber-400' : 'bg-white border-amber-300 text-amber-800 focus:border-amber-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Hora final <span className="text-amber-500">*</span></span>
                      <span className="text-[9px] text-slate-400 font-normal">Directa o ràpida</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={manualHoraFi}
                      onChange={(e) => handleManualEndTimeChange(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border outline-none ${
                        isDark ? 'bg-slate-900 border-amber-500/40 text-amber-300 focus:border-amber-400' : 'bg-white border-amber-300 text-amber-800 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Franja seleccionada:</span>
                  <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    {manualHoraInici || '--:--'} <ArrowRight className="w-3 h-3 text-slate-500" /> {manualHoraFi || '--:--'}
                  </span>
                </div>
              </div>

              {/* Columna Dreta: Botons Ràpids & Durada Calculada */}
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ajust Ràpid de Durada
                    </label>
                    <span className="text-[10px] text-amber-400">Calcula l'hora final</span>
                  </div>

                  {/* Botons d'1 sol clic per calcular hora final i durada */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '15m', h: 0, m: 15 },
                      { label: '30m', h: 0, m: 30 },
                      { label: '45m', h: 0, m: 45 },
                      { label: '1h', h: 1, m: 0 },
                      { label: '1h 15m', h: 1, m: 15 },
                      { label: '1h 30m', h: 1, m: 30 },
                      { label: '2h', h: 2, m: 0 },
                    ].map((preset) => {
                      const isSelected = Number(manualHours) === preset.h && Number(manualMinutes) === preset.m;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handlePresetClick(preset.h, preset.m)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-500 shadow-sm font-bold scale-105'
                              : isDark 
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-white' 
                                : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Entrada numèrica hores / minuts i increments */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-700/60">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={manualHours}
                      onChange={(e) => handleDurationInputsChange(e.target.value, manualMinutes)}
                      className={`w-12 p-1 text-center text-xs font-mono font-bold rounded-lg border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-400 mr-2">h</span>
                    
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => handleDurationInputsChange(manualHours, e.target.value)}
                      className={`w-12 p-1 text-center text-xs font-mono font-bold rounded-lg border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-400">min</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddMinutes(15)}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 cursor-pointer active:scale-95"
                      title="Sumar 15 minuts i avançar hora final"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMinutes(30)}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 cursor-pointer active:scale-95"
                      title="Sumar 30 minuts i avançar hora final"
                    >
                      +30m
                    </button>
                  </div>
                </div>

                {/* Total computat */}
                <div className="text-xs text-slate-300 flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[11px] text-slate-400">Durada resultant:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {formatSecondsToHMS(manualCalculatedSeconds)}
                    </span>
                    <span className="text-slate-400 text-[11px]">({formatSecondsHuman(manualCalculatedSeconds)})</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Notes / Descripció de la feina espontània */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Detalls o comentaris de la feina
              </label>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Descriu què has fet (ex: retoc d'ajustos, poliment no previst, aplicació de cola, comprovació de mides...)"
                rows={2}
                className={`w-full p-3 text-sm rounded-xl border outline-none resize-y leading-relaxed ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Fotos de procés opcionals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  Fotos del procés (opcional)
                </label>
                <label className="cursor-pointer text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>Adjuntar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleManualPhotoUpload}
                    disabled={isUploadingManualPhoto}
                  />
                </label>
              </div>

              {isUploadingManualPhoto && (
                <div className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <span>Processant i comprimint imatge...</span>
                </div>
              )}

              {manualFotos.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {manualFotos.map((f) => (
                    <div key={f.id} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                      <img 
                        src={f.url} 
                        alt="Foto procés" 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                        onClick={() => setPreviewImageUrl(f.url)}
                        title="Clica per veure la imatge ampliada"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveManualPhoto(f.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botons Desar / Cancel·lar formulari manual */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={handleSaveManualSession}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Desar Sessió Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* Llistat de Sessions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-10 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">Encara no s'ha enregistrat cap sessió</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Pots iniciar el cronòmetre en viu o afegir un temps manual aproximat si ja has fet la feina.
              </p>
              {!isClosed && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>+ Afegir Temps Manualment</span>
                  </button>
                  {onStartNewSession && (
                    <button
                      onClick={() => {
                        onClose();
                        onStartNewSession(task);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Iniciar Cronòmetre</span>
                    </button>
                  )}
                </div>
              )}
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
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{session.horaInici}</span>
                          {session.horaFi && (
                            <>
                              <span className="text-slate-500">-</span>
                              <span>{session.horaFi}</span>
                            </>
                          )}
                        </span>
                      )}
                      {session.manual && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider" title="Sessió introduïda manualment">
                          Manual
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
                              title="Desar canvis"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(session)}
                              className="p-1 text-slate-400 hover:text-amber-400 rounded cursor-pointer"
                              title="Editar hores, temps o comentaris d'aquesta sessió"
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

                  {/* Detalls de la sessió / Panell d'Edició */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50">
                    {isEditing ? (
                      <div className="space-y-2.5 animate-fadeIn">
                        
                        {/* Franja horària inici i final coordinada */}
                        <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-700/60 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                Hora inici
                              </label>
                              <input
                                type="time"
                                value={editHoraInici}
                                onChange={(e) => handleEditStartTimeChange(e.target.value)}
                                className={`w-full px-2 py-1 text-xs font-mono font-bold rounded border outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                Hora final
                              </label>
                              <input
                                type="time"
                                value={editHoraFi}
                                onChange={(e) => handleEditEndTimeChange(e.target.value)}
                                className={`w-full px-2 py-1 text-xs font-mono font-bold rounded border outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Ajust numèric de la durada resultant */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-400">Durada:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={editHours}
                                  onChange={(e) => {
                                    const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setEditHours(h);
                                    const startMin = timeToMinutes(editHoraInici);
                                    if (startMin !== null) {
                                      setEditHoraFi(minutesToTime(startMin + (h * 60 + editMinutes)));
                                    }
                                  }}
                                  className={`w-12 p-1 text-center text-xs font-mono font-bold rounded border outline-none ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                                  }`}
                                />
                                <span className="text-xs text-slate-400">h</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={editMinutes}
                                  onChange={(e) => {
                                    const m = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setEditMinutes(m);
                                    const startMin = timeToMinutes(editHoraInici);
                                    if (startMin !== null) {
                                      setEditHoraFi(minutesToTime(startMin + (editHours * 60 + m)));
                                    }
                                  }}
                                  className={`w-12 p-1 text-center text-xs font-mono font-bold rounded border outline-none ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                                  }`}
                                />
                                <span className="text-xs text-slate-400">min</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditAddMinutes(15)}
                                className="px-2 py-1 rounded text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                                title="Sumar 15 minuts i avançar hora fi"
                              >
                                +15m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditAddMinutes(30)}
                                className="px-2 py-1 rounded text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                                title="Sumar 30 minuts i avançar hora fi"
                              >
                                +30m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditAddMinutes(-15)}
                                className="px-1.5 py-1 rounded text-[11px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                                title="Restar 15 minuts i retrocedir hora fi"
                              >
                                -15m
                              </button>
                            </div>
                          </div>
                        </div>

                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Anotacions, procediments, dificultats o mides emprades..."
                          rows={2}
                          className={`w-full p-3 text-sm rounded-lg border outline-none resize-y leading-relaxed ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        />

                        {/* Fotos de la sessió en edició */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-500" />
                              Fotos de la sessió ({editFotos.length})
                            </label>
                            <label className="cursor-pointer text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors">
                              <Plus className="w-3 h-3" />
                              <span>Afegir fotos</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleEditPhotoUpload}
                                disabled={isUploadingEditPhoto}
                              />
                            </label>
                          </div>

                          {isUploadingEditPhoto && (
                            <div className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse py-0.5">
                              <span>Processant i comprimint imatge...</span>
                            </div>
                          )}

                          {editFotos.length > 0 ? (
                            <div className="flex items-center gap-2 overflow-x-auto py-1.5">
                              {editFotos.map((f, fIdx) => {
                                const imgUrl = typeof f === 'string' ? f : f.url;
                                const photoId = f.id || `f_${fIdx}`;
                                return (
                                  <div key={photoId} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Foto ${fIdx + 1}`} 
                                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                                      onClick={() => setPreviewImageUrl(imgUrl)}
                                      title="Clica per veure la imatge ampliada"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditPhoto(photoId)}
                                      className="absolute top-0.5 right-0.5 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                                      title="Eliminar aquesta foto"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">No hi ha fotos adjuntes en aquesta sessió.</p>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setEditingSessionId(null);
                              setEditFotos([]);
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            Cancel·lar
                          </button>
                          <button
                            onClick={() => handleSaveEdit(session.id)}
                            className="px-3 py-1 text-[11px] rounded bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                          >
                            Desar canvis
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-200 italic whitespace-pre-wrap leading-relaxed">
                        {session.notes || <span className="text-slate-400 not-italic">Sense comentaris registrats en aquesta sessió.</span>}
                      </p>
                    )}
                  </div>

                  {/* Imatges adjuntes a la sessió (mode lectura) */}
                  {!isEditing && Array.isArray(session.fotos) && session.fotos.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1">
                      {session.fotos.map((foto, fIdx) => {
                        const imgUrl = typeof foto === 'string' ? foto : foto.url;
                        return (
                          <div 
                            key={fIdx} 
                            className="relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-600 bg-slate-950 cursor-pointer shadow-sm hover:border-amber-400 transition-colors"
                            onClick={() => setPreviewImageUrl(imgUrl)}
                            title="Clica per veure la imatge ampliada"
                          >
                            <img 
                              src={imgUrl} 
                              alt={`Foto procés ${fIdx + 1}`} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                              <ZoomIn className="w-5 h-5 text-amber-300" />
                            </div>
                          </div>
                        );
                      })}
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
                alt="Imatge ampliada del procés" 
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
                  link.download = `projecc_foto_${Date.now()}.jpg`;
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
