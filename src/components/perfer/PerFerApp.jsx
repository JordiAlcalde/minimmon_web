import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Search, Filter, Sun, Moon, Cloud, CheckSquare, Square, Check,
  Lightbulb, ListTodo, Hammer, Hourglass, CheckCircle2, AlertTriangle, 
  Clock, LayoutGrid, List, Sparkles, ChevronRight, Layers, Trash2, 
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

export default function PerFerApp({ setActiveTab }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Vistes i Filtres
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'llista'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAmbit, setFilterAmbit] = useState('tots');
  const [filterPrioritat, setFilterPrioritat] = useState('totes');
  const [filterEstat, setFilterEstat] = useState('tots'); // 'tots' | 'pendents' | 'enllestit'

  // Modal de creació / edició
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Dades connectades del catàleg per a vinculació opcional
  const [dbProductes, setDbProductes] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [dbMaquinaria, setDbMaquinaria] = useState([]);

  // Estat de Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

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
        // Ordenar per ordre o data
        loaded.sort((a, b) => (b.ordre ?? 0) - (a.ordre ?? 0));
        setTasks(loaded);
        setLoading(false);
      }
    }, (error) => {
      console.warn("Error escoltant la col·lecció 'per_fer':", error);
      // Fallback a dades locals
      setTasks(INITIAL_SAMPLE_TASQUES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Carregar dades vinculables (Productes, Projectes, Maquinària)
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

    return () => {
      unsubProd();
      unsubProj();
      unsubMaq();
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
      const clean = sanitizeData({
        ...taskData,
        id: taskId,
        ordre: taskData.ordre ?? Date.now()
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

  // Moure tasca a una altra columna
  const handleMoveToColumn = async (taskId, newColumnId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.estat === newColumnId) return;

    const isDone = newColumnId === 'enllestit';
    const updated = {
      ...task,
      estat: newColumnId,
      dataCompletat: isDone ? new Date().toISOString() : null
    };

    // Actualització optimista
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));

    try {
      await setDoc(doc(db, "per_fer", taskId), sanitizeData(updated), { merge: true });
    } catch (err) {
      console.error("Error movent tasca:", err);
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
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleMoveToColumn(taskId, colId);
    }
    setDraggedTaskId(null);
  };

  // Filtrar tasques segons cerca, àmbit i prioritat
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

    return true;
  });

  // Estadístiques ràpides
  const stats = {
    total: tasks.length,
    urgents: tasks.filter(t => t.prioritat === 'urgent' && t.estat !== 'enllestit').length,
    idees: tasks.filter(t => t.estat === 'idees').length,
    enCurs: tasks.filter(t => t.estat === 'al_taller').length,
    enllestits: tasks.filter(t => t.estat === 'enllestit').length,
    pendents: tasks.filter(t => t.estat !== 'enllestit').length
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
              onClick={() => setIsDark(!isDark)}
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

        {/* 2. STATS PILLS BAR (Línia 1: Píndoles de categories i estats) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-outline/10 bg-surface-container-lowest/50">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* 1. Botó "Totes" */}
            {(() => {
              const isAll = filterAmbit === 'tots' && filterPrioritat === 'totes' && filterEstat === 'tots';
              return (
                <button
                  type="button"
                  onClick={() => {
                    setFilterAmbit('tots');
                    setFilterPrioritat('totes');
                    setFilterEstat('tots');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isAll 
                      ? 'bg-stone-900 text-white shadow-xs' 
                      : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {isAll && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span className={isAll ? 'text-white' : 'text-stone-900'}>Totes ({stats.total})</span>
                </button>
              );
            })()}

            {/* 2. Botó "Pendents" */}
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
                  <span className={isPendents ? 'text-white' : 'text-stone-900'}>Pendents: <strong className={isPendents ? 'text-white' : 'text-stone-900'}>{stats.pendents}</strong></span>
                </button>
              );
            })()}

            {/* 3. Botó "Urgents" */}
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

            {/* 4. Àmbits (Disseny, Taller, Posting, Web, Compres, Futur) */}
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

            {/* 5. Botó "Fets" */}
            {(() => {
              const isFets = filterEstat === 'enllestit';
              return (
                <button
                  type="button"
                  onClick={() => setFilterEstat(isFets ? 'tots' : 'enllestit')}
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

            {(searchQuery || filterAmbit !== 'tots' || filterPrioritat !== 'totes' || filterEstat !== 'tots') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterAmbit('tots');
                  setFilterPrioritat('totes');
                  setFilterEstat('tots');
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
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
            {PER_FER_COLUMNS.map(column => {
              const colTasks = filteredTasks.filter(t => t.estat === column.id);
              const isOver = dragOverColumn === column.id;

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 bg-surface-container-low/50 ${
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
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold shrink-0 text-stone-900 shadow-2xs ${column.badgeBg}`}>
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Descripció curta de la columna */}
                  <div className="px-3.5 pt-2 pb-1 text-[11px] text-stone-800 font-bold italic truncate">
                    {column.subtitol}
                  </div>

                  {/* Llista de Targetes dins la Columna */}
                  <div className="p-3 space-y-3 min-h-[140px] flex-1">
                    {colTasks.length > 0 ? (
                      colTasks.map(task => (
                        <PerFerCard
                          key={task.id}
                          task={task}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setModalOpen(true);
                          }}
                          onMoveToColumn={handleMoveToColumn}
                          onToggleSubtask={handleToggleSubtask}
                          onDelete={handleDeleteTask}
                          onDragStart={handleDragStart}
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
                          </div>

                          {task.descripcio && (
                            <p className="text-xs text-on-surface-variant line-clamp-1">
                              {task.descripcio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dreta: Columna actual, Subtasques i Data */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs text-stone-900">
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
        isDark={isDark}
      />

    </div>
  );
}
