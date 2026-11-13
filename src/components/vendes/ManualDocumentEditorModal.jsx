import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Save, Package, Layers, Edit3, 
  Building2, User, FileText, Check, DollarSign, Percent, Calculator,
  ShoppingBag, Link2, ArrowRight, Receipt
} from 'lucide-react';
import { parseDecimal, formatCurrency, formatDecimal } from '../../utils/numberUtils';
import { calcularTotalsVenda, getNextDocumentNumber } from '../../utils/vendesUtils';

export default function ManualDocumentEditorModal({
  isOpen = false,
  tipus = 'factura', // 'factura' | 'albara' | 'comanda'
  initialData = null,
  clientsPortals = [],
  catalogProducts = [],
  projectesList = [],
  escandallsList = [],
  existingDocs = [],
  albaransList = [],
  pressupostosList = [],
  calculsPressupostosList = [],
  informacionsList = [],
  emissor = {},
  onSave,
  onClose,
  isDark = false
}) {
  if (!isOpen) return null;

  const isFactura = tipus === 'factura';
  const isAlbara = tipus === 'albara';
  const isComanda = tipus === 'comanda';
  const isPressupost = tipus === 'pressupost';

  // Mode de client: 'existent' o 'manual'
  const [clientMode, setClientMode] = useState(() => {
    if (initialData?.clientId) return 'portal';
    return 'manual';
  });

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      let carrer = initialData.clientAdreca || '';
      let cp = initialData.clientCodiPostal || '';
      let pob = initialData.clientPoblacio || '';
      let prov = initialData.clientProvincia || '';
      let pais = initialData.clientPais || 'Espanya';

      if (initialData.adrecaEnviament && typeof initialData.adrecaEnviament === 'object') {
        carrer = carrer || initialData.adrecaEnviament.carrer || '';
        cp = cp || initialData.adrecaEnviament.codiPostal || '';
        pob = pob || initialData.adrecaEnviament.poblacio || '';
        prov = prov || initialData.adrecaEnviament.provincia || '';
        pais = pais || initialData.adrecaEnviament.pais || 'Espanya';
      } else if (typeof initialData.adrecaEnviament === 'string') {
        carrer = carrer || initialData.adrecaEnviament;
      }

      const rao = initialData.clientRaoSocial || initialData.clientNom || initialData.nomClient || '';
      const rawLinies = initialData.linies || initialData.productes || [];
      const normalizedLinies = [];
      let extractedCostEnviament = initialData.costEnviament ? Number(initialData.costEnviament) : 0;
      let extractedNotesEnviament = initialData.notesEnviament || initialData.descripcioEnviament || initialData.comentarisEnviament || '';
      let extractedMitja = initialData.mitjaTransport || initialData.transportista || 'Correos';

      rawLinies.forEach(l => {
        const isShipping = l.esEnviament || l.tipus === 'enviament' || l.tipusLinia === 'enviament' ||
          (typeof l.nom === 'string' && (l.nom.toLowerCase().startsWith('enviament') || l.nom.toLowerCase().startsWith('despeses d\'enviament')));
        if (isShipping) {
          extractedCostEnviament = Number(l.preuUnitari !== undefined ? l.preuUnitari : (l.preu || extractedCostEnviament || 0));
          extractedNotesEnviament = extractedNotesEnviament || l.descripcio || l.notes || '';
        } else {
          const lineText = l.nom || l.concepte || (initialData.numero === 'PRE-2026-0001' ? 'Premis ACAPPS 30es Jornades' : 'Article');
          const descText = l.descripcio || l.notes || l.descripcioAdicional || '';
          normalizedLinies.push({
            ...l,
            nom: lineText,
            concepte: lineText,
            descripcio: descText,
            notes: descText
          });
        }
      });

      const condEnviament = initialData.condicionsEnviament || (extractedCostEnviament > 0 ? 'establert' : 'pendent');

      // Assegurem la numeració correcta del document segons el tipus destí
      let docNumero = initialData.numero;
      const needsNewNumber = !docNumero ||
        (tipus === 'albara' && !docNumero.startsWith('ALB-')) ||
        (tipus === 'factura' && !docNumero.startsWith('FAC-')) ||
        (tipus === 'comanda' && !docNumero.startsWith('CMD-')) ||
        (tipus === 'pressupost' && !docNumero.startsWith('PRE-'));

      if (needsNewNumber) {
        docNumero = getNextDocumentNumber(tipus, existingDocs);
      }

      const albaraNum = initialData.albaraNumero || initialData.albaraCodi || (initialData.tipusDoc === 'albara' || initialData.numero?.startsWith('ALB-') ? initialData.numero : '');
      const albaraIdVal = initialData.albaraId || (initialData.tipusDoc === 'albara' || initialData.numero?.startsWith('ALB-') ? (initialData.id || initialData.numero) : null);

      return {
        ...initialData,
        numero: docNumero,
        albaraId: albaraIdVal,
        albaraNumero: albaraNum,
        albaraCodi: albaraNum,
        clientRaoSocial: rao,
        clientNom: rao,
        clientNif: initialData.clientNif || initialData.nif || '',
        clientPersonaContacte: initialData.clientPersonaContacte || initialData.personaContacte || '',
        clientAdreca: carrer,
        clientCodiPostal: cp,
        clientPoblacio: pob,
        clientProvincia: prov,
        clientPais: pais,
        clientTelefon: initialData.clientTelefon || initialData.telefon || '',
        clientEmail: initialData.clientEmail || initialData.email || '',
        clientWeb: initialData.clientWeb || initialData.web || '',
        condicionsEnviament: condEnviament,
        mitjaTransport: extractedMitja,
        costEnviament: extractedCostEnviament,
        notesEnviament: extractedNotesEnviament,
        iban: initialData.iban || emissor?.iban || '',
        banc: initialData.banc || emissor?.banc || '',
        titularCompte: initialData.titularCompte || emissor?.titularCompte || '',
        bic: initialData.bic || emissor?.bic || '',
        linies: normalizedLinies,
        notes: initialData.notes || initialData.observacionsGenerals || '',
        ivaPercent: Number(initialData.ivaPercent !== undefined ? initialData.ivaPercent : 21)
      };
    }

    const nextNum = getNextDocumentNumber(tipus, existingDocs);
    const today = new Date().toISOString().slice(0, 10);
    const venciment = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return {
      numero: nextNum,
      dataEmissio: today,
      dataVenciment: venciment,
      albaraId: null,
      albaraNumero: '',
      albaraCodi: '',
      comandaCodi: '',
      comandaId: null,
      clientNom: '',
      clientRaoSocial: '',
      clientNif: '',
      clientPersonaContacte: '',
      clientAdreca: '',
      clientCodiPostal: '',
      clientPoblacio: '',
      clientProvincia: '',
      clientPais: 'Espanya',
      clientTelefon: '',
      clientEmail: '',
      clientWeb: '',
      clientId: null,
      clientSlug: null,
      linies: [],
      condicionsEnviament: isPressupost ? 'pendent' : 'establert',
      mitjaTransport: 'Correos',
      costEnviament: 0,
      notesEnviament: '',
      ivaPercent: 21,
      iban: emissor?.iban || '',
      banc: emissor?.banc || '',
      titularCompte: emissor?.titularCompte || '',
      bic: emissor?.bic || '',
      metodePagament: 'transferencia',
      estatCobrament: 'pendent',
      dataCobrament: '',
      notes: '',
      valorat: true
    };
  });

  // Estat per a afegir una nova línia
  const [lineSourceType, setLineSourceType] = useState('manual'); // 'manual' | 'producte' | 'projecte'
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newManualTitle, setNewManualTitle] = useState('');
  const [newManualDesc, setNewManualDesc] = useState('');
  const [newManualPrice, setNewManualPrice] = useState('');
  const [newManualQty, setNewManualQty] = useState(1);

  // Càlcul de totals en temps real (si el transport està acordat / establert, es suma al total)
  const totals = useMemo(() => {
    const shippingForTotal = formData.condicionsEnviament === 'establert' ? (Number(formData.costEnviament) || 0) : 0;
    return calcularTotalsVenda(formData.linies, shippingForTotal, formData.ivaPercent);
  }, [formData.linies, formData.costEnviament, formData.ivaPercent, formData.condicionsEnviament]);

  // Canvi de client des de la llista de clients de portals
  const handleSelectPortalClient = (clientId) => {
    const found = clientsPortals.find(c => c.id === clientId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        clientId: found.id,
        clientSlug: found.slug,
        clientNom: found.nomComercial,
        clientRaoSocial: found.raoSocial || found.nomComercial,
        clientPersonaContacte: found.personaContacte || '',
        clientEmail: found.emailContacte || prev.clientEmail,
        clientTelefon: found.telefonContacte || prev.clientTelefon,
        clientAdreca: found.adreca || prev.clientAdreca,
        clientCodiPostal: found.codiPostal || prev.clientCodiPostal,
        clientPoblacio: found.poblacio || prev.clientPoblacio,
        clientProvincia: found.provincia || prev.clientProvincia,
        clientPais: found.pais || prev.clientPais || 'Espanya',
        clientWeb: found.web || prev.clientWeb || '',
        clientNif: found.nif || prev.clientNif
      }));
    }
  };

  // Importar i traspassar dades des d'un albarà existent (obligatori per a Factura)
  const handleImportFromAlbara = (val) => {
    if (!val) return;
    const aId = val.startsWith('albara_') ? val.replace('albara_', '') : val;
    const a = (albaransList || []).find(x => x.id === aId || x.numero === aId);
    if (!a) return;

    const rawLinies = a.linies || a.productes || [];
    const liniesSenseEnviament = [];
    let extractedCostEnviament = a.costEnviament !== undefined ? Number(a.costEnviament) : 0;
    let extractedNotesEnviament = a.notesEnviament || a.descripcioEnviament || a.comentarisEnviament || '';
    let extractedMitja = a.mitjaTransport || a.transportista || 'Correos';

    rawLinies.forEach((item, idx) => {
      const isShipping = item.esEnviament || item.tipus === 'enviament' || item.tipusLinia === 'enviament' ||
        (typeof item.nom === 'string' && (item.nom.toLowerCase().startsWith('enviament') || item.nom.toLowerCase().startsWith('despeses d\'enviament')));
      if (isShipping) {
        extractedCostEnviament = Number(item.preuUnitari !== undefined ? item.preuUnitari : (item.preu || extractedCostEnviament || 0));
        extractedNotesEnviament = extractedNotesEnviament || item.descripcio || item.notes || '';
      } else {
        const lNom = item.nom || item.concepte || 'Article';
        const lDesc = item.descripcio || item.notes || item.descripcioAdicional || '';
        liniesSenseEnviament.push({
          id: item.id || `lin-alb-${idx}-${Date.now()}`,
          tipus: item.tipus || item.tipusLinia || 'producte',
          producteId: item.articleId || item.id || null,
          nom: lNom,
          concepte: lNom,
          descripcio: lDesc,
          notes: lDesc,
          quantitat: Number(item.quantitat || 1),
          preuUnitari: parseDecimal(item.preuUnitari || item.preu || 0),
          descomptePercent: Number(item.descomptePercent || 0)
        });
      }
    });

    const condEnviament = a.condicionsEnviament || (extractedCostEnviament > 0 ? 'establert' : 'pendent');

    let carrer = a.clientAdreca || '';
    let cp = a.clientCodiPostal || '';
    let pob = a.clientPoblacio || '';
    let prov = a.clientProvincia || '';
    let pais = a.clientPais || 'Espanya';

    if (a.adrecaEnviament && typeof a.adrecaEnviament === 'object') {
      carrer = carrer || a.adrecaEnviament.carrer || '';
      cp = cp || a.adrecaEnviament.codiPostal || '';
      pob = pob || a.adrecaEnviament.poblacio || '';
      prov = prov || a.adrecaEnviament.provincia || '';
      pais = pais || a.adrecaEnviament.pais || 'Espanya';
    } else if (typeof a.adrecaEnviament === 'string') {
      carrer = carrer || a.adrecaEnviament;
    }

    const rao = a.clientRaoSocial || a.clientNom || '';

    setFormData(prev => ({
      ...prev,
      albaraId: a.id || a.numero,
      albaraNumero: a.numero,
      albaraCodi: a.numero,
      comandaCodi: a.comandaCodi || a.comandaId || prev.comandaCodi,
      pressupostId: a.pressupostId || prev.pressupostId,
      clientId: a.clientId || prev.clientId,
      clientSlug: a.clientSlug || prev.clientSlug,
      clientRaoSocial: rao || prev.clientRaoSocial,
      clientNom: rao || prev.clientNom,
      clientNif: a.clientNif || a.nif || prev.clientNif,
      clientPersonaContacte: a.clientPersonaContacte || a.personaContacte || prev.clientPersonaContacte,
      clientEmail: a.clientEmail || prev.clientEmail,
      clientTelefon: a.clientTelefon || prev.clientTelefon,
      clientAdreca: carrer || prev.clientAdreca,
      clientCodiPostal: cp || prev.clientCodiPostal,
      clientPoblacio: pob || prev.clientPoblacio,
      clientProvincia: prov || prev.clientProvincia,
      clientPais: pais || prev.clientPais || 'Espanya',
      clientWeb: a.clientWeb || a.web || prev.clientWeb,
      condicionsEnviament: condEnviament,
      mitjaTransport: extractedMitja,
      costEnviament: extractedCostEnviament,
      notesEnviament: extractedNotesEnviament,
      linies: liniesSenseEnviament.length > 0 ? liniesSenseEnviament : prev.linies,
      notes: a.notes || a.observacionsGenerals || prev.notes,
      ivaPercent: Number(a.ivaPercent !== undefined ? a.ivaPercent : (prev.ivaPercent || 21)),
      metodePagament: a.metodePagament || prev.metodePagament,
      estatCobrament: a.estatCobrament || prev.estatCobrament || 'pendent'
    }));
  };

  // Importar i traspassar dades des d'un pressupost existent
  const handleImportFromPressupost = (val) => {
    if (!val) return;

    if (val.startsWith('pressupost_')) {
      const pId = val.replace('pressupost_', '');
      const p = (pressupostosList || []).find(x => x.id === pId);
      if (!p) return;

      const rawImported = p.linies || p.productes || [];
      const liniesSenseEnviament = [];
      let extractedCostEnviament = p.costEnviament !== undefined ? Number(p.costEnviament) : 0;
      let extractedNotesEnviament = p.notesEnviament || p.descripcioEnviament || p.comentarisEnviament || '';
      let extractedMitja = p.mitjaTransport || p.transportista || 'Correos';

      rawImported.forEach((item, idx) => {
        const isShipping = item.esEnviament || item.tipus === 'enviament' || item.tipusLinia === 'enviament' ||
          (typeof item.nom === 'string' && (item.nom.toLowerCase().startsWith('enviament') || item.nom.toLowerCase().startsWith('despeses d\'enviament')));
        if (isShipping) {
          extractedCostEnviament = Number(item.preuUnitari !== undefined ? item.preuUnitari : (item.preu || extractedCostEnviament || 0));
          extractedNotesEnviament = extractedNotesEnviament || item.descripcio || item.notes || '';
        } else {
          const lNom = item.nom || item.concepte || 'Article';
          const lDesc = item.descripcio || item.notes || item.descripcioAdicional || (item.opcionsTriades ? (typeof item.opcionsTriades === 'string' ? item.opcionsTriades : JSON.stringify(item.opcionsTriades)) : '');
          liniesSenseEnviament.push({
            id: item.id || `lin-p-${idx}-${Date.now()}`,
            tipus: item.tipus || item.tipusLinia || 'producte',
            producteId: item.articleId || item.id || null,
            nom: lNom,
            concepte: lNom,
            descripcio: lDesc,
            notes: lDesc,
            quantitat: Number(item.quantitat || 1),
            preuUnitari: parseDecimal(item.preuUnitari || item.preu || 0),
            descomptePercent: Number(item.descomptePercent || 0)
          });
        }
      });

      const condEnviament = p.condicionsEnviament || (extractedCostEnviament > 0 ? 'establert' : 'pendent');

      let carrer = p.clientAdreca || '';
      let cp = p.clientCodiPostal || '';
      let pob = p.clientPoblacio || '';
      let prov = p.clientProvincia || '';
      let pais = p.clientPais || 'Espanya';

      if (p.adrecaEnviament && typeof p.adrecaEnviament === 'object') {
        carrer = carrer || p.adrecaEnviament.carrer || '';
        cp = cp || p.adrecaEnviament.codiPostal || '';
        pob = pob || p.adrecaEnviament.poblacio || '';
        prov = prov || p.adrecaEnviament.provincia || '';
        pais = pais || p.adrecaEnviament.pais || 'Espanya';
      } else if (typeof p.adrecaEnviament === 'string') {
        carrer = carrer || p.adrecaEnviament;
      }

      const rao = p.clientRaoSocial || p.clientNom || '';

      setFormData(prev => ({
        ...prev,
        comandaCodi: p.codiReferencia || p.id,
        pressupostId: p.id,
        clientRaoSocial: rao || prev.clientRaoSocial,
        clientNom: rao || prev.clientNom,
        clientNif: p.clientNif || p.nif || prev.clientNif,
        clientPersonaContacte: p.clientPersonaContacte || p.personaContacte || prev.clientPersonaContacte,
        clientEmail: (p.clientContacte && p.clientContacte.includes('@')) ? p.clientContacte : (p.clientEmail || prev.clientEmail),
        clientTelefon: (p.clientContacte && !p.clientContacte.includes('@')) ? p.clientContacte : (p.clientTelefon || prev.clientTelefon),
        clientAdreca: carrer || prev.clientAdreca,
        clientCodiPostal: cp || prev.clientCodiPostal,
        clientPoblacio: pob || prev.clientPoblacio,
        clientProvincia: prov || prev.clientProvincia,
        clientPais: pais || prev.clientPais || 'Espanya',
        clientWeb: p.clientWeb || p.web || prev.clientWeb,
        condicionsEnviament: condEnviament,
        mitjaTransport: extractedMitja,
        costEnviament: extractedCostEnviament,
        notesEnviament: extractedNotesEnviament,
        linies: liniesSenseEnviament.length > 0 ? liniesSenseEnviament : prev.linies,
        notes: p.observacionsGenerals || p.notes || prev.notes,
        ivaPercent: Number(p.ivaPercent !== undefined ? p.ivaPercent : (prev.ivaPercent || 21)),
        metodePagament: p.metodePagament || prev.metodePagament,
        estatCobrament: p.estatPagament === 'pagat' ? 'cobrada' : prev.estatCobrament
      }));
    } else if (val.startsWith('calcul_')) {
      const cId = val.replace('calcul_', '');
      const c = (calculsPressupostosList || []).find(x => x.id === cId);
      if (!c) return;

      const linia = {
        id: `lin-calc-${Date.now()}`,
        tipus: 'producte',
        producteId: c.articleId || null,
        nom: c.articleNom || 'Article a mida',
        descripcio: c.resenyaManual ? `Càlcul: ${c.resenyaManual}` : 'Pressupost calculat a mida',
        quantitat: 1,
        preuUnitari: parseDecimal(c.preuVendaFinal || 0),
        descomptePercent: 0
      };

      setFormData(prev => ({
        ...prev,
        comandaCodi: `CALC-${c.id ? c.id.slice(-6).toUpperCase() : 'PREU'}`,
        pressupostId: c.id,
        clientNom: c.clientNom || prev.clientNom,
        linies: [linia],
        notes: c.resenyaManual ? `Pressupost calculat: ${c.resenyaManual}` : prev.notes
      }));
    }
  };

  // Afegir una nova línia de concepte
  const handleAddLine = () => {
    let newLine = null;

    if (lineSourceType === 'producte') {
      const prod = catalogProducts.find(p => p.id === selectedCatalogProductId);
      if (!prod) return alert('Si us plau, tria un producte de catàleg.');
      const prodNom = prod.nom || prod.title || 'Producte de catàleg';
      const prodDesc = prod.descripcio || '';
      newLine = {
        id: `lin-${Date.now()}`,
        tipus: 'producte',
        producteId: prod.id,
        nom: prodNom,
        concepte: prodNom,
        descripcio: prodDesc,
        notes: prodDesc,
        quantitat: Math.max(1, parseInt(newManualQty, 10) || 1),
        preuUnitari: parseDecimal(prod.preu || prod.price || 0),
        descomptePercent: 0
      };
      setSelectedCatalogProductId('');
    } else if (lineSourceType === 'projecte') {
      const proj = projectesList.find(p => p.id === selectedProjectId) || escandallsList.find(e => e.id === selectedProjectId);
      if (!proj) return alert('Si us plau, tria un projecte.');
      const nom = proj.titol || proj.title || proj.nom || proj.producteNom || 'Projecte a Mida';
      const projDesc = proj.descripcio || (proj.tipus ? `Tipus: ${proj.tipus}` : 'Projecte artesanal a mida');
      newLine = {
        id: `lin-${Date.now()}`,
        tipus: 'projecte',
        projecteId: proj.id,
        nom: nom,
        concepte: nom,
        descripcio: projDesc,
        notes: projDesc,
        quantitat: Math.max(1, parseInt(newManualQty, 10) || 1),
        preuUnitari: parseDecimal(proj.preu || proj.preuWebActual || proj.pressupost || 0),
        descomptePercent: 0
      };
      setSelectedProjectId('');
    } else {
      // Manual / Lliure
      if (!newManualTitle.trim()) return alert('Si us plau, escriu el concepte o nom de la línia.');
      const mNom = newManualTitle.trim();
      const mDesc = newManualDesc.trim();
      newLine = {
        id: `lin-${Date.now()}`,
        tipus: 'manual',
        nom: mNom,
        concepte: mNom,
        descripcio: mDesc,
        notes: mDesc,
        quantitat: Math.max(1, parseInt(newManualQty, 10) || 1),
        preuUnitari: parseDecimal(newManualPrice, 0),
        descomptePercent: 0
      };
      setNewManualTitle('');
      setNewManualDesc('');
      setNewManualPrice('');
    }

    setFormData(prev => ({
      ...prev,
      linies: [...(prev.linies || []), newLine]
    }));
    setNewManualQty(1);
  };

  const handleUpdateLine = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.linies];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'nom') {
        updated[index].concepte = value;
      } else if (field === 'concepte') {
        updated[index].nom = value;
      } else if (field === 'descripcio') {
        updated[index].notes = value;
      } else if (field === 'notes') {
        updated[index].descripcio = value;
      }
      return { ...prev, linies: updated };
    });
  };

  const handleDeleteLine = (index) => {
    setFormData(prev => ({
      ...prev,
      linies: prev.linies.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.numero.trim()) {
      return alert('El número de document és obligatori.');
    }
    if (!formData.clientNom.trim()) {
      return alert('El nom del client és obligatori.');
    }
    if (formData.linies.length === 0) {
      return alert('Cal incloure com a mínim una línia de producte o projecte.');
    }
    if (isFactura && !formData.albaraNumero && !formData.albaraCodi && albaransList && albaransList.length > 0) {
      const confirmContinue = window.confirm("⚠️ Sempre s'ha d'agafar o vincular un Albarà per fer una factura. Vols continuar sense vincular un albarà?");
      if (!confirmContinue) return;
    }

    const payload = {
      ...formData,
      baseImposable: totals.baseImposable,
      importIva: totals.importIva,
      total: totals.total,
      dataActualitzacio: new Date().toISOString()
    };

    onSave(payload);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-6 pt-20 sm:pt-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className={`w-full max-w-4xl max-h-[88vh] my-auto rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Capçalera Modal */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>
                {initialData ? 'Editar ' : 'Nou '}
                {isFactura && 'Factura Oficial'}
                {isAlbara && 'Albarà de Lliurament'}
                {isComanda && 'Comanda Manual / Verbal'}
                {isPressupost && 'Pressupost / Estimació Comercial'}
              </span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isPressupost 
                ? 'Elabora una proposta comercial en fusta de til·ler per al client abans de formalitzar la comanda.' 
                : 'Emplena les dades del client i afegeix els productes, projectes a mida o línies lliures.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulari amb Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* BANNER D'IMPORTACIÓ I VINCULACIÓ: PER FACTURA DES D'ALBARÀ (SEMPRE REQUERIT), PER COMANDA/ALBARÀ DES DE PRESSUPOST */}
          {isFactura ? (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isDark ? 'bg-amber-950/25 border-amber-900/50 text-amber-100' : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <strong className="block text-xs font-semibold">
                    Vincular o Traspassar des d'un Albarà de Lliurament *
                  </strong>
                  <span className={`text-[11px] ${isDark ? 'text-amber-300/70' : 'text-amber-800/80'}`}>
                    Sempre cal un albarà previ per emetre la factura. Tria l'albarà per carregar client, línies, transport i totals.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleImportFromAlbara(e.target.value)}
                  value={formData.albaraId ? `albara_${formData.albaraId}` : (formData.albaraNumero ? `albara_${formData.albaraNumero}` : '')}
                  className={`text-xs py-1.5 px-3 rounded-lg border font-medium max-w-xs truncate cursor-pointer ${
                    isDark ? 'bg-slate-900 border-amber-700/60 text-slate-100' : 'bg-white border-amber-400 text-slate-900'
                  }`}
                >
                  <option value="">-- Tria un Albarà per facturar --</option>
                  {albaransList && albaransList.length > 0 ? (
                    albaransList.map(alb => (
                      <option key={alb.id} value={`albara_${alb.id}`}>
                        {alb.numero} · {alb.clientRaoSocial || alb.clientNom} ({(alb.linies || alb.productes || []).length} articles) · {formatCurrency(alb.total || 0)}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Cap albarà disponible (cal crear l'albarà primer)</option>
                  )}
                </select>
              </div>
            </div>
          ) : !isPressupost ? (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-100' : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <strong className="block text-xs font-semibold">
                    Vincular o Traspassar des d'un Pressupost existent
                  </strong>
                  <span className={`text-[11px] ${isDark ? 'text-amber-300/70' : 'text-amber-800/80'}`}>
                    Carrega automàticament el client, articles, opcions i preus a {isAlbara ? "l'albarà" : 'la comanda'}.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleImportFromPressupost(e.target.value)}
                  defaultValue=""
                  className={`text-xs py-1.5 px-3 rounded-lg border font-medium max-w-xs truncate cursor-pointer ${
                    isDark ? 'bg-slate-900 border-amber-700/60 text-slate-100' : 'bg-white border-amber-400 text-slate-900'
                  }`}
                >
                  <option value="">-- Tria un Pressupost per traspassar --</option>
                  {pressupostosList && pressupostosList.length > 0 && (
                    <optgroup label="Sol·licituds de Pressupost (Web)">
                      {pressupostosList.map(pr => (
                        <option key={pr.id} value={`pressupost_${pr.id}`}>
                          {pr.codiReferencia || pr.id} · {pr.clientNom} ({(pr.productes || []).length} peces)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {calculsPressupostosList && calculsPressupostosList.length > 0 && (
                    <optgroup label="Càlculs de Preus desats">
                      {calculsPressupostosList.map(cp => (
                        <option key={cp.id} value={`calcul_${cp.id}`}>
                          [Càlcul] {cp.clientNom} · {cp.articleNom} ({formatCurrency(cp.preuVendaFinal)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          ) : null}

          {/* 1. Dades Principals del Document */}
          <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
          }`}>
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                Número de {isFactura ? 'Factura' : isAlbara ? 'Albarà' : isPressupost ? 'Pressupost' : 'Comanda'} *
              </label>
              <input
                type="text"
                required
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border font-mono font-bold text-xs outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                Data d'Emissió *
              </label>
              <input
                type="date"
                required
                value={formData.dataEmissio}
                onChange={(e) => setFormData({ ...formData, dataEmissio: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {(isFactura || isPressupost) && (
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  {isPressupost ? 'Validesa fins a' : 'Data de Venciment'}
                </label>
                <input
                  type="date"
                  value={formData.dataVenciment}
                  onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] uppercase font-bold text-slate-500">
                  {isFactura ? 'Ref. Albarà Vinculat *' : 'Ref. Comanda Vinculada'}
                </label>
                {(formData.albaraNumero || formData.albaraCodi || formData.pressupostId) && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    ✓ Vinculat
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={isFactura ? 'Ex: ALB-2026-0001' : 'Ex: MM-2026-001 o comanda verbal'}
                value={isFactura ? (formData.albaraNumero || formData.albaraCodi || '') : (formData.comandaCodi || '')}
                onChange={(e) => {
                  if (isFactura) {
                    setFormData({ ...formData, albaraNumero: e.target.value, albaraCodi: e.target.value });
                  } else {
                    setFormData({ ...formData, comandaCodi: e.target.value });
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {isAlbara && (
              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.valorat !== false}
                    onChange={(e) => setFormData({ ...formData, valorat: e.target.checked })}
                    className="rounded text-amber-600 cursor-pointer"
                  />
                  <span>Albarà Valorat (mostrar preus i subtotal a l'albarà)</span>
                </label>
              </div>
            )}
          </div>

          {/* 2. Dades del Client */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline/10 pb-2">
              <span className="font-bold text-xs uppercase text-primary flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary" />
                <span>Dades del Client / Receptor</span>
              </span>

              {clientsPortals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Tria de portal:</span>
                  <select
                    onChange={(e) => handleSelectPortalClient(e.target.value)}
                    value={formData.clientId || ''}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer font-bold ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">-- Client Directe / Nou --</option>
                    {clientsPortals.map(c => (
                      <option key={c.id} value={c.id}>
                        🏷️ {c.nomComercial} (/?{c.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Raó Social */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Raó Social / Nom Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Little Spider Homes o Jordi Casals"
                  value={formData.clientRaoSocial || formData.clientNom || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    clientRaoSocial: e.target.value,
                    clientNom: e.target.value 
                  })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none font-semibold notranslate ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  translate="no"
                />
              </div>

              {/* NIF / CIF / DNI */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  NIF / CIF / DNI
                </label>
                <input
                  type="text"
                  placeholder="12345678X"
                  value={formData.clientNif || ''}
                  onChange={(e) => setFormData({ ...formData, clientNif: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Persona de Contacte */}
              <div className="sm:col-span-2 md:col-span-2">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Persona de Contacte
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maria Rovira (Directora de Compres)"
                  value={formData.clientPersonaContacte || ''}
                  onChange={(e) => setFormData({ ...formData, clientPersonaContacte: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Telèfon */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Telèfon
                </label>
                <input
                  type="text"
                  placeholder="+34 600 000 000"
                  value={formData.clientTelefon || ''}
                  onChange={(e) => setFormData({ ...formData, clientTelefon: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Mail */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Mail (Correu Electrònic)
                </label>
                <input
                  type="email"
                  placeholder="contacte@client.cat"
                  value={formData.clientEmail || ''}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Web */}
              <div className="sm:col-span-2 md:col-span-2">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Pàgina Web
                </label>
                <input
                  type="text"
                  placeholder="www.exemple.cat"
                  value={formData.clientWeb || ''}
                  onChange={(e) => setFormData({ ...formData, clientWeb: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Adreça */}
              <div className="sm:col-span-2 md:col-span-2">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Adreça (Carrer, Número, Pis...)
                </label>
                <input
                  type="text"
                  placeholder="Carrer Major, 14, 2n 1a"
                  value={formData.clientAdreca || ''}
                  onChange={(e) => setFormData({ ...formData, clientAdreca: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Codi Postal */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Codi Postal
                </label>
                <input
                  type="text"
                  placeholder="08001"
                  value={formData.clientCodiPostal || ''}
                  onChange={(e) => setFormData({ ...formData, clientCodiPostal: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Població */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Població
                </label>
                <input
                  type="text"
                  placeholder="Barcelona"
                  value={formData.clientPoblacio || ''}
                  onChange={(e) => setFormData({ ...formData, clientPoblacio: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Província */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  Província
                </label>
                <input
                  type="text"
                  placeholder="Barcelona"
                  value={formData.clientProvincia || ''}
                  onChange={(e) => setFormData({ ...formData, clientProvincia: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* País */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                  País
                </label>
                <input
                  type="text"
                  placeholder="Espanya"
                  value={formData.clientPais || 'Espanya'}
                  onChange={(e) => setFormData({ ...formData, clientPais: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 3. Línies de la Venda (Productes, Projectes i Concepte Lliure) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <span className="font-bold text-xs uppercase text-primary flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <span>Línies de Venda ({formData.linies.length})</span>
              </span>
            </div>

            {/* Selector de Nova Línia */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-amber-50/30 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500">Origen de la línia:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLineSourceType('producte')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      lineSourceType === 'producte' 
                        ? 'bg-amber-600 text-white' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-700')
                    }`}
                  >
                    📦 Producte Catàleg
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineSourceType('projecte')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      lineSourceType === 'projecte' 
                        ? 'bg-amber-600 text-white' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-700')
                    }`}
                  >
                    🪵 Projecte / A Mida
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineSourceType('manual')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      lineSourceType === 'manual' 
                        ? 'bg-amber-600 text-white' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-700')
                    }`}
                  >
                    ✏️ Línia Lliure / Manual
                  </button>
                </div>
              </div>

              {/* Formulari d'afegir línia segons origen */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {lineSourceType === 'producte' && (
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                      Selecciona el Producte de Catàleg
                    </label>
                    <select
                      value={selectedCatalogProductId}
                      onChange={(e) => setSelectedCatalogProductId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Tria un producte --</option>
                      {catalogProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nom || p.title} ({formatCurrency(p.preu || p.price || 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {lineSourceType === 'projecte' && (
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                      Selecciona el Projecte (Món Mínim o Escandallats)
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Tria un projecte --</option>
                      {projectesList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.titol || p.title || p.nom} {p.preu ? `(${formatCurrency(p.preu)})` : ''}
                        </option>
                      ))}
                      {escandallsList.filter(e => e.tipus && e.tipus !== 'Producte Web').map(e => (
                        <option key={e.id} value={e.id}>
                          [Escandall] {e.producteNom} {e.pvpRecomanat ? `(${formatCurrency(e.pvpRecomanat)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {lineSourceType === 'manual' && (
                  <>
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                        Concepte / Nom de la Peça o Servei *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Premis ACAPPS 30es Jornades"
                        value={newManualTitle}
                        onChange={(e) => setNewManualTitle(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-xs outline-none font-medium ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                        Preu Unitari Sense IVA (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newManualPrice}
                        onChange={(e) => setNewManualPrice(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="sm:col-span-12">
                      <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                        Notes / Aclariments d'aquesta línia (opcional)
                      </label>
                      <textarea
                        rows={1}
                        placeholder="Explicacions addicionals (mides, acabats en fusta de til·ler, detalls específics)..."
                        value={newManualDesc}
                        onChange={(e) => setNewManualDesc(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                    Quantitat
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newManualQty}
                    onChange={(e) => setNewManualQty(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border font-mono text-xs text-center outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Afegir Línia</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Taula de línies afegides */}
            <div className="overflow-x-auto border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className={`text-[10px] uppercase tracking-wider font-bold border-b ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Concepte / Descripció</th>
                    <th className="py-2.5 px-3 text-center w-20">Quantitat</th>
                    <th className="py-2.5 px-3 text-right w-28">Preu Unit. (€)</th>
                    <th className="py-2.5 px-3 text-right w-20">Dte. (%)</th>
                    <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                    <th className="py-2.5 px-3 text-center w-12">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/10 text-xs">
                  {formData.linies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        Encara no hi ha cap línia afegida a aquest document. Utilitza el selector superior.
                      </td>
                    </tr>
                  ) : (
                    formData.linies.map((linia, idx) => {
                      const qty = Number(linia.quantitat || 1);
                      const preu = Number(linia.preuUnitari || 0);
                      const dte = Number(linia.descomptePercent || 0);
                      const subtotal = qty * preu * (1 - (dte / 100));

                      return (
                        <tr key={linia.id || idx} className="hover:bg-slate-500/5">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={linia.nom || ''}
                              placeholder="Nom o concepte de la línia"
                              onChange={(e) => handleUpdateLine(idx, 'nom', e.target.value)}
                              className={`w-full px-2 py-1 rounded border text-xs font-semibold outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            <textarea
                              rows={2}
                              placeholder="Notes, explicacions o aclariments d'aquesta línia..."
                              value={linia.descripcio || linia.notes || ''}
                              onChange={(e) => handleUpdateLine(idx, 'descripcio', e.target.value)}
                              className={`w-full mt-1.5 px-2 py-1 rounded border text-[11px] leading-relaxed outline-none resize-y ${
                                isDark ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 placeholder-slate-500' : 'bg-slate-50 border-slate-300/80 text-slate-700 placeholder-slate-400'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={linia.quantitat}
                              onChange={(e) => handleUpdateLine(idx, 'quantitat', parseInt(e.target.value, 10) || 1)}
                              className={`w-16 px-1.5 py-1 text-center font-mono rounded border text-xs outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={linia.preuUnitari}
                              onChange={(e) => handleUpdateLine(idx, 'preuUnitari', parseFloat(e.target.value) || 0)}
                              className={`w-24 px-1.5 py-1 text-right font-mono rounded border text-xs outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={linia.descomptePercent || 0}
                              onChange={(e) => handleUpdateLine(idx, 'descomptePercent', parseFloat(e.target.value) || 0)}
                              className={`w-16 px-1.5 py-1 text-right font-mono rounded border text-xs outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(idx)}
                              className="text-error hover:opacity-80 p-1 cursor-pointer transition-opacity"
                              title="Eliminar línia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {formData.condicionsEnviament === 'establert' && (
                    <tr className={`border-t-2 ${isDark ? 'bg-amber-950/20 border-amber-600/30' : 'bg-amber-50/70 border-amber-300'}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Package className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                            Enviament / Transport ({formData.mitjaTransport || 'Correos'})
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            Acordat
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Comentaris, condicions o aclariments sobre aquest enviament (igual que a les altres línies)..."
                          value={formData.notesEnviament || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, notesEnviament: e.target.value }))}
                          className={`w-full px-2 py-1 rounded border text-[11px] leading-relaxed outline-none resize-y ${
                            isDark ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        1
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.costEnviament || ''}
                          placeholder="0.00"
                          onChange={(e) => setFormData(prev => ({ ...prev, costEnviament: parseFloat(e.target.value) || 0 }))}
                          className={`w-24 px-1.5 py-1 text-right font-mono rounded border text-xs outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">
                        -
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-amber-900 dark:text-amber-200">
                        {formatCurrency(formData.costEnviament || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, condicionsEnviament: 'pendent', costEnviament: 0 }))}
                          className="text-amber-700 dark:text-amber-400 hover:opacity-80 p-1 cursor-pointer transition-opacity"
                          title="Passar transport a 'Pendent d'acordar'"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {formData.condicionsEnviament === 'pendent' && (
                <div className="flex justify-end p-2 border-t border-outline/10 bg-slate-50/50 dark:bg-slate-900/50">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, condicionsEnviament: 'establert', costEnviament: prev.costEnviament || 0 }))}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>+ Acordar transport (afegir línia d'enviament)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Enviament, Impostos i Totals */}
          <div className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-6 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
          }`}>
            <div className="space-y-3">
              {/* Condicions d'Enviament / Transport */}
              <div className={`p-3 rounded-xl border space-y-2.5 ${
                isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="block text-[11px] uppercase font-bold text-slate-500">
                  Condicions d'Enviament / Transport
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                    formData.condicionsEnviament === 'pendent'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-300 font-bold'
                      : 'border-slate-300 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="condicionsEnviament"
                      checked={formData.condicionsEnviament === 'pendent'}
                      onChange={() => setFormData({ ...formData, condicionsEnviament: 'pendent', costEnviament: 0 })}
                      className="accent-amber-600 cursor-pointer"
                    />
                    <span>Pendent d'acordar</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                    formData.condicionsEnviament === 'establert'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-300 font-bold'
                      : 'border-slate-300 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="condicionsEnviament"
                      checked={formData.condicionsEnviament === 'establert'}
                      onChange={() => setFormData({ ...formData, condicionsEnviament: 'establert' })}
                      className="accent-amber-600 cursor-pointer"
                    />
                    <span>Cost establert / Acordat</span>
                  </label>
                </div>

                {formData.condicionsEnviament === 'pendent' && (
                  <p className="text-[11px] text-slate-500 italic">
                    Encara no s'ha decidit per cap de les parts i queda pendent de concreció (no es suma al total).
                  </p>
                )}

                {formData.condicionsEnviament === 'establert' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Mitjà de Transport
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Correos / Agència / Taller"
                        value={formData.mitjaTransport || ''}
                        onChange={(e) => setFormData({ ...formData, mitjaTransport: e.target.value })}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Cost Sense IVA (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.costEnviament || ''}
                        onChange={(e) => setFormData({ ...formData, costEnviament: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Comentaris / Aclariments de l'Enviament (opcional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Comentaris, condicions o aclariments sobre aquest enviament..."
                        value={formData.notesEnviament || ''}
                        onChange={(e) => setFormData({ ...formData, notesEnviament: e.target.value })}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none resize-y ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <p className="sm:col-span-2 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      ✓ Aquest transport apareix com a última línia del pressupost i es suma al total amb el seu IVA corresponent.
                    </p>
                  </div>
                )}
              </div>

              {isFactura && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                      Mètode de Pagament
                    </label>
                    <select
                      value={formData.metodePagament || 'transferencia'}
                      onChange={(e) => setFormData({ ...formData, metodePagament: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="transferencia">Transferència Bancària</option>
                      <option value="bizum">Bizum</option>
                      <option value="targeta">Targeta de Crèdit</option>
                      <option value="efectiu">Efectiu al taller</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">
                      Estat de Cobrament
                    </label>
                    <select
                      value={formData.estatCobrament || 'pendent'}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        estatCobrament: e.target.value,
                        dataCobrament: e.target.value === 'cobrada' ? (formData.dataCobrament || new Date().toISOString().slice(0, 10)) : ''
                      })}
                      className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold ${
                        formData.estatCobrament === 'cobrada' 
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                      }`}
                    >
                      <option value="pendent">Pendent de Cobrament</option>
                      <option value="cobrada">Cobrada</option>
                    </select>
                  </div>

                  {formData.metodePagament === 'transferencia' && (
                    <div className={`col-span-2 p-3 rounded-lg border text-xs space-y-1.5 ${
                      isDark ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="w-3.5 h-3.5" />
                          Compte Bancari assignat a aquesta Factura:
                        </span>
                        {(formData.iban || emissor?.iban) ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            ✓ S'afegirà a la factura
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            ⚠️ Configura l'IBAN a Gestió / Configuració
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-900 dark:text-slate-100">
                        IBAN: <strong>{formData.iban || emissor?.iban || 'Sense IBAN configurat'}</strong>
                      </p>
                      {(formData.banc || emissor?.banc) && (
                        <p className="text-[11px] text-slate-500">
                          Entitat: {formData.banc || emissor?.banc}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[11px] uppercase font-bold text-slate-500">
                    {isPressupost ? 'Notes i Condicions del Pressupost' : 'Observacions / Notes del Document'}
                  </label>

                  {informacionsList && informacionsList.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Informacions del taller:</span>
                      <select
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (!selectedId) return;
                          const found = informacionsList.find(i => (i.id === selectedId || i.titol === selectedId));
                          if (found) {
                            const cleanContent = (found.contingut || '').replace(/\*\*/g, '').replace(/\*/g, '');
                            const textToAdd = `${found.titol ? found.titol + ':\n' : ''}${cleanContent}`.trim();
                            setFormData(prev => ({
                              ...prev,
                              notes: prev.notes ? `${prev.notes}\n\n${textToAdd}` : textToAdd
                            }));
                          }
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className={`text-[11px] px-2 py-1 rounded-md border font-medium cursor-pointer ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-amber-50/70 border-amber-300 text-amber-900'
                        }`}
                      >
                        <option value="" disabled>-- Tria una informació del taller --</option>
                        {informacionsList.map(info => (
                          <option key={info.id || info.titol} value={info.id || info.titol}>
                            {info.titol || info.contingut?.slice(0, 35) || 'Informació'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <textarea
                  rows={4}
                  placeholder={isPressupost ? "Condicions del pressupost, especificacions de la fusta de til·ler, terminis..." : "Detalls addicionals sobre la comanda o el lliurament..."}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none leading-relaxed resize-y ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Pots seleccionar una informació del taller per incorporar-la i personalitzar-la directament aquí.
                </span>
              </div>
            </div>

            {/* Resum de Totals */}
            <div className="flex flex-col justify-between p-4 rounded-xl border bg-surface space-y-2">
              <span className="text-xs uppercase font-bold text-primary border-b border-outline/10 pb-1">
                Resum Econòmic
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Articles:</span>
                  <span className="font-mono">{formatCurrency(totals.baseArticles)}</span>
                </div>
                {formData.condicionsEnviament === 'establert' && totals.costEnviament > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Enviament ({formData.mitjaTransport || 'Correos'}):</span>
                    <span className="font-mono">{formatCurrency(totals.costEnviament)}</span>
                  </div>
                )}
                {formData.condicionsEnviament === 'pendent' && (
                  <div className="flex justify-between text-slate-500 italic text-[11px]">
                    <span>Enviament:</span>
                    <span>Pendent d'acordar (no sumat)</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-outline/10 pt-1">
                  <span>Total Base Imposable:</span>
                  <span className="font-mono">{formatCurrency(totals.baseImposable)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>IVA:</span>
                    <select
                      value={formData.ivaPercent}
                      onChange={(e) => setFormData({ ...formData, ivaPercent: parseFloat(e.target.value) || 0 })}
                      className={`px-1.5 py-0.5 rounded border text-[11px] font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="21">21% (General)</option>
                      <option value="10">10% (Reduït)</option>
                      <option value="4">4% (Superreduït)</option>
                      <option value="0">0% (Exempt)</option>
                    </select>
                  </div>
                  <span className="font-mono">{formatCurrency(totals.importIva)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-amber-500/50">
                <span className="font-bold text-sm uppercase tracking-wider text-primary">Total:</span>
                <span className="text-lg font-bold font-mono text-amber-600">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Botons d'Acció Inferiors */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline/15">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel·lar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Desar {isFactura ? 'Factura' : isAlbara ? 'Albarà' : isPressupost ? 'Pressupost' : 'Comanda'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

