import React, { useState } from 'react';
import { 
  Cpu, Plus, Search, Edit2, Trash2, Calendar, DollarSign, Clock, Wrench, X, Save, 
  Zap, Layers, Sparkles, CheckCircle, AlertTriangle, CheckSquare, ClipboardList, 
  History, ArrowRight, ShieldCheck, Tag, FileText, ChevronDown, ChevronUp, Bell,
  Activity, Check, Camera, Image as ImageIcon, Eye
} from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal, formatCurrency } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';
import LaserParametersEditor from './LaserParametersEditor';
import { DEFAULT_LASER_CONFIG, normalizeLaserConfig, isSampleMaterial } from '../../utils/laserUtils';
import { compressImageFile } from '../../data/projeccInitialData';

// Helper per sumar dies a una data YYYY-MM-DD
function addDays(dateStr, days) {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
}

// Format visual de data DD/MM/YYYY
function formatDateDisplay(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Avaluació de l'estat del manteniment
export function getMaintenanceStatus(m) {
  if (!m.periodicitatDies && !m.periodicitatHores && !m.properMantenimentData) {
    return { status: 'none', label: 'Sense planificar', color: 'slate' };
  }
  const today = new Date().toISOString().split('T')[0];
  const properData = m.properMantenimentData;

  const horesActuals = Number(m.horesTreball || 0);
  const properHores = Number(m.properMantenimentHores || 0);
  const horesVencudes = properHores > 0 && horesActuals >= properHores;
  const horesProperes = properHores > 0 && (properHores - horesActuals <= 10) && (properHores - horesActuals > 0);

  if (properData) {
    const diffMs = new Date(properData).getTime() - new Date(today).getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || horesVencudes) {
      return { 
        status: 'overdue', 
        label: diffDays < 0 ? `Vençut fa ${Math.abs(diffDays)}d` : 'Hores superades', 
        days: diffDays, 
        color: 'red' 
      };
    }
    if (diffDays <= 7 || horesProperes) {
      return { 
        status: 'warning', 
        label: diffDays === 0 ? 'Toca avui!' : `Toca en ${diffDays}d`, 
        days: diffDays, 
        color: 'amber' 
      };
    }
    return { 
      status: 'ok', 
      label: `Al dia (en ${diffDays}d)`, 
      days: diffDays, 
      color: 'emerald' 
    };
  }

  if (horesVencudes) return { status: 'overdue', label: 'Hores superades', color: 'red' };
  if (horesProperes) return { status: 'warning', label: 'Hores properes', color: 'amber' };
  return { status: 'ok', label: 'Al dia', color: 'emerald' };
}

