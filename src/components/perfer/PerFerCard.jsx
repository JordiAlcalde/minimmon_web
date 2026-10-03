import React, { useState } from 'react';
import { 
  Clock, AlertTriangle, Coffee, Calendar, CheckSquare, Square, 
  Camera, Link2, ChevronLeft, ChevronRight, CheckCircle2, 
  Palette, Hammer, Share2, Globe, ShoppingBag, Sparkles, Tag, 
  Edit2, Trash2, ArrowRight, CornerDownRight, ArrowUp, ArrowDown
} from 'lucide-react';
import { PER_FER_COLUMNS, PER_FER_AMBITS, PER_FER_PRIORITATS } from '../../data/perFerInitialData';
import { getPlanificacioLabel, getPlanificacioBadgeInfo } from '../../utils/perFerPlanificacioUtils';

export default function PerFerCard({
  task,
  onEdit,
  onMoveToColumn,
  onToggleSubtask,
  onDelete,
  onDragStart,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  isDragOver = false,
  dragOverPosition = null,
  onUpdatePlanificacio
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Trobar metadades d'àmbit i prioritat
  const ambitConfig = PER_FER_AMBITS.find(a => a.id === task.ambit) || PER_FER_AMBITS[PER_FER_AMBITS.length - 1];
  const prioritatConfig = PER_FER_PRIORITATS.find(p => p.id === task.prioritat) || PER_FER_PRIORITATS[1];

  // Helper per a icones d'àmbit
  const renderAmbitIcon = (iconName) => {
    switch (iconName) {
      case 'Palette': return <Palette className="w-3 h-3" />;
      case 'Hammer': return <Hammer className="w-3 h-3" />;
      case 'Share2': return <Share2 className="w-3 h-3" />;
      case 'Globe': return <Globe className="w-3 h-3" />;
      case 'ShoppingBag': return <ShoppingBag className="w-3 h-3" />;
      case 'Sparkles': return <Sparkles className="w-3 h-3" />;
      default: return <Tag className="w-3 h-3" />;
    }
  };

  // Càlcul de subtasques
  const subtasques = Array.isArray(task.subtasques) ? task.subtasques : [];
  const completedSubtasks = subtasques.filter(st => st.completada).length;
  const totalSubtasks = subtasques.length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Càlcul de venciment de data límit
  const getDueDateInfo = () => {
    if (!task.dataLimit) return null;
    const today = new Date().toISOString().split('T')[0];
    const diffDays = Math.ceil((new Date(task.dataLimit) - new Date(today)) / (1000 * 60 * 60 * 24));

    if (task.estat === 'enllestit') {
      return { label: task.dataLimit, color: 'text-stone-700 dark:text-stone-300 bg-surface-container border border-outline/20 font-medium' };
    }
    if (diffDays < 0) {
      return { label: `Vençut fa ${Math.abs(diffDays)}d`, color: 'text-stone-900 bg-red-100 border border-red-300 font-bold animate-pulse' };
    }
    if (diffDays === 0) {
      return { label: 'Toca avui!', color: 'text-stone-900 bg-amber-100 border border-amber-300 font-bold' };
    }
    if (diffDays <= 3) {
      return { label: `En ${diffDays}d`, color: 'text-stone-900 bg-amber-100 border border-amber-300 font-bold' };
    }
    return { label: task.dataLimit, color: 'text-stone-900 bg-surface-container border border-outline/20 font-semibold' };
  };

  const dueDateInfo = getDueDateInfo();

  // Determinació de columnes anterior i següent
  const currentColIdx = PER_FER_COLUMNS.findIndex(c => c.id === task.estat);
  const prevCol = currentColIdx > 0 ? PER_FER_COLUMNS[currentColIdx - 1] : null;
  const nextCol = currentColIdx < PER_FER_COLUMNS.length - 1 ? PER_FER_COLUMNS[currentColIdx + 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task)}
      onDragOver={(e) => onCardDragOver && onCardDragOver(e, task)}
      onDragLeave={(e) => onCardDragLeave && onCardDragLeave(e, task)}
      onDrop={(e) => onCardDrop && onCardDrop(e, task)}
      onClick={() => onEdit(task)}
      className={`group relative bg-surface-container-lowest text-on-surface p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 active:scale-[0.99] ${
        isDragOver && dragOverPosition === 'top'
          ? 'border-t-primary border-t-2 border-outline/15 shadow-md -translate-y-0.5'
          : isDragOver && dragOverPosition === 'bottom'
          ? 'border-b-primary border-b-2 border-outline/15 shadow-md translate-y-0.5'
          : 'border-outline/15 hover:border-primary/40 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Barra superior de la targeta: Àmbit & Prioritat */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* Badge d'Àmbit */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border text-stone-900 ${ambitConfig.badgeClass}`}>
            <span className="text-stone-900 shrink-0">
              {renderAmbitIcon(ambitConfig.iconName)}
            </span>
            <span className="text-stone-900">{ambitConfig.nom}</span>
          </span>

          {/* Badge de Prioritat (només si urgent o si es vol veure) */}
          {task.prioritat === 'urgent' && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-stone-900 ${prioritatConfig.badgeClass}`}>
              <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-stone-900">Urgent</span>
            </span>
          )}
        </div>

        {/* Controls de la targeta: Amunt/Avall i Canvi de Columna */}
        <div 
          className="flex items-center gap-1 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {/* Botons Amunt / Avall per endreçar dins la columna (excepte Enllestit) */}
          {task.estat !== 'enllestit' && (
            <div className="flex items-center bg-surface-container/70 border border-outline/20 rounded-md p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp && onMoveUp(task.id);
                }}
                className="p-1 text-stone-700 dark:text-stone-300 hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                title={canMoveUp ? "Pujar amunt" : "Ja és a dalt de tot"}
              >
                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown && onMoveDown(task.id);
                }}
                className="p-1 text-stone-700 dark:text-stone-300 hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                title={canMoveDown ? "Baixar avall" : "Ja és a baix de tot"}
              >
                <ArrowDown className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Botons per canviar de columna */}
          {(prevCol || nextCol) && (
            <div className="flex items-center bg-surface-container/70 border border-outline/20 rounded-md p-0.5 shadow-2xs">
              {prevCol && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToColumn(task.id, prevCol.id);
                  }}
                  className="p-1 text-stone-700 dark:text-stone-300 hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer"
                  title={`Moure a "${prevCol.titol}"`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {nextCol && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToColumn(task.id, nextCol.id);
                  }}
                  className="p-1 text-stone-700 dark:text-stone-300 hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer"
                  title={`Moure a "${nextCol.titol}"`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selector ràpid Planificació: Ahir / Avui / Demà */}
      {task.estat !== 'enllestit' ? (
        <div 
          className="flex items-center justify-between gap-1 p-1 rounded-lg border border-outline/15 bg-surface-container/50 text-[11px]"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider pl-1 font-bold">
            Pla:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdatePlanificacio && onUpdatePlanificacio(task.id, task.planificacio === 'ahir' ? null : 'ahir')}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                task.planificacio === 'ahir'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : typeof task.planificacio === 'string' && task.planificacio.startsWith('-')
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title={
                typeof task.planificacio === 'string' && task.planificacio.startsWith('-')
                  ? `Endarrerit: ${getPlanificacioLabel(task.planificacio)} (Clica per desmarcar)`
                  : 'Ahir (Clica per activar/desmarcar)'
              }
            >
              {typeof task.planificacio === 'string' && task.planificacio.startsWith('-')
                ? getPlanificacioLabel(task.planificacio)
                : 'Ahir'}
            </button>

            <button
              type="button"
              onClick={() => onUpdatePlanificacio && onUpdatePlanificacio(task.id, task.planificacio === 'avui' ? null : 'avui')}
              className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                task.planificacio === 'avui'
                  ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-400'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Avui (Clica per activar/desmarcar)"
            >
              Avui
            </button>

            <button
              type="button"
              onClick={() => onUpdatePlanificacio && onUpdatePlanificacio(task.id, task.planificacio === 'dema' ? null : 'dema')}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                task.planificacio === 'dema'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Demà (Clica per activar/desmarcar)"
            >
              Demà
            </button>
          </div>
        </div>
      ) : task.planificacio ? (
        <div className="flex items-center justify-between gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Feina feta avui</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
            {getPlanificacioLabel(task.planificacio)}
          </span>
        </div>
      ) : null}

      {/* Títol de la tasca */}
      <div className="text-sm font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors">
        <span className={task.estat === 'enllestit' ? 'line-through text-on-surface-variant/70' : ''}>
          {task.titol}
        </span>
      </div>

      {/* Descripció / Memo truncada si n'hi ha */}
      {task.descripcio && (
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
          {task.descripcio}
        </p>
      )}

      {/* Micro-imatges / Esbossos miniatura */}
      {Array.isArray(task.imatges) && task.imatges.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
          {task.imatges.slice(0, 3).map((img, i) => (
            <img 
              key={img.id || i}
              src={img.url} 
              alt={img.nom || 'Foto'} 
              className="w-8 h-8 rounded-lg object-cover border border-outline/20 shrink-0" 
            />
          ))}
          {task.imatges.length > 3 && (
            <span className="text-[10px] font-mono text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container">
              +{task.imatges.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Checklist / Subtasques */}
      {totalSubtasks > 0 && (
        <div 
          className="pt-1.5 border-t border-outline/10 space-y-1.5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-on-surface-variant">
            <button
              type="button"
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer select-none"
            >
              <CheckSquare className="w-3 h-3 text-primary" />
              <span>{completedSubtasks}/{totalSubtasks} passos</span>
            </button>
            <span className="font-mono text-[10px]">{progressPercent}%</span>
          </div>

          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Subtasques desplegables directament a la targeta */}
          {showSubtasks && (
            <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
              {subtasques.map(st => (
                <div 
                  key={st.id}
                  onClick={() => onToggleSubtask(task.id, st.id)}
                  className="flex items-center gap-2 text-[11px] text-on-surface hover:text-primary cursor-pointer select-none py-0.5"
                >
                  {st.completada ? (
                    <CheckSquare className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-on-surface-variant shrink-0" />
                  )}
                  <span className={`truncate ${st.completada ? 'line-through text-on-surface-variant' : ''}`}>
                    {st.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Peu de la targeta: Data límit & Vinculació */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline/10 text-[11px] text-on-surface-variant">
        {dueDateInfo ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dueDateInfo.color}`}>
            <Calendar className="w-3 h-3 shrink-0 text-stone-900" />
            <span>{dueDateInfo.label}</span>
          </span>
        ) : <div />}

        {task.vinculacio && task.vinculacio.tipus !== 'cap' && task.vinculacio.nom && (
          <span 
            className="inline-flex items-center gap-1 max-w-[130px] truncate text-[10px] px-2 py-0.5 rounded bg-surface-container text-stone-900 font-semibold border border-outline/15"
            title={`${task.vinculacio.tipus}: ${task.vinculacio.nom}`}
          >
            <Link2 className="w-2.5 h-2.5 text-stone-800 shrink-0" />
            <span className="truncate">{task.vinculacio.nom}</span>
          </span>
        )}
      </div>
    </div>
  );
}
