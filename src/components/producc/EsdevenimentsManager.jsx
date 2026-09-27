import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Store, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Boxes, 
  TrendingUp, 
  History, 
  User, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Check, 
  X, 
  ChevronRight, 
  Search, 
  Sparkles, 
  Clock, 
  Package, 
  RotateCcw, 
  Percent, 
  MapPin, 
  Eye, 
  Award, 
  Flame, 
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Hammer,
  PlusCircle
} from 'lucide-react';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';
import { formatCurrency, formatDecimal, parseDecimal } from '../../utils/numberUtils';
import { getNextOFId } from './OrdresFabricacioManager';
import { normalizeLaserConfig, DEFAULT_LASER_CONFIG } from '../../utils/laserUtils';

export default function EsdevenimentsManager({
  esdeveniments = [],
  setEsdeveniments,
  productes = [],
  setProductes,
  ordresFabricacio = [],
  setOrdresFabricacio,
  escandalls = [],
  materials = [],
  setMaterials,
  operacions = [],
  setActiveProduccSubtab,
  isDark = true
}) {
  // Navigation & Selection State
  const [selectedEsdevenimentId, setSelectedEsdevenimentId] = useState(null);
  const [activeTab, setActiveTab] = useState('dotacio'); // 'dotacio' | 'tpv' | 'liquidacio' | 'historic'
  const [filtreEstat, setFiltreEstat] = useState('tots'); // 'tots' | 'actius' | 'tancats'
  const [cercaEsdeveniment, setCercaEsdeveniment] = useState('');

  // Modals state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState(null);
  const [quantitatTotalFira, setQuantitatTotalFira] = useState(5);
  const [quantitatAgafadaEstoc, setQuantitatAgafadaEstoc] = useState(0);
  const [crearOFPerPendent, setCrearOFPerPendent] = useState(true);
  const [prioritatOFInput, setPrioritatOFInput] = useState('normal');
  const [preuFiraInput, setPreuFiraInput] = useState('');

  // Editar condicions d'una línia assignada a la fira
  const [editingLinia, setEditingLinia] = useState(null);
  const [editLiniaForm, setEditLiniaForm] = useState({
    unitatsPrevistes: 0,
    unitatsInicials: 0,
    preuFira: '',
    crearOF: false,
    prioritatOF: 'normal'
  });

  // TPV Modal State
  const [tpvProducteSeleccionat, setTpvProducteSeleccionat] = useState(null);
  const [tpvQuantitat, setTpvQuantitat] = useState(1);
  const [tpvMetode, setTpvMetode] = useState('efectiu'); // 'efectiu' | 'bizum' | 'targeta'
  const [tpvSuccessMsg, setTpvSuccessMsg] = useState(null);

  // Close Event confirmation modal
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);

  // Formulari Esdeveniment (Crear / Editar)
  const [formData, setFormData] = useState({
    nom: '',
    edicioAny: new Date().getFullYear(),
    identificadorAgrupador: '',
    lloc: '',
    dataInici: new Date().toISOString().split('T')[0],
    dataFi: new Date().toISOString().split('T')[0],
    despesaParada: 0,
    fonsCaixaInicial: 100,
    colaboradorNom: '',
    colaboradorPercentatge: 15,
    notes: ''
  });

  // Resoldre la imatge d'un producte o línia d'esdeveniment de manera universal i resilient
  const getProductImage = useCallback((prodOrLinia) => {
    if (!prodOrLinia) return '';

    // Si té una foto directa ja guardada
    if (prodOrLinia.foto && typeof prodOrLinia.foto === 'string' && prodOrLinia.foto.trim() !== '') {
      const resolved = resolveProducteMediaUrl(prodOrLinia.foto) || resolveMediaUrl(prodOrLinia.foto);
      if (resolved) return resolved;
    }

    // Buscar el producte complet al catàleg de productes
    const targetId = prodOrLinia.productId || prodOrLinia.id;
    const targetCodi = prodOrLinia.codi;
    let prod = null;
    if (Array.isArray(productes) && productes.length > 0) {
      if (targetId) {
        prod = productes.find(p => p.id === targetId || p.codi === targetId);
      }
      if (!prod && targetCodi) {
        prod = productes.find(p => p.codi === targetCodi || p.id === targetCodi);
      }
      if (!prod && prodOrLinia.nom) {
        const cleanName = String(prodOrLinia.nom).trim().toLowerCase();
        prod = productes.find(p => p.nom && String(p.nom).trim().toLowerCase() === cleanName);
      }
    }

    const target = prod || prodOrLinia;

    const raw = target.imatgePrincipal || 
                (Array.isArray(target.imatges) && target.imatges.find(img => img && typeof img === 'string' && img.trim() !== '')) || 
                (Array.isArray(target.fotos) && target.fotos.find(f => f && typeof f === 'string' && f.trim() !== '')) ||
                target.foto || 
                target.imatge || 
                target.image || 
                '';

    if (!raw || typeof raw !== 'string' || !raw.trim()) return '';
    return resolveProducteMediaUrl(raw) || resolveMediaUrl(raw) || raw;
  }, [productes]);

  // Current active event
  const currentEvent = useMemo(() => {
    return esdeveniments.find(e => e.id === selectedEsdevenimentId) || null;
  }, [esdeveniments, selectedEsdevenimentId]);

  // Reset form when opening create modal
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      nom: '',
      edicioAny: new Date().getFullYear(),
      identificadorAgrupador: '',
      lloc: '',
      dataInici: new Date().toISOString().split('T')[0],
      dataFi: new Date().toISOString().split('T')[0],
      despesaParada: 0,
      fonsCaixaInicial: 100,
      colaboradorNom: '',
      colaboradorPercentatge: 15,
      notes: ''
    });
    setShowEventModal(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setFormData({
      nom: event.nom || '',
      edicioAny: event.edicioAny || new Date().getFullYear(),
      identificadorAgrupador: event.identificadorAgrupador || event.nom || '',
      lloc: event.lloc || '',
      dataInici: event.dataInici || '',
      dataFi: event.dataFi || '',
      despesaParada: event.despesaParada || 0,
      fonsCaixaInicial: event.fonsCaixaInicial || 0,
      colaboradorNom: event.colaborador?.nom || '',
      colaboradorPercentatge: event.colaborador?.percentatgeComissio || 15,
      notes: event.notes || ''
    });
    setShowEventModal(true);
  };

  // Guardar esdeveniment (Crear o Editar)
  const handleSaveEvent = () => {
    if (!formData.nom.trim()) {
      alert("Cal indicar un nom per a l'esdeveniment.");
      return;
    }

    const cleanAgrupador = (formData.identificadorAgrupador || formData.nom).trim().toLowerCase().replace(/\s+/g, '_');

    if (editingEvent) {
      setEsdeveniments(prev => prev.map(ev => {
        if (ev.id === editingEvent.id) {
          return {
            ...ev,
            nom: formData.nom.trim(),
            edicioAny: Number(formData.edicioAny) || new Date().getFullYear(),
            identificadorAgrupador: cleanAgrupador,
            lloc: formData.lloc.trim(),
            dataInici: formData.dataInici,
            dataFi: formData.dataFi,
            despesaParada: Number(formData.despesaParada) || 0,
            fonsCaixaInicial: Number(formData.fonsCaixaInicial) || 0,
            colaborador: {
              ...(ev.colaborador || {}),
              nom: formData.colaboradorNom.trim(),
              percentatgeComissio: Number(formData.colaboradorPercentatge) || 0
            },
            notes: formData.notes.trim()
          };
        }
        return ev;
      }));
    } else {
      const newId = `esd-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newEvent = {
        id: newId,
        nom: formData.nom.trim(),
        edicioAny: Number(formData.edicioAny) || new Date().getFullYear(),
        identificadorAgrupador: cleanAgrupador,
        lloc: formData.lloc.trim(),
        dataInici: formData.dataInici,
        dataFi: formData.dataFi,
        estat: 'preparacio', // 'preparacio' | 'en_curs' | 'tancat'
        despesaParada: Number(formData.despesaParada) || 0,
        fonsCaixaInicial: Number(formData.fonsCaixaInicial) || 0,
        colaborador: {
          nom: formData.colaboradorNom.trim(),
          percentatgeComissio: Number(formData.colaboradorPercentatge) || 0,
          liquidat: false
        },
        linies: [],
        vendes: [],
        notes: formData.notes.trim(),
        createdAt: new Date().toISOString()
      };
      setEsdeveniments(prev => [newEvent, ...prev]);
      setSelectedEsdevenimentId(newId);
    }

    setShowEventModal(false);
  };

  // Canviar estat ràpidament de l'esdeveniment
  const handleSetEventStatus = (newStatus) => {
    if (!currentEvent) return;
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return { ...ev, estat: newStatus };
      }
      return ev;
    }));
  };

  // --- ASSIGNACIÓ DE PRODUCTE A LA FIRA: NOVA FILOSOFIA ---
  // 1. Quantitat total que es vol portar a la fira (independent de l'estoc)
  // 2. Dues decisions complementàries:
  //    - quantitat que s'agafa de l'estoc (descomptada de l'estoc del taller)
  //    - resta pendent per fabricar (amb opció de generar OF a la cua)
  const handleAssignarAFira = () => {
    if (!currentEvent || !selectedProductToAdd) return;

    const totalFira = Math.max(1, parseInt(quantitatTotalFira, 10) || 1);
    const estocTaller = parseInt(selectedProductToAdd.estocActual, 10) || 0;
    const estocDisponible = Math.max(0, estocTaller);
    const agafadaEstoc = Math.max(0, Math.min(parseInt(quantitatAgafadaEstoc, 10) || 0, totalFira, estocDisponible));
    const pendentFabricar = Math.max(0, totalFira - agafadaEstoc);

    const preuFiraNum = parseDecimal(preuFiraInput, Number(selectedProductToAdd.preu) || 0);

    // 1. Si s'agafen peces de l'estoc del taller, descomptar-les
    if (agafadaEstoc > 0) {
      setProductes(prev => prev.map(p => {
        if (p.id === selectedProductToAdd.id) {
          const nouEstoc = Math.max(0, (parseInt(p.estocActual, 10) || 0) - agafadaEstoc);
          return { ...p, estocActual: nouEstoc };
        }
        return p;
      }));
    }

    // 2. Si cal fabricar peces pendents i s'ha marcat crear OF
    let ofGeneradaId = null;
    if (pendentFabricar > 0 && crearOFPerPendent && setOrdresFabricacio) {
      ofGeneradaId = handleLlençarOFPerAFalta(selectedProductToAdd, pendentFabricar, true, prioritatOFInput);
    }

    // 3. Afegir o actualitzar línia a l'esdeveniment
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        const liniesActuals = ev.linies || [];
        const indexExistent = liniesActuals.findIndex(l => l.productId === selectedProductToAdd.id);

        let novesLinies;
        if (indexExistent >= 0) {
          novesLinies = liniesActuals.map((l, idx) => {
            if (idx === indexExistent) {
              const previstAnterior = l.unitatsPrevistes || ((l.unitatsInicials || 0) + (l.unitatsPendentsFabricar || 0));
              const novesPrevistes = previstAnterior + totalFira;
              const novesInicials = (l.unitatsInicials || 0) + agafadaEstoc;
              const novesPendents = (l.unitatsPendentsFabricar || 0) + pendentFabricar;
              const novesRestants = Math.max(0, novesInicials - (l.unitatsVenudes || 0));
              return {
                ...l,
                unitatsPrevistes: novesPrevistes,
                unitatsInicials: novesInicials,
                unitatsRestants: novesRestants,
                unitatsPendentsFabricar: novesPendents,
                ofId: ofGeneradaId || l.ofId || null,
                preuFira: preuFiraNum
              };
            }
            return l;
          });
        } else {
          novesLinies = [
            ...liniesActuals,
            {
              productId: selectedProductToAdd.id,
              codi: selectedProductToAdd.codi || '',
              nom: selectedProductToAdd.nom || '',
              foto: getProductImage(selectedProductToAdd),
              gammaId: selectedProductToAdd.gammaId || '',
              preuOriginal: Number(selectedProductToAdd.preu) || 0,
              preuFira: preuFiraNum,
              unitatsPrevistes: totalFira,
              unitatsInicials: agafadaEstoc,
              unitatsPendentsFabricar: pendentFabricar,
              unitatsVenudes: 0,
              unitatsRestants: agafadaEstoc,
              ofId: ofGeneradaId || null,
              retornatAEstoc: false
            }
          ];
        }

        return { ...ev, linies: novesLinies };
      }
      return ev;
    }));

    // Tancar modal i reiniciar valors
    setShowAddProductModal(false);
    setSelectedProductToAdd(null);
    setQuantitatTotalFira(5);
    setQuantitatAgafadaEstoc(0);
    setCrearOFPerPendent(true);
    setPrioritatOFInput('normal');
    setPreuFiraInput('');

    let msg = `✓ S'han assignat ${totalFira} unitats de "${selectedProductToAdd.nom}" a la fira:`;
    msg += `\n• ${agafadaEstoc} unitats agafades de l'estoc del taller (disponibles ara mateix a la parada).`;
    if (pendentFabricar > 0) {
      if (ofGeneradaId) {
        msg += `\n• ${pendentFabricar} unitats pendents de fabricar (Creada OF nº ${ofGeneradaId} amb client 'Estoc fira' i prioritat '${prioritatOFInput}').`;
      } else {
        msg += `\n• ${pendentFabricar} unitats pendents de fabricar.`;
      }
    }
    alert(msg);
  };

  const handleTraspasAFira = handleAssignarAFira;

  // Obrir modal d'edició de condicions d'una línia
  const handleOpenEditLinia = (linia) => {
    const prod = productes.find(p => p.id === linia.productId);
    const totalObj = linia.unitatsPrevistes || ((linia.unitatsInicials || 0) + (linia.unitatsPendentsFabricar || 0));
    setEditingLinia({
      ...linia,
      producteRef: prod || null
    });
    setEditLiniaForm({
      unitatsPrevistes: totalObj,
      unitatsInicials: linia.unitatsInicials || 0,
      preuFira: linia.preuFira != null ? String(linia.preuFira) : (prod?.preu ? String(prod.preu) : ''),
      crearOF: false,
      prioritatOF: 'normal'
    });
  };

  // Guardar canvis de condicions d'una línia
  const handleSaveEditLinia = () => {
    if (!currentEvent || !editingLinia) return;

    const liniaOriginal = (currentEvent.linies || []).find(l => l.productId === editingLinia.productId);
    if (!liniaOriginal) return;

    const prod = productes.find(p => p.id === editingLinia.productId);
    const estocTallerActual = prod ? (parseInt(prod.estocActual, 10) || 0) : 0;

    const novesPrevistes = Math.max(1, parseInt(editLiniaForm.unitatsPrevistes, 10) || 1);
    const novesInicials = Math.max(0, parseInt(editLiniaForm.unitatsInicials, 10) || 0);
    const preuFiraNum = parseDecimal(editLiniaForm.preuFira, Number(liniaOriginal.preuFira || 0));

    // Valida que novesInicials no sigui inferior a les venudes
    const venudes = liniaOriginal.unitatsVenudes || 0;
    if (novesInicials < venudes) {
      alert(`No pots posar menys unitats d'estoc (${novesInicials}) que les que ja s'han venut a la fira (${venudes}).`);
      return;
    }

    // Delta d'estoc amb el taller
    const inicialsAntigues = liniaOriginal.unitatsInicials || 0;
    const deltaEstoc = novesInicials - inicialsAntigues; // Si > 0 treu del taller; si < 0 retorna al taller

    if (deltaEstoc > 0 && deltaEstoc > estocTallerActual) {
      alert(`No hi ha prou estoc al taller per agafar ${deltaEstoc} unitats més. Disponible al taller: ${estocTallerActual}.`);
      return;
    }

    // Actualitzar estoc del taller
    if (deltaEstoc !== 0) {
      setProductes(prev => prev.map(p => {
        if (p.id === editingLinia.productId) {
          return {
            ...p,
            estocActual: Math.max(0, (parseInt(p.estocActual, 10) || 0) - deltaEstoc)
          };
        }
        return p;
      }));
    }

    // Recalcular restants i pendents
    const novesRestants = Math.max(0, novesInicials - venudes);
    const novesPendents = Math.max(0, novesPrevistes - novesInicials);

    let ofGeneradaId = liniaOriginal.ofId || null;
    if (editLiniaForm.crearOF && novesPendents > 0 && prod && setOrdresFabricacio) {
      ofGeneradaId = handleLlençarOFPerAFalta(prod, novesPendents, true, editLiniaForm.prioritatOF);
    }

    // Actualitzar l'esdeveniment
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          linies: (ev.linies || []).map(l => {
            if (l.productId === editingLinia.productId) {
              return {
                ...l,
                unitatsPrevistes: novesPrevistes,
                unitatsInicials: novesInicials,
                unitatsRestants: novesRestants,
                unitatsPendentsFabricar: novesPendents,
                preuFira: preuFiraNum,
                ofId: ofGeneradaId
              };
            }
            return l;
          })
        };
      }
      return ev;
    }));

    setEditingLinia(null);
  };

  // Eliminar peça assignada a la fira (amb retorn automàtic de peces restants a l'estoc del taller)
  const handleEliminarLiniaFira = (linia) => {
    if (!currentEvent || !linia) return;

    const restants = linia.unitatsRestants || 0;
    const venudes = linia.unitatsVenudes || 0;

    let confirmMsg = `Segur que vols eliminar "${linia.nom}" de la fira?`;
    if (restants > 0) {
      confirmMsg += `\n\n• S'incorporaran automàticament les ${restants} unitats restants de la parada a l'estoc del taller.`;
    }
    if (venudes > 0) {
      confirmMsg += `\n\n⚠️ Atenció: S'havien venut ${venudes} unitats d'aquesta peça durant l'esdeveniment.`;
    }

    if (!window.confirm(confirmMsg)) return;

    // 1. Retornar les peces restants de la parada a l'estoc del taller
    if (restants > 0) {
      setProductes(prev => prev.map(p => {
        if (p.id === linia.productId) {
          return {
            ...p,
            estocActual: (parseInt(p.estocActual, 10) || 0) + restants
          };
        }
        return p;
      }));
    }

    // 2. Eliminar la línia de la fira
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          linies: (ev.linies || []).filter(l => l.productId !== linia.productId)
        };
      }
      return ev;
    }));

    if (editingLinia && editingLinia.productId === linia.productId) {
      setEditingLinia(null);
    }
  };

  // Canviar manualment el Preu Fira d'una línia existent
  const handleUpdatePreuFiraLinia = (productId, nouPreu) => {
    if (!currentEvent) return;
    const num = parseDecimal(nouPreu, 0);
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          linies: (ev.linies || []).map(l => l.productId === productId ? { ...l, preuFira: num } : l)
        };
      }
      return ev;
    }));
  };

  // Retorn parcial individual d'una peça (Fira -> Taller)
  const handleRetornParcialPeça = (productId, quantitatARetornar) => {
    if (!currentEvent) return;
    const q = parseInt(quantitatARetornar, 10);
    if (isNaN(q) || q <= 0) return;

    const linia = (currentEvent.linies || []).find(l => l.productId === productId);
    if (!linia || linia.unitatsRestants < q) {
      alert("No pots retornar més unitats de les que queden disponibles a la fira.");
      return;
    }

    // 1. Reincorporar a l'estoc general del taller
    setProductes(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, estocActual: (parseInt(p.estocActual, 10) || 0) + q };
      }
      return p;
    }));

    // 2. Descomptar de les línies de l'esdeveniment
    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          linies: (ev.linies || []).map(l => {
            if (l.productId === productId) {
              const novesInicials = Math.max(0, (l.unitatsInicials || 0) - q);
              const novesRestants = Math.max(0, (l.unitatsRestants || 0) - q);
              return {
                ...l,
                unitatsInicials: novesInicials,
                unitatsRestants: novesRestants
              };
            }
            return l;
          })
        };
      }
      return ev;
    }));
  };

  // Llençar OF per a les peces que falten o pendents
  const handleLlençarOFPerAFalta = (product, quantitatNecessaria, silent = false, prioritat = 'normal') => {
    if (!setOrdresFabricacio) {
      if (!silent) alert("Gestor d'Ordres de Fabricació no disponible.");
      return null;
    }

    const pId = product.id || product.productId;
    const pCodi = (product.codi || product.code || '').toLowerCase().trim();
    const pNom = (product.nom || product.titol || product.title || '').toLowerCase().trim();
    const pEscId = product.escandallId;

    const escandall = (escandalls || []).find(e => {
      if (pEscId && String(e.id) === String(pEscId)) return true;
      if (pId && (String(e.productId) === String(pId) || String(e.producteId) === String(pId) || String(e.id) === String(pId))) return true;
      if (pCodi && (String(e.producteCodi || '').toLowerCase().trim() === pCodi || String(e.codi || '').toLowerCase().trim() === pCodi)) return true;
      const eNom = String(e.producteNom || e.nom || '').toLowerCase().trim();
      if (eNom && pNom) {
        if (eNom === pNom) return true;
        if (pNom.includes(eNom) || eNom.includes(pNom)) return true;
      }
      return false;
    });

    const nextId = getNextOFId(ordresFabricacio);
    const eventName = currentEvent?.nom || 'Esdeveniment';
    const eventDate = currentEvent?.dataInici || null;

    // Calcular materials de l'escandall per a la quantitat a fabricar
    let calculatedMaterials = [];
    if (escandall && Array.isArray(escandall.materials)) {
      calculatedMaterials = escandall.materials.map(em => {
        const matObj = (materials || []).find(m => String(m.id) === String(em.materialId));
        const qUnit = Number(em.quantitat) || 0;
        const qTotal = qUnit * quantitatNecessaria;
        return {
          materialId: em.materialId,
          nom: matObj?.material || em.nom || 'Material',
          quantitatTeoricaUnitat: qUnit,
          quantitatTotal: qTotal,
          unitat: matObj?.unitat || 'u',
          estocReservat: qTotal,
          estocDescomptat: false
        };
      });

      // Reservar estoc dels materials al magatzem
      if (setMaterials && calculatedMaterials.length > 0) {
        setMaterials(prevMats => {
          return prevMats.map(mat => {
            const ofMat = calculatedMaterials.find(m => String(m.materialId) === String(mat.id) || (m.nom && mat.material && mat.material.toLowerCase().trim() === m.nom.toLowerCase().trim()));
            if (!ofMat) return mat;
            const currentStock = Number(mat.estocActual !== undefined ? mat.estocActual : (mat.estocFisic !== undefined ? mat.estocFisic : (mat.estoc || 0))) || 0;
            const estocReservat = (Number(mat.estocReservat) || 0) + Number(ofMat.quantitatTotal || 0);
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

    // Calcular operacions (full de ruta) de l'escandall per a la quantitat a fabricar
    let calculatedOperacions = [];
    if (escandall && Array.isArray(escandall.operacions)) {
      calculatedOperacions = escandall.operacions.map((eo, idx) => {
        const opObj = (operacions || []).find(o => String(o.id) === String(eo.operacioId));
        const tempsU = Number(eo.tempsMinuts) || 0;
        return {
          id: `op-${idx + 1}`,
          nom: opObj?.operacio || eo.nom || `Operació ${idx + 1}`,
          tempsTeoricMinuts: tempsU * quantitatNecessaria,
          tempsRealMinuts: 0,
          completada: false
        };
      });
    }

    const newOF = {
      id: nextId,
      codi: nextId,
      producteId: product.id || product.productId,
      producteNom: product.nom || 'Peça per a fira',
      producteCodi: product.codi || '',
      quantitat: quantitatNecessaria,
      estat: 'cua',
      prioritat: prioritat || 'normal',
      dataCreacio: new Date().toISOString(),
      clientNom: 'Estoc fira',
      comandaRef: eventName,
      dataLimitEntrega: eventDate,
      origen: `Fira: ${eventName}`,
      notes: `Fabricació encarregada per dotar la parada de la fira "${eventName}".`,
      escandallId: escandall?.id || null,
      materials: calculatedMaterials,
      operacions: calculatedOperacions,
      parametresLaser: escandall?.parametresLaser 
        ? normalizeLaserConfig(escandall.parametresLaser) 
        : (product.parametresLaser ? normalizeLaserConfig(product.parametresLaser) : DEFAULT_LASER_CONFIG)
    };

    setOrdresFabricacio(prev => [newOF, ...prev]);

    if (!silent) {
      alert(`✓ S'ha creat correctament l'Ordre de Fabricació ${nextId} per a ${quantitatNecessaria} unitats de "${product.nom}".`);
      if (setActiveProduccSubtab) {
        setActiveProduccSubtab('ordres_fabricacio');
      }
    }
    return nextId;
  };

  // Incorporar peces fabricades a la parada de la fira
  const handleIncorporarPecesFabricades = (linia, quantitat) => {
    if (!currentEvent || !linia) return;
    const q = parseInt(quantitat, 10);
    if (isNaN(q) || q <= 0) return;

    const pendentsActuals = linia.unitatsPendentsFabricar || 0;
    if (q > pendentsActuals) {
      alert(`No pots incorporar més unitats (${q}) de les que resten pendents de fabricar (${pendentsActuals}).`);
      return;
    }

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          linies: (ev.linies || []).map(l => {
            if (l.productId === linia.productId) {
              const novesInicials = (l.unitatsInicials || 0) + q;
              const novesRestants = (l.unitatsRestants || 0) + q;
              const novesPendents = Math.max(0, (l.unitatsPendentsFabricar || 0) - q);
              return {
                ...l,
                unitatsInicials: novesInicials,
                unitatsRestants: novesRestants,
                unitatsPendentsFabricar: novesPendents
              };
            }
            return l;
          })
        };
      }
      return ev;
    }));

    alert(`✓ S'han incorporat ${q} peces fabricades de "${linia.nom}" a la parada de la fira!`);
  };

  // Llençar manualment una OF per a una línia que té peces pendents de fabricar
  const handleLlençarOFManualPerLinia = (linia) => {
    const quantitat = linia.unitatsPendentsFabricar || 0;
    if (quantitat <= 0) {
      alert("Aquesta peça ja no té cap unitat pendent de fabricar.");
      return;
    }

    const product = productes.find(p => p.id === linia.productId) || {
      id: linia.productId,
      nom: linia.nom,
      codi: linia.codi
    };

    const nextId = handleLlençarOFPerAFalta(product, quantitat, false);
    if (nextId) {
      setEsdeveniments(prev => prev.map(ev => {
        if (ev.id === currentEvent.id) {
          return {
            ...ev,
            linies: (ev.linies || []).map(l => l.productId === linia.productId ? { ...l, ofId: nextId } : l)
          };
        }
        return ev;
      }));
    }
  };

  // --- TPV: REGISTRAR VENDA RÀPIDA ---
  const handleConfirmarVendaTPV = () => {
    if (!currentEvent || !tpvProducteSeleccionat) return;
    const q = parseInt(tpvQuantitat, 10);
    if (isNaN(q) || q <= 0) return;

    const linia = (currentEvent.linies || []).find(l => l.productId === tpvProducteSeleccionat.productId);
    if (!linia || linia.unitatsRestants < q) {
      alert(`⚠️ Només queden ${linia ? linia.unitatsRestants : 0} unitats d'aquesta peça a la parada!`);
      return;
    }

    const preuUnit = Number(linia.preuFira || linia.preuOriginal || 0);
    const totalVenda = preuUnit * q;

    const novaVenda = {
      id: `v-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      productId: linia.productId,
      productNom: linia.nom,
      quantitat: q,
      preuUnitari: preuUnit,
      total: totalVenda,
      metodePagament: tpvMetode, // 'efectiu' | 'bizum' | 'targeta'
      notes: ''
    };

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        const liniesActualitzades = (ev.linies || []).map(l => {
          if (l.productId === linia.productId) {
            const novesVenudes = (l.unitatsVenudes || 0) + q;
            const novesRestants = Math.max(0, (l.unitatsInicials || 0) - novesVenudes);
            return {
              ...l,
              unitatsVenudes: novesVenudes,
              unitatsRestants: novesRestants
            };
          }
          return l;
        });

        const vendesActualitzades = [novaVenda, ...(ev.vendes || [])];

        return {
          ...ev,
          estat: ev.estat === 'preparacio' ? 'en_curs' : ev.estat,
          linies: liniesActualitzades,
          vendes: vendesActualitzades
        };
      }
      return ev;
    }));

    setTpvSuccessMsg(`✓ Venda registrada: ${q}x ${linia.nom} (${formatCurrency(totalVenda)}) per ${tpvMetode.toUpperCase()}`);
    setTimeout(() => setTpvSuccessMsg(null), 3000);

    setTpvProducteSeleccionat(null);
    setTpvQuantitat(1);
  };

  // Desfer venda TPV (per si hi ha error)
  const handleAnullarVenda = (vendaId) => {
    if (!currentEvent) return;
    const venda = (currentEvent.vendes || []).find(v => v.id === vendaId);
    if (!venda) return;

    const confirma = window.confirm(`Vols anul·lar aquesta venda de ${venda.quantitat}x "${venda.productNom}" (${formatCurrency(venda.total)})? Les unitats tornaran a estar disponibles a la parada.`);
    if (!confirma) return;

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        const liniesActualitzades = (ev.linies || []).map(l => {
          if (l.productId === venda.productId) {
            const novesVenudes = Math.max(0, (l.unitatsVenudes || 0) - venda.quantitat);
            const novesRestants = Math.max(0, (l.unitatsInicials || 0) - novesVenudes);
            return {
              ...l,
              unitatsVenudes: novesVenudes,
              unitatsRestants: novesRestants
            };
          }
          return l;
        });

        return {
          ...ev,
          linies: liniesActualitzades,
          vendes: (ev.vendes || []).filter(v => v.id !== vendaId)
        };
      }
      return ev;
    }));
  };

  // --- TANCAMENT I RETORN TOTAL DE ROMANENTS ---
  const handleTancarEsdevenimentIRetornar = () => {
    if (!currentEvent) return;

    // 1. Reincorporar totes les unitats restants a l'estoc general del taller
    const liniesAmbRestants = (currentEvent.linies || []).filter(l => (l.unitatsRestants || 0) > 0);
    
    setProductes(prev => prev.map(p => {
      const linia = liniesAmbRestants.find(l => l.productId === p.id);
      if (linia && linia.unitatsRestants > 0) {
        return {
          ...p,
          estocActual: (parseInt(p.estocActual, 10) || 0) + linia.unitatsRestants
        };
      }
      return p;
    }));

    // 2. Calcular liquidació final i marcar com a tancat
    const vendes = currentEvent.vendes || [];
    const totalRecaptat = vendes.reduce((acc, v) => acc + (v.total || 0), 0);
    const totalEfectiu = vendes.filter(v => v.metodePagament === 'efectiu').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalBizum = vendes.filter(v => v.metodePagament === 'bizum').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalTargeta = vendes.filter(v => v.metodePagament === 'targeta').reduce((acc, v) => acc + (v.total || 0), 0);

    const pctComissio = Number(currentEvent.colaborador?.percentatgeComissio || 0);
    const comissioColaboradorImport = totalRecaptat * (pctComissio / 100);
    const despesaParada = Number(currentEvent.despesaParada || 0);
    const netTaller = totalRecaptat - comissioColaboradorImport - despesaParada;

    const liquidacioFinal = {
      totalRecaptat,
      totalEfectiu,
      totalBizum,
      totalTargeta,
      comissioColaboradorImport,
      netTaller,
      dataTancament: new Date().toISOString()
    };

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          estat: 'tancat',
          liquidacio: liquidacioFinal,
          linies: (ev.linies || []).map(l => ({ ...l, retornatAEstoc: true }))
        };
      }
      return ev;
    }));

    setShowCloseConfirmModal(false);
    alert(`✓ Fira "${currentEvent.nom}" tancada amb èxit!\n\nS'han retornat automàticament ${liniesAmbRestants.reduce((acc, l) => acc + l.unitatsRestants, 0)} peces sobrants a l'estoc general del taller.`);
  };

  // Tancar l'esdeveniment sense tocar ni traspassar els estocs del taller (ideal per a proves o gestió externa)
  const handleTancarSenseRetorn = () => {
    if (!currentEvent) return;

    const vendes = currentEvent.vendes || [];
    const totalRecaptat = vendes.reduce((acc, v) => acc + (v.total || 0), 0);
    const totalEfectiu = vendes.filter(v => v.metodePagament === 'efectiu').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalBizum = vendes.filter(v => v.metodePagament === 'bizum').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalTargeta = vendes.filter(v => v.metodePagament === 'targeta').reduce((acc, v) => acc + (v.total || 0), 0);

    const pctComissio = Number(currentEvent.colaborador?.percentatgeComissio || 0);
    const comissioColaboradorImport = totalRecaptat * (pctComissio / 100);
    const despesaParada = Number(currentEvent.despesaParada || 0);
    const netTaller = totalRecaptat - comissioColaboradorImport - despesaParada;

    const liquidacioFinal = {
      totalRecaptat,
      totalEfectiu,
      totalBizum,
      totalTargeta,
      comissioColaboradorImport,
      netTaller,
      dataTancament: new Date().toISOString()
    };

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return {
          ...ev,
          estat: 'tancat',
          liquidacio: liquidacioFinal
        };
      }
      return ev;
    }));

    setShowCloseConfirmModal(false);
    alert(`✓ Fira "${currentEvent.nom}" tancada correctament sense modificar els estocs del taller.`);
  };

  // Eliminar un esdeveniment
  const handleEliminarEsdeveniment = (eventToDelete) => {
    const ev = eventToDelete || currentEvent;
    if (!ev) return;

    const liniesAmbRestants = (ev.linies || []).filter(l => (l.unitatsRestants || 0) > 0);
    const pecesRestants = liniesAmbRestants.reduce((acc, l) => acc + (l.unitatsRestants || 0), 0);

    let retornarEstoc = false;
    if (pecesRestants > 0 && ev.estat !== 'tancat') {
      const resp = window.confirm(
        `⚠️ Aquesta fira té ${pecesRestants} peces assignades que encara no s'han retornat al taller.\n\nVols retornar aquestes ${pecesRestants} peces a l'estoc general del taller abans d'eliminar?\n\n• Prémer ACCEPTAR: Retorna les peces a l'estoc del taller i elimina la fira.\n• Prémer CANCEL·LAR: No s'eliminarà res.`
      );
      if (!resp) return;
      retornarEstoc = true;
    } else {
      const resp = window.confirm(`Estàs segur que vols eliminar l'esdeveniment "${ev.nom}"?`);
      if (!resp) return;
    }

    if (retornarEstoc) {
      setProductes(prev => prev.map(p => {
        const linia = liniesAmbRestants.find(l => l.productId === p.id);
        if (linia && linia.unitatsRestants > 0) {
          return {
            ...p,
            estocActual: (parseInt(p.estocActual, 10) || 0) + linia.unitatsRestants
          };
        }
        return p;
      }));
    }

    setEsdeveniments(prev => prev.filter(e => e.id !== ev.id));
    if (selectedEsdevenimentId === ev.id) {
      setSelectedEsdevenimentId(null);
    }
  };

  // Reobrir esdeveniment tancat si cal modificar alguna dada
  const handleReobrirEsdeveniment = () => {
    if (!currentEvent) return;
    const confirma = window.confirm("⚠️ Vols reobrir aquest esdeveniment? Recorda que si ja s'havien retornat les peces a l'estoc general, hauràs de revisar la dotació per no duplicar estocs.");
    if (!confirma) return;

    setEsdeveniments(prev => prev.map(ev => {
      if (ev.id === currentEvent.id) {
        return { ...ev, estat: 'en_curs' };
      }
      return ev;
    }));
  };

  // --- MÈTRIQUES DE L'ESDEVENIMENT SELECCIONAT ---
  const eventStats = useMemo(() => {
    if (!currentEvent) return null;
    const linies = currentEvent.linies || [];
    const vendes = currentEvent.vendes || [];

    const totalPecesPrevistes = linies.reduce((acc, l) => acc + (l.unitatsPrevistes || ((l.unitatsInicials || 0) + (l.unitatsPendentsFabricar || 0))), 0);
    const totalPecesInicials = linies.reduce((acc, l) => acc + (l.unitatsInicials || 0), 0);
    const totalPecesVenudes = linies.reduce((acc, l) => acc + (l.unitatsVenudes || 0), 0);
    const totalPecesRestants = linies.reduce((acc, l) => acc + (l.unitatsRestants || 0), 0);
    const totalPecesPendentsFabricar = linies.reduce((acc, l) => acc + (l.unitatsPendentsFabricar || 0), 0);

    const totalRecaptat = vendes.reduce((acc, v) => acc + (v.total || 0), 0);
    const totalEfectiu = vendes.filter(v => v.metodePagament === 'efectiu').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalBizum = vendes.filter(v => v.metodePagament === 'bizum').reduce((acc, v) => acc + (v.total || 0), 0);
    const totalTargeta = vendes.filter(v => v.metodePagament === 'targeta').reduce((acc, v) => acc + (v.total || 0), 0);

    const fonsCaixa = Number(currentEvent.fonsCaixaInicial || 0);
    const caixaEfectiuTotal = fonsCaixa + totalEfectiu;

    const pctComissio = Number(currentEvent.colaborador?.percentatgeComissio || 0);
    const comissioColaborador = totalRecaptat * (pctComissio / 100);
    const despesaParada = Number(currentEvent.despesaParada || 0);
    const netTaller = totalRecaptat - comissioColaborador - despesaParada;

    const percVendaGlobal = totalPecesInicials > 0 ? Math.round((totalPecesVenudes / totalPecesInicials) * 100) : 0;

    return {
      totalPecesPrevistes,
      totalPecesInicials,
      totalPecesVenudes,
      totalPecesRestants,
      totalPecesPendentsFabricar,
      totalRecaptat,
      totalEfectiu,
      totalBizum,
      totalTargeta,
      fonsCaixa,
      caixaEfectiuTotal,
      pctComissio,
      comissioColaborador,
      despesaParada,
      netTaller,
      percVendaGlobal
    };
  }, [currentEvent]);

  // --- COMPARATIVA HISTÒRICA INTERANUAL ---
  const edicionsComparativa = useMemo(() => {
    if (!currentEvent) return [];
    const agrupador = currentEvent.identificadorAgrupador || currentEvent.nom.trim().toLowerCase().replace(/\s+/g, '_');
    
    // Trobar tots els esdeveniments amb aquest agrupador o nom coincident
    return esdeveniments
      .filter(ev => {
        const evAgrupador = ev.identificadorAgrupador || ev.nom.trim().toLowerCase().replace(/\s+/g, '_');
        return evAgrupador === agrupador || ev.nom.toLowerCase().includes(currentEvent.nom.toLowerCase().replace(/\d{4}/, '').trim());
      })
      .sort((a, b) => (Number(b.edicioAny) || 0) - (Number(a.edicioAny) || 0));
  }, [currentEvent, esdeveniments]);

  // Rànquing de productes més venuts en l'històric d'aquesta fira
  const rankingProductesHistoric = useMemo(() => {
    if (edicionsComparativa.length === 0) return [];
    const mapProd = {};

    edicionsComparativa.forEach(ev => {
      (ev.linies || []).forEach(l => {
        if (!mapProd[l.productId]) {
          mapProd[l.productId] = {
            productId: l.productId,
            nom: l.nom,
            foto: l.foto || getProductImage(l),
            totalPortades: 0,
            totalVenudes: 0,
            edicionsPresents: 0
          };
        }
        mapProd[l.productId].totalPortades += (l.unitatsInicials || 0);
        mapProd[l.productId].totalVenudes += (l.unitatsVenudes || 0);
        mapProd[l.productId].edicionsPresents += 1;
      });
    });

    return Object.values(mapProd).sort((a, b) => b.totalVenudes - a.totalVenudes);
  }, [edicionsComparativa, getProductImage]);

  // Filtre d'esdeveniments
  const filteredEvents = useMemo(() => {
    return esdeveniments.filter(ev => {
      if (filtreEstat === 'actius' && ev.estat === 'tancat') return false;
      if (filtreEstat === 'tancats' && ev.estat !== 'tancat') return false;
      if (cercaEsdeveniment.trim()) {
        const query = cercaEsdeveniment.toLowerCase();
        return (ev.nom || '').toLowerCase().includes(query) || 
               (ev.lloc || '').toLowerCase().includes(query) ||
               String(ev.edicioAny || '').includes(query);
      }
      return true;
    });
  }, [esdeveniments, filtreEstat, cercaEsdeveniment]);

  // =========================================================================
  // VISTA 1: LLISTAT GENERAL D'ESDEVENIMENTS (SI NO N'HI HA CAP SELECCIONAT)
  // =========================================================================
  if (!currentEvent) {
    return (
      <div className="space-y-6">
        {/* Capçalera Principal */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/10 text-amber-600'
            }`}>
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className={`text-xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gestió d'Esdeveniments i Fires</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  isDark ? 'bg-amber-950/70 text-amber-300 border-amber-600/50' : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  {esdeveniments.length} {esdeveniments.length === 1 ? 'esdeveniment' : 'esdeveniments'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Planifica fires d'artesans, dota peces des de l'estoc del taller, cobra ràpidament amb TPV i analitza l'històric d'edicions anteriors.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nou Esdeveniment / Fira</span>
          </button>
        </div>

        {/* Barra de Filtres */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFiltreEstat('tots')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtreEstat === 'tots' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')
              }`}
            >
              Tots ({esdeveniments.length})
            </button>
            <button
              onClick={() => setFiltreEstat('actius')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtreEstat === 'actius' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')
              }`}
            >
              Actius ({esdeveniments.filter(e => e.estat !== 'tancat').length})
            </button>
            <button
              onClick={() => setFiltreEstat('tancats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtreEstat === 'tancats' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')
              }`}
            >
              Tancats ({esdeveniments.filter(e => e.estat === 'tancat').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={cercaEsdeveniment}
              onChange={(e) => setCercaEsdeveniment(e.target.value)}
              placeholder="Cercar fira, lloc o any..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
              }`}
            />
          </div>
        </div>

        {/* Graella de Targetes d'Esdeveniments */}
        {filteredEvents.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border border-dashed space-y-3 ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <Store className={`w-10 h-10 mx-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cap esdeveniment trobat</p>
            <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Crea el teu primer esdeveniment d'artesania per començar a dotar estoc i registrar les teves vendes a les parades.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear el Primer Esdeveniment</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map(event => {
              const vendes = event.vendes || [];
              const totalVendes = vendes.reduce((acc, v) => acc + (v.total || 0), 0);
              const totalPecesInicials = (event.linies || []).reduce((acc, l) => acc + (l.unitatsInicials || 0), 0);
              const totalPecesVenudes = (event.linies || []).reduce((acc, l) => acc + (l.unitatsVenudes || 0), 0);

              const estatBadge = {
                preparacio: { 
                  text: 'En Preparació', 
                  bg: isDark ? 'bg-amber-950/70 text-amber-300 border-amber-600/50' : 'bg-amber-100 text-amber-900 border-amber-300' 
                },
                en_curs: { 
                  text: 'En Curs (Parada Activa)', 
                  bg: isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50' : 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                },
                tancat: { 
                  text: 'Tancada (Romanents Retornats)', 
                  bg: isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300' 
                }
              }[event.estat] || { 
                text: event.estat, 
                bg: isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300' 
              };

              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEsdevenimentId(event.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 text-slate-100' 
                      : 'bg-white border-slate-200 hover:border-amber-500/50 text-slate-900'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${estatBadge.bg}`}>
                          {estatBadge.text}
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          isDark ? 'text-amber-400 bg-amber-950/60 border-amber-600/40' : 'text-amber-900 bg-amber-100 border-amber-300'
                        }`}>
                          {event.edicioAny || new Date().getFullYear()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarEsdeveniment(event);
                        }}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                        }`}
                        title="Eliminar aquest esdeveniment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h3 className={`text-base font-serif font-bold transition-colors ${
                        isDark ? 'text-white group-hover:text-amber-400' : 'text-slate-900 group-hover:text-amber-700'
                      }`}>
                        {event.nom}
                      </h3>
                      {event.lloc && (
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span>{event.lloc}</span>
                        </p>
                      )}
                    </div>

                    <div className={`text-xs flex items-center gap-1.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      <span>{event.dataInici} {event.dataFi && event.dataFi !== event.dataInici ? `fins ${event.dataFi}` : ''}</span>
                    </div>

                    {/* Mètriques resum de la targeta */}
                    <div className={`grid grid-cols-2 gap-2 pt-2 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Vendes</span>
                        <span className={`text-sm font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(totalVendes)}</span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Peces a Parada</span>
                        <span className={`text-sm font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {totalPecesVenudes} / {totalPecesInicials} <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>venudes</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold group-hover:translate-x-0.5 transition-transform ${
                    isDark ? 'border-slate-800 text-amber-400' : 'border-slate-100 text-amber-700'
                  }`}>
                    <span>Obrir Gestió de la Fira</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL CREAR / EDITAR ESDEVENIMENT */}
        {showEventModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline/20 p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-outline/15 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-serif font-bold text-primary">
                    {editingEvent ? "Editar Esdeveniment / Fira" : "Nou Esdeveniment / Fira"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-primary block mb-1">Nom de l'Esdeveniment *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: Fira Medieval de Vic"
                    className="w-full p-2.5 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 font-medium text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-primary block mb-1">Any / Edició</label>
                    <input
                      type="number"
                      value={formData.edicioAny}
                      onChange={(e) => setFormData({ ...formData, edicioAny: e.target.value })}
                      className="w-full p-2.5 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 font-mono text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-primary block mb-1">Lloc / Població</label>
                    <input
                      type="text"
                      value={formData.lloc}
                      onChange={(e) => setFormData({ ...formData, lloc: e.target.value })}
                      placeholder="Ex: Plaça Major, Vic"
                      className="w-full p-2.5 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-primary block mb-1">Data d'Inici</label>
                    <input
                      type="date"
                      value={formData.dataInici}
                      onChange={(e) => setFormData({ ...formData, dataInici: e.target.value })}
                      className="w-full p-2 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 font-mono text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-primary block mb-1">Data de Fi</label>
                    <input
                      type="date"
                      value={formData.dataFi}
                      onChange={(e) => setFormData({ ...formData, dataFi: e.target.value })}
                      className="w-full p-2 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 font-mono text-on-surface"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl space-y-2.5">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px] uppercase tracking-wider">
                    Finances Inicials i Parada
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Despesa Parada (€)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.despesaParada}
                        onChange={(e) => setFormData({ ...formData, despesaParada: e.target.value })}
                        placeholder="0"
                        className="w-full p-2 bg-surface border border-outline/20 rounded-lg outline-none font-mono text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Fons Caixa Inicial (€)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.fonsCaixaInicial}
                        onChange={(e) => setFormData({ ...formData, fonsCaixaInicial: e.target.value })}
                        placeholder="100"
                        className="w-full p-2 bg-surface border border-outline/20 rounded-lg outline-none font-mono text-on-surface"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-outline/15 rounded-xl space-y-2.5">
                  <span className="font-bold text-primary block text-[11px] uppercase tracking-wider">
                    Col·laborador / Parada
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Nom del Col·laborador</label>
                      <input
                        type="text"
                        value={formData.colaboradorNom}
                        onChange={(e) => setFormData({ ...formData, colaboradorNom: e.target.value })}
                        placeholder="Ex: Maria"
                        className="w-full p-2 bg-surface border border-outline/20 rounded-lg outline-none text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant block mb-1">Comissió sobre vendes (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={formData.colaboradorPercentatge}
                          onChange={(e) => setFormData({ ...formData, colaboradorPercentatge: e.target.value })}
                          placeholder="15"
                          className="w-full p-2 pr-7 bg-surface border border-outline/20 rounded-lg outline-none font-mono text-on-surface"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-primary block mb-1">Notes o Observacions</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Detalls de la ubicació de la parada, horaris de muntatge..."
                    className="w-full p-2 bg-surface border border-outline/20 rounded-xl outline-none focus:border-amber-500 text-on-surface text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline/15">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-3.5 py-2 text-on-surface-variant hover:bg-surface rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  {editingEvent ? "Desar Canvis" : "Crear Esdeveniment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: GESTIÓ DE L'ESDEVENIMENT SELECCIONAT
  // =========================================================================
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra Superior de Retorn i Estat */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedEsdevenimentId(null)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
            title="Tornar al llistat d'esdeveniments"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className={`text-lg font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentEvent.nom}</h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'text-amber-400 bg-amber-950/60 border-amber-600/40' : 'text-amber-900 bg-amber-100 border-amber-300 font-black'
              }`}>
                {currentEvent.edicioAny || new Date().getFullYear()}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                currentEvent.estat === 'preparacio' 
                  ? (isDark ? 'bg-amber-950/70 text-amber-300 border-amber-600/50' : 'bg-amber-100 text-amber-900 border-amber-300')
                  : currentEvent.estat === 'en_curs'
                    ? (isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50' : 'bg-emerald-100 text-emerald-900 border-emerald-300')
                    : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300')
              }`}>
                {currentEvent.estat === 'preparacio' ? 'En Preparació' : currentEvent.estat === 'en_curs' ? 'En Curs (Parada Activa)' : 'Tancat'}
              </span>
            </div>
            {currentEvent.lloc && (
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <MapPin className="w-3 h-3 text-amber-500" />
                <span>{currentEvent.lloc}</span>
                <span className="mx-1">•</span>
                <Calendar className="w-3 h-3 opacity-60" />
                <span>{currentEvent.dataInici} {currentEvent.dataFi && currentEvent.dataFi !== currentEvent.dataInici ? `al ${currentEvent.dataFi}` : ''}</span>
              </p>
            )}
          </div>
        </div>

        {/* Accions ràpides d'esdeveniment */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentEvent.estat === 'preparacio' && (
            <button
              onClick={() => handleSetEventStatus('en_curs')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Obrir Parada (En Curs)</span>
            </button>
          )}

          {currentEvent.estat === 'en_curs' && (
            <>
              <button
                onClick={() => handleSetEventStatus('preparacio')}
                className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isDark 
                    ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-amber-400' 
                    : 'border-slate-300 bg-white hover:bg-slate-100 text-amber-800'
                }`}
                title="Tornar la fira a estat de preparació (si s'ha obert per error)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desfer Inici (Tornar a Preparació)</span>
              </button>

              <button
                onClick={() => setShowCloseConfirmModal(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-slate-700 hover:bg-slate-800 text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Finalitzar / Tancar Fira</span>
              </button>
            </>
          )}

          {currentEvent.estat === 'tancat' && (
            <button
              onClick={handleReobrirEsdeveniment}
              className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>Reobrir Fira</span>
            </button>
          )}

          <button
            onClick={() => handleOpenEditModal(currentEvent)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Editar dades de la fira"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleEliminarEsdeveniment(currentEvent)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'border-slate-700 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400' : 'border-slate-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600'
            }`}
            title="Eliminar fira"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Targetes de Mètriques Resum en Temps Real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border shadow-xs ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Recaptació Total</span>
          <span className={`text-xl font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(eventStats?.totalRecaptat || 0)}</span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {currentEvent.vendes?.length || 0} vendes registrades
          </span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Peces a la Parada</span>
          <span className={`text-xl font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {eventStats?.totalPecesRestants || 0} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>restants</span>
          </span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {eventStats?.totalPecesVenudes || 0} venudes ({eventStats?.percVendaGlobal || 0}%)
          </span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Caixa Efectiu Física</span>
          <span className={`text-xl font-mono font-black ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{formatCurrency(eventStats?.caixaEfectiuTotal || 0)}</span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {formatCurrency(eventStats?.fonsCaixa || 0)} fons + {formatCurrency(eventStats?.totalEfectiu || 0)} vendes
          </span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Col·laborador ({currentEvent.colaborador?.nom || 'Parada'})
          </span>
          <span className={`text-xl font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(eventStats?.comissioColaborador || 0)}</span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {currentEvent.colaborador?.percentatgeComissio || 0}% de comissió
          </span>
        </div>
      </div>

      {/* Pestanyes de l'Esdeveniment */}
      <div className={`flex items-center gap-2 border-b overflow-x-auto no-scrollbar ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('dotacio')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'dotacio'
              ? (isDark ? 'border-amber-400 text-amber-300 bg-amber-950/30 rounded-t-lg' : 'border-amber-600 text-amber-900 bg-amber-50 rounded-t-lg font-black')
              : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Dotació d'Estoc ({currentEvent.linies?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('tpv')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'tpv'
              ? (isDark ? 'border-amber-400 text-amber-300 bg-amber-950/30 rounded-t-lg' : 'border-amber-600 text-amber-900 bg-amber-50 rounded-t-lg font-black')
              : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
          }`}
        >
          <Store className="w-4 h-4" />
          <span>2. TPV Parada / Venda Ràpida</span>
        </button>

        <button
          onClick={() => setActiveTab('liquidacio')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'liquidacio'
              ? (isDark ? 'border-amber-400 text-amber-300 bg-amber-950/30 rounded-t-lg' : 'border-amber-600 text-amber-900 bg-amber-50 rounded-t-lg font-black')
              : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>3. Liquidació i Caixa</span>
        </button>

        <button
          onClick={() => setActiveTab('historic')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'historic'
              ? (isDark ? 'border-amber-400 text-amber-300 bg-amber-950/30 rounded-t-lg' : 'border-amber-600 text-amber-900 bg-amber-50 rounded-t-lg font-black')
              : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
          }`}
        >
          <History className="w-4 h-4" />
          <span>4. Històric Interanual ({edicionsComparativa.length})</span>
        </button>
      </div>

      {/* ===================================================================
          PESTANYA 1: DOTACIÓ D'ESTOC (TALLER -> FIRA)
          =================================================================== */}
      {activeTab === 'dotacio' && (
        <div className="space-y-4">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div>
              <h3 className={`text-sm font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Peces Assignades a la Fira</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                En assignar peces, pots agafar les que tinguis a l'estoc del taller i deixar la resta com a pendents de fabricar.
              </p>
            </div>
            {currentEvent.estat !== 'tancat' && (
              <button
                onClick={() => {
                  setSelectedProductToAdd(null);
                  setQuantitatTotalFira(5);
                  setQuantitatAgafadaEstoc(0);
                  setCrearOFPerPendent(true);
                  setProductSearch('');
                  setPreuFiraInput('');
                  setShowAddProductModal(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Assignar Peça a la Fira</span>
              </button>
            )}
          </div>

          {/* Taula de línies de fira */}
          {(!currentEvent.linies || currentEvent.linies.length === 0) ? (
            <div className={`p-10 text-center rounded-xl border border-dashed space-y-2 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <Package className={`w-8 h-8 mx-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Encara no has assignat cap peça a aquesta fira</p>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Fes clic a "Assignar Peça a la Fira" per definir la quantitat objectiu, agafar les peces d'estoc disponibles i planificar la fabricació restant.
              </p>
            </div>
          ) : (
            <div className={`rounded-xl border overflow-hidden shadow-xs ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-mono font-bold uppercase text-[11px] tracking-wider ${
                      isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <th className="py-3 px-4">Peça</th>
                      <th className="py-3 px-3 text-right">PVP Normal</th>
                      <th className="py-3 px-3 text-right">Preu Fira (€)</th>
                      <th className="py-3 px-3 text-center" title="Quantitat total objectiu per a la fira">Objectiu Fira</th>
                      <th className="py-3 px-3 text-center" title="Unitats agafades de l'estoc del taller">De l'Estoc</th>
                      <th className="py-3 px-3 text-center" title="Unitats pendents de fabricar per assolir l'objectiu">Pendent Fabricar</th>
                      <th className="py-3 px-3 text-center" title="Unitats presents a la parada i a punt per vendre">A Parada</th>
                      <th className="py-3 px-3 text-center">Venudes</th>
                      <th className="py-3 px-3">Progrés Venda</th>
                      <th className="py-3 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
                    {currentEvent.linies.map(linia => {
                      const totalObj = linia.unitatsPrevistes || ((linia.unitatsInicials || 0) + (linia.unitatsPendentsFabricar || 0));
                      const percVenut = totalObj > 0 ? Math.round(((linia.unitatsVenudes || 0) / totalObj) * 100) : 0;
                      const pendentsFabricar = linia.unitatsPendentsFabricar || 0;

                      return (
                        <tr key={linia.productId} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-amber-50/40'}`}>
                          <td className="py-2.5 px-4">
                            {(() => {
                              const f = getProductImage(linia);
                              return (
                                <div 
                                  className="flex items-center gap-3 cursor-default"
                                  title={linia.codi ? `Codi: ${linia.codi}` : undefined}
                                >
                                  <div className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center border ${
                                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                                  }`}>
                                    {f ? (
                                      <img 
                                        src={f} 
                                        alt={linia.nom} 
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
                                      style={{ display: f ? 'none' : 'flex' }}
                                    >
                                      <Package className="w-4 h-4" />
                                    </div>
                                  </div>
                                  <span 
                                    className={`font-semibold font-serif transition-colors ${
                                      isDark ? 'text-white hover:text-amber-400' : 'text-slate-900 hover:text-amber-700'
                                    }`}
                                    title={linia.codi ? `Codi: ${linia.codi}` : undefined}
                                  >
                                    {linia.nom}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {formatCurrency(linia.preuOriginal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {currentEvent.estat !== 'tancat' ? (
                              <input
                                type="number"
                                step="any"
                                defaultValue={linia.preuFira}
                                onBlur={(e) => handleUpdatePreuFiraLinia(linia.productId, e.target.value)}
                                className={`w-20 p-1.5 text-right rounded-lg outline-none font-black font-mono transition-all border ${
                                  isDark
                                    ? 'bg-slate-950 border-slate-700 text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                                    : 'bg-white border-slate-300 text-amber-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-xs'
                                }`}
                                title="Preu promocional per a aquesta fira"
                              />
                            ) : (
                              <span className={`font-mono font-black ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>{formatCurrency(linia.preuFira)}</span>
                            )}
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalObj}</td>
                          <td className={`py-2.5 px-3 text-center font-mono font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{linia.unitatsInicials || 0}</td>
                          <td className="py-2.5 px-3 text-center">
                            {pendentsFabricar > 0 ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 ${
                                  isDark 
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-xs' 
                                    : 'bg-amber-100 text-amber-950 border-amber-300 shadow-xs'
                                }`}>
                                  🔨 {pendentsFabricar} ptes.
                                </span>
                                {linia.ofId ? (
                                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title="Ordre de Fabricació creada">
                                    OF: {linia.ofId}
                                  </span>
                                ) : currentEvent.estat !== 'tancat' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleLlençarOFManualPerLinia(linia)}
                                    className={`text-[11px] font-black hover:underline cursor-pointer transition-colors ${
                                      isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-800 hover:text-amber-950'
                                    }`}
                                    title="Llençar OF a taller per a les peces pendents"
                                  >
                                    + Llençar OF
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <span className={`font-mono text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              linia.unitatsRestants > 2
                                ? (isDark ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/60 shadow-xs' : 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs')
                                : linia.unitatsRestants > 0
                                  ? (isDark ? 'bg-amber-950/80 text-amber-200 border-amber-600/60 shadow-xs' : 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs')
                                  : (isDark ? 'bg-rose-950/90 text-rose-200 border-rose-600/70 shadow-xs' : 'bg-rose-100 text-rose-900 border-rose-300 shadow-xs')
                            }`}>
                              {linia.unitatsRestants}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{linia.unitatsVenudes || 0}</td>
                          <td className="py-2.5 px-3">
                            <div className={`w-24 rounded-full h-2 overflow-hidden border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, percVenut)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{percVenut}% venut</span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {currentEvent.estat !== 'tancat' && (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {pendentsFabricar > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const qStr = prompt(`Quantes peces fabricades de "${linia.nom}" vols incorporar ara a la parada? (Màx pendents: ${pendentsFabricar})`, String(pendentsFabricar));
                                      if (qStr) handleIncorporarPecesFabricades(linia, qStr);
                                    }}
                                    className={`px-2 py-1 rounded-md border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs ${
                                      isDark
                                        ? 'text-emerald-300 bg-emerald-950/70 border-emerald-700/70 hover:bg-emerald-900/80'
                                        : 'text-emerald-900 bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
                                    }`}
                                    title="Incorporar peces que ja s'han fabricat a la parada"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    <span>Incorporar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditLinia(linia)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                  title="Editar condicions (objectiu fira, estoc agafat, preu...)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {linia.unitatsRestants > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const qStr = prompt(`Quantes unitats de "${linia.nom}" vols retornar al taller ara mateix? (Màx: ${linia.unitatsRestants})`, "1");
                                      if (qStr) handleRetornParcialPeça(linia.productId, parseInt(qStr, 10));
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-800 hover:bg-slate-100'
                                    }`}
                                    title="Retornar peces al taller"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleEliminarLiniaFira(linia)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-100'
                                  }`}
                                  title="Eliminar aquesta peça de la fira (les unitats restants tornen al taller)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          PESTANYA 2: TPV PARADA / VENDA RÀPIDA (PENSAT PER A MÒBIL/TABLET)
          =================================================================== */}
      {activeTab === 'tpv' && (
        <div className="space-y-4">
          {/* Missatge d'èxit de venda */}
          {tpvSuccessMsg && (
            <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-bold font-mono flex items-center justify-between shadow-md animate-fadeIn">
              <span>{tpvSuccessMsg}</span>
              <button onClick={() => setTpvSuccessMsg(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Graella de Productes a la Parada */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {(currentEvent.linies || []).map(linia => {
              const esgotat = (linia.unitatsRestants || 0) <= 0;
              return (
                <button
                  key={linia.productId}
                  disabled={esgotat || currentEvent.estat === 'tancat'}
                  onClick={() => {
                    setTpvProducteSeleccionat(linia);
                    setTpvQuantitat(1);
                    setTpvMetode('efectiu');
                  }}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer shadow-xs group ${
                    esgotat
                      ? (isDark ? 'opacity-40 border-slate-800 cursor-not-allowed bg-slate-950/60' : 'opacity-40 border-slate-200 cursor-not-allowed bg-slate-100')
                      : (isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/60 hover:shadow-md active:scale-98 text-slate-100' : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-md active:scale-98 text-slate-900')
                  }`}
                >
                  <div className="space-y-2">
                    {(() => {
                      const f = getProductImage(linia);
                      return (
                        <div className={`relative aspect-square w-full rounded-xl overflow-hidden border flex items-center justify-center ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}>
                          {f ? (
                            <img 
                              src={f} 
                              alt={linia.nom} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
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
                            style={{ display: f ? 'none' : 'flex' }}
                          >
                            <Package className="w-8 h-8" />
                          </div>
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs ${
                            linia.unitatsRestants > 2 ? 'bg-emerald-600 text-white' :
                            linia.unitatsRestants > 0 ? 'bg-amber-600 text-white' :
                            'bg-rose-600 text-white'
                          }`}>
                            {linia.unitatsRestants} disp.
                          </span>
                        </div>
                      );
                    })()}

                    <div>
                      <h4 className={`font-serif font-bold text-xs line-clamp-2 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {linia.nom}
                      </h4>
                      <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{linia.codi}</p>
                    </div>
                  </div>

                  <div className={`mt-3 pt-2 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <span className={`text-sm font-mono font-black ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                      {formatCurrency(linia.preuFira || linia.preuOriginal)}
                    </span>
                    <span className={`p-1 rounded-lg transition-colors ${
                      isDark ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950' : 'bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white'
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Panell de Vendes Recents */}
          <div className={`mt-8 p-5 rounded-2xl border shadow-xs space-y-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-serif font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Registre de Vendes de la Parada ({currentEvent.vendes?.length || 0})</span>
              </h3>
            </div>

            {(!currentEvent.vendes || currentEvent.vendes.length === 0) ? (
              <p className={`text-xs italic py-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Encara no s'ha registrat cap venda en aquesta fira. Toca qualsevol producte de dalt per registrar la primera venda!
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-mono text-xs">
                {currentEvent.vendes.map(venda => (
                  <div key={venda.id} className={`p-2.5 border rounded-xl flex items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        venda.metodePagament === 'efectiu' 
                          ? (isDark ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' : 'bg-emerald-100 text-emerald-900') 
                          : venda.metodePagament === 'bizum' 
                            ? (isDark ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50' : 'bg-cyan-100 text-cyan-900')
                            : (isDark ? 'bg-purple-950/80 text-purple-300 border border-purple-700/50' : 'bg-purple-100 text-purple-900')
                      }`}>
                        {venda.metodePagament}
                      </span>
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{venda.quantitat}x {venda.productNom}</span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(venda.timestamp).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(venda.total)}</span>
                      {currentEvent.estat !== 'tancat' && (
                        <button
                          onClick={() => handleAnullarVenda(venda.id)}
                          className={`p-1 cursor-pointer transition-colors ${isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-800'}`}
                          title="Anul·lar aquesta venda"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MODAL COBRAMENT RÀPID TPV */}
          {tpvProducteSeleccionat && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className={`max-w-sm w-full rounded-2xl border p-6 shadow-2xl space-y-5 animate-fadeIn ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className={`flex items-start justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const f = getProductImage(tpvProducteSeleccionat);
                      return (
                        <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}>
                          {f ? (
                            <img 
                              src={f} 
                              alt={tpvProducteSeleccionat.nom} 
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
                            style={{ display: f ? 'none' : 'flex' }}
                          >
                            <Package className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className={`text-base font-serif font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {tpvProducteSeleccionat.nom}
                      </h3>
                      <p className={`text-xs font-mono font-bold mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                        {formatCurrency(tpvProducteSeleccionat.preuFira || tpvProducteSeleccionat.preuOriginal)} / unitat
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setTpvProducteSeleccionat(null)} className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Selector de Quantitat */}
                <div className="space-y-1 text-center">
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Quantitat</span>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setTpvQuantitat(Math.max(1, tpvQuantitat - 1))}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold cursor-pointer transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      -
                    </button>
                    <span className={`text-2xl font-mono font-black w-12 text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {tpvQuantitat}
                    </span>
                    <button
                      disabled={tpvQuantitat >= tpvProducteSeleccionat.unitatsRestants}
                      onClick={() => setTpvQuantitat(tpvQuantitat + 1)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold cursor-pointer transition-colors disabled:opacity-30 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      +
                    </button>
                  </div>
                  <p className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    (Màxim disponible a la parada: {tpvProducteSeleccionat.unitatsRestants})
                  </p>
                </div>

                {/* Import Total Gran */}
                <div className={`p-3 rounded-xl border text-center ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total a Cobrar</span>
                  <span className={`text-3xl font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {formatCurrency((Number(tpvProducteSeleccionat.preuFira || tpvProducteSeleccionat.preuOriginal)) * tpvQuantitat)}
                  </span>
                </div>

                {/* Botons Grans de Mètode de Pagament */}
                <div className="space-y-2">
                  <span className={`text-xs font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tria mètode per registrar venda:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { setTpvMetode('efectiu'); setTimeout(handleConfirmarVendaTPV, 50); }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold text-xs ${
                        isDark ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200 hover:bg-emerald-900' : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-emerald-500" />
                      <span>Efectiu</span>
                    </button>

                    <button
                      onClick={() => { setTpvMetode('bizum'); setTimeout(handleConfirmarVendaTPV, 50); }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold text-xs ${
                        isDark ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 hover:bg-cyan-900' : 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-900'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-cyan-500" />
                      <span>Bizum</span>
                    </button>

                    <button
                      onClick={() => { setTpvMetode('targeta'); setTimeout(handleConfirmarVendaTPV, 50); }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold text-xs ${
                        isDark ? 'bg-purple-950/80 border-purple-700 text-purple-200 hover:bg-purple-900' : 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-purple-500" />
                      <span>Targeta</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          PESTANYA 3: LIQUIDACIÓ I ARQUEIG DE CAIXA
          =================================================================== */}
      {activeTab === 'liquidacio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Arqueig de Caixa Física */}
            <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center gap-2 font-serif font-bold text-base border-b pb-3 ${
                isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
              }`}>
                <Banknote className="w-5 h-5 text-amber-500" />
                <h4>Arqueig de la Caixa Física (Monedes i Bitllets)</h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span>(+) Fons de canvi inicial portat:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(eventStats?.fonsCaixa || 0)}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span>(+) Total recaptat en Efectiu:</span>
                  <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(eventStats?.totalEfectiu || 0)}</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold ${
                  isDark ? 'bg-amber-950/40 border-amber-500/30' : 'bg-amber-50 border-amber-300'
                }`}>
                  <span className={isDark ? 'text-amber-300' : 'text-amber-950'}>(=) TOTAL QUE HI HA D'HAVER A LA CAIXA:</span>
                  <span className={`font-black text-base ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                    {formatCurrency(eventStats?.caixaEfectiuTotal || 0)}
                  </span>
                </div>
              </div>

              <div className={`pt-2 border-t space-y-2 text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>Altres Canals Digitals:</span>
                <div className={`flex items-center justify-between font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>📱 Bizum al telèfon mòbil:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(eventStats?.totalBizum || 0)}</span>
                </div>
                <div className={`flex items-center justify-between font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>💳 Targeta / Datàfon bancari:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(eventStats?.totalTargeta || 0)}</span>
                </div>
              </div>
            </div>

            {/* Liquidació Econòmica i Col·laborador */}
            <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center gap-2 font-serif font-bold text-base border-b pb-3 ${
                isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
              }`}>
                <Percent className="w-5 h-5 text-amber-500" />
                <h4>Liquidació del Col·laborador i Rendiment del Taller</h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span>Facturació Total de la Fira:</span>
                  <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(eventStats?.totalRecaptat || 0)}</span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span>
                    (-) Comissió {currentEvent.colaborador?.nom ? `per a ${currentEvent.colaborador.nom}` : 'Col·laborador'} ({currentEvent.colaborador?.percentatgeComissio || 0}%):
                  </span>
                  <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>-{formatCurrency(eventStats?.comissioColaborador || 0)}</span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span>(-) Despesa de parada / Lloguer:</span>
                  <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>-{formatCurrency(eventStats?.despesaParada || 0)}</span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold ${
                  isDark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
                }`}>
                  <span className={isDark ? 'text-emerald-300' : 'text-emerald-950'}>(=) NET FINAL PER A MÍNIM MÓN:</span>
                  <span className={`font-black text-base ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>
                    {formatCurrency(eventStats?.netTaller || 0)}
                  </span>
                </div>
              </div>

              {/* Botons destacats per finalitzar la fira o desfer */}
              {currentEvent.estat !== 'tancat' ? (
                <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    onClick={() => setShowCloseConfirmModal(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-200" />
                    <span>Finalitzar Fira (Retornant o Sense Retornar Estocs)</span>
                  </button>
                  {currentEvent.estat === 'en_curs' && (
                    <button
                      onClick={() => handleSetEventStatus('preparacio')}
                      className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isDark ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Desfer inici: Tornar la fira a estat "En Preparació"</span>
                    </button>
                  )}
                  <p className={`text-[10px] text-center mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Podràs triar si reincorporar els romanents al taller o tancar sense alterar estocs.
                  </p>
                </div>
              ) : (
                <div className={`p-3 rounded-xl border text-center text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  ✓ Aquest esdeveniment està tancat.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PESTANYA 4: HISTÒRIC I COMPARATIVA INTERANUAL
          =================================================================== */}
      {activeTab === 'historic' && (
        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-base font-serif font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>Evolució Històrica: "{currentEvent.nom.replace(/\d{4}/, '').trim()}"</span>
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Compara les diferents edicions anuals d'aquesta fira per saber quins productes han triomfat i optimitzar la preparació d'enguany.
            </p>
          </div>

          {/* Taula Comparativa d'Edicions */}
          <div className={`rounded-2xl border overflow-hidden shadow-xs ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b font-bold text-xs flex items-center gap-2 ${
              isDark ? 'border-slate-800 text-white bg-slate-950' : 'border-slate-100 text-slate-900 bg-slate-50'
            }`}>
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Historial d'Edicions Registrades</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono font-bold uppercase text-[11px] tracking-wider ${
                    isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <th className="py-3 px-4">Edició / Any</th>
                    <th className="py-3 px-3">Estat</th>
                    <th className="py-3 px-3 text-right">Facturació Total</th>
                    <th className="py-3 px-3 text-center">Peces Portades</th>
                    <th className="py-3 px-3 text-center">Peces Venudes</th>
                    <th className="py-3 px-3 text-center">% Èxit de Venda</th>
                    <th className="py-3 px-3 text-right">Comissió Col·laborador</th>
                    <th className="py-3 px-4 text-right">Net Taller</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
                  {edicionsComparativa.map(ev => {
                    const vendes = ev.vendes || [];
                    const totRecaptat = vendes.reduce((acc, v) => acc + (v.total || 0), 0);
                    const totPortades = (ev.linies || []).reduce((acc, l) => acc + (l.unitatsInicials || 0), 0);
                    const totVenudes = (ev.linies || []).reduce((acc, l) => acc + (l.unitatsVenudes || 0), 0);
                    const percVenda = totPortades > 0 ? Math.round((totVenudes / totPortades) * 100) : 0;
                    const comissio = totRecaptat * ((ev.colaborador?.percentatgeComissio || 0) / 100);
                    const net = totRecaptat - comissio - (ev.despesaParada || 0);

                    const isCurrent = ev.id === currentEvent.id;

                    return (
                      <tr key={ev.id} className={`${isCurrent ? (isDark ? 'bg-amber-500/15 font-bold' : 'bg-amber-100 font-bold') : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-amber-50/50')}`}>
                        <td className="py-3 px-4 font-sans flex items-center gap-2">
                          <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{ev.edicioAny || '-'}</span>
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{ev.nom}</span>
                          {isCurrent && <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isDark ? 'text-amber-300 bg-amber-950 border border-amber-600/40' : 'text-amber-900 bg-amber-200'}`}>ACTUAL</span>}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ev.estat === 'tancat' 
                              ? (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700') 
                              : (isDark ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/50' : 'bg-emerald-100 text-emerald-800')
                          }`}>
                            {ev.estat}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-right font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatCurrency(totRecaptat)}</td>
                        <td className="py-3 px-3 text-center">{totPortades}</td>
                        <td className={`py-3 px-3 text-center font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totVenudes}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            percVenda >= 70 
                              ? (isDark ? 'text-emerald-300 bg-emerald-950/70 border border-emerald-700/50' : 'text-emerald-800 bg-emerald-100') 
                              : (isDark ? 'text-amber-300 bg-amber-950/70 border border-amber-700/50' : 'text-amber-900 bg-amber-100')
                          }`}>
                            {percVenda}%
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatCurrency(comissio)}</td>
                        <td className={`py-3 px-4 text-right font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rànquing dels Productes Estrella en Aquesta Fira */}
          <div className={`p-5 rounded-2xl border shadow-xs space-y-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h4 className={`text-sm font-serif font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Award className="w-4 h-4 text-amber-500" />
              <span>Rànquing de Productes més Venuts en Aquesta Fira (Totes les Edicions)</span>
            </h4>

            {rankingProductesHistoric.length === 0 ? (
              <p className={`text-xs italic py-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                A mesura que registris vendes en diferents edicions, aquí veuràs quines peces són les més demandades pel públic d'aquesta fira.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {rankingProductesHistoric.slice(0, 6).map((item, idx) => {
                  const percTotal = item.totalPortades > 0 ? Math.round((item.totalVenudes / item.totalPortades) * 100) : 0;
                  return (
                    <div key={item.productId} className={`p-3 border rounded-xl flex items-center gap-3 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <span className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-900'
                      }`}>
                        #{idx + 1}
                      </span>
                      {(() => {
                        const f = getProductImage(item);
                        return (
                          <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            {f ? (
                              <img 
                                src={f} 
                                alt={item.nom} 
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
                              style={{ display: f ? 'none' : 'flex' }}
                            >
                              <Package className="w-4 h-4" />
                            </div>
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex-1 text-xs">
                        <h5 className={`font-serif font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.nom}</h5>
                        <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.totalVenudes} venudes de {item.totalPortades} portades ({percTotal}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: TRASPASSAR PEÇA DEL TALLER A LA FIRA
          =================================================================== */}
      {/* ===================================================================
          MODAL: TRASPASSAR PEÇA DEL TALLER A LA FIRA
          =================================================================== */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'} max-w-xl w-full rounded-2xl border p-6 space-y-4 animate-fadeIn max-h-[90vh] flex flex-col`}>
            <div className={`flex items-center justify-between border-b pb-3 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className={`text-base font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Assignar Peça a l'Esdeveniment
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Defineix quantes en vols portar, quantes n'agafes d'estoc i la resta quedarà pendent per fabricar.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddProductModal(false)} 
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cercador de Productes */}
            <div className="relative shrink-0">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cercar peça per nom o codi..."
                className={`w-full pl-8 pr-3 py-2 border rounded-xl text-xs outline-none focus:border-amber-500 transition-colors ${
                  isDark 
                    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Llistat Seleccionable de Productes */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {productes
                .filter(p => {
                  if (!productSearch.trim()) return true;
                  const q = productSearch.toLowerCase();
                  return (p.nom || '').toLowerCase().includes(q) || (p.codi || '').toLowerCase().includes(q);
                })
                .slice(0, 30)
                .map(p => {
                  const estocTaller = parseInt(p.estocActual, 10) || 0;
                  const estocPositiu = Math.max(0, estocTaller);
                  const isSelected = selectedProductToAdd?.id === p.id;
                  const fotoUrl = getProductImage(p);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductToAdd(p);
                        setPreuFiraInput(String(p.preu || ''));
                        const defTot = 5;
                        setQuantitatTotalFira(defTot);
                        setQuantitatAgafadaEstoc(Math.min(defTot, estocPositiu));
                        setCrearOFPerPendent(true);
                        setPrioritatOFInput('normal');
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? isDark 
                            ? 'border-amber-500 bg-amber-500/20 shadow-xs' 
                            : 'border-amber-500 bg-amber-50/80 shadow-xs ring-1 ring-amber-400'
                          : isDark
                            ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}>
                          {fotoUrl ? (
                            <img 
                              src={fotoUrl} 
                              alt={p.nom} 
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
                            className={`w-full h-full items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                            style={{ display: fotoUrl ? 'none' : 'flex' }}
                          >
                            <Package className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="min-w-0 text-xs">
                          <h5 className={`font-serif font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.nom}</h5>
                          <span className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.codi} • PVP: {formatCurrency(p.preu)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          estocTaller > 0 
                            ? isDark
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isDark
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {estocTaller > 0 ? `${estocTaller} disp. taller` : 'Sense estoc al taller'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Opcions d'assignació quan hi ha un producte seleccionat */}
            {selectedProductToAdd && (() => {
              const estocTaller = parseInt(selectedProductToAdd.estocActual, 10) || 0;
              const estocDisponible = Math.max(0, estocTaller);
              const numTotalFira = Math.max(1, parseInt(quantitatTotalFira, 10) || 1);
              const numAgafadaEstoc = Math.max(0, Math.min(parseInt(quantitatAgafadaEstoc, 10) || 0, numTotalFira, estocDisponible));
              const numPendentFabricar = Math.max(0, numTotalFira - numAgafadaEstoc);
              const selImg = getProductImage(selectedProductToAdd);

              return (
                <div className={`p-4 rounded-xl border space-y-3 shrink-0 text-xs animate-fadeIn ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  {/* Capçalera del Producte Seleccionat amb Informació d'Estoc */}
                  <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        {selImg ? (
                          <img 
                            src={selImg} 
                            alt={selectedProductToAdd.nom} 
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
                          className={`w-full h-full items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                          style={{ display: selImg ? 'none' : 'flex' }}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-serif font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedProductToAdd.nom}</h4>
                        <p className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedProductToAdd.codi || '-'} • PVP: {formatCurrency(selectedProductToAdd.preu)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] block uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Estoc al taller</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold inline-block mt-0.5 border ${
                        estocTaller > 0
                          ? isDark
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isDark
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {estocTaller} unitats
                      </span>
                    </div>
                  </div>

                  {/* 1. QUANTITAT TOTAL A PORTAR A LA FIRA (Independent de l'estoc) */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className={`font-bold text-xs block ${isDark ? 'text-white' : 'text-slate-900'}`}>1. Quantitat total que vols portar a la fira:</span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Independent de l'estoc actual, quantes en vols tenir a la parada?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={quantitatTotalFira}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setQuantitatTotalFira(val);
                            if (parseInt(quantitatAgafadaEstoc, 10) > val) {
                              setQuantitatAgafadaEstoc(Math.min(val, estocDisponible));
                            }
                          }}
                          className={`w-20 p-1.5 text-center border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                            isDark 
                              ? 'bg-slate-950 border-slate-700 text-white' 
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => setQuantitatTotalFira((parseInt(quantitatTotalFira, 10) || 0) + 1)}
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded border cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuantitatTotalFira((parseInt(quantitatTotalFira, 10) || 0) + 5)}
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded border cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. DUES DECISIONS COMPLEMENTÀRIES: ESTOC vs FABRICACIÓ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Decisió 2A: Quantitat a agafar de l'estoc */}
                    <div className={`p-3 rounded-xl border space-y-2 flex flex-col justify-between ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className={`font-bold text-xs block ${isDark ? 'text-white' : 'text-slate-900'}`}>2A. Agafar de l'estoc del taller:</span>
                        <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Disponible: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{estocDisponible}</strong> unitats
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="number"
                          min="0"
                          max={Math.min(numTotalFira, estocDisponible)}
                          value={quantitatAgafadaEstoc}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10);
                            if (isNaN(raw)) {
                              setQuantitatAgafadaEstoc('');
                            } else {
                              setQuantitatAgafadaEstoc(Math.max(0, Math.min(raw, numTotalFira, estocDisponible)));
                            }
                          }}
                          className={`w-full p-1.5 text-center border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                            isDark 
                              ? 'bg-slate-950 border-slate-700 text-white' 
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuantitatAgafadaEstoc(Math.min(numTotalFira, estocDisponible))}
                            className={`flex-1 py-1 px-1 text-[10px] font-medium rounded-md border text-center cursor-pointer transition-colors ${
                              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
                            }`}
                            title="Agafar tot el que hi ha disponible d'estoc fins a cobrir l'objectiu"
                          >
                            Tot ({Math.min(numTotalFira, estocDisponible)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuantitatAgafadaEstoc(0)}
                            className={`flex-1 py-1 px-1 text-[10px] font-medium rounded-md border text-center cursor-pointer transition-colors ${
                              isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                            }`}
                            title="No tocar l'estoc del taller"
                          >
                            Gens (0)
                          </button>
                        </div>
                        <p className={`text-[10px] pt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          📦 Es descomptaran <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{numAgafadaEstoc}</strong> unitats de l'estoc del taller (en restaran {Math.max(0, estocTaller - numAgafadaEstoc)}).
                        </p>
                      </div>
                    </div>

                    {/* Decisió 2B: Pendent per fabricar */}
                    <div className={`p-3 rounded-xl border space-y-2 flex flex-col justify-between transition-colors ${
                      numPendentFabricar > 0
                        ? isDark ? 'bg-amber-950/40 border-amber-500/40' : 'bg-amber-50/80 border-amber-300'
                        : isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300'
                    }`}>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Hammer className={`w-3.5 h-3.5 ${numPendentFabricar > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`} />
                          <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>2B. Pendent per fabricar:</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className={`text-xl font-mono font-bold ${numPendentFabricar > 0 ? (isDark ? 'text-amber-300' : 'text-amber-800') : (isDark ? 'text-emerald-300' : 'text-emerald-800')}`}>
                            {numPendentFabricar}
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>unitats que falten</span>
                        </div>
                      </div>

                      {numPendentFabricar > 0 ? (
                        <div className={`pt-2 border-t space-y-2 ${isDark ? 'border-amber-500/30' : 'border-amber-200'}`}>
                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={crearOFPerPendent}
                              onChange={(e) => setCrearOFPerPendent(e.target.checked)}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className={`text-[11px] font-semibold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Llençar automàticament Ordre de Fabricació (OF) per a les {numPendentFabricar} unitats
                            </span>
                          </label>

                          {crearOFPerPendent && (
                            <div className="pl-5 space-y-1.5 pt-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Prioritat:</span>
                                <select
                                  value={prioritatOFInput}
                                  onChange={(e) => setPrioritatOFInput(e.target.value)}
                                  className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-none focus:border-amber-500 cursor-pointer ${
                                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                >
                                  <option value="normal">⚪ Normal (Per defecte)</option>
                                  <option value="rapid">⚡ Ràpid</option>
                                  <option value="urgent">🟠 Urgent</option>
                                  <option value="tragic">🔴 Tràgic</option>
                                </select>
                              </div>
                              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Client: "Estoc fira" • Comanda: "{currentEvent.nom}" • Data límit: {currentEvent.dataInici || 'Fira'}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`pt-2 border-t ${isDark ? 'border-emerald-500/30' : 'border-emerald-200'}`}>
                          <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                            ✓ Objectiu cobert al 100% amb l'estoc del taller. No caldrà fabricar-ne cap.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preu Fira Promocional */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <span className={`font-semibold block text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Preu Fira Promocional (€):</span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PVP Normal de catàleg: {formatCurrency(selectedProductToAdd.preu)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={preuFiraInput}
                      onChange={(e) => setPreuFiraInput(e.target.value)}
                      className={`w-24 p-1.5 text-right border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                        isDark 
                          ? 'bg-slate-950 border-slate-700 text-amber-400 font-black' 
                          : 'bg-white border-slate-300 text-amber-900 font-black'
                      }`}
                    />
                  </div>
                </div>
              );
            })()}

            <div className={`flex items-center justify-end gap-2 pt-3 border-t shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setShowAddProductModal(false)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancel·lar
              </button>
              <button
                disabled={!selectedProductToAdd}
                onClick={handleAssignarAFira}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs transition-all"
              >
                Confirmar Assignació a la Fira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: EDITAR CONDICIONS DE LA PEÇA ASSIGNADA A LA FIRA
          =================================================================== */}
      {editingLinia && (() => {
        const prod = productes.find(p => p.id === editingLinia.productId);
        const estocTaller = prod ? (parseInt(prod.estocActual, 10) || 0) : 0;
        const fotoUrl = getProductImage(editingLinia);
        const venudes = editingLinia.unitatsVenudes || 0;
        const inicialsOriginals = editingLinia.unitatsInicials || 0;

        const numTotalFira = Math.max(1, parseInt(editLiniaForm.unitatsPrevistes, 10) || 1);
        const numAgafadaEstoc = Math.max(0, parseInt(editLiniaForm.unitatsInicials, 10) || 0);
        const deltaEstoc = numAgafadaEstoc - inicialsOriginals;
        const numPendentFabricar = Math.max(0, numTotalFira - numAgafadaEstoc);
        const maxDisponibleTotal = inicialsOriginals + Math.max(0, estocTaller);

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`${isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'} max-w-xl w-full rounded-2xl border p-6 space-y-4 animate-fadeIn max-h-[90vh] flex flex-col`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className={`text-base font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Modificar Condicions a la Fira
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ajusta l'objectiu, la quantitat agafada de l'estoc del taller, les peces pendents o el preu promocional.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingLinia(null)} 
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
                {/* Info Peça */}
                <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {fotoUrl ? (
                        <img 
                          src={fotoUrl} 
                          alt={editingLinia.nom} 
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
                        className={`w-full h-full items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        style={{ display: fotoUrl ? 'none' : 'flex' }}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-serif font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{editingLinia.nom}</h4>
                      <p className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {editingLinia.codi ? `Codi: ${editingLinia.codi} • ` : ''}PVP Normal: {formatCurrency(editingLinia.preuOriginal || prod?.preu)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] block uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Estoc al taller</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold inline-block mt-0.5 border ${
                      estocTaller > 0
                        ? isDark
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isDark
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {estocTaller} disp. al taller
                    </span>
                  </div>
                </div>

                {/* Avis si ja hi ha vendes */}
                {venudes > 0 && (
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${
                    isDark 
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' 
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Ja s'han venut <strong>{venudes} unitats</strong> en aquesta fira. La quantitat portada no pot ser inferior a aquest nombre.
                    </span>
                  </div>
                )}

                {/* 1. Objectiu Total Fira */}
                <div className={`p-3 rounded-xl border space-y-1.5 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className={`font-bold text-xs block ${isDark ? 'text-white' : 'text-slate-900'}`}>1. Quantitat total objectiu per a la fira:</span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quantes peces en total voldries portar/haver tingut a la parada.</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={Math.max(1, venudes)}
                        value={editLiniaForm.unitatsPrevistes}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setEditLiniaForm(prev => ({ ...prev, unitatsPrevistes: val }));
                        }}
                        className={`w-20 p-1.5 text-center border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditLiniaForm(prev => ({ ...prev, unitatsPrevistes: (parseInt(prev.unitatsPrevistes, 10) || 0) + 1 }))}
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border cursor-pointer ${
                            isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditLiniaForm(prev => ({ ...prev, unitatsPrevistes: (parseInt(prev.unitatsPrevistes, 10) || 0) + 5 }))}
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border cursor-pointer ${
                            isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dues decisions complementàries: Estoc vs Pendent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 2A. Quantitat agafada de l'estoc */}
                  <div className={`p-3 rounded-xl border space-y-2 flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className={`font-bold text-xs block ${isDark ? 'text-white' : 'text-slate-900'}`}>2A. Agafades de l'estoc del taller:</span>
                      <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Actualment a parada: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{editingLinia.unitatsRestants || 0}</strong> restants (de {inicialsOriginals} agafades inicialment).
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="number"
                        min={venudes}
                        max={maxDisponibleTotal}
                        value={editLiniaForm.unitatsInicials}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          if (isNaN(raw)) {
                            setEditLiniaForm(prev => ({ ...prev, unitatsInicials: '' }));
                          } else {
                            setEditLiniaForm(prev => ({ ...prev, unitatsInicials: Math.max(venudes, Math.min(raw, maxDisponibleTotal)) }));
                          }
                        }}
                        className={`w-full p-1.5 text-center border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditLiniaForm(prev => ({ ...prev, unitatsInicials: Math.min(numTotalFira, maxDisponibleTotal) }))}
                          className={`flex-1 py-1 px-1 text-[10px] font-medium rounded-md border text-center cursor-pointer transition-colors ${
                            isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
                          }`}
                          title="Agafar el màxim possible fins a cobrir l'objectiu"
                        >
                          Màx ({Math.min(numTotalFira, maxDisponibleTotal)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditLiniaForm(prev => ({ ...prev, unitatsInicials: venudes }))}
                          className={`flex-1 py-1 px-1 text-[10px] font-medium rounded-md border text-center cursor-pointer transition-colors ${
                            isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                          }`}
                          title="Deixar només les que ja s'han venut i retornar la resta al taller"
                        >
                          Mín ({venudes})
                        </button>
                      </div>
                      <p className={`text-[10px] pt-0.5 leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {deltaEstoc > 0 ? (
                          <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-semibold`}>
                            📦 Es trauran <strong>+{deltaEstoc}</strong> unitats més de l'estoc del taller (en restaran {Math.max(0, estocTaller - deltaEstoc)}).
                          </span>
                        ) : deltaEstoc < 0 ? (
                          <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-semibold`}>
                            ↩️ Es retornaran <strong>{Math.abs(deltaEstoc)}</strong> unitats al taller (en passaran a haver {estocTaller + Math.abs(deltaEstoc)}).
                          </span>
                        ) : (
                          <span>Sense canvi en l'estoc del taller.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 2B. Pendent per fabricar */}
                  <div className={`p-3 rounded-xl border space-y-2 flex flex-col justify-between transition-colors ${
                    numPendentFabricar > 0
                      ? isDark ? 'bg-amber-950/40 border-amber-500/40' : 'bg-amber-50/80 border-amber-300'
                      : isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Hammer className={`w-3.5 h-3.5 ${numPendentFabricar > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`} />
                        <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>2B. Pendent per fabricar:</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className={`text-xl font-mono font-bold ${numPendentFabricar > 0 ? (isDark ? 'text-amber-300' : 'text-amber-800') : (isDark ? 'text-emerald-300' : 'text-emerald-800')}`}>
                          {numPendentFabricar}
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>unitats</span>
                      </div>
                    </div>

                    {numPendentFabricar > 0 ? (
                      <div className={`pt-2 border-t space-y-2 ${isDark ? 'border-amber-500/30' : 'border-amber-200'}`}>
                        <label className="flex items-start gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editLiniaForm.crearOF}
                            onChange={(e) => setEditLiniaForm(prev => ({ ...prev, crearOF: e.target.checked }))}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-semibold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Llençar Ordre de Fabricació (OF) per a les {numPendentFabricar} unitats
                          </span>
                        </label>

                        {editLiniaForm.crearOF && (
                          <div className="pl-5 space-y-1.5 pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Prioritat:</span>
                              <select
                                value={editLiniaForm.prioritatOF}
                                onChange={(e) => setEditLiniaForm(prev => ({ ...prev, prioritatOF: e.target.value }))}
                                className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-none focus:border-amber-500 cursor-pointer ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              >
                                <option value="normal">⚪ Normal</option>
                                <option value="rapid">⚡ Ràpid</option>
                                <option value="urgent">🟠 Urgent</option>
                                <option value="tragic">🔴 Tràgic</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`pt-2 border-t ${isDark ? 'border-emerald-500/30' : 'border-emerald-200'}`}>
                        <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                          ✓ Objectiu cobert al 100% amb l'estoc.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preu Fira Promocional */}
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className={`font-semibold block text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Preu Fira Promocional (€):</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PVP Normal de catàleg: {formatCurrency(editingLinia.preuOriginal || prod?.preu)}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={editLiniaForm.preuFira}
                    onChange={(e) => setEditLiniaForm(prev => ({ ...prev, preuFira: e.target.value }))}
                    className={`w-24 p-1.5 text-right border rounded-lg font-mono font-bold text-sm focus:border-amber-500 outline-none ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-amber-400 font-black' 
                        : 'bg-white border-slate-300 text-amber-900 font-black'
                    }`}
                  />
                </div>
              </div>

              {/* Botons peu de modal */}
              <div className={`flex items-center justify-between gap-2 pt-3 border-t shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => handleEliminarLiniaFira(editingLinia)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
                    isDark ? 'text-rose-400 hover:bg-rose-950/30' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar de la fira</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLinia(null)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditLinia}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
                  >
                    Guardar Canvis
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================
          MODAL: CONFIRMACIÓ DE TANCAMENT I OPCIONS DE RETORN D'ESTOCS
          =================================================================== */}
      {showCloseConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'} max-w-lg w-full rounded-2xl border p-6 space-y-4 animate-fadeIn`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5 text-amber-500">
                <Store className="w-6 h-6" />
                <h3 className={`text-base font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tancar Fira: Opcions d'Estoc</h3>
              </div>
              <button 
                onClick={() => setShowCloseConfirmModal(false)} 
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Tria com vols tancar la fira <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{currentEvent.nom}"</strong>:
            </p>

            <div className={`p-3.5 border rounded-xl space-y-2 text-xs font-mono ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex items-center justify-between font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <span>Total Recaptat:</span>
                <span>{formatCurrency(eventStats?.totalRecaptat || 0)}</span>
              </div>
              <div className={`flex items-center justify-between ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <span>Peces Venudes:</span>
                <span>{eventStats?.totalPecesVenudes || 0} unitats</span>
              </div>
              <div className={`flex items-center justify-between font-bold pt-1 border-t ${
                isDark ? 'border-slate-800 text-amber-400' : 'border-slate-200 text-amber-800'
              }`}>
                <span>Peces Restants a la Parada:</span>
                <span>{eventStats?.totalPecesRestants || 0} unitats</span>
              </div>
            </div>

            {/* Opcions de Tancament */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleTancarEsdevenimentIRetornar}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer group ${
                  isDark
                    ? 'border-amber-500/40 bg-amber-950/30 hover:bg-amber-950/50'
                    : 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <RotateCcw className={`w-5 h-5 shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                <div>
                  <span className={`font-bold text-xs block ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                    1. Tancar Fira i Retornar Romanents a l'Estoc del Taller (Recomanat)
                  </span>
                  <span className={`text-[11px] block mt-0.5 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Reincorpora automàticament les {eventStats?.totalPecesRestants || 0} peces no venudes a l'estoc general del taller per tornar a estar disponibles a la botiga web.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleTancarSenseRetorn}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer group ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-5 h-5 shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
                <div>
                  <span className={`font-bold text-xs block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    2. Tancar Fira SENSE Modificar Estocs (Només Arxiu / Proves)
                  </span>
                  <span className={`text-[11px] block mt-0.5 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tanca la fira i desa la liquidació sense tocar ni alterar l'estoc general del taller. Ideal si estàs fent proves o gestiones l'estoc manualment.
                  </span>
                </div>
              </button>

              {currentEvent.estat === 'en_curs' && (
                <button
                  type="button"
                  onClick={() => {
                    handleSetEventStatus('preparacio');
                    setShowCloseConfirmModal(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer text-xs ${
                    isDark
                      ? 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    3. No tancar: Desfer inici i tornar a <strong className={isDark ? 'text-white' : 'text-slate-900'}>«En Preparació»</strong>
                  </span>
                </button>
              )}
            </div>

            <div className={`flex items-center justify-end pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setShowCloseConfirmModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
