import React from 'react';
import { ClipboardList, Activity, Clock, PlayCircle, CheckCircle2, AlertCircle, Wrench, Package } from 'lucide-react';

export function OrdresFabricacioManager({ isDark }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Ordres de Fabricació (OF)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Planificació, assignació i llançament d'ordres de fabricació tant per a comandes a mida com per a estoc de productes del catàleg.
          </p>
        </div>

        <button
          onClick={() => alert('Mòdul en preparació per a la fase de producció activa.')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <PlayCircle className="w-4 h-4" />
          Nova Ordre de Fabricació
        </button>
      </div>

      <div className={`p-8 rounded-2xl border text-center space-y-4 ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <ClipboardList className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold font-serif text-slate-200">Secció d'Ordres de Fabricació</h3>
          <p className="text-xs text-slate-400">
            Aquesta secció permetrà generar ordres de producció vinculades directament als escandalls de materials, assignar temps de maquinària i fer el seguiment d'estat (En Cua, En Curs, En Acabats, Finalitzat).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Llançament Automàtic
            </div>
            <p className="text-[11px] text-slate-400">Generació d'OF a partir de les comandes de clients del web.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Reserva de Materials
            </div>
            <p className="text-[11px] text-slate-400">Descompte automàtic d'estocs de matèria primera en iniciar l'ordre.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Full de Ruta
            </div>
            <p className="text-[11px] text-slate-400">Guia pas a pas de les operacions de taller i maquinària necessàries.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlProduccioManager({ isDark }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-500" />
            Control de Producció
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitorització en temps real del taller: estat de la maquinària, registres de temps, control de mermes i indicadors de productivitat.
          </p>
        </div>
      </div>

      <div className={`p-8 rounded-2xl border text-center space-y-4 ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Activity className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold font-serif text-slate-200">Secció de Control de Producció</h3>
          <p className="text-xs text-slate-400">
            Aquesta secció permetrà visualitzar la càrrega de treball del taller, cronometratge d'operacions, control de desviacions respecte a l'escandall teòric i control de qualitat final.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Temps Reals vs Teòrics
            </div>
            <p className="text-[11px] text-slate-400">Comparativa directa dels temps escandallats enfront dels temps reals emprats.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Control de Mermes
            </div>
            <p className="text-[11px] text-slate-400">Registre de descartes de fusta o resina per optimitzar els talls.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Incidències & Manteniment
            </div>
            <p className="text-[11px] text-slate-400">Seguiment d'aturades de maquinària i canvis de consumibles.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
