import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ClipboardList, Plus, Minus, Search, Filter, Calendar, Clock, AlertTriangle, 
  CheckCircle2, PlayCircle, Eye, Printer, Trash2, X, Save, ArrowRight,
  Package, Wrench, Layers, User, Phone, Sparkles, Check, ChevronDown, 
  ArrowLeft, RotateCw, FileText, Download, ChevronRight, BarChart2, Flame,
  Boxes, Factory, HelpCircle, Zap, ArrowLeftRight, Store, BookOpen
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { formatDecimal, parseDecimal } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';
import { AVAILABLE_FONTS } from '../FontSelectorDropdown';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';
import { formatProductWithGamma, getSingularGammaName, getProductGammaLabel, isProductInGamma } from '../PrivateAreaSection';
import LaserParametersEditor from './LaserParametersEditor';
import { ManufacturingManualModal } from './EscandallsManager';
import { DEFAULT_LASER_CONFIG, normalizeLaserConfig, areLaserConfigsEqual } from '../../utils/laserUtils';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';

// Helper per resoldre i separar la gamma i el nom del producte per a qualsevol OF
export const resolveOFGammaAndName = (of, productes = [], escandalls = [], gammes = []) => {
  if (!of) return { gamma: '', nom: '' };

  let rawNom = of.producteNom || '';
  let gamma = of.gamma || '';

  // 1. Si rawNom ja conté dos punts (ex: "Clauer: Mans amigues")
  if (rawNom.includes(':')) {
    const parts = rawNom.split(':');
    const possibleGamma = parts[0].trim();
    const possibleNom = parts.slice(1).join(':').trim();
    if (possibleGamma && possibleNom) {
      return {
        gamma: getSingularGammaName(possibleGamma),
        nom: possibleNom
      };
    }
  }

  // 2. Si no té gamma guardada a l'OF, cerquem al catàleg de productes
  if (!gamma && Array.isArray(productes) && productes.length > 0) {
    const matchedProd = productes.find(p => 
      (of.producteId && p.id === of.producteId) || 
      (p.nom && p.nom.toLowerCase().trim() === rawNom.toLowerCase().trim()) ||
      (p.nom && rawNom.toLowerCase().includes(p.nom.toLowerCase())) ||
      (p.nom && p.nom.toLowerCase().includes(rawNom.toLowerCase()))
    );

    if (matchedProd) {
      gamma = getProductGammaLabel(matchedProd, gammes);
    }
  }

  // 3. Si encara no, cerquem als escandalls
  if (!gamma && Array.isArray(escandalls) && escandalls.length > 0) {
    const matchedEsc = escandalls.find(e => 
      (of.escandallId && e.id === of.escandallId) ||
      (e.producteNom && e.producteNom.toLowerCase().trim() === rawNom.toLowerCase().trim()) ||
      (e.producteNom && rawNom.toLowerCase().includes(e.producteNom.toLowerCase()))
    );
    if (matchedEsc) {
      gamma = getSingularGammaName(matchedEsc.gamma || matchedEsc.familiaNom || '');
      if (!gamma && matchedEsc.producteId && Array.isArray(productes)) {
        const p = productes.find(prod => prod.id === matchedEsc.producteId);
        if (p) gamma = getProductGammaLabel(p, gammes);
      }
    }
  }

  // 4. Regles de suport segons les tipologies habituals del taller
  if (!gamma) {
    const lower = rawNom.toLowerCase();
    if (lower.includes('mans amigues') || lower.includes('onades') || lower.includes('clauer') || lower.includes('clau')) {
      gamma = 'Clauer';
    } else if (lower.includes('punt') || lower.includes('llibre') || lower.includes('sant jordi')) {
      gamma = 'Punt de llibre';
    } else if (lower.includes('arracada')) {
      gamma = 'Arracada';
    } else if (lower.includes('imant')) {
      gamma = 'Imant';
    } else if (lower.includes('penjoll')) {
      gamma = 'Penjoll';
    } else if (lower.includes('marc') || lower.includes('foto')) {
      gamma = 'Marc';
    }
  }

  gamma = getSingularGammaName(gamma);
  const cleanNom = rawNom.replace(new RegExp(`^${gamma}[:\\s\\-_]+`, 'i'), '').trim();

  return {
    gamma,
    nom: cleanNom || rawNom
  };
};

