import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Search, Edit2, Trash2, ExternalLink, Package, Building2, 
  Factory, Box, Star, X, Save, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';

// Base URL estàndard per a les imatges de materials allotjades a GitHub
const RAW_MATERIALS_BASE_URL = 'https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/materials/';

// Helper per netejar i garantir que la URL té el prefix GitHub complet
const buildMaterialImageUrl = (inputVal) => {
  if (!inputVal || !inputVal.trim()) return '';
  const trimmed = inputVal.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanFilename = trimmed.replace(/^\/+/, '').replace(/^materials\//, '').replace(/^public\/imatges\/materials\//, '');
  return `${RAW_MATERIALS_BASE_URL}${cleanFilename}`;
};

export default function MaterialsManager({ 
  materials = [], 
  setMaterials, 
  grups = [], 
  setGrups, 
  unitats = [], 
  setUnitats, 
  proveidors = [], 
  setProveidors, 
  fabricants = [], 
  setFabricants, 
  unitatsCompra = [], 
  setUnitatsCompra, 
  isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrup, setSelectedGrup] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [expandedAltId, setExpandedAltId] = useState(null);

  // Estat del Formulari del Material
  const [formData, setFormData] = useState({
    material: '',
    descripcio: '',
    imatge: '',
    grupId: '',
    unitat: 'u',
    estocActual: 0,
    estocMinim: 0,
    proveidorsList: []
  });

  // Helper per obtenir el factor de conversió del packaging
  const getSupplierPackagingFactor = (unitatCompraId) => {
    const uc = unitatsCompra.find(u => u.id === unitatCompraId);
    if (!uc || uc.factorConversio === undefined || uc.factorConversio === null) return 1;
    const f = Number(uc.factorConversio);
    return f > 0 ? f : 1;
  };

  // Helper per parsejar la llista de proveïdors d'un material
  const parseSuppliersList = (mat) => {
    if (!mat) {
      return [{
        id: `supp-main-${Date.now()}`,
        proveidorId: proveidors[0]?.id || '',
        codi: '',
        enllac: '',
        preu: 0,
        preuPack: 0,
        termini: '',
        fabricantId: fabricants[0]?.id || '',
        unitatCompraId: unitatsCompra[0]?.id || '',
        comentaris: '',
        isPrincipal: true
      }];
    }

    if (Array.isArray(mat.proveidorsMaterial) && mat.proveidorsMaterial.length > 0) {
      return mat.proveidorsMaterial.map((s, idx) => {
        const factor = getSupplierPackagingFactor(s.unitatCompraId);
        const unitPrice = Number(s.preu || 0);
        const packPrice = s.preuPack !== undefined 
          ? Number(s.preuPack) 
          : (factor > 1 ? Number((unitPrice * factor).toFixed(4)) : unitPrice);

        return {
          id: s.id || `supp-${idx}-${Date.now()}`,
          proveidorId: s.proveidorId || (proveidors[0]?.id || ''),
          codi: s.codi || '',
          enllac: s.enllac || '',
          preu: unitPrice,
          preuPack: packPrice,
          termini: s.termini || '',
          fabricantId: s.fabricantId || '',
          unitatCompraId: s.unitatCompraId || '',
          comentaris: s.comentaris || '',
          isPrincipal: s.isPrincipal !== undefined ? s.isPrincipal : idx === 0
        };
      });
    }

    const list = [];
    const mainFactor = getSupplierPackagingFactor(mat.unitatCompraId);
    const mainPreu = Number(mat.preuProPrin || 0);
    const mainPreuPack = mat.preuPackProPrin !== undefined 
      ? Number(mat.preuPackProPrin) 
      : (mainFactor > 1 ? Number((mainPreu * mainFactor).toFixed(4)) : mainPreu);

    // Proveïdor Principal històric
    list.push({
      id: `supp-main-${Date.now()}`,
      proveidorId: mat.proPrinId || (proveidors[0]?.id || ''),
      codi: mat.codiProPrin || '',
      enllac: mat.enllacProPrin || '',
      preu: mainPreu,
      preuPack: mainPreuPack,
      termini: mat.terminiProPrin || '',
      fabricantId: mat.fabricantId || '',
      unitatCompraId: mat.unitatCompraId || '',
      comentaris: mat.comentaris || '',
      isPrincipal: true
    });

    // Altres proveïdors històrics
    if (Array.isArray(mat.altresProveidors)) {
      mat.altresProveidors.forEach((alt, idx) => {
        const altFactor = getSupplierPackagingFactor(alt.unitatCompraId);
        const altPreu = Number(alt.preu || 0);
        const altPreuPack = alt.preuPack !== undefined
          ? Number(alt.preuPack)
          : (altFactor > 1 ? Number((altPreu * altFactor).toFixed(4)) : altPreu);

        list.push({
          id: `supp-alt-${idx}-${Date.now()}`,
          proveidorId: alt.proveidorId || (proveidors[0]?.id || ''),
          codi: alt.codi || '',
          enllac: alt.enllac || '',
          preu: altPreu,
          preuPack: altPreuPack,
          termini: alt.termini || '',
          fabricantId: alt.fabricantId || '',
          unitatCompraId: alt.unitatCompraId || '',
          comentaris: alt.comentaris || '',
          isPrincipal: false
        });
      });
    }

    return list;
  };

  // Quick Inline Creation Handlers
  const handleQuickAddGrup = () => {
    const nom = window.prompt('Nom del nou grup / categoria de materials:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const existing = grups.find(g => g.grup.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setFormData(prev => ({ ...prev, grupId: existing.id }));
      } else {
        const newId = getNextSequentialId('grup', grups);
        const newGrup = { id: newId, grup: trimmed };
        if (setGrups) setGrups(prev => [...prev, newGrup]);
        setFormData(prev => ({ ...prev, grupId: newId }));
      }
    }
  };

  const handleQuickAddUnitat = () => {
    const nom = window.prompt('Nom de la nova unitat de mesura (ex: m², Litre, kg, cm, u...):');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const existing = unitats.find(u => u.unitat.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setFormData(prev => ({ ...prev, unitat: existing.unitat }));
      } else {
        const newId = getNextSequentialId('unit', unitats);
        const newUnit = { id: newId, unitat: trimmed };
        if (setUnitats) setUnitats(prev => [...prev, newUnit]);
        setFormData(prev => ({ ...prev, unitat: trimmed }));
      }
    }
  };

  const handleQuickAddPackaging = (suppIndex) => {
    const nom = window.prompt('Format de la nova unitat de compra / packaging (ex: Caixa 100u, Paquet 20 unitats):');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const factorStr = window.prompt('Factor de conversió per a l\'estoc (ex: 20, o 1 si és unitari):', '1');
      const factor = Math.max(0.0001, parseFloat(factorStr) || 1);
      const newId = getNextSequentialId('ucomp', unitatsCompra);
      const newPackaging = { id: newId, unitatCompra: trimmed, factorConversio: factor };
      if (setUnitatsCompra) setUnitatsCompra(prev => [...prev, newPackaging]);
      
      if (suppIndex !== undefined) {
        handleUpdateSupplierPackaging(suppIndex, newId);
      }
    }
  };

  const handleQuickAddFabricant = (suppIndex) => {
    const nom = window.prompt('Nom del nou fabricant / marca:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const newId = getNextSequentialId('fab', fabricants);
      const newFab = { id: newId, fabricant: trimmed, pais: '', web: '', descripcio: '' };
      if (setFabricants) setFabricants(prev => [...prev, newFab]);

      if (suppIndex !== undefined) {
        handleUpdateSupplier(suppIndex, 'fabricantId', newId);
      }
    }
  };

  const handleQuickAddProveidor = (suppIndex) => {
    const nom = window.prompt('Nom de la nova empresa proveïdora:');
    if (nom && nom.trim()) {
      const trimmed = nom.trim();
      const newId = getNextSequentialId('prov', proveidors);
      const newProv = { id: newId, empresa: trimmed, telefon: '', email: '', web: '' };
      if (setProveidors) setProveidors(prev => [...prev, newProv]);

      if (suppIndex !== undefined) {
        handleUpdateSupplier(suppIndex, 'proveidorId', newId);
      }
    }
  };

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setExpandedAltId(null);
    setFormData({
      material: '',
      descripcio: '',
      imatge: '',
      grupId: grups[0]?.id || '',
      unitat: unitats[0]?.unitat || 'u',
      estocActual: 0,
      estocMinim: 0,
      proveidorsList: parseSuppliersList(null)
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (mat) => {
    setEditingMaterial(mat);
    setExpandedAltId(null);
    setFormData({
      material: mat.material || '',
      descripcio: mat.descripcio || '',
      imatge: mat.imatge || '',
      grupId: mat.grupId || (grups[0]?.id || ''),
      unitat: mat.unitat || (unitats[0]?.unitat || 'u'),
      estocActual: mat.estocActual !== undefined ? mat.estocActual : 0,
      estocMinim: mat.estocMinim !== undefined ? mat.estocMinim : 0,
      proveidorsList: parseSuppliersList(mat)
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest material?')) {
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  // Gestionar Proveïdors a la fitxa
  const handleAddNewSupplier = () => {
    const newId = `supp-${Date.now()}`;
    const newSupp = {
      id: newId,
      proveidorId: proveidors[0]?.id || '',
      codi: '',
      enllac: '',
      preu: 0,
      preuPack: 0,
      termini: '',
      fabricantId: fabricants[0]?.id || '',
      unitatCompraId: unitatsCompra[0]?.id || '',
      comentaris: '',
      isPrincipal: formData.proveidorsList.length === 0
    };
    setFormData(prev => ({
      ...prev,
      proveidorsList: [...prev.proveidorsList, newSupp]
    }));
    setExpandedAltId(newId);
  };

  const handleUpdateSupplier = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.proveidorsList];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, proveidorsList: updated };
    });
  };

  // Actualitzar packaging i recalcular automàticament preu per unitat i preu per pack
  const handleUpdateSupplierPackaging = (index, newPackagingId) => {
    setFormData(prev => {
      const updated = [...prev.proveidorsList];
      if (updated[index]) {
        const newFactor = getSupplierPackagingFactor(newPackagingId);
        let newPreuPack = updated[index].preuPack;
        let newPreu = updated[index].preu || 0;

        if (newFactor > 1) {
          if (newPreuPack !== undefined && newPreuPack > 0) {
            newPreu = newPreuPack / newFactor;
          } else if (newPreu > 0) {
            newPreuPack = newPreu * newFactor;
          }
        }

        updated[index] = {
          ...updated[index],
          unitatCompraId: newPackagingId,
          preuPack: newPreuPack,
          preu: Number(newPreu)
        };
      }
      return { ...prev, proveidorsList: updated };
    });
  };

  // Actualitzar preu del pack -> calcula automàticament el preu unitari (preuPack / factor)
  const handleUpdateSupplierPricePack = (index, packPrice) => {
    setFormData(prev => {
      const updated = [...prev.proveidorsList];
      if (updated[index]) {
        const factor = getSupplierPackagingFactor(updated[index].unitatCompraId);
        const unitPrice = factor > 0 ? (packPrice / factor) : packPrice;
        updated[index] = {
          ...updated[index],
          preuPack: packPrice,
          preu: Number(unitPrice)
        };
      }
      return { ...prev, proveidorsList: updated };
    });
  };

  // Actualitzar preu unitari
  const handleUpdateSupplierUnitPrice = (index, unitPrice) => {
    setFormData(prev => {
      const updated = [...prev.proveidorsList];
      if (updated[index]) {
        const factor = getSupplierPackagingFactor(updated[index].unitatCompraId);
        updated[index] = {
          ...updated[index],
          preu: unitPrice,
          preuPack: factor > 1 ? Number((unitPrice * factor).toFixed(4)) : unitPrice
        };
      }
      return { ...prev, proveidorsList: updated };
    });
  };

  // Marcar un proveïdor com a Principal (les seves dades passen a la part superior, i l'anterior a la llista)
  const handleSetPrincipalSupplier = (index) => {
    setFormData(prev => {
      const updated = prev.proveidorsList.map((s, idx) => ({
        ...s,
        isPrincipal: idx === index
      }));
      return { ...prev, proveidorsList: updated };
    });
    setExpandedAltId(null);
  };

  const handleRemoveSupplier = (index) => {
    setFormData(prev => {
      const wasPrincipal = prev.proveidorsList[index]?.isPrincipal;
      const updated = prev.proveidorsList.filter((_, i) => i !== index);
      if (wasPrincipal && updated.length > 0) {
        updated[0].isPrincipal = true;
      }
      return { ...prev, proveidorsList: updated };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.material.trim()) return;

    const list = formData.proveidorsList.length > 0 
      ? formData.proveidorsList 
      : parseSuppliersList(null);

    const mainSupp = list.find(s => s.isPrincipal) || list[0] || {};

    const payload = {
      material: formData.material.trim(),
      descripcio: formData.descripcio || '',
      imatge: formData.imatge || '',
      grupId: formData.grupId || '',
      unitat: formData.unitat || 'u',
      estocActual: Number(formData.estocActual || 0),
      estocMinim: Number(formData.estocMinim || 0),
      
      // Sincronització de les dades del Proveïdor Principal actiu per als escandalls
      proPrinId: mainSupp.proveidorId || '',
      preuProPrin: Number(mainSupp.preu || 0),
      preuPackProPrin: Number(mainSupp.preuPack || 0),
      codiProPrin: mainSupp.codi || '',
      enllacProPrin: mainSupp.enllac || '',
      terminiProPrin: mainSupp.termini || '',
      fabricantId: mainSupp.fabricantId || '',
      unitatCompraId: mainSupp.unitatCompraId || '',
      comentaris: mainSupp.comentaris || '',

      // Llista completa de proveïdors
      proveidorsMaterial: list,
      altresProveidors: list.filter(s => !s.isPrincipal).map(s => ({
        proveidorId: s.proveidorId,
        preu: s.preu,
        preuPack: s.preuPack,
        codi: s.codi,
        enllac: s.enllac,
        termini: s.termini,
        fabricantId: s.fabricantId,
        unitatCompraId: s.unitatCompraId,
        comentaris: s.comentaris
      }))
    };

    if (editingMaterial) {
      setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...payload, id: m.id } : m));
    } else {
      const newId = getNextSequentialId('mat', materials);
      setMaterials(prev => [...prev, { ...payload, id: newId }]);
    }
    setModalOpen(false);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = (m.material || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (m.descripcio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (m.codiProPrin || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrup = selectedGrup === 'all' || m.grupId === selectedGrup;
      return matchesSearch && matchesGrup;
    }).sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca', { sensitivity: 'base' }));
  }, [materials, searchTerm, selectedGrup]);

  // Index del proveïdor principal dins de proveidorsList
  const mainSuppIndex = useMemo(() => {
    const idx = formData.proveidorsList.findIndex(s => s.isPrincipal);
    return idx >= 0 ? idx : 0;
  }, [formData.proveidorsList]);

  const mainSupp = formData.proveidorsList[mainSuppIndex] || {};

  // Proveïdors no principals
  const altSuppliersWithIndices = useMemo(() => {
    return formData.proveidorsList
      .map((s, idx) => ({ ...s, originalIndex: idx }))
      .filter((_, idx) => idx !== mainSuppIndex);
  }, [formData.proveidorsList, mainSuppIndex]);

  // Factor de packaging del proveïdor principal
  const mainPackagingFactor = getSupplierPackagingFactor(mainSupp.unitatCompraId);
  const mainIsPack = mainPackagingFactor > 1;

  return (
    <div className="space-y-6">
      {/* Capçalera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            Catàleg de Materials & Matèries Primes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió d'estocs, proveïdor principal de càlcul i llista de proveïdors alternatius.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Material
        </button>
      </div>

      {/* Barra de Filtres i Cerca */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedGrup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedGrup === 'all'
                ? 'bg-amber-600 text-white'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tots ({materials.length})
          </button>
          {[...grups].sort((a, b) => (a.grup || '').localeCompare(b.grup || '', 'ca')).map(g => {
            const count = materials.filter(m => m.grupId === g.id).length;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGrup(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedGrup === g.id
                    ? 'bg-amber-600 text-white'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.grup} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca material, descripció, codi..."
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

      {/* Llistat de Materials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(mat => {
          const grupObj = grups.find(g => g.id === mat.grupId);
          const provObj = proveidors.find(p => p.id === mat.proPrinId);
          const fabObj = fabricants.find(f => f.id === mat.fabricantId);
          const uCompObj = unitatsCompra.find(u => u.id === mat.unitatCompraId);
          
          const isLowStock = mat.estocMinim > 0 && mat.estocActual <= mat.estocMinim;
          const altCount = Array.isArray(mat.altresProveidors) ? mat.altresProveidors.length : 0;

          return (
            <div
              key={mat.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {mat.imatge ? (
                        <img 
                          src={mat.imatge} 
                          alt={mat.material} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-amber-500/50" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {grupObj ? grupObj.grup : 'Sense Grup'}
                        </span>
                        {altCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            +{altCount} alt.
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-100 text-sm truncate mt-0.5 font-serif" title={mat.material}>
                        {mat.material}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(mat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar material"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mat.descripcio && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {mat.descripcio}
                  </p>
                )}

                {/* Caixa Proveïdor Principal */}
                <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400/90 font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {provObj ? provObj.empresa : 'Sense proveïdor'}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {mat.preuProPrin !== undefined ? `${Number(mat.preuProPrin).toFixed(2)} €` : '0.00 €'} / {mat.unitat}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Fab: {fabObj ? fabObj.fabricant : 'N/A'}</span>
                    {uCompObj && <span>Pack: {uCompObj.unitatCompra}</span>}
                  </div>
                </div>
              </div>

              {/* Barra Inferior d'Estoc */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Estoc:</span>
                  <span className={`font-mono font-bold ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
                    {mat.estocActual} {mat.unitat}
                  </span>
                  {isLowStock && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Baix
                    </span>
                  )}
                </div>

                {mat.enllacProPrin && (
                  <a
                    href={mat.enllacProPrin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-medium hover:underline"
                  >
                    <span>Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREACIÓ / EDICIÓ MATERIAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera Modal */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                {editingMaterial ? 'Editar Material' : 'Nou Material'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  form="material-modal-form"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cos del Formulari */}
            <form id="material-modal-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* 1. DADES BÀSIQUES DEL MATERIAL */}
              <div className="space-y-4 text-xs">
                
                {/* Fila 1: Nom del Material + Grup/Categoria */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block text-slate-400 mb-1 font-medium">Nom del Material *</label>
                    <input
                      type="text"
                      required
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                      placeholder="P. ex. Contraxapat Til·ler 2 mm"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium">Grup / Categoria</label>
                      <button
                        type="button"
                        onClick={handleQuickAddGrup}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nou grup"
                      >
                        <Plus className="w-3 h-3" /> Nou
                      </button>
                    </div>
                    <select
                      value={formData.grupId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          handleQuickAddGrup();
                        } else {
                          setFormData({ ...formData, grupId: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border outline-none cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {[...grups].sort((a, b) => (a.grup || '').localeCompare(b.grup || '', 'ca')).map(g => (
                        <option key={g.id} value={g.id}>{g.grup}</option>
                      ))}
                      <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou grup...</option>
                    </select>
                  </div>
                </div>

                {/* Fila 2: Descripció + URL Imatge (esquerra) & Previsualització d'Imatge quadrada (dreta) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  <div className="md:col-span-8 flex flex-col justify-between">
                    <div className="flex-1 flex flex-col min-h-0 mb-3">
                      <label className="block text-slate-400 mb-1 font-medium">Descripció</label>
                      <textarea
                        value={formData.descripcio}
                        onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                        className={`w-full flex-1 min-h-[110px] p-2.5 rounded-xl border outline-none resize-none leading-relaxed ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="Placa de fusta contraxapada de til·ler..."
                      />
                    </div>

                    <div className="shrink-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-400 font-medium">Imatge del Material</label>
                        <span className="text-[10px] text-amber-500 font-mono hidden sm:inline" title={RAW_MATERIALS_BASE_URL}>
                          Prefix Raw GitHub actiu
                        </span>
                      </div>

                      <div className={`flex rounded-xl border overflow-hidden transition-all ${
                        isDark ? 'bg-slate-950 border-slate-800 focus-within:border-amber-500/60' : 'bg-slate-50 border-slate-200 focus-within:border-amber-500/60'
                      }`}>
                        <span className={`hidden sm:inline-flex items-center px-2.5 text-[10px] font-mono select-none border-r shrink-0 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-200/70 border-slate-300 text-slate-600'
                        }`} title={RAW_MATERIALS_BASE_URL}>
                          .../materials/
                        </span>
                        <input
                          type="text"
                          value={
                            formData.imatge && formData.imatge.startsWith(RAW_MATERIALS_BASE_URL)
                              ? formData.imatge.slice(RAW_MATERIALS_BASE_URL.length)
                              : formData.imatge
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, imatge: buildMaterialImageUrl(val) });
                          }}
                          className={`w-full p-2.5 outline-none text-xs font-mono ${
                            isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'
                          }`}
                          placeholder="nom_fitxer.jpg (o URL completa)"
                        />
                      </div>

                      {formData.imatge && (
                        <p className="text-[10px] text-slate-500 truncate" title={formData.imatge}>
                          URL completa: <span className="font-mono text-amber-400/90">{formData.imatge}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col">
                    <label className="block text-slate-400 mb-1 font-medium">Previsualització</label>
                    <div className={`w-full aspect-square rounded-2xl border-2 overflow-hidden flex items-center justify-center relative shadow-sm ${
                      formData.imatge 
                        ? 'border-amber-500/40 bg-slate-950' 
                        : isDark ? 'border-dashed border-slate-800 bg-slate-950/60 text-slate-600' : 'border-dashed border-slate-300 bg-slate-100 text-slate-400'
                    }`}>
                      {formData.imatge ? (
                        <img
                          src={formData.imatge}
                          alt={formData.material || 'Material'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-center p-3">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <span className="text-[10px] block opacity-70">Sense imatge</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fila 3: Estoc Actual | Estoc Mínim | Unitat de Mesura */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Estoc Actual</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.estocActual}
                      onChange={(e) => setFormData({ ...formData, estocActual: parseFloat(e.target.value) || 0 })}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Estoc Mínim Alertes</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.estocMinim}
                      onChange={(e) => setFormData({ ...formData, estocMinim: parseFloat(e.target.value) || 0 })}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-400 font-medium">Unitat de Mesura *</label>
                      <button
                        type="button"
                        onClick={handleQuickAddUnitat}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                        title="Afegir nova unitat de mesura"
                      >
                        <Plus className="w-3 h-3" /> Nova
                      </button>
                    </div>
                    {unitats && unitats.length > 0 ? (
                      <select
                        value={formData.unitat}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddUnitat();
                          } else {
                            setFormData({ ...formData, unitat: e.target.value });
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border outline-none cursor-pointer ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {[...unitats].sort((a, b) => (a.unitat || '').localeCompare(b.unitat || '', 'ca')).map(u => (
                          <option key={u.id} value={u.unitat}>{u.unitat}</option>
                        ))}
                        {!unitats.some(u => u.unitat === formData.unitat) && (
                          <option value={formData.unitat}>{formData.unitat}</option>
                        )}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nova unitat...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.unitat}
                        onChange={(e) => setFormData({ ...formData, unitat: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                        }`}
                        placeholder="m², u, Litre, kg..."
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 2. SECCIÓ PROVEÏDOR PRINCIPAL */}
              <div className="pt-2 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] shadow-sm space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Proveïdor Principal (Referència per a Escandalls)
                      </span>
                    </div>
                  </div>

                  {/* Fila 1 del Proveïdor Principal: Selector Proveïdor + Codi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium">Proveïdor *</label>
                        <button
                          type="button"
                          onClick={() => handleQuickAddProveidor(mainSuppIndex)}
                          className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                          title="Crear nou proveïdor"
                        >
                          <Plus className="w-3 h-3" /> Nou
                        </button>
                      </div>
                      <select
                        value={mainSupp.proveidorId || ''}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddProveidor(mainSuppIndex);
                          } else {
                            handleUpdateSupplier(mainSuppIndex, 'proveidorId', e.target.value);
                          }
                        }}
                        className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="">-- Selecciona Proveïdor --</option>
                        {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
                          <option key={p.id} value={p.id}>{p.empresa}</option>
                        ))}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou proveïdor...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Codi Proveïdor</label>
                      <input
                        type="text"
                        value={mainSupp.codi || ''}
                        onChange={(e) => handleUpdateSupplier(mainSuppIndex, 'codi', e.target.value)}
                        className={`w-full p-2 rounded-xl border outline-none font-mono ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                        placeholder="P. ex. LW-BED-15"
                      />
                    </div>
                  </div>

                  {/* Fila 2 del Proveïdor Principal: Fabricant + Packaging */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium flex items-center gap-1">
                          <Factory className="w-3 h-3 text-amber-500" />
                          Fabricant de la Matèria Prima
                        </label>
                        <button
                          type="button"
                          onClick={() => handleQuickAddFabricant(mainSuppIndex)}
                          className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                          title="Crear nou fabricant"
                        >
                          <Plus className="w-3 h-3" /> Nou
                        </button>
                      </div>
                      <select
                        value={mainSupp.fabricantId || ''}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddFabricant(mainSuppIndex);
                          } else {
                            handleUpdateSupplier(mainSuppIndex, 'fabricantId', e.target.value);
                          }
                        }}
                        className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="">-- Selecciona fabricant --</option>
                        {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
                          <option key={f.id} value={f.id}>{f.fabricant} {f.pais ? `(${f.pais})` : ''}</option>
                        ))}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou fabricant...</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium flex items-center gap-1">
                          <Box className="w-3 h-3 text-amber-500" />
                          Unitat de Compra (Packaging)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleQuickAddPackaging(mainSuppIndex)}
                          className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                          title="Crear nou packaging"
                        >
                          <Plus className="w-3 h-3" /> Nou
                        </button>
                      </div>
                      <select
                        value={mainSupp.unitatCompraId || ''}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleQuickAddPackaging(mainSuppIndex);
                          } else {
                            handleUpdateSupplierPackaging(mainSuppIndex, e.target.value);
                          }
                        }}
                        className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="">-- Selecciona packaging --</option>
                        {[...unitatsCompra].sort((a, b) => (a.unitatCompra || '').localeCompare(b.unitatCompra || '', 'ca')).map(uc => (
                          <option key={uc.id} value={uc.id}>{uc.unitatCompra} (×{uc.factorConversio !== undefined ? uc.factorConversio : 1})</option>
                        ))}
                        <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou packaging...</option>
                      </select>
                    </div>
                  </div>

                  {/* Fila 3 del Proveïdor Principal: Preu / Pack (si factor > 1) + Preu / u + Termini + Enllaç */}
                  <div className={`grid grid-cols-1 ${mainIsPack ? 'sm:grid-cols-2 md:grid-cols-4' : 'md:grid-cols-3'} gap-3 text-xs`}>
                    {/* Textbox Preu / Pack (apareix quan factor > 1) */}
                    {mainIsPack && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-400 font-medium">Preu / Pack (€)</label>
                          <span className="text-[10px] text-amber-400 font-mono">×{mainPackagingFactor}</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={mainSupp.preuPack !== undefined ? mainSupp.preuPack : ''}
                          onChange={(e) => handleUpdateSupplierPricePack(mainSuppIndex, parseFloat(e.target.value) || 0)}
                          className={`w-full p-2 rounded-xl border outline-none font-mono font-semibold ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                          }`}
                          placeholder="P. ex. 19.90"
                        />
                      </div>
                    )}

                    {/* Textbox Preu / Unitat (calculat automàticament si factor > 1) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium">
                          {mainIsPack ? `Preu / u (€ / ${formData.unitat})` : `Preu (€ / ${formData.unitat})`}
                        </label>
                        {mainIsPack && (
                          <span className="text-[10px] text-emerald-400 font-mono" title={`Calculat: ${mainSupp.preuPack || 0} € ÷ ${mainPackagingFactor}`}>
                            ÷{mainPackagingFactor}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={
                          mainSupp.preu !== undefined 
                            ? (Number.isInteger(mainSupp.preu) ? mainSupp.preu : Number(mainSupp.preu.toFixed(4))) 
                            : 0
                        }
                        onChange={(e) => handleUpdateSupplierUnitPrice(mainSuppIndex, parseFloat(e.target.value) || 0)}
                        className={`w-full p-2 rounded-xl border outline-none font-mono font-semibold ${
                          mainIsPack ? 'border-amber-500/40 text-amber-300' : ''
                        } ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Termini Entrega</label>
                      <input
                        type="text"
                        value={mainSupp.termini || ''}
                        onChange={(e) => handleUpdateSupplier(mainSuppIndex, 'termini', e.target.value)}
                        className={`w-full p-2 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                        placeholder="24 hores, 2-3 dies..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Enllaç al Producte</label>
                      <input
                        type="text"
                        value={mainSupp.enllac || ''}
                        onChange={(e) => handleUpdateSupplier(mainSuppIndex, 'enllac', e.target.value)}
                        className={`w-full p-2 rounded-xl border outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                        }`}
                        placeholder="https://www.amazon.es/dp/..."
                      />
                    </div>
                  </div>

                  {/* Fila 4 del Proveïdor Principal: Comentaris */}
                  <div className="text-xs">
                    <label className="block text-slate-400 mb-1 font-medium">Comentaris</label>
                    <textarea
                      rows="2"
                      value={mainSupp.comentaris || ''}
                      onChange={(e) => handleUpdateSupplier(mainSuppIndex, 'comentaris', e.target.value)}
                      className={`w-full p-2 rounded-xl border outline-none resize-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                      }`}
                      placeholder="Condicions especials, descomptes per volum, observacions..."
                    />
                  </div>
                </div>
              </div>

              {/* 3. SECCIÓ DE PROVEÏDORS NO PRINCIPALS (FORMAT LLISTA) */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2 font-serif">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      Altres Proveïdors (Alternatius)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Fes clic a qualsevol proveïdor de la llista per veure o editar les seves dades. En marcar-lo com a <strong>Principal</strong>, passarà a dalt.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewSupplier}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Afegir a la Llista</span>
                  </button>
                </div>

                {altSuppliersWithIndices.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs italic">
                    No hi ha cap proveïdor alternatiu a la llista. Fes clic a "+ Afegir a la Llista" per crear-ne un.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {altSuppliersWithIndices.map((alt) => {
                      const provObj = proveidors.find(p => p.id === alt.proveidorId);
                      const fabObj = fabricants.find(f => f.id === alt.fabricantId);
                      const provName = provObj ? provObj.empresa : (alt.proveidorId ? 'Proveïdor sense assignar' : '-- Seleccionar --');
                      const fabName = fabObj ? fabObj.fabricant : (alt.fabricantId ? 'Fabricant assignat' : 'Sense fabricant');
                      const isExpanded = expandedAltId === alt.id;
                      const altFactor = getSupplierPackagingFactor(alt.unitatCompraId);
                      const altIsPack = altFactor > 1;

                      return (
                        <div
                          key={alt.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isExpanded 
                              ? 'bg-slate-950/80 border-slate-700 shadow-md' 
                              : isDark ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Fila Principal de la Llista: (Proveïdor / Fabricant) */}
                          <div
                            onClick={() => setExpandedAltId(isExpanded ? null : alt.id)}
                            className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Building2 className="w-4 h-4 text-amber-500/70 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-200">{provName}</span>
                                <span className="text-slate-500 mx-2">/</span>
                                <span className="text-slate-400 font-medium">{fabName}</span>
                                {alt.preu > 0 && (
                                  <span className="ml-2.5 font-mono text-amber-400 font-semibold">
                                    {Number(alt.preu).toFixed(2)} € / {formData.unitat}
                                  </span>
                                )}
                                {alt.codi && (
                                  <span className="ml-2 text-[11px] text-slate-500 font-mono">
                                    ({alt.codi})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Accions de la Fila */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetPrincipalSupplier(alt.originalIndex);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-semibold border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                                title="Passar aquest proveïdor a Principal"
                              >
                                <Star className="w-3.5 h-3.5" />
                                <span>Marcar com a Principal</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSupplier(alt.originalIndex);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Eliminar de la llista"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="p-1 text-slate-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Formulari d'Edició Desplegable per a aquest Proveïdor Alternatiu */}
                          {isExpanded && (
                            <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3 text-xs animate-fadeIn">
                              {/* Fila 1: Selector Proveïdor + Codi */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-medium">Proveïdor *</label>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddProveidor(alt.originalIndex)}
                                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" /> Nou
                                    </button>
                                  </div>
                                  <select
                                    value={alt.proveidorId}
                                    onChange={(e) => {
                                      if (e.target.value === '__new__') {
                                        handleQuickAddProveidor(alt.originalIndex);
                                      } else {
                                        handleUpdateSupplier(alt.originalIndex, 'proveidorId', e.target.value);
                                      }
                                    }}
                                    className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <option value="">-- Selecciona Proveïdor --</option>
                                    {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
                                      <option key={p.id} value={p.id}>{p.empresa}</option>
                                    ))}
                                    <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou proveïdor...</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-slate-400 mb-1 font-medium">Codi Proveïdor</label>
                                  <input
                                    type="text"
                                    value={alt.codi || ''}
                                    onChange={(e) => handleUpdateSupplier(alt.originalIndex, 'codi', e.target.value)}
                                    className={`w-full p-2 rounded-xl border outline-none font-mono ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                    placeholder="Ref. proveïdor"
                                  />
                                </div>
                              </div>

                              {/* Fila 2: Fabricant + Packaging */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-medium flex items-center gap-1">
                                      <Factory className="w-3 h-3 text-amber-500" />
                                      Fabricant de la Matèria Prima
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddFabricant(alt.originalIndex)}
                                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" /> Nou
                                    </button>
                                  </div>
                                  <select
                                    value={alt.fabricantId || ''}
                                    onChange={(e) => {
                                      if (e.target.value === '__new__') {
                                        handleQuickAddFabricant(alt.originalIndex);
                                      } else {
                                        handleUpdateSupplier(alt.originalIndex, 'fabricantId', e.target.value);
                                      }
                                    }}
                                    className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <option value="">-- Selecciona fabricant --</option>
                                    {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
                                      <option key={f.id} value={f.id}>{f.fabricant} {f.pais ? `(${f.pais})` : ''}</option>
                                    ))}
                                    <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou fabricant...</option>
                                  </select>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-medium flex items-center gap-1">
                                      <Box className="w-3 h-3 text-amber-500" />
                                      Unitat de Compra (Packaging)
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddPackaging(alt.originalIndex)}
                                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" /> Nou
                                    </button>
                                  </div>
                                  <select
                                    value={alt.unitatCompraId || ''}
                                    onChange={(e) => {
                                      if (e.target.value === '__new__') {
                                        handleQuickAddPackaging(alt.originalIndex);
                                      } else {
                                        handleUpdateSupplierPackaging(alt.originalIndex, e.target.value);
                                      }
                                    }}
                                    className={`w-full p-2 rounded-xl border outline-none cursor-pointer ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <option value="">-- Selecciona packaging --</option>
                                    {[...unitatsCompra].sort((a, b) => (a.unitatCompra || '').localeCompare(b.unitatCompra || '', 'ca')).map(uc => (
                                      <option key={uc.id} value={uc.id}>{uc.unitatCompra} (×{uc.factorConversio !== undefined ? uc.factorConversio : 1})</option>
                                    ))}
                                    <option value="__new__" className="text-amber-500 font-semibold bg-amber-500/10">➕ Afegir nou packaging...</option>
                                  </select>
                                </div>
                              </div>

                              {/* Fila 3: Preu / Pack (si factor > 1) + Preu / u + Termini + Enllaç */}
                              <div className={`grid grid-cols-1 ${altIsPack ? 'sm:grid-cols-2 md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
                                {altIsPack && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-slate-400 font-medium">Preu / Pack (€)</label>
                                      <span className="text-[10px] text-amber-400 font-mono">×{altFactor}</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="any"
                                      value={alt.preuPack !== undefined ? alt.preuPack : ''}
                                      onChange={(e) => handleUpdateSupplierPricePack(alt.originalIndex, parseFloat(e.target.value) || 0)}
                                      className={`w-full p-2 rounded-xl border outline-none font-mono font-semibold ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                      }`}
                                      placeholder="P. ex. 19.90"
                                    />
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-medium">
                                      {altIsPack ? `Preu / u (€ / ${formData.unitat})` : `Preu (€ / ${formData.unitat})`}
                                    </label>
                                    {altIsPack && (
                                      <span className="text-[10px] text-emerald-400 font-mono" title={`Calculat: ${alt.preuPack || 0} € ÷ ${altFactor}`}>
                                        ÷{altFactor}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    step="any"
                                    value={
                                      alt.preu !== undefined 
                                        ? (Number.isInteger(alt.preu) ? alt.preu : Number(alt.preu.toFixed(4))) 
                                        : 0
                                    }
                                    onChange={(e) => handleUpdateSupplierUnitPrice(alt.originalIndex, parseFloat(e.target.value) || 0)}
                                    className={`w-full p-2 rounded-xl border outline-none font-mono font-semibold ${
                                      altIsPack ? 'border-amber-500/40 text-amber-300' : ''
                                    } ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-400 mb-1 font-medium">Termini Entrega</label>
                                  <input
                                    type="text"
                                    value={alt.termini || ''}
                                    onChange={(e) => handleUpdateSupplier(alt.originalIndex, 'termini', e.target.value)}
                                    className={`w-full p-2 rounded-xl border outline-none ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                    placeholder="2-3 dies..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-slate-400 mb-1 font-medium">Enllaç al Producte</label>
                                  <input
                                    type="text"
                                    value={alt.enllac || ''}
                                    onChange={(e) => handleUpdateSupplier(alt.originalIndex, 'enllac', e.target.value)}
                                    className={`w-full p-2 rounded-xl border outline-none ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                    }`}
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>

                              {/* Fila 4: Comentaris */}
                              <div>
                                <label className="block text-slate-400 mb-1 font-medium">Comentaris</label>
                                <textarea
                                  rows="2"
                                  value={alt.comentaris || ''}
                                  onChange={(e) => handleUpdateSupplier(alt.originalIndex, 'comentaris', e.target.value)}
                                  className={`w-full p-2 rounded-xl border outline-none resize-none ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                                  }`}
                                  placeholder="Observacions per a aquest proveïdor..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
