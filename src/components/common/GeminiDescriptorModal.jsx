import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, X, Check, Copy, Settings, RefreshCw, AlertCircle, 
  Image as ImageIcon, Plus, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Wand2, ArrowDownToLine, ExternalLink
} from 'lucide-react';
import { 
  callGeminiDescriptor, 
  getGeminiApiKey, 
  setGeminiApiKey, 
  getCustomPrompt, 
  setCustomPrompt, 
  DEFAULT_PROMPTS 
} from '../../utils/geminiAiService';

export default function GeminiDescriptorModal({
  isOpen,
  onClose,
  mode = 'productes', // 'productes' | 'projectes'
  contextData = {},
  onApplyTitle,
  onApplySubtitle,
  onApplyDescription,
  onApplySection, // (sectionKey, text) => void per a projectes ('encarrec', 'art', 'resolucio')
  isDark = true
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Configuració
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Imatges i Notes
  const [selectedImages, setSelectedImages] = useState([]);
  const [customUploads, setCustomUploads] = useState([]);
  const [userNotes, setUserNotes] = useState('');
  const fileInputRef = useRef(null);

  // Resultats generats
  const [results, setResults] = useState(null);

  // Estats editables de les propostes (per permetre retocar abans d'aplicar)
  const [editableResults, setEditableResults] = useState(null);

  // Inicialització al obrir
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setToastMsg(null);
      setApiKeyInput(getGeminiApiKey());
      setPromptInput(getCustomPrompt(mode));
      setUserNotes('');
      
      // Carregar imatges del context
      const initialImgs = [];
      if (contextData?.images && Array.isArray(contextData.images)) {
        contextData.images.forEach(img => {
          if (img) initialImgs.push(typeof img === 'string' ? img : (img.url || img.imatge || img.src));
        });
      } else {
        if (contextData?.imatgePrincipal) initialImgs.push(contextData.imatgePrincipal);
        if (Array.isArray(contextData?.imatges)) {
          contextData.imatges.forEach(img => {
            if (img) initialImgs.push(typeof img === 'string' ? img : (img.url || img.imatge || img.src));
          });
        }
      }
      const unique = Array.from(new Set(initialImgs)).filter(Boolean);
      setSelectedImages(unique);
      setCustomUploads([]);
    }
  }, [isOpen, mode, contextData]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`✓ Copiat: ${label}`);
  };

  const handleSaveConfig = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setCustomPrompt(mode, promptInput.trim());
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2500);
  };

  const handleResetPrompt = () => {
    const def = DEFAULT_PROMPTS[mode] || '';
    setPromptInput(def);
    setCustomPrompt(mode, def);
    showToast("✓ Prompt restablert al model per defecte");
  };

  const handleToggleImage = (imgUrl) => {
    if (selectedImages.includes(imgUrl)) {
      setSelectedImages(prev => prev.filter(i => i !== imgUrl));
    } else {
      setSelectedImages(prev => [...prev, imgUrl]);
    }
  };

  const handleCustomFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setCustomUploads(prev => [...prev, dataUrl]);
        setSelectedImages(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const allImgs = [...selectedImages];
      const res = await callGeminiDescriptor({
        type: mode,
        contextInfo: contextData,
        notes: userNotes,
        images: allImgs,
        apiKeyOverride: apiKeyInput.trim() || null,
        customSystemPrompt: promptInput.trim() || null
      });

      if (!res.data) {
        throw new Error("No s'ha pogut interpretar el format JSON retornat per Gemini.");
      }

      setResults(res.data);
      // Clonar a editableResults per permetre retocs
      setEditableResults(JSON.parse(JSON.stringify(res.data)));
      showToast("✨ Propostes generades correctament!");
    } catch (err) {
      console.error("Error cridant Gemini Descriptor:", err);
      setError(err.message || "S'ha produït un error al connectar amb Gemini.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>

        {/* 1. Capçalera */}
        <div className={`p-4 sm:px-6 sm:py-4 border-b flex items-center justify-between gap-3 ${
          isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-serif tracking-tight">
                  Descriptor IA
                </h2>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                  mode === 'projectes' 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                }`}>
                  {mode === 'projectes' ? 'Projectes de Taller' : 'Productes de Catàleg'}
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Inspirat en els teus Gems de Gemini per captar l'ànima artesanal de Mínim Món
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showConfig 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : (isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700')
              }`}
              title="Ajustos de la Clau d'API i Prompts"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustos</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificació Toast Flotant */}
        {toastMsg && (
          <div className="absolute top-16 right-6 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg animate-fadeIn flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* 2. Panell Desplegable de Configuració */}
        {showConfig && (
          <div className={`p-4 border-b space-y-3 animate-fadeIn text-xs ${
            isDark ? 'bg-slate-950/80 border-slate-700' : 'bg-amber-50/50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-amber-500">
                <Settings className="w-3.5 h-3.5" /> Configuració de l'Assistent (Google Gemini)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Restablir Prompt de Fàbrica
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Desar Ajustos</span>
                </button>
              </div>
            </div>

            {keySavedToast && (
              <p className="text-emerald-400 font-bold text-[11px]">✓ Configuració desada correctament al teu navegador!</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Clau d'API de Google AI Studio (Gemini):</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... o AQ..."
                  className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Model en ús: <code className="text-amber-400 font-bold">gemini-3.8-flash</code> (gratuït i multimodal).
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Directrius del Gem ({mode === 'projectes' ? 'Descriptor PROJECTES' : 'Descriptor PRODUCTES'}):</label>
                <textarea
                  rows={3}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border font-sans text-[11px] leading-relaxed outline-none resize-y ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Cos Principal amb Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Secció A: Imatges a Analitzar & Notes */}
          <div className={`p-4 rounded-xl border space-y-4 ${
            isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-500">
                  <ImageIcon className="w-4 h-4" /> 1. Imatges de la Peça / Projecte per a la IA
                </label>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedImages.length} imatges seleccionades per analitzar
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {/* Llistat d'imatges amb checkbox */}
                {selectedImages.concat(contextData?.images || []).filter((v, i, a) => a.indexOf(v) === i).map((imgUrl, idx) => {
                  const isChecked = selectedImages.includes(imgUrl);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleToggleImage(imgUrl)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 group ${
                        isChecked 
                          ? 'border-amber-500 ring-2 ring-amber-500/30' 
                          : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={imgUrl} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                      <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        isChecked ? 'bg-amber-500 text-white' : 'bg-black/60 text-white'
                      }`}>
                        {isChecked ? <Check className="w-3 h-3" /> : null}
                      </div>
                    </div>
                  );
                })}

                {/* Botó pujar nova imatge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 shrink-0 transition-all cursor-pointer ${
                    isDark ? 'border-slate-700 hover:border-amber-500/50 bg-slate-900/50 text-slate-400' : 'border-slate-300 hover:border-amber-500 bg-white text-slate-500'
                  }`}
                  title="Pujar una altra foto des de l'ordinador"
                >
                  <Plus className="w-5 h-5 text-amber-500" />
                  <span className="text-[10px] font-bold">Afegir foto</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleCustomFileUpload} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Camp de Notes del Moment */}
            <div>
              <label className="text-xs font-bold block mb-1.5 flex items-center justify-between">
                <span>2. Notes o apunts del moment (Comanda del client, fusta, particularitats):</span>
                <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Opcional, ajuda a personalitzar el text
                </span>
              </label>
              <textarea
                rows={2}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder={
                  mode === 'projectes'
                    ? "ex: El client volia un taulell corbat en fusta de freixe massís per aprofitar un racó de lectura..."
                    : "ex: Capsa guardadents per a nens, estil nòrdic en faig massís amb la silueta del ratolinet gravada..."
                }
                className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed outline-none transition-all ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' 
                    : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500 shadow-xs'
                }`}
              />
            </div>

            {/* Botó Principal Generar */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400">
                {contextData?.nom || contextData?.titol ? (
                  <span>Fitxa actual: <strong>{contextData.nom || contextData.titol}</strong></span>
                ) : (
                  <span>Nova fitxa sense títol assignat</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  loading 
                    ? 'bg-amber-700/50 text-amber-200 cursor-wait' 
                    : 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>L'artesà IA està redactant...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{results ? 'Regenerar Propostes ✨' : 'Generar Propostes amb IA ✨'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Missatge d'error si escau */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Error en generar la proposta:</strong>
                <p className="mt-0.5">{error}</p>
                <p className="text-[10px] mt-1 text-red-300/80">Comprova a "Ajustos" que la clau d'API sigui correcta.</p>
              </div>
            </div>
          )}

          {/* Secció B: Presentació de Propostes (Resultats) */}
          {editableResults && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* === MODE PRODUCTES: NOMS I DESCRIPCIONS === */}
              {mode === 'productes' && (
                <>
                  {/* 1. Propostes de Nom (1 Paraula) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Propostes de Nom (1 Paraula)
                      </h3>
                      <span className="text-[10px] text-slate-400">Escull el que més t'agradi</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(editableResults.noms || []).map((item, idx) => (
                        <div 
                          key={idx}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                            isDark ? 'bg-slate-800/60 border-slate-700 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-400 shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base font-bold font-serif text-amber-500">
                                {item.nom}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.nom, item.nom)}
                                className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                title="Copiar nom"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {item.motiu}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onApplyTitle) onApplyTitle(item.nom);
                              showToast(`✓ Nom aplicat: ${item.nom}`);
                            }}
                            className="w-full py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>Aplicar a Nom</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Propostes de Descripció */}
                  <div className="space-y-3 pt-2 border-t border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Propostes de Descripció per a la Botiga Web
                      </h3>
                      <span className="text-[10px] text-slate-400">Pots retocar el text directament abans d'aplicar</span>
                    </div>

                    <div className="space-y-3">
                      {(editableResults.descripcions || []).map((desc, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 rounded-xl border space-y-2.5 ${
                            isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              Format: {desc.estil}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopy(desc.text, `Descripció (${desc.estil})`)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onApplyDescription) onApplyDescription(desc.text);
                                  showToast(`✓ Descripció (${desc.estil}) aplicada a la fitxa!`);
                                }}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <ArrowDownToLine className="w-3 h-3" />
                                <span>Aplicar a Descripció</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={4}
                            value={desc.text}
                            onChange={(e) => {
                              const updated = [...editableResults.descripcions];
                              updated[idx].text = e.target.value;
                              setEditableResults({ ...editableResults, descripcions: updated });
                            }}
                            className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-y ${
                              isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === MODE PROJECTES: TÍTOL, SUBTÍTOL I LES 3 SECCIONS === */}
              {mode === 'projectes' && (
                <>
                  {/* 1. Títol i Subtítol */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Títol */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                          Títol Proposat
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(editableResults.titol, "Títol")}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title="Copiar títol"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplyTitle) onApplyTitle(editableResults.titol);
                              showToast(`✓ Títol aplicat: ${editableResults.titol}`);
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Aplicar Títol
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={editableResults.titol || ''}
                        onChange={(e) => setEditableResults({ ...editableResults, titol: e.target.value })}
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm font-bold font-serif outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Subtítol */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                          Subtítol Proposat
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(editableResults.subtitol, "Subtítol")}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title="Copiar subtítol"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplySubtitle) onApplySubtitle(editableResults.subtitol);
                              showToast(`✓ Subtítol aplicat`);
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Aplicar Subtítol
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={editableResults.subtitol || ''}
                        onChange={(e) => setEditableResults({ ...editableResults, subtitol: e.target.value })}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 2. Les Tres Seccions de Descripció */}
                  <div className="space-y-3 pt-2 border-t border-slate-700/60">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                        Redacció de les Tres Seccions del Projecte
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => {
                          // Aplicar les tres seccions indiviualment si onApplySection està definit
                          if (onApplySection) {
                            onApplySection('encarrec', editableResults.encarrec || '');
                            onApplySection('art', editableResults.traduccioArtistica || '');
                            onApplySection('resolucio', editableResults.resolucio || '');
                          }
                          // També generar descripció combinada si cal
                          const combinada = `L'encàrrec:\n${editableResults.encarrec || ''}\n\nLa traducció artística:\n${editableResults.traduccioArtistica || ''}\n\nLa resolució:\n${editableResults.resolucio || ''}`;
                          if (onApplyDescription) {
                            onApplyDescription(combinada);
                          }
                          showToast("✓ Totes 3 seccions aplicades a la fitxa!");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Aplicar les 3 Seccions a la Fitxa</span>
                      </button>
                    </div>

                    {/* Secció 1: L'encàrrec */}
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          1. L'encàrrec (Demanda del client)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(editableResults.encarrec, "L'encàrrec")}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplySection) onApplySection('encarrec', editableResults.encarrec);
                              showToast("✓ Secció L'encàrrec aplicada!");
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Aplicar Secció
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={editableResults.encarrec || ''}
                        onChange={(e) => setEditableResults({ ...editableResults, encarrec: e.target.value })}
                        className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    {/* Secció 2: La traducció artística */}
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          2. La traducció artística (Procés i disseny)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(editableResults.traduccioArtistica, "La traducció artística")}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplySection) onApplySection('art', editableResults.traduccioArtistica);
                              showToast("✓ Secció Traducció artística aplicada!");
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Aplicar Secció
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={editableResults.traduccioArtistica || ''}
                        onChange={(e) => setEditableResults({ ...editableResults, traduccioArtistica: e.target.value })}
                        className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    {/* Secció 3: La resolució */}
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          3. La resolució (Resultat final)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(editableResults.resolucio, "La resolució")}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onApplySection) onApplySection('resolucio', editableResults.resolucio);
                              showToast("✓ Secció Resolució aplicada!");
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Aplicar Secció
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={editableResults.resolucio || ''}
                        onChange={(e) => setEditableResults({ ...editableResults, resolucio: e.target.value })}
                        className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Peu de la finestra */}
        <div className={`p-3 sm:px-6 border-t flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span>
            {mode === 'projectes' ? 'Gem: Descriptor de PROJECTES' : 'Gem: Descriptor de PRODUCTES'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            Tancar
          </button>
        </div>

      </div>
    </div>
  );
}