// Helper per generar el següent ID correlatiu OF-[ANY]-0001
export function getNextOFId(existingOFs = [], targetYear = new Date().getFullYear()) {
  const yearStr = String(targetYear);
  const prefix = `OF-${yearStr}-`;
  
  let maxNum = 0;
  existingOFs.forEach(of => {
    if (of.id && of.id.startsWith(prefix)) {
      const numPart = parseInt(of.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

export const formatOFDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.seconds ? dateStr.seconds * 1000 : dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  } catch {
    return String(dateStr);
  }
};

export const formatOFDateOnly = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.seconds ? dateStr.seconds * 1000 : dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return String(dateStr);
  }
};

// Normalitza l'estat d'una OF per acceptar variants històriques o externes (ex: 'Pendent' o majúscules)
export const normalizeOFStatus = (status) => {
  if (!status) return 'cua';
  const s = String(status).toLowerCase().trim();
  if (s === 'cua' || s === 'en cua' || s === 'pendent' || s === 'en_espera' || s === 'espera') return 'cua';
  if (s === 'en_curs' || s === 'en curs' || s === 'curs' || s === 'produccio' || s === 'en producció' || s === 'en produccio') return 'en_curs';
  if (s === 'acabats' || s === 'en acabats' || s === 'en_acabats' || s === 'acabat') return 'acabats';
  if (s === 'finalitzada' || s === 'finalitzat' || s === 'completat' || s === 'completada') return 'finalitzada';
  if (s === 'cancel·lada' || s === 'cancel.lada' || s === 'cancelada' || s === 'anul·lada') return 'cancel·lada';
  return s;
};

// Determina si una OF permet canviar la quantitat (només 'cua' o 'en_curs')
export const isEditableOFStatus = (status) => {
  const norm = normalizeOFStatus(status);
  return norm === 'cua' || norm === 'en_curs';
};

// Retorna l'etiqueta descriptiva en català per a qualsevol estat d'OF
export const getOFStatusLabel = (status) => {
  const norm = normalizeOFStatus(status);
  switch (norm) {
    case 'cua': return 'En Cua';
    case 'en_curs': return 'En Curs';
    case 'acabats': return 'En Acabats';
    case 'finalitzada': return 'Finalitzada';
    case 'cancel·lada': return 'Cancel·lada';
    default: return status || 'En Cua';
  }
};

export default function OrdresFabricacioManager({
  ordresFabricacio = [],
  setOrdresFabricacio,
  materials = [],
  setMaterials,
  escandalls = [],
  setEscandalls,
  productes = [],
  setProductes,
  families = [],
  gammes = [],
  maquinaria = [],
  operacions = [],
  compres = [],
  esdeveniments = [],
  setEsdeveniments,
  setActiveProduccSubtab,
  isDark = true
}) {
  // Filtres i cerques
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' | 2026 | 2025 ...
  const [selectedOpenCloseFilter, setSelectedOpenCloseFilter] = useState('obertes'); // 'obertes' (default) | 'tancades' | 'totes'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'cua' | 'en_curs' | 'acabats' | 'finalitzada' | 'cancel·lada'
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('all'); // 'all' | 'urgent' | 'normal' | 'baixa'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals d'interacció
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOFDetail, setSelectedOFDetail] = useState(null);
  const [printOF, setPrintOF] = useState(null);
  const [manualModalOF, setManualModalOF] = useState(null);
  const [closingOFModal, setClosingOFModal] = useState(null);

  // Mapa de compres pendents per material (quantitats en camí en unitats base)
  const pendingPurchasesMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(compres)) return map;
    compres.forEach(c => {
      const estatNorm = (c.estat || '').toLowerCase().trim();
      if (estatNorm === 'rebut' || estatNorm.includes('cancel')) return;
      if (Array.isArray(c.linies)) {
        c.linies.forEach(l => {
          if (!l.materialId) return;
          const dem = Number(l.quantitatDemanada) || 0;
          const reb = Number(l.quantitatRebuda) || 0;
          const pend = Math.max(0, dem - reb);
          const factor = Number(l.factorConversio) > 0 ? Number(l.factorConversio) : 1;
          const pendUnitatsBase = pend * factor;
          if (pendUnitatsBase > 0) {
            map[l.materialId] = (map[l.materialId] || 0) + pendUnitatsBase;
          }
        });
      }
    });
    return map;
  }, [compres]);

  // Sol·licituds / Pressupostos web pendents (llegits en temps real de Firestore)
  const [webBudgets, setWebBudgets] = useState([]);
  const [isLoadingWebBudgets, setIsLoadingWebBudgets] = useState(false);

  useEffect(() => {
    setIsLoadingWebBudgets(true);
    const unsub = onSnapshot(collection(db, "pressupostos"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setWebBudgets(list);
      setIsLoadingWebBudgets(false);
    }, (err) => {
      console.warn("Error llegint pressupostos per a OF:", err);
      setIsLoadingWebBudgets(false);
    });
    return () => unsub();
  }, []);

  // Llista d'anys presents a les OFs per al selector d'històric
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    ordresFabricacio.forEach(of => {
      if (of.dataCreacio) {
        const y = new Date(of.dataCreacio).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
      if (of.id && of.id.startsWith('OF-')) {
        const parts = of.id.split('-');
        if (parts[1] && !isNaN(parseInt(parts[1], 10))) {
          yearsSet.add(parseInt(parts[1], 10));
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [ordresFabricacio, currentYear]);

  // Helper per resoldre totes les dades del producte associat a l'OF (Imatge, Família, Gamma, Nom)
  const resolveOFProductDetails = useCallback((ofItem) => {
    const rawNom = (ofItem.producteNom || ofItem.nom || '').trim();
    const rawLower = rawNom.toLowerCase();
    const pId = ofItem.producteId;
    const pCodi = (ofItem.producteCodi || '').toLowerCase().trim();

    // 1. Cercar producte al catàleg
    const prod = (productes || []).find(p => 
      (pId && (p.id === pId || String(p.id) === String(pId))) ||
      (pCodi && (String(p.codi || '').toLowerCase().trim() === pCodi)) ||
      (p.nom && p.nom.toLowerCase().trim() === rawLower) ||
      (p.nom && rawLower && (rawLower.includes(p.nom.toLowerCase().trim()) || p.nom.toLowerCase().trim().includes(rawLower)))
    );

    // 2. Cercar escandall associat
    const esc = (escandalls || []).find(e => 
      (ofItem.escandallId && (e.id === ofItem.escandallId || String(e.id) === String(ofItem.escandallId))) ||
      (prod && (e.producteId === prod.id || e.productId === prod.id)) ||
      (e.producteNom && e.producteNom.toLowerCase().trim() === rawLower)
    );

    // 3. Imatge
    let rawImg = ofItem.producteImatge || prod?.imatges?.[0] || prod?.foto || prod?.imatge || esc?.producteImatge || '';
    const fotoUrl = rawImg ? (resolveProducteMediaUrl(rawImg) || resolveMediaUrl(rawImg) || rawImg) : '';

    // 4. Família
    let familiaNom = ofItem.familiaNom || ofItem.familia || '';
    if (!familiaNom && prod) {
      if (prod.familiaNom) familiaNom = prod.familiaNom;
      else if (prod.familiaId) {
        const fam = (families || []).find(f => String(f.id) === String(prod.familiaId));
        if (fam) familiaNom = fam.nom;
      } else if (prod.familia) {
        familiaNom = prod.familia;
      }
    }
    if (!familiaNom && esc) {
      familiaNom = esc.familiaNom || esc.familia || '';
    }

    // 5. Gamma
    const gammaInfo = resolveOFGammaAndName(ofItem, productes, escandalls, gammes);
    let gammaNom = ofItem.gamma || gammaInfo.gamma || '';
    if (!gammaNom && prod) {
      if (prod.gammaNom) gammaNom = prod.gammaNom;
      else if (prod.gammaId) {
        const g = (gammes || []).find(gam => String(gam.id) === String(prod.gammaId));
        if (g) gammaNom = g.nom;
      }
    }

    // 6. Producte Nom
    const nom = gammaInfo.nom || prod?.nom || esc?.producteNom || rawNom || ofItem.id;

    return {
      fotoUrl,
      familiaNom,
      gammaNom,
      nom
    };
  }, [productes, escandalls, families, gammes]);

  // Recomptes per a les mètriques d'estat
  const stats = useMemo(() => {
    const total = ordresFabricacio.length;
    const cua = ordresFabricacio.filter(o => normalizeOFStatus(o.estat) === 'cua').length;
    const enCurs = ordresFabricacio.filter(o => normalizeOFStatus(o.estat) === 'en_curs').length;
    const acabats = ordresFabricacio.filter(o => normalizeOFStatus(o.estat) === 'acabats').length;
    const finalitzada = ordresFabricacio.filter(o => normalizeOFStatus(o.estat) === 'finalitzada').length;
    const cancel·lada = ordresFabricacio.filter(o => normalizeOFStatus(o.estat) === 'cancel·lada').length;
    const urgents = ordresFabricacio.filter(o => {
      const normEstat = normalizeOFStatus(o.estat);
      const p = (o.prioritat || 'normal').toLowerCase();
      const isUrgent = p === 'urgent' || p === 'tragic' || p === 'tràgic' || p === 'alta';
      return isUrgent && normEstat !== 'finalitzada' && normEstat !== 'cancel·lada';
    }).length;

    return { total, cua, enCurs, acabats, finalitzada, cancel·lada, urgents };
  }, [ordresFabricacio]);

  // Llista filtrada d'OFs per a la taula
  const filteredOFs = useMemo(() => {
    return ordresFabricacio.filter(of => {
      // Filtre d'Any
      if (selectedYear !== 'all') {
        const ofYear = of.dataCreacio ? new Date(of.dataCreacio).getFullYear() : (of.id?.split('-')?.[1] ? parseInt(of.id.split('-')[1], 10) : null);
        if (ofYear !== parseInt(selectedYear, 10)) return false;
      }

      // Filtre d'Estat (Obertes / Tancades / Totes)
      const normEstat = normalizeOFStatus(of.estat);
      const isClosed = normEstat === 'finalitzada' || normEstat === 'cancel·lada';
      if (selectedOpenCloseFilter === 'obertes' && isClosed) return false;
      if (selectedOpenCloseFilter === 'tancades' && !isClosed) return false;

      // Filtre d'Etapa d'Estat (KPIs: cua, en_curs, acabats, finalitzada...)
      if (selectedStatusFilter !== 'all' && normEstat !== selectedStatusFilter) {
        return false;
      }

      // Filtre de Prioritat (Normal / Ràpid / Urgent / Tràgic)
      if (selectedPriorityFilter !== 'all') {
        const ofP = (of.prioritat || 'normal').toLowerCase();
        const selP = selectedPriorityFilter.toLowerCase();
        if (selP === 'urgent_only') {
          if (ofP !== 'urgent' && ofP !== 'tragic' && ofP !== 'tràgic' && ofP !== 'alta') return false;
        } else if (selP === 'tragic') {
          if (ofP !== 'tragic' && ofP !== 'tràgic') return false;
        } else if (selP === 'urgent') {
          if (ofP !== 'urgent' && ofP !== 'alta') return false;
        } else if (selP === 'rapid') {
          if (ofP !== 'rapid' && ofP !== 'ràpid') return false;
        } else if (selP === 'normal') {
          if (ofP !== 'normal' && ofP !== '' && ofP !== 'baixa') return false;
        } else if (ofP !== selP) {
          return false;
        }
      }

      // Filtre de Cerca (text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (of.id || '').toLowerCase().includes(q);
        const matchClient = (of.clientNom || '').toLowerCase().includes(q);
        const matchContact = (of.clientContacte || '').toLowerCase().includes(q);
        const matchProd = (of.producteNom || '').toLowerCase().includes(q);
        const matchModel = (of.codiModelGenerat || '').toLowerCase().includes(q);
        const matchRef = (of.comandaRef || '').toLowerCase().includes(q);
        if (!matchId && !matchClient && !matchContact && !matchProd && !matchModel && !matchRef) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Prioritzar per nivell de prioritat (Tràgic > Urgent > Ràpid > Normal) i després data de creació descendent
      const priorityWeights = {
        'tragic': 4,
        'tràgic': 4,
        'urgent': 3,
        'alta': 3,
        'rapid': 2,
        'ràpid': 2,
        'normal': 1,
        'baixa': 0
      };
      const aWeight = priorityWeights[(a.prioritat || 'normal').toLowerCase()] ?? 1;
      const bWeight = priorityWeights[(b.prioritat || 'normal').toLowerCase()] ?? 1;
      const aNorm = normalizeOFStatus(a.estat);
      const bNorm = normalizeOFStatus(b.estat);
      const aClosed = aNorm === 'finalitzada' || aNorm === 'cancel·lada';
      const bClosed = bNorm === 'finalitzada' || bNorm === 'cancel·lada';

      if (!aClosed && bClosed) return -1;
      if (aClosed && !bClosed) return 1;

      if (!aClosed && !bClosed && aWeight !== bWeight) {
        return bWeight - aWeight; // Major prioritat primer
      }

      return (b.id || '').localeCompare(a.id || '');
    });
  }, [ordresFabricacio, selectedYear, selectedOpenCloseFilter, selectedStatusFilter, selectedPriorityFilter, searchQuery]);

  // Editar la quantitat d'una OF en estat 'cua' o 'en_curs' amb recalibrament de materials i estocs reservats
  const handleUpdateOFQuantitat = (ofId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    setOrdresFabricacio(prevOFs => {
      const targetOF = prevOFs.find(o => o.id === ofId);
      if (!targetOF) return prevOFs;

      if (!isEditableOFStatus(targetOF.estat)) {
        alert("Només es pot editar la quantitat d'una OF si està 'En Cua' o 'En Curs'.");
        return prevOFs;
      }

      const oldQty = targetOF.quantitat || 1;
      if (oldQty === qty) return prevOFs;

      // Recalcular materials de l'ordre
      let updatedMaterials = targetOF.materials;
      if (Array.isArray(targetOF.materials) && targetOF.materials.length > 0) {
        updatedMaterials = targetOF.materials.map(m => {
          const qUnit = m.quantitatTeoricaUnitat || (m.quantitatTotal ? (m.quantitatTotal / oldQty) : 0);
          const newTotal = qUnit * qty;
          return {
            ...m,
            quantitatTeoricaUnitat: qUnit,
            quantitatTotal: newTotal,
            estocReservat: newTotal
          };
        });

        // Actualitzar l'estoc reservat de materials si el setter està disponible
        if (setMaterials) {
          setMaterials(prevMats => {
            return prevMats.map(mat => {
              const oldMatEntry = targetOF.materials.find(m => String(m.materialId) === String(mat.id) || (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim()));
              if (!oldMatEntry) return mat;
              const qUnit = oldMatEntry.quantitatTeoricaUnitat || (oldMatEntry.quantitatTotal ? (oldMatEntry.quantitatTotal / oldQty) : 0);
              const oldTotal = oldMatEntry.quantitatTotal || 0;
              const newTotal = qUnit * qty;
              const diff = newTotal - oldTotal;

              const currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
              const estocReservat = Math.max(0, (Number(mat.estocReservat) || 0) + diff);
              return {
                ...mat,
                estocActual: currentStock,
                estocFisic: currentStock,
                estocReservat,
                estocDisponible: Math.max(0, currentStock - estocReservat),
                estoc: currentStock
              };
            });
          });
        }
      }

      // Recalcular temps teòrics d'operacions
      let updatedOperacions = targetOF.operacions;
      if (Array.isArray(targetOF.operacions) && targetOF.operacions.length > 0) {
        updatedOperacions = targetOF.operacions.map(op => {
          const tUnit = op.tempsTeoricUnitari || (op.tempsTeoricMinuts ? (op.tempsTeoricMinuts / oldQty) : 0);
          return {
            ...op,
            tempsTeoricUnitari: tUnit,
            tempsTeoricMinuts: tUnit * qty
          };
        });
      }

      const updatedOF = {
        ...targetOF,
        quantitat: qty,
        materials: updatedMaterials,
        operacions: updatedOperacions
      };

      if (selectedOFDetail && selectedOFDetail.id === ofId) {
        setSelectedOFDetail(updatedOF);
      }

      return prevOFs.map(o => o.id === ofId ? updatedOF : o);
    });
  };

  // Aplicar canvi d'estat d'una OF amb gestió d'estoc (Reservat / Físic / Disponible)
  const applyStatusChange = (ofId, newStatus, closingData = null) => {
    setOrdresFabricacio(prevOFs => {
      const targetOF = prevOFs.find(o => o.id === ofId);
      if (!targetOF) return prevOFs;

      const oldStatus = normalizeOFStatus(targetOF.estat);
      if (oldStatus === newStatus && targetOF.estat === newStatus && !closingData) return prevOFs;

      // Actualitzar materials a MaterialsManager segons el canvi d'estat
      if (setMaterials && Array.isArray(targetOF.materials) && targetOF.materials.length > 0) {
        setMaterials(prevMaterials => {
          return prevMaterials.map(mat => {
            const ofMat = targetOF.materials.find(m => String(m.materialId) === String(mat.id) || (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim()));
            if (!ofMat) return mat;

            const qty = Number(ofMat.quantitatTotal) || 0;
            let currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
            let estocReservat = Number(mat.estocReservat) || 0;

            // 1. Si passa a 'finalitzada' (completada): descomptar estoc físic i alliberar reservat
            if (newStatus === 'finalitzada' && oldStatus !== 'finalitzada') {
              if (oldStatus === 'cua' || oldStatus === 'en_curs' || oldStatus === 'acabats') {
                estocReservat = Math.max(0, estocReservat - qty);
              }
              currentStock = Math.max(0, currentStock - qty);
            }

            // 2. Si passa a 'cancel·lada': alliberar reservat sense descomptar estoc físic
            else if (newStatus === 'cancel·lada' && (oldStatus === 'cua' || oldStatus === 'en_curs' || oldStatus === 'acabats')) {
              estocReservat = Math.max(0, estocReservat - qty);
            }

            // 3. Si torna a activar-se des de 'cancel·lada' o 'finalitzada' a 'cua'/'en_curs'
            else if ((newStatus === 'cua' || newStatus === 'en_curs' || newStatus === 'acabats') && (oldStatus === 'cancel·lada' || oldStatus === 'finalitzada')) {
              estocReservat += qty;
              if (oldStatus === 'finalitzada') {
                currentStock += qty; // Revertir descompte físic
              }
            }

            const estocDisponible = Math.max(0, currentStock - estocReservat);
            return {
              ...mat,
              estocActual: currentStock,
              estocFisic: currentStock,
              estocReservat,
              estocDisponible,
              estoc: currentStock
            };
          });
        });
      }

      const updatedOF = {
        ...targetOF,
        estat: newStatus,
        ...(closingData ? {
          pecesBones: closingData.pecesBones,
          pecesDefectuoses: closingData.pecesDefectuoses,
          motiuDefecte: closingData.motiuDefecte || '',
          destinacioEstoc: closingData.destinacio || 'cap',
          dataFinalitzacio: new Date().toISOString()
        } : {})
      };

      return prevOFs.map(o => o.id === ofId ? updatedOF : o);
    });

    // Si l'OF està vinculada a una línia d'esdeveniment (fira), incorporar les peces a la parada
    if (newStatus === 'finalitzada' && setEsdeveniments && Array.isArray(esdeveniments)) {
      const targetOF = ordresFabricacio.find(o => o.id === ofId);
      const qFetes = closingData && closingData.pecesBones !== undefined 
        ? Number(closingData.pecesBones) 
        : (Number(targetOF?.quantitat) || 0);

      if (qFetes > 0) {
        setEsdeveniments(prevEvs => prevEvs.map(ev => {
          const hasLinkedLine = (ev.linies || []).some(l => l.ofId === ofId);
          if (!hasLinkedLine) return ev;

          return {
            ...ev,
            linies: ev.linies.map(l => {
              if (l.ofId === ofId && (l.unitatsPendentsFabricar || 0) > 0) {
                const qInc = Math.min(l.unitatsPendentsFabricar, qFetes);
                const agafades = l.unitatsAgafadesEstoc !== undefined ? l.unitatsAgafadesEstoc : (l.unitatsInicials || 0);
                return {
                  ...l,
                  unitatsAgafadesEstoc: agafades,
                  unitatsInicials: (l.unitatsInicials || 0) + qInc,
                  unitatsRestants: (l.unitatsRestants || 0) + qInc,
                  unitatsPendentsFabricar: Math.max(0, (l.unitatsPendentsFabricar || 0) - qInc),
                  ofFinalitzada: true
                };
              }
              return l;
            })
          };
        }));
      }
    }

    // Assignar peces correctes a l'estoc de productes si correspon
    if (closingData && closingData.product && closingData.pecesBones > 0 && setProductes) {
      if (closingData.destinacio === 'venda') {
        setProductes(prev => prev.map(p => 
          p.id === closingData.product.id 
            ? { ...p, estocActual: (Number(p.estocActual) || 0) + closingData.pecesBones }
            : p
        ));
      } else if (closingData.destinacio === 'mostres') {
        setProductes(prev => prev.map(p => 
          p.id === closingData.product.id 
            ? { ...p, estocMostres: (Number(p.estocMostres) || 0) + closingData.pecesBones }
            : p
        ));
      }
    }

    if (selectedOFDetail && selectedOFDetail.id === ofId) {
      setSelectedOFDetail(prev => prev ? {
        ...prev,
        estat: newStatus,
        ...(closingData ? {
          pecesBones: closingData.pecesBones,
          pecesDefectuoses: closingData.pecesDefectuoses,
          motiuDefecte: closingData.motiuDefecte || '',
          destinacioEstoc: closingData.destinacio || 'cap',
          dataFinalitzacio: new Date().toISOString()
        } : {})
      } : null);
    }
  };

  // Interceptor del canvi d'estat
  const handleChangeStatus = (ofId, newStatus) => {
    const targetOF = ordresFabricacio.find(o => o.id === ofId);
    if (!targetOF) return;
    const currentNorm = normalizeOFStatus(targetOF.estat);
    if (currentNorm === newStatus && targetOF.estat === newStatus) return;

    // Si passa a finalitzada, obrir el modal de control de qualitat i assignació d'estoc
    if (newStatus === 'finalitzada' && currentNorm !== 'finalitzada') {
      const ofProdId = targetOF.producteId;
      const ofNom = (targetOF.producteNom || targetOF.nom || '').toLowerCase().trim();
      const matchedProd = (productes || []).find(p => 
        (ofProdId && p.id === ofProdId) ||
        (p.nom && (p.nom.toLowerCase().trim() === ofNom || ofNom.includes(p.nom.toLowerCase().trim()) || p.nom.toLowerCase().trim().includes(ofNom)))
      );

      setClosingOFModal({
        of: targetOF,
        product: matchedProd || null,
        totalQty: Number(targetOF.quantitat || 1)
      });
      return;
    }

    // Advertència en cas de reactivar una ordre finalitzada
    if ((newStatus === 'cua' || newStatus === 'en_curs') && currentNorm === 'finalitzada') {
      const confirma = window.confirm("Aquesta ordre ja estava finalitzada. Si la tornes a activar a 'En Cua' o 'En Curs', es revertirà el descompte físic de materials i tornaran a quedar reservats. Vols continuar?");
      if (!confirma) return;
    }

    applyStatusChange(ofId, newStatus);
  };

  // Eliminar una OF
  const handleDeleteOF = (ofId) => {
    if (!window.confirm(`Segur que vols eliminar l'Ordre de Fabricació ${ofId}?`)) return;
    
    // Si estava reservant estoc, alliberar-lo
    const targetOF = ordresFabricacio.find(o => o.id === ofId);
    const targetNorm = targetOF ? normalizeOFStatus(targetOF.estat) : '';
    if (targetOF && (targetNorm === 'cua' || targetNorm === 'en_curs' || targetNorm === 'acabats') && setMaterials) {
      setMaterials(prevMats => {
        return prevMats.map(mat => {
          const ofMat = targetOF.materials?.find(m => String(m.materialId) === String(mat.id) || (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim()));
          if (!ofMat) return mat;
          const qty = Number(ofMat.quantitatTotal) || 0;
          const currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
          const estocReservat = Math.max(0, (Number(mat.estocReservat) || 0) - qty);
          return {
            ...mat,
            estocActual: currentStock,
            estocFisic: currentStock,
            estocReservat,
            estocDisponible: Math.max(0, currentStock - estocReservat),
            estoc: currentStock
          };
        });
      });
    }

    setOrdresFabricacio(prev => prev.filter(o => o.id !== ofId));
    if (selectedOFDetail?.id === ofId) setSelectedOFDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* CAPÇALERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2 text-amber-500 dark:text-amber-400">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Ordres de Fabricació (OF)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestió integral del procés de fabricació al taller, assignació de materials, reserva d'estocs i full de ruta d'operacions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Ordre de Fabricació
        </button>
      </div>

      {/* TARGETES KPI / MÈTRIQUES RÀPIDES (ALT CONTRAST) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Totes les OFs', count: stats.total, filter: 'all', active: selectedStatusFilter === 'all' },
          { label: 'En Cua', count: stats.cua, filter: 'cua', active: selectedStatusFilter === 'cua' },
          { label: 'En Curs', count: stats.enCurs, filter: 'en_curs', active: selectedStatusFilter === 'en_curs' },
          { label: 'En Acabats', count: stats.acabats, filter: 'acabats', active: selectedStatusFilter === 'acabats' },
          { label: 'Finalitzades', count: stats.finalitzada, filter: 'finalitzada', active: selectedStatusFilter === 'finalitzada' },
          { label: 'Urgents Actives', count: stats.urgents, filter: 'urgent_only', isUrgent: true }
        ].map((kpi, idx) => {
          const isSelected = kpi.active || (kpi.isUrgent && selectedPriorityFilter === 'urgent');

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (kpi.isUrgent) {
                  setSelectedPriorityFilter(selectedPriorityFilter === 'urgent' ? 'all' : 'urgent');
                  if (selectedOpenCloseFilter === 'tancades') {
                    setSelectedOpenCloseFilter('obertes');
                  }
                } else {
                  setSelectedStatusFilter(kpi.filter);
                  if (kpi.filter === 'finalitzada') {
                    if (selectedOpenCloseFilter === 'obertes') {
                      setSelectedOpenCloseFilter('tancades');
                    }
                  } else if (kpi.filter === 'cua' || kpi.filter === 'en_curs' || kpi.filter === 'acabats') {
                    if (selectedOpenCloseFilter === 'tancades') {
                      setSelectedOpenCloseFilter('obertes');
                    }
                  }
                }
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500/50 shadow-md'
                  : (isDark 
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850' 
                      : 'bg-white border-slate-200 hover:border-amber-500/40 shadow-xs')
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-medium truncate ${
                  isSelected ? 'text-amber-400 font-bold' : (isDark ? 'text-slate-300' : 'text-slate-600')
                }`}>
                  {kpi.label}
                </span>
                {kpi.isUrgent && <Flame className="w-4 h-4 text-rose-500 animate-pulse" />}
              </div>
              <p className={`text-2xl font-bold font-mono mt-1.5 ${
                isSelected ? 'text-amber-400' : (isDark ? 'text-white' : 'text-slate-900')
              }`}>
                {kpi.count}
              </p>
            </button>
          );
        })}
      </div>

      {/* BARRA D'EINES I FILTRES */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Cercador */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Cerca per Codi OF, Client, Producte, Ref Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-white ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtres agrupats */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector d'Any / Històric */}
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}>
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Any:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`bg-transparent text-xs font-mono font-bold outline-none cursor-pointer ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Tots els anys</option>
                {availableYears.map(y => (
                  <option key={y} value={y} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{y}</option>
                ))}
              </select>
            </div>

            {/* Selector de Prioritat */}
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}>
              <Filter className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Prioritat:</span>
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className={`bg-transparent text-xs font-mono font-bold outline-none cursor-pointer ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Totes</option>
                <option value="normal" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚪ Normal</option>
                <option value="rapid" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚡ Ràpid</option>
                <option value="urgent" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🟠 Urgent</option>
                <option value="tragic" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>🔴 Tràgic</option>
              </select>
            </div>

            {/* Selector d'Estat (Obertes / Tancades / Totes) */}
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}>
              <Layers className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Estat:</span>
              <select
                value={selectedOpenCloseFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedOpenCloseFilter(val);
                  if (val === 'obertes' && (selectedStatusFilter === 'finalitzada' || selectedStatusFilter === 'cancel·lada')) {
                    setSelectedStatusFilter('all');
                  }
                  if (val === 'tancades' && (selectedStatusFilter === 'cua' || selectedStatusFilter === 'en_curs' || selectedStatusFilter === 'acabats')) {
                    setSelectedStatusFilter('all');
                  }
                }}
                className={`bg-transparent text-xs font-mono font-bold outline-none cursor-pointer ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <option value="obertes" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Obertes</option>
                <option value="tancades" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Tancades</option>
                <option value="totes" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Totes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TAULA PRINCIPAL D'ORDRES DE FABRICACIÓ */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-mono font-bold uppercase text-[11px] tracking-wider ${
                isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <th className="py-3.5 px-4">OF</th>
                <th className="py-3.5 px-4">Producte</th>
                <th className="py-3.5 px-4">Client & Comanda</th>
                <th className="py-3.5 px-4 text-center">Quantitat</th>
                <th className="py-3.5 px-4">Full de Ruta</th>
                <th className="py-3.5 px-4 text-center">Estat</th>
                <th className="py-3.5 px-4 text-right">Accions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
              {filteredOFs.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-12 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No s'ha trobat cap Ordre de Fabricació amb els filtres seleccionats.
                  </td>
                </tr>
              ) : (
                filteredOFs.map((of) => {
                  const totalOps = of.operacions?.length || 0;
                  const completedOps = of.operacions?.filter(o => o.completada)?.length || 0;
                  const percentOps = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
                  const p = (of.prioritat || 'normal').toLowerCase();
                  const isClosed = normalizeOFStatus(of.estat) === 'finalitzada' || normalizeOFStatus(of.estat) === 'cancel·lada';
                  const rowPriorityClass = !isClosed ? (
                    (p === 'tragic' || p === 'tràgic') ? (isDark ? 'bg-rose-950/25 border-l-4 border-rose-500' : 'bg-rose-50/80 border-l-4 border-rose-500') :
                    (p === 'urgent' || p === 'alta') ? (isDark ? 'bg-amber-950/20 border-l-4 border-amber-500' : 'bg-amber-50/60 border-l-4 border-amber-500') :
                    (p === 'rapid' || p === 'ràpid') ? (isDark ? 'bg-sky-950/15 border-l-4 border-sky-400' : 'bg-sky-50/50 border-l-4 border-sky-400') :
                    ''
                  ) : '';

                  return (
                    <tr
                      key={of.id}
                      className={`hover:bg-amber-500/10 transition-colors ${rowPriorityClass}`}
                    >
                      {/* 1. OF: Nº d'OF + Prioritat + Inici + Límit */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold tracking-tight ${
                              isDark ? 'text-amber-400' : 'text-amber-700'
                            }`}>
                              {of.id}
                            </span>
                            {(() => {
                              if (p === 'tragic' || p === 'tràgic') {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-600/30 text-rose-400 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                                    <Flame className="w-2.5 h-2.5 text-rose-500" /> TRÀGIC
                                  </span>
                                );
                              }
                              if (p === 'urgent' || p === 'alta') {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                                    <Flame className="w-2.5 h-2.5 text-amber-500" /> URGENT
                                  </span>
                                );
                              }
                              if (p === 'rapid' || p === 'ràpid') {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5 text-sky-400" /> RÀPID
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-[11px] space-y-0.5 pt-0.5">
                            <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                              Inici: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatOFDateOnly(of.dataCreacio)}</span>
                            </div>
                            {of.dataLimitEntrega && (
                              <div className={isDark ? 'text-amber-300' : 'text-amber-700'}>
                                Límit: <span className="font-bold underline">{formatOFDateOnly(of.dataLimitEntrega)}</span>
                              </div>
                            )}
                            {(() => {
                              if (isClosed || !Array.isArray(of.materials) || of.materials.length === 0) return null;
                              let hasShortage = false;
                              let hasPurchasesPending = false;
                              for (const m of of.materials) {
                                const matInStock = materials.find(mat => mat.id === (m.materialId || m.id));
                                const estocReal = Number(
                                  matInStock?.estocActual !== undefined 
                                    ? matInStock.estocActual 
                                    : (matInStock?.estocFisic !== undefined ? matInStock.estocFisic : (matInStock?.estoc || 0))
                                ) || 0;
                                const qtyRequired = Number(m.quantitatTotal) || 0;
                                const matId = m.materialId || matInStock?.id;
                                const pendingPurchases = matId ? (pendingPurchasesMap[matId] || 0) : 0;
                                if (estocReal < qtyRequired) {
                                  hasShortage = true;
                                  if (pendingPurchases > 0) {
                                    hasPurchasesPending = true;
                                  }
                                }
                              }
                              if (!hasShortage) return null;
                              return (
                                <div className="pt-0.5">
                                  {hasPurchasesPending ? (
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-500/15 text-sky-400 border border-sky-500/25"
                                      title="Falta material d'estoc, però hi ha comanda de compra en camí"
                                    >
                                      <Package className="w-2.5 h-2.5 text-sky-400" /> Compres en camí
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/15 text-rose-400 border border-rose-500/25"
                                      title="Manca estoc per cobrir aquesta ordre i no hi ha comanda pendent"
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Manca material
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* 2. Producte: Imatge | Família / Gamma / Producte */}
                      <td className="py-3.5 px-4 min-w-[240px] max-w-[320px]">
                        {(() => {
                          const itemInfo = resolveOFProductDetails(of);
                          return (
                            <div className="flex items-center gap-3">
                              {/* Imatge del producte */}
                              <div className={`w-12 h-12 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center ${
                                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}>
                                {itemInfo.fotoUrl ? (
                                  <img
                                    src={itemInfo.fotoUrl}
                                    alt={itemInfo.nom}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-full h-full items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
                                  style={{ display: itemInfo.fotoUrl ? 'none' : 'flex' }}
                                >
                                  <Package className="w-5 h-5" />
                                </div>
                              </div>

                              {/* Columna Producte / Gamma / Família */}
                              <div className="min-w-0 flex-1 space-y-0.5">
                                {/* Línia superior: Nom del producte destacat (format que tenia la línia superior) */}
                                <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wide block leading-tight truncate ${
                                  isDark ? 'text-amber-400' : 'text-amber-700'
                                }`} title={itemInfo.nom}>
                                  {itemInfo.nom}
                                </h4>

                                {/* Línia inferior: Gamma (amb el format font-serif que tenia la línia inferior) */}
                                {itemInfo.gammaNom && (
                                  <span className={`font-serif font-bold text-xs truncate leading-snug block ${
                                    isDark ? 'text-slate-100' : 'text-slate-900'
                                  }`} title={itemInfo.gammaNom}>
                                    {itemInfo.gammaNom}
                                    {itemInfo.familiaNom && itemInfo.familiaNom !== itemInfo.gammaNom && (
                                      <span className={`font-mono text-[10px] font-normal uppercase ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        ({itemInfo.familiaNom})
                                      </span>
                                    )}
                                  </span>
                                )}
                                {!itemInfo.gammaNom && itemInfo.familiaNom && (
                                  <span className={`font-serif font-bold text-xs truncate leading-snug block ${
                                    isDark ? 'text-slate-100' : 'text-slate-900'
                                  }`}>
                                    {itemInfo.familiaNom}
                                  </span>
                                )}
                                {(of.codiModelGenerat || of.mida) && (
                                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono leading-none pt-0.5">
                                    {of.codiModelGenerat && (
                                      <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                        {of.codiModelGenerat}
                                      </span>
                                    )}
                                    {of.mida && <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>({of.mida})</span>}
                                  </div>
                                )}
                                {(of.textCaraA || of.textCaraB) && (
                                  <p className={`text-[10.5px] italic truncate leading-none pt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontFamily: of.tipografia ? AVAILABLE_FONTS.find(f => f.name === of.tipografia)?.fontFamily : undefined }}>
                                    {of.textCaraA ? `"${of.textCaraA}"` : (of.textCaraB ? `"${of.textCaraB}"` : '')} {of.tipografia ? `[${of.tipografia}]` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 3. Client & Comanda: Nom Client + Número de comanda */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <p className={`font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {of.clientNom || 'Estoc Taller'}
                          </p>
                          <div className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {of.comandaRef ? (
                              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                #{of.comandaRef}
                              </span>
                            ) : (
                              <span className="opacity-40">-</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantitat */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEditableOFStatus(of.estat) ? (
                          <div className="inline-flex items-center justify-center gap-1 group/qty" title="Modifica la quantitat d'aquesta ordre (prem Enter o clica fora per confirmar)">
                            <input
                              type="number"
                              min="1"
                              defaultValue={of.quantitat}
                              key={`${of.id}-${of.quantitat}`}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val && val > 0 && val !== of.quantitat) {
                                  handleUpdateOFQuantitat(of.id, val);
                                } else {
                                  e.target.value = of.quantitat;
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              className={`w-16 py-1 px-1.5 text-center font-mono font-bold text-sm rounded-xl border outline-none transition-all cursor-text ${
                                isDark 
                                  ? 'bg-slate-800/90 text-amber-400 border-amber-500/40 hover:border-amber-400 focus:border-amber-400 focus:bg-slate-900 focus:ring-1 focus:ring-amber-500/50' 
                                  : 'bg-amber-50/80 text-amber-800 border-amber-300 hover:border-amber-400 focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/50'
                              }`}
                            />
                            <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>u</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-mono font-bold text-sm px-3 py-1 rounded-xl border ${
                              isDark 
                                ? 'bg-slate-800 text-white border-slate-700' 
                                : 'bg-slate-100 text-slate-900 border-slate-300'
                            }`}>
                              {of.pecesBones !== undefined ? of.pecesBones : of.quantitat} u
                            </span>
                            {of.pecesDefectuoses > 0 && (
                              <span 
                                className="text-[10px] font-mono font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-0.5" 
                                title={of.motiuDefecte ? `Motiu: ${of.motiuDefecte}` : 'Peces rebutjades amb tara'}
                              >
                                <AlertTriangle className="w-3 h-3" /> {of.pecesDefectuoses} defect.
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Full de Ruta (Progrés) */}
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>
                              {completedOps}/{totalOps} passos
                            </span>
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{percentOps}%</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentOps === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percentOps}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Estat interactiu */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={normalizeOFStatus(of.estat)}
                            onChange={(e) => handleChangeStatus(of.id, e.target.value)}
                            className={`text-xs font-mono font-bold rounded-full px-3.5 py-1.5 outline-none border cursor-pointer appearance-none pr-8 shadow-xs transition-colors ${
                              isDark 
                                ? 'bg-slate-800 border-slate-650 text-white hover:border-amber-500' 
                                : 'bg-white border-slate-300 text-slate-900 hover:border-amber-500'
                            }`}
                          >
                            <option value="cua" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Cua</option>
                            <option value="en_curs" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Curs</option>
                            <option value="acabats" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Acabats</option>
                            <option value="finalitzada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Finalitzada</option>
                            <option value="cancel·lada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Cancel·lada</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </td>

                      {/* Accions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOFDetail(of)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900'
                            }`}
                            title="Veure Fitxa Completa & Full de Ruta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const rawLower = (of.nom || of.producteNom || '').toLowerCase().trim();
                              const esc = (escandalls || []).find(e => 
                                (of.escandallId && (e.id === of.escandallId || String(e.id) === String(of.escandallId))) ||
                                (e.producteCodi && of.codiModelGenerat && e.producteCodi.toLowerCase().trim() === of.codiModelGenerat.toLowerCase().trim()) ||
                                (e.producteNom && e.producteNom.toLowerCase().trim() === rawLower)
                              );
                              if (esc) {
                                setManualModalOF(esc);
                              } else {
                                alert("No s'ha trobat cap escandall associat amb guia de fabricació per a aquesta ordre.");
                              }
                            }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 hover:text-emerald-300' 
                                : 'bg-white hover:bg-slate-50 text-emerald-700 border-slate-300 hover:text-emerald-800'
                            }`}
                            title="Manual de Fabricació i Muntatge"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintOF(of)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900'
                            }`}
                            title="Imprimir Full de Taller"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOF(of.id)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-rose-500/20 text-rose-400 border-slate-700 hover:border-rose-500/40' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-300 hover:border-rose-300'
                            }`}
                            title="Eliminar Ordre"
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

      {/* MODAL: NOVA ORDRE DE FABRICACIÓ (PERFECTAMENT ENCAIXAT DINS DE LA PANTALLA) */}
      {isNewModalOpen && (
        <NewOFModal
          onClose={() => setIsNewModalOpen(false)}
          existingOFs={ordresFabricacio}
          materials={materials}
          escandalls={escandalls}
          productes={productes}
          families={families}
          gammes={gammes}
          maquinaria={maquinaria}
          operacions={operacions}
          webBudgets={webBudgets}
          compres={compres}
          onCreate={(newOF) => {
            setOrdresFabricacio(prev => [newOF, ...prev]);
            // Reservar estoc dels materials associats
            if (setMaterials && Array.isArray(newOF.materials) && newOF.materials.length > 0) {
              setMaterials(prevMats => {
                return prevMats.map(mat => {
                  const ofMat = newOF.materials.find(m => String(m.materialId) === String(mat.id) || (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim()));
                  if (!ofMat) return mat;
                  const qty = Number(ofMat.quantitatTotal) || 0;
                  const currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
                  const estocReservat = (Number(mat.estocReservat) || 0) + qty;
                  return {
                    ...mat,
                    estocActual: currentStock,
                    estocFisic: currentStock,
                    estocReservat,
                    estocDisponible: Math.max(0, currentStock - estocReservat),
                    estoc: currentStock
                  };
                });
              });
            }
            setIsNewModalOpen(false);
          }}
          isDark={isDark}
        />
      )}

      {/* MODAL: DETALL DE L'OF & FULL DE RUTA INTERACTIU */}
      {selectedOFDetail && (
        <OFDetailModal
          ofData={selectedOFDetail}
          onClose={() => setSelectedOFDetail(null)}
          onUpdateOF={(updatedOF) => {
            if (updatedOF.estat === 'finalitzada' && selectedOFDetail?.estat !== 'finalitzada') {
              handleChangeStatus(updatedOF.id, 'finalitzada');
            } else {
              setOrdresFabricacio(prev => prev.map(o => o.id === updatedOF.id ? updatedOF : o));
              setSelectedOFDetail(updatedOF);
            }
          }}
          onChangeStatus={handleChangeStatus}
          onUpdateQuantitat={handleUpdateOFQuantitat}
          onFinalitzarOF={() => handleChangeStatus(selectedOFDetail.id, 'finalitzada')}
          materials={materials}
          setMaterials={setMaterials}
          ordresFabricacio={ordresFabricacio}
          setOrdresFabricacio={setOrdresFabricacio}
          escandalls={escandalls}
          setEscandalls={setEscandalls}
          operacions={operacions}
          compres={compres}
          isDark={isDark}
          onPrint={() => {
            setPrintOF(selectedOFDetail);
          }}
        />
      )}

      {/* MODAL: FINALITZACIÓ D'OF & CONTROL DE QUALITAT (Mermes / Defectes / Estoc) */}
      {closingOFModal && (
        <CloseOFModal
          modalData={closingOFModal}
          onClose={() => setClosingOFModal(null)}
          onConfirm={(closingData) => {
            applyStatusChange(closingOFModal.of.id, 'finalitzada', closingData);
            setClosingOFModal(null);
          }}
          isDark={isDark}
          esdeveniments={esdeveniments}
        />
      )}

      {/* MODAL / VISTA IMPRIMIBLE DE DOSSIER DE TALLER */}
      {printOF && (
        <PrintWorkshopDossier
          ofData={printOF}
          onClose={() => setPrintOF(null)}
          escandalls={escandalls}
          operacions={operacions}
        />
      )}

      {/* MODAL: MANUAL DE FABRICACIÓ I MUNTATGE */}
      {manualModalOF && (
        <ManufacturingManualModal
          escandall={manualModalOF}
          operacionsCatalog={operacions}
          onClose={() => setManualModalOF(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: MODAL DE CREACIÓ DE NOVA OF
// --------------------------------------------------------------------------
function NewOFModal({
  onClose,
  existingOFs,
  materials,
  escandalls,
  productes,
  families,
  gammes,
  maquinaria,
  operacions,
  webBudgets,
  compres = [],
  onCreate,
  isDark
}) {
  // Mode de selecció principal: 'producte' (Catàleg) | 'projecte' (Món Mínim) | 'web' (Pressupostos)
  const [sourceType, setSourceType] = useState('producte');

  // Mapa de compres pendents per material
  const pendingPurchasesMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(compres)) return map;
    compres.forEach(c => {
      const estatNorm = (c.estat || '').toLowerCase().trim();
      if (estatNorm === 'rebut' || estatNorm.includes('cancel')) return;
      if (Array.isArray(c.linies)) {
        c.linies.forEach(l => {
          if (!l.materialId) return;
          const dem = Number(l.quantitatDemanada) || 0;
          const reb = Number(l.quantitatRebuda) || 0;
          const pend = Math.max(0, dem - reb);
          const factor = Number(l.factorConversio) > 0 ? Number(l.factorConversio) : 1;
          const pendUnitatsBase = pend * factor;
          if (pendUnitatsBase > 0) {
            map[l.materialId] = (map[l.materialId] || 0) + pendUnitatsBase;
          }
        });
      }
    });
    return map;
  }, [compres]);

  // Filtres per a la cerca ràpida de Productes de Catàleg
  const [selectedFamilia, setSelectedFamilia] = useState('all');
  const [selectedGamma, setSelectedGamma] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const nextId = useMemo(() => getNextOFId(existingOFs, currentYear), [existingOFs, currentYear]);

  // Estat del formulari de nova OF
  const [formData, setFormData] = useState({
    id: nextId,
    dataCreacio: new Date().toISOString().split('T')[0],
    dataLimitEntrega: '',
    estat: 'cua',
    prioritat: 'normal',
    origen: 'manual_taller',
    tipusItem: 'producte', // 'producte' | 'projecte'
    comandaRef: '',
    clientNom: '',
    clientContacte: '',
    producteId: '',
    producteNom: '',
    producteCodi: '',
    escandallId: '',
    quantitat: 1,
    mida: '',
    codiModelGenerat: '',
    tipografia: 'Playfair Display',
    midaFont: 'Mitjana',
    forats: [],
    textCaraA: '',
    textCaraB: '',
    notesTaller: '',
    parametresLaser: DEFAULT_LASER_CONFIG
  });

  // Obtenir tots els productes combinats del catàleg
  const allCatalogProducts = useMemo(() => {
    if (productes && productes.length > 0) return productes;
    return GIFT_PRODUCTS.map(g => ({
      id: g.id,
      nom: g.title,
      codi: g.code || `REG-${g.id}`,
      preu: g.price || 0,
      familiaId: g.category || 'altres',
      familiaNom: g.category || 'Altres',
      gammaId: g.gamma || '',
      gammaNom: g.gamma || '',
      opcionsPersonalitzacio: g.customOptions || []
    }));
  }, [productes]);

  // Obtenir la llista de Productes Escandallats directament des de la col·lecció d'Escandalls de producte
  const escandallatProducts = useMemo(() => {
    return escandalls
      .filter(e => !e.tipus || e.tipus === 'Producte Web' || e.tipus === 'Producte')
      .map(e => {
        const matchedProd = allCatalogProducts.find(p => 
          (p.id && e.producteId && String(p.id) === String(e.producteId)) ||
          (p.codi && e.producteCodi && p.codi === e.producteCodi) ||
          (p.nom && e.producteNom && String(p.nom).toLowerCase().trim() === String(e.producteNom).toLowerCase().trim())
        );

        // Detectar Família
        let famNom = '';
        if (matchedProd) {
          if (matchedProd.familia) famNom = matchedProd.familia;
          else if (matchedProd.familiaNom) famNom = matchedProd.familiaNom;
          else if (Array.isArray(matchedProd.familaIds) && matchedProd.familaIds.length > 0) famNom = matchedProd.familaIds[0];
          else if (Array.isArray(matchedProd.familiaIds) && matchedProd.familiaIds.length > 0) famNom = matchedProd.familiaIds[0];
          else if (matchedProd.categoria) famNom = matchedProd.categoria;
        }
        if (!famNom && e.familia) famNom = e.familia;
        if (!famNom && e.familiaNom) famNom = e.familiaNom;

        // Detectar Gamma
        let gamNom = '';
        if (matchedProd) {
          if (matchedProd.gamma) gamNom = matchedProd.gamma;
          else if (matchedProd.gammaNom) gamNom = matchedProd.gammaNom;
          else if (Array.isArray(matchedProd.gammaIds) && matchedProd.gammaIds.length > 0) gamNom = matchedProd.gammaIds[0];
          else if (matchedProd.gammaId) gamNom = matchedProd.gammaId;
        }
        if (!gamNom && e.gamma) gamNom = e.gamma;
        if (!gamNom && e.gammaNom) gamNom = e.gammaNom;

        return {
          id: matchedProd?.id || e.producteId || e.id,
          nom: e.producteNom || matchedProd?.nom || 'Producte Escandallat',
          codi: e.producteCodi || matchedProd?.codi || '',
          escandallId: e.id,
          escandall: e,
          product: matchedProd,
          familiaNom: famNom,
          gammaNom: gamNom,
          opcionsPersonalitzacio: matchedProd?.opcionsPersonalitzacio || []
        };
      });
  }, [escandalls, allCatalogProducts]);

  // Llista de Famílies disponibles que tenen productes escandallats o que estan definides
  const availableFamilies = useMemo(() => {
    const famMap = new Map();
    // 1. Des de la col·lecció de famílies
    families.forEach(f => {
      const name = f.nom || f.titol || f.id;
      if (name) famMap.set(name, { id: f.id || name, nom: name });
    });
    // 2. Des dels productes escandallats
    escandallatProducts.forEach(p => {
      if (p.familiaNom && !famMap.has(p.familiaNom)) {
        famMap.set(p.familiaNom, { id: p.familiaNom, nom: p.familiaNom });
      }
    });
    return Array.from(famMap.values());
  }, [families, escandallatProducts]);

  // Llista de Gammes filtrades segons la Família triada
  const availableGammes = useMemo(() => {
    const gamMap = new Map();

    // 1. Gammes dels productes escandallats que coincideixen amb la família
    escandallatProducts.forEach(p => {
      if (selectedFamilia !== 'all') {
        const matchesFam = p.familiaNom === selectedFamilia || 
          p.product?.familia === selectedFamilia || 
          (Array.isArray(p.product?.familaIds) && p.product.familaIds.includes(selectedFamilia)) ||
          (Array.isArray(p.product?.familiaIds) && p.product.familiaIds.includes(selectedFamilia));
        if (!matchesFam) return;
      }
      if (p.gammaNom) {
        gamMap.set(p.gammaNom, { id: p.gammaNom, nom: p.gammaNom });
      }
    });

    // 2. Gammes de la col·lecció 'gammes'
    gammes.forEach(g => {
      const gName = g.nom || g.titol || g.id;
      if (selectedFamilia !== 'all') {
        const matchesFam = g.familiaNom === selectedFamilia || g.familiaId === selectedFamilia;
        if (!matchesFam) return;
      }
      if (gName && !gamMap.has(gName)) {
        gamMap.set(gName, { id: g.id || gName, nom: gName });
      }
    });

    return Array.from(gamMap.values());
  }, [escandallatProducts, gammes, selectedFamilia]);

  // Productes escandallats filtrats per Família / Gamma / Cerca
  const filteredEscandallatProducts = useMemo(() => {
    return escandallatProducts.filter(p => {
      // Filtre de Família
      if (selectedFamilia !== 'all') {
        const famList = [
          ...(p.familiaNom ? [p.familiaNom] : []),
          ...(p.product?.familia ? [p.product.familia] : []),
          ...(p.product?.familiaNom ? [p.product.familiaNom] : []),
          ...(Array.isArray(p.product?.familaIds) ? p.product.familaIds : []),
          ...(Array.isArray(p.product?.familiaIds) ? p.product.familiaIds : []),
          ...(p.product?.categoria ? [p.product.categoria] : []),
          ...(p.escandall?.familia ? [p.escandall.familia] : [])
        ];
        const gamList = [
          ...(p.gammaNom ? [p.gammaNom] : []),
          ...(p.product?.gamma ? [p.product.gamma] : []),
          ...(p.product?.gammaNom ? [p.product.gammaNom] : []),
          ...(Array.isArray(p.product?.gammaIds) ? p.product.gammaIds : []),
          ...(p.product?.gammaId ? [p.product.gammaId] : []),
          ...(p.escandall?.gamma ? [p.escandall.gamma] : [])
        ];
        const sFamLower = selectedFamilia.toLowerCase();
        const directMatch = famList.some(f => String(f).toLowerCase().includes(sFamLower) || sFamLower.includes(String(f).toLowerCase()));
        const gammaMatches = gamList.some(gName => {
          const gObj = gammes.find(g => isProductInGamma([gName], g.nom, gammes));
          return gObj?.familiaNom && gObj.familiaNom.toLowerCase().includes(sFamLower);
        });
        if (!directMatch && !gammaMatches && !isProductInGamma(gamList, selectedFamilia, gammes)) return false;
      }

      // Filtre de Gamma
      if (selectedGamma !== 'all') {
        const gamList = [
          ...(p.gammaNom ? [p.gammaNom] : []),
          ...(p.product?.gamma ? [p.product.gamma] : []),
          ...(p.product?.gammaNom ? [p.product.gammaNom] : []),
          ...(Array.isArray(p.product?.gammaIds) ? p.product.gammaIds : []),
          ...(p.product?.gammaId ? [p.product.gammaId] : []),
          ...(p.escandall?.gamma ? [p.escandall.gamma] : [])
        ];
        const matchGam = isProductInGamma(gamList, selectedGamma, gammes) ||
          gamList.some(g => String(g).toLowerCase().trim() === selectedGamma.toLowerCase().trim());
        if (!matchGam) return false;
      }

      // Filtre de Cerca
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchNom = (p.nom || '').toLowerCase().includes(q);
        const matchCodi = (p.codi || '').toLowerCase().includes(q);
        if (!matchNom && !matchCodi) return false;
      }

      return true;
    });
  }, [escandallatProducts, selectedFamilia, selectedGamma, productSearch, gammes]);

  // Llista de Projectes que disposen d'escandall (Món Mínim, Stitch, etc.)
  const escandallatProjects = useMemo(() => {
    return escandalls.filter(e => {
      const t = (e.tipus || '').toLowerCase();
      const isProj = t.includes('món mínim') || t.includes('mon minim') || t.includes('projecte') || t.includes('obra singular') || t.includes('a mida');
      const isNotWebProd = !escandallatProducts.some(p => p.escandallId === e.id);
      return isProj || isNotWebProd;
    });
  }, [escandalls, escandallatProducts]);

  // Materials i Operacions calculades segons l'escandall seleccionat i la quantitat
  const [calculatedMaterials, setCalculatedMaterials] = useState([]);
  const [calculatedOperacions, setCalculatedOperacions] = useState([]);

  // Auto-càrrega quan canvia escandallId o quantitat
  useEffect(() => {
    if (!formData.escandallId) {
      setCalculatedMaterials([]);
      setCalculatedOperacions([]);
      return;
    }

    const esc = escandalls.find(e => e.id === formData.escandallId);
    if (!esc) return;

    const qty = formData.quantitat || 1;

    // Materials de l'escandall
    const mats = (esc.materials || []).map(em => {
      const matObj = (materials || []).find(m => String(m.id) === String(em.materialId) || (em.nom && m.material && m.material.toLowerCase().trim() === em.nom.toLowerCase().trim()));
      const qUnit = Number(em.quantitat) || 0;
      const qTotal = qUnit * qty;
      return {
        materialId: em.materialId || matObj?.id || '',
        nom: matObj?.material || em.nom || 'Material',
        quantitatTeoricaUnitat: qUnit,
        quantitatTotal: qTotal,
        unitat: matObj?.unitat || em.unitat || 'u',
        estocReservat: qTotal,
        estocDescomptat: false
      };
    });
    setCalculatedMaterials(mats);

    // Operacions de l'escandall
    const ops = (esc.operacions || []).map((eo, idx) => {
      const opObj = operacions.find(o => o.id === eo.operacioId);
      const tempsU = eo.tempsMinuts || 0;
      return {
        id: `op-${idx + 1}`,
        nom: opObj?.operacio || eo.nom || `Operació ${idx + 1}`,
        tempsTeoricMinuts: tempsU * qty,
        tempsRealMinuts: 0,
        completada: false
      };
    });
    setCalculatedOperacions(ops);
  }, [formData.escandallId, formData.quantitat, escandalls, materials, operacions]);

  // Triar un producte del catàleg escandallat
  const handleSelectProduct = (prod) => {
    const matchedEsc = escandalls.find(e => e.id === prod.escandallId);
    setFormData(prev => ({
      ...prev,
      tipusItem: 'producte',
      producteId: prod.id,
      producteNom: prod.nom,
      producteCodi: prod.codi || '',
      escandallId: prod.escandallId,
      codiModelGenerat: prod.codi || '',
      parametresLaser: matchedEsc?.parametresLaser || DEFAULT_LASER_CONFIG
    }));
  };

  // Triar un projecte escandallat
  const handleSelectProject = (projEsc) => {
    setFormData(prev => ({
      ...prev,
      tipusItem: 'projecte',
      producteId: projEsc.producteId || projEsc.id,
      producteNom: projEsc.nom || projEsc.producteNom || 'Projecte Món Mínim',
      producteCodi: projEsc.producteCodi || 'MM',
      escandallId: projEsc.id,
      codiModelGenerat: projEsc.producteCodi || 'MM-PROJ',
      quantitat: 1,
      parametresLaser: projEsc.parametresLaser || DEFAULT_LASER_CONFIG
    }));
  };

  // Carregar dades des d'una sol·licitud web
  const handleSelectWebBudget = (budget, item) => {
    const matchedProd = escandallatProducts.find(p => p.id === item.producteId || p.nom === item.nom);
    const matchedEsc = matchedProd?.escandallId ? escandalls.find(e => e.id === matchedProd.escandallId) : escandalls.find(e => e.producteId === item.producteId || e.nom?.includes(item.nom));

    if (!matchedEsc) {
      alert(`Atenció: Aquest producte (${item.nom}) no té cap escandall creat. Per poder fabricar-lo cal escandallar-lo prèviament a la secció d'Escandalls.`);
      return;
    }

    const opc = item.opcionsTriades || {};
    const midaVal = opc['Mida de l\'etiqueta'] || opc['Mida'] || '';
    const codiVal = opc['Codi Model Generat'] || '';
    const tipoVal = opc['Tipografia'] || 'Playfair Display';
    const midaFontVal = opc['Mida de la font'] || 'Mitjana';
    const foratsVal = Array.isArray(opc['Forats seleccionats']) ? opc['Forats seleccionats'] : [];
    const textAVal = opc['Text (Cara A)'] || opc['Text Cara A'] || '';
    const textBVal = opc['Text (Cara B)'] || opc['Text Cara B'] || '';

    setFormData(prev => ({
      ...prev,
      origen: 'web_pressupost',
      tipusItem: 'producte',
      comandaRef: budget.codiReferencia || budget.id,
      clientNom: budget.clientNom || '',
      clientContacte: budget.clientContacte || '',
      producteId: item.producteId || matchedProd?.id || '',
      producteNom: item.nom || '',
      producteCodi: matchedProd?.codi || '',
      escandallId: matchedEsc.id,
      quantitat: item.quantitat || 1,
      mida: midaVal,
      codiModelGenerat: codiVal,
      tipografia: tipoVal,
      midaFont: midaFontVal,
      forats: foratsVal,
      textCaraA: textAVal,
      textCaraB: textBVal,
      parametresLaser: matchedEsc.parametresLaser || DEFAULT_LASER_CONFIG,
      notesTaller: item.observacions || budget.observacionsGenerals || ''
    }));

    setSourceType('producte'); // Anar al formulari amb les dades emplenades
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.escandallId) {
      alert("Cal seleccionar un Producte o Projecte que estigui degudament escandallat.");
      return;
    }
    if (!formData.producteNom.trim()) {
      alert("Si us plau, especifica el nom del producte a fabricar.");
      return;
    }

    const newOF = {
      ...formData,
      materials: calculatedMaterials,
      operacions: calculatedOperacions
    };

    onCreate(newOF);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      {/* Contenidor rígid contingut estrictament dins de la pantalla amb alçada màxima de 92vh */}
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white text-slate-900 border-slate-300'
      }`}>
        
        {/* Capçalera Fixa */}
        <div className={`shrink-0 p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-serif font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Nova Ordre de Fabricació
              </h3>
              <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Referència assignada: <span className="font-bold text-amber-500">{formData.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Font d'Origen (Producte del Catàleg vs Projecte Món Mínim vs Comanda Web) */}
        <div className={`shrink-0 flex items-center border-b px-5 pt-3 pb-0 gap-3 overflow-x-auto ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-100/70'
        }`}>
          <button
            type="button"
            onClick={() => setSourceType('producte')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'producte'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Producte del Catàleg ({escandallatProducts.length} escandallats)
          </button>

          <button
            type="button"
            onClick={() => setSourceType('projecte')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'projecte'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Factory className="w-4 h-4" />
            2. Projecte / Món Mínim ({escandallatProjects.length} escandallats)
          </button>

          <button
            type="button"
            onClick={() => setSourceType('web')}
            className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              sourceType === 'web'
                ? 'border-amber-500 text-amber-500'
                : (isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900')
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3. Des de Comanda Web ({webBudgets.length})
          </button>
        </div>

        {/* Cos Central amb Scroll Vertical Contingut */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ============================================================ */}
          {/* OPCIÓ 1: SELECCIÓ DE PRODUCTE DE CATÀLEG (FAMÍLIA -> GAMMA -> PRODUCTE) */}
          {/* ============================================================ */}
          {sourceType === 'producte' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    Selecció Jeràrquica de Producte Escandallat
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {filteredEscandallatProducts.length} productes disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Selector Família */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Família
                    </label>
                    <select
                      value={selectedFamilia}
                      onChange={(e) => {
                        setSelectedFamilia(e.target.value);
                        setSelectedGamma('all');
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="all">Totes les famílies</option>
                      {availableFamilies.map(f => (
                        <option key={f.id} value={f.nom}>{f.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selector Gamma */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Gamma
                    </label>
                    <select
                      value={selectedGamma}
                      onChange={(e) => setSelectedGamma(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="all">Totes les gammes</option>
                      {availableGammes.map(g => (
                        <option key={g.id} value={g.nom}>{g.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cercador ràpid */}
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Cerca per Nom / Codi
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Boig per tu, Bombastic..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Llista de Productes disponibles per triar */}
                <div className="pt-2">
                  <label className={`text-[10px] font-mono uppercase font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tria el Producte a Fabricar:
                  </label>
                  {filteredEscandallatProducts.length === 0 ? (
                    <div className={`p-4 rounded-xl border border-dashed text-center text-xs font-mono ${
                      isDark ? 'border-slate-800 text-amber-400/80 bg-slate-900/50' : 'border-slate-300 text-amber-700 bg-amber-50'
                    }`}>
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                      No s'ha trobat cap producte escandallat amb els filtres actuals.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {filteredEscandallatProducts.map(p => {
                        const isSelected = formData.escandallId === p.escandallId && formData.tipusItem === 'producte';

                        return (
                          <button
                            key={p.escandallId}
                            type="button"
                            onClick={() => handleSelectProduct(p)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                                : (isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-400')
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-xs truncate">{p.nom}</p>
                              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {p.codi || 'CAT'} {p.familiaNom ? `• ${p.familiaNom}` : ''} {p.gammaNom ? `(${p.gammaNom})` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              ✓ Escandallat
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OPCIÓ 2: SELECCIÓ DE PROJECTE / MÓN MÍNIM ESCANDALLAT */}
          {/* ============================================================ */}
          {sourceType === 'projecte' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                  <Factory className="w-4 h-4" />
                  Projectes Món Mínim Escandallats ({escandallatProjects.length})
                </span>

                {escandallatProjects.length === 0 ? (
                  <div className={`p-6 rounded-xl border border-dashed text-center text-xs font-mono ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
                  }`}>
                    No hi ha cap projecte escandallat a la base de dades. Pots crear-ne un a la secció d'Escandalls.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {escandallatProjects.map(proj => {
                      const isSelected = formData.escandallId === proj.id && formData.tipusItem === 'projecte';

                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => handleSelectProject(proj)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                              : (isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-400')
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-xs truncate">{proj.nom || proj.producteNom}</p>
                            <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Tipus: {proj.tipus || 'Món Mínim'} • {proj.materials?.length || 0} materials
                            </p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Projecte
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OPCIÓ 3: SELECCIÓ DES DE SOL·LICITUDS / COMANDES WEB */}
          {/* ============================================================ */}
          {sourceType === 'web' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Selecciona una de les sol·licituds web pendents de fabricar per carregar-ne automàticament totes les dades i l'escandall vinculat:
              </p>

              {webBudgets.length === 0 ? (
                <div className={`p-8 text-center border rounded-2xl border-dashed font-mono text-xs ${
                  isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-300 text-slate-500 bg-slate-50'
                }`}>
                  No hi ha cap sol·licitud web pendent en aquest moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {webBudgets.map(budget => (
                    <div
                      key={budget.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`flex items-center justify-between border-b pb-2.5 mb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-500">
                            {budget.codiReferencia || budget.id}
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            • {budget.clientNom || 'Client Anònim'}
                          </span>
                          {budget.clientContacte && (
                            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ({budget.clientContacte})
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                          {Array.isArray(budget.productes) ? budget.productes.length : 1} peces
                        </span>
                      </div>

                      {/* Peces individuals dins de la sol·licitud */}
                      <div className="space-y-2">
                        {(budget.productes || []).map((prodItem, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {prodItem.nom} <span className="text-amber-500 font-mono">x{prodItem.quantitat || 1}</span>
                              </p>
                              {prodItem.opcionsTriades && (
                                <p className={`text-[11px] font-mono truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {Object.entries(prodItem.opcionsTriades).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectWebBudget(budget, prodItem)}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              Carregar a l'OF <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* FORMULARI DETALLAT DE L'ORDRE SELECCIONADA */}
          {/* ============================================================ */}
          {formData.escandallId ? (
            <form id="new-of-form" onSubmit={handleSave} className="space-y-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 border-outline/10">
                  <span className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Dades de Fabricació & Client
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Escandall vinculat: {formData.escandallId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Element a Fabricar
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.producteNom}
                      onChange={(e) => setFormData({ ...formData, producteNom: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Quantitat a Produir
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantitat}
                      onChange={(e) => setFormData({ ...formData, quantitat: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Prioritat
                    </label>
                    <select
                      value={formData.prioritat}
                      onChange={(e) => setFormData({ ...formData, prioritat: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="normal" className={isDark ? 'bg-slate-900' : 'bg-white'}>⚪ Normal</option>
                      <option value="rapid" className={isDark ? 'bg-slate-900' : 'bg-white'}>⚡ Ràpid</option>
                      <option value="urgent" className={isDark ? 'bg-slate-900' : 'bg-white'}>🟠 Urgent</option>
                      <option value="tragic" className={isDark ? 'bg-slate-900' : 'bg-white'}>🔴 Tràgic</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Client / Destinatari
                    </label>
                    <input
                      type="text"
                      placeholder="Nom o Estoc Taller"
                      value={formData.clientNom}
                      onChange={(e) => setFormData({ ...formData, clientNom: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Contacte
                    </label>
                    <input
                      type="text"
                      placeholder="Telèfon / Email"
                      value={formData.clientContacte}
                      onChange={(e) => setFormData({ ...formData, clientContacte: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Data Límit Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.dataLimitEntrega}
                      onChange={(e) => setFormData({ ...formData, dataLimitEntrega: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Personalització si s'aplica */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline/10">
                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Mida / Format
                    </label>
                    <input
                      type="text"
                      placeholder="ex: 20 x 60 mm"
                      value={formData.mida}
                      onChange={(e) => setFormData({ ...formData, mida: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Codi Model Generat
                    </label>
                    <input
                      type="text"
                      placeholder="ex: XR2060AB"
                      value={formData.codiModelGenerat}
                      onChange={(e) => setFormData({ ...formData, codiModelGenerat: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Tipografia Gravat
                    </label>
                    <select
                      value={formData.tipografia}
                      onChange={(e) => setFormData({ ...formData, tipografia: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.name} className={isDark ? 'bg-slate-900' : 'bg-white'}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Text Cara A (Frontal)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Text a gravar a la cara frontal..."
                        value={formData.textCaraA}
                        onChange={(e) => setFormData({ ...formData, textCaraA: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-[11px] font-mono uppercase font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Text Cara B (Posterior)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Text a gravar a la cara posterior..."
                        value={formData.textCaraB}
                        onChange={(e) => setFormData({ ...formData, textCaraB: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resum de Materials i Operacions que es reservaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    Materials que es reservaran ({calculatedMaterials.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {calculatedMaterials.map((m, idx) => {
                      const matInStock = materials.find(mat => mat.id === (m.materialId || m.id));
                      const estocReal = Number(
                        matInStock?.estocActual !== undefined 
                          ? matInStock.estocActual 
                          : (matInStock?.estocFisic !== undefined ? matInStock.estocFisic : (matInStock?.estoc || 0))
                      ) || 0;
                      const isShortage = estocReal < (Number(m.quantitatTotal) || 0);
                      const matId = m.materialId || matInStock?.id;
                      const pendingPurchases = matId ? (pendingPurchasesMap[matId] || 0) : 0;

                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-mono py-0.5 border-b border-white/5 last:border-b-0">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{m.nom}</span>
                            {isShortage && (
                              <span className="text-[10px] text-rose-400 font-bold" title={`Estoc actual: ${estocReal} ${m.unitat}`}>
                                (⚠️ estoc: {estocReal})
                              </span>
                            )}
                            {pendingPurchases > 0 && (
                              <span className="text-[10px] text-sky-400 font-medium" title="Comanda de compra en camí">
                                📦 +{formatDecimal(pendingPurchases, 2)}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-emerald-400 shrink-0">
                            {formatDecimal(m.quantitatTotal, 4)} {m.unitat}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    Full de ruta d'operacions ({calculatedOperacions.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {calculatedOperacions.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{o.nom}</span>
                        <span className="font-bold text-amber-400">
                          {o.tempsTeoricMinuts} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className={`p-8 text-center border rounded-2xl border-dashed font-mono text-xs ${
              isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-300 text-slate-500 bg-slate-50'
            }`}>
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-amber-500/70" />
              Tria un **Producte del Catàleg** (a dalt) o un **Projecte Món Mínim** per carregar les dades de fabricació.
            </div>
          )}

        </div>

        {/* Peu Fix amb Botons d'Acció (Sempre Visible) */}
        <div className={`shrink-0 p-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="text-xs font-mono text-slate-400">
            {formData.escandallId ? (
              <span className="text-emerald-400 font-bold">✓ Escandall carregat amb èxit ({calculatedMaterials.length} materials)</span>
            ) : (
              <span className="text-amber-500">⚠️ Cal seleccionar un element escandallat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              form="new-of-form"
              disabled={!formData.escandallId}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-md transition-all ${
                formData.escandallId 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' 
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Save className="w-4 h-4" /> Crear i Llançar OF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: MODAL DETALL D'OF & FULL DE RUTA INTERACTIU
// --------------------------------------------------------------------------
function OFDetailModal({ 
  ofData, 
  onClose, 
  onUpdateOF, 
  onChangeStatus, 
  onUpdateQuantitat, 
  onFinalitzarOF, 
  materials, 
  setMaterials,
  ordresFabricacio = [],
  setOrdresFabricacio,
  escandalls = [], 
  setEscandalls, 
  operacions = [], 
  compres = [],
  isDark, 
  onPrint 
}) {
  const [activeOF, setActiveOF] = useState(ofData);
  const initialLaserRef = useRef(JSON.stringify(normalizeLaserConfig(ofData?.parametresLaser)));
  const [showLaserSyncPrompt, setShowLaserSyncPrompt] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState(null); // 'close' | 'save'

  // Mapa de compres pendents per material (en camí en unitats base)
  const pendingPurchasesMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(compres)) return map;
    compres.forEach(c => {
      const estatNorm = (c.estat || '').toLowerCase().trim();
      if (estatNorm === 'rebut' || estatNorm.includes('cancel')) return;
      if (Array.isArray(c.linies)) {
        c.linies.forEach(l => {
          if (!l.materialId) return;
          const dem = Number(l.quantitatDemanada) || 0;
          const reb = Number(l.quantitatRebuda) || 0;
          const pend = Math.max(0, dem - reb);
          const factor = Number(l.factorConversio) > 0 ? Number(l.factorConversio) : 1;
          const pendUnitatsBase = pend * factor;
          if (pendUnitatsBase > 0) {
            map[l.materialId] = (map[l.materialId] || 0) + pendUnitatsBase;
          }
        });
      }
    });
    return map;
  }, [compres]);

  // Estat per a la modal de substitució interactiva de material
  const [substitutionModal, setSubstitutionModal] = useState(null);

  useEffect(() => {
    if (!ofData) {
      setActiveOF(null);
      return;
    }

    let populatedOF = { 
      ...ofData,
      parametresLaser: normalizeLaserConfig(ofData.parametresLaser)
    };
    const hasMaterials = Array.isArray(ofData.materials) && ofData.materials.length > 0;
    const hasOperacions = Array.isArray(ofData.operacions) && ofData.operacions.length > 0;

    // Si l'OF no té materials o operacions desplegats, recuperar-los de l'escandall associat
    if (!hasMaterials || !hasOperacions) {
      const rawNom = (ofData.producteNom || '').toLowerCase().trim();
      const pId = ofData.producteId;
      const pCodi = (ofData.producteCodi || '').toLowerCase().trim();

      const matchedEsc = (escandalls || []).find(e => 
        (ofData.escandallId && e.id === ofData.escandallId) ||
        (pId && (e.producteId === pId || e.productId === pId)) ||
        (pCodi && (String(e.producteCodi || '').toLowerCase().trim() === pCodi || String(e.codi || '').toLowerCase().trim() === pCodi)) ||
        (e.producteNom && String(e.producteNom).toLowerCase().trim() === rawNom) ||
        (e.producteNom && rawNom && (rawNom.includes(String(e.producteNom).toLowerCase().trim()) || String(e.producteNom).toLowerCase().trim().includes(rawNom))) ||
        (e.nom && rawNom && (rawNom.includes(String(e.nom).toLowerCase().trim()) || String(e.nom).toLowerCase().trim().includes(rawNom)))
      );

      if (matchedEsc) {
        const qty = ofData.quantitat || 1;
        let changed = false;

        if (!hasMaterials && Array.isArray(matchedEsc.materials) && matchedEsc.materials.length > 0) {
          populatedOF.materials = matchedEsc.materials.map(em => {
            const matObj = (materials || []).find(m => String(m.id) === String(em.materialId) || (em.nom && m.material && m.material.toLowerCase().trim() === em.nom.toLowerCase().trim()));
            const qUnit = Number(em.quantitat) || 0;
            const qTotal = qUnit * qty;
            return {
              materialId: em.materialId || matObj?.id || '',
              nom: matObj?.material || em.nom || 'Material',
              quantitatTeoricaUnitat: qUnit,
              quantitatTotal: qTotal,
              unitat: matObj?.unitat || em.unitat || 'u',
              estocReservat: qTotal,
              estocDescomptat: false
            };
          });
          changed = true;
        } else if (hasMaterials && Array.isArray(populatedOF.materials)) {
          // Assegurar que els materials existents tinguin materialId vinculat per id o nom
          populatedOF.materials = populatedOF.materials.map(m => {
            if (!m.materialId && m.nom) {
              const found = (materials || []).find(mat => mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim());
              if (found) {
                changed = true;
                return { ...m, materialId: found.id, unitat: m.unitat || found.unitat };
              }
            }
            return m;
          });
        }

        if (!hasOperacions && Array.isArray(matchedEsc.operacions) && matchedEsc.operacions.length > 0) {
          populatedOF.operacions = matchedEsc.operacions.map((eo, idx) => {
            const opObj = (operacions || []).find(o => o.id === eo.operacioId);
            const tempsU = Number(eo.tempsMinuts) || 0;
            return {
              id: `op-${idx + 1}`,
              nom: opObj?.operacio || eo.nom || `Operació ${idx + 1}`,
              tempsTeoricMinuts: tempsU * qty,
              tempsRealMinuts: 0,
              completada: false
            };
          });
          changed = true;
        }

        if (!populatedOF.escandallId) {
          populatedOF.escandallId = matchedEsc.id;
          changed = true;
        }

        if (!populatedOF.parametresLaser && matchedEsc.parametresLaser) {
          populatedOF.parametresLaser = normalizeLaserConfig(matchedEsc.parametresLaser);
          changed = true;
        }

        if (changed) {
          onUpdateOF(populatedOF);
        }
      }
    }

    setActiveOF(populatedOF);
    initialLaserRef.current = JSON.stringify(normalizeLaserConfig(populatedOF.parametresLaser));
  }, [ofData, escandalls, materials, operacions]);

  // Commutar estat d'un pas del full de ruta
  const handleToggleStep = (stepId) => {
    const updatedOps = (activeOF.operacions || []).map(op => {
      if (op.id === stepId) {
        const nextCompleted = !op.completada;
        return {
          ...op,
          completada: nextCompleted,
          dataCompletada: nextCompleted ? new Date().toISOString() : null
        };
      }
      return op;
    });

    const updatedOF = { ...activeOF, operacions: updatedOps };
    setActiveOF(updatedOF);
    onUpdateOF(updatedOF);
  };

  // Comprovar si els paràmetres làser han canviat respecte l'original
  const checkLaserChanged = () => {
    const currentLaserStr = JSON.stringify(normalizeLaserConfig(activeOF.parametresLaser));
    return currentLaserStr !== initialLaserRef.current;
  };

  const handleRequestClose = () => {
    if (checkLaserChanged()) {
      setPendingCloseAction('close');
      setShowLaserSyncPrompt(true);
    } else {
      onClose();
    }
  };

  const handleRequestSave = () => {
    if (checkLaserChanged()) {
      setPendingCloseAction('save');
      setShowLaserSyncPrompt(true);
    } else {
      onUpdateOF(activeOF);
      alert("Canvis desats correctament a l'OF.");
    }
  };

  const handleConfirmSyncToEscandall = () => {
    // 1. Actualitzar l'escandall associat
    if (setEscandalls && activeOF) {
      setEscandalls(prev => prev.map(esc => {
        const isTarget = (activeOF.escandallId && esc.id === activeOF.escandallId) ||
          (activeOF.producteId && (esc.producteId === activeOF.producteId || esc.productId === activeOF.producteId)) ||
          (activeOF.producteNom && esc.producteNom === activeOF.producteNom);
        if (isTarget) {
          return {
            ...esc,
            parametresLaser: JSON.parse(JSON.stringify(activeOF.parametresLaser))
          };
        }
        return esc;
      }));
    }

    // 2. Actualitzar l'OF
    onUpdateOF(activeOF);
    initialLaserRef.current = JSON.stringify(normalizeLaserConfig(activeOF.parametresLaser));
    setShowLaserSyncPrompt(false);

    if (pendingCloseAction === 'close') {
      onClose();
    } else {
      alert("✓ Canvis desats a l'OF i actualitzats correctament a la fitxa de l'escandall del producte.");
    }
  };

  const handleKeepOnlyInOF = () => {
    // Només actualitzar l'OF
    onUpdateOF(activeOF);
    initialLaserRef.current = JSON.stringify(normalizeLaserConfig(activeOF.parametresLaser));
    setShowLaserSyncPrompt(false);

    if (pendingCloseAction === 'close') {
      onClose();
    } else {
      alert("✓ Canvis desats exclusivament en aquesta OF (canvi temporal de tirada).");
    }
  };

  // Obrir modal de substitució de material per a una línia de l'OF
  const handleOpenSubstituteModal = (m, idx) => {
    const normStatus = normalizeOFStatus(activeOF.estat);
    if (normStatus === 'finalitzada' || normStatus === 'cancel·lada') return;

    const currentMatId = m.materialId || (materials.find(mat => mat.material && mat.material.toLowerCase().trim() === (m.nom || '').toLowerCase().trim())?.id) || '';

    // Cercar altres OFs obertes (cua o en_curs) del mateix producte / escandall
    const otherOpenOFs = (ordresFabricacio || []).filter(o => {
      if (o.id === activeOF.id) return false;
      const s = normalizeOFStatus(o.estat);
      if (s === 'finalitzada' || s === 'cancel·lada') return false;

      const matchesEscandall = activeOF.escandallId && o.escandallId === activeOF.escandallId;
      const matchesProduct = activeOF.producteId && (o.producteId === activeOF.producteId || o.productId === activeOF.producteId);
      const matchesName = activeOF.producteNom && o.producteNom && o.producteNom.toLowerCase().trim() === activeOF.producteNom.toLowerCase().trim();

      return matchesEscandall || matchesProduct || matchesName;
    });

    setSubstitutionModal({
      index: idx,
      oldMaterial: m,
      newMaterialId: currentMatId || (materials[0]?.id || ''),
      newUnitQty: m.quantitatTeoricaUnitat || (activeOF.quantitat ? (m.quantitatTotal / activeOF.quantitat) : 1),
      scope: 'only_this_of',
      otherOpenOFs,
      selectedOtherOfIds: otherOpenOFs.map(o => o.id),
      materialSearch: ''
    });
  };

  // Confirmar la substitució de material i sincronitzar estocs i escandall
  const handleConfirmSubstitution = () => {
    if (!substitutionModal) return;
    const { index, oldMaterial, newMaterialId, newUnitQty, scope, selectedOtherOfIds } = substitutionModal;

    const newMatObj = (materials || []).find(m => String(m.id) === String(newMaterialId));
    if (!newMatObj) {
      alert("Si us plau, selecciona un nou material vàlid de la llista.");
      return;
    }

    const numNewUnitQty = Number(newUnitQty) || 0;
    if (numNewUnitQty <= 0) {
      alert("La quantitat unitària del material ha de ser superior a zero.");
      return;
    }

    const ofQty = activeOF.quantitat || 1;
    const newTotalQty = numNewUnitQty * ofQty;
    const oldTotalQty = Number(oldMaterial.quantitatTotal || 0);
    const oldMatId = oldMaterial.materialId || (materials.find(m => m.material && m.material.toLowerCase().trim() === (oldMaterial.nom || '').toLowerCase().trim())?.id);

    // Acumuladors de canvi de reserva d'estoc: { [materialId]: delta }
    const deltas = {};
    if (oldMatId) {
      deltas[oldMatId] = (deltas[oldMatId] || 0) - oldTotalQty;
    }
    deltas[newMatObj.id] = (deltas[newMatObj.id] || 0) + newTotalQty;

    const newUnit = newMatObj.unitat || oldMaterial.unitat || 'u';

    // 1. Modificar l'OF actual
    const updatedMaterials = [...(activeOF.materials || [])];
    updatedMaterials[index] = {
      materialId: newMatObj.id,
      nom: newMatObj.material,
      quantitatTeoricaUnitat: numNewUnitQty,
      quantitatTotal: newTotalQty,
      unitat: newUnit,
      estocReservat: newTotalQty,
      estocDescomptat: false
    };

    const updatedActiveOF = {
      ...activeOF,
      materials: updatedMaterials
    };

    // 2. Si és canvi definitiu (Actualitzar també l'escandall)
    let affectedOFCount = 1;
    if (scope === 'update_escandall') {
      // 2a. Actualitzar escandall
      if (setEscandalls) {
        setEscandalls(prevEscs => prevEscs.map(esc => {
          const matches = (activeOF.escandallId && esc.id === activeOF.escandallId) ||
            (activeOF.producteId && (esc.producteId === activeOF.producteId || esc.productId === activeOF.producteId)) ||
            (activeOF.producteNom && esc.producteNom && esc.producteNom.toLowerCase().trim() === activeOF.producteNom.toLowerCase().trim());
          if (!matches) return esc;

          const updatedEscMats = (esc.materials || []).map(em => {
            const isTarget = (oldMatId && String(em.materialId) === String(oldMatId)) || 
              (em.nom && oldMaterial.nom && em.nom.toLowerCase().trim() === oldMaterial.nom.toLowerCase().trim());
            if (isTarget) {
              return {
                ...em,
                materialId: newMatObj.id,
                nom: newMatObj.material,
                quantitat: numNewUnitQty,
                unitat: newUnit
              };
            }
            return em;
          });

          return {
            ...esc,
            materials: updatedEscMats
          };
        }));
      }

      // 2b. Actualitzar altres OFs obertes seleccionades
      if (setOrdresFabricacio && Array.isArray(selectedOtherOfIds) && selectedOtherOfIds.length > 0) {
        setOrdresFabricacio(prevOFs => prevOFs.map(ofItem => {
          if (ofItem.id === activeOF.id) {
            return updatedActiveOF;
          }
          if (!selectedOtherOfIds.includes(ofItem.id)) {
            return ofItem;
          }

          affectedOFCount++;
          const oQty = ofItem.quantitat || 1;
          const oNewTotal = numNewUnitQty * oQty;
          let oOldTotal = 0;

          const oMats = (ofItem.materials || []).map(om => {
            const isTarget = (oldMatId && String(om.materialId) === String(oldMatId)) || 
              (om.nom && oldMaterial.nom && om.nom.toLowerCase().trim() === oldMaterial.nom.toLowerCase().trim());
            if (isTarget) {
              oOldTotal = Number(om.quantitatTotal || 0);
              return {
                ...om,
                materialId: newMatObj.id,
                nom: newMatObj.material,
                quantitatTeoricaUnitat: numNewUnitQty,
                quantitatTotal: oNewTotal,
                unitat: newUnit,
                estocReservat: oNewTotal,
                estocDescomptat: false
              };
            }
            return om;
          });

          if (oldMatId) {
            deltas[oldMatId] = (deltas[oldMatId] || 0) - oOldTotal;
          }
          deltas[newMatObj.id] = (deltas[newMatObj.id] || 0) + oNewTotal;

          return {
            ...ofItem,
            materials: oMats
          };
        }));
      }
    }

    // 3. Actualitzar estoc reservat als materials
    if (setMaterials) {
      setMaterials(prevMats => prevMats.map(mat => {
        const delta = deltas[mat.id];
        if (delta === undefined || delta === 0) return mat;
        const currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
        const estocReservat = Math.max(0, (Number(mat.estocReservat) || 0) + delta);
        return {
          ...mat,
          estocActual: currentStock,
          estocFisic: currentStock,
          estocReservat,
          estocDisponible: Math.max(0, currentStock - estocReservat),
          estoc: currentStock
        };
      }));
    }

    // 4. Actualitzar estat de l'OF activa
    setActiveOF(updatedActiveOF);
    onUpdateOF(updatedActiveOF);
    setSubstitutionModal(null);
  };

  const getDateInputValue = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.seconds ? dateStr.seconds * 1000 : dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0] || '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const fontObj = AVAILABLE_FONTS.find(f => f.name === activeOF.tipografia) || AVAILABLE_FONTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white text-slate-900 border-slate-300'
      }`}>
        
        {/* Capçalera Fixa */}
        <div className={`shrink-0 p-4 sm:p-5 border-b flex items-center justify-between flex-wrap gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-sm">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-serif font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeOF.id}
                </h3>
                {(() => {
                  const p = (activeOF.prioritat || 'normal').toLowerCase();
                  if (p === 'tragic' || p === 'tràgic') {
                    return (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-600/30 text-rose-400 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 text-rose-500" /> TRÀGIC
                      </span>
                    );
                  }
                  if (p === 'urgent' || p === 'alta') {
                    return (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500" /> URGENT
                      </span>
                    );
                  }
                  if (p === 'rapid' || p === 'ràpid') {
                    return (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-sky-400" /> RÀPID
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/40">
                      NORMAL
                    </span>
                  );
                })()}
                {activeOF.pecesDefectuoses > 0 && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {activeOF.pecesDefectuoses} defectuosa{activeOF.pecesDefectuoses > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              {(() => {
                const itemInfo = resolveOFGammaAndName(activeOF, [], [], []);
                const isEditable = isEditableOFStatus(activeOF.estat);
                return (
                  <div className="flex items-center gap-2 flex-wrap text-xs mt-0.5">
                    <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                      {itemInfo.gamma && <span className="font-mono font-bold text-amber-500 uppercase">{itemInfo.gamma}: </span>}
                      <strong className={isDark ? 'text-white' : 'text-slate-900'}>{itemInfo.nom}</strong>
                    </p>
                    <span className="text-slate-500">•</span>
                    {isEditable ? (
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                        <span className="text-[11px] font-mono text-amber-400 font-bold">Quantitat:</span>
                        <input
                          type="number"
                          min="1"
                          defaultValue={activeOF.quantitat}
                          key={`${activeOF.id}-${activeOF.quantitat}`}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val && val > 0 && val !== activeOF.quantitat) {
                              if (onUpdateQuantitat) {
                                onUpdateQuantitat(activeOF.id, val);
                              }
                              setActiveOF(prev => ({ ...prev, quantitat: val }));
                            } else {
                              e.target.value = activeOF.quantitat;
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                          }}
                          className={`w-14 py-0.5 px-1 text-center font-mono font-bold text-xs rounded border outline-none ${
                            isDark 
                              ? 'bg-slate-900 text-amber-400 border-amber-500/50 focus:border-amber-400' 
                              : 'bg-white text-amber-800 border-amber-300 focus:border-amber-500'
                          }`}
                          title="Prem Enter o clica fora per actualitzar la quantitat"
                        />
                        <span className="text-xs font-bold text-amber-500">u</span>
                      </div>
                    ) : (
                      <span className="font-bold text-amber-500 font-mono">
                        {activeOF.pecesBones !== undefined ? activeOF.pecesBones : activeOF.quantitat} u
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-xs ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <Printer className="w-4 h-4 text-amber-500" />
              Imprimir Dossier
            </button>
            <button
              type="button"
              onClick={handleRequestClose}
              className={`p-2 rounded-lg hover:text-white ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contingut Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Balanç de Control de Qualitat si hi ha hagut peces defectuoses */}
          {activeOF.pecesDefectuoses > 0 && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              isDark ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-rose-500">
                  <AlertTriangle className="w-4 h-4" /> Balanç de Control de Qualitat (Tancament de Producció)
                </span>
                <span className="font-mono text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                  {activeOF.pecesDefectuoses} defectuosa{activeOF.pecesDefectuoses > 1 ? 'es' : ''} / {activeOF.quantitat} totals
                </span>
              </div>
              <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Peces aptes incorporades: <strong className="text-emerald-500 font-mono font-bold">{activeOF.pecesBones || (activeOF.quantitat - activeOF.pecesDefectuoses)} u</strong> • Mermes rebutjades: <strong className="text-rose-500 font-mono font-bold">{activeOF.pecesDefectuoses} u</strong>
              </p>
              {activeOF.motiuDefecte && (
                <p className={`text-[11px] italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Motiu indicat: "{activeOF.motiuDefecte}"
                </p>
              )}
            </div>
          )}
          
          {/* Bloc 1: Dades de la comanda i Personalització */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dades Generals (Editables) */}
            <div className={`p-4 rounded-2xl border space-y-3 text-xs font-mono ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs uppercase">
                  <User className="w-4 h-4" /> Dades del Client & Comanda
                </p>
                <span className={`text-[10px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Editables)
                </span>
              </div>
              
              <div className="space-y-2.5">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Client
                  </label>
                  <input
                    type="text"
                    value={activeOF.clientNom || ''}
                    placeholder="Ex: Estoc fira, Estoc Taller..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveOF(prev => ({ ...prev, clientNom: val }));
                    }}
                    onBlur={(e) => {
                      onUpdateOF({ ...activeOF, clientNom: e.target.value });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-750 text-white focus:border-amber-500 focus:bg-slate-850' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Ref. Comanda / Esdeveniment
                  </label>
                  <input
                    type="text"
                    value={activeOF.comandaRef || ''}
                    placeholder="Ex: Fira de Nadal, Llançament manual..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveOF(prev => ({ ...prev, comandaRef: val }));
                    }}
                    onBlur={(e) => {
                      onUpdateOF({ ...activeOF, comandaRef: e.target.value });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-750 text-white focus:border-amber-500 focus:bg-slate-850' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Prioritat
                    </label>
                    <select
                      value={activeOF.prioritat || 'normal'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveOF(prev => ({ ...prev, prioritat: val }));
                        onUpdateOF({ ...activeOF, prioritat: val });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none cursor-pointer transition-all ${
                        isDark 
                          ? 'bg-slate-900 border-slate-750 text-white focus:border-amber-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    >
                      <option value="normal">⚪ Normal</option>
                      <option value="rapid">⚡ Ràpid</option>
                      <option value="urgent">🟠 Urgent</option>
                      <option value="tragic">🔴 Tràgic</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Data Límit d'Entrega
                    </label>
                    <input
                      type="date"
                      value={getDateInputValue(activeOF.dataLimitEntrega)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveOF(prev => ({ ...prev, dataLimitEntrega: val }));
                        onUpdateOF({ ...activeOF, dataLimitEntrega: val });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-900 border-slate-750 text-amber-400 focus:border-amber-500' 
                          : 'bg-white border-slate-300 text-amber-700 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Contacte / Telèfon
                    </label>
                    <input
                      type="text"
                      value={activeOF.clientContacte || ''}
                      placeholder="Telèfon o email..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveOF(prev => ({ ...prev, clientContacte: val }));
                      }}
                      onBlur={(e) => {
                        onUpdateOF({ ...activeOF, clientContacte: e.target.value });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-900 border-slate-750 text-white focus:border-amber-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Especificacions de Gravat */}
            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
                <Sparkles className="w-4 h-4" /> Especificacions de Gravat
              </p>
              
              {!activeOF.tipografia && !activeOF.textCaraA && !activeOF.textCaraB && (!activeOF.mida || activeOF.mida === '-') && (!activeOF.codiModelGenerat || activeOF.codiModelGenerat === '-') ? (
                <p className={`text-xs italic py-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Aquest producte no requereix especificacions de gravat personalitzat.
                </p>
              ) : (
                <>
                  <div className={`space-y-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {activeOF.mida && activeOF.mida !== '-' && (
                      <p>Mida: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.mida}</span></p>
                    )}
                    {activeOF.codiModelGenerat && activeOF.codiModelGenerat !== '-' && (
                      <p>Model / Forats: <span className="font-bold text-amber-400">{activeOF.codiModelGenerat}</span></p>
                    )}
                    {activeOF.tipografia && (
                      <p>Tipografia: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeOF.tipografia}</span> {activeOF.midaFont ? `(${activeOF.midaFont})` : ''}</p>
                    )}
                  </div>

                  {(activeOF.textCaraA || activeOF.textCaraB) && (
                    <div className={`pt-2 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      {activeOF.textCaraA && (
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-750' : 'bg-white border-slate-200'}`}>
                          <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cara A (Frontal):</span>
                          <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: fontObj?.fontFamily }}>
                            "{activeOF.textCaraA}"
                          </p>
                        </div>
                      )}
                      {activeOF.textCaraB && (
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-750' : 'bg-white border-slate-200'}`}>
                          <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cara B (Posterior):</span>
                          <p className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: fontObj?.fontFamily }}>
                            "{activeOF.textCaraB}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bloc 2: Full de Ruta (Operacions de Taller) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
                <Wrench className="w-4 h-4" /> Full de Ruta de Fabricació (Checklist Taller)
              </p>
              <span className="text-xs font-mono font-bold text-amber-400">
                {(activeOF.operacions || []).filter(o => o.completada).length} / {(activeOF.operacions || []).length} completats
              </span>
            </div>

            <div className="space-y-2">
              {(activeOF.operacions || []).length === 0 ? (
                <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sense operacions definides a l'escandall.
                </p>
              ) : (
                activeOF.operacions.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleToggleStep(op.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      op.completada
                        ? (isDark ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
                        : (isDark ? 'bg-slate-900 border-slate-800 text-white hover:border-amber-500/40' : 'bg-white border-slate-200 text-slate-900 hover:border-amber-500/40')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        op.completada 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-white')
                      }`}>
                        {op.completada && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${op.completada ? 'line-through opacity-70' : ''}`}>
                          {op.nom}
                        </p>
                        {op.tempsTeoricMinuts > 0 && (
                          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Temps teòric: {op.tempsTeoricMinuts} min
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      op.completada 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                    }`}>
                      {op.completada ? 'Fet' : 'Pendent'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Bloc 3: Materials & Explosió BOM */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2 text-xs font-mono uppercase">
                <Package className="w-4 h-4" /> Explosió de Materials (BOM)
              </p>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Control d'estoc
              </span>
            </div>

            <div className="space-y-2">
              {(activeOF.materials || []).length === 0 ? (
                <p className={`text-xs font-mono italic p-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Aquesta OF no té materials associats a l'escandall.
                </p>
              ) : (
                (activeOF.materials || []).map((m, idx) => {
                  const matInStock = (materials || []).find(mat => 
                    (m.materialId && String(mat.id) === String(m.materialId)) ||
                    (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim())
                  );
                  const estocReal = Number(
                    matInStock?.estocActual !== undefined 
                      ? matInStock.estocActual 
                      : (matInStock?.estocFisic !== undefined ? matInStock.estocFisic : (matInStock?.estoc || 0))
                  ) || 0;
                  const unitDisplay = m.unitat || matInStock?.unitat || 'u';
                  const qtyRequired = Number(m.quantitatTotal) || 0;

                  const normStatus = normalizeOFStatus(activeOF.estat);
                  const isFinalitzada = normStatus === 'finalitzada';
                  const isCancelada = normStatus === 'cancel·lada';

                  // Si l'OF ja està en curs/cua, el seu consum ja pot estar considerat a l'estoc reservat
                  const totalReservat = Number(matInStock?.estocReservat) || 0;
                  const reservatAltres = Math.max(0, totalReservat - qtyRequired);
                  const disponiblePerAquesta = Math.max(0, estocReal - reservatAltres);

                  // Hi ha falta d'estoc si l'estoc real al magatzem és inferior a les unitats que necessita aquesta OF
                  const isShortage = !isFinalitzada && !isCancelada && (estocReal < qtyRequired || disponiblePerAquesta < qtyRequired);
                  const unitatFalten = Math.max(0, qtyRequired - estocReal);
                  const matId = m.materialId || matInStock?.id;
                  const pendingPurchases = matId ? (pendingPurchasesMap[matId] || 0) : 0;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-colors ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.nom}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDecimal(m.quantitatTeoricaUnitat, 4)} {unitDisplay} / unitat
                          </p>
                          {matInStock && (
                            <span className={`text-[10.5px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              • Estoc: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{formatDecimal(estocReal, 2)} {unitDisplay}</strong>
                              {totalReservat > 0 && (
                                <span className="text-amber-400/90 ml-1.5" title={`Total reservat en ordres de fabricació: ${formatDecimal(totalReservat, 2)} ${unitDisplay}`}>
                                  (🔒 {formatDecimal(totalReservat, 2)} res.)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-amber-400">
                            Necessari : {formatDecimal(qtyRequired, 4)} {unitDisplay}
                          </p>
                          {isFinalitzada ? (
                            <p className="text-[11px] font-bold text-emerald-400">
                              ✓ Consumit al taller
                            </p>
                          ) : isCancelada ? (
                            <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Reserva alliberada
                            </p>
                          ) : isShortage ? (
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-rose-400">
                                ⚠️ Insuficient : falten {formatDecimal(unitatFalten > 0 ? unitatFalten : Math.max(0, qtyRequired - disponiblePerAquesta), 2)} {unitDisplay}
                              </p>
                              {pendingPurchases > 0 ? (
                                <p className="text-[10.5px] font-semibold text-sky-400 flex items-center justify-end gap-1" title="Hi ha comandes de compra pendents de rebre">
                                  <Package className="w-3 h-3 text-sky-400" />
                                  <span>+{formatDecimal(pendingPurchases, 2)} {unitDisplay} en camí</span>
                                </p>
                              ) : (
                                <p className={`text-[10px] font-medium ${isDark ? 'text-rose-400/70' : 'text-rose-600/70'} flex items-center justify-end gap-1`}>
                                  (Sense comanda pendent)
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-emerald-400">
                                ✓ Disponible : {formatDecimal(estocReal, 2)} {unitDisplay}
                              </p>
                              {pendingPurchases > 0 && (
                                <p className="text-[10.5px] font-semibold text-sky-400/90 flex items-center justify-end gap-1" title="Comanda de compra en camí">
                                  <Package className="w-3 h-3 text-sky-400" />
                                  <span>+{formatDecimal(pendingPurchases, 2)} {unitDisplay} en camí</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {!isFinalitzada && !isCancelada && (
                          <button
                            type="button"
                            onClick={() => handleOpenSubstituteModal(m, idx)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              isDark 
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 hover:border-amber-400' 
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-400'
                            }`}
                            title="Substituir aquest material per un altre"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                            <span>Substituir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bloc 4: Paràmetres Màquina Làser */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-mono uppercase font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                <Zap className="w-4 h-4" /> Paràmetres Màquina Làser per a aquesta Tirada (LaserGRBL)
              </label>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Pots fer ajustos temporals per a aquesta OF
              </span>
            </div>

            <LaserParametersEditor
              value={activeOF.parametresLaser || DEFAULT_LASER_CONFIG}
              onChange={(newParams) => setActiveOF(prev => ({ ...prev, parametresLaser: newParams }))}
              isDark={isDark}
              showDimensions={true}
            />
          </div>

          {/* Bloc 5: Notes de Taller */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <label className={`text-[11px] font-mono uppercase font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Notes de Taller & Observacions de Fabricació
            </label>
            <textarea
              rows={2}
              placeholder="Anotacions tècniques per a la fabricació..."
              value={activeOF.notesTaller || ''}
              onChange={(e) => setActiveOF(prev => ({ ...prev, notesTaller: e.target.value }))}
              className={`w-full px-3 py-2 rounded-xl border text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

        </div>

        {/* Peu Fix */}
        <div className={`shrink-0 p-4 border-t flex items-center justify-between flex-wrap gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Estat:
            </span>
            <div className="relative inline-block">
              <select
                value={normalizeOFStatus(activeOF.estat)}
                onChange={(e) => {
                  const newSt = e.target.value;
                  if (onChangeStatus) {
                    onChangeStatus(activeOF.id, newSt);
                  }
                  setActiveOF(prev => ({ ...prev, estat: newSt }));
                }}
                className={`text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none border cursor-pointer appearance-none pr-8 shadow-xs transition-colors ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700 text-amber-400 hover:border-amber-500' 
                    : 'bg-white border-slate-300 text-amber-800 hover:border-amber-500'
                }`}
              >
                <option value="cua" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Cua</option>
                <option value="en_curs" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Curs</option>
                <option value="acabats" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>En Acabats</option>
                <option value="finalitzada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Finalitzada</option>
                <option value="cancel·lada" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Cancel·lada</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {normalizeOFStatus(activeOF.estat) !== 'finalitzada' && normalizeOFStatus(activeOF.estat) !== 'cancel·lada' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFinalitzarOF && onFinalitzarOF();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Finalitzar ordre i fer control de qualitat"
              >
                <CheckCircle2 className="w-4 h-4" /> Finalitzar OF
              </button>
            )}
            <button
              type="button"
              onClick={handleRequestSave}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Desar Canvis
            </button>
          </div>
        </div>

      </div>

      {/* Modal de confirmació de sincronització de paràmetres làser a l'Escandall */}
      {showLaserSyncPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm font-serif">Actualitzar Paràmetres Làser a l'Escandall?</h4>
                <p className="text-xs text-amber-500 font-mono">S'han detectat canvis en els paràmetres de màquina</p>
              </div>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Has modificat els paràmetres de gravat o tall làser per a aquesta Ordre de Fabricació. Vols desar aquests paràmetres també a la fitxa de l'escandall del producte perquè s'apliquin per defecte en futures fabricacions?
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmSyncToEscandall}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> Sí, actualitzar també a l'Escandall
              </button>
              <button
                type="button"
                onClick={handleKeepOnlyInOF}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                  isDark 
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                    : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Només per a aquesta OF (canvi temporal de tirada)
              </button>
              <button
                type="button"
                onClick={() => setShowLaserSyncPrompt(false)}
                className="w-full py-1.5 text-center text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel·lar i seguir editant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBSTITUCIÓ DE MATERIAL A L'OF & SINCRONITZACIÓ AMB ESCANDALL */}
      {substitutionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-fadeIn">
          <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white text-slate-900 border-slate-300'
          }`}>
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-serif font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Substitució de Material
                  </h3>
                  <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ordre de fabricació: <strong className="text-amber-500">{activeOF.id}</strong> ({activeOF.quantitat || 1} unitats)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubstitutionModal(null)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs font-sans">
              {/* Material Actual */}
              <div className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-[11px] font-mono uppercase font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Material Actual de l'OF:
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {substitutionModal.oldMaterial.nom}
                    </p>
                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Consum previst: {formatDecimal(substitutionModal.oldMaterial.quantitatTeoricaUnitat, 4)} {substitutionModal.oldMaterial.unitat || 'u'} / unitat • Total: {formatDecimal(substitutionModal.oldMaterial.quantitatTotal, 4)} {substitutionModal.oldMaterial.unitat || 'u'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    A substituir
                  </span>
                </div>
              </div>

              {/* Nou Material Selector */}
              <div className="space-y-3">
                <label className={`text-xs font-mono uppercase font-bold block ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                  Selecciona el Nou Material Substitut:
                </label>

                {/* Filtre / Cercador de materials */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar per nom de material, codi o referència..."
                    value={substitutionModal.materialSearch || ''}
                    onChange={(e) => setSubstitutionModal(prev => ({ ...prev, materialSearch: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Selector */}
                <select
                  value={substitutionModal.newMaterialId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setSubstitutionModal(prev => ({
                      ...prev,
                      newMaterialId: chosenId
                    }));
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                  size={5}
                >
                  {(materials || [])
                    .filter(m => {
                      if (!substitutionModal.materialSearch) return true;
                      const q = substitutionModal.materialSearch.toLowerCase();
                      return (m.material && m.material.toLowerCase().includes(q)) ||
                        (m.id && String(m.id).toLowerCase().includes(q)) ||
                        (m.categoria && m.categoria.toLowerCase().includes(q));
                    })
                    .sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca', { sensitivity: 'base' }))
                    .map(m => {
                      const estocReal = Number(m.estocActual !== undefined ? m.estocActual : (m.estocFisic !== undefined ? m.estocFisic : (m.estoc || 0))) || 0;
                      const estocDisp = Math.max(0, estocReal - (Number(m.estocReservat) || 0));
                      return (
                        <option key={m.id} value={m.id} className="p-1.5">
                          {m.material} ({m.unitat || 'u'}) — Disp: {formatDecimal(estocDisp, 2)} / Real: {formatDecimal(estocReal, 2)}
                        </option>
                      );
                    })}
                </select>

                {/* Quantitat Unitària per al nou material */}
                {(() => {
                  const selMat = materials.find(m => String(m.id) === String(substitutionModal.newMaterialId));
                  const unitDisplay = selMat?.unitat || substitutionModal.oldMaterial.unitat || 'u';
                  const ofQty = activeOF.quantitat || 1;
                  const totalNou = (Number(substitutionModal.newUnitQty) || 0) * ofQty;
                  const estocReal = Number(selMat?.estocActual !== undefined ? selMat.estocActual : (selMat?.estocFisic !== undefined ? selMat.estocFisic : (selMat?.estoc || 0))) || 0;
                  const totalReservat = Number(selMat?.estocReservat) || 0;
                  const disponible = Math.max(0, estocReal - totalReservat);

                  return (
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                      isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Quantitat per unitat:
                        </label>
                        <div className="w-28">
                          <DecimalInput
                            value={substitutionModal.newUnitQty}
                            onChange={(val) => setSubstitutionModal(prev => ({ ...prev, newUnitQty: val }))}
                            maxDecimals={4}
                            placeholder="0.00"
                            className={`w-full py-1 px-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${
                              isDark ? 'bg-slate-900 border-slate-750 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-500">{unitDisplay} / u</span>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Total necessari: <span className="text-amber-500">{formatDecimal(totalNou, 4)} {unitDisplay}</span>
                        </p>
                        <p className={`text-[11px] ${disponible >= totalNou ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}`}>
                          {disponible >= totalNou ? `✓ Disponible: ${formatDecimal(disponible, 2)} ${unitDisplay}` : `⚠️ Falten ${formatDecimal(totalNou - disponible, 2)} ${unitDisplay}`}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Àmbit d'Aplicació (Puntual vs Definitiu) */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className={`text-xs font-mono uppercase font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Com vols aplicar aquesta substitució?
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opció A: Puntual */}
                  <div
                    onClick={() => setSubstitutionModal(prev => ({ ...prev, scope: 'only_this_of' }))}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      substitutionModal.scope === 'only_this_of'
                        ? (isDark ? 'bg-amber-950/20 border-amber-500 text-white shadow-sm' : 'bg-amber-50/70 border-amber-500 text-slate-900 shadow-sm')
                        : (isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        substitutionModal.scope === 'only_this_of' ? 'border-amber-500 bg-amber-500' : 'border-slate-400'
                      }`}>
                        {substitutionModal.scope === 'only_this_of' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs">Canvi puntual (Només aquesta OF)</span>
                    </div>
                    <p className={`text-[11px] pl-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      L'escandall original es manté intacte per a properes tirades. Només s'ajusta l'estoc reservat d'aquesta OF.
                    </p>
                  </div>

                  {/* Opció B: Definitiu */}
                  <div
                    onClick={() => setSubstitutionModal(prev => ({ ...prev, scope: 'update_escandall' }))}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      substitutionModal.scope === 'update_escandall'
                        ? (isDark ? 'bg-amber-950/20 border-amber-500 text-white shadow-sm' : 'bg-amber-50/70 border-amber-500 text-slate-900 shadow-sm')
                        : (isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        substitutionModal.scope === 'update_escandall' ? 'border-amber-500 bg-amber-500' : 'border-slate-400'
                      }`}>
                        {substitutionModal.scope === 'update_escandall' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs">Canvi definitiu (Actualitzar Escandall)</span>
                    </div>
                    <p className={`text-[11px] pl-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      S'actualitzarà la fitxa de l'escandall del producte amb el nou material per a totes les properes fabricacions.
                    </p>
                  </div>
                </div>

                {/* Sub-llista d'altres OFs obertes (Si s'ha triat opció B i hi ha altres OFs en curs) */}
                {substitutionModal.scope === 'update_escandall' && (
                  <div className={`p-4 rounded-2xl border space-y-3 animate-fadeIn ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Altres Ordres de Fabricació en curs d'aquest producte:
                        </p>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {substitutionModal.otherOpenOFs.length === 0 
                            ? "No hi ha cap altra OF oberta d'aquest producte." 
                            : "Tria quines altres OFs han d'adoptar també el nou material (per si tens falta parcial de material):"}
                        </p>
                      </div>

                      {substitutionModal.otherOpenOFs.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => setSubstitutionModal(prev => ({
                              ...prev,
                              selectedOtherOfIds: prev.otherOpenOFs.map(o => o.id)
                            }))}
                            className="text-amber-500 hover:underline cursor-pointer font-bold"
                          >
                            Marcar totes
                          </button>
                          <span className="text-slate-400">•</span>
                          <button
                            type="button"
                            onClick={() => setSubstitutionModal(prev => ({
                              ...prev,
                              selectedOtherOfIds: []
                            }))}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Desmarcar
                          </button>
                        </div>
                      )}
                    </div>

                    {substitutionModal.otherOpenOFs.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {substitutionModal.otherOpenOFs.map(otherOF => {
                          const isChecked = substitutionModal.selectedOtherOfIds.includes(otherOF.id);
                          return (
                            <div
                              key={otherOF.id}
                              onClick={() => {
                                setSubstitutionModal(prev => {
                                  const current = prev.selectedOtherOfIds || [];
                                  const next = current.includes(otherOF.id)
                                    ? current.filter(id => id !== otherOF.id)
                                    : [...current, otherOF.id];
                                  return { ...prev, selectedOtherOfIds: next };
                                });
                              }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                                isChecked
                                  ? (isDark ? 'bg-amber-950/30 border-amber-500/50 text-white' : 'bg-amber-50 border-amber-400 text-slate-900')
                                  : (isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600')
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-400'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="font-bold text-amber-500">{otherOF.id}</span>
                                <span>•</span>
                                <span>{otherOF.quantitat || 1} u</span>
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                otherOF.estat === 'en_curs' 
                                  ? 'bg-sky-500/20 text-sky-400' 
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {otherOF.estat === 'en_curs' ? 'En Curs' : 'A la Cua'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-end gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setSubstitutionModal(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubstitution}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Substitució</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: DOSSIER IMPRIMIBLE DE TALLER (PRINT-READY)
// --------------------------------------------------------------------------
function PrintWorkshopDossier({ ofData, onClose, escandalls = [], operacions = [] }) {
  const fontObj = AVAILABLE_FONTS.find(f => f.name === ofData.tipografia) || AVAILABLE_FONTS[0];
  const [showManualModal, setShowManualModal] = useState(false);

  const rawLower = (ofData.nom || ofData.producteNom || '').toLowerCase().trim();
  const matchedEsc = (escandalls || []).find(e => 
    (ofData.escandallId && (e.id === ofData.escandallId || String(e.id) === String(ofData.escandallId))) ||
    (e.producteCodi && ofData.codiModelGenerat && e.producteCodi.toLowerCase().trim() === ofData.codiModelGenerat.toLowerCase().trim()) ||
    (e.producteNom && e.producteNom.toLowerCase().trim() === rawLower)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white text-black rounded-3xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none print:max-h-none">
        
        {/* Botons no imprimibles */}
        <div className="shrink-0 p-4 flex items-center justify-between border-b border-slate-200 print:hidden">
          <span className="font-mono text-xs font-bold text-slate-600">Vista Prèvia del Full de Taller</span>
          <div className="flex items-center gap-2">
            {matchedEsc && (
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                title="Veure i imprimir Manual de Fabricació"
              >
                <BookOpen className="w-4 h-4" /> Manual de Muntatge
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" /> Imprimir Full
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-black rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FULL DE TREBALL TALLER */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 font-sans print:overflow-visible print:p-6">
          {/* Capçalera del Full de Taller */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Mínim Món • Full de Treball Taller</p>
              <h1 className="text-3xl font-black font-mono tracking-tight">{ofData.id}</h1>
              {(() => {
                const itemInfo = resolveOFGammaAndName(ofData, [], [], []);
                return (
                  <p className="text-sm font-bold text-slate-800">
                    {itemInfo.gamma ? `${itemInfo.gamma}: ` : ''}{itemInfo.nom}
                  </p>
                );
              })()}
            </div>
            <div className="text-right font-mono text-xs space-y-0.5">
              <p className="text-lg font-black bg-black text-white px-3 py-1 rounded">
                {ofData.quantitat} UNITATS
              </p>
              <p className="pt-1">Data: {ofData.dataCreacio || '-'}</p>
              {ofData.dataLimitEntrega && <p className="font-bold text-red-600">Límit: {ofData.dataLimitEntrega}</p>}
            </div>
          </div>

          {/* Dades del Client & Referències */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded-xl text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Client / Destí:</span>
              <span className="font-bold text-sm">{ofData.clientNom || 'Estoc Taller'}</span>
              {ofData.clientContacte && <p className="text-[11px] text-slate-600">{ofData.clientContacte}</p>}
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Ref. Comanda / Model:</span>
              <span className="font-bold text-sm text-amber-800">{ofData.codiModelGenerat || ofData.comandaRef || '-'}</span>
              {ofData.mida && <p className="text-[11px] text-slate-600">Mida: {ofData.mida}</p>}
            </div>
          </div>

          {/* Gravat i Tipografia */}
          {(ofData.textCaraA || ofData.textCaraB) && (
            <div className="border-2 border-dashed border-slate-400 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold uppercase text-slate-600">Textos de Gravat Làser</span>
                <span className="font-bold">Font: {ofData.tipografia || 'Playfair Display'} ({ofData.midaFont || 'Mitjana'})</span>
              </div>

              {ofData.textCaraA && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Cara A (Frontal):</span>
                  <p className="text-base font-bold text-black" style={{ fontFamily: fontObj?.fontFamily }}>
                    "{ofData.textCaraA}"
                  </p>
                </div>
              )}

              {ofData.textCaraB && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Cara B (Posterior):</span>
                  <p className="text-base font-bold text-black" style={{ fontFamily: fontObj?.fontFamily }}>
                    "{ofData.textCaraB}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paràmetres Màquina & Materials */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="border border-slate-300 p-3 rounded-xl space-y-1.5">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Paràmetres Làser (LaserGRBL):</span>
              {(() => {
                const lp = normalizeLaserConfig(ofData.parametresLaser);
                return (
                  <div className="space-y-1 text-[11px]">
                    <p><strong>GRAVAR:</strong> {lp.gravar.engravingSpeed} mm/min • {lp.gravar.sMaxPercent}% (PWM {lp.gravar.sMaxPwm})</p>
                    <p className="text-[10px] text-slate-600">Bri: {lp.gravar.brillo} | Con: {lp.gravar.contraste} | Bla: {lp.gravar.blancos}{lp.gravar.bnHabilitat ? ` | B&N: ${lp.gravar.bn}` : ''}</p>
                    {lp.gravar.midaW && <p className="text-[10px] text-slate-600">Mida: {formatDecimal(lp.gravar.midaW, null)} mm (H: Proporcional)</p>}
                    {(lp.gravar.iniciX !== 0 || lp.gravar.iniciY !== 0) && <p className="text-[10px] text-slate-600">Posició inicial: X: {formatDecimal(lp.gravar.iniciX, null)} mm | Y: {formatDecimal(lp.gravar.iniciY, null)} mm</p>}
                    {lp.gravar.ruta && <p className="text-[10px] text-slate-700 font-mono">📁 Ruta: {lp.gravar.ruta}</p>}
                    {lp.gravar.fitxer && <p className="text-[10px] text-amber-900 font-bold">Fitxer Gravat: {lp.gravar.fitxer}</p>}
                    {lp.gravar.notes && <p className="text-[10px] text-slate-600 italic">Notes Gravat: {lp.gravar.notes}</p>}
                    <p className="pt-1 border-t border-slate-200"><strong>TALLAR:</strong> {lp.tallar.velocidadBorde} mm/min • {lp.tallar.sMaxPercent}% (PWM {lp.tallar.sMaxPwm}) • {lp.tallar.passades || 1} passades</p>
                    {lp.tallar.ruta && <p className="text-[10px] text-slate-700 font-mono">📁 Ruta: {lp.tallar.ruta}</p>}
                    {lp.tallar.fitxer && <p className="text-[10px] text-amber-900 font-bold">Fitxer Tall: {lp.tallar.fitxer}</p>}
                    {lp.tallar.notes && <p className="text-[10px] text-slate-600 italic">Notes Tall: {lp.tallar.notes}</p>}
                  </div>
                );
              })()}
            </div>

            <div className="border border-slate-300 p-3 rounded-xl space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Materials Requerits:</span>
              {(ofData.materials || []).map((m, i) => (
                <p key={i} className="text-[11px]">
                  • {m.nom}: <span className="font-bold">{formatDecimal(m.quantitatTotal, 4)} {m.unitat}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Checklist de Control de Qualitat i Taller */}
          <div className="border border-slate-300 p-4 rounded-xl space-y-2 text-xs font-mono">
            <span className="font-bold text-[10px] uppercase text-slate-500 block">Control de Taller & Operacions:</span>
            <div className="grid grid-cols-2 gap-2">
              {(ofData.operacions || [
                { nom: 'Tall i gravat làser' },
                { nom: 'Poliment i desbarbat' },
                { nom: 'Acabat i vernís' },
                { nom: 'Control de qualitat i anellat' }
              ]).map((op, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-slate-200 py-1">
                  <div className="w-4 h-4 border-2 border-black rounded-sm"></div>
                  <span className="text-[11px] truncate">{op.nom}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fases de Muntatge & Indicacions Clau (si l'escandall o l'OF té adjunts de muntatge) */}
          {(() => {
            const phases = (matchedEsc?.operacions || ofData.operacions || [])
              .flatMap((op, opIdx) => (op.adjuntsMuntatge || []).map((adj, adjIdx) => ({
                opNom: op.nom || `Operació ${opIdx + 1}`,
                pas: `${opIdx + 1}.${adjIdx + 1}`,
                ...adj
              })));

            if (phases.length === 0) return null;

            return (
              <div className="border border-slate-300 p-4 rounded-xl space-y-3 text-xs font-mono print:break-inside-avoid">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="font-bold text-[10px] uppercase text-emerald-800">
                    Guia de Muntatge & Fases de Taller ({phases.length}):
                  </span>
                  <span className="text-[10px] text-slate-500">Mínim Món</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {phases.map((ph, pi) => (
                    <div key={pi} className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 flex items-start gap-2.5">
                      {ph.tipus === 'imatge' && ph.url ? (
                        <img src={ph.url} alt={ph.nom} className="w-16 h-16 object-cover rounded border border-slate-300 shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded flex flex-col items-center justify-center shrink-0 text-rose-700">
                          <FileText className="w-6 h-6 mb-0.5" />
                          <span className="text-[8px] font-bold">PDF</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[11px] text-slate-900 truncate">
                          {ph.pas} - {ph.nom}
                        </p>
                        <p className="text-[10px] text-slate-600 font-sans italic line-clamp-3 mt-0.5">
                          {ph.indicacions || 'Sense indicacions addicionals.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Notes de Taller */}
          {ofData.notesTaller && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <span className="font-mono text-[9px] uppercase font-bold text-amber-800 block">Notes de taller:</span>
              <p className="italic text-slate-800">{ofData.notesTaller}</p>
            </div>
          )}

          {/* Peu de signatura */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-300 text-[10px] font-mono text-slate-500">
            <span>Operari Responsable: ____________________</span>
            <span>Data de Finalització: ____/____/2026</span>
          </div>
        </div>

        {/* Modal del manual de fabricació des del dossier */}
        {showManualModal && matchedEsc && (
          <ManufacturingManualModal
            escandall={matchedEsc}
            operacionsCatalog={operacions}
            onClose={() => setShowManualModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: MODAL FINALITZACIÓ D'OF & CONTROL DE QUALITAT (MERMES I DEFECTES)
// --------------------------------------------------------------------------
function CloseOFModal({
  modalData,
  onClose,
  onConfirm,
  isDark,
  esdeveniments = []
}) {
  const { of, product, totalQty } = modalData;
  const [pecesDefectuoses, setPecesDefectuoses] = useState(0);
  const [pecesBones, setPecesBones] = useState(totalQty);
  const [motiuDefecte, setMotiuDefecte] = useState('');

  const eventLinked = useMemo(() => {
    if (!Array.isArray(esdeveniments)) return null;
    return esdeveniments.find(ev => 
      (ev.linies || []).some(l => l.ofId === of.id) || 
      (of.origen && ev.nom && of.origen.toLowerCase().includes(ev.nom.toLowerCase())) ||
      (of.comandaRef && ev.nom && of.comandaRef.toLowerCase().includes(ev.nom.toLowerCase()))
    ) || null;
  }, [esdeveniments, of]);

  const handleUpdateBones = (val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setPecesBones(num);
    setPecesDefectuoses(Math.max(0, totalQty - num));
  };

  const handleUpdateDefectuoses = (val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setPecesDefectuoses(num);
    setPecesBones(Math.max(0, totalQty - num));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`max-w-lg w-full rounded-3xl border p-6 shadow-2xl space-y-5 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Capçalera */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base">Finalitzar Ordre de Fabricació</h3>
              <p className="text-xs text-slate-400 font-mono">
                OF: <span className="font-bold text-amber-500">{of.id}</span> • {product?.nom || of.producteNom || of.nom || 'Peça'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resum de Producció & Control de Mermes/Defectes */}
        <div className={`p-4 rounded-2xl border space-y-3.5 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Total planificat a l'ordre:</span>
            <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
              {totalQty} unitats
            </span>
          </div>

          {/* Controls per a Peces Correctes vs Defectuoses */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Peces Correctes */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-white border-emerald-300 shadow-xs'
            }`}>
              <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Peces Bones (Aptes)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pecesBones <= 0}
                  onClick={() => handleUpdateBones(pecesBones - 1)}
                  className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-30 font-bold flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={pecesBones}
                  onChange={(e) => handleUpdateBones(e.target.value)}
                  className={`w-full py-1 text-center font-mono font-extrabold text-base rounded-lg border outline-none ${
                    isDark ? 'bg-slate-950 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50/50 border-emerald-300 text-emerald-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleUpdateBones(pecesBones + 1)}
                  className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Peces Defectuoses / Mermes */}
            <div className={`p-3 rounded-xl border ${
              pecesDefectuoses > 0 
                ? (isDark ? 'bg-rose-950/20 border-rose-500/50' : 'bg-rose-50/70 border-rose-300') 
                : (isDark ? 'bg-slate-900/90 border-slate-700/50' : 'bg-white border-slate-200')
            }`}>
              <span className={`text-[11px] font-bold flex items-center gap-1.5 mb-1.5 ${
                pecesDefectuoses > 0 ? 'text-rose-500' : 'text-slate-400'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" /> Defectuoses (Mermes)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pecesDefectuoses <= 0}
                  onClick={() => handleUpdateDefectuoses(pecesDefectuoses - 1)}
                  className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-30 font-bold flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={pecesDefectuoses}
                  onChange={(e) => handleUpdateDefectuoses(e.target.value)}
                  className={`w-full py-1 text-center font-mono font-extrabold text-base rounded-lg border outline-none ${
                    pecesDefectuoses > 0
                      ? (isDark ? 'bg-slate-950 border-rose-500/50 text-rose-400' : 'bg-rose-50 border-rose-300 text-rose-800')
                      : (isDark ? 'bg-slate-950 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleUpdateDefectuoses(pecesDefectuoses + 1)}
                  className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Alerta i camp de motiu si hi ha defectes */}
          {pecesDefectuoses > 0 && (
            <div className={`p-3 rounded-xl border text-xs space-y-2 animate-fadeIn ${
              isDark ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>
                  S'han registrat <strong>{pecesDefectuoses} peces no aptes</strong>. Els materials s'han consumit al taller com a merma de producció. Només les <strong>{pecesBones} peces correctes</strong> s'incorporaran a l'estoc.
                </span>
              </p>
              <div>
                <label className="text-[10px] font-mono uppercase font-bold block mb-1">
                  Motiu del defecte o tara (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Estellada al tall làser, error de gravat, tara a la fusta..."
                  value={motiuDefecte}
                  onChange={(e) => setMotiuDefecte(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-rose-500/40 text-white placeholder:text-slate-500' : 'bg-white border-rose-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Destinació d'Estoc */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400">
            {product 
              ? `Tria el destí de les ${pecesBones} peces acabades per a "${product.nom}":`
              : `Finalització de l'ordre (${pecesBones} aptes, ${pecesDefectuoses} defectuoses):`
            }
          </p>

          {product ? (
            <>
              {eventLinked && (
                <button
                  type="button"
                  disabled={pecesBones <= 0}
                  onClick={() => onConfirm({
                    ofId: of.id,
                    product,
                    pecesBones,
                    pecesDefectuoses,
                    motiuDefecte,
                    destinacio: 'fira'
                  })}
                  className={`w-full p-3 rounded-xl border font-semibold text-xs flex items-center justify-between cursor-pointer transition-all ${
                    isDark
                      ? 'border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                      : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-xs'
                  } disabled:opacity-40`}
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-500" />
                    <span>Incorporar directament a la <strong>Parada de la Fira ({eventLinked.nom})</strong></span>
                  </span>
                  <span className="font-mono font-bold">+{pecesBones} u.</span>
                </button>
              )}

              <button
                type="button"
                disabled={pecesBones <= 0}
                onClick={() => onConfirm({
                  ofId: of.id,
                  product,
                  pecesBones,
                  pecesDefectuoses,
                  motiuDefecte,
                  destinacio: 'venda'
                })}
                className="w-full p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 font-semibold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Sumar a <strong>Estoc per a Venda</strong></span>
                </span>
                <span className="font-mono font-bold">+{pecesBones} u.</span>
              </button>

              <button
                type="button"
                disabled={pecesBones <= 0}
                onClick={() => onConfirm({
                  ofId: of.id,
                  product,
                  pecesBones,
                  pecesDefectuoses,
                  motiuDefecte,
                  destinacio: 'mostres'
                })}
                className="w-full p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 text-amber-400 font-semibold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sumar a <strong>Mostres de Taller</strong></span>
                </span>
                <span className="font-mono font-bold">+{pecesBones} u.</span>
              </button>

              <button
                type="button"
                onClick={() => onConfirm({
                  ofId: of.id,
                  product,
                  pecesBones,
                  pecesDefectuoses,
                  motiuDefecte,
                  destinacio: 'cap'
                })}
                className="w-full p-2.5 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 text-slate-300 hover:text-white text-xs font-medium cursor-pointer text-center transition-all"
              >
                No alterar estoc (lliurament directe a client / encàrrec previ)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm({
                ofId: of.id,
                product: null,
                pecesBones,
                pecesDefectuoses,
                motiuDefecte,
                destinacio: 'cap'
              })}
              className="w-full p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar i Finalitzar Ordre</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full p-2 text-slate-500 hover:text-slate-300 text-xs font-medium cursor-pointer text-center"
          >
            Cancel·lar (mantenir l'ordre oberta)
          </button>
        </div>
      </div>
    </div>
  );
}
