import React, { useState, useRef } from 'react';
import { 
  Zap, Sliders, Scissors, Info, Sparkles, CheckSquare, Square, 
  RotateCcw, Lock, ArrowRight, Eye, Layers, Gauge, Folder, FolderOpen, FileText, X
} from 'lucide-react';
import { normalizeLaserConfig, DEFAULT_LASER_CONFIG } from '../../utils/laserUtils';

/**
 * Component de Slider amb Textbox al extrem dret sincronitzat bidireccionalment
 */
function LaserSliderField({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  unit = '', 
  isDark, 
  readOnly = false,
  badge = 'V'
}) {
  const currentVal = value !== undefined && value !== null && !isNaN(Number(value)) ? Number(value) : min;

  const handleSliderChange = (e) => {
    if (readOnly) return;
    onChange(Number(e.target.value));
  };

  const handleTextChange = (e) => {
    if (readOnly) return;
    const v = e.target.value;
    if (v === '') {
      onChange(min);
      return;
    }
    const num = Number(v);
    if (!isNaN(num)) {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  return (
    <div className={`p-2.5 rounded-xl border transition-all ${
      isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50/80 border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-bold ${
            badge === 'V' 
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
          }`}>
            {badge}
          </span>
          <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{label}</span>
        </span>
        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          rang [{min} .. {max}{unit ? ` ${unit}` : ''}]
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentVal}
            disabled={readOnly}
            onChange={handleSliderChange}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${
              isDark 
                ? 'bg-slate-800 accent-amber-500 hover:accent-amber-400' 
                : 'bg-slate-200 accent-amber-600 hover:accent-amber-500'
            } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
          />
        </div>

        {/* Textbox al extrem dret */}
        <div className="shrink-0 flex items-center gap-1">
          <input
            type="number"
            step="any"
            value={currentVal}
            disabled={readOnly}
            onChange={handleTextChange}
            className={`w-18 px-2 py-1 text-center font-mono text-xs font-bold rounded-lg border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-amber-400 focus:border-amber-500' 
                : 'bg-white border-slate-300 text-amber-700 focus:border-amber-500 shadow-xs'
            } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
          />
          {unit && (
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Camp de paràmetre Fix (F) - Només informatiu
 */
function LaserFixedBadge({ label, value, isDark }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
      isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-100/70 border-slate-200 text-slate-700'
    }`}>
      <span className="flex items-center gap-1.5 font-medium">
        <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
          F
        </span>
        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      </span>
      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
        {value}
      </span>
    </div>
  );
}

/**
 * Editor Complete de Paràmetres Làser (Gravar + Tallar)
 */
export default function LaserParametersEditor({ 
  value, 
  onChange, 
  isDark = true, 
  readOnly = false,
  compact = false,
  showDimensions = false
}) {
  const [activeSubTab, setActiveSubTab] = useState('gravar'); // 'gravar' | 'tallar' | 'tots'
  const config = normalizeLaserConfig(value);

  const updateGravar = (field, val) => {
    if (readOnly) return;
    const nextGravar = { ...config.gravar, [field]: val };
    onChange({
      ...config,
      gravar: nextGravar
    });
  };

  const updateTallar = (field, val) => {
    if (readOnly) return;
    const nextTallar = { ...config.tallar, [field]: val };
    onChange({
      ...config,
      tallar: nextTallar
    });
  };

  const gravarFileInputRef = useRef(null);
  const tallarFileInputRef = useRef(null);

  const handleGravarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      updateGravar('fitxer', file.name);
    }
    e.target.value = '';
  };

  const handleTallarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      updateTallar('fitxer', file.name);
    }
    e.target.value = '';
  };

  const handleResetDefaults = () => {
    if (readOnly) return;
    if (window.confirm("Vols restablir els paràmetres làser als valors predeterminats de LaserGRBL?")) {
      onChange(JSON.parse(JSON.stringify(DEFAULT_LASER_CONFIG)));
    }
  };

  // Sincronitzar Potència % i PWM a Gravar
  const handleGravarPowerPercent = (percent) => {
    const p = Math.min(100, Math.max(0, percent));
    const pwm = Math.round((p / 100) * 10000);
    onChange({
      ...config,
      gravar: {
        ...config.gravar,
        sMaxPercent: p,
        sMaxPwm: pwm
      }
    });
  };

  // Sincronitzar Potència % i PWM a Tallar
  const handleTallarPowerPercent = (percent) => {
    const p = Math.min(100, Math.max(0, percent));
    const pwm = Math.round((p / 100) * 10000);
    onChange({
      ...config,
      tallar: {
        ...config.tallar,
        sMaxPercent: p,
        sMaxPwm: pwm
      }
    });
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Capçalera de l'Editor amb pestanyes Gravar / Tallar / Ambdós */}
      <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-2 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className={`text-xs font-bold font-serif ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Paràmetres Màquina Làser
            </span>
            <span className={`text-[10px] font-mono ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              (LaserGRBL • F = Fix, V = Variable)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de mode Gravar / Tallar */}
          <div className={`flex rounded-xl p-0.5 border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'
          }`}>
            <button
              type="button"
              onClick={() => setActiveSubTab('gravar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'gravar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Sparkles className="w-3 h-3" />
              GRAVAR
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('tallar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'tallar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Scissors className="w-3 h-3" />
              TALLAR
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('tots')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeSubTab === 'tots'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              TOTS DOS
            </button>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Restablir valors per defecte de LaserGRBL"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark 
                  ? 'border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800' 
                  : 'border-slate-300 text-slate-600 hover:text-amber-800 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* ======================================================== */}
        {/* SECCIÓ GRAVAR (Imatges 1 i 2)                            */}
        {/* ======================================================== */}
        {(activeSubTab === 'gravar' || activeSubTab === 'tots') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1.5 border-amber-500/20">
              <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                1. Paràmetres per a GRAVAR (LaserGRBL)
              </span>
            </div>

            {/* Part 1: Preprocessat de la Imatge (Sliders) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Preprocessat d'Imatge & Valors Tonals
                </span>
              </div>

              {/* Paràmetre Fix: Redimensionar */}
              <LaserFixedBadge 
                label="Redimensionar" 
                value={config.gravar.redimensionar} 
                isDark={isDark} 
              />

              {/* Slider Brillo (40 .. 160) */}
              <LaserSliderField
                label="Brillantor (Brillo)"
                value={config.gravar.brillo}
                onChange={(val) => updateGravar('brillo', val)}
                min={40}
                max={160}
                step={1}
                isDark={isDark}
                readOnly={readOnly}
                badge="V"
              />

              {/* Slider Contraste (40 .. 160) */}
              <LaserSliderField
                label="Contrast (Contraste)"
                value={config.gravar.contraste}
                onChange={(val) => updateGravar('contraste', val)}
                min={40}
                max={160}
                step={1}
                isDark={isDark}
                readOnly={readOnly}
                badge="V"
              />

              {/* Slider Blancos (0 .. 100) */}
              <LaserSliderField
                label="Blancs (Blancos)"
                value={config.gravar.blancos}
                onChange={(val) => updateGravar('blancos', val)}
                min={0}
                max={100}
                step={1}
                isDark={isDark}
                readOnly={readOnly}
                badge="V"
              />

              {/* B&N Checkbox + Slider Condicional (0 .. 100) */}
              <div className={`p-2.5 rounded-xl border transition-all space-y-2.5 ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.gravar.bnHabilitat}
                      disabled={readOnly}
                      onChange={(e) => updateGravar('bnHabilitat', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      config.gravar.bnHabilitat
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-white')
                    }`}>
                      {config.gravar.bnHabilitat && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        V
                      </span>
                      <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>B&N (Blanc i Negre)</span>
                    </span>
                  </label>

                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                    {config.gravar.bnHabilitat ? 'Slider activat' : 'Desactivat (slider ocult)'}
                  </span>
                </div>

                {/* Si B&N = True, apareix el slider; si B&N = False, no apareix */}
                {config.gravar.bnHabilitat && (
                  <div className="pt-1 animate-fadeIn">
                    <LaserSliderField
                      label="Nivell B&N"
                      value={config.gravar.bn}
                      onChange={(val) => updateGravar('bn', val)}
                      min={0}
                      max={100}
                      step={1}
                      isDark={isDark}
                      readOnly={readOnly}
                      badge="V"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Part 2: Opcions de conversió fixes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LaserFixedBadge label="Herramienta de conversión" value={config.gravar.conversio} isDark={isDark} />
              <LaserFixedBadge label="Dirección" value={config.gravar.direccio} isDark={isDark} />
              <LaserFixedBadge label="Calidad" value={`${config.gravar.qualitat} Línies/mm`} isDark={isDark} />
            </div>

            {/* Part 3: Velocitat & Potència Làser */}
            <div className={`p-4 rounded-2xl border space-y-3.5 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Velocitat & Potència Làser
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Velocitat de Gravat [V] */}
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">V</span>
                    Engraving Speed (Velocitat):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="50"
                      value={config.gravar.engravingSpeed}
                      disabled={readOnly}
                      onChange={(e) => updateGravar('engravingSpeed', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`flex-1 w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="ex: 3000"
                    />
                    <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      mm/min
                    </span>
                  </div>
                </div>

                {/* Laser Mode [F] */}
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">F</span>
                    Laser Mode:
                  </label>
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {config.gravar.laserMode}
                  </div>
                </div>
              </div>

              {/* S-MIN [F] i S-MAX [V] (0% .. 100%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">F</span>
                    S-MIN (Mínim):
                  </label>
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    0 (0,0 %)
                  </div>
                </div>

                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">V</span>
                    S-MAX Potència (0% .. 100%):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={config.gravar.sMaxPercent}
                        disabled={readOnly}
                        onChange={(e) => handleGravarPowerPercent(Number(e.target.value))}
                        className={`flex-1 w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                          isDark ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                        }`}
                      />
                      <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        %
                      </span>
                    </div>

                    <div className="relative w-24">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        step="1"
                        value={config.gravar.sMaxPwm}
                        disabled={readOnly}
                        onChange={(e) => {
                          const pwm = Number(e.target.value) || 0;
                          onChange({
                            ...config,
                            gravar: {
                              ...config.gravar,
                              sMaxPwm: pwm,
                              sMaxPercent: Number(((pwm / 10000) * 100).toFixed(1))
                            }
                          });
                        }}
                        className={`w-full px-2 py-1.5 rounded-xl border text-xs font-mono text-center ${
                          isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        title="Valor PWM"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mida d'Imatge i Posició [mm] - Només a nivell de Producte / Escandall */}
              {showDimensions && (
                <div className={`p-4 rounded-xl border mt-3 space-y-3 ${
                  isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-100' : 'bg-amber-50/70 border-amber-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        V
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                        Mida d'Imatge & Posició
                      </span>
                    </div>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paràmetres exclusius d'aquest producte (mm)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Amplada W (mm):
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="ex: 183.4"
                        value={config.gravar.midaW}
                        disabled={readOnly}
                        onChange={(e) => updateGravar('midaW', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Alçada H (mm):
                        </label>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          F
                        </span>
                      </div>
                      <div 
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold select-none flex items-center justify-between cursor-not-allowed opacity-80 ${
                          isDark 
                            ? 'bg-slate-950/80 border-slate-700 text-amber-400/90' 
                            : 'bg-slate-100 border-slate-300 text-amber-800'
                        }`}
                        title="L'alçada la calcula proporcionalment el programa de marcatge"
                      >
                        <span>Proporcional</span>
                        <Lock className="w-3.5 h-3.5 text-slate-500 opacity-60" />
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Inici X (mm):
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={config.gravar.iniciX}
                        disabled={readOnly}
                        onChange={(e) => updateGravar('iniciX', Number(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Inici Y (mm):
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={config.gravar.iniciY}
                        disabled={readOnly}
                        onChange={(e) => updateGravar('iniciY', Number(e.target.value) || 0)}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none transition-all ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Fitxer i Notes de Gravat */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    {/* Ruta de la Carpeta */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Ruta de la Carpeta (Ubicació al PC):
                        </label>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          V
                        </span>
                      </div>
                      <div className="relative">
                        <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={config.gravar.ruta || ''}
                          placeholder="ex: C:\Laser\Projectes\Regals\"
                          disabled={readOnly}
                          onChange={(e) => updateGravar('ruta', e.target.value)}
                          className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold outline-none transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                              : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                          }`}
                        />
                        {config.gravar.ruta && !readOnly && (
                          <button
                            type="button"
                            onClick={() => updateGravar('ruta', '')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                            title="Esborrar ruta"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nom del Fitxer */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Fitxer per al Làser (Gravat):
                        </label>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          V
                        </span>
                      </div>
                      <input 
                        type="file" 
                        ref={gravarFileInputRef} 
                        onChange={handleGravarFileSelect} 
                        className="hidden" 
                        accept=".nc,.gcode,.gc,.svg,.dxf,.png,.jpg,.jpeg,*"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={config.gravar.fitxer || ''}
                            placeholder="ex: marc_gravat_frontal.nc"
                            disabled={readOnly}
                            onChange={(e) => updateGravar('fitxer', e.target.value)}
                            className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold outline-none transition-all ${
                              isDark 
                                ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                                : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                            }`}
                          />
                          {config.gravar.fitxer && !readOnly && (
                            <button
                              type="button"
                              onClick={() => updateGravar('fitxer', '')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                              title="Esborrar fitxer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => gravarFileInputRef.current?.click()}
                          disabled={readOnly}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                          title="Triar fitxer des del teu ordinador"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Triar del PC</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Notes / Memo del procés de Gravat:
                        </label>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          V
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={config.gravar.notes || ''}
                        placeholder="Observacions per al gravat (alçada focal, alineació, orientació de la peça, etc.)..."
                        disabled={readOnly}
                        onChange={(e) => updateGravar('notes', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all resize-y ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-600 shadow-xs'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECCIÓ TALLAR (Imatge 3)                                 */}
        {/* ======================================================== */}
        {(activeSubTab === 'tallar' || activeSubTab === 'tots') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1.5 border-amber-500/20">
              <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1.5 uppercase">
                <Scissors className="w-3.5 h-3.5" />
                2. Paràmetres per a TALLAR (LaserGRBL)
              </span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Velocidad de Borde [V] */}
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">V</span>
                    Velocitat de Tall (Borde):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="10"
                      value={config.tallar.velocidadBorde}
                      disabled={readOnly}
                      onChange={(e) => updateTallar('velocidadBorde', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`flex-1 w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="ex: 140"
                    />
                    <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      mm/min
                    </span>
                  </div>
                </div>

                {/* Passades de Tall [V] */}
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">V</span>
                    Passades de Tall:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={config.tallar.passades || 1}
                      disabled={readOnly}
                      onChange={(e) => updateTallar('passades', Math.max(1, Math.round(Number(e.target.value) || 1)))}
                      className={`flex-1 w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="1"
                    />
                    <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      passada/es
                    </span>
                  </div>
                </div>

                {/* Laser ON [F] */}
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">F</span>
                    Laser ON:
                  </label>
                  <div className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {config.tallar.laserOn}
                  </div>
                </div>
              </div>

              {/* S-MIN [F] i S-MAX [V] per a Tallar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">F</span>
                    S-MIN (Mínim):
                  </label>
                  <div className={`px-3 py-2 rounded-xl border text-xs font-mono ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    0 (0,0 %)
                  </div>
                </div>

                <div>
                  <label className={`text-[11px] font-mono block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-[10px] font-mono px-1 py-0.2 mr-1 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">V</span>
                    S-MAX Potència Tall (0% .. 100%):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={config.tallar.sMaxPercent}
                        disabled={readOnly}
                        onChange={(e) => handleTallarPowerPercent(Number(e.target.value))}
                        className={`flex-1 w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                          isDark ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                        }`}
                      />
                      <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        %
                      </span>
                    </div>

                    <div className="relative w-24">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        step="1"
                        value={config.tallar.sMaxPwm}
                        disabled={readOnly}
                        onChange={(e) => {
                          const pwm = Number(e.target.value) || 0;
                          onChange({
                            ...config,
                            tallar: {
                              ...config.tallar,
                              sMaxPwm: pwm,
                              sMaxPercent: Number(((pwm / 10000) * 100).toFixed(1))
                            }
                          });
                        }}
                        className={`w-full px-2 py-2 rounded-xl border text-xs font-mono text-center ${
                          isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        title="Valor PWM"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fitxer i Notes de Tall - Només a nivell de Producte / Escandall */}
              {showDimensions && (
                <div className={`p-4 rounded-xl border mt-3 space-y-3 ${
                  isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-100' : 'bg-amber-50/70 border-amber-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        V
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                        Fitxer & Notes de Tall
                      </span>
                    </div>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paràmetres exclusius d'aquest producte
                    </span>
                  </div>

                  {/* Ruta de la Carpeta */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Ruta de la Carpeta (Ubicació al PC):
                      </label>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        V
                      </span>
                    </div>
                    <div className="relative">
                      <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={config.tallar.ruta || ''}
                        placeholder="ex: C:\Laser\Projectes\Regals\"
                        disabled={readOnly}
                        onChange={(e) => updateTallar('ruta', e.target.value)}
                        className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold outline-none transition-all ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                        }`}
                      />
                      {config.tallar.ruta && !readOnly && (
                        <button
                          type="button"
                          onClick={() => updateTallar('ruta', '')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                          title="Esborrar ruta"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nom del Fitxer */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Fitxer per al Làser (Tall):
                      </label>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        V
                      </span>
                    </div>
                    <input 
                      type="file" 
                      ref={tallarFileInputRef} 
                      onChange={handleTallarFileSelect} 
                      className="hidden" 
                      accept=".nc,.gcode,.gc,.svg,.dxf,.png,.jpg,.jpeg,*"
                    />
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={config.tallar.fitxer || ''}
                          placeholder="ex: clauer_tall_perfil.nc"
                          disabled={readOnly}
                          onChange={(e) => updateTallar('fitxer', e.target.value)}
                          className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold outline-none transition-all ${
                            isDark 
                              ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                              : 'bg-white border-slate-300 text-slate-900 focus:border-amber-600 shadow-xs'
                          }`}
                        />
                        {config.tallar.fitxer && !readOnly && (
                          <button
                            type="button"
                            onClick={() => updateTallar('fitxer', '')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                            title="Esborrar fitxer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => tallarFileInputRef.current?.click()}
                        disabled={readOnly}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        title="Triar fitxer des del teu ordinador"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Triar del PC</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Notes / Memo del procés de Tall:
                      </label>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        V
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={config.tallar.notes || ''}
                      placeholder="Observacions per al tall (pressió d'aire, subjecció, ordre de talls interiors/exteriors, etc.)..."
                      disabled={readOnly}
                      onChange={(e) => updateTallar('notes', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all resize-y ${
                        isDark 
                          ? 'bg-slate-950 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-amber-500' 
                          : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-600 shadow-xs'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
