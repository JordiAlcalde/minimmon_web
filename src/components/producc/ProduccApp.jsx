<<<<<<< Updated upstream
import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Building2, Layers, Cpu, Wrench, Calculator, ShoppingCart, 
  Sun, Moon, ArrowLeft, Boxes, Activity, AlertTriangle, CheckCircle, Scale,
  Box, Factory, ClipboardList, ChevronDown, Cloud
=======
import React, { useState, useEffect } from 'react';
import { 
  Package, Building2, Layers, Cpu, Wrench, Calculator, ShoppingCart, 
  Sun, Moon, ArrowLeft, Boxes, Activity, AlertTriangle, CheckCircle, Scale,
  Box, Factory, ClipboardList, ChevronDown, Database
>>>>>>> Stashed changes
} from 'lucide-react';

import { db } from '../../firebase';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

import MaterialsManager from './MaterialsManager';
import ProveidorsManager from './ProveidorsManager';
import GrupsManager from './GrupsManager';
import MaquinariaManager from './MaquinariaManager';
import OperacionsManager from './OperacionsManager';
import EscandallsManager from './EscandallsManager';
import CompresManager from './CompresManager';
import UnitatsManager from './UnitatsManager';
import UnitatsCompraManager from './UnitatsCompraManager';
import FabricantsManager from './FabricantsManager';
import { OrdresFabricacioManager, ControlProduccioManager } from './ProduccioPlaceholders';

import { 
  INITIAL_GRUPS, INITIAL_UNITATS, INITIAL_UNITATS_COMPRA, INITIAL_FABRICANTS,
  INITIAL_PROVEIDORS, INITIAL_MATERIALS, INITIAL_MAQUINARIA, INITIAL_OPERACIONS, 
  INITIAL_ESCANDALLS, INITIAL_COMPRES 
} from '../../data/produccInitialData';

<<<<<<< Updated upstream
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
=======
import { 
  subscribeProduccCollection, 
  saveProduccDocument, 
  deleteProduccDocument 
} from '../../services/produccFirestoreService';
>>>>>>> Stashed changes

