import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Edit3, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  List, 
  LayoutGrid, 
  FastForward,
  Copy,
  Check,
  Eye,
  Info
} from 'lucide-react';
import { 
  POST_CONTENT_TYPES, 
  DEFAULT_CADENCE_DAYS, 
  isHoliday, 
  formatDateISO, 
  deleteScheduledPost, 
  updatePostDate, 
  togglePostStatus, 
  shiftPendingPostsInCascade, 
  analyzeEditorialMix 
} from '../../services/postingScheduleService';
import { sendTelegramPostingReminder } from '../../utils/telegramUtils';
import { resolveMediaUrl } from '../../utils/mediaUtils';

function getSafePhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return resolveMediaUrl(url);
}

const DAY_NAMES = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];
const MONTH_NAMES = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
];

export default function PostingCalendar({ 
  scheduledPosts = [], 
  onEditPost, 
  onCreateNewForDate 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterType, setFilterType] = useState('all'); // 'all' | typeId
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pendent' | 'publicada'
  
  // Modals & accions
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftFromDate, setShiftFromDate] = useState(formatDateISO(new Date()));
  const [shiftDays, setShiftDays] = useState(2);
  const [isShifting, setIsShifting] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [copiedPostId, setCopiedPostId] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Canvis de mes
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrar posts
  const filteredPosts = useMemo(() => {
    return scheduledPosts.filter(p => {
      if (filterType !== 'all' && p.tipus !== filterType) return false;
      if (filterStatus !== 'all' && p.estat !== filterStatus) return false;
      return true;
    });
  }, [scheduledPosts, filterType, filterStatus]);

  // Càlcul del mix editorial
  const editorialMix = useMemo(() => {
    return analyzeEditorialMix(scheduledPosts.filter(p => p.estat !== 'publicada'));
  }, [scheduledPosts]);

  // Construcció de la graella mensual
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Índex de dia de la setmana (0: Dll, 1: Dmt, ..., 6: Dg)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Diumenge a última posició

    const days = [];

    // Dies del mes anterior per omplir la primera setmana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const dateStr = formatDateISO(d);
      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === formatDateISO(new Date()),
        isHolidayDay: isHoliday(dateStr),
        isCadenceDay: DEFAULT_CADENCE_DAYS.includes(d.getDay())
      });
    }

    // Dies del mes actual
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = formatDateISO(d);
      days.push({
        date: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === formatDateISO(new Date()),
        isHolidayDay: isHoliday(dateStr),
        isCadenceDay: DEFAULT_CADENCE_DAYS.includes(d.getDay())
      });
    }

    // Dies del mes següent per completar la graella a múltiples de 7
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatDateISO(d);
      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === formatDateISO(new Date()),
        isHolidayDay: isHoliday(dateStr),
        isCadenceDay: DEFAULT_CADENCE_DAYS.includes(d.getDay())
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Agrupar posts per data (YYYY-MM-DD)
  const postsByDate = useMemo(() => {
    const map = {};
    filteredPosts.forEach(p => {
      if (!p.dataPublicacio) return;
      if (!map[p.dataPublicacio]) map[p.dataPublicacio] = [];
      map[p.dataPublicacio].push(p);
    });
    return map;
  }, [filteredPosts]);

  // Enviar avís de Telegram immediat
  const handleSendTelegram = async (post) => {
    setTelegramStatus({ id: post.id, loading: true });
    try {
      const ok = await sendTelegramPostingReminder({ post });
      if (ok) {
        setTelegramStatus({ id: post.id, success: true, msg: 'Avís enviat al teu Telegram! ✓' });
      } else {
        setTelegramStatus({ id: post.id, error: true, msg: 'Revisa la configuració del bot a l\'Àrea Privada.' });
      }
    } catch (e) {
      setTelegramStatus({ id: post.id, error: true, msg: 'Error enviant avís.' });
    }
    setTimeout(() => setTelegramStatus(null), 4000);
  };

  // Desplaçament en cascada
  const handleExecuteShift = async () => {
    setIsShifting(true);
    try {
      await shiftPendingPostsInCascade(scheduledPosts, shiftFromDate, shiftDays);
      setShowShiftModal(false);
    } catch (e) {
      console.error(e);
      alert("Error aplicant el desplaçament en cascada.");
    } finally {
      setIsShifting(false);
    }
  };

  const getTypeMeta = (typeId) => {
    return POST_CONTENT_TYPES.find(t => t.id === typeId) || POST_CONTENT_TYPES[0];
  };

  return (
    <div className="space-y-6">
      {/* 1. Capçalera del Calendari Editorial & Accions */}
      <div className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-900 shadow-2xs">
              <CalendarIcon className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#3D2B1F] flex items-center gap-2">
                <span>Calendari & Planificació Editorial</span>
                <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {scheduledPosts.filter(p => p.estat !== 'publicada').length} pendents
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Distribueix les publicacions amb calma, espaiades i amb avís directe al teu Telegram.
              </p>
            </div>
          </div>

          {/* Botons d'acció ràpida */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShiftModal(true)}
              className="px-3 py-1.5 rounded-xl border border-outline/20 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Endarrerir o moure dates en cascada si avui has penjat una publicació imprevista"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-700" />
              <span>Empènyer dates</span>
            </button>

            <button
              type="button"
              onClick={() => onCreateNewForDate(formatDateISO(new Date()))}
              className="px-3.5 py-1.5 rounded-xl bg-[#3D2B1F] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Crear nova publicació</span>
            </button>
          </div>
        </div>

        {/* 2. Barra de Control del Mes i Filtres */}
        <div className="pt-3 border-t border-outline/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navegació de mes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-outline/15">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-all cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-serif font-bold text-sm text-[#3D2B1F] px-3 select-none min-w-[130px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-all cursor-pointer"
                title="Mes següent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Avui
            </button>
          </div>

          {/* Filtres de tipus i vista */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 border border-outline/20 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-700 cursor-pointer"
            >
              <option value="all">Totes les temàtiques</option>
              {POST_CONTENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 border border-outline/20 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-700 cursor-pointer"
            >
              <option value="all">Tots els estats</option>
              <option value="pendent">Pendents de publicar</option>
              <option value="publicada">Ja publicades</option>
            </select>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-outline/15">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === 'grid' ? 'bg-white text-[#3D2B1F] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista graella mensual"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === 'list' ? 'bg-white text-[#3D2B1F] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista llistat cronològic"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Indicador de Ritme & Mix Editorial */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Mix de contingut previst:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POST_CONTENT_TYPES.map(t => {
                const count = editorialMix.counts[t.id] || 0;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border shadow-2xs"
                    style={{ backgroundColor: t.bgLight, color: t.color, borderColor: t.border }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}:</span>
                    <strong className="font-mono">{count}</strong>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-amber-900 shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-[11px]">
              Suggeriment pel proper post: <strong>{getTypeMeta(editorialMix.suggestedNextType).icon} {getTypeMeta(editorialMix.suggestedNextType).label}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Vista Graella Mensual */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-2xl border border-outline/15 shadow-xs overflow-hidden">
          {/* Dies de la setmana */}
          <div className="grid grid-cols-7 border-b border-outline/15 bg-slate-50/80 text-center text-xs font-bold text-slate-600 py-2.5">
            {DAY_NAMES.map((name, idx) => (
              <div key={idx} className="flex items-center justify-center gap-1">
                <span>{name}</span>
                {DEFAULT_CADENCE_DAYS.includes((idx + 1) % 7) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" title="Dia de cadència recomanada" />
                )}
              </div>
            ))}
          </div>

          {/* Graella de dies */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-outline/10">
            {calendarDays.map((day, dIdx) => {
              const dayPosts = postsByDate[day.dateStr] || [];
              const isPast = day.dateStr < formatDateISO(new Date());

              return (
                <div
                  key={dIdx}
                  className={`min-h-[120px] p-1.5 flex flex-col justify-between transition-colors group relative ${
                    !day.isCurrentMonth 
                      ? 'bg-slate-50/40 text-slate-400' 
                      : day.isToday 
                        ? 'bg-amber-50/30' 
                        : 'bg-white hover:bg-slate-50/60'
                  }`}
                >
                  {/* Capçalera del dia */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                        day.isToday
                          ? 'bg-[#3D2B1F] text-white shadow-2xs'
                          : day.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {day.isHolidayDay && (
                        <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200/60 px-1 rounded">
                          Festiu
                        </span>
                      )}

                      {/* Botó ràpid d'afegir publicació en aquest dia */}
                      <button
                        type="button"
                        onClick={() => onCreateNewForDate(day.dateStr)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-amber-100 text-amber-900 transition-opacity cursor-pointer"
                        title={`Crear publicació per al ${day.dateStr}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Llista de publicacions del dia */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[140px] pr-0.5">
                    {dayPosts.map((post) => {
                      const typeMeta = getTypeMeta(post.tipus);
                      const isPublished = post.estat === 'publicada';

                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostDetail(post)}
                          className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:scale-[1.02] flex flex-col gap-1 ${
                            isPublished
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 opacity-80'
                              : 'bg-white border-amber-900/15 hover:border-amber-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded-md truncate"
                              style={{ backgroundColor: typeMeta.bgLight, color: typeMeta.color }}
                            >
                              {typeMeta.icon} {typeMeta.label}
                            </span>
                            {isPublished ? (
                              <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Fet</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-400">
                                {post.horaPublicacio || '10h'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {getSafePhotoUrl(post.photoUrl) && (
                              <img
                                src={getSafePhotoUrl(post.photoUrl)}
                                alt=""
                                className="w-6 h-6 rounded object-cover shrink-0 border border-black/10"
                              />
                            )}
                            <span className="text-[11px] font-semibold text-slate-800 truncate block">
                              {post.title || post.subtitle || '(Sense títol)'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Indicador de dia recomanat si no hi ha posts */}
                  {dayPosts.length === 0 && day.isCadenceDay && day.isCurrentMonth && !isPast && (
                    <div className="pt-1 text-center">
                      <span className="text-[9px] text-amber-800/60 font-medium">
                        Dia recomanat
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 5. Vista Llistat Cronològic */
        <div className="bg-white rounded-2xl border border-outline/15 shadow-xs overflow-hidden divide-y divide-outline/10">
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No hi ha publicacions planificades amb aquests filtres.</p>
              <button
                type="button"
                onClick={() => onCreateNewForDate(formatDateISO(new Date()))}
                className="mt-2 px-3 py-1.5 text-xs font-bold bg-[#3D2B1F] text-white rounded-xl hover:bg-black transition-all cursor-pointer"
              >
                Crear una nova publicació ara
              </button>
            </div>
          ) : (
            filteredPosts.map(post => {
              const typeMeta = getTypeMeta(post.tipus);
              const isPublished = post.estat === 'publicada';

              return (
                <div
                  key={post.id}
                  className="p-4 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Miniatura */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-outline/15 shrink-0 flex items-center justify-center">
                      {getSafePhotoUrl(post.photoUrl) ? (
                        <img src={getSafePhotoUrl(post.photoUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{typeMeta.icon}</span>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeMeta.bgLight, color: typeMeta.color }}
                        >
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1 font-mono">
                          <CalendarIcon className="w-3 h-3 text-slate-400" />
                          <span>{post.dataPublicacio}</span>
                          {post.horaPublicacio && <span className="text-slate-400">({post.horaPublicacio}h)</span>}
                        </span>
                        {isPublished ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            Publicada ✓
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            Pendent
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-sm text-[#3D2B1F] truncate">
                        {post.title || '(Sense títol a la imatge)'}
                      </h4>
                      {post.subtitle && (
                        <p className="text-xs text-slate-500 truncate">
                          {post.subtitle}
                        </p>
                      )}
                      {post.copyText && (
                        <p className="text-xs text-slate-600 line-clamp-1 italic bg-slate-50 p-1 rounded border border-outline/10">
                          "{post.copyText.substring(0, 120)}..."
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Accions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendTelegram(post)}
                      className="p-2 rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50 border border-outline/15 transition-all cursor-pointer"
                      title="Enviar avís i text ara a Telegram"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditPost(post)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePostStatus(post.id, post.estat)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isPublished
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border-outline/15'
                      }`}
                      title={isPublished ? "Marcar com a pendent" : "Marcar com a ja publicada"}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Vols eliminar la publicació "${post.title || post.dataPublicacio}"?`)) {
                          deleteScheduledPost(post.id);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 border border-outline/15 transition-all cursor-pointer"
                      title="Eliminar publicació"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Modal de Detall d'un Post seleccionat a la Graella */}
      {selectedPostDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-outline/15 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: getTypeMeta(selectedPostDetail.tipus).bgLight, 
                    color: getTypeMeta(selectedPostDetail.tipus).color 
                  }}
                >
                  {getTypeMeta(selectedPostDetail.tipus).icon} {getTypeMeta(selectedPostDetail.tipus).label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {selectedPostDetail.dataPublicacio} ({selectedPostDetail.horaPublicacio || '10:00'}h)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-start gap-4">
              {getSafePhotoUrl(selectedPostDetail.photoUrl) && (
                <img
                  src={getSafePhotoUrl(selectedPostDetail.photoUrl)}
                  alt=""
                  className="w-24 h-28 object-cover rounded-xl border border-black/10 shrink-0 shadow-2xs"
                />
              )}
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-serif font-bold text-base text-[#3D2B1F]">
                  {selectedPostDetail.title || '(Sense títol a la imatge)'}
                </h3>
                {selectedPostDetail.subtitle && (
                  <p className="text-xs text-slate-600">
                    {selectedPostDetail.subtitle}
                  </p>
                )}
                <div className="text-[11px] text-slate-500 pt-1 space-y-0.5">
                  <p>Format: <strong className="font-mono">{selectedPostDetail.format || '4:5'}</strong></p>
                  <p>Plantilla: <strong className="capitalize">{selectedPostDetail.template || 'atelier'}</strong></p>
                  {selectedPostDetail.customLayers?.length > 0 && (
                    <p className="text-amber-800 font-medium">
                      ✨ Inclou {selectedPostDetail.customLayers.filter(l => l.enabled).length} capes de text personalitzades
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Redacció per a Instagram */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-outline/10 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Text per a Instagram (Copy):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPostDetail.copyText || '');
                    setCopiedPostId(selectedPostDetail.id);
                    setTimeout(() => setCopiedPostId(null), 2000);
                  }}
                  className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedPostId === selectedPostDetail.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copiat!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar text</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto font-sans leading-relaxed">
                {selectedPostDetail.copyText || '(No hi ha text de redacció desat)'}
              </p>
            </div>

            {/* Reprogramació ràpida de data */}
            <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
              <span className="font-bold text-amber-950">Moure de data:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedPostDetail.dataPublicacio}
                  onChange={(e) => {
                    if (e.target.value) {
                      updatePostDate(selectedPostDetail.id, e.target.value);
                      setSelectedPostDetail(prev => ({ ...prev, dataPublicacio: e.target.value }));
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs text-slate-800 font-mono font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Botons d'acció */}
            <div className="flex items-center justify-between pt-2 border-t border-outline/10">
              <button
                type="button"
                onClick={() => handleSendTelegram(selectedPostDetail)}
                className="px-3 py-1.5 rounded-xl border border-sky-300 hover:bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar avís a Telegram</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    togglePostStatus(selectedPostDetail.id, selectedPostDetail.estat);
                    setSelectedPostDetail(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-outline/20 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {selectedPostDetail.estat === 'publicada' ? 'Marcar Pendent' : 'Marcar Publicada ✓'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onEditPost(selectedPostDetail);
                    setSelectedPostDetail(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#3D2B1F] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Obrir a l'Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Desplaçament en Cascada ("Empènyer dates") */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-outline/15 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
              <h3 className="font-serif font-bold text-base text-[#3D2B1F] flex items-center gap-2">
                <FastForward className="w-4 h-4 text-amber-700" />
                <span>Desplaçar publicacions en cascada</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Utilitza aquesta funció si avui has hagut de penjar una publicació no prevista (o urgent) i vols moure cap endavant totes les publicacions pendents que ja tenien data assignada.
            </p>

            <div className="space-y-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
              <div>
                <label className="block font-bold text-[#3D2B1F] mb-1">
                  A partir d'aquesta data (inclosos):
                </label>
                <input
                  type="date"
                  value={shiftFromDate}
                  onChange={(e) => setShiftFromDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-[#3D2B1F] mb-1">
                  Quants dies vols endarrerir la cua:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '+1 dia', days: 1 },
                    { label: '+2 dies (cadència)', days: 2 },
                    { label: '+3 dies', days: 3 },
                    { label: '+7 dies (1 setm.)', days: 7 }
                  ].map(opt => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setShiftDays(opt.days)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        shiftDays === opt.days
                          ? 'bg-[#3D2B1F] text-white border-[#3D2B1F]'
                          : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline/10">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                disabled={isShifting}
                onClick={handleExecuteShift}
                className="px-4 py-1.5 text-xs font-bold bg-[#3D2B1F] text-white rounded-xl hover:bg-black transition-all cursor-pointer disabled:opacity-50"
              >
                {isShifting ? 'Aplicant desplaçament...' : 'Moure dates en cascada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificació d'estat de Telegram (Toast) */}
      {telegramStatus && (
        <div className={`fixed bottom-6 right-6 z-50 p-3 rounded-xl border shadow-lg text-xs font-bold animate-fadeIn flex items-center gap-2 ${
          telegramStatus.error 
            ? 'bg-red-50 text-red-900 border-red-300' 
            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
        }`}>
          {telegramStatus.error ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{telegramStatus.msg}</span>
        </div>
      )}
    </div>
  );
}
