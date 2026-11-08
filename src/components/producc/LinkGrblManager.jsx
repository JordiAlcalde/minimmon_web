import React, { useState, useMemo, useRef } from 'react';
import { 
  Link, FileCode, Upload, Trash2, ArrowUp, ArrowDown, Download, 
  Copy, Check, Eye, AlertCircle, ShieldCheck, Sparkles, FolderDown,
  RefreshCw, Play, Settings, Layers, FileText, CheckCircle2, X
} from 'lucide-react';

export default function LinkGrblManager({ isDark = false }) {
  const [files, setFiles] = useState([]); // [{ id, name, size, content, lineCount }]
  const [outputName, setOutputName] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewingFile, setPreviewingFile] = useState(null); // File object for modal preview
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Opcions de vinculació LaserGRBL
  const [options, setOptions] = useState({
    laserOffBetween: true,       // Inserir M5 S0 en acabar cada fitxer
    removeIntermediateM2: true,  // Netejar M2 i M30 dels fitxers intermedis
    returnToOriginBetween: true, // G0 X0 Y0 entre fitxers
    dwellSeconds: 1,             // G4 P1 (1 segon de pausa entre fitxers per seguretat)
    addHeaderComments: true,     // Afegir comentaris informatius ; --- Fitxer ---
    finalProgramEnd: true        // Afegir M5 S0 i M2 al final del tot
  });

  // Lectura de fitxers .nc / .gcode / .txt
  const handleProcessFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    
    const newFiles = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const text = await f.text();
        const lines = text.split(/\r?\n/);
        newFiles.push({
          id: `nc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: f.name,
          size: f.size,
          sizeFormatted: (f.size / 1024).toFixed(1) + ' KB',
          content: text,
          lineCount: lines.length,
          previewLines: lines.slice(0, 8).join('\n')
        });
      } catch (err) {
        console.error("Error llegint fitxer .nc:", f.name, err);
      }
    }

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      if (!outputName && combined.length > 0) {
        const base = combined[0].name.replace(/\.[^/.]+$/, "");
        setOutputName(`${base}_enllacat.nc`);
      }
      return combined;
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleProcessFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  // Reordenar fitxers
  const handleMoveUp = (index) => {
    if (index === 0) return;
    setFiles(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRemoveFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    if (files.length === 0) return;
    if (window.confirm("Vols buidar tota la llista de fitxers?")) {
      setFiles([]);
      setOutputName('');
    }
  };

  const handleReverseOrder = () => {
    setFiles(prev => [...prev].reverse());
  };

  // Motor de concatenació G-code / LaserGRBL
  const mergedResult = useMemo(() => {
    if (files.length === 0) return '';

    const lines = [];
    const dateStr = new Date().toLocaleString('ca-ES');

    if (options.addHeaderComments) {
      lines.push('; ========================================================');
      lines.push('; MÍNIM MÓN · LINK GRBL');
      lines.push('; Enllaçador continu de programes LaserGRBL');
      lines.push(`; Data de fusió: ${dateStr}`);
      lines.push('; Material de referència: Fusta de til·ler d\'alta precisió');
      lines.push(`; Nombre total de fitxers: ${files.length}`);
      files.forEach((f, idx) => {
        lines.push(`;   ${idx + 1}. ${f.name} (${f.lineCount} línies)`);
      });
      lines.push('; ========================================================');
      lines.push('');
    }

    files.forEach((f, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === files.length - 1;

      if (options.addHeaderComments) {
        lines.push('');
        lines.push(`; >>> INICI PROGRAMA ${idx + 1}/${files.length}: ${f.name} <<<`);
      }

      // Desglossar línies del fitxer
      const rawLines = f.content.split(/\r?\n/);
      const cleanedLines = [];

      for (let j = 0; j < rawLines.length; j++) {
        const line = rawLines[j];
        const trimmed = line.trim().toUpperCase();

        // Si és un fitxer intermedi i s'ha activat treure M2 / M30 (fi de programa)
        if (!isLast && options.removeIntermediateM2) {
          if (trimmed === 'M2' || trimmed === 'M02' || trimmed === 'M30') {
            cleanedLines.push(`; [Link GRBL: s'ha omès ${trimmed} per permetre el salt continu al següent fitxer]`);
            continue;
          }
        }
        cleanedLines.push(line);
      }

      lines.push(...cleanedLines);

      // Transició cap al següent fitxer
      if (!isLast) {
        lines.push('');
        lines.push(`; --- TRANSICIÓ SEGURA ENTRE FITXERS (${f.name} -> ${files[idx + 1]?.name || 'Següent'}) ---`);
        
        if (options.laserOffBetween) {
          lines.push('M5 S0 ; Apagar làser immediatament');
        }

        if (options.dwellSeconds > 0) {
          lines.push(`G4 P${options.dwellSeconds} ; Pausa de seguretat de ${options.dwellSeconds}s`);
        }

        if (options.returnToOriginBetween) {
          lines.push('G0 X0 Y0 ; Retorn ràpid a origen de coordenades');
        }

        lines.push('; -------------------------------------------------------------');
        lines.push('');
      }
    });

    // Tancament final
    if (options.finalProgramEnd) {
      lines.push('');
      lines.push('; ========================================================');
      lines.push('; FI DEL PROGRAMA GLOBAL ENLLAÇAT');
      lines.push('M5 S0 ; Apagar làser definitivament');
      if (options.returnToOriginBetween) {
        lines.push('G0 X0 Y0 ; Retorn a origen');
      }
      lines.push('M2 ; Fi del programa GRBL');
      lines.push('; ========================================================');
    }

    return lines.join('\n');
  }, [files, options]);

  const mergedStats = useMemo(() => {
    if (!mergedResult) return { lines: 0, bytes: 0, sizeKb: '0 KB' };
    const lineCount = mergedResult.split('\n').length;
    const bytes = new Blob([mergedResult]).size;
    return {
      lines: lineCount,
      bytes: bytes,
      sizeKb: (bytes / 1024).toFixed(1) + ' KB'
    };
  }, [mergedResult]);

  // DESAR A QUALSEVOL CARPETA DEL PC MITJANÇANT L'API NATIVA DE FITXERS
  const handleSaveToPcFolder = async () => {
    if (!mergedResult) {
      alert("No hi ha cap contingut per desar. Afegeix primer els fitxers .nc.");
      return;
    }

    const filename = outputName.trim() || `link_grbl_${Date.now()}.nc`;

    // 1. Provar File System Access API nativa del navegador (ShowSaveFilePicker)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Fitxer LaserGRBL (*.nc)',
              accept: { 'text/plain': ['.nc', '.gcode', '.txt', '.tap'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(mergedResult);
        await writable.close();
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          // L'usuari ha cancel·lat el diàleg, no fem res
          return;
        }
        console.warn("showSaveFilePicker ha fallat, recorrent a descàrrega directa:", err);
      }
    }

    // 2. Fallback estàndard: Descàrrega directa via Blob
    fallbackDownload(filename);
  };

  const fallbackDownload = (filename) => {
    const blob = new Blob([mergedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || outputName.trim() || `link_grbl_${Date.now()}.nc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleCopyCode = () => {
    if (!mergedResult) return;
    navigator.clipboard.writeText(mergedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CAPÇALERA DE LA UTILITAT */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Link className="w-3.5 h-3.5" />
                <span>LaserGRBL Tool</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                Format .nc / G-code
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                Tall i Gravat en fusta de til·ler
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Link GRBL</span>
              <span className="text-sm font-sans font-normal text-slate-500 dark:text-slate-400">· Enllaçador continu de fitxers .nc</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Selecciona diversos fitxers <code className="font-mono font-bold text-amber-700 dark:text-amber-400">.nc</code> o <code className="font-mono font-bold text-amber-700 dark:text-amber-400">.gcode</code>, ordena'ls en la seqüència desitjada i fusiona'ls en un únic programa continu per a la màquina làser. Pots desar el fitxer directament a <strong>qualsevol carpeta del teu PC</strong> mitjançant el selector natiu.
            </p>
          </div>

          {files.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Buidar tota la llista de fitxers"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Buidar llista</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ZONA DE CÀRREGA DRAG & DROP */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
            : isDark
              ? 'border-slate-700 bg-slate-900/40 hover:border-amber-500 hover:bg-slate-900/70'
              : 'border-slate-300 bg-amber-50/30 hover:border-amber-600 hover:bg-amber-50/70'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          accept=".nc,.gcode,.txt,.tap,*"
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
          <Upload className="w-7 h-7" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Arrossega i deixa anar aquí els fitxers <span className="font-mono text-amber-700 dark:text-amber-400">.nc</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            o fes clic per explorar el teu ordinador (admet selecció múltiple de fitxers)
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">*.nc</span>
          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">*.gcode</span>
          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">*.txt</span>
        </div>
      </div>

      {/* CONTINGUT PRINCIPAL QUAN HI HA FITXERS */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA ESQUERRA: LLISTA ORDENADA DE FITXERS (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className={`p-5 rounded-2xl border shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-slate-100">
                    Seqüència d'execució ({files.length} {files.length === 1 ? 'fitxer' : 'fitxers'})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReverseOrder}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Invertir l'ordre de tota la llista"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Invertir ordre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    + Afegir més
                  </button>
                </div>
              </div>

              {/* Llista interactiva de peces */}
              <div className="space-y-2.5">
                {files.map((file, idx) => (
                  <div
                    key={file.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50/80 border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                    }`}
                  >
                    {/* Index + Nom + Stats */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-amber-600/15 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/20">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 truncate notranslate" translate="no">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{file.lineCount} línies</span>
                          <span>•</span>
                          <span>{file.sizeFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botons d'acció de la línia */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewingFile(file)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Previsualitzar codi d'aquest fitxer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          idx === 0
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                        }`}
                        title="Moure amunt"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === files.length - 1}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          idx === files.length - 1
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                        }`}
                        title="Moure avall"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-1"
                        title="Eliminar aquest fitxer de la llista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OPCIONS DE FUSIÓ I SEGURETAT LASERGRBL */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Settings className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-slate-100">
                  Paràmetres de seguretat entre etapes
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.laserOffBetween}
                    onChange={(e) => setOptions({ ...options, laserOffBetween: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Apagar làser entre fitxers (<code className="font-mono text-amber-600">M5 S0</code>)
                    </span>
                    <span className="text-slate-500">
                      Garanteix que el feix làser s'apaga totalment abans de qualsevol desplaçament cap al següent treball.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.removeIntermediateM2}
                    onChange={(e) => setOptions({ ...options, removeIntermediateM2: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Ometre fi de programa (<code className="font-mono text-amber-600">M2 / M30</code>) als fitxers intermedis
                    </span>
                    <span className="text-slate-500">
                      Imprescindible: evita que LaserGRBL aturi l'execució en acabar la primera peça, permetent continuar fluidament.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.returnToOriginBetween}
                    onChange={(e) => setOptions({ ...options, returnToOriginBetween: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Retornar a origen (<code className="font-mono text-amber-600">G0 X0 Y0</code>) entre etapes
                    </span>
                    <span className="text-slate-500">
                      Retorna el capçal al punt zero del tauler abans d'iniciar el següent fitxer.
                    </span>
                  </div>
                </label>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Temps de pausa entre fitxers (<code className="font-mono text-amber-600">G4 P...</code>)
                    </span>
                    <span className="text-slate-500">
                      Temps de refredament o verificació visual entre tasques.
                    </span>
                  </div>
                  <select
                    value={options.dwellSeconds}
                    onChange={(e) => setOptions({ ...options, dwellSeconds: Number(e.target.value) })}
                    className="p-1.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                  >
                    <option value={0}>Sense pausa (0s)</option>
                    <option value={1}>1 segon (G4 P1)</option>
                    <option value={2}>2 segons (G4 P2)</option>
                    <option value={5}>5 segons (G4 P5)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DRETA: RESULTAT, NOM I ENVIAMENT A CARPETA (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className={`p-6 rounded-2xl border shadow-lg space-y-5 ${
              isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-amber-300 shadow-amber-500/5'
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Fitxer Unificat Preparat
                  </span>
                </div>
                <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-slate-100">
                  Desar a qualsevol carpeta del PC
                </h3>
              </div>

              {/* Mètriques del fitxer resultant */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Línies totals de codi:</span>
                  <strong className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
                    {mergedStats.lines.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Mida estimada:</span>
                  <strong className="text-base font-mono font-bold text-amber-700 dark:text-amber-400">
                    {mergedStats.sizeKb}
                  </strong>
                </div>
              </div>

              {/* Nom del fitxer de sortida */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Nom del fitxer resultant (.nc):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="programa_enllacat.nc"
                    className="w-full p-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                  {!outputName.toLowerCase().endsWith('.nc') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                      .nc
                    </span>
                  )}
                </div>
              </div>

              {/* BOTÓ PRINCIPAL: ENVIAR / DESAR A CARPETA DEL PC */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveToPcFolder}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderDown className="w-5 h-5" />
                  <span>Enviar / Desar a carpeta del PC</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fallbackDownload()}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Descarregar directament"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descàrrega directa</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar codi G-code al porta-retalls"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiat!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Feedback de desat amb èxit */}
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Fitxer unificat enviat i desat correctament!</span>
                </div>
              )}

              {/* Previsualització ràpida del codi fusionat */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Mostra de les primeres línies:
                </span>
                <div className="p-2.5 rounded-lg bg-slate-950 text-amber-200/90 font-mono text-[10px] max-h-36 overflow-y-auto whitespace-pre leading-relaxed select-all">
                  {mergedResult.split('\n').slice(0, 15).join('\n')}
                  {mergedStats.lines > 15 && '\n...'}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* MODAL DE PREVISUALITZACIÓ D'UN FITXER INDIVIDUAL */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-600" />
                <h4 className="font-mono text-sm font-bold truncate notranslate" translate="no">
                  {previewingFile.name}
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  ({previewingFile.lineCount} línies · {previewingFile.sizeFormatted})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingFile(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-400/90 whitespace-pre leading-relaxed select-all">
              {previewingFile.content}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingFile(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 cursor-pointer"
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