export default function ProduccApp({ setActiveTab }) {
  const [activeGroup, setActiveGroup] = useState('principal'); // 'principal' | 'complementaris' | 'produccio'
  const [activeProduccSubtab, setActiveProduccSubtab] = useState('materials');
  const [isDark, setIsDark] = useState(true);
<<<<<<< Updated upstream
  const [isSyncing, setIsSyncing] = useState(false);
=======
  const [firestoreConnected, setFirestoreConnected] = useState(false);
>>>>>>> Stashed changes

  // Application Data States (Sincronitzats amb Cloud Firestore)
  const [grups, setGrups] = useState(INITIAL_GRUPS);
  const [unitats, setUnitats] = useState(INITIAL_UNITATS);
  const [unitatsCompra, setUnitatsCompra] = useState(INITIAL_UNITATS_COMPRA);
  const [fabricants, setFabricants] = useState(INITIAL_FABRICANTS);
  const [proveidors, setProveidors] = useState(INITIAL_PROVEIDORS);
  const [materials, setMaterials] = useState(INITIAL_MATERIALS);
  const [maquinaria, setMaquinaria] = useState(INITIAL_MAQUINARIA);
  const [operacions, setOperacions] = useState(INITIAL_OPERACIONS);
  const [escandalls, setEscandalls] = useState(INITIAL_ESCANDALLS);
  const [compres, setCompres] = useState(INITIAL_COMPRES);

<<<<<<< Updated upstream
  // Refs to hold current state without triggering listener re-subscribes
  const stateRefs = useRef({
    grups, unitats, unitatsCompra, fabricants, proveidors,
    materials, maquinaria, operacions, escandalls, compres
  });

  useEffect(() => {
    stateRefs.current = {
      grups, unitats, unitatsCompra, fabricants, proveidors,
      materials, maquinaria, operacions, escandalls, compres
    };
  }, [grups, unitats, unitatsCompra, fabricants, proveidors, materials, maquinaria, operacions, escandalls, compres]);

  // Sincronització en temps real amb Firestore per a cadascuna de les col·leccions
  useEffect(() => {
    const syncCollection = (collName, setLocal, initialData) => {
      return onSnapshot(collection(db, collName), async (snapshot) => {
        if (!snapshot.empty) {
          const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setLocal(docsData);
        } else if (initialData && initialData.length > 0) {
          // Inicialitzar Firestore automàticament si la col·lecció és buida
          try {
            const batch = writeBatch(db);
            initialData.forEach(item => {
              const docRef = doc(db, collName, item.id);
              const { id, ...itemData } = item;
              batch.set(docRef, sanitizeData(itemData));
            });
            await batch.commit();
          } catch (e) {
            console.warn(`Inicialització Firestore per ${collName}:`, e);
          }
        }
      }, (error) => {
        console.warn(`Error onSnapshot a ${collName}:`, error);
      });
    };

    const unsubGrups = syncCollection("producc_grups", setGrups, INITIAL_GRUPS);
    const unsubUnitats = syncCollection("producc_unitats", setUnitats, INITIAL_UNITATS);
    const unsubUnitatsCompra = syncCollection("producc_unitats_compra", setUnitatsCompra, INITIAL_UNITATS_COMPRA);
    const unsubFabricants = syncCollection("producc_fabricants", setFabricants, INITIAL_FABRICANTS);
    const unsubProveidors = syncCollection("producc_proveidors", setProveidors, INITIAL_PROVEIDORS);
    const unsubMaterials = syncCollection("producc_materials", setMaterials, INITIAL_MATERIALS);
    const unsubMaquinaria = syncCollection("producc_maquinaria", setMaquinaria, INITIAL_MAQUINARIA);
    const unsubOperacions = syncCollection("producc_operacions", setOperacions, INITIAL_OPERACIONS);
    const unsubEscandalls = syncCollection("producc_escandalls", setEscandalls, INITIAL_ESCANDALLS);
    const unsubCompres = syncCollection("producc_compres", setCompres, INITIAL_COMPRES);
=======
  // Subscripció en temps real a Cloud Firestore per a totes les col·leccions
  useEffect(() => {
    const unsubGrups = subscribeProduccCollection('producc_grups', INITIAL_GRUPS, setGrups);
    const unsubUnitats = subscribeProduccCollection('producc_unitats', INITIAL_UNITATS, setUnitats);
    const unsubUnitatsCompra = subscribeProduccCollection('producc_unitats_compra', INITIAL_UNITATS_COMPRA, setUnitatsCompra);
    const unsubFabricants = subscribeProduccCollection('producc_fabricants', INITIAL_FABRICANTS, setFabricants);
    const unsubProveidors = subscribeProduccCollection('producc_proveidors', INITIAL_PROVEIDORS, setProveidors);
    const unsubMaterials = subscribeProduccCollection('producc_materials', INITIAL_MATERIALS, setMaterials);
    const unsubMaquinaria = subscribeProduccCollection('producc_maquinaria', INITIAL_MAQUINARIA, setMaquinaria);
    const unsubOperacions = subscribeProduccCollection('producc_operacions', INITIAL_OPERACIONS, setOperacions);
    const unsubEscandalls = subscribeProduccCollection('producc_escandalls', INITIAL_ESCANDALLS, setEscandalls);
    const unsubCompres = subscribeProduccCollection('producc_compres', INITIAL_COMPRES, setCompres);

    setFirestoreConnected(true);
>>>>>>> Stashed changes

    return () => {
      unsubGrups();
      unsubUnitats();
      unsubUnitatsCompra();
      unsubFabricants();
      unsubProveidors();
      unsubMaterials();
      unsubMaquinaria();
      unsubOperacions();
      unsubEscandalls();
      unsubCompres();
    };
  }, []);

<<<<<<< Updated upstream
  // Helper universal de canvi d'estat amb gravació immediata a Firestore
  const handleUpdateFirestoreCollection = async (collName, updater, currentList, setLocal) => {
    setIsSyncing(true);
    const nextList = typeof updater === 'function' ? updater(currentList) : updater;
    setLocal(nextList);

    try {
      const currentMap = new Map((currentList || []).map(item => [item.id, item]));
      const nextMap = new Map((nextList || []).map(item => [item.id, item]));

      // 1. Eliminar documents suprimits
      for (const [id] of currentMap) {
        if (!nextMap.has(id)) {
          await deleteDoc(doc(db, collName, id)).catch(e => console.error(`Error deleting from ${collName}:`, e));
        }
      }

      // 2. Afegir o actualitzar documents
      for (const [id, item] of nextMap) {
        const oldItem = currentMap.get(id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          const { id: _, ...itemData } = item;
          await setDoc(doc(db, collName, id), sanitizeData(itemData), { merge: true }).catch(e => console.error(`Error saving to ${collName}:`, e));
        }
      }
    } catch (e) {
      console.error(`Error de sincronització Firestore (${collName}):`, e);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  // Setters vinculats directament a Firestore
  const setGrupsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_grups", updater, stateRefs.current.grups, setGrups);
  const setUnitatsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_unitats", updater, stateRefs.current.unitats, setUnitats);
  const setUnitatsCompraWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_unitats_compra", updater, stateRefs.current.unitatsCompra, setUnitatsCompra);
  const setFabricantsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_fabricants", updater, stateRefs.current.fabricants, setFabricants);
  const setProveidorsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_proveidors", updater, stateRefs.current.proveidors, setProveidors);
  const setMaterialsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_materials", updater, stateRefs.current.materials, setMaterials);
  const setMaquinariaWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_maquinaria", updater, stateRefs.current.maquinaria, setMaquinaria);
  const setOperacionsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_operacions", updater, stateRefs.current.operacions, setOperacions);
  const setEscandallsWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_escandalls", updater, stateRefs.current.escandalls, setEscandalls);
  const setCompresWithFirestore = (updater) => handleUpdateFirestoreCollection("producc_compres", updater, stateRefs.current.compres, setCompres);
=======
  // Helper per crear un setter sincronitzat bidireccionalment amb Firestore
  const createSyncSetter = (collectionName, state, setState) => {
    return (action) => {
      if (typeof action === 'function') {
        const nextState = action(state);
        // Identify deleted items
        const currentMap = new Map(state.map(i => [String(i.id), i]));
        const nextMap = new Map(nextState.map(i => [String(i.id), i]));

        for (const [id] of currentMap.entries()) {
          if (!nextMap.has(id)) {
            deleteProduccDocument(collectionName, id).catch(e => console.warn(e));
          }
        }
        // Identify added or modified items
        for (const [id, item] of nextMap.entries()) {
          const prev = currentMap.get(id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            saveProduccDocument(collectionName, item).catch(e => console.warn(e));
          }
        }
        setState(nextState);
      } else {
        setState(action);
      }
    };
  };

  const syncSetGrups = createSyncSetter('producc_grups', grups, setGrups);
  const syncSetUnitats = createSyncSetter('producc_unitats', unitats, setUnitats);
  const syncSetUnitatsCompra = createSyncSetter('producc_unitats_compra', unitatsCompra, setUnitatsCompra);
  const syncSetFabricants = createSyncSetter('producc_fabricants', fabricants, setFabricants);
  const syncSetProveidors = createSyncSetter('producc_proveidors', proveidors, setProveidors);
  const syncSetMaterials = createSyncSetter('producc_materials', materials, setMaterials);
  const syncSetMaquinaria = createSyncSetter('producc_maquinaria', maquinaria, setMaquinaria);
  const syncSetOperacions = createSyncSetter('producc_operacions', operacions, setOperacions);
  const syncSetEscandalls = createSyncSetter('producc_escandalls', escandalls, setEscandalls);
  const syncSetCompres = createSyncSetter('producc_compres', compres, setCompres);
>>>>>>> Stashed changes

  // Quick stats
  const lowStockCount = materials.filter(m => Number(m.estocActual) <= Number(m.estocMinim)).length;
  const pendingOrdersCount = compres.filter(c => c.estat === 'Pendent' || c.estat === 'Demanat').length;

  // Handle switching navigation group
  const handleSwitchGroup = (groupKey) => {
    setActiveGroup(groupKey);
    if (groupKey === 'principal') {
      setActiveProduccSubtab('materials');
    } else if (groupKey === 'complementaris') {
      setActiveProduccSubtab('grups');
    } else if (groupKey === 'produccio') {
      setActiveProduccSubtab('ordres_fabricacio');
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Dedicated Producc Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#FAF7F2] shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Left Side: Mínim Món Brand Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('inici')} 
              className="flex items-center gap-2 cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
              title="Tornar a Mínim Món Web"
            >
              <img 
                alt="Mínim Món Logo" 
                className="h-10 w-auto object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAS8Jj-lMhj2YQ72t6WLkDSnqRoaVGgnJcBn1mFLA2dz2EbXCcs9lMmNJEzNqnPLgaQFbCFwYRuEyApwh8-QW8HnoTc93LaDdIoaaDu56EYaxyCzQQXCS5N9Ge6zVSpgg10WuYz5av2AKy8LDEC3rc0DMoEuOlnAy2jSCJuEPgLsZKrtQlS9qoL-sy8AQvR8vBKkHGZp1zvLiYEjWDbNE8PqRyExPu8HJUvtp89sPvvci3kmY0aLOuve1WHm7YE8NTqnLg" 
              />
            </button>

            <button
              onClick={() => setActiveTab('inici')}
              className="p-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Tornar al lloc web"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Tornar al Web</span>
            </button>
          </div>

          {/* Right Side: Header Title & Controls */}
          <div className="flex items-center gap-3">
            {/* Firestore Cloud Sync Badge */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all ${
                isSyncing 
                  ? 'bg-amber-50 border-amber-300 text-amber-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title="Totes les dades es guarden en temps real a Firebase Firestore"
            >
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span>{isSyncing ? 'Desant a Firestore...' : 'Firestore Connectat'}</span>
            </div>

            {/* Quick Badges */}
            {lowStockCount > 0 && (
              <button
                onClick={() => {
                  setActiveGroup('principal');
                  setActiveProduccSubtab('materials');
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{lowStockCount} Estoc Faltant</span>
              </button>
            )}

            {pendingOrdersCount > 0 && (
              <button
                onClick={() => {
                  setActiveGroup('principal');
                  setActiveProduccSubtab('compres');
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-700" />
                <span>{pendingOrdersCount} Comandes en Curs</span>
              </button>
            )}
                   {/* Firestore Connection Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium shadow-xs" title="Sincronització en temps real amb Cloud Firestore">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono font-semibold">Firestore Online</span>
            </div>

            {/* Dark/Light mode toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title={isDark ? "Canviar a Mode Clar de treball" : "Canviar a Mode Fosc de treball"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-600" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Two Lines Right Title */}
            <div className="text-right border-l border-slate-300/80 pl-4">
              <h1 className="font-serif font-extrabold text-xl tracking-tight text-amber-800 leading-tight">
                Producc
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-none">
                Gestió de la producció
              </p>
            </div>
          </div>
        </div>

        {/* Subtabs & Group Selector Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
            
            {/* 1. Selector Desplegable de Barres a l'Esquerra */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <select
                  value={activeGroup}
                  onChange={(e) => handleSwitchGroup(e.target.value)}
                  className="appearance-none pl-8 pr-8 py-1.5 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white border border-amber-900 shadow-sm cursor-pointer outline-none transition-all"
                  title="Seleccionar Barra de Treball"
                >
                  <option value="principal" className="bg-white text-slate-800 font-semibold">Principal</option>
                  <option value="complementaris" className="bg-white text-slate-800 font-semibold">Complementaris</option>
                  <option value="produccio" className="bg-white text-slate-800 font-semibold">Producció</option>
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-200">
                  {activeGroup === 'principal' && <Boxes className="w-3.5 h-3.5" />}
                  {activeGroup === 'complementaris' && <Layers className="w-3.5 h-3.5" />}
                  {activeGroup === 'produccio' && <Factory className="w-3.5 h-3.5" />}
                </div>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-200">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

<<<<<<< Updated upstream
            {/* 2. Pestanyes Dinàmiques segons el Grup seleccionat */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              
              {/* Barra 1: PRINCIPAL */}
=======
            {/* Separador vertical */}
            <div className="hidden sm:block h-6 w-px bg-slate-300 shrink-0 mx-1" />

            {/* 2. Botons de la Barra Seleccionada */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              
              {/* Barra: PRINCIPAL */}
>>>>>>> Stashed changes
              {activeGroup === 'principal' && (
                <>
                  <button
                    onClick={() => setActiveProduccSubtab('materials')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'materials'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Package className="w-4 h-4" />
<<<<<<< Updated upstream
                    Materials & Estoc
=======
                    <span>Materials</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'materials' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {materials.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('operacions')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'operacions'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
<<<<<<< Updated upstream
                    Operacions de Taller
=======
                    <span>Operacions</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'operacions' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {operacions.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('escandalls')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'escandalls'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Calculator className="w-4 h-4" />
<<<<<<< Updated upstream
                    Escandalls de Producte
=======
                    <span>Escandalls</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'escandalls' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {escandalls.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('compres')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'compres'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
<<<<<<< Updated upstream
                    Compres & Proveïdors
=======
                    <span>Compres</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'compres' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {compres.length}
                    </span>
>>>>>>> Stashed changes
                  </button>
                </>
              )}

<<<<<<< Updated upstream
              {/* Barra 2: COMPLEMENTARIS */}
=======
              {/* Barra: COMPLEMENTARIS */}
>>>>>>> Stashed changes
              {activeGroup === 'complementaris' && (
                <>
                  <button
                    onClick={() => setActiveProduccSubtab('grups')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'grups'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
<<<<<<< Updated upstream
                    Grups de Materials
=======
                    <span>Grups</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'grups' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {grups.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('unitats')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'unitats'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
<<<<<<< Updated upstream
                    Unitats de Mesura
=======
                    <span>Unitats mesura</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'unitats' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {unitats.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('operacions')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'operacions'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Operacions</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'operacions' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {operacions.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('proveidors')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'proveidors'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
<<<<<<< Updated upstream
                    Proveïdors
=======
                    <span>Proveïdors</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'proveidors' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {proveidors.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('fabricants')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'fabricants'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Factory className="w-4 h-4" />
<<<<<<< Updated upstream
                    Fabricants
=======
                    <span>Fabricants</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'fabricants' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {fabricants.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('unitats_compra')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'unitats_compra'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Box className="w-4 h-4" />
<<<<<<< Updated upstream
                    Unitats de Compra
=======
                    <span>Unitats compra</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'unitats_compra' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {unitatsCompra.length}
                    </span>
>>>>>>> Stashed changes
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('maquinaria')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'maquinaria'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
<<<<<<< Updated upstream
                    Parc de Maquinària
=======
                    <span>Maquinària</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeProduccSubtab === 'maquinaria' ? 'bg-amber-700/80 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {maquinaria.length}
                    </span>
>>>>>>> Stashed changes
                  </button>
                </>
              )}

<<<<<<< Updated upstream
              {/* Barra 3: PRODUCCIÓ */}
=======
              {/* Barra: PRODUCCIÓ */}
>>>>>>> Stashed changes
              {activeGroup === 'produccio' && (
                <>
                  <button
                    onClick={() => setActiveProduccSubtab('ordres_fabricacio')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'ordres_fabricacio'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Ordres de Fabricació
                  </button>

                  <button
                    onClick={() => setActiveProduccSubtab('control_produccio')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeProduccSubtab === 'control_produccio'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Control de Producció
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeProduccSubtab === 'materials' && (
          <MaterialsManager
            materials={materials}
<<<<<<< Updated upstream
            setMaterials={setMaterialsWithFirestore}
            grups={grups}
            setGrups={setGrupsWithFirestore}
            unitats={unitats}
            setUnitats={setUnitatsWithFirestore}
            unitatsCompra={unitatsCompra}
            setUnitatsCompra={setUnitatsCompraWithFirestore}
            fabricants={fabricants}
            setFabricants={setFabricantsWithFirestore}
            proveidors={proveidors}
            setProveidors={setProveidorsWithFirestore}
=======
            setMaterials={syncSetMaterials}
            grups={grups}
            setGrups={syncSetGrups}
            unitats={unitats}
            setUnitats={syncSetUnitats}
            unitatsCompra={unitatsCompra}
            setUnitatsCompra={syncSetUnitatsCompra}
            fabricants={fabricants}
            setFabricants={syncSetFabricants}
            proveidors={proveidors}
            setProveidors={syncSetProveidors}
>>>>>>> Stashed changes
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'operacions' && (
          <OperacionsManager
            operacions={operacions}
<<<<<<< Updated upstream
            setOperacions={setOperacionsWithFirestore}
=======
            setOperacions={syncSetOperacions}
>>>>>>> Stashed changes
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'escandalls' && (
          <EscandallsManager
            escandalls={escandalls}
<<<<<<< Updated upstream
            setEscandalls={setEscandallsWithFirestore}
=======
            setEscandalls={syncSetEscandalls}
>>>>>>> Stashed changes
            materials={materials}
            operacions={operacions}
            maquinaria={maquinaria}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'compres' && (
          <CompresManager
            compres={compres}
<<<<<<< Updated upstream
            setCompres={setCompresWithFirestore}
            materials={materials}
            setMaterials={setMaterialsWithFirestore}
=======
            setCompres={syncSetCompres}
            materials={materials}
            setMaterials={syncSetMaterials}
>>>>>>> Stashed changes
            proveidors={proveidors}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'grups' && (
          <GrupsManager
            grups={grups}
<<<<<<< Updated upstream
            setGrups={setGrupsWithFirestore}
=======
            setGrups={syncSetGrups}
>>>>>>> Stashed changes
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'unitats' && (
          <UnitatsManager
            unitats={unitats}
<<<<<<< Updated upstream
            setUnitats={setUnitatsWithFirestore}
=======
            setUnitats={syncSetUnitats}
>>>>>>> Stashed changes
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'proveidors' && (
          <ProveidorsManager
            proveidors={proveidors}
<<<<<<< Updated upstream
            setProveidors={setProveidorsWithFirestore}
=======
            setProveidors={syncSetProveidors}
>>>>>>> Stashed changes
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'fabricants' && (
          <FabricantsManager
            fabricants={fabricants}
<<<<<<< Updated upstream
            setFabricants={setFabricantsWithFirestore}
=======
            setFabricants={syncSetFabricants}
>>>>>>> Stashed changes
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'unitats_compra' && (
          <UnitatsCompraManager
            unitatsCompra={unitatsCompra}
<<<<<<< Updated upstream
            setUnitatsCompra={setUnitatsCompraWithFirestore}
=======
            setUnitatsCompra={syncSetUnitatsCompra}
>>>>>>> Stashed changes
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'maquinaria' && (
          <MaquinariaManager
            maquinaria={maquinaria}
<<<<<<< Updated upstream
            setMaquinaria={setMaquinariaWithFirestore}
=======
            setMaquinaria={syncSetMaquinaria}
>>>>>>> Stashed changes
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'ordres_fabricacio' && (
          <OrdresFabricacioManager
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'control_produccio' && (
          <ControlProduccioManager
            isDark={isDark}
          />
        )}
      </main>
    </div>
  );
}
