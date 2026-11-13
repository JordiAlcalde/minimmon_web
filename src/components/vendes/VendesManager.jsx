import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Package, Settings, Plus, Search, Filter, 
  Download, Printer, CheckCircle2, Clock, AlertCircle, 
  Trash2, Edit3, ArrowUpDown, ChevronRight, DollarSign,
  Building2, Calendar, FileSpreadsheet, Send, Eye, ShoppingBag, Receipt
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, query, orderBy, doc, 
  setDoc, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { formatCurrency, formatDecimal, parseDecimal } from '../../utils/numberUtils';
import { getVendesConfig, saveVendesConfig, DEFAULT_VENDES_CONFIG } from '../../utils/vendesUtils';
import DocumentViewerModal from './DocumentViewerModal';
import ManualDocumentEditorModal from './ManualDocumentEditorModal';

export default function VendesManager({
  clientsPortals = [],
  catalogProducts = [],
  projectesList = [],
  escandallsList = [],
  pressupostosList = [],
  calculsPressupostosList = [],
  informacionsList = [],
  isDark = false
}) {
  const [activeTab, setActiveTab] = useState('factures'); // 'factures' | 'albarans' | 'configuracio'

  // Dades de Firestore
  const [factures, setFactures] = useState([]);
  const [albarans, setAlbarans] = useState([]);
  const [vendesConfig, setVendesConfig] = useState(DEFAULT_VENDES_CONFIG);
  const [loading, setLoading] = useState(true);

  // Modals
  const [viewerDoc, setViewerDoc] = useState(null); // { doc, tipus }
  const [editorState, setEditorState] = useState({
    isOpen: false,
    tipus: 'factura',
    initialData: null
  });

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrimestre, setFilterTrimestre] = useState('tots'); // 'tots', '1T', '2T', '3T', '4T'
  const [filterAny, setFilterAny] = useState(new Date().getFullYear());
  const [filterEstat, setFilterEstat] = useState('tots'); // 'tots', 'cobrada', 'pendent'

  // Subscripció a Firestore per a factures i albarans
  useEffect(() => {
    setLoading(true);
    const qFactures = query(collection(db, "vendes_factures"), orderBy("dataEmissio", "desc"));
    const unsubFactures = onSnapshot(qFactures, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFactures(docs);
    }, (err) => {
      console.error("Error carregant factures:", err);
    });

    const qAlbarans = query(collection(db, "vendes_albarans"), orderBy("dataEmissio", "desc"));
    const unsubAlbarans = onSnapshot(qAlbarans, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlbarans(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error carregant albarans:", err);
      setLoading(false);
    });

    // Configuració
    getVendesConfig().then(cfg => {
      if (cfg) setVendesConfig(cfg);
    });

    return () => {
      unsubFactures();
      unsubAlbarans();
    };
  }, []);

  // Anys disponibles per als filtres
  const anysDisponibles = useMemo(() => {
    const anys = new Set([new Date().getFullYear()]);
    factures.forEach(f => {
      const any = f.dataEmissio ? new Date(f.dataEmissio).getFullYear() : null;
      if (any && !isNaN(any)) anys.add(any);
    });
    albarans.forEach(a => {
      const any = a.dataEmissio ? new Date(a.dataEmissio).getFullYear() : null;
      if (any && !isNaN(any)) anys.add(any);
    });
    return Array.from(anys).sort((a, b) => b - a);
  }, [factures, albarans]);

  // Filtra documents segons els criteris
  const filtrarDocuments = (docs) => {
    return docs.filter(item => {
      // Cerca per text
      if (searchQuery.trim()) {
        const queryNorm = searchQuery.toLowerCase().trim();
        const num = String(item.numero || item.codi || '').toLowerCase();
        const client = String(item.clientNom || item.nomClient || '').toLowerCase();
        const nif = String(item.clientNif || item.nif || '').toLowerCase();
        const match = num.includes(queryNorm) || client.includes(queryNorm) || nif.includes(queryNorm);
        if (!match) return false;
      }

      // Any
      if (item.dataEmissio) {
        const d = new Date(item.dataEmissio);
        if (d.getFullYear() !== Number(filterAny)) return false;

        // Trimestre
        if (filterTrimestre !== 'tots') {
          const month = d.getMonth(); // 0-11
          let t = '1T';
          if (month >= 3 && month <= 5) t = '2T';
          else if (month >= 6 && month <= 8) t = '3T';
          else if (month >= 9 && month <= 11) t = '4T';
          if (t !== filterTrimestre) return false;
        }
      }

      // Estat (només per a factures)
      if (filterEstat !== 'tots') {
        const isCobrada = item.estatCobrament === 'cobrada' || item.estatPagament === 'pagat';
        if (filterEstat === 'cobrada' && !isCobrada) return false;
        if (filterEstat === 'pendent' && isCobrada) return false;
      }

      return true;
    });
  };

  const facturesFiltrades = useMemo(() => filtrarDocuments(factures), [factures, searchQuery, filterTrimestre, filterAny, filterEstat]);
  const albaransFiltrats = useMemo(() => filtrarDocuments(albarans), [albarans, searchQuery, filterTrimestre, filterAny]);

  const pressupostosFiltrats = useMemo(() => {
    return pressupostosList.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const client = (p.clientRaoSocial || p.clientNom || '').toLowerCase();
        const num = (p.codiReferencia || p.numero || p.id || '').toLowerCase();
        const nif = (p.clientNif || '').toLowerCase();
        if (!client.includes(q) && !num.includes(q) && !nif.includes(q)) return false;
      }
      return true;
    });
  }, [pressupostosList, searchQuery]);

  const handleViewPressupostInVendes = (p) => {
    if (!p) return;
    const linies = (p.linies || p.productes || []).map(item => {
      const lineName = item.nom || item.concepte || 'Article';
      const lineDesc = item.descripcio || item.notes || item.descripcioAdicional || (item.opcionsTriades ? (typeof item.opcionsTriades === 'string' ? item.opcionsTriades : JSON.stringify(item.opcionsTriades)) : '');
      return {
        articleId: item.articleId || item.id || null,
        tipusLinia: item.tipusLinia || item.tipus || 'producte',
        concepte: lineName,
        nom: lineName,
        descripcio: lineDesc,
        notes: lineDesc,
        descripcioAdicional: lineDesc,
        quantitat: Number(item.quantitat || 1),
        preuUnitari: Number(item.preuUnitari || item.preu || 0),
        descomptePercent: Number(item.descomptePercent || 0),
        subtotal: Number(item.subtotal || (Number(item.quantitat || 1) * Number(item.preuUnitari || item.preu || 0)))
      };
    });

    setViewerDoc({
      doc: {
        id: p.id,
        numero: p.codiReferencia || p.numero || p.id,
        dataEmissio: p.data ? new Date(p.data.seconds * 1000).toISOString().slice(0, 10) : (p.dataEmissio || new Date().toISOString().slice(0, 10)),
        dataVenciment: p.dataVenciment || '',
        clientRaoSocial: p.clientRaoSocial || p.clientNom || '',
        clientNom: p.clientRaoSocial || p.clientNom || '',
        clientPersonaContacte: p.clientPersonaContacte || p.personaContacte || '',
        clientNif: p.clientNif || p.nif || '',
        clientEmail: (p.clientContacte && p.clientContacte.includes('@')) ? p.clientContacte : (p.clientEmail || ''),
        clientTelefon: (p.clientContacte && !p.clientContacte.includes('@')) ? p.clientContacte : (p.clientTelefon || ''),
        clientWeb: p.clientWeb || p.web || '',
        clientAdreca: p.clientAdreca || (typeof p.adrecaEnviament === 'string' ? p.adrecaEnviament : p.adrecaEnviament?.carrer || ''),
        clientCodiPostal: p.clientCodiPostal || p.adrecaEnviament?.codiPostal || '',
        clientPoblacio: p.clientPoblacio || p.adrecaEnviament?.poblacio || '',
        clientProvincia: p.clientProvincia || p.adrecaEnviament?.provincia || '',
        clientPais: p.clientPais || p.adrecaEnviament?.pais || 'Espanya',
        condicionsEnviament: p.condicionsEnviament || (Number(p.costEnviament) > 0 ? 'establert' : 'pendent'),
        mitjaTransport: p.mitjaTransport || p.transportista || 'Correos',
        costEnviament: Number(p.costEnviament || 0),
        notesEnviament: p.notesEnviament || p.descripcioEnviament || p.comentarisEnviament || '',
        linies: linies,
        notes: p.observacionsGenerals || p.notes || '',
        total: Number(p.total || 0),
        baseImposable: Number(p.baseImposable || 0),
        ivaPercent: Number(p.ivaPercent || 21),
        importIva: Number(p.importIva || 0)
      },
      tipus: 'pressupost'
    });
  };

  const handleEditPressupostInVendes = (p) => {
    if (!p) return;
    const linies = (p.linies || p.productes || []).map(item => {
      const lineName = item.nom || item.concepte || 'Article';
      const lineDesc = item.descripcio || item.notes || item.descripcioAdicional || (item.opcionsTriades ? (typeof item.opcionsTriades === 'string' ? item.opcionsTriades : JSON.stringify(item.opcionsTriades)) : '');
      return {
        articleId: item.articleId || item.id || null,
        tipusLinia: item.tipusLinia || item.tipus || 'producte',
        concepte: lineName,
        nom: lineName,
        descripcio: lineDesc,
        notes: lineDesc,
        descripcioAdicional: lineDesc,
        quantitat: Number(item.quantitat || 1),
        preuUnitari: Number(item.preuUnitari || item.preu || 0),
        descomptePercent: Number(item.descomptePercent || 0),
        subtotal: Number(item.subtotal || (Number(item.quantitat || 1) * Number(item.preuUnitari || item.preu || 0)))
      };
    });

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

    setEditorState({
      isOpen: true,
      tipus: 'pressupost',
      initialData: {
        id: p.id,
        numero: p.codiReferencia || p.numero || p.id,
        dataEmissio: p.data ? new Date(p.data.seconds * 1000).toISOString().slice(0, 10) : (p.dataEmissio || new Date().toISOString().slice(0, 10)),
        dataVenciment: p.dataVenciment || '',
        clientRaoSocial: rao,
        clientNom: rao,
        clientPersonaContacte: p.clientPersonaContacte || p.personaContacte || '',
        clientNif: p.clientNif || p.nif || '',
        clientEmail: (p.clientContacte && p.clientContacte.includes('@')) ? p.clientContacte : (p.clientEmail || ''),
        clientTelefon: (p.clientContacte && !p.clientContacte.includes('@')) ? p.clientContacte : (p.clientTelefon || ''),
        clientWeb: p.clientWeb || p.web || '',
        clientAdreca: carrer,
        clientCodiPostal: cp,
        clientPoblacio: pob,
        clientProvincia: prov,
        clientPais: pais,
        condicionsEnviament: p.condicionsEnviament || (Number(p.costEnviament) > 0 ? 'establert' : 'pendent'),
        mitjaTransport: p.mitjaTransport || p.transportista || 'Correos',
        costEnviament: Number(p.costEnviament || 0),
        notesEnviament: p.notesEnviament || p.descripcioEnviament || p.comentarisEnviament || '',
        linies: linies,
        notes: p.observacionsGenerals || p.notes || '',
        metodePagament: p.metodePagament || 'bizum',
        total: Number(p.total || 0),
        baseImposable: Number(p.baseImposable || 0),
        ivaPercent: Number(p.ivaPercent || 21),
        importIva: Number(p.importIva || 0)
      }
    });
  };

  const handleTransferPressupostInVendes = (p) => {
    if (!p) return;
    const linies = (p.linies || p.productes || []).map(item => {
      const lineName = item.nom || item.concepte || 'Article';
      const lineDesc = item.descripcio || item.notes || item.descripcioAdicional || (item.opcionsTriades ? (typeof item.opcionsTriades === 'string' ? item.opcionsTriades : JSON.stringify(item.opcionsTriades)) : '');
      return {
        articleId: item.articleId || item.id || null,
        tipusLinia: item.tipusLinia || item.tipus || 'producte',
        concepte: lineName,
        nom: lineName,
        descripcio: lineDesc,
        notes: lineDesc,
        descripcioAdicional: lineDesc,
        quantitat: Number(item.quantitat || 1),
        preuUnitari: Number(item.preuUnitari || item.preu || 0),
        descomptePercent: 0,
        subtotal: Number(item.subtotal || (Number(item.quantitat || 1) * Number(item.preuUnitari || item.preu || 0)))
      };
    });

    setEditorState({
      isOpen: true,
      tipus: 'comanda',
      initialData: {
        comandaCodi: p.codiReferencia || p.id,
        pressupostId: p.id,
        clientRaoSocial: p.clientRaoSocial || p.clientNom || '',
        clientNom: p.clientRaoSocial || p.clientNom || '',
        clientPersonaContacte: p.clientPersonaContacte || p.personaContacte || '',
        clientNif: p.clientNif || p.nif || '',
        clientEmail: (p.clientContacte && p.clientContacte.includes('@')) ? p.clientContacte : (p.clientEmail || ''),
        clientTelefon: (p.clientContacte && !p.clientContacte.includes('@')) ? p.clientContacte : (p.clientTelefon || ''),
        clientWeb: p.clientWeb || p.web || '',
        clientAdreca: p.clientAdreca || (typeof p.adrecaEnviament === 'string' ? p.adrecaEnviament : p.adrecaEnviament?.carrer || ''),
        clientCodiPostal: p.clientCodiPostal || p.adrecaEnviament?.codiPostal || '',
        clientPoblacio: p.clientPoblacio || p.adrecaEnviament?.poblacio || '',
        clientProvincia: p.clientProvincia || p.adrecaEnviament?.provincia || '',
        clientPais: p.clientPais || p.adrecaEnviament?.pais || 'Espanya',
        condicionsEnviament: p.condicionsEnviament || (Number(p.costEnviament) > 0 ? 'establert' : 'pendent'),
        mitjaTransport: p.mitjaTransport || p.transportista || 'Correos',
        costEnviament: Number(p.costEnviament || 0),
        notesEnviament: p.notesEnviament || p.descripcioEnviament || p.comentarisEnviament || '',
        linies: linies,
        notes: p.observacionsGenerals || p.notes || '',
        ivaPercent: Number(p.ivaPercent !== undefined ? p.ivaPercent : 21),
        estatPagament: 'pendent',
        metodePagament: p.metodePagament || 'bizum'
      }
    });
  };

  const handleDeletePressupostInVendes = async (id, numero) => {
    if (!window.confirm(`Segur que vols eliminar el pressupost ${numero || id}?`)) return;
    try {
      await deleteDoc(doc(db, "pressupostos", id));
      try {
        await deleteDoc(doc(db, "vendes_pressupostos", numero || id));
      } catch (e2) {}
    } catch (err) {
      alert("Error eliminant pressupost: " + err.message);
    }
  };

  // Resum econòmic de les factures filtrades
  const totalsFacturacio = useMemo(() => {
    let base = 0;
    let iva = 0;
    let total = 0;
    let pendent = 0;

    facturesFiltrades.forEach(f => {
      const tot = Number(f.total || 0);
      const b = Number(f.baseImposable || 0);
      const iv = Number(f.importIva || 0);
      base += b;
      iva += iv;
      total += tot;

      const isCobrada = f.estatCobrament === 'cobrada' || f.estatPagament === 'pagat';
      if (!isCobrada) {
        pendent += tot;
      }
    });

    return { base, iva, total, pendent };
  }, [facturesFiltrades]);

  // Accions sobre documents
  const handleSaveDocument = async (docData, tipus) => {
    try {
      const docLinies = (docData.linies || []).map(l => {
        const lNom = l.nom || l.concepte || 'Article';
        const lDesc = l.descripcio || l.notes || l.descripcioAdicional || '';
        return {
          ...l,
          nom: lNom,
          concepte: lNom,
          descripcio: lDesc,
          notes: lDesc
        };
      });

      if (tipus === 'pressupost') {
        const docId = docData.id || `pre_manual_${Date.now()}`;
        const prePayload = {
          ...docData,
          linies: docLinies,
          productes: docLinies,
          id: docId,
          codiReferencia: docData.numero,
          estat: 'pendent',
          estatComanda: 'pressupost_manual',
          origen: 'manual_taller',
          data: { seconds: Math.floor(Date.now() / 1000) },
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, "pressupostos", docId), prePayload, { merge: true });
        try {
          await setDoc(doc(db, "vendes_pressupostos", docData.numero || docId), {
            ...docData,
            linies: docLinies,
            productes: docLinies,
            id: docData.numero || docId,
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (ePre) {
          console.warn("Could not save to vendes_pressupostos:", ePre);
        }
        setEditorState({ isOpen: false, tipus: 'factura', initialData: null });
        alert("✨ Pressupost desat correctament!");
        return;
      }
      const colName = tipus === 'albara' ? 'vendes_albarans' : 'vendes_factures';
      const docId = docData.id || `${tipus}_${Date.now()}`;
      
      const payload = {
        ...docData,
        linies: docLinies,
        id: docId,
        updatedAt: serverTimestamp()
      };
      if (!docData.id) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, colName, docId), payload, { merge: true });

      if (tipus === 'factura' && (docData.albaraId || docData.albaraNumero)) {
        try {
          const albId = docData.albaraId || docData.albaraNumero;
          await updateDoc(doc(db, "vendes_albarans", albId), {
            facturat: true,
            facturaNumero: docData.numero,
            facturaId: docId
          });
        } catch (errAlb) {
          console.warn("Could not update linked albara:", errAlb);
        }
      }

      setEditorState({ isOpen: false, tipus: 'factura', initialData: null });
    } catch (err) {
      console.error("Error desant document:", err);
      alert("S'ha produït un error al desar el document: " + err.message);
    }
  };

  const handleDeleteDocument = async (id, tipus, numero) => {
    if (!window.confirm(`Segur que vols eliminar ${tipus === 'albara' ? "l'albarà" : "la factura"} ${numero || id}?`)) {
      return;
    }
    try {
      const colName = tipus === 'albara' ? 'vendes_albarans' : 'vendes_factures';
      await deleteDoc(doc(db, colName, id));
    } catch (err) {
      console.error("Error eliminant document:", err);
      alert("Error eliminant document: " + err.message);
    }
  };

  const handleToggleCobrat = async (docItem) => {
    try {
      const isCobrada = docItem.estatCobrament === 'cobrada' || docItem.estatPagament === 'pagat';
      const nouEstat = isCobrada ? 'pendent' : 'cobrada';
      await updateDoc(doc(db, "vendes_factures", docItem.id), {
        estatCobrament: nouEstat,
        estatPagament: nouEstat === 'cobrada' ? 'pagat' : 'pendent',
        dataCobrament: nouEstat === 'cobrada' ? new Date().toISOString().slice(0, 10) : null,
        updatedAt: serverTimestamp()
      });
      // Si el viewer està obert amb aquest document, actualitzem-lo
      if (viewerDoc?.doc?.id === docItem.id) {
        setViewerDoc({
          ...viewerDoc,
          doc: {
            ...viewerDoc.doc,
            estatCobrament: nouEstat,
            estatPagament: nouEstat === 'cobrada' ? 'pagat' : 'pendent'
          }
        });
      }
    } catch (err) {
      console.error("Error actualitzant cobrament:", err);
      alert("Error actualitzant estat de cobrament: " + err.message);
    }
  };

  // Exportar Factures a CSV per a la Gestoria
  const handleExportCSV = () => {
    if (facturesFiltrades.length === 0) {
      alert("No hi ha factures per exportar en el període seleccionat.");
      return;
    }

    const headers = [
      "Número",
      "Data Emissió",
      "Venciment",
      "Raó Social",
      "Persona Contacte",
      "NIF",
      "Adreça",
      "Codi Postal",
      "Població",
      "Província",
      "País",
      "Telèfon",
      "Mail",
      "Web",
      "Base Imposable (€)",
      "Tipus IVA (%)",
      "Quota IVA (€)",
      "Total (€)",
      "Estat Cobrament",
      "Data Cobrament",
      "Mètode Pagament"
    ];

    const rows = facturesFiltrades.map(f => {
      const isCobrada = f.estatCobrament === 'cobrada' || f.estatPagament === 'pagat';
      return [
        `"${f.numero || f.id || ''}"`,
        `"${f.dataEmissio || ''}"`,
        `"${f.dataVenciment || ''}"`,
        `"${(f.clientRaoSocial || f.clientNom || '').replace(/"/g, '""')}"`,
        `"${(f.clientPersonaContacte || '').replace(/"/g, '""')}"`,
        `"${f.clientNif || ''}"`,
        `"${(typeof f.clientAdreca === 'string' ? f.clientAdreca : (f.clientAdreca?.carrer || '')).replace(/"/g, '""')}"`,
        `"${f.clientCodiPostal || ''}"`,
        `"${f.clientPoblacio || ''}"`,
        `"${f.clientProvincia || ''}"`,
        `"${f.clientPais || 'Espanya'}"`,
        `"${f.clientTelefon || ''}"`,
        `"${f.clientEmail || ''}"`,
        `"${f.clientWeb || ''}"`,
        formatDecimal(f.baseImposable || 0),
        formatDecimal(f.ivaPercent !== undefined ? f.ivaPercent : 21),
        formatDecimal(f.importIva || 0),
        formatDecimal(f.total || 0),
        `"${isCobrada ? 'COBRADA' : 'PENDENT'}"`,
        `"${f.dataCobrament || ''}"`,
        `"${f.metodePagament || ''}"`
      ].join(';');
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Factures_${filterAny}_${filterTrimestre}_MinimMon.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Configuració fiscal: formulari local
  const [configForm, setConfigForm] = useState(vendesConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  useEffect(() => {
    setConfigForm(vendesConfig);
  }, [vendesConfig]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await saveVendesConfig(configForm);
      setVendesConfig(configForm);
      setConfigSavedSuccess(true);
      setTimeout(() => setConfigSavedSuccess(false), 3000);
    } catch (err) {
      alert("Error desant la configuració: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className={`p-4 md:p-6 min-h-screen ${isDark ? 'bg-stone-900 text-stone-100' : 'bg-stone-50 text-stone-800'}`}>
      {/* HEADER AMB TÍTOL I TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-700 dark:text-amber-400" />
            Mòdul de Vendes · Facturació i Albarans
          </h1>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
            Gestió d'albarans, factures d'artesania i comandes manuals / de taller en fusta de til·ler.
          </p>
        </div>

        {/* BOTONS D'ACCIÓ RÀPIDA */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditorState({
              isOpen: true,
              tipus: 'pressupost',
              initialData: null
            })}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
            title="Crear un nou pressupost comercial manual per a un client"
          >
            <Plus className="w-4 h-4" />
            Nou Pressupost
          </button>
          <button
            onClick={() => {
              if (albarans.length === 0) {
                alert("⚠️ Sempre hi ha d'haver un albarà per fer una factura. Primer cal generar un albarà de lliurament.");
                setActiveTab('albarans');
                return;
              }
              setEditorState({
                isOpen: true,
                tipus: 'factura',
                initialData: null
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
            title="Emetre una nova factura a partir d'un albarà de lliurament"
          >
            <Plus className="w-4 h-4" />
            Nova Factura
          </button>
          <button
            onClick={() => setEditorState({
              isOpen: true,
              tipus: 'albara',
              initialData: null
            })}
            className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nou Albarà
          </button>
          <button
            onClick={() => setEditorState({
              isOpen: true,
              tipus: 'comanda',
              initialData: null
            })}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
            title="Crear comanda verbal rebuda per telèfon, taller o correu"
          >
            <Plus className="w-4 h-4" />
            Comanda Verbal
          </button>
        </div>
      </div>

      {/* PESTANYES DE NAVEGACIÓ */}
      <div className="flex border-b border-stone-200 dark:border-stone-700 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('factures')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'factures'
              ? 'border-amber-700 text-amber-800 dark:text-amber-300 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Factures
          <span className="ml-1.5 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full">
            {factures.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('albarans')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'albarans'
              ? 'border-amber-700 text-amber-800 dark:text-amber-300 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Albarans
          <span className="ml-1.5 px-2 py-0.5 text-xs bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full">
            {albarans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pressupostos')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'pressupostos'
              ? 'border-amber-700 text-amber-800 dark:text-amber-300 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Pressupostos
          <span className="ml-1.5 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full">
            {pressupostosList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('configuracio')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'configuracio'
              ? 'border-amber-700 text-amber-800 dark:text-amber-300 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuració Fiscal
        </button>
      </div>

      {/* SECCIÓ FACTURES I ALBARANS: FILTRES I KPIS */}
      {activeTab !== 'configuracio' && (
        <div className="space-y-6">
          {/* BARRA DE FILTRES I CERCA */}
          <div className="bg-white dark:bg-stone-800/80 rounded-xl p-4 shadow-xs border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Cercador */}
              <div className="relative min-w-[220px] max-w-sm flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cercar per número, client, NIF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-600/30"
                />
              </div>

              {/* Filtre d'Any */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Calendar className="w-3.5 h-3.5" />
                <select
                  value={filterAny}
                  onChange={(e) => setFilterAny(Number(e.target.value))}
                  className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200"
                >
                  {anysDisponibles.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Filtre de Trimestre */}
              {(activeTab === 'factures' || activeTab === 'albarans') && (
                <div className="flex items-center rounded-lg bg-stone-100 dark:bg-stone-900 p-0.5 border border-stone-200 dark:border-stone-700 text-xs">
                  {['tots', '1T', '2T', '3T', '4T'].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterTrimestre(t)}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        filterTrimestre === t
                          ? 'bg-white dark:bg-stone-800 text-amber-900 dark:text-amber-300 shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                      }`}
                    >
                      {t === 'tots' ? 'Tots' : t}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtre Estat (només per a factures) */}
              {activeTab === 'factures' && (
                <select
                  value={filterEstat}
                  onChange={(e) => setFilterEstat(e.target.value)}
                  className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200"
                >
                  <option value="tots">Tots els estats</option>
                  <option value="pendent">Pendents de cobrament</option>
                  <option value="cobrada">Cobrades</option>
                </select>
              )}
            </div>

            {/* BOTÓ D'EXPORTACIÓ CSV PER A GESTORIA */}
            {activeTab === 'factures' && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-xs transition-all active:scale-95"
                title="Descarregar fitxer CSV amb les dades fiscals per a la gestoria"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar CSV Gestoria
              </button>
            )}
          </div>

          {/* KPIS DE FACTURACIÓ */}
          {activeTab === 'factures' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">
                  Base Imposable ({filterTrimestre.toUpperCase()})
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  {formatCurrency(totalsFacturacio.base)}
                </span>
              </div>
              <div className="bg-white dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">
                  IVA Repercutit (21%)
                </span>
                <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                  {formatCurrency(totalsFacturacio.iva)}
                </span>
              </div>
              <div className="bg-white dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 block mb-1">
                  Total Facturat (IVA incl.)
                </span>
                <span className="text-xl font-bold text-amber-900 dark:text-amber-300 font-serif">
                  {formatCurrency(totalsFacturacio.total)}
                </span>
              </div>
              <div className="bg-white dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block mb-1">
                  Pendent de Cobrament
                </span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-300 font-serif">
                  {formatCurrency(totalsFacturacio.pendent)}
                </span>
              </div>
            </div>
          )}

          {/* TAULA DE FACTURES */}
          {activeTab === 'factures' && (
            <div className="bg-white dark:bg-stone-800/80 rounded-xl shadow-xs border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-stone-100/80 dark:bg-stone-900/50 text-stone-600 dark:text-stone-300 uppercase tracking-wider text-[11px] font-semibold border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="py-3 px-4">Número</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Línies / Concepte</th>
                      <th className="py-3 px-4 text-right">Base Imposable</th>
                      <th className="py-3 px-4 text-right">Total IVA incl.</th>
                      <th className="py-3 px-4 text-center">Estat</th>
                      <th className="py-3 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {facturesFiltrades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-400 italic">
                          No s'ha trobat cap factura per a aquests criteris de cerca.
                        </td>
                      </tr>
                    ) : (
                      facturesFiltrades.map((f) => {
                        const isCobrada = f.estatCobrament === 'cobrada' || f.estatPagament === 'pagat';
                        const numLinies = (f.linies || f.productes || []).length;
                        return (
                          <tr key={f.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-700/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-amber-900 dark:text-amber-300">
                              {f.numero || f.id}
                            </td>
                            <td className="py-3 px-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                              {f.dataEmissio || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-stone-900 dark:text-stone-100">
                                <span className="notranslate" translate="no">
                                  {f.clientNom || 'Client sense nom'}
                                </span>
                              </div>
                              {f.clientNif && (
                                <div className="text-[11px] text-stone-400 font-mono">
                                  NIF: {f.clientNif}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-500 dark:text-stone-400 text-xs">
                              {numLinies} {numLinies === 1 ? 'article/projecte' : 'articles/projectes'}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-stone-600 dark:text-stone-300">
                              {formatCurrency(f.baseImposable || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-stone-900 dark:text-stone-100">
                              {formatCurrency(f.total || 0)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleToggleCobrat(f)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                                  isCobrada
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
                                }`}
                                title="Fes clic per canviar l'estat de cobrament"
                              >
                                {isCobrada ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Cobrada
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                                    Pendent
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setViewerDoc({ doc: f, tipus: 'factura' })}
                                  className="p-1.5 text-stone-500 hover:text-amber-800 dark:hover:text-amber-300 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="Veure i Imprimir Factura (A4)"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditorState({
                                    isOpen: true,
                                    tipus: 'factura',
                                    initialData: f
                                  })}
                                  className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="Editar factura"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(f.id, 'factura', f.numero)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Eliminar factura"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAULA D'ALBARANS */}
          {activeTab === 'albarans' && (
            <div className="bg-white dark:bg-stone-800/80 rounded-xl shadow-xs border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-stone-100/80 dark:bg-stone-900/50 text-stone-600 dark:text-stone-300 uppercase tracking-wider text-[11px] font-semibold border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="py-3 px-4">Número</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Ref. Comanda</th>
                      <th className="py-3 px-4">Línies</th>
                      <th className="py-3 px-4 text-center">Valorat</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {albaransFiltrats.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-400 italic">
                          No s'ha trobat cap albarà per a aquests criteris de cerca.
                        </td>
                      </tr>
                    ) : (
                      albaransFiltrats.map((a) => {
                        const numLinies = (a.linies || a.productes || []).length;
                        return (
                          <tr key={a.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-700/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-stone-800 dark:text-stone-200">
                              {a.numero || a.id}
                            </td>
                            <td className="py-3 px-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                              {a.dataEmissio || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-stone-900 dark:text-stone-100">
                                <span className="notranslate" translate="no">
                                  {a.clientNom || 'Client sense nom'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-stone-500">
                              {a.comandaCodi || a.comandaId || '-'}
                            </td>
                            <td className="py-3 px-4 text-stone-500 text-xs">
                              {numLinies} {numLinies === 1 ? 'article/projecte' : 'articles/projectes'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                a.valorat !== false
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                              }`}>
                                {a.valorat !== false ? 'Amb preus' : 'Sense preus'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-stone-800 dark:text-stone-200">
                              {a.valorat !== false ? formatCurrency(a.total || 0) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setViewerDoc({ doc: a, tipus: 'albara' })}
                                  className="p-1.5 text-stone-500 hover:text-amber-800 dark:hover:text-amber-300 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="Veure i Imprimir Albarà (A4)"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditorState({
                                      isOpen: true,
                                      tipus: 'factura',
                                      initialData: {
                                        ...a,
                                        albaraId: a.id || a.numero,
                                        albaraNumero: a.numero,
                                        albaraCodi: a.numero,
                                        tipusDoc: 'albara'
                                      }
                                    });
                                  }}
                                  className="p-1.5 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 rounded hover:bg-amber-100 dark:hover:bg-amber-950/40"
                                  title="Emetre Factura des d'aquest Albarà"
                                >
                                  <Receipt className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditorState({
                                    isOpen: true,
                                    tipus: 'albara',
                                    initialData: a
                                  })}
                                  className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="Editar albarà"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(a.id, 'albara', a.numero)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Eliminar albarà"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAULA DE PRESSUPOSTOS */}
          {activeTab === 'pressupostos' && (
            <div className="bg-white dark:bg-stone-800/80 rounded-xl shadow-xs border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-100 dark:bg-stone-900/60 text-stone-600 dark:text-stone-300 text-xs uppercase font-mono border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="py-3 px-4">Codi / Núm.</th>
                      <th className="py-3 px-4">Data Emissió</th>
                      <th className="py-3 px-4">Client / Raó Social</th>
                      <th className="py-3 px-4">Articles / Línies</th>
                      <th className="py-3 px-4 text-center">Estat</th>
                      <th className="py-3 px-4 text-right">Total (€)</th>
                      <th className="py-3 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {pressupostosFiltrats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-400 italic">
                          No s'ha trobat cap pressupost per a aquests criteris de cerca.
                        </td>
                      </tr>
                    ) : (
                      pressupostosFiltrats.map((p) => {
                        const numLinies = (p.linies || p.productes || []).length;
                        const numUnitats = (p.linies || p.productes || []).reduce((acc, l) => acc + (Number(l.quantitat) || 1), 0);
                        const isAtes = p.estat === 'ates';
                        const isAcceptat = p.estatComanda === 'acceptada' || !!p.comandaVinculada;
                        const dataStr = p.data ? new Date(p.data.seconds * 1000).toLocaleDateString('ca-ES') : (p.dataEmissio || '-');

                        return (
                          <tr key={p.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-700/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-stone-800 dark:text-stone-200">
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20">
                                {p.codiReferencia || p.numero || p.id}
                              </span>
                              {p.comandaVinculada && (
                                <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                                  CMD: {p.comandaVinculada}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                              {dataStr}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-stone-900 dark:text-stone-100">
                                <span className="notranslate" translate="no">
                                  {p.clientRaoSocial || p.clientNom || 'Client sense nom'}
                                </span>
                              </div>
                              {p.clientContacte && (
                                <div className="text-xs text-stone-400 font-mono">
                                  {p.clientContacte}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-500 text-xs">
                              {numLinies} {numLinies === 1 ? 'línia' : 'línies'} ({numUnitats} u.)
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isAcceptat ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-500/30">
                                  Acceptat
                                </span>
                              ) : isAtes ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                  Atès
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                  Pendent
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-stone-800 dark:text-stone-200">
                              {formatCurrency(p.total || 0)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewPressupostInVendes(p)}
                                  className="p-1.5 text-stone-500 hover:text-blue-700 dark:hover:text-blue-300 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="Veure i Imprimir Pressupost Oficial A4"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditPressupostInVendes(p)}
                                  className="p-1.5 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 rounded hover:bg-amber-100/60 dark:hover:bg-amber-950/50 font-bold"
                                  title="✏️ Modificar aquest pressupost"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransferPressupostInVendes(p)}
                                  className="p-1.5 text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-300 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                                  title="🛒 Traspassar aquest pressupost a Comanda"
                                >
                                  <ShoppingBag className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePressupostInVendes(p.id, p.codiReferencia || p.numero)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Eliminar pressupost"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTANYA DE CONFIGURACIÓ FISCAL */}
      {activeTab === 'configuracio' && (
        <div className="max-w-4xl bg-white dark:bg-stone-800 rounded-xl shadow-xs border border-stone-200 dark:border-stone-700 p-6">
          <h2 className="text-lg font-serif font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-700" />
            Configuració Fiscal de l'Emissor i Sèries de Facturació
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
            Aquestes dades s'imprimeixen automàticament a la capçalera i peu de tots els albarans i factures emesos per Mínim Món.
          </p>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* DADES FISCALS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Nom Comercial
                </label>
                <input
                  type="text"
                  value={configForm?.emissor?.nomComercial || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, nomComercial: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg notranslate"
                  translate="no"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Raó Social / Nom Fiscal
                </label>
                <input
                  type="text"
                  value={configForm?.emissor?.raoSocial || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, raoSocial: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  NIF / CIF
                </label>
                <input
                  type="text"
                  value={configForm?.emissor?.nif || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, nif: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono"
                  placeholder="ex: B12345678"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Adreça (Carrer, Número)
                </label>
                <input
                  type="text"
                  value={configForm?.emissor?.adreca || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, adreca: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                  placeholder="ex: Carrer del Taller, 12"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Codi Postal i Població
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="CP"
                    value={configForm?.emissor?.codiPostal || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, codiPostal: e.target.value }
                    })}
                    className="text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Població"
                    value={configForm?.emissor?.poblacio || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, poblacio: e.target.value }
                    })}
                    className="col-span-2 text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Província i País
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Província"
                    value={configForm?.emissor?.provincia || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, provincia: e.target.value }
                    })}
                    className="text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="País"
                    value={configForm?.emissor?.pais || 'Espanya'}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, pais: e.target.value }
                    })}
                    className="text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Telèfon de contacte
                </label>
                <input
                  type="text"
                  value={configForm?.emissor?.telefon || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, telefon: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Correu Electrònic
                </label>
                <input
                  type="email"
                  value={configForm?.emissor?.email || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    emissor: { ...configForm.emissor, email: e.target.value }
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                />
              </div>
            </div>

            {/* DADES BANCÀRIES */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Dades Bancàries per a Transferències
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    IBAN del compte bancari
                  </label>
                  <input
                    type="text"
                    value={configForm?.emissor?.iban || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, iban: e.target.value }
                    })}
                    className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono"
                    placeholder="ES00 0000 0000 0000 0000 0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Entitat Bancària
                  </label>
                  <input
                    type="text"
                    value={configForm?.emissor?.banc || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, banc: e.target.value }
                    })}
                    className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                    placeholder="ex: CaixaBank"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Titular del compte
                  </label>
                  <input
                    type="text"
                    value={configForm?.emissor?.titularCompte || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, titularCompte: e.target.value }
                    })}
                    className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                    placeholder="ex: Jordi Alcalde / Mínim Món"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Codi BIC / SWIFT (opcional)
                  </label>
                  <input
                    type="text"
                    value={configForm?.emissor?.bic || ''}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      emissor: { ...configForm.emissor, bic: e.target.value.toUpperCase() }
                    })}
                    className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono uppercase"
                    placeholder="ex: CAIXESBBXXX"
                  />
                </div>
              </div>
            </div>

            {/* PEU DE FACTURA I IVA */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-3">
                Valors per Defecte i Peu de Pàgina
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    IVA per Defecte (%)
                  </label>
                  <input
                    type="number"
                    value={configForm?.ivaPerDefecte ?? 21}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      ivaPerDefecte: Number(e.target.value)
                    })}
                    className="w-32 text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Termini de Pagament per Defecte (Dies)
                  </label>
                  <input
                    type="number"
                    value={configForm?.terminiPagamentDies ?? 30}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      terminiPagamentDies: Number(e.target.value)
                    })}
                    className="w-32 text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Text legal / Peu de pàgina de les factures
                </label>
                <textarea
                  rows={2}
                  value={configForm?.peuFactura || ''}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    peuFactura: e.target.value
                  })}
                  className="w-full text-sm p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg"
                />
              </div>
            </div>

            {/* BOTÓ DESAR */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
              {configSavedSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Dades desades correctament!
                </span>
              )}
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                {savingConfig ? 'Desant...' : 'Desar Configuració Fiscal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VISOR / IMPRESSIÓ D'ALBARÀ O FACTURA (A4) */}
      {viewerDoc && (
        <DocumentViewerModal
          docData={viewerDoc.doc}
          tipus={viewerDoc.tipus}
          emissor={vendesConfig?.emissor}
          onClose={() => setViewerDoc(null)}
          onEdit={() => {
            const docToEdit = viewerDoc.doc;
            const tipusToEdit = viewerDoc.tipus;
            setViewerDoc(null);
            setEditorState({
              isOpen: true,
              tipus: tipusToEdit,
              initialData: docToEdit
            });
          }}
          onToggleCobrat={viewerDoc.tipus === 'factura' ? () => handleToggleCobrat(viewerDoc.doc) : null}
          isDark={isDark}
        />
      )}

      {/* MODAL EDITOR DE DOCUMENT (MANUAL / COMANDA / FACTURA / ALBARÀ) */}
      {editorState.isOpen && (
        <ManualDocumentEditorModal
          isOpen={editorState.isOpen}
          tipus={editorState.tipus}
          initialData={editorState.initialData}
          clientsPortals={clientsPortals}
          catalogProducts={catalogProducts}
          projectesList={projectesList}
          escandallsList={escandallsList}
          existingDocs={editorState.tipus === 'albara' ? albarans : factures}
          albaransList={albarans}
          pressupostosList={pressupostosList}
          calculsPressupostosList={calculsPressupostosList}
          informacionsList={informacionsList}
          emissor={vendesConfig?.emissor}
          onSave={(data) => handleSaveDocument(data, editorState.tipus)}
          onClose={() => setEditorState({ isOpen: false, tipus: 'factura', initialData: null })}
          isDark={isDark}
        />
      )}
    </div>
  );
}

