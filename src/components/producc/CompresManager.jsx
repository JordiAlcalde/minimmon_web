import React, { useState } from 'react';
import { 
  ShoppingCart, Plus, Search, CheckCircle, Clock, AlertTriangle, Calendar,
  Building2, Factory, Package, Box, FileText, Copy, ExternalLink, Edit2, Trash2, X, ArrowRight, Save, Hash 
} from 'lucide-react';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { parseDecimal, formatDecimal, formatCurrency } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';

// Helper per obtenir el factor de conversió d'una unitat de compra (packaging)
const getPackagingFactor = (unitatCompraId, unitatsCompra = []) => {
  if (!unitatCompraId) return 1;
  const uc = unitatsCompra.find(u => u.id === unitatCompraId);
  if (!uc || uc.factorConversio === undefined || uc.factorConversio === null) return 1;
  const f = Number(uc.factorConversio);
  return f > 0 ? f : 1;
};

// Helper per extreure les opcions de proveïdors / fabricants configurats en un material
const getMaterialSupplierOptions = (mat, unitatsCompra = []) => {
  if (!mat) return [];

  if (Array.isArray(mat.proveidorsMaterial) && mat.proveidorsMaterial.length > 0) {
    return mat.proveidorsMaterial.map((s, idx) => {
      const factor = getPackagingFactor(s.unitatCompraId, unitatsCompra);
      const unitPrice = Number(s.preu || 0);
      const packPrice = s.preuPack !== undefined && s.preuPack !== null && s.preuPack !== ''
        ? Number(s.preuPack)
        : (factor > 1 ? Number((unitPrice * factor).toFixed(2)) : unitPrice);

      return {
        id: s.id || `supp-${idx}`,
        proveidorId: s.proveidorId || '',
        fabricantId: s.fabricantId || '',
        unitatCompraId: s.unitatCompraId || '',
        codi: s.codi || '',
        factorConversio: factor,
        preuUnitari: unitPrice,
        preuPack: packPrice,
        isPrincipal: s.isPrincipal !== undefined ? s.isPrincipal : idx === 0
      };
    });
  }

  // Compatibilitat amb dades històriques
  const list = [];
  const mainFactor = getPackagingFactor(mat.unitatCompraId, unitatsCompra);
  const mainUnitPrice = Number(mat.preuProPrin || 0);
  const mainPackPrice = mat.preuPackProPrin !== undefined && mat.preuPackProPrin !== null && mat.preuPackProPrin !== ''
    ? Number(mat.preuPackProPrin)
    : (mainFactor > 1 ? Number((mainUnitPrice * mainFactor).toFixed(2)) : mainUnitPrice);

  if (mat.proPrinId) {
    list.push({
      id: 'main',
      proveidorId: mat.proPrinId,
      fabricantId: mat.fabricantId || '',
      unitatCompraId: mat.unitatCompraId || '',
      codi: mat.codiProPrin || '',
      factorConversio: mainFactor,
      preuUnitari: mainUnitPrice,
      preuPack: mainPackPrice,
      isPrincipal: true
    });
  }

  if (Array.isArray(mat.altresProveidors)) {
    mat.altresProveidors.forEach((alt, idx) => {
      const altFactor = getPackagingFactor(alt.unitatCompraId, unitatsCompra);
      const altUnitPrice = Number(alt.preu || 0);
      const altPackPrice = alt.preuPack !== undefined && alt.preuPack !== null && alt.preuPack !== ''
        ? Number(alt.preuPack)
        : (altFactor > 1 ? Number((altUnitPrice * altFactor).toFixed(2)) : altUnitPrice);

      list.push({
        id: `alt-${idx}`,
        proveidorId: alt.proveidorId || '',
        fabricantId: alt.fabricantId || '',
        unitatCompraId: alt.unitatCompraId || '',
        codi: alt.codi || '',
        factorConversio: altFactor,
        preuUnitari: altUnitPrice,
        preuPack: altPackPrice,
        isPrincipal: false
      });
    });
  }

  return list;
};

