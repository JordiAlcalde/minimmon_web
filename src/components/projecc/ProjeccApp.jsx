import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sun, Moon, Sparkles, FolderKanban, 
  Layers, Plus, Clock, Database, Cloud, RefreshCw, ListChecks,
  Globe, Boxes, Share2
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

import { ProjeccList } from './ProjeccList';
import { ProjeccDetail } from './ProjeccDetail';
import { ProjeccTimerView } from './ProjeccTimerView';
import { ProjeccSessionsModal } from './ProjeccSessionsModal';
import { ProjeccAnalytics } from './ProjeccAnalytics';
import { ProjeccReportView } from './ProjeccReportView';
import { ProjeccFormModal } from './ProjeccFormModal';
import { ProjeccMestreTasquesModal } from './ProjeccMestreTasquesModal';
import { ProjeccActiveTimersDock } from './ProjeccActiveTimersDock';
import { INITIAL_MESTRE_TASQUES } from '../../data/projeccInitialData';

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

export default function ProjeccApp({ setActiveTab }) {
  const [isDark, setIsDark] = useState(true);
  const [items, setItems] = useState([]);
  const [mestreTasques, setMestreTasques] = useState(INITIAL_MESTRE_TASQUES);
  const [existingProjects, setExistingProjects] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Vistes: 'list' | 'detail' | 'timer' | 'analytics' | 'report'
  const [currentView, setCurrentView] = useState('list');
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Cronòmetres simultanis en curs (fins a 3 ranures)
  const [activeTimers, setActiveTimers] = useState(() => {
    try {
      const saved = localStorage.getItem('minimmon_projecc_active_timers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Error llegint cronòmetres actius de localStorage:", e);
    }
    return [];
  });
  const [activeTimerId, setActiveTimerId] = useState(null);
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMestreModalOpen, setIsMestreModalOpen] = useState(false);
  const [editingItemData, setEditingItemData] = useState(null);
  const [sessionModalTask, setSessionModalTask] = useState(null);
  const [sessionModalInitialManual, setSessionModalInitialManual] = useState(false);

  // 1. Sincronització amb Firestore per a la col·lecció 'projecc_items'
  useEffect(() => {
    const unsubProjecc = onSnapshot(collection(db, "projecc_items"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.dataModificacio || '').localeCompare(a.dataModificacio || ''));
      setItems(list);
    }, (err) => {
      console.warn("Error sincronitzant projecc_items a Firestore:", err);
    });

    // 2. Sincronització del Catàleg Mestre de Tasques
    const unsubMestre = onSnapshot(collection(db, "projecc_tasques_mestre"), async (snapshot) => {
      if (!snapshot.empty) {
        const mList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMestreTasques(mList);
      } else {
        // Inicialitzar Firestore si és buit
        try {
          const batch = writeBatch(db);
          INITIAL_MESTRE_TASQUES.forEach(t => {
            const docRef = doc(db, "projecc_tasques_mestre", t.id);
            const { id, ...tData } = t;
            batch.set(docRef, sanitizeData(tData));
          });
          await batch.commit();
        } catch (e) {
          console.warn("Inicialitzant mestre tasques:", e);
        }
      }
    }, (err) => console.warn("Error sincronitzant mestre tasques:", err));

    // 3. Carregar projectes i productes existents de la BD oficial
    const unsubProjects = onSnapshot(collection(db, "projectes"), (snapshot) => {
      setExistingProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error carregant projectes:", err));

    const unsubProducts = onSnapshot(collection(db, "productes"), (snapshot) => {
      setExistingProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error carregant productes:", err));

    return () => {
      unsubProjecc();
      unsubMestre();
      unsubProjects();
      unsubProducts();
    };
  }, []);

  // Persistència automàtica de les ranures de cronòmetre a localStorage
  useEffect(() => {
    try {
      localStorage.setItem('minimmon_projecc_active_timers', JSON.stringify(activeTimers));
    } catch (e) {
      console.warn("Error desant cronòmetres actius a localStorage:", e);
    }
  }, [activeTimers]);

  const selectedItem = items.find(i => i.id === selectedItemId) || null;

  // Actualització o creació d'un element a Firestore amb actualització optimista local
  const handleSaveItem = async (itemData) => {
    setIsSyncing(true);
    const updatedWithDate = {
      ...itemData,
      dataModificacio: new Date().toISOString()
    };

    // Actualització local immediata
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === itemData.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedWithDate;
        return copy;
      }
      return [updatedWithDate, ...prev];
    });

    try {
      const docRef = doc(db, "projecc_items", itemData.id);
      const { id, ...dataToSave } = updatedWithDate;
      await setDoc(docRef, sanitizeData(dataToSave), { merge: true });
    } catch (e) {
      console.error("Error desant element a Firestore:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Desar una nova sessió de cronometratge a una tasca
  const handleSaveSession = async (itemId, taskId, newSession) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updatedTasks = (item.tasques || []).map(t => {
      if (t.id === taskId) {
        const currentSessions = Array.isArray(t.sessions) ? t.sessions : [];
        return {
          ...t,
          sessions: [...currentSessions, newSession]
        };
      }
      return t;
    });

    await handleSaveItem({
      ...item,
      tasques: updatedTasks
    });

    // Tornar a la vista de detall
    setCurrentView('detail');
  };

  // Actualitzar sessions des del modal
  const handleUpdateSessions = async (taskId, updatedSessions) => {
    if (!selectedItem) return;
    const updatedTasks = (selectedItem.tasques || []).map(t => {
      if (t.id === taskId) {
        return { ...t, sessions: updatedSessions };
      }
      return t;
    });

    await handleSaveItem({
      ...selectedItem,
      tasques: updatedTasks
    });
  };

  // Actualitzar conjunt de tasques d'un item
  const handleUpdateTasks = async (itemId, newTasks) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await handleSaveItem({
      ...item,
      tasques: newTasks
    });
  };

  // Desar Catàleg Mestre de Tasques
  const handleSaveMestreTasques = async (newMestreList) => {
    setMestreTasques(newMestreList);
    try {
      const currentMap = new Map(mestreTasques.map(t => [t.id, t]));
      const nextMap = new Map(newMestreList.map(t => [t.id, t]));

      // 1. Eliminar documents suprimits
      for (const [id] of currentMap) {
        if (!nextMap.has(id)) {
          await deleteDoc(doc(db, "projecc_tasques_mestre", id)).catch(e => console.error("Error eliminant tasca mestre:", e));
        }
      }

      // 2. Afegir o actualitzar
      for (const [id, t] of nextMap) {
        const { id: _, ...tData } = t;
        await setDoc(doc(db, "projecc_tasques_mestre", id), sanitizeData(tData), { merge: true });
      }
    } catch (e) {
      console.error("Error guardant catàleg mestre:", e);
    }
  };

  // Bloquejar / Tancar control
  const handleToggleLock = async (itemId, close) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await handleSaveItem({
      ...item,
      estat: close ? 'tancat' : 'en_curs'
    });
  };

  // Eliminar projecte o producte de Projecc
  const handleDeleteItem = async (itemId) => {
    const itemToDelete = items.find(i => i.id === itemId);
    const nom = itemToDelete?.nomDefinitiu || itemToDelete?.nomProvisional || itemToDelete?.nom || 'aquest registre';
    const tipusNom = itemToDelete?.tipus === 'projecte' ? 'el projecte' : 'el producte';

    if (!window.confirm(`Vols eliminar definitivament ${tipusNom} "${nom}" i totes les seves tasques i temps registrats?\n\nAquesta acció no es pot desfer.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "projecc_items", itemId));
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
        setCurrentView('list');
      }
    } catch (e) {
      console.error("Error eliminant element de Projecc:", e);
      alert("S'ha produït un error en eliminar el registre.");
    }
  };

  // Traspàs a BD oficial
  const handleTransferToDb = async (item) => {
    setIsSyncing(true);
    try {
      const targetCollection = item.tipus === 'projecte' ? 'projectes' : 'productes';
      const targetId = item.id;
      const docRef = doc(db, targetCollection, targetId);

      const payload = item.tipus === 'projecte' ? {
        title: item.nomDefinitiu || item.nom,
        client: item.nomClient || '',
        category: 'Projectes a Mida',
        description: item.notes || '',
        date: item.dataInici || new Date().toISOString().split('T')[0],
        images: Array.isArray(item.mostresClient) ? item.mostresClient.map(m => typeof m === 'string' ? m : m.url) : []
      } : {
        name: item.nomDefinitiu || item.nom,
        description: item.notes || '',
        active: true,
        images: Array.isArray(item.mostresClient) ? item.mostresClient.map(m => typeof m === 'string' ? m : m.url) : []
      };

      await setDoc(docRef, sanitizeData(payload), { merge: true });

      // Marcar com a traspassat
      await handleSaveItem({
        ...item,
        traspassat: true,
        existentId: targetId
      });
    } catch (e) {
      console.error("Error traspassant a BD oficial:", e);
      alert("S'ha produït un error en traspassar les dades.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Obrir formulari per a nou element
  const handleOpenNewModal = (defaultType = 'projecte') => {
    setEditingItemData({ tipus: defaultType });
    setIsFormModalOpen(true);
  };

  // Obrir formulari per editar
  const handleOpenEditModal = (item) => {
    setEditingItemData(item);
    setIsFormModalOpen(true);
  };

  // Iniciar o saltar a una ranura de cronòmetre (fins a 3 simultànies)
  const handleStartTimer = (item, task) => {
    const timerKey = `${item.id}_${task.id}`;
    const existing = activeTimers.find(t => t.id === timerKey);

    if (existing) {
      if (!existing.isRunning) {
        setActiveTimers(prev => prev.map(t => t.id === timerKey ? {
          ...t,
          isRunning: true,
          startTimestamp: Date.now()
        } : t));
      }
      setSelectedItemId(item.id);
      setActiveTimerId(timerKey);
      setCurrentView('timer');
      return;
    }

    if (activeTimers.length >= 3) {
      alert("Ja tens 3 tasques simultànies en marxa al taller (el màxim permès).\n\nFinalitza o cancel·la alguna de les ranures actuals abans d'iniciar-ne una de nova.");
      return;
    }

    const now = new Date();
    const existingSessions = Array.isArray(task.sessions) ? task.sessions : [];
    const prevSecs = existingSessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);

    const newTimer = {
      id: timerKey,
      itemId: item.id,
      itemNom: item.nomDefinitiu || item.nomProvisional || item.nom || 'Sense títol',
      itemTipus: item.tipus || 'projecte',
      nomClient: item.nomClient || '',
      taskId: task.id,
      taskNom: task.nom,
      taskDesc: task.descripcio || '',
      horaInici: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTimestamp: Date.now(),
      accumulatedSeconds: 0,
      isRunning: true,
      memoNotes: '',
      sessionPhotos: [],
      previousTaskSeconds: prevSecs
    };

    setActiveTimers(prev => [...prev, newTimer]);
    setSelectedItemId(item.id);
    setActiveTimerId(timerKey);
    setCurrentView('timer');
  };

  // Pausar o reprendre ranura de cronòmetre
  const handleTogglePauseTimer = (timerId) => {
    setActiveTimers(prev => prev.map(t => {
      if (t.id === timerId) {
        if (t.isRunning) {
          const live = Math.floor((Date.now() - t.startTimestamp) / 1000);
          return {
            ...t,
            isRunning: false,
            accumulatedSeconds: (Number(t.accumulatedSeconds) || 0) + (live > 0 ? live : 0),
            startTimestamp: null
          };
        } else {
          return {
            ...t,
            isRunning: true,
            startTimestamp: Date.now()
          };
        }
      }
      return t;
    }));
  };

  // Actualitzar dades (notes o fotos) d'una ranura
  const handleUpdateTimerData = (timerId, updates) => {
    setActiveTimers(prev => prev.map(t => t.id === timerId ? { ...t, ...updates } : t));
  };

  // Finalitzar ranura i desar a Firestore
  const handleFinishActiveTimer = async (timerId, sessionData) => {
    const timer = activeTimers.find(t => t.id === timerId);
    if (!timer) return;

    await handleSaveSession(timer.itemId, timer.taskId, sessionData);

    const remaining = activeTimers.filter(t => t.id !== timerId);
    setActiveTimers(remaining);

    if (remaining.length > 0) {
      setActiveTimerId(remaining[0].id);
      setSelectedItemId(remaining[0].itemId);
    } else {
      setActiveTimerId(null);
      setCurrentView('detail');
    }
  };

  // Descartar / cancel·lar ranura
  const handleDiscardActiveTimer = (timerId) => {
    const remaining = activeTimers.filter(t => t.id !== timerId);
    setActiveTimers(remaining);

    if (remaining.length > 0) {
      setActiveTimerId(remaining[0].id);
      setSelectedItemId(remaining[0].itemId);
    } else {
      setActiveTimerId(null);
      setCurrentView('detail');
    }
  };

  // Obrir des del dock
  const handleOpenTimerFromDock = (timerId) => {
    const timer = activeTimers.find(t => t.id === timerId);
    if (timer) {
      setSelectedItemId(timer.itemId);
      setActiveTimerId(timer.id);
      setCurrentView('timer');
    }
  };

  // Rellotge / Timer View a pantalla completa per a l'operari (amb fins a 3 ranures simultànies)
  if (currentView === 'timer' && activeTimers.length > 0) {
    return (
      <ProjeccTimerView
        activeTimers={activeTimers}
        activeTimerId={activeTimerId || activeTimers[0]?.id}
        onSelectTimer={(id) => {
          const t = activeTimers.find(x => x.id === id);
          if (t) {
            setSelectedItemId(t.itemId);
            setActiveTimerId(id);
          }
        }}
        onTogglePause={handleTogglePauseTimer}
        onUpdateTimerData={handleUpdateTimerData}
        onFinishTimer={handleFinishActiveTimer}
        onDiscardTimer={handleDiscardActiveTimer}
        onBack={() => setCurrentView(selectedItemId ? 'detail' : 'list')}
        isDark={isDark}
      />
    );
  }

  // Vista d'anàlisi gràfic
  if (currentView === 'analytics' && selectedItem) {
    return (
      <ProjeccAnalytics
        item={selectedItem}
        isDark={isDark}
        onBack={() => setCurrentView('detail')}
      />
    );
  }

  // Vista d'informe imprimible / PDF
  if (currentView === 'report' && selectedItem) {
    return (
      <ProjeccReportView
        item={selectedItem}
        isDark={isDark}
        onBack={() => setCurrentView('detail')}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Barra de Navegació Superior de Projecc */}
      <header className={`sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold font-serif tracking-wide text-amber-500">
                  PROJECC
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                  Taller v1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Control de Desenvolupament & Cronometratge de Producció
              </span>
            </div>
          </div>
        </div>

        {/* Accions de la capçalera */}
        <div className="flex items-center gap-2">
          {/* Botó Web */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('inici')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Tornar al Web Principal de Mínim Món"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>Web</span>
            </button>
          )}

          {/* Botó Producc */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('producc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 border-amber-800/60' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
              title="Anar a l'aplicació Producc"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-500" />
              <span>Producc</span>
            </button>
          )}

          {/* Botó Posting */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('posting')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark ? 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border-amber-800/50' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
              title="Anar a l'Estudi de Continguts Posting"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Posting</span>
            </button>
          )}

          {/* Indicador de sincronització Cloud */}
          <div className={`p-2 rounded-xl flex items-center gap-1 text-[11px] ${
            isSyncing ? 'text-amber-400 animate-pulse' : 'text-slate-400'
          }`}>
            <Cloud className="w-4 h-4" />
            <span className="hidden md:inline">{isSyncing ? 'Sincronitzant...' : 'Sincronitzat'}</span>
          </div>

          {/* Selector de Mode Fosc / Clar */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? "Canviar a mode clar" : "Canviar a mode fosc"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Contingut Dinàmic (Dashboard Llistat o Detall) */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20">
        {currentView === 'list' && (
          <ProjeccList
            items={items}
            isDark={isDark}
            activeTimers={activeTimers}
            onSelectItem={(item) => {
              setSelectedItemId(item.id);
              setCurrentView('detail');
            }}
            onNewItem={handleOpenNewModal}
            onStartTimerQuick={(item, task) => handleStartTimer(item, task)}
            onOpenMestreCatalog={() => setIsMestreModalOpen(true)}
            onDeleteItem={handleDeleteItem}
          />
        )}

        {currentView === 'detail' && selectedItem && (
          <ProjeccDetail
            item={selectedItem}
            isDark={isDark}
            activeTimers={activeTimers}
            onBack={() => setCurrentView('list')}
            onEdit={handleOpenEditModal}
            onStartTimer={handleStartTimer}
            onViewSessions={(task) => {
              setSessionModalTask(task);
              setSessionModalInitialManual(false);
            }}
            onAddManualTime={(task) => {
              setSessionModalTask(task);
              setSessionModalInitialManual(true);
            }}
            onViewAnalytics={() => setCurrentView('analytics')}
            onViewReport={() => setCurrentView('report')}
            onToggleLock={handleToggleLock}
            onUpdateTasks={handleUpdateTasks}
            onTransferToDb={handleTransferToDb}
            mestreTasques={mestreTasques}
            onOpenMestreCatalog={() => setIsMestreModalOpen(true)}
            onDeleteItem={handleDeleteItem}
          />
        )}
      </main>

      {/* Modals */}
      {isFormModalOpen && (
        <ProjeccFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingItemData(null);
          }}
          onSave={handleSaveItem}
          isDark={isDark}
          existingProjects={existingProjects}
          existingProducts={existingProducts}
          initialData={editingItemData}
        />
      )}

      {sessionModalTask && selectedItem && (
        <ProjeccSessionsModal
          task={selectedItem.tasques?.find(t => t.id === sessionModalTask.id) || sessionModalTask}
          item={selectedItem}
          isDark={isDark}
          onClose={() => {
            setSessionModalTask(null);
            setSessionModalInitialManual(false);
          }}
          onUpdateSessions={handleUpdateSessions}
          onStartNewSession={(task) => handleStartTimer(selectedItem, task)}
          initialOpenManual={sessionModalInitialManual}
        />
      )}

      {/* Modal de Gestió del Catàleg Mestre de Tasques */}
      {isMestreModalOpen && (
        <ProjeccMestreTasquesModal
          isOpen={isMestreModalOpen}
          onClose={() => setIsMestreModalOpen(false)}
          isDark={isDark}
          mestreTasques={mestreTasques}
          onSaveMestreTasques={handleSaveMestreTasques}
        />
      )}

      {/* Mini-dock flotant per a tasques simultànies */}
      {currentView !== 'timer' && activeTimers.length > 0 && (
        <ProjeccActiveTimersDock
          activeTimers={activeTimers}
          onOpenTimer={handleOpenTimerFromDock}
          onTogglePause={handleTogglePauseTimer}
          isDark={isDark}
        />
      )}

    </div>
  );
}
