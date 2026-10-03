import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Search, Filter, Sun, Moon, Cloud, CheckSquare, Square, Check,
  Lightbulb, ListTodo, Hammer, Hourglass, CheckCircle2, AlertTriangle, 
  Clock, LayoutGrid, List, Sparkles, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Layers, Trash2, 
  Calendar, Coffee, Share2, Globe, ShoppingBag, Tag, RefreshCw, Palette
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query, orderBy 
} from 'firebase/firestore';

import { 
  PER_FER_COLUMNS, 
  PER_FER_AMBITS, 
  PER_FER_PRIORITATS, 
  INITIAL_SAMPLE_TASQUES 
} from '../../data/perFerInitialData';
import PerFerCard from './PerFerCard';
import PerFerTaskModal from './PerFerTaskModal';
import { getScreenTheme, setScreenTheme, THEME_CHANGED_EVENT } from '../../utils/themeUtils';
import {
  getEffectivePlanningDate,
  calculateDaysDifference,
  advancePlanificacioDays,
  msUntilNext0005,
  getPlanificacioBadgeInfo,
  getPlanificacioLabel,
  getLocalDateString
} from '../../utils/perFerPlanificacioUtils';

// Helper per netejar valors 'undefined' per a Firestore
function sanitizeData(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj ?? null;
  if (Array.isArray(obj)) return obj.map(sanitizeData);
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeData(value);
    }
  }
  return clean;
}

// Helper per ordenar tasques de forma consistent (ordre decreixent; si empat, per data de creació o id)
function sortTasksList(taskList) {
  return [...taskList].sort((a, b) => {
    const ordA = a.ordre ?? 0;
    const ordB = b.ordre ?? 0;
    if (ordB !== ordA) return ordB - ordA;
    return (b.dataCreacio || '').localeCompare(a.dataCreacio || '') || (b.id || '').localeCompare(a.id || '');
  });
}