export default function CompresManager({ 
  compres = [], 
  setCompres, 
  materials = [], 
  setMaterials, 
  proveidors = [], 
  fabricants = [], 
  unitatsCompra = [], 
  isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstat, setFilterEstat] = useState('all');
  const [filterProveidor, setFilterProveidor] = useState('all');
  const [filterFabricant, setFilterFabricant] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState(null);
  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [selectedComandaToReceive, setSelectedComandaToReceive] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // New Order Form state
  const [formData, setFormData] = useState({
    proveidorId: '',
    fabricantId: '',
    dataCreacio: new Date().toISOString().split('T')[0],
    dataPrevista: '',
    numComandaProveidor: '',
    estat: 'Pendent',
    numAlbara: '',
    observacions: '',
    linies: []
  });

  // Reception Form state
  const [receptionData, setReceptionData] = useState({
    numAlbara: '',
    updatePrices: true,
    receivedLines: []
  });

  // Genera una línia per defecte per a un material
  const createDefaultLine = (matId = '') => {
    const targetMat = matId ? materials.find(m => m.id === matId) : materials[0];
    if (!targetMat) {
      return {
        materialId: '',
        fabricantId: formData.fabricantId || '',
        unitatCompraId: '',
        factorConversio: 1,
        quantitatDemanada: 1,
        quantitatRebuda: 0,
        preuPactat: 0,
        codiArticle: ''
      };
    }

    const supplierOpts = getMaterialSupplierOptions(targetMat, unitatsCompra);
    let matchedOpt = formData.proveidorId 
      ? supplierOpts.find(s => s.proveidorId === formData.proveidorId) 
      : null;

    if (!matchedOpt) {
      matchedOpt = supplierOpts.find(s => s.isPrincipal) || supplierOpts[0];
    }

    const fabId = matchedOpt?.fabricantId || formData.fabricantId || targetMat.fabricantId || '';
    const ucId = matchedOpt?.unitatCompraId || targetMat.unitatCompraId || '';
    const factor = getPackagingFactor(ucId, unitatsCompra);

    let packPrice = 0;
    if (matchedOpt) {
      packPrice = matchedOpt.preuPack !== undefined && matchedOpt.preuPack !== null
        ? Number(matchedOpt.preuPack)
        : Number((matchedOpt.preuUnitari * factor).toFixed(2));
    } else if (targetMat.preuPackProPrin !== undefined && targetMat.preuPackProPrin !== null) {
      packPrice = Number(targetMat.preuPackProPrin);
    } else if (targetMat.preuProPrin !== undefined) {
      packPrice = Number((Number(targetMat.preuProPrin) * factor).toFixed(2));
    }

    return {
      materialId: targetMat.id,
      fabricantId: fabId,
      unitatCompraId: ucId,
      factorConversio: factor,
      quantitatDemanada: 1,
      quantitatRebuda: 0,
      preuPactat: packPrice,
      codiArticle: matchedOpt?.codi || targetMat.codiProPrin || ''
    };
  };

  const handleOpenCreate = () => {
    setEditingComanda(null);
    setFormData({
      proveidorId: '',
      fabricantId: '',
      dataCreacio: new Date().toISOString().split('T')[0],
      dataPrevista: '',
      numComandaProveidor: '',
      estat: 'Pendent',
      numAlbara: '',
      observacions: '',
      linies: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (com) => {
    setEditingComanda(com);
    setFormData({
      ...com,
      fabricantId: com.fabricantId || '',
      dataPrevista: com.dataPrevista || '',
      numComandaProveidor: com.numComandaProveidor || '',
      linies: com.linies ? com.linies.map(l => {
        const factor = l.factorConversio || getPackagingFactor(l.unitatCompraId, unitatsCompra);
        return {
          ...l,
          factorConversio: factor,
          fabricantId: l.fabricantId || '',
          unitatCompraId: l.unitatCompraId || '',
          quantitatDemanada: Number(l.quantitatDemanada || 0),
          quantitatRebuda: Number(l.quantitatRebuda || 0),
          preuPactat: Number(l.preuPactat || 0)
        };
      }) : []
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta ordre de compra?')) {
      setCompres(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!formData.proveidorId) {
      alert('Si us plau, selecciona un proveïdor per a l\'ordre de compra.');
      return;
    }

    const cleanLines = (formData.linies || []).map(l => ({
      ...l,
      factorConversio: l.factorConversio || getPackagingFactor(l.unitatCompraId, unitatsCompra),
      quantitatDemanada: Number(l.quantitatDemanada || 0),
      quantitatRebuda: Number(l.quantitatRebuda || 0),
      preuPactat: Number(l.preuPactat || 0)
    }));

    const orderPayload = {
      ...formData,
      linies: cleanLines
    };

    if (editingComanda) {
      setCompres(prev => prev.map(c => c.id === editingComanda.id ? { ...orderPayload, id: c.id } : c));
    } else {
      const newId = getNextSequentialId('com', compres);
      setCompres(prev => [...prev, { ...orderPayload, id: newId }]);
    }
    setModalOpen(false);
  };

  // En canviar el proveïdor de la capçalera, auto-adaptar les línies existents si tenen aquest proveïdor
  const handleHeaderProveidorChange = (newProvId) => {
    const updatedLinies = formData.linies.map(line => {
      const mat = materials.find(m => m.id === line.materialId);
      if (!mat) return line;
      const supplierOpts = getMaterialSupplierOptions(mat, unitatsCompra);
      const matched = supplierOpts.find(s => s.proveidorId === newProvId);
      if (matched) {
        const factor = getPackagingFactor(matched.unitatCompraId, unitatsCompra);
        return {
          ...line,
          fabricantId: matched.fabricantId || line.fabricantId,
          unitatCompraId: matched.unitatCompraId || line.unitatCompraId,
          factorConversio: factor,
          preuPactat: matched.preuPack !== undefined ? matched.preuPack : Number((matched.preuUnitari * factor).toFixed(2)),
          codiArticle: matched.codi || line.codiArticle
        };
      }
      return line;
    });

    setFormData(prev => ({
      ...prev,
      proveidorId: newProvId,
      linies: updatedLinies
    }));
  };

  // Canvi de material en una línia
  const handleLineMaterialChange = (idx, newMatId) => {
    const newMat = materials.find(m => m.id === newMatId);
    if (!newMat) return;

    const supplierOpts = getMaterialSupplierOptions(newMat, unitatsCompra);
    let matchedOpt = formData.proveidorId 
      ? supplierOpts.find(s => s.proveidorId === formData.proveidorId) 
      : null;

    if (!matchedOpt) {
      matchedOpt = supplierOpts.find(s => s.isPrincipal) || supplierOpts[0];
    }

    const fabId = matchedOpt?.fabricantId || formData.fabricantId || newMat.fabricantId || '';
    const ucId = matchedOpt?.unitatCompraId || newMat.unitatCompraId || '';
    const factor = getPackagingFactor(ucId, unitatsCompra);

    let packPrice = 0;
    if (matchedOpt) {
      packPrice = matchedOpt.preuPack !== undefined && matchedOpt.preuPack !== null
        ? Number(matchedOpt.preuPack)
        : Number((matchedOpt.preuUnitari * factor).toFixed(2));
    } else if (newMat.preuPackProPrin !== undefined && newMat.preuPackProPrin !== null) {
      packPrice = Number(newMat.preuPackProPrin);
    } else if (newMat.preuProPrin !== undefined) {
      packPrice = Number((Number(newMat.preuProPrin) * factor).toFixed(2));
    }

    const updated = [...formData.linies];
    updated[idx] = {
      ...updated[idx],
      materialId: newMatId,
      fabricantId: fabId,
      unitatCompraId: ucId,
      factorConversio: factor,
      preuPactat: packPrice,
      codiArticle: matchedOpt?.codi || newMat.codiProPrin || ''
    };
    setFormData(prev => ({ ...prev, linies: updated }));
  };

  // Canvi de fabricant en una línia
  const handleLineFabricantChange = (idx, newFabId) => {
    const updated = [...formData.linies];
    updated[idx] = {
      ...updated[idx],
      fabricantId: newFabId
    };
    setFormData(prev => ({ ...prev, linies: updated }));
  };

  // Canvi d'unitat de compra / packaging en una línia
  const handleLineUnitatCompraChange = (idx, newUcId) => {
    const updated = [...formData.linies];
    const currentLine = updated[idx];
    const prevFactor = Number(currentLine.factorConversio || 1);
    const newFactor = getPackagingFactor(newUcId, unitatsCompra);

    const mat = materials.find(m => m.id === currentLine.materialId);
    const supplierOpts = mat ? getMaterialSupplierOptions(mat, unitatsCompra) : [];
    const matchingByUc = supplierOpts.find(s => s.unitatCompraId === newUcId && (!formData.proveidorId || s.proveidorId === formData.proveidorId));

    let newPackPrice;
    if (matchingByUc) {
      newPackPrice = matchingByUc.preuPack;
    } else {
      const baseCost = prevFactor > 0 ? (Number(currentLine.preuPactat || 0) / prevFactor) : Number(currentLine.preuPactat || 0);
      newPackPrice = Number((baseCost * newFactor).toFixed(2));
    }

    updated[idx] = {
      ...currentLine,
      unitatCompraId: newUcId,
      factorConversio: newFactor,
      preuPactat: newPackPrice
    };
    setFormData(prev => ({ ...prev, linies: updated }));
  };

  // Open Reception Modal workflow
  const handleOpenReception = (com) => {
    setSelectedComandaToReceive(com);
    setReceptionData({
      numAlbara: com.numAlbara || '',
      updatePrices: true,
      receivedLines: (com.linies || []).map(l => ({
        materialId: l.materialId,
        fabricantId: l.fabricantId || '',
        unitatCompraId: l.unitatCompraId || '',
        factorConversio: l.factorConversio || getPackagingFactor(l.unitatCompraId, unitatsCompra),
        quantitatDemanada: Number(l.quantitatDemanada || 0),
        quantitatRebuda: l.quantitatRebuda > 0 ? Number(l.quantitatRebuda) : Number(l.quantitatDemanada || 0),
        preuPactat: Number(l.preuPactat || 0)
      }))
    });
    setReceptionModalOpen(true);
  };

  // Confirm Reception & Stock Update
  const handleConfirmReception = (e) => {
    e.preventDefault();
    if (!selectedComandaToReceive) return;

    // 1. Update order status and received lines
    setCompres(prev => prev.map(c => {
      if (c.id === selectedComandaToReceive.id) {
        return {
          ...c,
          estat: 'Rebut',
          numAlbara: receptionData.numAlbara,
          linies: receptionData.receivedLines
        };
      }
      return c;
    }));

    // 2. Automatically update materials stock & prices (conversió d'unitats de compra a unitats d'estoc reals)
    setMaterials(prevMaterials => {
      return prevMaterials.map(mat => {
        const receivedItem = receptionData.receivedLines.find(r => r.materialId === mat.id);
        if (receivedItem) {
          const factor = Number(receivedItem.factorConversio || 1);
          const qtyAdded = Number(receivedItem.quantitatRebuda || 0) * factor;
          const newStock = Number(mat.estocActual || 0) + qtyAdded;
          
          let updatedMat = {
            ...mat,
            estocActual: newStock
          };

          if (receptionData.updatePrices) {
            const packPrice = Number(receivedItem.preuPactat || 0);
            const unitPrice = factor > 0 ? Number((packPrice / factor).toFixed(4)) : packPrice;
            
            updatedMat.preuProPrin = unitPrice;
            if (mat.preuPackProPrin !== undefined) {
              updatedMat.preuPackProPrin = packPrice;
            }

            if (Array.isArray(mat.proveidorsMaterial)) {
              updatedMat.proveidorsMaterial = mat.proveidorsMaterial.map(p => {
                if (p.proveidorId === selectedComandaToReceive.proveidorId) {
                  return {
                    ...p,
                    preu: unitPrice,
                    preuPack: packPrice,
                    fabricantId: receivedItem.fabricantId || p.fabricantId,
                    unitatCompraId: receivedItem.unitatCompraId || p.unitatCompraId
                  };
                }
                return p;
              });
            }
          }

          return updatedMat;
        }
        return mat;
      });
    });

    setReceptionModalOpen(false);
    alert('Comanda rebuda amb èxit! S\'ha actualitzat l\'estoc real i els preus dels materials.');
  };

  // Helper to generate text copy format
  const generateOrderText = (com) => {
    const prov = proveidors.find(p => p.id === com.proveidorId);
    const orderFab = fabricants.find(f => f.id === com.fabricantId);
    let text = `ORDRE DE COMPRA - MÍNIM MÓN\n`;
    text += `Data: ${com.dataCreacio}\n`;
    if (com.dataPrevista) text += `Data Prevista: ${com.dataPrevista}\n`;
    text += `Proveïdor: ${prov ? prov.empresa : ''}\n`;
    if (com.numComandaProveidor) text += `Nº Comanda Proveïdor: ${com.numComandaProveidor}\n`;
    if (orderFab) text += `Fabricant: ${orderFab.fabricant}\n`;
    text += `Ref. Interna: ${com.id}\n`;
    text += `------------------------------------\n`;
    (com.linies || []).forEach(l => {
      const mat = materials.find(m => m.id === l.materialId);
      const fab = fabricants.find(f => f.id === l.fabricantId);
      const uc = unitatsCompra.find(u => u.id === l.unitatCompraId);
      const packName = uc ? uc.unitatCompra : (mat?.unitat || 'u');
      const factor = Number(l.factorConversio || 1);
      const totalUnits = Number(l.quantitatDemanada || 0) * factor;

      text += `- ${mat ? mat.material : 'Material'}: ${l.quantitatDemanada} ${packName}`;
      if (factor > 1) {
        text += ` (➔ ${totalUnits} ${mat?.unitat || 'u'} a l'estoc)`;
      }
      text += ` | Preu de compra: ${formatCurrency(l.preuPactat, 2)}/${packName}\n`;
      if (fab) text += `  Fabricant: ${fab.fabricant}\n`;
      if (l.codiArticle || mat?.codiProPrin) text += `  Ref: ${l.codiArticle || mat?.codiProPrin}\n`;
    });
    text += `------------------------------------\n`;
    if (com.observacions) text += `Observacions: ${com.observacions}\n`;
    return text;
  };

  const handleCopyOrderText = (com) => {
    const txt = generateOrderText(com);
    navigator.clipboard.writeText(txt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const filteredCompres = compres
    .filter(c => {
      const prov = proveidors.find(p => p.id === c.proveidorId);
      const fab = fabricants.find(f => f.id === c.fabricantId);
      const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            prov?.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            fab?.fabricant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.numComandaProveidor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.dataPrevista?.includes(searchTerm) ||
                            c.observacions?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstat = filterEstat === 'all' || c.estat === filterEstat;
      const matchesProv = filterProveidor === 'all' || c.proveidorId === filterProveidor;
      const matchesFab = filterFabricant === 'all' || c.fabricantId === filterFabricant || (c.linies || []).some(l => l.fabricantId === filterFabricant);

      return matchesSearch && matchesEstat && matchesProv && matchesFab;
    })
    .sort((a, b) => {
      const provA = proveidors.find(p => p.id === a.proveidorId)?.empresa || '';
      const provB = proveidors.find(p => p.id === b.proveidorId)?.empresa || '';
      const comp = provA.localeCompare(provB, 'ca', { sensitivity: 'base' });
      if (comp !== 0) return comp;
      return (b.dataCreacio || '').localeCompare(a.dataCreacio || '');
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            Compres & Ordres d'Aprovisionament
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió de comandes amb unitats de compra (packs/caixes) vs unitats d'estoc reals i preu de proveïdor.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Ordre de Compra
        </button>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per ref, proveïdor, fabricant, nº comanda prov. o observacions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterProveidor}
            onChange={(e) => setFilterProveidor(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Proveïdors</option>
            {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
              <option key={p.id} value={p.id}>{p.empresa}</option>
            ))}
          </select>

          <select
            value={filterFabricant}
            onChange={(e) => setFilterFabricant(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Fabricants</option>
            {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
              <option key={f.id} value={f.id}>{f.fabricant}</option>
            ))}
          </select>

          <select
            value={filterEstat}
            onChange={(e) => setFilterEstat(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tots els Estats</option>
            <option value="Pendent">Pendent</option>
            <option value="Demanat">Demanat</option>
            <option value="Rebut">Rebut</option>
            <option value="Cancel·lat">Cancel·lat</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredCompres.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No s'ha trobat cap comanda amb els criteris seleccionats.
          </div>
        ) : (
          filteredCompres.map(com => {
            const prov = proveidors.find(p => p.id === com.proveidorId);
            const headerFab = fabricants.find(f => f.id === com.fabricantId);
            const totalComanda = (com.linies || []).reduce((acc, l) => acc + (Number(l.quantitatDemanada || 0) * Number(l.preuPactat || 0)), 0);

            return (
              <div
                key={com.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-bold text-sm font-serif ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{prov ? prov.empresa : 'Proveïdor Desconegut'}</h3>
                        
                        {headerFab && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                            <Factory className="w-3 h-3" /> {headerFab.fabricant}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          com.estat === 'Rebut' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' :
                          com.estat === 'Demanat' ? 'bg-sky-500/20 text-sky-600 border-sky-500/30' :
                          com.estat === 'Cancel·lat' ? 'bg-red-500/20 text-red-600 border-red-500/30' :
                          'bg-amber-500/20 text-amber-700 border-amber-500/30'
                        }`}>
                          {com.estat}
                        </span>
                      </div>
                      <div className={`text-[11px] flex flex-wrap items-center gap-3 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="font-mono font-semibold">Ref: {com.id}</span>
                        {com.numComandaProveidor && (
                          <span className={`font-mono flex items-center gap-1 font-medium ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                            <Hash className="w-3.5 h-3.5 shrink-0" /> Nº Prov: {com.numComandaProveidor}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-amber-500/80 shrink-0" /> {com.dataCreacio}
                        </span>
                        {com.dataPrevista && (
                          <span className={`font-mono flex items-center gap-1 font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                            <Clock className="w-3.5 h-3.5 shrink-0" /> Prevista: {com.dataPrevista}
                          </span>
                        )}
                        {com.numAlbara && (
                          <span className={`font-mono flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                            <FileText className="w-3.5 h-3.5 shrink-0" /> Albarà: {com.numAlbara}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {com.estat !== 'Rebut' && (
                      <button
                        onClick={() => handleOpenReception(com)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Rebre Comanda
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyOrderText(com)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-amber-800'}`}
                      title="Copiar format text per enviar al proveïdor"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(com)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-amber-800'}`}
                      title="Editar ordre"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(com.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-red-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-red-600'}`}
                      title="Eliminar ordre"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lines Table */}
                <div className="pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`text-[10px] uppercase border-b ${isDark ? 'text-slate-500 border-slate-800/60' : 'text-slate-600 border-slate-200'}`}>
                          <th className="py-2">Material & Fabricant</th>
                          <th className="py-2 text-center">Unitats Compra</th>
                          <th className="py-2 text-center">Estoc Real</th>
                          <th className="py-2 text-center">Rebut</th>
                          <th className="py-2 text-right">Preu Compra</th>
                          <th className="py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
                        {(com.linies || []).map((l, i) => {
                          const mat = materials.find(m => m.id === l.materialId);
                          const lineFab = fabricants.find(f => f.id === l.fabricantId);
                          const uc = unitatsCompra.find(u => u.id === l.unitatCompraId);
                          const packLabel = uc ? uc.unitatCompra : (mat?.unitat || 'u');
                          const factor = Number(l.factorConversio || 1);
                          const stockUnits = Number(l.quantitatDemanada || 0) * factor;
                          const receivedStock = Number(l.quantitatRebuda || 0) * factor;

                          return (
                            <tr key={i} className={isDark ? 'text-slate-300' : 'text-slate-800'}>
                              <td className="py-2.5">
                                <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                  {mat ? mat.material : 'Material Desconegut'}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {lineFab && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-400">
                                      <Factory className="w-2.5 h-2.5" /> {lineFab.fabricant}
                                    </span>
                                  )}
                                  {(l.codiArticle || mat?.codiProPrin) && (
                                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                      Ref: {l.codiArticle || mat?.codiProPrin}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 text-center font-mono">
                                <span className="font-semibold text-amber-500">{l.quantitatDemanada}</span> {packLabel}
                              </td>

                              <td className="py-2.5 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  factor > 1 
                                    ? isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                    : ''
                                }`}>
                                  {formatDecimal(stockUnits)} {mat?.unitat || 'u'}
                                </span>
                              </td>

                              <td className="py-2.5 text-center font-mono">
                                {l.quantitatRebuda > 0 ? (
                                  <span className="text-emerald-500 font-semibold">
                                    {l.quantitatRebuda} {packLabel} {factor > 1 ? `(${formatDecimal(receivedStock)} ${mat?.unitat || 'u'})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">0</span>
                                )}
                              </td>

                              <td className="py-2.5 text-right font-mono">
                                <div className="font-semibold">{formatCurrency(l.preuPactat, 2)}</div>
                                {factor > 1 && (
                                  <div className="text-[10px] text-slate-500">
                                    ({formatCurrency(l.preuPactat / factor, 3)} / {mat?.unitat || 'u'})
                                  </div>
                                )}
                              </td>

                              <td className={`py-2.5 text-right font-mono font-semibold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                {formatCurrency(Number(l.quantitatDemanada || 0) * Number(l.preuPactat || 0), 2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-3 text-xs border-t border-slate-800/60 mt-2">
                    <p className="text-slate-400 italic line-clamp-1 max-w-xl">
                      {com.observacions ? `Obs: ${com.observacions}` : ''}
                    </p>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 mr-2">Total Comanda:</span>
                      <span className="font-mono font-extrabold text-amber-400 text-sm">
                        {formatCurrency(totalComanda, 2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova / Editar Comanda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <ShoppingCart className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">{editingComanda ? 'Editar Comanda' : 'Crear Nova Ordre de Compra'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="comanda-modal-form"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Comanda"
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

            <form id="comanda-modal-form" onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Row 1: Proveïdor, Fabricant, Estat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    Proveïdor *
                  </label>
                  <select
                    value={formData.proveidorId}
                    onChange={(e) => handleHeaderProveidorChange(e.target.value)}
                    required
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- Selecciona proveïdor --</option>
                    {[...proveidors].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'ca')).map(p => (
                      <option key={p.id} value={p.id}>{p.empresa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <Factory className="w-3.5 h-3.5 text-indigo-400" />
                    Fabricant (Opcional)
                  </label>
                  <select
                    value={formData.fabricantId}
                    onChange={(e) => setFormData({ ...formData, fabricantId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- Selecció per línia --</option>
                    {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
                      <option key={f.id} value={f.id}>{f.fabricant}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estat de la Comanda</label>
                  <select
                    value={formData.estat}
                    onChange={(e) => setFormData({ ...formData, estat: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Pendent">Pendent</option>
                    <option value="Demanat">Demanat</option>
                    <option value="Rebut">Rebut</option>
                    <option value="Cancel·lat">Cancel·lat</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Data Creació, Data Prevista, Nº Comanda Proveïdor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Data de Creació
                  </label>
                  <input
                    type="date"
                    value={formData.dataCreacio}
                    onChange={(e) => setFormData({ ...formData, dataCreacio: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Data Prevista (Proveïdor)
                  </label>
                  <input
                    type="date"
                    value={formData.dataPrevista || ''}
                    onChange={(e) => setFormData({ ...formData, dataPrevista: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-sky-400" />
                    Nº Comanda Proveïdor
                  </label>
                  <input
                    type="text"
                    value={formData.numComandaProveidor || ''}
                    onChange={(e) => setFormData({ ...formData, numComandaProveidor: e.target.value })}
                    placeholder="P. ex. PO-2026-8812 o ref. externa"
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Observacions</label>
                <input
                  type="text"
                  value={formData.observacions}
                  onChange={(e) => setFormData({ ...formData, observacions: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="Observacions per al proveïdor o internes..."
                />
              </div>

              {/* Línies de comanda */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-semibold text-amber-400 text-sm">Línies de Material</span>
                    <p className="text-[11px] text-slate-400">
                      Configura el fabricant, packaging de compra i unitats que ingressaran a l'estoc.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newLine = createDefaultLine();
                      setFormData(prev => ({
                        ...prev,
                        linies: [...prev.linies, newLine]
                      }));
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Afegir Línia
                  </button>
                </div>

                {formData.linies.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                    No hi ha cap línia de material. Fes clic a "+ Afegir Línia" per començar.
                  </div>
                ) : (
                  formData.linies.map((l, idx) => {
                    const mat = materials.find(m => m.id === l.materialId);
                    const factor = Number(l.factorConversio || 1);
                    const unitsToStock = Number(l.quantitatDemanada || 0) * factor;
                    const unitCost = factor > 0 ? Number(l.preuPactat || 0) / factor : Number(l.preuPactat || 0);
                    const subtotal = Number(l.quantitatDemanada || 0) * Number(l.preuPactat || 0);

                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border space-y-3 transition-all ${
                          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        {/* Row 1: Selectors (Material, Fabricant, Unitat de Compra) */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-slate-400 mb-1 font-medium">Material *</label>
                            <select
                              value={l.materialId}
                              onChange={(e) => handleLineMaterialChange(idx, e.target.value)}
                              className={`w-full p-2 rounded-lg border text-xs outline-none ${
                                isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              {[...materials].sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca')).map(m => (
                                <option key={m.id} value={m.id}>{m.material} ({m.unitat})</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-1 font-medium flex items-center gap-1">
                              <Factory className="w-3 h-3 text-indigo-400" />
                              Fabricant
                            </label>
                            <select
                              value={l.fabricantId || ''}
                              onChange={(e) => handleLineFabricantChange(idx, e.target.value)}
                              className={`w-full p-2 rounded-lg border text-xs outline-none ${
                                isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <option value="">-- Sense fabricant --</option>
                              {[...fabricants].sort((a, b) => (a.fabricant || '').localeCompare(b.fabricant || '', 'ca')).map(f => (
                                <option key={f.id} value={f.id}>{f.fabricant}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-1 font-medium flex items-center gap-1">
                              <Box className="w-3 h-3 text-amber-500" />
                              Unitat de Compra (Packaging)
                            </label>
                            <select
                              value={l.unitatCompraId || ''}
                              onChange={(e) => handleLineUnitatCompraChange(idx, e.target.value)}
                              className={`w-full p-2 rounded-lg border text-xs outline-none ${
                                isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <option value="">Unitat base ({mat?.unitat || 'u'}) [x1]</option>
                              {[...unitatsCompra].sort((a, b) => (a.unitatCompra || '').localeCompare(b.unitatCompra || '', 'ca')).map(uc => (
                                <option key={uc.id} value={uc.id}>
                                  {uc.unitatCompra} (x{uc.factorConversio} {mat?.unitat || 'u'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Row 2: Quantities, Stock conversion preview, Purchase price & Subtotal */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800/40">
                          {/* Quantitat Demanada de Compra */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                              Quantitat Compra
                            </label>
                            <DecimalInput
                              value={l.quantitatDemanada}
                              onChange={(e, num) => {
                                const updated = [...formData.linies];
                                updated[idx].quantitatDemanada = num;
                                setFormData({ ...formData, linies: updated });
                              }}
                              className={`w-full p-2 rounded-lg border text-xs font-mono font-semibold ${
                                isDark ? 'border-slate-800 bg-slate-900 text-amber-400' : 'border-slate-200 bg-white text-amber-600'
                              }`}
                            />
                          </div>

                          {/* Preview unitats de compra vs unitats reals que aniran a l'estoc */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                              Conversió a Estoc Real
                            </label>
                            <div className={`p-2 rounded-lg border flex items-center justify-between text-xs font-mono ${
                              factor > 1 
                                ? isDark ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                                : isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                            }`}>
                              <span className="truncate">{l.quantitatDemanada || 0} pack(s)</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0 mx-1 text-slate-500" />
                              <span className="font-bold text-emerald-400 shrink-0">
                                {formatDecimal(unitsToStock)} {mat?.unitat || 'u'} estoc
                              </span>
                            </div>
                          </div>

                          {/* Preu de Compra (el que rebrà el proveïdor per pack) */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-slate-400 font-medium truncate">
                                Preu de Compra (€)
                              </label>
                              {factor > 1 && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({formatCurrency(unitCost, 3)}/{mat?.unitat || 'u'})
                                </span>
                              )}
                            </div>
                            <DecimalInput
                              value={l.preuPactat}
                              onChange={(e, num) => {
                                const updated = [...formData.linies];
                                updated[idx].preuPactat = num;
                                setFormData({ ...formData, linies: updated });
                              }}
                              className={`w-full p-2 rounded-lg border text-xs font-mono font-semibold ${
                                isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                            />
                          </div>

                          {/* Subtotal & Delete */}
                          <div className="sm:col-span-2 flex items-center justify-between gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1 font-medium">Subtotal</label>
                              <div className="font-mono font-bold text-xs text-amber-400">
                                {formatCurrency(subtotal, 2)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  linies: prev.linies.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors mt-3"
                              title="Eliminar línia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recepció de Comanda */}
      {receptionModalOpen && selectedComandaToReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">Recepció de Comanda {selectedComandaToReceive.id}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="reception-modal-form"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Confirmar Recepció"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setReceptionModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                  title="Tancar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form id="reception-modal-form" onSubmit={handleConfirmReception} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Núm. d'Albarà / Factura de Entrada *</label>
                <input
                  type="text"
                  required
                  value={receptionData.numAlbara}
                  onChange={(e) => setReceptionData({ ...receptionData, numAlbara: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                  placeholder="P. ex. ALB-2026-8812"
                />
              </div>

              {(selectedComandaToReceive.numComandaProveidor || selectedComandaToReceive.dataPrevista) && (
                <div className={`p-3 rounded-xl border flex flex-wrap gap-4 text-xs ${
                  isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {selectedComandaToReceive.numComandaProveidor && (
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-3.5 h-3.5 text-sky-400" />
                      Nº Comanda Prov: <strong className="text-sky-400">{selectedComandaToReceive.numComandaProveidor}</strong>
                    </span>
                  )}
                  {selectedComandaToReceive.dataPrevista && (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Data Prevista: <strong className="text-cyan-400">{selectedComandaToReceive.dataPrevista}</strong>
                    </span>
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="updatePricesCheck"
                  checked={receptionData.updatePrices}
                  onChange={(e) => setReceptionData({ ...receptionData, updatePrices: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="updatePricesCheck" className="text-slate-200 font-medium cursor-pointer">
                  Actualitzar el preu de cost unitari i de pack del material segons aquesta comanda
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <span className="font-semibold text-slate-300 block">Comprovació de Quantitats Rebudes:</span>
                {receptionData.receivedLines && receptionData.receivedLines.map((l, idx) => {
                  const mat = materials.find(m => m.id === l.materialId);
                  const fab = fabricants.find(f => f.id === l.fabricantId);
                  const uc = unitatsCompra.find(u => u.id === l.unitatCompraId);
                  const packName = uc ? uc.unitatCompra : (mat?.unitat || 'u');
                  const factor = Number(l.factorConversio || 1);
                  const stockToAdd = Number(l.quantitatRebuda || 0) * factor;

                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 text-sm">{mat?.material}</h4>
                          {fab && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {fab.fabricant}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Demanat: {l.quantitatDemanada} {packName}</span>
                          <span>· Preu compra: {formatCurrency(l.preuPactat, 2)}</span>
                          {factor > 1 && (
                            <span className="text-cyan-400">
                              (Factor: x{factor} {mat?.unitat || 'u'})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-400">Rebut ({packName}):</label>
                          <DecimalInput
                            value={l.quantitatRebuda}
                            onChange={(e, num) => {
                              const updated = [...receptionData.receivedLines];
                              updated[idx].quantitatRebuda = num;
                              setReceptionData({ ...receptionData, receivedLines: updated });
                            }}
                            className="w-20 p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono text-center text-xs font-bold"
                          />
                        </div>

                        <div className="p-1.5 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold">
                          +{formatDecimal(stockToAdd)} {mat?.unitat || 'u'} estoc
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
