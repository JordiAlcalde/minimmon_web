import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, ArrowLeft, Clock, Camera, 
  Trash2, MessageSquare, CheckCircle, AlertCircle, Sparkles, User, Calendar,
  Layers, ChevronRight, X
} from 'lucide-react';
import { 
  formatSecondsToHMS, formatSecondsHuman, generateProjeccId, 
  compressImageFile, formatDateDMY 
} from '../../data/projeccInitialData';

export function ProjeccTimerView({ 
  activeTimers = [],
  activeTimerId,
  onSelectTimer,
  onTogglePause,
  onUpdateTimerData,
  onFinishTimer,
  onDiscardTimer,
  onBack,
  isDark 
}) {
  const currentTimer = activeTimers.find(t => t.id === activeTimerId) || activeTimers[0] || null;

  // Estat local de les notes i fotos de la tasca seleccionada
  const [memoNotes, setMemoNotes] = useState('');
  const [sessionPhotos, setSessionPhotos] = useState([]);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [, setTick] = useState(0);

  const fileInputRef = useRef(null);

  // Sincronització de notes i fotos quan es canvia de ranura activa
  useEffect(() => {
    if (currentTimer) {
      setMemoNotes(currentTimer.memoNotes || '');
      setSessionPhotos(Array.isArray(currentTimer.sessionPhotos) ? currentTimer.sessionPhotos : []);
      setShowFinishConfirm(false);
    }
  }, [currentTimer?.id]);

  // Actualitzar el comptador en temps real cada 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!currentTimer) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-400 text-sm mb-4">No hi ha cap tasca activa en aquest moment.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
        >
          Tornar al Taller
        </button>
      </div>
    );
  }

  // Càlcul de segons transcorreguts per a qualsevol ranura
  const getElapsedSeconds = (t) => {
    if (!t) return 0;
    const accumulated = Number(t.accumulatedSeconds) || 0;
    if (t.isRunning && t.startTimestamp) {
      const live = Math.floor((Date.now() - t.startTimestamp) / 1000);
      return Math.max(0, accumulated + (live > 0 ? live : 0));
    }
    return accumulated;
  };

  const elapsedSeconds = getElapsedSeconds(currentTimer);
  const previousTaskSeconds = Number(currentTimer.previousTaskSeconds) || 0;
  const totalProjectedTaskSeconds = previousTaskSeconds + elapsedSeconds;

  // Canviar de ranura activa desant primer les dades de la ranura actual
  const handleSwitchSlot = (targetTimerId) => {
    if (targetTimerId === currentTimer.id) return;
    onUpdateTimerData(currentTimer.id, {
      memoNotes: memoNotes,
      sessionPhotos: sessionPhotos
    });
    onSelectTimer(targetTimerId);
  };

  // Actualització de notes locals amb propagació suau
  const handleNotesChange = (val) => {
    setMemoNotes(val);
    onUpdateTimerData(currentTimer.id, { memoNotes: val });
  };

  // Pujada de fotos de procés
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingPhoto(true);

    const newUploaded = [];
    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.65);
        if (compressedUrl) {
          newUploaded.push({
            id: generateProjeccId('img'),
            url: compressedUrl,
            nom: file.name,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn("Error comprimint imatge:", err);
      }
    }

    if (newUploaded.length > 0) {
      const updatedPhotos = [...sessionPhotos, ...newUploaded];
      setSessionPhotos(updatedPhotos);
      onUpdateTimerData(currentTimer.id, { sessionPhotos: updatedPhotos });
    }
    setIsUploadingPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = sessionPhotos.filter(p => p.id !== photoId);
    setSessionPhotos(updatedPhotos);
    onUpdateTimerData(currentTimer.id, { sessionPhotos: updatedPhotos });
  };

  const handleFinishPrompt = () => {
    if (currentTimer.isRunning) {
      onTogglePause(currentTimer.id);
    }
    setShowFinishConfirm(true);
  };

  const handleConfirmFinish = () => {
    const now = new Date();
    const endTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    const sessionData = {
      id: generateProjeccId('sess'),
      data: todayStr,
      horaInici: currentTimer.horaInici || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      horaFi: endTime,
      duradaSegons: Math.max(1, elapsedSeconds),
      notes: memoNotes.trim(),
      fotos: sessionPhotos
    };

    onFinishTimer(currentTimer.id, sessionData);
  };

  const handleDiscard = () => {
    if (window.confirm(`Vols cancel·lar i descartar el temps d'aquesta sessió de "${currentTimer.taskNom}" sense desar res?`)) {
      onDiscardTimer(currentTimer.id);
    }
  };

  const isRunning = currentTimer.isRunning;

  return (
    <div className={`min-h-screen flex flex-col ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Barra superior de navegació */}
      <header className={`sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => {
            // Desa notes actuals abans de tornar
            onUpdateTimerData(currentTimer.id, { memoNotes, sessionPhotos });
            onBack();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Minimitzar a segon terme (el cronòmetre continuarà corrent)"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tornar al Taller</span>
        </button>

        <div className="text-center">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {currentTimer.itemNom}
          </span>
        </div>

        <div className="w-20 flex justify-end items-center gap-2">
          {isRunning && (
            <span className="flex h-3 w-3 relative" title="Comptador actiu">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </header>

      {/* SELECTOR DE RANURES SIMULTÀNIES (Fins a 3 tasques) */}
      <div className={`border-b px-3 sm:px-4 py-2 ${
        isDark ? 'bg-slate-900/95 border-slate-800/80' : 'bg-amber-50/50 border-amber-200/60'
      }`}>
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 w-full">
            {activeTimers.map((timer, slotIdx) => {
              const isSelected = timer.id === currentTimer.id;
              const slotElapsed = getElapsedSeconds(timer);
              const running = timer.isRunning;

              return (
                <button
                  key={timer.id}
                  onClick={() => handleSwitchSlot(timer.id)}
                  className={`flex-1 min-w-[120px] sm:min-w-[140px] px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md font-bold scale-[1.02]'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-amber-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] opacity-75 uppercase tracking-wider">
                        Ranura {slotIdx + 1}
                      </span>
                      {running ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs truncate font-serif">{timer.taskNom}</p>
                  </div>

                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    isSelected ? 'text-white' : 'text-amber-400'
                  }`}>
                    {formatSecondsToHMS(slotElapsed)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cos principal de l'operari */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between gap-6 pb-28">
        
        {/* Targeta de la Tasca Activa */}
        <section className={`p-4 sm:p-5 rounded-2xl border text-center space-y-2.5 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-xs sm:text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" />
            Tasca en Curs
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-100">
            {currentTimer.taskNom}
          </h1>
          {currentTimer.taskDesc && (
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
              {currentTimer.taskDesc}
            </p>
          )}

          {currentTimer.nomClient && (
            <div className="flex items-center justify-center gap-1.5 text-sm sm:text-base text-slate-300 pt-1">
              <User className="w-4 h-4 text-amber-400" />
              <span>Client: <strong className="text-white font-bold">{currentTimer.nomClient}</strong></span>
            </div>
          )}
        </section>

        {/* Display del Cronòmetre Digital (Gegant per a Mòbil / Tablet) */}
        <section className={`py-8 px-4 rounded-3xl border text-center space-y-3 relative overflow-hidden transition-all ${
          isRunning 
            ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/40 shadow-lg shadow-amber-500/5' 
            : 'bg-gradient-to-b from-blue-500/10 to-transparent border-blue-500/40'
        }`}>
          <div className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-widest">
            {isRunning ? '⏱️ Cronòmetre Actiu' : '⏸️ Sessió en Pausa'}
          </div>

          <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-amber-400 drop-shadow-sm select-none py-2">
            {formatSecondsToHMS(elapsedSeconds)}
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-300 pt-3 border-t border-slate-800/60">
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Temps Previ</span>
              <span className="font-mono text-base sm:text-lg font-bold text-slate-200">{formatSecondsToHMS(previousTaskSeconds)}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-0.5">Total Previst Tasca</span>
              <span className="font-mono text-base sm:text-lg font-bold text-amber-400">{formatSecondsToHMS(totalProjectedTaskSeconds)}</span>
            </div>
          </div>
        </section>

        {/* Camp Memo / Notes de l'Operari */}
        <section className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <label className="text-sm sm:text-base font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Notes & Observacions de la feina
            </span>
            <span className="text-xs text-slate-400 font-normal">Memo d'operari</span>
          </label>
          <textarea
            value={memoNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Anota aquí mides especials, incidències, brotxes/freses emprades, temps de secatge o ajustos per a la fabricació..."
            rows={3}
            className={`w-full p-3.5 text-sm sm:text-base leading-relaxed rounded-xl border outline-none resize-y transition-all ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
            }`}
          />
        </section>

        {/* Documentació Fotogràfica de Procés */}
        <section className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-500" />
              Fotos de Procés ({sessionPhotos.length})
            </div>
            
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Fer / Pujar Foto
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment" 
              multiple 
              className="hidden" 
              onChange={handlePhotoUpload} 
              disabled={isUploadingPhoto}
            />
          </div>

          {isUploadingPhoto && (
            <div className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse py-1">
              <span>Processant i comprimint imatge...</span>
            </div>
          )}

          {sessionPhotos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {sessionPhotos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img src={photo.url} alt="Foto procés" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
              Fotografia detalls del muntatge, posició de peces o calibratge per recordar-ho després.
            </p>
          )}
        </section>

      </main>

      {/* Botonera Flotant Inferior d'Accions */}
      <footer className={`fixed bottom-0 left-0 right-0 z-40 p-4 border-t backdrop-blur-lg ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          
          <button
            onClick={() => onTogglePause(currentTimer.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer active:scale-95 ${
              isRunning
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pausar Feina
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Reprendre Feina
              </>
            )}
          </button>

          <button
            onClick={handleFinishPrompt}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" />
            Finalitzar
          </button>

        </div>
      </footer>

      {/* Modal de Confirmació de Finalització */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-bold font-serif text-slate-100">Finalitzar aquesta sessió?</h3>
              <p className="text-sm text-slate-300">
                Es desarà un registre de <strong className="text-amber-400 font-bold">{formatSecondsHuman(elapsedSeconds)}</strong> ({formatSecondsToHMS(elapsedSeconds)}) per a la tasca "{currentTimer.taskNom}".
              </p>
            </div>

            {memoNotes && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 italic leading-relaxed">
                "{memoNotes}"
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className={`py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Seguir treballant
              </button>
              
              <button
                type="button"
                onClick={handleConfirmFinish}
                className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
              >
                Confirmar i Desar
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={handleDiscard}
                className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
              >
                Cancel·lar i descartar aquesta sessió
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