export default function MaquinariaManager({ maquinaria = [], setMaquinaria, materials = [], isDark }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaintenance, setFilterMaintenance] = useState('all'); // 'all' | 'overdue' | 'warning' | 'ok'
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('general'); // 'general' | 'manteniment' | 'laser'
  const [editingMaquina, setEditingMaquina] = useState(null);

  // Estat del Modal de Registre de Manteniment
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedMaquinaForMaintenance, setSelectedMaquinaForMaintenance] = useState(null);
  const [maintenanceViewTab, setMaintenanceViewTab] = useState('registre'); // 'registre' | 'historic'
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    data: '',
    hores: 0,
    accions: {},
    observacions: ''
  });

  // Modal d'imatge ampliada (Lightbox)
  const [enlargedPhoto, setEnlargedPhoto] = useState(null); // { url, titol, numero }

  // Estat per a la Biblioteca de Materials Làser
  const [editingLibMaterialIndex, setEditingLibMaterialIndex] = useState(0);
  const [showAddMaterialForm, setShowAddMaterialForm] = useState(false);
  const [newLibMaterialId, setNewLibMaterialId] = useState('');
  const [newLibMaterialCustomNom, setNewLibMaterialCustomNom] = useState('');

  // Formulari de Creació / Edició de Màquina
  const [formData, setFormData] = useState({
    maquina: '',
    descripcio: '',
    fabricant: '',
    codiFabricant: '',
    numSerie: '',
    dataCompra: '',
    preuHora: 0,
    esLaser: false,
    bibliotecaMaterials: [],
    horesTreball: 0,
    periodicitatDies: 30,
    periodicitatHores: 0,
    ultimMantenimentData: '',
    ultimMantenimentHores: 0,
    properMantenimentData: '',
    properMantenimentHores: 0,
    accionsManteniment: [],
    historicManteniments: []
  });

  const handleOpenCreate = () => {
    setEditingMaquina(null);
    setModalTab('general');
    setFormData({
      maquina: '',
      descripcio: '',
      fabricant: '',
      codiFabricant: '',
      numSerie: '',
      dataCompra: '',
      preuHora: 0,
      esLaser: false,
      bibliotecaMaterials: [],
      horesTreball: 0,
      periodicitatDies: 30,
      periodicitatHores: 0,
      ultimMantenimentData: '',
      ultimMantenimentHores: 0,
      properMantenimentData: addDays(new Date().toISOString().split('T')[0], 30),
      properMantenimentHores: 0,
      accionsManteniment: [
        { 
          id: `acc-1`, 
          titol: 'Neteja general i aspiració de residus', 
          instruccions: 'Retirar restes de material acumulades i netejar les guies amb drap sec.',
          imatges: [],
          obligatori: true 
        }
      ],
      historicManteniments: []
    });
    setEditingLibMaterialIndex(null);
    setShowAddMaterialForm(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (maq) => {
    setEditingMaquina(maq);
    setModalTab('general');
    const isLaser = Boolean(
      maq.esLaser || 
      maq.parametresLaser || 
      (maq.bibliotecaMaterials && maq.bibliotecaMaterials.length > 0) || 
      maq.maquina?.toLowerCase().includes('làser') || 
      maq.maquina?.toLowerCase().includes('laser')
    );

    let mats = [];
    if (Array.isArray(maq.bibliotecaMaterials)) {
      mats = maq.bibliotecaMaterials.map(m => ({
        ...m,
        parametres: normalizeLaserConfig(m.parametres)
      }));
    }

    // Normalitzar accions de manteniment (assegurar titol, instruccions, imatges)
    const normalizedAccions = Array.isArray(maq.accionsManteniment) ? maq.accionsManteniment.map(acc => ({
      id: acc.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titol: acc.titol || '',
      instruccions: acc.instruccions || (acc.tipus === 'memo' ? acc.valors : '') || '',
      imatges: Array.isArray(acc.imatges) ? acc.imatges : [],
      obligatori: Boolean(acc.obligatori)
    })) : [];

    setFormData({
      ...maq,
      esLaser: isLaser,
      bibliotecaMaterials: mats,
      horesTreball: Number(maq.horesTreball || 0),
      periodicitatDies: Number(maq.periodicitatDies || 0),
      periodicitatHores: Number(maq.periodicitatHores || 0),
      ultimMantenimentData: maq.ultimMantenimentData || '',
      ultimMantenimentHores: Number(maq.ultimMantenimentHores || 0),
      properMantenimentData: maq.properMantenimentData || '',
      properMantenimentHores: Number(maq.properMantenimentHores || 0),
      accionsManteniment: normalizedAccions,
      historicManteniments: Array.isArray(maq.historicManteniments) ? maq.historicManteniments : []
    });
    setEditingLibMaterialIndex(mats.length > 0 ? 0 : null);
    setShowAddMaterialForm(false);
    setNewLibMaterialId('');
    setNewLibMaterialCustomNom('');
    setModalOpen(true);
  };

  // Obriu el modal per registrar un manteniment de la màquina
  const handleOpenMaintenanceModal = (maq) => {
    setSelectedMaquinaForMaintenance(maq);
    setMaintenanceViewTab('registre');

    const todayStr = new Date().toISOString().split('T')[0];
    const initialAnswers = {};

    (maq.accionsManteniment || []).forEach(acc => {
      initialAnswers[acc.id] = false;
    });

    setMaintenanceFormData({
      data: todayStr,
      hores: Number(maq.horesTreball || 0),
      accions: initialAnswers,
      observacions: ''
    });
    setMaintenanceModalOpen(true);
  };

  // Guardar un nou registre de manteniment efectuat
  const handleSaveMaintenanceExecution = (e) => {
    e.preventDefault();
    if (!selectedMaquinaForMaintenance) return;

    const executionDate = maintenanceFormData.data || new Date().toISOString().split('T')[0];
    const horesExec = Number(maintenanceFormData.hores || selectedMaquinaForMaintenance.horesTreball || 0);
    const prevHores = Number(
      selectedMaquinaForMaintenance.ultimMantenimentHores ?? 
      (selectedMaquinaForMaintenance.historicManteniments?.[0]?.hores ?? 0)
    );
    const horesDiferencia = Math.max(0, horesExec - prevHores);

    const newRecord = {
      id: `mrec-${Date.now()}`,
      data: executionDate,
      hores: horesExec,
      horesTreballades: horesDiferencia,
      accions: { ...maintenanceFormData.accions },
      observacions: (maintenanceFormData.observacions || '').trim()
    };

    // Recalcular proper manteniment de manera flexible a partir d'AQUESTA data real
    const diesInterval = Number(selectedMaquinaForMaintenance.periodicitatDies || 0);
    const horesInterval = Number(selectedMaquinaForMaintenance.periodicitatHores || 0);

    const newProperData = diesInterval > 0 ? addDays(executionDate, diesInterval) : selectedMaquinaForMaintenance.properMantenimentData;
    const newProperHores = horesInterval > 0 ? (horesExec + horesInterval) : selectedMaquinaForMaintenance.properMantenimentHores;

    const existingHistory = Array.isArray(selectedMaquinaForMaintenance.historicManteniments) 
      ? selectedMaquinaForMaintenance.historicManteniments 
      : [];

    const updatedHistoric = [newRecord, ...existingHistory];

    setMaquinaria(prev => prev.map(m => {
      if (m.id === selectedMaquinaForMaintenance.id) {
        return {
          ...m,
          horesTreball: horesExec,
          ultimMantenimentData: executionDate,
          ultimMantenimentHores: horesExec,
          properMantenimentData: newProperData,
          properMantenimentHores: newProperHores,
          historicManteniments: updatedHistoric
        };
      }
      return m;
    }));

    setMaintenanceModalOpen(false);
    const nextMsg = newProperData ? ` Proper manteniment previst per al ${formatDateDisplay(newProperData)}.` : '';
    alert(`Manteniment registrat correctament!${nextMsg}`);
  };

  // Eliminar un registre de l'històric
  const handleDeleteHistoricalRecord = (recId) => {
    if (!window.confirm("Vols eliminar aquest registre de l'històric de manteniments?")) return;
    setMaquinaria(prev => prev.map(m => {
      if (m.id === selectedMaquinaForMaintenance.id) {
        const nextHist = (m.historicManteniments || []).filter(h => h.id !== recId);
        return { ...m, historicManteniments: nextHist };
      }
      return m;
    }));
    setSelectedMaquinaForMaintenance(prev => ({
      ...prev,
      historicManteniments: (prev.historicManteniments || []).filter(h => h.id !== recId)
    }));
  };

  // Gestió de la checklist d'accions (Casella / Revisió + Memo Guia + Fotos)
  const handleAddAccioManteniment = () => {
    const newId = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newAccio = {
      id: newId,
      titol: '',
      instruccions: '',
      imatges: [],
      obligatori: false
    };
    setFormData(prev => ({
      ...prev,
      accionsManteniment: [...(prev.accionsManteniment || []), newAccio]
    }));
  };

  const handleUpdateAccio = (index, field, value) => {
    const nextList = [...(formData.accionsManteniment || [])];
    nextList[index] = {
      ...nextList[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, accionsManteniment: nextList }));
  };

  const handleRemoveAccio = (index) => {
    const nextList = (formData.accionsManteniment || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, accionsManteniment: nextList }));
  };

  // Pujada de fotos de suport per a una acció de manteniment
  const handleAddPhotosToAccio = async (accioIndex, files) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    const nextList = [...(formData.accionsManteniment || [])];
    const currentImatges = Array.isArray(nextList[accioIndex].imatges) ? [...nextList[accioIndex].imatges] : [];

    for (const file of fileList) {
      try {
        const compressedUrl = await compressImageFile(file, 1200, 1200, 0.72);
        if (compressedUrl) {
          currentImatges.push({
            id: `foto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: compressedUrl,
            nom: file.name
          });
        }
      } catch (err) {
        console.warn("Error comprimint imatge de manteniment:", err);
      }
    }

    nextList[accioIndex] = {
      ...nextList[accioIndex],
      imatges: currentImatges
    };
    setFormData(prev => ({ ...prev, accionsManteniment: nextList }));
  };

  const handleRemovePhotoFromAccio = (accioIndex, photoId) => {
    const nextList = [...(formData.accionsManteniment || [])];
    const currentImatges = (nextList[accioIndex].imatges || []).filter(img => img.id !== photoId);
    nextList[accioIndex] = {
      ...nextList[accioIndex],
      imatges: currentImatges
    };
    setFormData(prev => ({ ...prev, accionsManteniment: nextList }));
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
      bibliotecaMaterials: formData.bibliotecaMaterials || [],
      accionsManteniment: formData.accionsManteniment || [],
      historicManteniments: formData.historicManteniments || []
    };

    if (editingMaquina) {
      setMaquinaria(prev => prev.map(m => m.id === editingMaquina.id ? { ...payload, id: m.id } : m));
    } else {
      const newId = getNextSequentialId('maq', maquinaria);
      setMaquinaria(prev => [...prev, { ...payload, id: newId }]);
    }
    setModalOpen(false);
  };

  // Filtre combinat de cerca i estat de manteniment
  const filteredMaquinaria = maquinaria
    .filter(m => {
      const matchSearch = (
        (m.maquina || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.fabricant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.descripcio || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchSearch) return false;

      if (filterMaintenance === 'all') return true;
      const statusInfo = getMaintenanceStatus(m);
      return statusInfo.status === filterMaintenance;
    })
    .sort((a, b) => (a.maquina || '').localeCompare(b.maquina || '', 'ca', { sensitivity: 'base' }));

  // Comptadors d'estats de manteniment
  const counts = {
    total: maquinaria.length,
    overdue: maquinaria.filter(m => getMaintenanceStatus(m).status === 'overdue').length,
    warning: maquinaria.filter(m => getMaintenanceStatus(m).status === 'warning').length,
    ok: maquinaria.filter(m => getMaintenanceStatus(m).status === 'ok').length
  };

  // Càlcul d'hores per al formulari de manteniment
  const valorAnticHores = Number(
    selectedMaquinaForMaintenance?.ultimMantenimentHores ?? 
    (selectedMaquinaForMaintenance?.historicManteniments?.[0]?.hores ?? 0)
  );
  const currentHores = parseDecimal(maintenanceFormData.hores, 0);
  const diffHores = currentHores - valorAnticHores;
  const horesTreballades = Math.max(0, diffHores);

  return (
    <div className="space-y-6">
      {/* Capçalera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold font-serif flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Cpu className="w-6 h-6 text-amber-500" />
            Maquinària & Equipament del Taller
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Control d'amortització, costos/hora, paràmetres làser i guies de manteniment preventiu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Màquina
          </button>
        </div>
      </div>

      {/* Barra de cerca i Filtres de Manteniment */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1">
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

        {/* Píndoles de filtre per estat de Manteniment */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setFilterMaintenance('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border ${
              filterMaintenance === 'all'
                ? isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-200 border-slate-400 text-slate-900 font-bold'
                : isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Totes ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterMaintenance('overdue')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
              filterMaintenance === 'overdue'
                ? isDark ? 'bg-red-500/20 border-red-500 text-red-300 font-bold' : 'bg-red-100 border-red-400 text-red-900 font-bold'
                : isDark ? 'bg-slate-950/60 border-slate-800 text-red-400 hover:bg-red-950/30' : 'bg-slate-50 border-slate-200 text-red-700 hover:bg-red-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Vençuts ({counts.overdue})
          </button>

          <button
            type="button"
            onClick={() => setFilterMaintenance('warning')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
              filterMaintenance === 'warning'
                ? isDark ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                : isDark ? 'bg-slate-950/60 border-slate-800 text-amber-400 hover:bg-amber-950/30' : 'bg-slate-50 border-slate-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Propers ({counts.warning})
          </button>

          <button
            type="button"
            onClick={() => setFilterMaintenance('ok')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
              filterMaintenance === 'ok'
                ? isDark ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold'
                : isDark ? 'bg-slate-950/60 border-slate-800 text-emerald-400 hover:bg-emerald-950/30' : 'bg-slate-50 border-slate-200 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Al dia ({counts.ok})
          </button>
        </div>
      </div>

      {/* Graella de Màquines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaquinaria.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap màquina amb els criteris seleccionats.
          </div>
        ) : (
          filteredMaquinaria.map(m => {
            const maintStatus = getMaintenanceStatus(m);
            const actionsCount = (m.accionsManteniment || []).length;

            return (
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
                        onClick={() => handleOpenMaintenanceModal(m)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold border ${
                          maintStatus.status === 'overdue'
                            ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100')
                            : maintStatus.status === 'warning'
                            ? (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100')
                            : isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Gestionar manteniment de la màquina"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Manteniment</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(m)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-800 hover:bg-slate-200'}`}
                        title="Editar fitxa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-200'}`}
                        title="Eliminar màquina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{m.descripcio || 'Sense descripció tècnica.'}</p>

                  {/* Informació de Manteniment (Semàfor) */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    maintStatus.status === 'overdue'
                      ? (isDark ? 'bg-red-950/40 border-red-500/30' : 'bg-red-50 border-red-200')
                      : maintStatus.status === 'warning'
                      ? (isDark ? 'bg-amber-950/40 border-amber-500/30' : 'bg-amber-50 border-amber-200')
                      : maintStatus.status === 'ok'
                      ? (isDark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                      : (isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200')
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        maintStatus.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                        maintStatus.status === 'warning' ? 'bg-amber-500' :
                        maintStatus.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`} />
                      <div className="truncate">
                        <span className={`font-bold block truncate ${
                          maintStatus.status === 'overdue' ? (isDark ? 'text-red-200' : 'text-red-950') :
                          maintStatus.status === 'warning' ? (isDark ? 'text-amber-200' : 'text-amber-950') :
                          maintStatus.status === 'ok' ? (isDark ? 'text-emerald-200' : 'text-emerald-950') :
                          (isDark ? 'text-slate-200' : 'text-slate-900')
                        }`}>
                          Proper: {m.properMantenimentData ? formatDateDisplay(m.properMantenimentData) : 'Sense data'}
                        </span>
                        <span className={`text-[10px] font-mono font-medium ${
                          maintStatus.status === 'overdue' ? (isDark ? 'text-red-300/90' : 'text-red-800') :
                          maintStatus.status === 'warning' ? (isDark ? 'text-amber-300/90' : 'text-amber-800') :
                          maintStatus.status === 'ok' ? (isDark ? 'text-emerald-300/90' : 'text-emerald-800') :
                          (isDark ? 'text-slate-400' : 'text-slate-600')
                        }`}>
                          {maintStatus.label} {m.horesTreball ? `· ${m.horesTreball}h ús` : ''} {actionsCount > 0 ? `· ${actionsCount} accions` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenMaintenanceModal(m)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white shrink-0 cursor-pointer shadow-2xs transition-all"
                    >
                      Revisar
                    </button>
                  </div>

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

                  {(m.esLaser || m.parametresLaser || (m.bibliotecaMaterials && m.bibliotecaMaterials.length > 0)) && (
                    <div className="text-center">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 shadow-2xs ${
                        isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        <Zap className="w-2.5 h-2.5" />
                        {(m.bibliotecaMaterials || []).length} mats làser
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
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL PRINCIPAL: EDITAR / CREAR MÀQUINA (AMB PESTANYES)   */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header del Modal */}
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Cpu className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingMaquina ? `Editar: ${formData.maquina || 'Màquina'}` : 'Crear Nova Màquina'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
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

            {/* PESTANYES DE LA FITXA DE LA MÀQUINA */}
            <div className={`flex items-center gap-1 border-b px-6 pt-2 shrink-0 overflow-x-auto ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setModalTab('general')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === 'general'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4" />
                Característiques
              </button>

              <button
                type="button"
                onClick={() => setModalTab('manteniment')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === 'manteniment'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Guia de Manteniment {formData.accionsManteniment?.length > 0 && `(${formData.accionsManteniment.length} accions)`}
              </button>

              {formData.esLaser && (
                <button
                  type="button"
                  onClick={() => setModalTab('laser')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    modalTab === 'laser'
                      ? 'border-amber-500 text-amber-500'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  Màquina Làser (LaserGRBL)
                </button>
              )}
            </div>

            {/* Contingut del formulari segons pestanya */}
            <div className="p-6 overflow-y-auto max-h-[75vh] flex-1 text-xs">
              {/* ================= PESTANYA 1: GENERAL / CARACTERÍSTIQUES ================= */}
              {modalTab === 'general' && (
                <div className="space-y-4">
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
                      placeholder="P. ex. Màquina Làser CO2 (60W) o Impressora 3D"
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
                      placeholder="Característiques de treball, aplicacions principals..."
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
                        placeholder="P. ex. Epilog, Thunder, Elegoo..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Codi Fabricant / Model</label>
                      <input
                        type="text"
                        value={formData.codiFabricant}
                        onChange={(e) => setFormData({ ...formData, codiFabricant: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="Model / Codi intern"
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
                        className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="SN-2026-..."
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

                  {/* Activació de Màquina Làser (per obrir la pestanya de paràmetres làser) */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.esLaser}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            esLaser: checked
                          }));
                          if (checked) {
                            setModalTab('laser');
                          }
                        }}
                        className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                          <Zap className="w-4 h-4" />
                          És una Màquina de Gravat / Tall Làser (LaserGRBL)
                        </span>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Habilita la pestanya de Biblioteca de Paràmetres per Material i LaserGRBL.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ================= PESTANYA 2: MANTENIMENT (CAMPS COMUNS + ACCIONS GUIA + FOTOS) ================= */}
              {modalTab === 'manteniment' && (
                <div className="space-y-6">
                  {/* Secció 1: Camps Comuns de Manteniment */}
                  <div className={`p-4 rounded-xl border space-y-4 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Camps Comuns de Planificació
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Hores de Treball Actuals</label>
                        <DecimalInput
                          value={formData.horesTreball}
                          onChange={(e, num) => setFormData({ ...formData, horesTreball: num })}
                          className={`w-full p-2.5 rounded-xl border outline-none font-mono font-bold ${
                            isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-200 text-amber-800'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">Hores acumulades d'ús</span>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Periodicitat (Dies)</label>
                        <DecimalInput
                          value={formData.periodicitatDies}
                          onChange={(e, num) => {
                            const newDies = num;
                            const baseDate = formData.ultimMantenimentData || new Date().toISOString().split('T')[0];
                            const calculatedNext = newDies > 0 ? addDays(baseDate, newDies) : '';
                            setFormData({
                              ...formData,
                              periodicitatDies: newDies,
                              properMantenimentData: calculatedNext || formData.properMantenimentData
                            });
                          }}
                          className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">Cada quants dies (ex: 30)</span>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Periodicitat (Hores d'ús)</label>
                        <DecimalInput
                          value={formData.periodicitatHores}
                          onChange={(e, num) => setFormData({ ...formData, periodicitatHores: num })}
                          className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">Opcional (ex: cada 50h)</span>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Proper Manteniment Previst</label>
                        <input
                          type="date"
                          value={formData.properMantenimentData || ''}
                          onChange={(e) => setFormData({ ...formData, properMantenimentData: e.target.value })}
                          className={`w-full p-2.5 rounded-xl border outline-none font-mono font-bold ${
                            isDark ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-white border-slate-200 text-emerald-700'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">Data límit del calendari</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Últim Manteniment Realitzat</label>
                        <input
                          type="date"
                          value={formData.ultimMantenimentData || ''}
                          onChange={(e) => {
                            const dVal = e.target.value;
                            const calculatedNext = (formData.periodicitatDies > 0 && dVal) ? addDays(dVal, formData.periodicitatDies) : formData.properMantenimentData;
                            setFormData({
                              ...formData,
                              ultimMantenimentData: dVal,
                              properMantenimentData: calculatedNext
                            });
                          }}
                          className={`w-full p-2.5 rounded-xl border outline-none ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Hores a l'Últim Manteniment</label>
                        <DecimalInput
                          value={formData.ultimMantenimentHores}
                          onChange={(e, num) => setFormData({ ...formData, ultimMantenimentHores: num })}
                          className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secció 2: Configurador d'Accions de Manteniment (Casella + Guia explicativa + Fotos numerades) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" />
                          Accions de Manteniment (Checklist & Guia)
                        </h4>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Crea cada acció a revisar, acompanya-la d'una explicació detallada (eines, passos) i afegeix fotos numerades per referenciar-les.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAccioManteniment}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Afegir Nova Acció
                      </button>
                    </div>

                    {(!formData.accionsManteniment || formData.accionsManteniment.length === 0) ? (
                      <div className={`p-8 text-center rounded-2xl border border-dashed text-xs ${
                        isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'
                      }`}>
                        No hi ha cap acció de manteniment creada per a aquesta màquina. Fes clic a "+ Afegir Nova Acció" per començar.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.accionsManteniment.map((acc, idx) => (
                          <div 
                            key={acc.id || idx}
                            className={`p-4 rounded-xl border space-y-3 transition-all ${
                              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-2xs'
                            }`}
                          >
                            {/* Fila superior: Núm acció, Títol, Obligatori i Eliminar */}
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-amber-500 text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                                Acció #{idx + 1}
                              </span>

                              <input
                                type="text"
                                value={acc.titol}
                                onChange={(e) => handleUpdateAccio(idx, 'titol', e.target.value)}
                                placeholder="Títol de l'acció (ex: Netejar boquilla, Greixar guies X/Y...)"
                                className={`flex-1 p-2 rounded-lg border text-xs font-semibold outline-none transition-all ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                                }`}
                              />

                              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 select-none shrink-0">
                                <input
                                  type="checkbox"
                                  checked={Boolean(acc.obligatori)}
                                  onChange={(e) => handleUpdateAccio(idx, 'obligatori', e.target.checked)}
                                  className="rounded accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Obligatori</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveAccio(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                                title="Eliminar aquesta acció"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Camp Memo: Instruccions i Guia Detallada */}
                            <div>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-amber-500" />
                                Explicació detallada / Guia de procediment:
                              </label>
                              <textarea
                                rows="2"
                                value={acc.instruccions || ''}
                                onChange={(e) => handleUpdateAccio(idx, 'instruccions', e.target.value)}
                                placeholder="Descriu com fer l'acció pas a pas, eines necessàries, consells... Pots fer referència a la Foto 1, Foto 2, etc..."
                                className={`w-full p-2.5 rounded-lg border text-xs outline-none transition-all ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500'
                                }`}
                              />
                            </div>

                            {/* Secció de Fotos de Referència Numerades */}
                            <div className="pt-1 border-t border-slate-800/40">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                                  <Camera className="w-3 h-3 text-cyan-400" />
                                  Fotos de referència ({acc.imatges?.length || 0})
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    (Identificades amb Foto 1, Foto 2... per referenciar-les al text)
                                  </span>
                                </span>

                                <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                                  <Plus className="w-3 h-3" />
                                  <span>Afegir Foto</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      handleAddPhotosToAccio(idx, e.target.files);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              </div>

                              {Array.isArray(acc.imatges) && acc.imatges.length > 0 ? (
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                  {acc.imatges.map((img, imgIdx) => (
                                    <div 
                                      key={img.id || imgIdx} 
                                      className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0 shadow-2xs"
                                    >
                                      <img 
                                        src={img.url} 
                                        alt={`Foto ${imgIdx + 1}`} 
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => setEnlargedPhoto({ url: img.url, titol: acc.titol, numero: imgIdx + 1 })}
                                      />
                                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-cyan-300 pointer-events-none">
                                        Foto {imgIdx + 1}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePhotoFromAccio(idx, img.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                        title="Eliminar foto"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-500 italic">
                                  Sense fotos associades. Pots afegir-ne per il·lustrar la guia.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= PESTANYA 3: MÀQUINA LÀSER (LaserGRBL) ================= */}
              {modalTab === 'laser' && formData.esLaser && (
                <div className="space-y-4 animate-fadeIn">
                  <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-300/90' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div>
                      <span className="font-bold block">Biblioteca de Paràmetres Làser per Material (LaserGRBL)</span>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Configura els paràmetres de gravat i tall per defecte per a cada material. S'importaran automàticament als escandalls.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMaterialForm(prev => !prev)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PER REGISTRAR MANTENIMENT (AVANÇABLE I FLEXIBLE)   */}
      {/* ========================================================= */}
      {maintenanceModalOpen && selectedMaquinaForMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold font-serif flex items-center gap-2 truncate">
                  <Wrench className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Manteniment: {selectedMaquinaForMaintenance.maquina}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Registra una intervenció preventiva seguint la guia pas a pas i fotos de referència.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setMaintenanceModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestanyes del Modal de Manteniment */}
            <div className={`flex items-center gap-1 border-b px-6 pt-2 shrink-0 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setMaintenanceViewTab('registre')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  maintenanceViewTab === 'registre'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Registrar Revisió
              </button>
              <button
                type="button"
                onClick={() => setMaintenanceViewTab('historic')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  maintenanceViewTab === 'historic'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                Històric ({(selectedMaquinaForMaintenance.historicManteniments || []).length})
              </button>
            </div>

            {/* Contingut: Formulari de Registre */}
            {maintenanceViewTab === 'registre' && (
              <form onSubmit={handleSaveMaintenanceExecution} className="p-6 space-y-4 overflow-y-auto max-h-[75vh] flex-1 text-xs">
                <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[11px] font-medium">
                    Pots realitzar o avançar el manteniment avui. En desar, el proper manteniment es reprogramarà automàticament des d'aquesta data.
                  </span>
                  {selectedMaquinaForMaintenance.periodicitatDies > 0 && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                      Periodicitat: cada {selectedMaquinaForMaintenance.periodicitatDies} dies
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block mb-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Data de la intervenció *
                    </label>
                    <input
                      type="date"
                      required
                      value={maintenanceFormData.data}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, data: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Hores actuals (Run time)
                    </label>
                    <DecimalInput
                      value={maintenanceFormData.hores}
                      onChange={(e, num) => setMaintenanceFormData({ ...maintenanceFormData, hores: num })}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title="Hores treballades (des de l'últim manteniment)">
                      Hores treballades <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>(des de l'últim mant.)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={`${formatDecimal(horesTreballades, 1)} h`}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono font-semibold cursor-not-allowed select-none ${
                        isDark 
                          ? 'bg-slate-950/60 border-slate-800 text-amber-400' 
                          : 'bg-slate-100 border-slate-200 text-amber-900'
                      }`}
                      title={valorAnticHores > 0 
                        ? `Diferència: ${formatDecimal(currentHores, 1)}h (actuals) - ${formatDecimal(valorAnticHores, 1)}h (últim mant.)` 
                        : `Primer manteniment (0h prèvies)`}
                    />
                  </div>
                </div>

                {/* Checklist d'Accions (Totes del tipus Casella / Revisió amb Guia i Fotos) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 block text-xs">
                      Checklist d'Accions a Realitzar:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Marca les caselles a mesura que completis cada acció
                    </span>
                  </div>

                  {(!selectedMaquinaForMaintenance.accionsManteniment || selectedMaquinaForMaintenance.accionsManteniment.length === 0) ? (
                    <div className={`p-6 rounded-xl border text-center text-slate-500 text-xs ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      Aquesta màquina no té cap acció de manteniment configurada a la seva fitxa. Pots desar el manteniment indicant les observacions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMaquinaForMaintenance.accionsManteniment.map((acc, idx) => {
                        const isCompleted = Boolean(maintenanceFormData.accions[acc.id]);

                        return (
                          <div
                            key={acc.id || idx}
                            className={`p-4 rounded-xl border space-y-3 transition-all ${
                              isCompleted 
                                ? (isDark ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-emerald-300 bg-emerald-50/50')
                                : (isDark ? 'border-slate-800 bg-slate-950/70' : 'bg-white border-slate-200 shadow-2xs')
                            }`}
                          >
                            {/* Capçalera de l'acció amb Casella gran */}
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={(e) => {
                                    setMaintenanceFormData({
                                      ...maintenanceFormData,
                                      accions: {
                                        ...maintenanceFormData.accions,
                                        [acc.id]: e.target.checked
                                      }
                                    });
                                  }}
                                  className="rounded accent-emerald-500 w-5 h-5 mt-0.5 cursor-pointer shrink-0"
                                />
                                <div>
                                  <span className={`font-bold text-sm block ${
                                    isCompleted 
                                      ? 'text-emerald-400 line-through opacity-85' 
                                      : (isDark ? 'text-slate-100' : 'text-slate-900')
                                  }`}>
                                    {acc.titol || `Acció #${idx + 1}`}
                                  </span>
                                  {acc.obligatori && (
                                    <span className="text-[10px] text-amber-500 font-semibold block mt-0.5">
                                      Tasca obligatòria
                                    </span>
                                  )}
                                </div>
                              </label>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                isCompleted 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : (isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-300')
                              }`}>
                                {isCompleted ? '✓ REVISAT' : 'PENDENT'}
                              </span>
                            </div>

                            {/* Guia i Instruccions pas a pas (Camp Memo) */}
                            {acc.instruccions && (
                              <div className={`p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-line ${
                                isDark ? 'bg-slate-900/90 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}>
                                <div className="flex items-center gap-1.5 font-bold text-amber-500 text-[11px] mb-1">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Guia i indicacions:</span>
                                </div>
                                {acc.instruccions}
                              </div>
                            )}

                            {/* Galeria de Fotos de suport amb indicador [Foto 1], [Foto 2]... */}
                            {Array.isArray(acc.imatges) && acc.imatges.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-cyan-400" />
                                  Fotos de referència (Clica per ampliar):
                                </span>
                                <div className="flex flex-wrap gap-2.5">
                                  {acc.imatges.map((img, imgIdx) => (
                                    <button
                                      key={img.id || imgIdx}
                                      type="button"
                                      onClick={() => setEnlargedPhoto({ url: img.url, titol: acc.titol, numero: imgIdx + 1 })}
                                      className="group relative w-24 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer shadow-sm hover:border-cyan-400 transition-all text-left"
                                      title={`Ampliar Foto ${imgIdx + 1}`}
                                    >
                                      <img src={img.url} alt={`Foto ${imgIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-cyan-300">
                                        Foto {imgIdx + 1}
                                      </div>
                                      <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded font-medium">Ampliar</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Observacions Generals de la Intervenció</label>
                  <textarea
                    rows="2"
                    value={maintenanceFormData.observacions}
                    onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, observacions: e.target.value })}
                    placeholder="Peces substituïdes, incidències detectades, recomanacions per al proper manteniment..."
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMaintenanceModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar i Desar Manteniment
                  </button>
                </div>
              </form>
            )}

            {/* Contingut: Històric de Revisions */}
            {maintenanceViewTab === 'historic' && (
              <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh] flex-1 text-xs">
                {(!selectedMaquinaForMaintenance.historicManteniments || selectedMaquinaForMaintenance.historicManteniments.length === 0) ? (
                  <div className="py-12 text-center text-slate-500">
                    No hi ha cap registre de manteniment anterior per a aquesta màquina.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMaquinaForMaintenance.historicManteniments.map((rec, rIdx) => (
                      <div 
                        key={rec.id || rIdx}
                        className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg border font-bold font-mono text-xs flex items-center gap-1.5 ${
                              isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            }`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDateDisplay(rec.data)}
                            </span>
                            {rec.hores > 0 && (
                              <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                                {rec.hores} hores d'ús
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteHistoricalRecord(rec.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Eliminar registre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Detalls de les accions revisades en aquell manteniment */}
                        {rec.accions && Object.keys(rec.accions).length > 0 && (
                          <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            {Object.entries(rec.accions).map(([accId, isDone]) => {
                              const accDef = (selectedMaquinaForMaintenance.accionsManteniment || []).find(a => a.id === accId);
                              const label = accDef?.titol || accId;

                              return (
                                <div key={accId} className={`flex items-center justify-between gap-2 border-b pb-1 last:border-none last:pb-0 ${
                                  isDark ? 'border-slate-800/40' : 'border-slate-100'
                                }`}>
                                  <span className={`truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{label}</span>
                                  <span className={`font-semibold shrink-0 font-mono ${
                                    isDone 
                                      ? (isDark ? 'text-emerald-400' : 'text-emerald-700') 
                                      : (isDark ? 'text-slate-500' : 'text-slate-400')
                                  }`}>
                                    {isDone ? '✓ Revisat' : 'No realitzat'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {rec.observacions && (
                          <p className={`text-[11px] italic p-2 rounded border ${
                            isDark 
                              ? 'text-slate-300 bg-amber-500/5 border-amber-500/10' 
                              : 'text-slate-800 bg-amber-50 border-amber-200'
                          }`}>
                            "{rec.observacions}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX: FOTO AMPLIADA EN ALTA RESOLUCIÓ                 */}
      {/* ========================================================= */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full pb-2 text-white text-xs font-semibold">
              <span className="text-cyan-400 font-mono font-bold flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Foto {enlargedPhoto.numero} {enlargedPhoto.titol ? `· ${enlargedPhoto.titol}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                title="Tancar imatge"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img 
              src={enlargedPhoto.url} 
              alt="Foto de referència de manteniment" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-slate-700 shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
