import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, ArrowLeft, Clock, Camera, Image as ImageIcon, 
  Trash2, MessageSquare, CheckCircle, AlertCircle, Sparkles, User, Calendar
} from 'lucide-react';
import { 
  formatSecondsToHMS, formatSecondsHuman, generateProjeccId, 
  compressImageFile, formatDateDMY 
} from '../../data/projeccInitialData';

export function ProjeccTimerView({ 
  item, 
  task, 
  isDark, 
  onBack, 
  onSaveSession 
}) {
  // Estat del cronòmetre
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Dades de la sessió en curs
  const [startTime, setStartTime] = useState(null);
  const [memoNotes, setMemoNotes] = useState('');
  const [sessionPhotos, setSessionPhotos] = useState([]);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const accumulatedRef = useRef(0);
  const fileInputRef = useRef(null);

  // Temps prèviament acumulat en aquesta tasca
  const existingSessions = Array.isArray(task?.sessions) ? task.sessions : [];
  const previousTaskSeconds = existingSessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);

  // Cronometratge precís basat en timestamp per evitar desfasaments
  useEffect(() => {
    if (isRunning && !isPaused) {
      startTimeRef.current = Date.now() - (accumulatedRef.current * 1000);
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = Math.floor((now - startTimeRef.current) / 1000);
        setElapsedSeconds(currentElapsed);
        accumulatedRef.current = currentElapsed;
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  // Gestió dels botons de control
  const handleStart = () => {
    if (!startTime) {
      const now = new Date();
      setStartTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleFinishPrompt = () => {
    handlePause();
    setShowFinishConfirm(true);
  };

  const handleConfirmFinish = () => {
    const now = new Date();
    const endTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    const newSession = {
      id: generateProjeccId('sess'),
      data: todayStr,
      horaInici: startTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      horaFi: endTime,
      duradaSegons: elapsedSeconds,
      notes: memoNotes.trim(),
      fotos: sessionPhotos
    };

    onSaveSession(item.id, task.id, newSession);
  };

  // Pujada de fotos de procés des del mòbil amb compressió automàtica
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingPhoto(true);

    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.65);
        if (compressedUrl) {
          setSessionPhotos(prev => [
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
        console.warn("Error comprimint imatge:", err);
      }
    }
    setIsUploadingPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (photoId) => {
    setSessionPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Avisar si l'usuari intenta sortir amb un cronòmetre actiu
  const handleBackClick = () => {
    if (isRunning && elapsedSeconds > 5) {
      if (window.confirm("Hi ha una sessió de cronometratge en marxa. Si surts ara sense finalitzar, es perdrà el temps no desat. Vols sortir igualment?")) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const totalProjectedTaskSeconds = previousTaskSeconds + elapsedSeconds;

  return (
    <div className={`min-h-screen flex flex-col ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Barra superior Mobile-First */}
      <header className={`sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={handleBackClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tornar</span>
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
              item.tipus === 'projecte' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {item.tipus === 'projecte' ? 'Projecte' : 'Producte'}
            </span>
          </div>
          <h2 className="text-xs font-bold truncate max-w-[200px] sm:max-w-xs text-slate-300 mt-0.5">
            {item.nomDefinitiu || item.nomProvisional || item.nom}
          </h2>
        </div>

        <div className="w-16 flex justify-end">
          {isRunning && !isPaused && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </header>

      {/* Cos principal de l'operari */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between gap-6 pb-28">
        
        {/* Targeta de la Tasca Activa */}
        <section className={`p-4 rounded-2xl border text-center space-y-2 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Tasca en Curs
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100">
            {task.nom}
          </h1>
          {task.descripcio && (
            <p className="text-xs text-slate-400">{task.descripcio}</p>
          )}

          {item.nomClient && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Client: <strong className="text-slate-200">{item.nomClient}</strong></span>
            </div>
          )}
        </section>

        {/* Display del Cronòmetre Digital (Gegant per a Mòbil) */}
        <section className={`py-8 px-4 rounded-3xl border text-center space-y-3 relative overflow-hidden transition-all ${
          isRunning && !isPaused 
            ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/40 shadow-lg shadow-amber-500/5' 
            : isPaused 
              ? 'bg-gradient-to-b from-blue-500/10 to-transparent border-blue-500/40' 
              : isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {isRunning ? (isPaused ? '⏸️ Sessió en Pausa' : '⏱️ Cronòmetre Actiu') : 'Prêt per Iniciar'}
          </div>

          <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-amber-400 drop-shadow-sm select-none py-2">
            {formatSecondsToHMS(elapsedSeconds)}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <div>
              <span className="block text-[10px] uppercase text-slate-400">Temps Previ</span>
              <span className="font-mono font-bold text-slate-300">{formatSecondsToHMS(previousTaskSeconds)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="block text-[10px] uppercase text-slate-400">Total Previst Tasca</span>
              <span className="font-mono font-bold text-amber-300">{formatSecondsToHMS(totalProjectedTaskSeconds)}</span>
            </div>
          </div>
        </section>

        {/* Camp Memo / Notes de l'Operari */}
        <section className={`p-4 rounded-2xl border space-y-2 ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              Notes & Observacions de la feina
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Memo d'operari</span>
          </label>
          <textarea
            value={memoNotes}
            onChange={(e) => setMemoNotes(e.target.value)}
            placeholder="Anota aquí mides especials, incidències, brotxes/freses emprades, temps de secatge o ajustos per a la fabricació..."
            rows={3}
            className={`w-full p-3 text-xs rounded-xl border outline-none resize-y transition-all ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
            }`}
          />
        </section>

        {/* Documentació Fotogràfica de Procés (Càmera / Galeria) */}
        <section className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-500" />
              Fotos de Procés ({sessionPhotos.length})
            </div>
            
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
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
            />
          </div>

          {sessionPhotos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {sessionPhotos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img src={photo.url} alt="Foto procés" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Fotografia detalls del muntatge, posició de peces o calibratge per recordar-ho després.
            </p>
          )}
        </section>

      </main>

      {/* Botonera Flotant Inferior d'Alta Accessibilitat per a Mòbil */}
      <footer className={`fixed bottom-0 left-0 right-0 z-40 p-4 border-t backdrop-blur-lg ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          
          {/* Estat 1: No iniciat */}
          {!isRunning && elapsedSeconds === 0 && (
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-base font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              Iniciar Tasca
            </button>
          )}

          {/* Estat 2: En marxa (Corrent) */}
          {isRunning && !isPaused && (
            <>
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
              >
                <Pause className="w-4 h-4 fill-current" />
                Pausar Feina
              </button>

              <button
                onClick={handleFinishPrompt}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                Finalitzar
              </button>
            </>
          )}

          {/* Estat 3: Pausat */}
          {isRunning && isPaused && (
            <>
              <button
                onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Reprendre
              </button>

              <button
                onClick={handleFinishPrompt}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                Finalitzar
              </button>
            </>
          )}

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

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold font-serif">Finalitzar aquesta sessió?</h3>
              <p className="text-xs text-slate-400">
                Es desarà un registre de <strong>{formatSecondsHuman(elapsedSeconds)}</strong> ({formatSecondsToHMS(elapsedSeconds)}) per a la tasca "{task.nom}".
              </p>
            </div>

            {memoNotes && (
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 italic">
                "{memoNotes}"
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className={`py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Seguir treballant
              </button>
              
              <button
                onClick={handleConfirmFinish}
                className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirmar i Desar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