export default function PerFerApp({ setActiveTab }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDark, setIsDark] = useState(() => getScreenTheme('perfer') === 'dark');

  // Escolta canvis globals del tema per defecte si no s'ha triat manualment un override en aquesta sessió
  useEffect(() => {
    const handler = (e) => {
      if (!sessionStorage.getItem('theme_override_perfer')) {
        setIsDark(e.detail === 'dark');
      }
    };
    window.addEventListener(THEME_CHANGED_EVENT, handler);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handler);
  }, []);

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setScreenTheme('perfer', next ? 'dark' : 'light');
  };

  // Vistes i Filtres
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'llista'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAmbit, setFilterAmbit] = useState('tots');
  const [filterPrioritat, setFilterPrioritat] = useState('totes');
  const [filterEstat, setFilterEstat] = useState('tots'); // 'tots' | 'pendents' | 'enllestit'
  const [filterPlanificacio, setFilterPlanificacio] = useState('totes'); // 'totes' | 'avui' | 'dema' | 'ahir_endarrerits' | 'sense'

  // Estat de columna Enllestit replegable (per defecte replegada a petició de l'usuari)
  const [isEnllestitCollapsed, setIsEnllestitCollapsed] = useState(() => {
    const saved = localStorage.getItem('perfer_enllestit_collapsed');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleEnllestitCollapse = () => {
    setIsEnllestitCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('perfer_enllestit_collapsed', String(next));
      return next;
    });
  };

  // Modal de creació / edició
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Dades connectades del catàleg per a vinculació opcional
  const [dbProductes, setDbProductes] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [dbMaquinaria, setDbMaquinaria] = useState([]);
  const [dbEsdeveniments, setDbEsdeveniments] = useState([]);

  // Estat de Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null); // { id: string, position: 'top'|'bottom' }

  // Comprova i avança de forma intel·ligent els estats diaris a les 00:05 o en recuperar dies si l'ordinador estava apagat
  const checkAndApplyDailyRollover = async (taskList) => {
    if (!Array.isArray(taskList) || taskList.length === 0) return;
    const currentEffDate = getEffectivePlanningDate();
    const tasksToUpdate = [];

    for (const t of taskList) {
      if (t.planificacio) {
        const lastDate = t.planificacioDataUltimCanvi || (t.dataCompletat ? getLocalDateString(new Date(t.dataCompletat)) : currentEffDate);
        const diffDays = calculateDaysDifference(lastDate, currentEffDate);
        if (diffDays > 0) {
          if (t.estat === 'enllestit') {
            // Quan una tasca estigui completada a 'enllestit', l'endemà s'elimina el filtre del tot
            tasksToUpdate.push({
              id: t.id,
              planificacio: null,
              planificacioDataUltimCanvi: null
            });
          } else {
            // Tasques pendents: avançar estats diaris (dema -> avui -> ahir -> -1 dia...)
            const nextPlan = advancePlanificacioDays(t.planificacio, diffDays);
            tasksToUpdate.push({
              id: t.id,
              planificacio: nextPlan,
              planificacioDataUltimCanvi: currentEffDate
            });
          }
        }
      }
    }

    if (tasksToUpdate.length > 0) {
      try {
        const batch = writeBatch(db);
        tasksToUpdate.forEach(u => {
          batch.set(doc(db, "per_fer", u.id), {
            planificacio: u.planificacio,
            planificacioDataUltimCanvi: u.planificacioDataUltimCanvi
          }, { merge: true });
        });
        await batch.commit();
        console.log(`[PerFer] S'han actualitzat ${tasksToUpdate.length} tasques pel canvi de dia a les 00:05`);
      } catch (e) {
        console.error("Error aplicant la transició de dia a les tasques:", e);
      }
    }
  };

  // 1. Carregar tasques de Firestore a temps real
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "per_fer"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Inicialitzar amb les tasques d'exemple artesanals
        seedInitialTasks();
      } else {
        const loaded = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        // Ordenar per ordre o data de forma robusta
        setTasks(sortTasksList(loaded));
        setLoading(false);
        checkAndApplyDailyRollover(loaded);
      }
    }, (error) => {
      console.warn("Error escoltant la col·lecció 'per_fer':", error);
      // Fallback a dades locals
      setTasks(sortTasksList(INITIAL_SAMPLE_TASQUES));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Temporitzador per activar el canvi automàtic cada dia a les 00:05 exactes mentre l'app està oberta
  useEffect(() => {
    let timerId = null;

    const scheduleNextRollover = () => {
      const ms = msUntilNext0005();
      timerId = setTimeout(() => {
        setTasks(currentTasks => {
          checkAndApplyDailyRollover(currentTasks);
          return currentTasks;
        });
        scheduleNextRollover();
      }, ms);
    };

    scheduleNextRollover();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // 2. Carregar dades vinculables (Productes, Projectes, Maquinària, Esdeveniments)
  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productes"), (snap) => {
      setDbProductes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubProj = onSnapshot(collection(db, "projectes"), (snap) => {
      setDbProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubMaq = onSnapshot(collection(db, "producc_maquinaria"), (snap) => {
      setDbMaquinaria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubEsdev = onSnapshot(collection(db, "producc_esdeveniments"), (snap) => {
      setDbEsdeveniments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    return () => {
      unsubProd();
      unsubProj();
      unsubMaq();
      unsubEsdev();
    };
  }, []);

  // Sembrar dades inicials a Firestore
  const seedInitialTasks = async () => {
    try {
      setIsSyncing(true);
      const batch = writeBatch(db);
      INITIAL_SAMPLE_TASQUES.forEach(t => {
        const docRef = doc(db, "per_fer", t.id);
        batch.set(docRef, sanitizeData(t));
      });
      await batch.commit();
      setTasks(INITIAL_SAMPLE_TASQUES);
    } catch (e) {
      console.warn("Error sembrant dades inicials:", e);
      setTasks(INITIAL_SAMPLE_TASQUES);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  // Guardar tasca (nova o existent) a Firestore
  const handleSaveTask = async (taskData) => {
    setIsSyncing(true);
    try {
      const taskId = taskData.id || ('pf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5));
      const colTasks = tasks.filter(t => t.estat === (taskData.estat || 'idees'));
      const maxOrdre = colTasks.reduce((max, t) => Math.max(max, t.ordre ?? 0), 0);
      const clean = sanitizeData({
        ...taskData,
        id: taskId,
        ordre: taskData.ordre ?? (maxOrdre > 0 ? maxOrdre + 1000 : Date.now())
      });

      await setDoc(doc(db, "per_fer", taskId), clean, { merge: true });
      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Error desant la tasca:", err);
      alert("No s'ha pogut desar la tasca: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Eliminar tasca
  const handleDeleteTask = async (taskId) => {
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, "per_fer", taskId));
      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Error eliminant la tasca:", err);
      alert("No s'ha pogut eliminar la tasca: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Actualització ràpida de planificació ('ahir', 'avui', 'dema' o null)
  const handleQuickUpdatePlanificacio = async (taskId, newPlanificacio) => {
    const currentEffDate = getEffectivePlanningDate();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updated = {
      ...task,
      planificacio: newPlanificacio || null,
      planificacioDataUltimCanvi: newPlanificacio ? currentEffDate : null
    };

    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));

    try {
      await setDoc(doc(db, "per_fer", taskId), sanitizeData({
        planificacio: newPlanificacio || null,
        planificacioDataUltimCanvi: newPlanificacio ? currentEffDate : null
      }), { merge: true });
    } catch (err) {
      console.error("Error actualitzant planificació:", err);
    }
  };

  // Moure tasca a una altra columna
  const handleMoveToColumn = async (taskId, newColumnId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.estat === newColumnId) return;

    const isDone = newColumnId === 'enllestit';
    const targetColTasks = tasks.filter(t => t.estat === newColumnId);
    const maxOrdre = targetColTasks.reduce((max, t) => Math.max(max, t.ordre ?? 0), 0);
    const newOrdre = maxOrdre > 0 ? maxOrdre + 1000 : Date.now();
    const currentEffDate = getEffectivePlanningDate();

    // Quan una tasca passa a 'enllestit', si tenia planificació, es manté com a 'avui' durant la jornada actual
    let newPlanificacio = task.planificacio;
    let newPlanificacioDataUltimCanvi = task.planificacioDataUltimCanvi;
    if (isDone && task.planificacio) {
      newPlanificacio = 'avui';
      newPlanificacioDataUltimCanvi = currentEffDate;
    }

    const updated = {
      ...task,
      estat: newColumnId,
      ordre: newOrdre,
      planificacio: newPlanificacio,
      planificacioDataUltimCanvi: newPlanificacioDataUltimCanvi,
      dataCompletat: isDone ? (task.dataCompletat || new Date().toISOString()) : null
    };

    // Actualització optimista
    setTasks(prev => sortTasksList(prev.map(t => t.id === taskId ? updated : t)));

    try {
      await setDoc(doc(db, "per_fer", taskId), sanitizeData(updated), { merge: true });
    } catch (err) {
      console.error("Error movent tasca:", err);
    }
  };

  // Reordenar tasca amunt o avall dins de la mateixa columna
  const handleReorderTask = async (taskId, direction) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.estat === 'enllestit') return;

    // Obtenir les tasques d'aquesta columna en el seu ordre actual
    const colTasks = tasks.filter(t => t.estat === task.estat);
    const currentIndex = colTasks.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= colTasks.length) return;

    const newColTasks = [...colTasks];
    const [moved] = newColTasks.splice(currentIndex, 1);
    newColTasks.splice(targetIndex, 0, moved);

    // Reassignar ordres decreixents (l'índex 0 és a dalt de tot i té el valor més alt)
    const base = Date.now();
    const updatedColTasks = newColTasks.map((t, idx) => ({
      ...t,
      ordre: base + (newColTasks.length - idx) * 1000
    }));

    // Actualització optimista
    setTasks(prev => {
      const otherTasks = prev.filter(t => t.estat !== task.estat);
      return sortTasksList([...otherTasks, ...updatedColTasks]);
    });

    try {
      const batch = writeBatch(db);
      updatedColTasks.forEach(t => {
        batch.update(doc(db, "per_fer", t.id), { ordre: t.ordre });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error reordenant tasques:", err);
    }
  };

  // Canviar estat de subtasca (Checklist)
  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasques || []).map(st => 
      st.id === subtaskId ? { ...st, completada: !st.completada } : st
    );

    const updatedTask = { ...task, subtasques: updatedSubtasks };

    // Optimista
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await setDoc(doc(db, "per_fer", taskId), sanitizeData(updatedTask), { merge: true });
    } catch (err) {
      console.error("Error actualitzant subtasca:", err);
    }
  };

  // Gestió de Drag & Drop
  const handleDragStart = (e, task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverCard(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleMoveToColumn(taskId, colId);
    }
    setDraggedTaskId(null);
  };

  const handleCardDragOver = (e, targetTask) => {
    if (!draggedTaskId || draggedTaskId === targetTask.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = (e.clientY - rect.top) < (rect.height / 2);
    const position = isTop ? 'top' : 'bottom';
    if (dragOverCard?.id !== targetTask.id || dragOverCard?.position !== position) {
      setDragOverCard({ id: targetTask.id, position });
    }
  };

  const handleCardDragLeave = (e, targetTask) => {
    e.stopPropagation();
    if (dragOverCard?.id === targetTask.id) {
      setDragOverCard(null);
    }
  };

  const handleCardDrop = async (e, targetTask) => {
    e.preventDefault();
    e.stopPropagation();
    const movingTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    const dropPosition = dragOverCard?.position || 'top';

    setDragOverCard(null);
    setDragOverColumn(null);
    setDraggedTaskId(null);

    if (!movingTaskId || movingTaskId === targetTask.id) return;

    const movingTask = tasks.find(t => t.id === movingTaskId);
    if (!movingTask) return;

    const targetColId = targetTask.estat;
    const isTargetDone = targetColId === 'enllestit';

    // Tasques de la columna destí (sense la que s'està movent si ja hi era)
    const targetColTasks = tasks.filter(t => t.estat === targetColId && t.id !== movingTaskId);
    const targetIndex = targetColTasks.findIndex(t => t.id === targetTask.id);
    if (targetIndex === -1) return;

    const insertIndex = dropPosition === 'bottom' ? targetIndex + 1 : targetIndex;
    const currentEffDate = getEffectivePlanningDate();

    let newPlanificacio = movingTask.planificacio;
    let newPlanificacioDataUltimCanvi = movingTask.planificacioDataUltimCanvi;
    if (isTargetDone && movingTask.planificacio) {
      newPlanificacio = 'avui';
      newPlanificacioDataUltimCanvi = currentEffDate;
    }

    const updatedMovingTask = {
      ...movingTask,
      estat: targetColId,
      planificacio: newPlanificacio,
      planificacioDataUltimCanvi: newPlanificacioDataUltimCanvi,
      dataCompletat: isTargetDone ? (movingTask.dataCompletat || new Date().toISOString()) : null
    };

    const newColTasks = [...targetColTasks];
    newColTasks.splice(insertIndex, 0, updatedMovingTask);

    let batchUpdates = [];
    if (targetColId !== 'enllestit') {
      const base = Date.now();
      batchUpdates = newColTasks.map((t, idx) => ({
        ...t,
        ordre: base + (newColTasks.length - idx) * 1000
      }));
    } else {
      batchUpdates = [updatedMovingTask];
    }

    setTasks(prev => {
      const otherTasks = prev.filter(t => t.estat !== targetColId && t.id !== movingTaskId);
      return sortTasksList([...otherTasks, ...batchUpdates]);
    });

    try {
      const batch = writeBatch(db);
      batchUpdates.forEach(t => {
        batch.set(doc(db, "per_fer", t.id), sanitizeData(t), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error deixant caure sobre targeta:", err);
    }
  };

  // Filtrar tasques segons cerca, àmbit, prioritat i planificació diària
  const filteredTasks = tasks.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (t.titol || '').toLowerCase().includes(q);
      const matchDesc = (t.descripcio || '').toLowerCase().includes(q);
      const matchSub = (t.subtasques || []).some(st => (st.text || '').toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchSub) return false;
    }

    if (filterAmbit !== 'tots' && t.ambit !== filterAmbit) return false;
    if (filterPrioritat !== 'totes' && t.prioritat !== filterPrioritat) return false;
    if (filterEstat === 'pendents' && t.estat === 'enllestit') return false;
    if (filterEstat === 'enllestit' && t.estat !== 'enllestit') return false;

    // Filtre de planificació del dia de treball
    if (filterPlanificacio === 'avui' && t.planificacio !== 'avui') return false;
    if (filterPlanificacio === 'dema' && t.planificacio !== 'dema') return false;
    if (filterPlanificacio === 'ahir_endarrerits') {
      const isAhirOrDelayed = t.planificacio && (t.planificacio === 'ahir' || t.planificacio.startsWith('-'));
      if (!isAhirOrDelayed) return false;
    }
    if (filterPlanificacio === 'sense' && t.planificacio) return false;

    return true;
  });

  // Estadístiques ràpides
  const stats = {
    total: tasks.length,
    urgents: tasks.filter(t => t.prioritat === 'urgent' && t.estat !== 'enllestit').length,
    idees: tasks.filter(t => t.estat === 'idees').length,
    enCurs: tasks.filter(t => t.estat === 'al_taller').length,
    enllestits: tasks.filter(t => t.estat === 'enllestit').length,
    pendents: tasks.filter(t => t.estat !== 'enllestit').length,
    planificacioAvui: tasks.filter(t => t.planificacio === 'avui').length,
    planificacioAvuiFets: tasks.filter(t => t.planificacio === 'avui' && t.estat === 'enllestit').length,
    planificacioDema: tasks.filter(t => t.planificacio === 'dema' && t.estat !== 'enllestit').length,
    planificacioAhir: tasks.filter(t => t.planificacio && (t.planificacio === 'ahir' || t.planificacio.startsWith('-')) && t.estat !== 'enllestit').length
  };

  // Helper per a icona de columna (alt contrast negre/fosc)
  const renderColIcon = (iconName) => {
    switch (iconName) {
      case 'Lightbulb': return <Lightbulb className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0" />;
      case 'ListTodo': return <ListTodo className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0" />;
      case 'Hammer': return <Hammer className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0" />;
      case 'Hourglass': return <Hourglass className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0" />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-surface text-on-surface' : 'bg-surface text-on-surface'} transition-colors duration-200`}>
      
      {/* 1. TOP HEADER / APP BAR */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline/15 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Esquerra: Tornar & Títol de l'App */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('privat')}
              className="p-2 rounded-xl bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border border-outline/20 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Tornar a l'Àrea Privada"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight flex items-center gap-2">
                  <span>MÍNIM MÓN</span>
                  <span className="text-on-surface-variant/40 font-normal">|</span>
                  <span className="text-amber-600 dark:text-amber-400 font-sans text-sm sm:text-base uppercase tracking-wider font-extrabold">
                    PER FER
                  </span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-semibold border border-amber-500/20">
                  Kanban & Idees
                </span>
              </div>
              <p className="text-xs text-on-surface-variant hidden sm:block">
                Organitzador global de feines pendents, tallers, dissenys, xarxes i inspiració.
              </p>
            </div>
          </div>

          {/* Dreta: Accions globals & Botó Crear Tasca */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            
            {/* Canvi de Vista (Tauler / Llista) */}
            <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline/20">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban' 
                    ? 'bg-primary text-on-primary shadow-xs' 
                    : 'text-on-surface-variant hover:text-primary'
                }`}
                title="Vista Tauler Kanban"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tauler</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('llista')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'llista' 
                    ? 'bg-primary text-on-primary shadow-xs' 
                    : 'text-on-surface-variant hover:text-primary'
                }`}
                title="Vista Llista Ràpida"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Llista</span>
              </button>
            </div>

            {/* Selector de tema clar/fosc */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl bg-surface hover:bg-surface-container text-on-surface-variant border border-outline/20 transition-colors cursor-pointer"
              title={isDark ? "Passar a mode clar" : "Passar a mode fosc"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Estat de sincronització */}
            <span 
              className={`p-2 rounded-xl border border-outline/20 text-xs hidden sm:flex items-center gap-1.5 ${
                isSyncing ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'
              }`}
              title={isSyncing ? 'Sincronitzant amb Firestore...' : 'Sincronitzat amb Cloud Firestore'}
            >
              <Cloud className="w-4 h-4" />
            </span>

            {/* Botó Nova Tasca / Idea */}
            <button
              onClick={() => {
                setEditingTask(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tasca / Idea</span>
            </button>
          </div>
        </div>

        {/* 2. STATS PILLS BAR (Dues línies amb "Totes" a l'esquerra abastant les dues files) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-outline/10 bg-surface-container-lowest/50">
          <div className="flex items-stretch gap-2.5 sm:gap-3">
            {/* Botó "Totes" alt (abasta les dues files) */}
            {(() => {
              const isAll = filterAmbit === 'tots' && filterPrioritat === 'totes' && filterEstat === 'tots' && filterPlanificacio === 'totes';
              return (
                <button
                  type="button"
                  onClick={() => {
                    setFilterAmbit('tots');
                    setFilterPrioritat('totes');
                    setFilterEstat('tots');
                    setFilterPlanificacio('totes');
                  }}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shrink-0 transition-all cursor-pointer select-none shadow-xs min-w-[76px] ${
                    isAll 
                      ? 'bg-stone-900 text-white ring-2 ring-stone-900/30' 
                      : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100'
                  }`}
                  title="Mostrar totes les tasques sense cap filtre"
                >
                  <div className="flex items-center gap-1">
                    {isAll && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span className="font-extrabold uppercase tracking-wider text-[11px]">Totes</span>
                  </div>
                  <span className={`text-[12px] font-mono font-bold ${isAll ? 'text-stone-200' : 'text-stone-600'}`}>
                    ({stats.total})
                  </span>
                </button>
              );
            })()}

            {/* Contenidor de les dues línies de filtres */}
            <div className="flex flex-col justify-between gap-1.5 flex-1 min-w-0">
              
              {/* Línia 1: Pendents - Urgents - Avui - Demà - Ahir */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* 1. Botó "Pendents" */}
                {(() => {
                  const isPendents = filterEstat === 'pendents';
                  return (
                    <button
                      type="button"
                      onClick={() => setFilterEstat(isPendents ? 'tots' : 'pendents')}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isPendents
                          ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/50'
                          : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100'
                      }`}
                    >
                      {isPendents ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <span className={isPendents ? 'text-white' : 'text-stone-900'}>
                        Pendents: <strong className={isPendents ? 'text-white' : 'text-stone-900'}>{stats.pendents}</strong>
                      </span>
                    </button>
                  );
                })()}

                {/* 2. Botó "Urgents" */}
                {stats.urgents > 0 && (() => {
                  const isUrgent = filterPrioritat === 'urgent';
                  return (
                    <button
                      type="button"
                      onClick={() => setFilterPrioritat(isUrgent ? 'totes' : 'urgent')}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isUrgent
                          ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-400/50'
                          : 'bg-red-50 border border-red-300 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {isUrgent ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                      )}
                      <span className={isUrgent ? 'text-white' : 'text-red-700 font-extrabold'}>{stats.urgents} Urgents</span>
                    </button>
                  );
                })()}

                {/* 3. Botó "Avui" */}
                {(() => {
                  const isAvui = filterPlanificacio === 'avui';
                  return (
                    <button
                      type="button"
                      onClick={() => setFilterPlanificacio(isAvui ? 'totes' : 'avui')}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isAvui
                          ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400 font-extrabold'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      {isAvui ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                      <span>Avui ({stats.planificacioAvui})</span>
                    </button>
                  );
                })()}

                {/* 4. Botó "Demà" */}
                {(() => {
                  const isDema = filterPlanificacio === 'dema';
                  return (
                    <button
                      type="button"
                      onClick={() => setFilterPlanificacio(isDema ? 'totes' : 'dema')}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isDema
                          ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-400 font-extrabold'
                          : 'bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20'
                      }`}
                    >
                      {isDema ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Clock className="w-3 h-3 text-sky-500 shrink-0" />}
                      <span>Demà ({stats.planificacioDema})</span>
                    </button>
                  );
                })()}

                {/* 5. Botó "Ahir / Endarrerits" */}
                {(() => {
                  const isAhir = filterPlanificacio === 'ahir_endarrerits';
                  return (
                    <button
                      type="button"
                      onClick={() => setFilterPlanificacio(isAhir ? 'totes' : 'ahir_endarrerits')}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isAhir
                          ? 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-400 font-extrabold'
                          : 'bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20'
                      }`}
                    >
                      {isAhir ? <Check className="w-3 h-3 stroke-[2.5]" /> : <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />}
                      <span>Ahir / Endarrerits ({stats.planificacioAhir})</span>
                    </button>
                  );
                })()}
              </div>

              {/* Línia 2: Resta (Àmbits: Disseny, Taller, Posting, Web, Compres, Idees + Fets) */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {[
                  { id: 'disseny', nom: 'Disseny', icon: Palette, activeBg: 'bg-rose-600 text-white ring-rose-400/50', iconColor: 'text-rose-500' },
                  { id: 'taller', nom: 'Taller', icon: Hammer, activeBg: 'bg-amber-600 text-white ring-amber-400/50', iconColor: 'text-amber-500' },
                  { id: 'posting', nom: 'Posting', icon: Share2, activeBg: 'bg-pink-600 text-white ring-pink-400/50', iconColor: 'text-pink-500' },
                  { id: 'web', nom: 'Web', icon: Globe, activeBg: 'bg-cyan-700 text-white ring-cyan-400/50', iconColor: 'text-cyan-500' },
                  { id: 'compres', nom: 'Compres', icon: ShoppingBag, activeBg: 'bg-indigo-600 text-white ring-indigo-400/50', iconColor: 'text-indigo-500' },
                  { id: 'futur', nom: 'Idees', icon: Sparkles, activeBg: 'bg-violet-600 text-white ring-violet-400/50', iconColor: 'text-violet-500' },
                ].map(amb => {
                  const isActive = filterAmbit === amb.id;
                  const IconComponent = amb.icon;
                  return (
                    <button
                      key={amb.id}
                      type="button"
                      onClick={() => setFilterAmbit(isActive ? 'tots' : amb.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? `${amb.activeBg} shadow-xs ring-2`
                          : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100'
                      }`}
                    >
                      {isActive ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <IconComponent className={`w-3 h-3 ${amb.iconColor} shrink-0`} />
                      )}
                      <span className={isActive ? 'text-white' : 'text-stone-900 font-bold'}>{amb.nom}</span>
                    </button>
                  );
                })}

                {/* Botó "Fets" */}
                {(() => {
                  const isFets = filterEstat === 'enllestit';
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const next = isFets ? 'tots' : 'enllestit';
                        setFilterEstat(next);
                        if (next === 'enllestit') {
                          setIsEnllestitCollapsed(false);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isFets
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                          : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100'
                      }`}
                    >
                      {isFets ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                      <span className={isFets ? 'text-white' : 'text-stone-900 font-bold'}>{stats.enllestits} fets</span>
                    </button>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>

        {/* 3. SEARCH & DROPDOWN FILTERS (Línia 2: situat a sota) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-outline/10 bg-surface-container-low/40 flex items-center justify-between gap-3 flex-wrap">
          {/* Cerca ràpida */}
          <div className="relative flex-1 min-w-[220px] sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 opacity-80" />
            <input
              type="text"
              placeholder="Cerca tasques o idees..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs outline-none focus:border-stone-500 transition-all placeholder:text-stone-400 font-medium"
            />
          </div>

          {/* Selectors de filtres */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Planificació Diària */}
            <select
              value={filterPlanificacio}
              onChange={e => setFilterPlanificacio(e.target.value)}
              className="px-3 py-1.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs outline-none focus:border-stone-500 transition-all cursor-pointer font-bold"
            >
              <option value="totes">Tota planificació</option>
              <option value="avui">🌟 Avui ({stats.planificacioAvui})</option>
              <option value="dema">⏳ Demà ({stats.planificacioDema})</option>
              <option value="ahir_endarrerits">⚠️ Ahir / Endarrerits ({stats.planificacioAhir})</option>
              <option value="sense">Sense planificar</option>
            </select>

            {/* Selector d'Àmbit */}
            <select
              value={filterAmbit}
              onChange={e => setFilterAmbit(e.target.value)}
              className="px-3 py-1.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs outline-none focus:border-stone-500 transition-all cursor-pointer font-bold"
            >
              <option value="tots">Tots els àmbits</option>
              {PER_FER_AMBITS.map(amb => (
                <option key={amb.id} value={amb.id}>
                  {amb.nom}
                </option>
              ))}
            </select>

            {/* Selector de Prioritat */}
            <select
              value={filterPrioritat}
              onChange={e => setFilterPrioritat(e.target.value)}
              className="px-3 py-1.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs outline-none focus:border-stone-500 transition-all cursor-pointer font-bold"
            >
              <option value="totes">Totes prioritats</option>
              {PER_FER_PRIORITATS.map(pr => (
                <option key={pr.id} value={pr.id}>
                  {pr.nom}
                </option>
              ))}
            </select>

            {(searchQuery || filterAmbit !== 'tots' || filterPrioritat !== 'totes' || filterEstat !== 'tots' || filterPlanificacio !== 'totes') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterAmbit('tots');
                  setFilterPrioritat('totes');
                  setFilterEstat('tots');
                  setFilterPlanificacio('totes');
                }}
                className="px-3 py-1.5 text-xs text-error hover:bg-error/10 border border-error/30 rounded-xl transition-colors cursor-pointer shrink-0 font-bold"
                title="Netejar filtres"
              >
                Netejar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-on-surface-variant font-medium">Carregant el tauler Per Fer...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          
          /* ============================================================== */
          /* VISTA TAULER KANBAN ARTESANAL (5 COLUMNES)                    */
          /* ============================================================== */
          <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
            {PER_FER_COLUMNS.map(column => {
              const colTasks = filteredTasks.filter(t => t.estat === column.id);
              const isOver = dragOverColumn === column.id;

              // Si és la columna "Enllestit" i està replegada
              if (column.id === 'enllestit' && isEnllestitCollapsed) {
                return (
                  <React.Fragment key={column.id}>
                    {/* Versió Desktop: Barra vertical esvelta */}
                    <div
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onClick={handleToggleEnllestitCollapse}
                      title="Clica per desplegar la columna Enllestit (o arrossega tasques aquí per completar-les)"
                      className={`hidden xl:flex flex-col items-center py-3.5 px-1.5 rounded-2xl border transition-all duration-200 cursor-pointer w-14 shrink-0 select-none group min-h-[500px] ${
                        isOver
                          ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/15'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40 hover:border-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {/* Botó toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEnllestitCollapse();
                        }}
                        className="p-1.5 rounded-xl bg-white dark:bg-stone-800 shadow-2xs border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:scale-110 transition-transform cursor-pointer"
                        title="Desplegar Enllestit"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Icona i comptador */}
                      <div className="mt-3 flex flex-col items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-extrabold text-stone-900 dark:text-stone-100 bg-emerald-200/90 dark:bg-emerald-900/80 border border-emerald-400/50 shadow-2xs">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Text vertical */}
                      <div className="mt-6 flex-1 flex items-center justify-center">
                        <span
                          className="text-xs font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          {column.titol}
                        </span>
                      </div>

                      {/* Indicador inferior */}
                      <div className="mt-auto pt-2 text-[10px] text-center text-emerald-700/70 dark:text-emerald-400/70 font-bold leading-tight">
                        {isOver ? 'DEIXA ANAR!' : 'Arrossega aquí'}
                      </div>
                    </div>

                    {/* Versió Mòbil / Tablet (< xl): Barra horitzontal replegada */}
                    <div
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onClick={handleToggleEnllestitCollapse}
                      className={`xl:hidden flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer w-full select-none ${
                        isOver
                          ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/15'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/60 dark:border-emerald-800/40 hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          {column.titol}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-extrabold text-stone-900 dark:text-stone-100 bg-emerald-200/90 dark:bg-emerald-900/80 border border-emerald-400/50 shadow-2xs">
                          {colTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEnllestitCollapse();
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <span>Desplegar</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              }

              // Columnes regulars O Enllestit desplegada
              return (
                <div
                  key={column.id}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 bg-surface-container-low/50 flex-1 min-w-0 w-full xl:w-auto ${
                    isOver 
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
                      : 'border-outline/15 hover:border-outline/30'
                  }`}
                >
                  {/* Capçalera de Columna */}
                  <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between gap-2 ${column.headerBg}`}>
                    <div className="flex items-center gap-2 truncate">
                      {renderColIcon(column.iconName)}
                      <h3 className="font-extrabold text-xs uppercase tracking-wider truncate text-stone-900">
                        {column.titol}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold shrink-0 text-stone-900 shadow-2xs ${column.badgeBg}`}>
                        {colTasks.length}
                      </span>
                      {column.id === 'enllestit' && (
                        <button
                          type="button"
                          onClick={handleToggleEnllestitCollapse}
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                          title="Replegar columna Enllestit"
                        >
                          <ChevronRight className="w-4 h-4 hidden xl:block" />
                          <ChevronUp className="w-4 h-4 xl:hidden" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Descripció curta de la columna */}
                  <div className="px-3.5 pt-2 pb-1 text-[11px] text-stone-800 font-bold italic truncate">
                    {column.subtitol}
                  </div>

                  {/* Llista de Targetes dins la Columna */}
                  <div className="p-3 space-y-3 min-h-[140px] flex-1">
                    {colTasks.length > 0 ? (
                      colTasks.map((task, idx) => (
                        <PerFerCard
                          key={task.id}
                          task={task}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setModalOpen(true);
                          }}
                          onMoveToColumn={handleMoveToColumn}
                          onToggleSubtask={handleToggleSubtask}
                          onUpdatePlanificacio={handleQuickUpdatePlanificacio}
                          onDelete={handleDeleteTask}
                          onDragStart={handleDragStart}
                          canMoveUp={column.id !== 'enllestit' && idx > 0}
                          canMoveDown={column.id !== 'enllestit' && idx < colTasks.length - 1}
                          onMoveUp={() => handleReorderTask(task.id, 'up')}
                          onMoveDown={() => handleReorderTask(task.id, 'down')}
                          onCardDragOver={handleCardDragOver}
                          onCardDragLeave={handleCardDragLeave}
                          onCardDrop={handleCardDrop}
                          isDragOver={dragOverCard?.id === task.id}
                          dragOverPosition={dragOverCard?.id === task.id ? dragOverCard.position : null}
                        />
                      ))
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-outline/20 flex flex-col items-center justify-center text-center p-3 text-[11px] text-on-surface-variant/60">
                        <span>Cap tasca aquí</span>
                        <span className="text-[10px] opacity-75">Arrossega una targeta o crea'n una</span>
                      </div>
                    )}
                  </div>

                  {/* Botó ràpid al peu de la columna per afegir tasca directament a aquesta columna */}
                  <div className="p-2 border-t border-outline/10">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask({ estat: column.id, ambit: 'taller', prioritat: 'normal' });
                        setModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Afegir aquí</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ============================================================== */
          /* VISTA LLISTA RÀPIDA (TAULA / FILERA DE TASQUES)               */
          /* ============================================================== */
          <div className="bg-surface-container-lowest rounded-2xl border border-outline/15 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-outline/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-primary">Llista de Tasques Globals</h3>
                <p className="text-xs text-on-surface-variant">
                  {filteredTasks.length} tasques trobades amb els filtres actius
                </p>
              </div>
            </div>

            {filteredTasks.length > 0 ? (
              <div className="divide-y divide-outline/10">
                {filteredTasks.map(task => {
                  const ambitConfig = PER_FER_AMBITS.find(a => a.id === task.ambit) || PER_FER_AMBITS[PER_FER_AMBITS.length - 1];
                  const colConfig = PER_FER_COLUMNS.find(c => c.id === task.estat) || PER_FER_COLUMNS[0];
                  const prioritatConfig = PER_FER_PRIORITATS.find(p => p.id === task.prioritat) || PER_FER_PRIORITATS[1];
                  const subtasques = Array.isArray(task.subtasques) ? task.subtasques : [];
                  const completedSub = subtasques.filter(st => st.completada).length;

                  return (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setEditingTask(task);
                        setModalOpen(true);
                      }}
                      className="p-4 hover:bg-surface-container-low transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Esquerra: Estat, Checkbox ràpid, Títol i Subtasques */}
                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        {/* Checkbox ràpid per marcar completat */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToColumn(task.id, task.estat === 'enllestit' ? 'per_fer' : 'enllestit');
                          }}
                          className="mt-0.5 sm:mt-0 p-1 text-on-surface-variant hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                          title={task.estat === 'enllestit' ? "Reobrir tasca" : "Marcar com a enllestit"}
                        >
                          {task.estat === 'enllestit' ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Square className="w-5 h-5 hover:text-primary" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${task.estat === 'enllestit' ? 'line-through text-on-surface-variant/70' : 'text-on-surface'}`}>
                              {task.titol}
                            </span>

                            {/* Badge d'Àmbit */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ambitConfig.badgeClass}`}>
                              {ambitConfig.nom}
                            </span>

                            {/* Badge d'Urgència */}
                            {task.prioritat === 'urgent' && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${prioritatConfig.badgeClass}`}>
                                Urgent
                              </span>
                            )}

                            {/* Badge de Planificació */}
                            {task.planificacio && (() => {
                              const b = getPlanificacioBadgeInfo(task.planificacio);
                              return (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.badgeClass}`}>
                                  {b.label}
                                </span>
                              );
                            })()}
                          </div>

                          {task.descripcio && (
                            <p className="text-xs text-on-surface-variant line-clamp-1">
                              {task.descripcio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dreta: Columna actual, Subtasques, Planificació i Data */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs text-stone-900">
                        {/* Selector de Planificació ràpid a la llista */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const badgeInfo = getPlanificacioBadgeInfo(task.planificacio);
                            const isAvui = task.planificacio === 'avui';
                            const isDema = task.planificacio === 'dema';
                            const isAhirOrDelayed = task.planificacio && (task.planificacio === 'ahir' || task.planificacio.startsWith('-'));
                            return (
                              <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-300">
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdatePlanificacio(task.id, isAhirOrDelayed ? null : 'ahir')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isAhirOrDelayed ? 'bg-orange-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                                  }`}
                                  title={isAhirOrDelayed ? `Assignat: ${badgeInfo.label}. Clic per desmarcar` : "Marcar com a Ahir"}
                                >
                                  {isAhirOrDelayed ? badgeInfo.label : 'Ahir'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdatePlanificacio(task.id, isAvui ? null : 'avui')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isAvui ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                                  }`}
                                  title={isAvui ? "Assignat: Avui. Clic per desmarcar" : "Marcar com a Avui"}
                                >
                                  Avui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdatePlanificacio(task.id, isDema ? null : 'dema')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isDema ? 'bg-sky-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                                  }`}
                                  title={isDema ? "Assignat: Demà. Clic per desmarcar" : "Marcar com a Demà"}
                                >
                                  Demà
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Indicador de subtasques */}
                        {subtasques.length > 0 && (
                          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-white font-bold text-stone-900 border border-stone-300">
                            {completedSub}/{subtasques.length} passos
                          </span>
                        )}

                        {/* Data límit */}
                        {task.dataLimit && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-stone-900 px-2 py-0.5 rounded bg-white border border-stone-300">
                            <Calendar className="w-3 h-3 text-stone-800" />
                            <span>{task.dataLimit}</span>
                          </span>
                        )}

                        {/* Selector d'estat ràpid */}
                        <div onClick={e => e.stopPropagation()}>
                          <select
                            value={task.estat}
                            onChange={(e) => handleMoveToColumn(task.id, e.target.value)}
                            className="px-2.5 py-1 bg-white text-stone-900 rounded-lg border border-stone-300 text-xs font-bold outline-none focus:border-stone-500 cursor-pointer"
                          >
                            {PER_FER_COLUMNS.map(col => (
                              <option key={col.id} value={col.id}>
                                {col.titol}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-on-surface-variant">
                No hi ha cap tasca que coincideixi amb la cerca o els filtres.
              </div>
            )}
          </div>
        )}

      </main>

      {/* 4. MODAL PER CREAR / EDITAR TASCA */}
      <PerFerTaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        dbProductes={dbProductes}
        dbProjects={dbProjects}
        dbMaquinaria={dbMaquinaria}
        dbEsdeveniments={dbEsdeveniments}
        isDark={isDark}
      />

    </div>
  );
}
