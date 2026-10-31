import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Upload, Download, Trash2, RefreshCw, Sliders, CheckCircle2,
  Sun, Moon, Globe, Boxes, Clock, Share2, ListTodo, ArrowLeft, Image as ImageIcon,
  ZoomIn, Move, Pipette, Eye, Layers, RotateCcw, Check, Copy, Maximize2, SplitSquareHorizontal, Folder
} from 'lucide-react';
import {
  DEFAULT_RETOUCH_SETTINGS,
  DEFAULT_SWATCH_BG_HEX,
  PRESET_BACKGROUNDS,
  RETOUCH_PRESETS,
  processMinimMonImage,
  formatFileSize,
} from '../../utils/imageRetouchUtils';
import { getScreenTheme, setScreenTheme, THEME_CHANGED_EVENT } from '../../utils/themeUtils';

export default function RetocApp({ setActiveTab }) {
  const [isDark, setIsDark] = useState(() => getScreenTheme('retoc') === 'dark');
  const [items, setItems] = useState([]); // [{ id, name, file, originalUrl, originalSize, originalW, originalH, processedUrl, processedBlob, processedSize, status, customSettings }]
  const [selectedId, setSelectedId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ ...DEFAULT_RETOUCH_SETTINGS });
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [compareMode, setCompareMode] = useState('split'); // 'result' | 'split' | 'original'
  const [isSamplingBg, setIsSamplingBg] = useState(false);
  const [pickMode, setPickMode] = useState(null); // null | 'bg' | 'fg'
  const [showCenterGrid, setShowCenterGrid] = useState(true);
  const [destFolder, setDestFolder] = useState('descarregues'); // 'descarregues' | 'materials' | 'productes'
  const [saveToast, setSaveToast] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!sessionStorage.getItem('theme_override_retoc')) {
        setIsDark(e.detail === 'dark');
      }
    };
    window.addEventListener(THEME_CHANGED_EVENT, handler);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handler);
  }, []);

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setScreenTheme('retoc', next ? 'dark' : 'light');
  };

  const selectedItem = items.find((it) => it.id === selectedId) || items[0] || null;
  const activeSettings = selectedItem?.customSettings || globalSettings;

  // Processar una imatge individual amb els paràmetres indicats
  const processSingleItem = async (item, settingsToUse) => {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'processing' } : it))
    );
    try {
      const result = await processMinimMonImage(item.file || item.originalUrl, settingsToUse);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'done',
                originalW: result.originalWidth,
                originalH: result.originalHeight,
                processedUrl: result.dataUrl,
                processedBlob: result.blob,
                processedSize: result.sizeBytes,
                mimeType: result.mimeType,
              }
            : it
        )
      );
    } catch (err) {
      console.error('Error processant imatge:', err);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'error' } : it))
      );
    }
  };

  // Afegir fitxers nous (Drag & Drop o Selector) i processar-los automàticament
  const handleAddFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newEntries = files.map((file, idx) => ({
      id: `img_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      originalExt: file.name.split('.').pop() || 'jpg',
      file,
      originalUrl: URL.createObjectURL(file),
      originalSize: file.size,
      originalW: 0,
      originalH: 0,
      processedUrl: null,
      processedBlob: null,
      processedSize: 0,
      status: 'pending',
      customSettings: null,
    }));

    setItems((prev) => [...prev, ...newEntries]);
    if (!selectedId && newEntries.length > 0) {
      setSelectedId(newEntries[0].id);
    }

    setIsProcessingAll(true);
    for (const entry of newEntries) {
      await processSingleItem(entry, globalSettings);
    }
    setIsProcessingAll(false);
  };

  // Actualitzar un paràmetre (a la imatge seleccionada o globalment)
  const handleUpdateSetting = (key, value, applyToAll = false) => {
    const updated = { ...activeSettings, [key]: value };

    // Si es canvia a fons transparent, forcem PNG; si es posa color de mostra, tornem a JPEG lleuger
    if (key === 'transparentBg') {
      updated.outputFormat = value ? 'image/png' : 'image/jpeg';
    }

    if (applyToAll || !selectedItem) {
      setGlobalSettings(updated);
      setItems((prev) => prev.map((it) => ({ ...it, customSettings: null })));
    } else {
      setGlobalSettings(updated);
      setItems((prev) =>
        prev.map((it) => (it.id === selectedItem.id ? { ...it, customSettings: updated } : it))
      );
      processSingleItem(selectedItem, updated);
    }
  };

  // Reprocessar tot el lot amb la configuració actual
  const handleReprocessAll = async () => {
    if (items.length === 0) return;
    setIsProcessingAll(true);
    const settingsToApply = { ...activeSettings, manualSamplePoint: null };
    setGlobalSettings(settingsToApply);
    for (const item of items) {
      await processSingleItem(item, settingsToApply);
    }
    setIsProcessingAll(false);
  };

  // Restablir paràmetres al protocol estàndard de Mínim Món
  const handleResetDefault = () => {
    const def = { ...DEFAULT_RETOUCH_SETTINGS };
    setGlobalSettings(def);
    if (selectedItem) {
      setItems((prev) =>
        prev.map((it) => (it.id === selectedItem.id ? { ...it, customSettings: null } : it))
      );
      processSingleItem(selectedItem, def);
    }
  };

  // Clic sobre la imatge original per afegir un punt d'esborrat de fons o de restauració de peça
  const handleOriginalImageClick = (e) => {
    if ((!pickMode && !isSamplingBg) || !selectedItem) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const mode = pickMode || 'bg';
    setIsSamplingBg(false);
    setPickMode(null);
    if (mode === 'fg') {
      const nextFg = [...(activeSettings.manualFgPoints || []), { x, y }];
      handleUpdateSetting('manualFgPoints', nextFg);
    } else {
      const nextBg = [...(activeSettings.manualBgPoints || []), { x, y }];
      handleUpdateSetting('manualBgPoints', nextBg);
    }
  };

  const handleApplyPreset = (preset) => {
    const updated = {
      ...activeSettings,
      ...preset.settings,
    };
    setGlobalSettings(updated);
    if (selectedItem) {
      setItems((prev) =>
        prev.map((it) => (it.id === selectedItem.id ? { ...it, customSettings: updated } : it))
      );
      processSingleItem(selectedItem, updated);
    }
  };

  const showNotification = (msg, isError = false) => {
    setSaveToast({ msg, isError });
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Descarregar o guardar una imatge processada a la carpeta escollida (sense afegir cap sufix al nom)
  const handleDownloadSingle = async (item, folderOverride = null) => {
    if (!item || !item.processedUrl) return;
    const targetFolder = folderOverride || destFolder;
    const ext =
      item.mimeType === 'image/png'
        ? 'png'
        : item.mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
    const cleanName = String(item.name || 'imatge').trim() || 'imatge';
    const fileName = `${cleanName}.${ext}`;

    if (targetFolder === 'materials' || targetFolder === 'productes') {
      try {
        const res = await fetch('/__minim_mon_save_image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetFolder,
            fileName,
            dataUrl: item.processedUrl,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            showNotification(`✓ Guardat directe a: ${data.savedPath}`);
            return;
          }
        }
      } catch (err) {
        console.warn('Servidor local de desat no disponible, usant selector de fitxer:', err);
      }

      // Fallback si no s'està executant sota el servidor Vite amb el middleware actiu
      if (typeof window.showSaveFilePicker === 'function' && item.processedBlob) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'Imatge',
                accept: { [item.mimeType || 'image/jpeg']: [`.${ext}`] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(item.processedBlob);
          await writable.close();
          showNotification(`✓ Fitxer ${fileName} desat correctament`);
          return;
        } catch (pickerErr) {
          if (pickerErr?.name === 'AbortError') return;
        }
      }
    }

    // Opció "Descàrregues" (o fallback estàndard del navegador)
    const a = document.createElement('a');
    a.href = item.processedUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification(`✓ Descarregat a Descàrregues: ${fileName}`);
  };

  // Descarregar o guardar tot el lot processat a la carpeta escollida
  const handleDownloadAll = async () => {
    const doneItems = items.filter((it) => it.processedUrl);
    if (doneItems.length === 0) return;

    if (destFolder === 'materials' || destFolder === 'productes') {
      let savedCount = 0;
      let lastDir = '';
      for (const item of doneItems) {
        await handleDownloadSingle(item, destFolder);
        savedCount++;
      }
      const folderPath =
        destFolder === 'materials'
          ? 'c:\\Antigravity\\MínimMón\\public\\imatges\\materials\\'
          : 'c:\\Antigravity\\MínimMón\\public\\imatges\\productes\\';
      showNotification(`✓ ${savedCount} imatges desades a ${folderPath}`);
      return;
    }

    doneItems.forEach((item, idx) => {
      setTimeout(() => {
        handleDownloadSingle(item, 'descarregues');
      }, idx * 220);
    });
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.originalUrl) URL.revokeObjectURL(target.originalUrl);
      const next = prev.filter((it) => it.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id || null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    items.forEach((it) => {
      if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
    });
    setItems([]);
    setSelectedId(null);
  };

  // Estadístiques d'estalvi de pes del lot
  const totalOriginalBytes = items.reduce((acc, it) => acc + (it.originalSize || 0), 0);
  const totalProcessedBytes = items.reduce((acc, it) => acc + (it.processedSize || 0), 0);
  const totalSavedPercent =
    totalOriginalBytes > 0 && totalProcessedBytes > 0
      ? Math.max(0, Math.round((1 - totalProcessedBytes / totalOriginalBytes) * 100))
      : 0;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* CAPÇALERA SUPERIOR */}
      <header
        className={`sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('privat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Tornar a l'Àrea Privada"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Àrea Privada</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold font-serif tracking-wide text-amber-500">
                  ESTUDI DE RETOC 1:1
                </span>
                <span
                  className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md font-bold border ${
                    isDark
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  1000×1000 px · #E8E6E7
                </span>
              </div>
              <span className={`text-[10px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Protocol Mínim Món: Enquadrament 1:1 centrat · Reducció a 1000×1000px · Millora de llum i contrast · Fons de mostra
              </span>
            </div>
          </div>
        </div>

        {/* Dreceres de navegació i Tema */}
        <div className="flex items-center gap-2">
          {setActiveTab && (
            <>
              <button
                onClick={() => setActiveTab('inici')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Web</span>
              </button>

              <button
                onClick={() => setActiveTab('posting')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/50'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Posting</span>
              </button>

              <button
                onClick={() => setActiveTab('producc')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 border-amber-800/60'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-amber-500" />
                <span>Producc</span>
              </button>
            </>
          )}

          <button
            onClick={handleToggleTheme}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* CONTINGUT PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* RESUM DEL PROTOCOL DE 4 PASSOS + BARRA D'ACCIONS ALINEADA */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {/* Fila 1: Els 4 passos del protocol a amplada completa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">Pas 1 · Format 1:1</div>
              <div className={`text-xs font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Peça Centrada</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Detecció automàtica de l'objecte</div>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">Pas 2 · Mida i Pes</div>
              <div className={`text-xs font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>1000 × 1000 px</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalOriginalBytes > 0 ? `Estalvi mitjà: -${totalSavedPercent}% de pes` : "Compressió d'alta nitidesa"}
              </div>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">Pas 3 · Acabat</div>
              <div className={`text-xs font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Llum i Contrast</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Realça la fusta de til·ler i el gravat</div>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">Pas 4 · Fons Net</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 inline-block shrink-0"
                  style={{ backgroundColor: activeSettings.transparentBg ? 'transparent' : activeSettings.bgColorHex }}
                />
                <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {activeSettings.transparentBg ? 'Transparent (PNG)' : `Mostra ${activeSettings.bgColorHex}`}
                </span>
              </div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Retall suau d'ombres i vores</div>
            </div>
          </div>

          {/* Fila 2: Barra d'accions i selector de carpeta de destinació amb alçada uniforme */}
          <div
            className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Afegir Imatges (1 o Lot)</span>
              </button>

              {items.length > 0 && (
                <div
                  className={`h-9 p-1 rounded-xl border flex items-center gap-1 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className={`px-2 text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span>Destí:</span>
                  </span>
                  {[
                    { id: 'descarregues', label: 'Descàrregues', tip: 'Carpeta de Descàrregues (proves / temporal)' },
                    { id: 'materials', label: 'Materials', tip: 'c:\\Antigravity\\MínimMón\\public\\imatges\\materials\\' },
                    { id: 'productes', label: 'Productes', tip: 'c:\\Antigravity\\MínimMón\\public\\imatges\\productes\\' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDestFolder(opt.id)}
                      title={opt.tip}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        destFolder === opt.id
                          ? 'bg-amber-600 text-white shadow-xs'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAll}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {destFolder === 'descarregues'
                      ? `Descarregar Totes (${items.filter((i) => i.processedUrl).length})`
                      : `Enviar Totes a ${destFolder === 'materials' ? 'Materials' : 'Productes'} (${items.filter((i) => i.processedUrl).length})`}
                  </span>
                </button>

                <button
                  onClick={handleClearAll}
                  className={`h-9 w-9 flex items-center justify-center rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-red-400'
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-red-600'
                  }`}
                  title="Buidar la llista d'imatges"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ZONA D'ARROSSEGAR SI NO HI HA IMATGES */}
        {items.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleAddFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-12 sm:p-20 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
              isDark
                ? 'bg-slate-900/40 border-slate-700 hover:border-amber-500/60 hover:bg-slate-900/70'
                : 'bg-white border-slate-300 hover:border-amber-500 hover:bg-amber-50/20 shadow-xs'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-lg">
              <h2 className={`text-lg sm:text-xl font-bold font-serif ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Arrossega aquí les teves fotografies o fes clic per seleccionar-les
              </h2>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Pots pujar una sola foto o un lot sencer. Cada peça es retallarà del fons automàticament, se centrarà en format quadrat <strong>1:1 a 1000×1000 píxels</strong> sobre el fons de mostra <code className="font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">#E8E6E7</code> i es millorarà de brillantor i contrast.
              </p>
            </div>
            <span className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-md">
              Seleccionar fotografies de l'ordinador
            </span>
          </div>
        ) : (
          /* PANELL DE TREBALL: ESQUERRA (MINIATURES DEL LOT + VISOR 1:1) | DRETA (CONTROLS DE RETOC) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA ESQUERRA (7/12): VISOR 1:1 I CARRUSEL DE LOT */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barra d'eines del visor */}
              <div
                className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCompareMode('result')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      compareMode === 'result'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Resultat 1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('split')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
                      compareMode === 'split'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    <span>Abans / Després</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('original')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      compareMode === 'original'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Original
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const next = pickMode === 'bg' ? null : 'bg';
                      setPickMode(next);
                      setIsSamplingBg(next === 'bg');
                      if (next) setCompareMode('split');
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                      pickMode === 'bg'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-amber-500'
                    }`}
                    title="Fes clic a qualsevol zona del fons a la foto original per eliminar-la"
                  >
                    <Pipette className="w-3 h-3" />
                    <span>{pickMode === 'bg' ? 'Clica fons...' : 'Esborrar fons (-)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = pickMode === 'fg' ? null : 'fg';
                      setPickMode(next);
                      setIsSamplingBg(false);
                      if (next) setCompareMode('split');
                    }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                      pickMode === 'fg'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold animate-pulse'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-emerald-500'
                    }`}
                    title="Fes clic sobre qualsevol part de la peça a la foto original per recuperar-la"
                  >
                    <Check className="w-3 h-3" />
                    <span>{pickMode === 'fg' ? 'Clica peça...' : 'Restaurar peça (+)'}</span>
                  </button>

                  {((activeSettings.manualBgPoints && activeSettings.manualBgPoints.length > 0) ||
                    (activeSettings.manualFgPoints && activeSettings.manualFgPoints.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const cleaned = {
                          ...activeSettings,
                          manualBgPoints: [],
                          manualFgPoints: [],
                          manualSamplePoint: null,
                        };
                        setGlobalSettings(cleaned);
                        if (selectedItem) {
                          setItems((prev) =>
                            prev.map((it) => (it.id === selectedItem.id ? { ...it, customSettings: cleaned } : it))
                          );
                          processSingleItem(selectedItem, cleaned);
                        }
                      }}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                          : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                      }`}
                      title="Esborrar els punts manuals clicats"
                    >
                      Netejar tocs
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCenterGrid(!showCenterGrid)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                      showCenterGrid
                        ? isDark
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-amber-100 border-amber-300 text-amber-900'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                    title="Mostrar guies de centratge 1:1"
                  >
                    Guies 1:1
                  </button>
                </div>
              </div>

              {/* Visor Principal */}
              {selectedItem && (
                <div
                  className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div
                    className={`grid gap-4 items-center ${
                      compareMode === 'split' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'
                    }`}
                  >
                    {/* Imatge Original */}
                    {(compareMode === 'split' || compareMode === 'original') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold uppercase tracking-wider text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Original ({selectedItem.originalW || '?'}×{selectedItem.originalH || '?'} px)
                          </span>
                          <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {formatFileSize(selectedItem.originalSize)}
                          </span>
                        </div>
                        <div
                          onClick={handleOriginalImageClick}
                          className={`relative aspect-square rounded-2xl overflow-hidden border flex items-center justify-center bg-slate-950/20 ${
                            isSamplingBg
                              ? 'cursor-crosshair ring-2 ring-amber-500 border-amber-500'
                              : isDark
                              ? 'border-slate-800'
                              : 'border-slate-300'
                          }`}
                        >
                          <img
                            src={selectedItem.originalUrl}
                            alt={selectedItem.name}
                            className="max-w-full max-h-full object-contain"
                          />
                          {pickMode && (
                            <div className="absolute inset-x-2 bottom-2 p-2 rounded-xl bg-black/80 text-amber-300 text-[11px] text-center font-semibold pointer-events-none">
                              {pickMode === 'fg'
                                ? 'Fes clic sobre la zona de la peça que vulguis conservar'
                                : 'Fes clic sobre un punt del fons que vulguis eliminar'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Imatge Processada 1:1 (1000x1000) */}
                    {(compareMode === 'split' || compareMode === 'result') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resultat 1:1 (1000×1000 px)
                          </span>
                          <span className="font-mono text-[11px] font-bold text-emerald-500">
                            {formatFileSize(selectedItem.processedSize)}
                            {selectedItem.originalSize > 0 && selectedItem.processedSize > 0 && (
                              <span className="ml-1 text-[10px] opacity-80">
                                ({Math.round((selectedItem.processedSize / selectedItem.originalSize) * 100)}% del pes original)
                              </span>
                            )}
                          </span>
                        </div>

                        <div
                          className={`relative aspect-square rounded-2xl overflow-hidden border flex items-center justify-center ${
                            isDark ? 'border-slate-700' : 'border-slate-300 shadow-inner'
                          }`}
                          style={{
                            backgroundColor: activeSettings.transparentBg ? undefined : activeSettings.bgColorHex,
                            backgroundImage: activeSettings.transparentBg
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                              : undefined,
                            backgroundSize: activeSettings.transparentBg ? '16px 16px' : undefined,
                            backgroundPosition: activeSettings.transparentBg ? '0 0, 0 8px, 8px -8px, -8px 0' : undefined,
                          }}
                        >
                          {selectedItem.status === 'processing' ? (
                            <div className="flex flex-col items-center gap-2 text-amber-500">
                              <RefreshCw className="w-7 h-7 animate-spin" />
                              <span className="text-xs font-bold">Processant 1000×1000 px...</span>
                            </div>
                          ) : selectedItem.processedUrl ? (
                            <img
                              src={selectedItem.processedUrl}
                              alt={`${selectedItem.name} processada`}
                              className="w-full h-full object-contain"
                            />
                          ) : null}

                          {/* Guies de centratge 1:1 */}
                          {showCenterGrid && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute inset-y-0 left-1/2 w-px bg-amber-500/35 border-r border-dashed border-amber-500/40" />
                              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-500/35 border-b border-dashed border-amber-500/40" />
                              <div
                                className="absolute border border-dashed border-amber-500/35 rounded-lg"
                                style={{
                                  inset: `${activeSettings.objectMarginPercent}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Peu de la targeta amb nom del fitxer i descàrrega directa */}
                  <div
                    className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nom fitxer:</span>
                      <input
                        type="text"
                        value={selectedItem.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((it) => (it.id === selectedItem.id ? { ...it, name: val } : it))
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold outline-none flex-1 max-w-xs ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                        }`}
                      />
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        .{selectedItem.mimeType === 'image/png' ? 'png' : 'jpg'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className={`h-9 p-1 rounded-xl border flex items-center gap-1 ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500 ml-1.5 shrink-0" />
                        {[
                          { id: 'descarregues', label: 'Descàrregues', tip: 'Carpeta de Descàrregues (temporal / prova)' },
                          { id: 'materials', label: 'Materials', tip: 'c:\\Antigravity\\MínimMón\\public\\imatges\\materials\\' },
                          { id: 'productes', label: 'Productes', tip: 'c:\\Antigravity\\MínimMón\\public\\imatges\\productes\\' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDestFolder(opt.id)}
                            title={opt.tip}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                              destFolder === opt.id
                                ? 'bg-amber-600 text-white shadow-xs'
                                : isDark
                                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(selectedItem)}
                        disabled={!selectedItem.processedUrl}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {destFolder === 'descarregues'
                            ? 'Descarregar'
                            : destFolder === 'materials'
                            ? 'Enviar a Materials'
                            : 'Enviar a Productes'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {saveToast && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                        saveToast.isError
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : isDark
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-mono break-all">{saveToast.msg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tira de miniatures del lot */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Lot d'Imatges ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-amber-500 hover:underline font-semibold cursor-pointer"
                  >
                    + Afegir més fotos
                  </button>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {items.map((item) => {
                    const isSel = selectedItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`relative group w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                          isSel
                            ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105'
                            : isDark
                            ? 'border-slate-800 opacity-75 hover:opacity-100'
                            : 'border-slate-200 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={item.processedUrl || item.originalUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {item.status === 'processing' && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Treure de la llista"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMNA DRETA (5/12): CONTROLS DEL PROTOCOL DE RETOC */}
            <div
              className={`lg:col-span-5 p-5 rounded-3xl border space-y-5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <h3 className={`text-sm font-bold font-serif ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Ajustos del Protocol de Retoc
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-700'
                  }`}
                  title="Restablir als valors estàndard de Mínim Món"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Valors per defecte</span>
                </button>
              </div>

              {/* MODES RÀPIDS D'UN SOL CLIC */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Modes Ràpids d'Acabat
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {RETOUCH_PRESETS.map((preset) => {
                    const isActive =
                      activeSettings.brightness === preset.settings.brightness &&
                      activeSettings.contrast === preset.settings.contrast &&
                      activeSettings.sharpness === preset.settings.sharpness &&
                      activeSettings.warmth === preset.settings.warmth;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        title={preset.desc}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {preset.label}
                        </div>
                        <div className={`text-[10px] mt-0.5 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {preset.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. COLOR DE FONS (MOSTRA #E8E6E7 PER DEFECTE) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    1. Fons i Substitució (Color de Mostra)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSettings.removeBackground}
                      onChange={(e) => handleUpdateSetting('removeBackground', e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Treure el fons original</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PRESET_BACKGROUNDS.map((preset) => {
                    const isSelected = preset.transparent
                      ? activeSettings.transparentBg
                      : !activeSettings.transparentBg &&
                        String(activeSettings.bgColorHex).toUpperCase() === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (preset.transparent) {
                            handleUpdateSetting('transparentBg', true);
                          } else {
                            const updated = {
                              ...activeSettings,
                              transparentBg: false,
                              bgColorHex: preset.hex,
                              outputFormat: 'image/jpeg',
                            };
                            setGlobalSettings(updated);
                            if (selectedItem) {
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === selectedItem.id ? { ...it, customSettings: updated } : it
                                )
                              );
                              processSingleItem(selectedItem, updated);
                            }
                          }
                        }}
                        className={`p-2 rounded-xl border text-left text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 font-bold ring-1 ring-amber-500/40'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg border border-slate-400 shrink-0"
                          style={{
                            backgroundColor: preset.transparent ? 'transparent' : preset.hex,
                            backgroundImage: preset.transparent
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%)'
                              : undefined,
                            backgroundSize: '8px 8px',
                          }}
                        />
                        <span className={`truncate text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeSettings.removeBackground && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                          Tolerància de retall del fons
                        </span>
                        <span className="font-mono font-bold text-amber-500">{activeSettings.bgTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="85"
                        value={activeSettings.bgTolerance}
                        onChange={(e) => handleUpdateSetting('bgTolerance', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                          Neteja d'ombres suaus de taula
                        </span>
                        <span className="font-mono font-bold text-amber-500">{activeSettings.shadowCleanup}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="75"
                        value={activeSettings.shadowCleanup}
                        onChange={(e) => handleUpdateSetting('shadowCleanup', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                          Suavitzat de vores de la peça
                        </span>
                        <span className="font-mono font-bold text-amber-500">{activeSettings.edgeFeather} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={activeSettings.edgeFeather}
                        onChange={(e) => handleUpdateSetting('edgeFeather', Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. FORMAT 1:1 I CENTRATGE DE LA PEÇA */}
              <div className="space-y-3 pt-3 border-t border-slate-500/20">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    2. Enquadrament 1:1 i Centratge (1000×1000 px)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSettings.autoCenterObject}
                      onChange={(e) => handleUpdateSetting('autoCenterObject', e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Auto-centrar peça</span>
                  </label>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                      Marge d'aire al voltant de la peça
                    </span>
                    <span className="font-mono font-bold text-amber-500">{activeSettings.objectMarginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="32"
                    value={activeSettings.objectMarginPercent}
                    onChange={(e) => handleUpdateSetting('objectMarginPercent', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Zoom</span>
                      <span className="font-mono">{Math.round((activeSettings.zoomOffset || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.5"
                      step="0.02"
                      value={activeSettings.zoomOffset || 1}
                      onChange={(e) => handleUpdateSetting('zoomOffset', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Posició X</span>
                      <span className="font-mono">{activeSettings.panX || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={activeSettings.panX || 0}
                      onChange={(e) => handleUpdateSetting('panX', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Posició Y</span>
                      <span className="font-mono">{activeSettings.panY || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={activeSettings.panY || 0}
                      onChange={(e) => handleUpdateSetting('panY', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. BRILLANTOR, CONTRAST I NITIDESA DE LA PEÇA */}
              <div className="space-y-3 pt-3 border-t border-slate-500/20">
                <label className={`text-xs font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  3. Contrast, Brillantor i Detall de la Peça
                </label>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Brillantor de la peça</span>
                    <span className="font-mono font-bold text-amber-500">
                      {activeSettings.brightness > 0 ? `+${activeSettings.brightness}` : activeSettings.brightness}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-35"
                    max="45"
                    value={activeSettings.brightness}
                    onChange={(e) => handleUpdateSetting('brightness', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Contrast de la peça</span>
                    <span className="font-mono font-bold text-amber-500">
                      {activeSettings.contrast > 0 ? `+${activeSettings.contrast}` : activeSettings.contrast}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={activeSettings.contrast}
                    onChange={(e) => handleUpdateSetting('contrast', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nitidesa del gravat</span>
                      <span className="font-mono font-bold text-amber-500">{activeSettings.sharpness}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={activeSettings.sharpness}
                      onChange={(e) => handleUpdateSetting('sharpness', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Calidesa fusta til·ler</span>
                      <span className="font-mono font-bold text-amber-500">
                        {activeSettings.warmth > 0 ? `+${activeSettings.warmth}` : activeSettings.warmth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="25"
                      value={activeSettings.warmth}
                      onChange={(e) => handleUpdateSetting('warmth', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 4. COMPRESSIÓ I APLICACIÓ A TOT EL LOT */}
              <div className="space-y-3 pt-3 border-t border-slate-500/20">
                <div className="flex justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    Qualitat de compressió (1000×1000 px)
                  </span>
                  <span className="font-mono font-bold text-amber-500">
                    {Math.round((activeSettings.outputQuality || 0.86) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="0.96"
                  step="0.02"
                  value={activeSettings.outputQuality || 0.86}
                  onChange={(e) => handleUpdateSetting('outputQuality', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={handleReprocessAll}
                    disabled={isProcessingAll}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                      isDark
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isProcessingAll ? 'animate-spin' : ''}`} />
                    <span>Aplicar aquests paràmetres a totes les {items.length} imatges del lot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

