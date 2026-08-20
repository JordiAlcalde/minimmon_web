import React, { useState } from 'react';
import { 
  Package, Building2, Layers, Cpu, Wrench, Calculator, ShoppingCart, 
  Sun, Moon, ArrowLeft, Boxes, Activity, AlertTriangle, CheckCircle, Scale,
  Box, Factory, ClipboardList, ChevronDown
} from 'lucide-react';

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

export default function ProduccApp({ setActiveTab }) {
  const [activeGroup, setActiveGroup] = useState('principal'); // 'principal' | 'complementaris' | 'produccio'
  const [activeProduccSubtab, setActiveProduccSubtab] = useState('materials');
  const [isDark, setIsDark] = useState(true);

  // Application Data States
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
      {/* Dedicated Producc Navbar (Sempre en fons clar constant per a màxima visibilitat del logo) */}
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

          {/* Right Side: Header Title (2 lines) & Controls */}
          <div className="flex items-center gap-4">
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
                  {activeGroup === 'produccio' && <Cpu className="w-3.5 h-3.5" />}
                </div>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-200" />
              </div>
            </div>

            {/* Separador vertical */}
            <div className="hidden sm:block h-6 w-px bg-slate-300 shrink-0 mx-1" />

            {/* 2. Botons de la Barra Seleccionada */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {/* Barra PRINCIPAL: Materials / Operacions / Escandalls / Compres */}
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
                    Materials ({materials.length})
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
                    Operacions ({operacions.length})
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
                    Escandalls ({escandalls.length})
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
                    Compres ({compres.length})
                  </button>
                </>
              )}

              {/* Barra COMPLEMENTARIS: Grups / Unitats mesura / Operacions / Proveïdors / Fabricants / Unitats compra / Maquinària */}
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
                    Grups ({grups.length})
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
                    Unitats Mesura ({unitats.length})
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
                    Operacions ({operacions.length})
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
                    Proveïdors ({proveidors.length})
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
                    Fabricants ({fabricants.length})
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
                    Unitats Compra ({unitatsCompra.length})
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
                    Maquinària ({maquinaria.length})
                  </button>
                </>
              )}

              {/* Barra PRODUCCIÓ: Ordres de fabricació / Control de producció */}
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
            setMaterials={setMaterials}
            grups={grups}
            setGrups={setGrups}
            unitats={unitats}
            setUnitats={setUnitats}
            unitatsCompra={unitatsCompra}
            setUnitatsCompra={setUnitatsCompra}
            fabricants={fabricants}
            setFabricants={setFabricants}
            proveidors={proveidors}
            setProveidors={setProveidors}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'operacions' && (
          <OperacionsManager
            operacions={operacions}
            setOperacions={setOperacions}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'escandalls' && (
          <EscandallsManager
            escandalls={escandalls}
            setEscandalls={setEscandalls}
            materials={materials}
            operacions={operacions}
            maquinaria={maquinaria}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'compres' && (
          <CompresManager
            compres={compres}
            setCompres={setCompres}
            materials={materials}
            setMaterials={setMaterials}
            proveidors={proveidors}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'grups' && (
          <GrupsManager
            grups={grups}
            setGrups={setGrups}
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'unitats' && (
          <UnitatsManager
            unitats={unitats}
            setUnitats={setUnitats}
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'proveidors' && (
          <ProveidorsManager
            proveidors={proveidors}
            setProveidors={setProveidors}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'fabricants' && (
          <FabricantsManager
            fabricants={fabricants}
            setFabricants={setFabricants}
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'unitats_compra' && (
          <UnitatsCompraManager
            unitatsCompra={unitatsCompra}
            setUnitatsCompra={setUnitatsCompra}
            materials={materials}
            isDark={isDark}
          />
        )}

        {activeProduccSubtab === 'maquinaria' && (
          <MaquinariaManager
            maquinaria={maquinaria}
            setMaquinaria={setMaquinaria}
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
