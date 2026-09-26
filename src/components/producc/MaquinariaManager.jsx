import React, { useState } from 'react';
import { Cpu, Plus, Search, Edit2, Trash2, Calendar, DollarSign, Clock, Wrench, X, Save, Zap, Layers, Sparkles, Scissors, CheckCircle } from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal, formatCurrency } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';
import LaserParametersEditor from './LaserParametersEditor';
import { DEFAULT_LASER_CONFIG, DEFAULT_MATERIAL_PRESETS, normalizeLaserConfig, isSampleMaterial } from '../../utils/laserUtils';

export default function MaquinariaManager({ maquinaria, setMaquinaria, materials = [], isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);

  // Estat per a la Biblioteca de Materials Làser
  const [editingLibMaterialIndex, setEditingLibMaterialIndex] = useState(0);
  const [showAddMaterialForm, setShowAddMaterialForm] = useState(false);
  const [newLibMaterialId, setNewLibMaterialId] = useState('');
  const [newLibMaterialCustomNom, setNewLibMaterialCustomNom] = useState('');

  const [formData, setFormData] = useState({
    maquina: '',
    descripcio: '',
    fabricant: '',
    codiFabricant: '',
    numSerie: '',
    dataCompra: '',
    preuHora: 0,
    esLaser: false,
    bibliotecaMaterials: []
  });

  const handleOpenCreate = () => {
    setEditingMaquina(null);
    setFormData({
      maquina: '',
      descripcio: '',
      fabricant: '',
      codiFabricant: '',
      numSerie: '',
      dataCompra: '',
      preuHora: 0,
      esLaser: false,
      bibliotecaMaterials: []
    });
    setEditingLibMaterialIndex(null);
    setShowAddMaterialForm(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (maq) => {
    setEditingMaquina(maq);
    const isLaser = Boolean(maq.esLaser || maq.parametresLaser || (maq.bibliotecaMaterials && maq.bibliotecaMaterials.length > 0) || maq.maquina?.toLowerCase().includes('làser') || maq.maquina?.toLowerCase().includes('laser'));

    let mats = [];
    if (Array.isArray(maq.bibliotecaMaterials)) {
      mats = maq.bibliotecaMaterials.map(m => ({
        ...m,
        parametres: normalizeLaserConfig(m.parametres)
      }));
    }

    setFormData({
      ...maq,
      esLaser: isLaser,
      bibliotecaMaterials: mats
    });
    setEditingLibMaterialIndex(mats.length > 0 ? 0 : null);
    setShowAddMaterialForm(false);
    setNewLibMaterialId('');
    setNewLibMaterialCustomNom('');
    setModalOpen(true);
  };

  // Afegir nou material a la biblioteca làser de la màquina
  const handleAddMaterialToLibrary = () => {
    let matNom = newLibMaterialCustomNom.trim();
    let matId = newLibMaterialId;
    if (newLibMaterialId && newLibMaterialId !== 'custom') {
      const selectedMat = materials.find(m => m.id === newLibMaterialId);
      if (selectedMat) {
        matNom = selectedMat.material;
      }
    }
    if (!matNom) {
      alert("Si us plau, selecciona un material existent o introdueix el nom del material.");
      return;
    }

    const uniqueId = `lib-mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEntry = {
      id: uniqueId,
      materialId: matId && matId !== 'custom' ? matId : '',
      nom: matNom,
      parametres: JSON.parse(JSON.stringify(DEFAULT_LASER_CONFIG))
    };

    const nextList = [...(formData.bibliotecaMaterials || []), newEntry];
    setFormData(prev => ({
      ...prev,
      bibliotecaMaterials: nextList
    }));
    setEditingLibMaterialIndex(nextList.length - 1);
    setShowAddMaterialForm(false);
    setNewLibMaterialId('');
    setNewLibMaterialCustomNom('');
  };

  // Eliminar material de la biblioteca làser
  const handleRemoveMaterialFromLibrary = (index) => {
    const item = formData.bibliotecaMaterials[index];
    if (window.confirm(`Vols eliminar "${item?.nom}" de la biblioteca de materials làser?`)) {
      const nextList = formData.bibliotecaMaterials.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        bibliotecaMaterials: nextList
      }));
      if (editingLibMaterialIndex === index) {
        setEditingLibMaterialIndex(nextList.length > 0 ? 0 : null);
      } else if (editingLibMaterialIndex > index) {
        setEditingLibMaterialIndex(editingLibMaterialIndex - 1);
      }
    }
  };

  // Actualitzar paràmetres del material actualment seleccionat a la biblioteca
  const handleUpdateCurrentMaterialParams = (newParams) => {
    if (editingLibMaterialIndex === null || !formData.bibliotecaMaterials[editingLibMaterialIndex]) return;
    const nextList = [...formData.bibliotecaMaterials];
    nextList[editingLibMaterialIndex] = {
      ...nextList[editingLibMaterialIndex],
      parametres: newParams
    };
    setFormData(prev => ({
      ...prev,
      bibliotecaMaterials: nextList
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta màquina del taller?')) {
      setMaquinaria(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.maquina.trim()) {
      alert("El nom de la màquina és obligatori.");
      return;
    }

    const payload = {
      ...formData,
      bibliotecaMaterials: formData.bibliotecaMaterials || []
    };

    if (editingMaquina) {
      setMaquinaria(prev => prev.map(m => m.id === editingMaquina.id ? { ...payload, id: m.id } : m));
    } else {
      const newId = getNextSequentialId('maq', maquinaria);
      setMaquinaria(prev => [...prev, { ...payload, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredMaquinaria = maquinaria
    .filter(m =>
      m.maquina.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fabricant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descripcio?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.maquina || '').localeCompare(b.maquina || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold font-serif flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Cpu className="w-6 h-6 text-amber-500" />
            Maquinària & Equipament del Taller
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Càlcul d'amortització, consum elèctric, manteniment i cost d'hora màquina.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Màquina
        </button>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nom de màquina, fabricant, codi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaquinaria.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap maquinària registrat.
          </div>
        ) : (
          filteredMaquinaria.map(m => (
            <div 
              key={m.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                isDark ? 'bg-slate-900/50 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 shadow-sm hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm font-serif ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{m.maquina}</h3>
                      <p className={`text-[11px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{m.fabricant || 'Fabricant no especificat'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-800 hover:bg-slate-200'}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-200'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{m.descripcio}</p>

                <div className={`grid grid-cols-2 gap-2 text-[11px] pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                  <div>
                    <span className={`block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Codi Fabricant</span>
                    <span className={`font-mono font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{m.codiFabricant || '-'}</span>
                  </div>
                  <div>
                    <span className={`block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Núm. Sèrie</span>
                    <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{m.numSerie || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Calendar className="w-3 h-3 text-amber-500" />
                  <span>{m.dataCompra || 'Data desconnectada'}</span>
                </div>

                {(m.esLaser || m.parametresLaser || (m.bibliotecaMaterials && m.bibliotecaMaterials.length > 0) || m.maquina?.toLowerCase().includes('làser') || m.maquina?.toLowerCase().includes('laser')) && (
                  <div className="text-center">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs">
                      <Zap className="w-2.5 h-2.5" />
                      {(m.bibliotecaMaterials || []).length} {(m.bibliotecaMaterials || []).length === 1 ? 'material' : 'materials'}
                    </span>
                  </div>
                )}

                <div className="text-right">
                  <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Cost / Hora</span>
                  <span className={`font-mono font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    {formatDecimal(m.preuHora, 2)} €/h
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full ${formData.esLaser ? 'max-w-4xl max-h-[92vh]' : 'max-w-lg'} rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Cpu className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingMaquina ? 'Editar Màquina' : 'Crear Nova Màquina'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Màquina"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                  title="Tancar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form id="maq-modal-form" noValidate onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom de la Màquina *</label>
                <input
                  type="text"
                  required
                  value={formData.maquina}
                  onChange={(e) => setFormData({ ...formData, maquina: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. Màquina Làser CO2 (60W)"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Descripció Tècnica</label>
                <textarea
                  rows="2"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Característiques de treball..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Fabricant / Marca</label>
                  <input
                    type="text"
                    value={formData.fabricant}
                    onChange={(e) => setFormData({ ...formData, fabricant: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="P. ex. Epilog / Thunder"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Codi Fabricant</label>
                  <input
                    type="text"
                    value={formData.codiFabricant}
                    onChange={(e) => setFormData({ ...formData, codiFabricant: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Model / Codi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Número de Sèrie</label>
                  <input
                    type="text"
                    value={formData.numSerie}
                    onChange={(e) => setFormData({ ...formData, numSerie: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Data de Compra</label>
                  <input
                    type="date"
                    value={formData.dataCompra}
                    onChange={(e) => setFormData({ ...formData, dataCompra: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Preu / Hora (€/h)</label>
                  <DecimalInput
                    value={formData.preuHora}
                    onChange={(e, num) => setFormData({ ...formData, preuHora: num })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Secció Màquina Làser / Biblioteca de Materials LaserGRBL */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.esLaser}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const initialMats = (formData.bibliotecaMaterials && formData.bibliotecaMaterials.length > 0)
                          ? formData.bibliotecaMaterials.filter(m => !isSampleMaterial(m))
                          : [];
                        setFormData(prev => ({
                          ...prev,
                          esLaser: checked,
                          bibliotecaMaterials: checked ? initialMats : prev.bibliotecaMaterials
                        }));
                        if (checked && initialMats.length > 0) {
                          setEditingLibMaterialIndex(0);
                        }
                      }}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-amber-500">
                      <Zap className="w-4 h-4" />
                      És una Màquina de Gravat / Tall Làser (LaserGRBL)
                    </span>
                  </label>
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Biblioteca de Paràmetres Làser per Material
                  </span>
                </div>

                {formData.esLaser && (
                  <div className="pt-1 space-y-4">
                    <div className={`p-3 rounded-xl border text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-300/90' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <span>
                        Cada material té associats els seus paràmetres de gravat i tall per defecte. Quan es prepari un escandall, es podran triar directament segons el material del producte.
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddMaterialForm(prev => !prev)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Afegir Material</span>
                      </button>
                    </div>

                    {/* Formulari emergent per afegir un material a la biblioteca */}
                    {showAddMaterialForm && (
                      <div className={`p-4 rounded-xl border space-y-3 animate-fadeIn ${
                        isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-amber-300 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                            <Plus className="w-4 h-4" /> Afegir Material a la Biblioteca Làser
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMaterialForm(false);
                              setNewLibMaterialId('');
                              setNewLibMaterialCustomNom('');
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Tria dels Materials del Taller</label>
                            <select
                              value={newLibMaterialId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewLibMaterialId(val);
                                if (val && val !== 'custom') {
                                  const mObj = materials.find(m => m.id === val);
                                  if (mObj) setNewLibMaterialCustomNom(mObj.material);
                                }
                              }}
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <option value="">-- Selecciona un material existent --</option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.material} {m.categoria ? `(${m.categoria})` : ''}
                                </option>
                              ))}
                              <option value="custom">-- Altre material (nom personalitzat) --</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Nom a la Biblioteca Làser *</label>
                            <input
                              type="text"
                              value={newLibMaterialCustomNom}
                              onChange={(e) => setNewLibMaterialCustomNom(e.target.value)}
                              placeholder="P. ex. Fusta de Bedoll 3mm, Metacrilat 4mm..."
                              className={`w-full p-2 rounded-xl border outline-none ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMaterialForm(false);
                              setNewLibMaterialId('');
                              setNewLibMaterialCustomNom('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            Cancel·lar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddMaterialToLibrary}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Confirmar i Afegir</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Selector de pestanyes de materials de la biblioteca */}
                    {formData.bibliotecaMaterials && formData.bibliotecaMaterials.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-slate-800/60 scrollbar-thin">
                          {formData.bibliotecaMaterials.map((mat, idx) => {
                            const isSelected = editingLibMaterialIndex === idx;
                            return (
                              <div
                                key={mat.id || idx}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                                  isSelected
                                    ? (isDark ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs' : 'bg-amber-100 border-amber-500 text-amber-900 shadow-xs font-bold')
                                    : (isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800')
                                }`}
                                onClick={() => setEditingLibMaterialIndex(idx)}
                              >
                                <span>{mat.nom}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMaterialFromLibrary(idx);
                                  }}
                                  className={`p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ${
                                    isSelected ? 'opacity-80 group-hover:opacity-100' : 'opacity-40 group-hover:opacity-100'
                                  }`}
                                  title={`Eliminar ${mat.nom} de la biblioteca`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Editor del material seleccionat */}
                        {editingLibMaterialIndex !== null && formData.bibliotecaMaterials[editingLibMaterialIndex] && (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Editant paràmetres per defecte per a: <span className="underline decoration-amber-500">{formData.bibliotecaMaterials[editingLibMaterialIndex].nom}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Els canvis es desen en fer clic a "Guardar" la màquina
                              </span>
                            </div>

                            <LaserParametersEditor
                              value={formData.bibliotecaMaterials[editingLibMaterialIndex].parametres || DEFAULT_LASER_CONFIG}
                              onChange={(newParams) => handleUpdateCurrentMaterialParams(newParams)}
                              isDark={isDark}
                              showDimensions={false}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`p-6 rounded-xl border text-center space-y-2 ${
                        isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                        <p className="text-xs font-semibold">No hi ha cap material a la biblioteca d'aquesta màquina làser.</p>
                        <p className="text-[11px] opacity-70">Clica a <strong>"+ Afegir Material"</strong> a dalt per seleccionar o introduir un material del taller i configurar els seus paràmetres de gravat i tall.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
