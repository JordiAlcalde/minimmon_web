import React, { useState, useMemo } from 'react';
import { 
  Calculator, Plus, Search, Edit2, Trash2, Copy, Package, Wrench, Cpu, 
  DollarSign, TrendingUp, AlertCircle, FileText, ChevronRight, ChevronDown, ChevronUp, 
  X, Percent, Save, Sparkles, Filter, Layers, CheckCircle2, ArrowRight, ExternalLink, 
  Image as ImageIcon, Sliders, Check, Palette, Type, ZoomIn, Ruler, Scissors, AlertTriangle, MessageSquare
} from 'lucide-react';
import { GIFT_PRODUCTS, MINIATURE_WORLDS } from '../../data/mockData';
import { STITCH_PROJECTS } from '../../data/stitchData';
import { getNextSequentialId } from '../../utils/produccIdUtils';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';
import { parseDecimal, formatDecimal, formatCurrency, formatDecimalInput } from '../../utils/numberUtils';
import DecimalInput from '../common/DecimalInput';

// Helper per determinar si una opció és de text lliure (gravat, inicial, etc.)
const isTextOption = (op) => {
  const t = (op.tipus || '').toLowerCase().trim();
  return t === 'text' || t === 'memo' || t === 'textarea' || t === 'textllarg' || t === 'string' || t === 'camp text' || t === 'camp de text';
};

// Helper per extreure les dimensions d'un tauler a partir de text (nom o descripció del material)
const parseBoardDimensionsFromText = (text) => {
  if (!text) return { length: 300, width: 200 };
  const regex = /(\d+(?:[.,]\d+)?)\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/i;
  const match = text.match(regex);
  if (match) {
    let l = parseDecimal(match[1]);
    let w = parseDecimal(match[2]);
    const unit = (match[3] || 'mm').toLowerCase();
    if (unit === 'cm') {
      l *= 10;
      w *= 10;
    } else if (unit === 'm') {
      l *= 1000;
      w *= 1000;
    }
    if (l > 0 && w > 0) {
      return { length: Math.round(l), width: Math.round(w) };
    }
  }
  return { length: 300, width: 200 };
};

export default function EscandallsManager({ 
  escandalls = [], 
  setEscandalls, 
  materials = [], 
  operacions = [], 
  maquinaria = [], 
  productes = [], 
  families = [], 
  gammes = [], 
  isDark 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeScope, setActiveScope] = useState('productes'); // 'productes' | 'projectes'
  const [filterFamilia, setFilterFamilia] = useState('all');
  const [filterGamma, setFilterGamma] = useState('all');

  // Modal d'Edició / Formulari Principal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscandall, setEditingEscandall] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('base'); // 'base' | 'personalitzacio' | 'resum'
  const [expandedOptionKey, setExpandedOptionKey] = useState(null);

  // Estat per a visualitzar la imatge ampliada (Lightbox)
  const [zoomedImage, setZoomedImage] = useState(null);

  // Estat per a mostrar o ocultar comentaris aclaratoris de línia
  const [showLineComments, setShowLineComments] = useState(true);

  // Estat per a la Calculadora Flotant de Taulers de Fusta
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [calcTargetIndex, setCalcTargetIndex] = useState(null);
  const [calcBoardLength, setCalcBoardLength] = useState(300);
  const [calcBoardWidth, setCalcBoardWidth] = useState(200);
  const [calcPieceLength, setCalcPieceLength] = useState(100);
  const [calcPieceWidth, setCalcPieceWidth] = useState(50);
  const [calcMargin, setCalcMargin] = useState(5); // 5 mm per cantó (+10 mm de marge total)
  const [calcRepeticions, setCalcRepeticions] = useState(1); // Repeticions per peces superposades/enganxades
  const [calcSelectedMaterialNom, setCalcSelectedMaterialNom] = useState('');
  const [calcSelectedMaterialUnit, setCalcSelectedMaterialUnit] = useState('u');
  const [calcApplyMode, setCalcApplyMode] = useState('fraction'); // 'fraction' | 'm2' | 'cm2'

  // Finestra Flotant de Selecció de Producte (per a Nou Escandall)
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerFamilia, setPickerFamilia] = useState('all');
  const [pickerGamma, setPickerGamma] = useState('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Finestra Flotant de Selecció de Projecte
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectPickerType, setProjectPickerType] = useState('stitch'); // 'stitch' | 'worlds' | 'custom'

  // Finestra Flotant de Duplicació d'Escandall (Triar producte destí sense escandall)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatingSourceEsc, setDuplicatingSourceEsc] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('unlinked'); // 'unlinked' | 'custom'
  const [duplicateSelectedProductId, setDuplicateSelectedProductId] = useState('');
  const [duplicateCustomName, setDuplicateCustomName] = useState('');
  const [duplicateSearchQuery, setDuplicateSearchQuery] = useState('');

  // Estat del formulari de l'escandall
  const [formData, setFormData] = useState({
    producteNom: '',
    producteId: '',
    producteCodi: '',
    producteImatge: '',
    preuWebActual: 0,
    tipus: 'Producte Web', // 'Producte Web' | 'Projecte Món Mínim' | 'Obra Singular' | 'A Mida'
    mermePercent: 8,
    margePercent: 65,
    notes: '',
    materials: [],
    operacions: [],
    maquinaria: [],
    opcionsCostos: {}
  });

  // Obtenir productes combinats (Firestore "productes" + fallbacks)
  const allCatalogProducts = useMemo(() => {
    if (productes && productes.length > 0) return productes;
    return GIFT_PRODUCTS.map(g => ({
      id: g.id,
      nom: g.title,
      codi: g.code || `REG-${g.id}`,
      preu: g.price || 0,
      imatgePrincipal: g.image,
      opcionsPersonalitzacio: g.customOptions || []
    }));
  }, [productes]);

  // Productes del catàleg que ENCARA NO tenen cap escandall creat
  const unlinkedProducts = useMemo(() => {
    return allCatalogProducts.filter(p => {
      const hasEsc = escandalls.some(e => 
        (e.producteId && String(e.producteId) === String(p.id)) ||
        (p.codi && e.producteCodi === p.codi) ||
        (p.nom && String(e.producteNom).toLowerCase().trim() === String(p.nom).toLowerCase().trim())
      );
      return !hasEsc;
    });
  }, [allCatalogProducts, escandalls]);

  // Productes no vinculats filtrats segons la cerca del modal de duplicació
  const filteredUnlinkedProducts = useMemo(() => {
    if (!duplicateSearchQuery.trim()) return unlinkedProducts;
    const q = duplicateSearchQuery.toLowerCase().trim();
    return unlinkedProducts.filter(p => 
      (p.nom || p.title || '').toLowerCase().includes(q) ||
      (p.codi || p.code || '').toLowerCase().includes(q)
    );
  }, [unlinkedProducts, duplicateSearchQuery]);

  // Gammes disponibles per al filtre de la barra superior
  const availableGammesForMain = useMemo(() => {
    if (filterFamilia === 'all') return gammes;
    const selectedFamObj = families.find(f => f.id === filterFamilia || f.nom === filterFamilia);
    const famNom = selectedFamObj ? selectedFamObj.nom : filterFamilia;
    return gammes.filter(g => g.familiaNom === famNom || g.familiaId === filterFamilia);
  }, [gammes, families, filterFamilia]);

  // Gammes filtrades per a la finestra flotant de selecció
  const availableGammesForPicker = useMemo(() => {
    if (pickerFamilia === 'all') return gammes;
    const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
    const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
    return gammes.filter(g => g.familiaNom === famNom || g.familiaId === pickerFamilia);
  }, [gammes, families, pickerFamilia]);

  // Productes filtrats a la finestra flotant de selecció
  const filteredPickerProducts = useMemo(() => {
    return allCatalogProducts.filter(p => {
      if (pickerFamilia !== 'all') {
        const selectedFamObj = families.find(f => f.id === pickerFamilia || f.nom === pickerFamilia);
        const famNom = selectedFamObj ? selectedFamObj.nom : pickerFamilia;
        const matchesFam = (Array.isArray(p.familaIds) && p.familaIds.includes(famNom)) ||
                           (Array.isArray(p.familiaIds) && p.familiaIds.includes(pickerFamilia)) ||
                           p.familia === famNom;
        if (!matchesFam) return false;
      }

      if (pickerGamma !== 'all') {
        const matchesGam = (Array.isArray(p.gammaIds) && p.gammaIds.includes(pickerGamma)) ||
                           p.gammaId === pickerGamma;
        if (!matchesGam) return false;
      }

      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const matchesName = (p.nom || p.title || '').toLowerCase().includes(q);
        const matchesCode = (p.codi || '').toLowerCase().includes(q);
        const matchesDesc = (p.descripcio || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }

      return true;
    });
  }, [allCatalogProducts, pickerFamilia, pickerGamma, pickerSearch, families]);

  // Obrir el selector segons l'àmbit actiu
  const handleOpenCreateClick = () => {
    if (activeScope === 'productes') {
      setPickerFamilia(filterFamilia);
      setPickerGamma(filterGamma);
      setPickerSearch('');
      setProductPickerOpen(true);
    } else {
      setProjectPickerType('stitch');
      setProjectPickerOpen(true);
    }
  };

  // En seleccionar un producte des de la finestra flotant -> obre directament l'edició omplint els camps
  const handleSelectProductAndOpenEdit = (prod) => {
    const rawImage = prod.imatgePrincipal || (Array.isArray(prod.imatges) && prod.imatges[0]) || prod.image || prod.imatge || '';
    
    // Inicialitzar opcions si en té
    const initialOpcionsCostos = {};
    if (Array.isArray(prod.opcionsPersonalitzacio)) {
      prod.opcionsPersonalitzacio.forEach(op => {
        const titol = op.titol || 'Opció';
        initialOpcionsCostos[titol] = {};
        
        if (isTextOption(op)) {
          // Camp de text lliure: 1 única entrada de cost
          initialOpcionsCostos[titol]['Text Personalitzat'] = {
            sobrecost: 0,
            tempsMinuts: 0,
            isBase: true
          };
        } else {
          // Desplegable o selecció de valors
          let vList = [];
          if (typeof op.valors === 'string') {
            vList = op.valors.split(',').map(v => v.trim()).filter(v => v && v !== '...');
          } else if (Array.isArray(op.valors)) {
            vList = op.valors.filter(v => v && v !== '...');
          }
          if (vList.length === 0) {
            vList = ['Opció Estàndard'];
          }
          vList.forEach((val, idx) => {
            initialOpcionsCostos[titol][val] = {
              sobrecost: 0,
              tempsMinuts: 0,
              isBase: idx === 0
            };
          });
        }
      });
    }

    setEditingEscandall(null);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      producteNom: prod.nom || prod.title || prod.titol || 'Sense nom',
      producteId: prod.id,
      producteCodi: prod.codi || prod.code || '',
      producteImatge: rawImage,
      preuWebActual: Number(prod.preu || prod.price || 0),
      tipus: 'Producte Web',
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: [],
      opcionsCostos: initialOpcionsCostos
    });

    setProductPickerOpen(false);
    setModalOpen(true);
  };

  // En seleccionar un projecte des de la finestra flotant
  const handleSelectProjectAndOpenEdit = (proj, tipusLabel) => {
    setEditingEscandall(null);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      producteNom: proj.titol || proj.title || 'Projecte Nou',
      producteId: proj.id || `proj-${Date.now()}`,
      producteCodi: proj.codi || proj.id || '',
      producteImatge: proj.imatge || proj.image || '',
      preuWebActual: Number(proj.price || 0),
      tipus: tipusLabel,
      mermePercent: 8,
      margePercent: 65,
      notes: '',
      materials: [],
      operacions: [],
      maquinaria: [],
      opcionsCostos: {}
    });

    setProjectPickerOpen(false);
    setModalOpen(true);
  };

  // Obrir modal per editar un escandall existent
  const handleOpenEdit = (esc) => {
    setEditingEscandall(esc);
    setActiveModalTab('base');
    setExpandedOptionKey(null);
    setFormData({
      ...esc,
      materials: esc.materials ? esc.materials.map(m => ({ ...m })) : [],
      operacions: esc.operacions ? esc.operacions.map(o => ({ ...o })) : [],
      maquinaria: esc.maquinaria ? esc.maquinaria.map(mq => ({ ...mq })) : [],
      opcionsCostos: esc.opcionsCostos ? JSON.parse(JSON.stringify(esc.opcionsCostos)) : {}
    });
    setModalOpen(true);
  };

  // Iniciar la Duplicació d'un Escandall (Obre el modal per triar producte o còpia lliure)
  const handleStartDuplicate = (esc) => {
    setDuplicatingSourceEsc(esc);
    setDuplicateSearchQuery('');
    const defaultCustom = `${esc.producteNom || 'Producte'} (Còpia)`;
    setDuplicateCustomName(defaultCustom);

    if (unlinkedProducts.length > 0) {
      setDuplicateMode('unlinked');
      setDuplicateSelectedProductId(unlinkedProducts[0].id);
    } else {
      setDuplicateMode('custom');
      setDuplicateSelectedProductId('');
    }
    setDuplicateModalOpen(true);
  };

  // Confirmar i Executar la Duplicació sobre el producte triat
  const handleConfirmDuplicate = () => {
    if (!duplicatingSourceEsc) return;

    let targetProduct = null;
    let targetName = '';

    if (duplicateMode === 'unlinked') {
      targetProduct = unlinkedProducts.find(p => p.id === duplicateSelectedProductId);
      if (!targetProduct) {
        alert('Si us plau, selecciona un producte del catàleg que encara no tingui escandall.');
        return;
      }
      targetName = targetProduct.nom || targetProduct.title || 'Producte Sense Nom';
    } else {
      targetName = duplicateCustomName.trim();
      if (!targetName) {
        alert('Si us plau, introdueix el nom del nou escandall duplicat.');
        return;
      }
    }

    const newId = getNextSequentialId('esc', escandalls);
    const rawImage = targetProduct
      ? (targetProduct.imatgePrincipal || (Array.isArray(targetProduct.imatges) && targetProduct.imatges[0]) || targetProduct.image || targetProduct.imatge || '')
      : (duplicatingSourceEsc.producteImatge || '');

    // Inicialitzar / adaptar les opcions de personalització segons el producte destí
    let newOpcionsCostos = {};
    if (targetProduct && Array.isArray(targetProduct.opcionsPersonalitzacio) && targetProduct.opcionsPersonalitzacio.length > 0) {
      targetProduct.opcionsPersonalitzacio.forEach(op => {
        const titol = op.titol || 'Opció';
        newOpcionsCostos[titol] = {};
        
        const sourceOpMap = duplicatingSourceEsc.opcionsCostos ? duplicatingSourceEsc.opcionsCostos[titol] : null;

        if (isTextOption(op)) {
          newOpcionsCostos[titol]['Text Personalitzat'] = sourceOpMap?.['Text Personalitzat']
            ? { ...sourceOpMap['Text Personalitzat'] }
            : { sobrecost: 0, tempsMinuts: 0, isBase: true };
        } else {
          let vList = [];
          if (typeof op.valors === 'string') {
            vList = op.valors.split(',').map(v => v.trim()).filter(v => v && v !== '...');
          } else if (Array.isArray(op.valors)) {
            vList = op.valors.filter(v => v && v !== '...');
          }
          if (vList.length === 0) vList = ['Opció Estàndard'];

          vList.forEach((val, idx) => {
            newOpcionsCostos[titol][val] = sourceOpMap?.[val]
              ? { ...sourceOpMap[val] }
              : { sobrecost: 0, tempsMinuts: 0, isBase: idx === 0 };
          });
        }
      });
    } else if (duplicatingSourceEsc.opcionsCostos) {
      newOpcionsCostos = JSON.parse(JSON.stringify(duplicatingSourceEsc.opcionsCostos));
    }

    const cloned = {
      id: newId,
      producteNom: targetName,
      producteId: targetProduct ? targetProduct.id : `proj-${Date.now()}`,
      producteCodi: targetProduct ? (targetProduct.codi || targetProduct.code || '') : (duplicatingSourceEsc.producteCodi || ''),
      producteImatge: rawImage,
      preuWebActual: targetProduct ? Number(targetProduct.preuBase !== undefined ? targetProduct.preuBase : targetProduct.preu || 0) : Number(duplicatingSourceEsc.preuWebActual || 0),
      tipus: targetProduct ? 'Producte Web' : duplicatingSourceEsc.tipus,
      mermePercent: duplicatingSourceEsc.mermePercent !== undefined ? duplicatingSourceEsc.mermePercent : 8,
      margePercent: duplicatingSourceEsc.margePercent !== undefined ? duplicatingSourceEsc.margePercent : 65,
      notes: duplicatingSourceEsc.notes || '',
      materials: duplicatingSourceEsc.materials ? duplicatingSourceEsc.materials.map(m => ({ ...m })) : [],
      operacions: duplicatingSourceEsc.operacions ? duplicatingSourceEsc.operacions.map(o => ({ ...o })) : [],
      maquinaria: duplicatingSourceEsc.maquinaria ? duplicatingSourceEsc.maquinaria.map(mq => ({ ...mq })) : [],
      opcionsCostos: newOpcionsCostos
    };

    setEscandalls(prev => [...prev, cloned]);
    setDuplicateModalOpen(false);

    // Obrir directament l'escandall nou duplicat per revisar/editar
    handleOpenEdit(cloned);
  };

  // Eliminar escandall
  const handleDelete = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest escandall de fabricació?')) {
      setEscandalls(prev => prev.filter(e => e.id !== id));
    }
  };

  // Guardar escandall
  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.producteNom.trim()) {
      alert('Si us plau, especifica el nom del producte o projecte.');
      return;
    }

    if (editingEscandall) {
      setEscandalls(prev => prev.map(e => e.id === editingEscandall.id ? { ...formData, id: e.id } : e));
    } else {
      const newId = getNextSequentialId('esc', escandalls);
      setEscandalls(prev => [...prev, { ...formData, id: newId }]);
    }
    setModalOpen(false);
  };

  // Reordenar línies (Materials, Operacions, Maquinària) amunt / avall
  const handleMoveArrayItem = (listKey, index, direction) => {
    setFormData(prev => {
      const list = [...(prev[listKey] || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, [listKey]: list };
    });
  };

  // Helper càlculs de costos globals d'un escandall (Preus unitaris amb 3 decimals, totals/margins amb 2 decimals)
  const calculateCosts = (esc) => {
    if (!esc) return { costMat: 0, costOp: 0, costMaq: 0, baseCost: 0, mermeAmount: 0, totalCost: 0, marginAmount: 0, pvpRecomanat: 0 };

    const costMat = (esc.materials || []).reduce((acc, item) => {
      if (!item.materialId) return acc;
      const mat = materials.find(m => m.id === item.materialId);
      const unitCost = mat ? (mat.preuProPrin !== undefined ? Number(mat.preuProPrin) : Number(item.costUnitari || 0)) : Number(item.costUnitari || 0);
      return acc + (Number(item.quantitat || 0) * unitCost);
    }, 0);

    const costOp = (esc.operacions || []).reduce((acc, item) => {
      if (!item.operacioId) return acc;
      const op = operacions.find(o => o.id === item.operacioId);
      const hourCost = op ? (op.preuHora !== undefined ? Number(op.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
      return acc + ((Number(item.tempsMinuts || 0) / 60) * hourCost);
    }, 0);

    const costMaq = (esc.maquinaria || []).reduce((acc, item) => {
      if (!item.maquinaId) return acc;
      const maq = maquinaria.find(m => m.id === item.maquinaId);
      const hourCost = maq ? (maq.preuHora !== undefined ? Number(maq.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
      return acc + ((Number(item.tempsMinuts || 0) / 60) * hourCost);
    }, 0);

    const baseCost = costMat + costOp + costMaq;
    const mermeAmount = baseCost * ((esc.mermePercent || 0) / 100);
    const totalCost = baseCost + mermeAmount;

    const marginAmount = totalCost * ((esc.margePercent || 0) / 100);
    const pvpRecomanat = totalCost + marginAmount;

    return {
      costMat,
      costOp,
      costMaq,
      baseCost,
      mermeAmount,
      totalCost,
      marginAmount,
      pvpRecomanat
    };
  };

  // Detectar producte vinculat
  const currentLinkedProduct = useMemo(() => {
    if (!formData.producteId) return null;
    return allCatalogProducts.find(p => p.id === formData.producteId) || null;
  }, [allCatalogProducts, formData.producteId]);

  // Resolució del nom de Família i Gamma per al producte vinculat
  const currentFamiliaNom = useMemo(() => {
    if (!currentLinkedProduct) return '';
    if (currentLinkedProduct.familia) return currentLinkedProduct.familia;
    if (Array.isArray(currentLinkedProduct.familaIds) && currentLinkedProduct.familaIds.length > 0) {
      const fId = currentLinkedProduct.familaIds[0];
      const famObj = families.find(f => f.id === fId || f.nom === fId);
      return famObj ? famObj.nom : fId;
    }
    if (Array.isArray(currentLinkedProduct.familiaIds) && currentLinkedProduct.familiaIds.length > 0) {
      const fId = currentLinkedProduct.familiaIds[0];
      const famObj = families.find(f => f.id === fId || f.nom === fId);
      return famObj ? famObj.nom : fId;
    }
    return '';
  }, [currentLinkedProduct, families]);

  const currentGammaNom = useMemo(() => {
    if (!currentLinkedProduct) return '';
    if (currentLinkedProduct.gamma) return currentLinkedProduct.gamma;
    if (currentLinkedProduct.gammaNom) return currentLinkedProduct.gammaNom;
    if (Array.isArray(currentLinkedProduct.gammaIds) && currentLinkedProduct.gammaIds.length > 0) {
      const gId = currentLinkedProduct.gammaIds[0];
      const gamObj = gammes.find(g => g.id === gId || g.nom === gId);
      return gamObj ? gamObj.nom : gId;
    }
    if (currentLinkedProduct.gammaId) {
      const gamObj = gammes.find(g => g.id === currentLinkedProduct.gammaId || g.nom === currentLinkedProduct.gammaId);
      return gamObj ? gamObj.nom : currentLinkedProduct.gammaId;
    }
    return '';
  }, [currentLinkedProduct, gammes]);

  // Detectar opcions de personalització disponibles per al producte vinculat
  const detectedCustomizationOptions = useMemo(() => {
    if (!currentLinkedProduct) return [];
    const ops = currentLinkedProduct.opcionsPersonalitzacio;
    if (!Array.isArray(ops)) return [];

    return ops.map(op => {
      const isText = isTextOption(op);
      let valuesList = [];

      if (isText) {
        // Camp de text (gravat, inicial, etc.): només 1 cost de personalització
        valuesList = ['Text Personalitzat'];
      } else {
        if (typeof op.valors === 'string') {
          valuesList = op.valors.split(',').map(v => v.trim()).filter(v => v && v !== '...');
        } else if (Array.isArray(op.valors)) {
          valuesList = op.valors.filter(v => v && v !== '...');
        }
        if (valuesList.length === 0) {
          valuesList = ['Opció Estàndard'];
        }
      }

      return {
        titol: op.titol || 'Opció',
        tipus: isText ? 'text' : (op.tipus || 'desplegable'),
        isText,
        valors: valuesList
      };
    });
  }, [currentLinkedProduct]);

  // Canviar sobrecost d'un valor d'opció
  const handleUpdateOptionSurcharge = (opTitol, valorName, field, value) => {
    setFormData(prev => {
      const current = { ...(prev.opcionsCostos || {}) };
      if (!current[opTitol]) current[opTitol] = {};
      if (!current[opTitol][valorName]) current[opTitol][valorName] = { sobrecost: 0 };

      current[opTitol][valorName] = {
        ...current[opTitol][valorName],
        [field]: value
      };
      return { ...prev, opcionsCostos: current };
    });
  };

  // Obrir Calculadora de Taulers per a un material concret de la taula
  const handleOpenCalculatorForMaterial = (idx) => {
    const item = formData.materials[idx];
    if (!item) return;
    const matObj = materials.find(m => m.id === item.materialId);
    const combinedText = `${matObj?.material || ''} ${matObj?.descripcio || ''}`;
    const detected = parseBoardDimensionsFromText(combinedText);

    setCalcTargetIndex(idx);
    setCalcSelectedMaterialNom(matObj?.material || 'Material seleccionat');
    setCalcSelectedMaterialUnit(matObj?.unitat || 'u');
    setCalcBoardLength(detected.length);
    setCalcBoardWidth(detected.width);
    setCalcPieceLength(100);
    setCalcPieceWidth(50);
    setCalcMargin(5);
    setCalcRepeticions(1);
    
    const isM2 = matObj?.unitat?.toLowerCase() === 'm²' || matObj?.unitat?.toLowerCase() === 'm2';
    setCalcApplyMode(isM2 ? 'm2' : 'fraction');
    setCalcModalOpen(true);
  };

  // Obrir Calculadora de Taulers de forma general
  const handleOpenCalculatorGeneral = () => {
    setCalcTargetIndex(null);
    setCalcSelectedMaterialNom('Calculadora Lliure');
    setCalcSelectedMaterialUnit('u');
    setCalcBoardLength(300);
    setCalcBoardWidth(200);
    setCalcPieceLength(100);
    setCalcPieceWidth(50);
    setCalcMargin(5);
    setCalcRepeticions(1);
    setCalcApplyMode('fraction');
    setCalcModalOpen(true);
  };

  // Aplicar el valor calculat al camp quantitat del material invocat
  const handleApplyCalculatorResult = (finalValue) => {
    if (calcTargetIndex !== null && formData.materials[calcTargetIndex]) {
      const next = [...formData.materials];
      next[calcTargetIndex].quantitat = finalValue;
      setFormData({ ...formData, materials: next });
    }
    setCalcModalOpen(false);
  };

  // Càlculs matemàtics interns de la calculadora de taulers
  const calcResults = useMemo(() => {
    const bL = Math.max(1, Number(calcBoardLength) || 1);
    const bW = Math.max(1, Number(calcBoardWidth) || 1);
    const pL = Math.max(0, Number(calcPieceLength) || 0);
    const pW = Math.max(0, Number(calcPieceWidth) || 0);
    const marg = Math.max(0, Number(calcMargin) || 0);
    const rep = Math.max(1, parseDecimal(calcRepeticions, 1));

    // Mida efectiva de tall d'una peça amb marge (+2*marg mm en total)
    const effLength = pL + (marg * 2);
    const effWidth = pW + (marg * 2);

    const boardAreaMm2 = bL * bW;
    const pieceEffAreaMm2Single = effLength * effWidth;
    const pieceEffAreaMm2 = pieceEffAreaMm2Single * rep;

    const boardAreaCm2 = boardAreaMm2 / 100;
    const pieceEffAreaCm2Val = pieceEffAreaMm2 / 100;
    const pieceEffAreaM2Val = pieceEffAreaMm2 / 1000000;

    // Fracció de tauler d'una peça multiplicada per Repeticions
    const rawBoardFractionSingle = boardAreaMm2 > 0 ? (pieceEffAreaMm2Single / boardAreaMm2) : 0;
    const rawBoardFraction = rawBoardFractionSingle * rep;

    // Arrodoniments a 2 decimals a l'alça sobre el resultat total (multiplicat per Repeticions)
    const roundedBoardFraction = Math.ceil(rawBoardFraction * 100) / 100;
    const roundedM2 = Math.ceil(pieceEffAreaM2Val * 100) / 100;
    const roundedCm2 = Math.ceil(pieceEffAreaCm2Val * 100) / 100;

    // Quantes peces d'1 sola capa caben teòricament en el tauler
    const singlePiecesAlongL = Math.floor(bL / effLength);
    const singlePiecesAlongW = Math.floor(bW / effWidth);
    const singlePiecesTotal = (singlePiecesAlongL > 0 && singlePiecesAlongW > 0) ? (singlePiecesAlongL * singlePiecesAlongW) : 0;
    const piecesTotal = Math.floor(singlePiecesTotal / rep);

    return {
      rep,
      effLength,
      effWidth,
      boardAreaCm2,
      pieceRawAreaMm2: pL * pW * rep,
      pieceEffAreaCm2: pieceEffAreaCm2Val,
      pieceEffAreaM2: pieceEffAreaM2Val,
      rawBoardFractionSingle,
      rawBoardFraction,
      roundedBoardFraction,
      roundedM2,
      roundedCm2,
      piecesTotal
    };
  }, [calcBoardLength, calcBoardWidth, calcPieceLength, calcPieceWidth, calcMargin, calcRepeticions]);

  // Recomptes per àmbit
  const countProductes = escandalls.filter(e => !e.tipus || e.tipus === 'Producte Web').length;
  const countProjectes = escandalls.filter(e => e.tipus && e.tipus !== 'Producte Web').length;

  // Filtrar llista d'escandalls segons l'àmbit triat, Família, Gamma i cerca
  const filteredEscandalls = escandalls
    .filter(e => {
      const isProducte = !e.tipus || e.tipus === 'Producte Web';
      if (activeScope === 'productes' && !isProducte) return false;
      if (activeScope === 'projectes' && isProducte) return false;

      // Filtres específics de Família i Gamma per a Productes
      if (activeScope === 'productes') {
        const prod = allCatalogProducts.find(p => p.id === e.producteId || p.codi === e.producteCodi || p.nom === e.producteNom);
        
        if (filterFamilia !== 'all') {
          const selFam = families.find(f => f.id === filterFamilia || f.nom === filterFamilia);
          const famNom = selFam ? selFam.nom : filterFamilia;
          const matchesFam = prod && (
            (Array.isArray(prod.familaIds) && prod.familaIds.includes(famNom)) ||
            (Array.isArray(prod.familiaIds) && prod.familiaIds.includes(filterFamilia)) ||
            prod.familia === famNom ||
            e.familia === famNom
          );
          if (!matchesFam) return false;
        }

        if (filterGamma !== 'all') {
          const matchesGam = prod && (
            (Array.isArray(prod.gammaIds) && prod.gammaIds.includes(filterGamma)) ||
            prod.gammaId === filterGamma ||
            e.gamma === filterGamma
          );
          if (!matchesGam) return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (e.producteNom || '').toLowerCase().includes(q) ||
                              (e.producteCodi || '').toLowerCase().includes(q) ||
                              (e.notes || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    })
    .sort((a, b) => (a.producteNom || '').localeCompare(b.producteNom || '', 'ca', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      {/* Capçalera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold font-serif flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Calculator className="w-6 h-6 text-amber-500" />
            Escandalls & Càlcul de Costos i Preus
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Desglossament tècnic de materials, hores de taller, maquinària i sobrecostos de personalització.
          </p>
        </div>

        <button
          onClick={handleOpenCreateClick}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {activeScope === 'productes' ? 'Nou Escandall de Producte' : 'Nou Escandall de Projecte'}
        </button>
      </div>

      {/* Selectors d'Àmbit (Productes vs Projectes), Filtres de Família/Gamma i Cerca */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* 1. Botons de Selecció: Productes vs Projectes */}
        <div className={`flex items-center p-1 rounded-xl border shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => {
              setActiveScope('productes');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'productes'
                ? 'bg-amber-600 text-white shadow-sm'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Productes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeScope === 'productes' ? 'bg-amber-800 text-white' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700')
            }`}>
              {countProductes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScope('projectes');
              setFilterFamilia('all');
              setFilterGamma('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'projectes'
                ? 'bg-amber-600 text-white shadow-sm'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Projectes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeScope === 'projectes' ? 'bg-amber-800 text-white' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700')
            }`}>
              {countProjectes}
            </span>
          </button>
        </div>

        {/* 2. Filtres Dinàmics de Família i Gamma (Només quan s'ha triat 'Productes') */}
        {activeScope === 'productes' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Desplegable Família */}
            <select
              value={filterFamilia}
              onChange={(e) => {
                setFilterFamilia(e.target.value);
                setFilterGamma('all');
              }}
              className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Filtrar per Família"
            >
              <option value="all">Totes les Famílies</option>
              {families.map(f => (
                <option key={f.id} value={f.nom || f.id}>{f.nom}</option>
              ))}
            </select>

            {/* Desplegable Gamma */}
            <select
              value={filterGamma}
              onChange={(e) => setFilterGamma(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Filtrar per Gamma"
            >
              <option value="all">Totes les Gammes</option>
              {availableGammesForMain.map(g => (
                <option key={g.id} value={g.nom || g.id}>{g.nom}</option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Barra de Cerca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeScope === 'productes' ? "Cerca producte de catàleg, codi, descripció..." : "Cerca projecte món mínim, singular o a mida..."}
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

      {/* LLISTAT EN FORMAT D'AMPLE A AMPLE (Fitxes Horitzontals Compactes) */}
      <div className="space-y-3">
        {filteredEscandalls.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
            {activeScope === 'productes' 
              ? "No hi ha cap escandall de Productes de Catàleg amb els filtres seleccionats."
              : "No hi ha cap escandall de Projectes amb els filtres seleccionats."
            }
          </div>
        ) : (
          filteredEscandalls.map(esc => {
            const costs = calculateCosts(esc);
            const matPct = costs.baseCost > 0 ? (costs.costMat / costs.baseCost) * 100 : 0;
            const opPct = costs.baseCost > 0 ? (costs.costOp / costs.baseCost) * 100 : 0;
            const maqPct = costs.baseCost > 0 ? (costs.costMaq / costs.baseCost) * 100 : 0;
            
            const preuWeb = Number(esc.preuWebActual || 0);

            const displayImage = esc.producteImatge 
              ? (resolveProducteMediaUrl(esc.producteImatge) || resolveMediaUrl(esc.producteImatge))
              : '';

            return (
              <div
                key={esc.id}
                className={`w-full p-3 sm:p-4 rounded-2xl border flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* 1. Bloc Esquerre: Identificació Producte / Projecte */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    onClick={() => displayImage && setZoomedImage(displayImage)}
                    className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center relative group ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                    } ${displayImage ? 'cursor-pointer hover:border-amber-500/60 transition-all' : ''}`}
                    title={displayImage ? "Clica per ampliar la imatge" : ""}
                  >
                    {displayImage ? (
                      <>
                        <img
                          src={displayImage}
                          alt={esc.producteNom}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </>
                    ) : (
                      activeScope === 'productes' ? <Package className="w-5 h-5 text-amber-500/50" /> : <Palette className="w-5 h-5 text-amber-500/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h3 className={`font-bold text-sm sm:text-base font-serif truncate mr-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={esc.producteNom}>
                        {esc.producteNom}
                      </h3>
                      {esc.producteCodi && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                          {esc.producteCodi}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                        {esc.tipus || 'Producte Web'}
                      </span>
                    </div>

                    <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {esc.materials?.length || 0} materials, {esc.operacions?.length || 0} operacions{esc.maquinaria?.length ? `, ${esc.maquinaria.length} màquines` : ''}
                    </p>

                    {/* Notes generals de fabricació (esc.notes) */}
                    {esc.notes && esc.notes.trim() && (
                      <div className={`mt-1.5 pt-1.5 border-t flex items-start gap-1.5 text-[11px] ${isDark ? 'border-slate-800/60 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                        <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        <p className="italic font-sans line-clamp-2" title={esc.notes}>
                          {esc.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blocs Numèrics de la Targeta Horitzontal */}
                <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 shrink-0 text-xs">
                  
                  {/* 2. Bloc: Desglossament de Costos */}
                  <div className={`p-2.5 rounded-xl border min-w-[170px] flex-1 sm:flex-none flex flex-col justify-center space-y-0.5 ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Materials ({formatDecimal(matPct, 0)}%):</span>
                      <strong className={`font-mono ml-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(costs.costMat, 2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Mà d'obra ({formatDecimal(opPct, 0)}%):</span>
                      <strong className={`font-mono ml-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(costs.costOp, 2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Maquinària ({formatDecimal(maqPct, 0)}%):</span>
                      <strong className={`font-mono ml-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(costs.costMaq, 2)}</strong>
                    </div>
                  </div>

                  {/* 3. Bloc: Cost de Fabricació & Marges */}
                  <div className={`p-2.5 rounded-xl border min-w-[210px] flex-1 sm:flex-none flex flex-col justify-center space-y-0.5 ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Cost de fabricació:</span>
                      <strong className={`font-mono ml-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(costs.totalCost, 2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Marge comercial (+{esc.margePercent || 65}%):</span>
                      <strong className={`font-mono ml-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(costs.marginAmount, 2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>PVP suggerit:</span>
                      <strong className={`font-mono font-bold ml-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{formatCurrency(costs.pvpRecomanat, 2)}</strong>
                    </div>
                  </div>

                  {/* 4. Bloc: PVP Web / Venda */}
                  <div className={`p-2.5 rounded-xl border min-w-[110px] text-center flex flex-col justify-center shrink-0 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PVP Web:</span>
                    <span className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {preuWeb > 0 ? formatCurrency(preuWeb, 2) : formatCurrency(costs.pvpRecomanat, 2)}
                    </span>
                  </div>

                  {/* 5. Bloc: Botons d'Acció */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 shrink-0 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(esc)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-700 hover:bg-slate-200'
                      }`}
                      title="Editar Escandall"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDuplicate(esc)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-700 hover:bg-slate-200'
                      }`}
                      title="Duplicar escandall a un altre producte o còpia"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(esc.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-200'
                      }`}
                      title="Eliminar Escandall"
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

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT: SELECTOR DE PRODUCTE A ESCANDALLAR */}
      {/* ========================================================================= */}
      {productPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-3xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera del Selector */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 text-slate-100">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>Selecciona el Producte a Escandallar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtra per Família i Gamma per localitzar la peça ràpidament.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProductPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra Superior de Filtres (Família, Gamma i Cerca) */}
            <div className={`p-4 border-b flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Filtre Família */}
              <select
                value={pickerFamilia}
                onChange={(e) => {
                  setPickerFamilia(e.target.value);
                  setPickerGamma('all');
                }}
                className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer flex-1 sm:flex-none sm:w-48 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">Totes les Famílies</option>
                {families.map(f => (
                  <option key={f.id} value={f.nom || f.id}>{f.nom}</option>
                ))}
              </select>

              {/* Filtre Gamma */}
              <select
                value={pickerGamma}
                onChange={(e) => setPickerGamma(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer flex-1 sm:flex-none sm:w-48 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">Totes les Gammes</option>
                {availableGammesForPicker.map(g => (
                  <option key={g.id} value={g.nom || g.id}>{g.nom}</option>
                ))}
              </select>

              {/* Cerca Ràpida */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca per nom o codi..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500/50' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Llista de Productes per Seleccionar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPickerProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No s'ha trobat cap producte que coincideixi amb els filtres seleccionats.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredPickerProducts.map(p => {
                    const pImg = p.imatgePrincipal || (Array.isArray(p.imatges) && p.imatges[0]) || p.image || '';
                    const resImg = resolveProducteMediaUrl(pImg) || resolveMediaUrl(pImg);

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProductAndOpenEdit(p)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isDark 
                            ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/[0.04]' 
                            : 'bg-white border-slate-200 hover:border-amber-500 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {resImg ? (
                              <img src={resImg} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <Package className="w-5 h-5 text-amber-500/50" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {p.codi && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {p.codi}
                                </span>
                              )}
                              {Array.isArray(p.opcionsPersonalitzacio) && p.opcionsPersonalitzacio.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                                  {p.opcionsPersonalitzacio.length} opcions
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-100 text-xs truncate">
                              {p.nom || p.title}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {p.preu ? (
                            <span className="font-mono font-bold text-xs text-amber-400 block">{Number(p.preu).toFixed(2)} €</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block">Sense preu</span>
                          )}
                          <span className="text-[10px] text-amber-400/80 hover:underline flex items-center justify-end gap-1 mt-0.5 font-semibold">
                            Triar <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT: SELECTOR DE PROJECTE */}
      {/* ========================================================================= */}
      {projectPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 text-slate-100">
                  <Palette className="w-5 h-5 text-amber-500" />
                  <span>Selecciona el Projecte a Escandallar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tria entre projectes de Mons Mínims, obres singulars o crea'n un a mida.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProjectPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-xl hover:bg-slate-800 transition-colors"
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 border-b flex items-center gap-2 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setProjectPickerType('stitch')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'stitch' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Mons Mínims
              </button>
              <button
                type="button"
                onClick={() => setProjectPickerType('worlds')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'worlds' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Obres Singulars
              </button>
              <button
                type="button"
                onClick={() => setProjectPickerType('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  projectPickerType === 'custom' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Nou a Mida
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projectPickerType === 'stitch' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STITCH_PROJECTS.map(sp => (
                    <div
                      key={sp.id}
                      onClick={() => handleSelectProjectAndOpenEdit(sp, 'Projecte Món Mínim')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60' : 'bg-white border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-400 font-mono block">{sp.escala || 'Món Mínim'}</span>
                        <h4 className="font-bold text-slate-100 text-xs truncate">{sp.titol}</h4>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold shrink-0 flex items-center gap-1">
                        Triar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {projectPickerType === 'worlds' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MINIATURE_WORLDS.map(mw => (
                    <div
                      key={mw.id}
                      onClick={() => handleSelectProjectAndOpenEdit(mw, 'Obra Singular')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60' : 'bg-white border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-400 font-mono block">{mw.price ? `${Number(mw.price).toFixed(2)} €` : 'Exposició'}</span>
                        <h4 className="font-bold text-slate-100 text-xs truncate">{mw.title}</h4>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold shrink-0 flex items-center gap-1">
                        Triar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {projectPickerType === 'custom' && (
                <div className="p-6 text-center space-y-4">
                  <p className="text-xs text-slate-300">
                    Crea un escandall per a un projecte personalitzat o encàrrec a mida des de zero.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectProjectAndOpenEdit({ titol: 'Nou Projecte a Mida' }, 'A Mida')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
                  >
                    Començar Escandall a Mida
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT D'EDICIÓ DE L'ESCANDALL (CENTRADOR EN LA PEÇA TRIADA) */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera Modal */}
            <div className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-base sm:text-lg font-bold font-serif flex items-center gap-2 truncate mr-3">
                <Calculator className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {editingEscandall ? (
                    <>
                      Editar Escandall : <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{formData.producteNom || 'Sense nom'}</span>
                    </>
                  ) : (
                    activeScope === 'productes' ? 'Nou Escandall de Producte' : 'Nou Escandall de Projecte'
                  )}
                </span>
              </h3>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  form="escandall-modal-form"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  title="Guardar Escandall"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Escandall</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className={`p-1.5 cursor-pointer rounded-xl transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Tancar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selector de Pestanyes del Modal */}
            <div className={`flex items-center border-b px-6 gap-2 shrink-0 overflow-x-auto ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100/70'
            }`}>
              <button
                type="button"
                onClick={() => setActiveModalTab('base')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'base'
                    ? (isDark ? 'border-amber-500 text-amber-400 font-bold' : 'border-amber-600 text-amber-800 font-extrabold')
                    : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>1. Escandall Base & Dades</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('personalitzacio')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'personalitzacio'
                    ? (isDark ? 'border-amber-500 text-amber-400 font-bold' : 'border-amber-600 text-amber-800 font-extrabold')
                    : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2. Opcions de Personalització ({detectedCustomizationOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('resum')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'resum'
                    ? (isDark ? 'border-amber-500 text-amber-400 font-bold' : 'border-amber-600 text-amber-800 font-extrabold')
                    : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900')
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>3. Resum de Costos & PVP</span>
              </button>
            </div>

            {/* Contingut del Formulari */}
            <form id="escandall-modal-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* ================= PESTANYA 1: PRODUCTE & BASE ================= */}
              {activeModalTab === 'base' && (
                <div className="space-y-6">
                  
                  {/* IDENTIFICADOR NET DE LA PEÇA / PRODUCTE TRIAT */}
                  {(() => {
                    const displayModalImage = formData.producteImatge 
                      ? (resolveProducteMediaUrl(formData.producteImatge) || resolveMediaUrl(formData.producteImatge))
                      : '';

                    return (
                      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                        isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/90'
                      }`}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Miniatura amb clic per ampliar (Lightbox) */}
                          <div 
                            onClick={() => displayModalImage && setZoomedImage(displayModalImage)}
                            className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center relative group ${
                              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                            } ${displayModalImage ? 'cursor-pointer hover:border-amber-500/60 transition-all' : ''}`}
                            title={displayModalImage ? "Clica per ampliar la imatge" : ""}
                          >
                            {displayModalImage ? (
                              <>
                                <img
                                  src={displayModalImage}
                                  alt={formData.producteNom}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </>
                            ) : (
                              <Package className="w-6 h-6 text-amber-500/50" />
                            )}
                          </div>

                          <div className="min-w-0">
                            {/* Píndoles: Tipus + Família + Gamma */}
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                                isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                              }`}>
                                {formData.tipus || 'Producte Web'}
                              </span>
                              {currentFamiliaNom && (
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
                                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}>
                                  {currentFamiliaNom}
                                </span>
                              )}
                              {currentGammaNom && (
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
                                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}>
                                  {currentGammaNom}
                                </span>
                              )}
                            </div>

                            <h4 className={`font-bold text-sm sm:text-base font-serif truncate ${
                              isDark ? 'text-slate-100' : 'text-slate-900'
                            }`}>
                              {formData.producteNom || 'Sense nom'}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => setShowLineComments(!showLineComments)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-all shadow-xs ${
                              showLineComments
                                ? (isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' : 'bg-amber-100 text-amber-900 border-amber-400 font-bold')
                                : (isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300')
                            }`}
                            title="Mostrar / Ocultar comentaris aclaratoris a totes les línies"
                          >
                            <MessageSquare className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                            <span>{showLineComments ? 'Notes: Visibles' : 'Mostrar notes'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenCalculatorGeneral}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-all shadow-xs ${
                              isDark 
                                ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/30' 
                                : 'bg-white hover:bg-slate-100 text-amber-800 border-amber-300 font-bold'
                            }`}
                            title="Obrir Calculadora de Mides de Taulers i Peces de Fusta"
                          >
                            <Calculator className="w-3.5 h-3.5 text-amber-600" />
                            <span>Calculadora Tauler</span>
                          </button>

                          {formData.preuWebActual > 0 && (
                            <div className={`text-left sm:text-right shrink-0 p-2.5 rounded-xl border ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                            }`}>
                              <span className={`text-[10px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>PVP Botiga Web</span>
                              <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{Number(formData.preuWebActual).toFixed(2)} €</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Taula 1: MATERIALS DE FABRICACIÓ */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <div className="flex items-center justify-between pb-1">
                      <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        <Package className="w-4 h-4 text-amber-500" /> 1. Consum de Materials
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            materials: [...prev.materials, { materialId: '', costUnitari: 0, quantitat: 1 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        + Afegir Material
                      </button>
                    </div>

                    {/* Capçalera de Columnes per a Materials */}
                    {formData.materials.length > 0 && (
                      <div className={`grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider select-none ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <div className="col-span-5">Material</div>
                        <div className="col-span-2 text-left">Preu / u</div>
                        <div className="col-span-3 text-left">Quantitat</div>
                        <div className="col-span-1 text-left">Cost</div>
                        <div className="col-span-1 text-right"></div>
                      </div>
                    )}

                    {formData.materials.length === 0 ? (
                      <p className={`text-[11px] italic py-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No s'ha assignat cap material encara.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.materials.map((item, idx) => {
                          const matObj = materials.find(m => m.id === item.materialId);
                          // Preu unitari amb 3 decimals directament del material de catàleg
                          const unitCost = matObj ? (matObj.preuProPrin !== undefined ? Number(matObj.preuProPrin) : Number(item.costUnitari || 0)) : Number(item.costUnitari || 0);
                          const subtotal = Number(item.quantitat || 0) * unitCost;

                          return (
                            <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${
                              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                            }`}>
                              {/* 1. Columna Material (Nom pur sense preu encastat) */}
                              <div className="col-span-5">
                                <select
                                  value={item.materialId || ''}
                                  onChange={(e) => {
                                    const newMatId = e.target.value;
                                    const newMatObj = materials.find(m => m.id === newMatId);
                                    const next = [...formData.materials];
                                    next[idx].materialId = newMatId;
                                    next[idx].costUnitari = newMatObj ? Number(newMatObj.preuProPrin || 0) : 0;
                                    setFormData({ ...formData, materials: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-medium'
                                  }`}
                                >
                                  <option value="">-- Tria un material ... --</option>
                                  {[...materials].sort((a, b) => (a.material || '').localeCompare(b.material || '', 'ca')).map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.material}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Columna Preu / u (Píndola Pròpia amb 3 Decimals) */}
                              <div className="col-span-2 flex justify-start items-center">
                                {matObj ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-lg border font-mono text-xs font-semibold shadow-2xs ${
                                    isDark ? 'bg-slate-950 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                  }`}>
                                    {formatDecimal(unitCost, 3)} € / {matObj.unitat || 'u'}
                                  </span>
                                ) : (
                                  <span className={`font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                                )}
                              </div>

                              {/* 3. Columna Quantitat */}
                              <div className="col-span-3 flex items-center gap-1.5">
                                <DecimalInput
                                  value={item.quantitat}
                                  onChange={(e, num) => {
                                    const next = [...formData.materials];
                                    next[idx].quantitat = num;
                                    setFormData({ ...formData, materials: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border font-mono text-center text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                  }`}
                                  placeholder="Quantitat"
                                />
                                <span className={`text-[10px] shrink-0 min-w-[20px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{matObj?.unitat || 'u'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculatorForMaterial(idx)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                    isDark ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border-amber-500/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                                  }`}
                                  title="Calcular quantitat de tauler segons les mides de la peça"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* 4. Columna Cost Subtotal (2 Decimals de cara a clients / total) */}
                              <div className={`col-span-1 text-left font-mono font-bold text-xs truncate ${
                                isDark ? 'text-amber-400' : 'text-amber-800'
                              }`}>
                                {formatCurrency(subtotal, 2)}
                              </div>

                              {/* 5. Columna Accions (Moure Amunt, Moure Avall, Eliminar) */}
                              <div className="col-span-1 flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveArrayItem('materials', idx, -1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === 0 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia amunt"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formData.materials.length - 1}
                                  onClick={() => handleMoveArrayItem('materials', idx, 1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === formData.materials.length - 1 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia avall"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      materials: formData.materials.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className={`p-1 cursor-pointer rounded transition-colors ${
                                    isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                                  }`}
                                  title="Eliminar línia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                                
                                {/* Sub-Fila: Comentari aclaratori per a aquesta línia */}
                                {showLineComments && (
                                  <div className={`col-span-12 pt-1.5 flex items-center gap-2 border-t mt-1 ${
                                    isDark ? 'border-slate-800/60' : 'border-slate-200'
                                  }`}>
                                    <span className={`text-[10px] font-mono font-medium shrink-0 flex items-center gap-1 ${
                                      isDark ? 'text-amber-400' : 'text-amber-800 font-bold'
                                    }`}>
                                      <MessageSquare className="w-3 h-3" /> Nota:
                                    </span>
                                    <input
                                      type="text"
                                      value={item.comentari || ''}
                                      onChange={(e) => {
                                        const next = [...formData.materials];
                                        next[idx].comentari = e.target.value;
                                        setFormData({ ...formData, materials: next });
                                      }}
                                      placeholder="Comentari aclaratori (ex: Marge de tall 3mm, color de fusta roure...)..."
                                      className={`w-full text-xs px-2.5 py-1 rounded-lg italic outline-none border ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500/60' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                                      }`}
                                    />
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Taula 2: OPERACIONS DE TALLER */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <div className="flex items-center justify-between pb-1">
                      <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        <Wrench className="w-4 h-4 text-emerald-500" /> 2. Operacions de Mà d'Obra (Taller)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            operacions: [...prev.operacions, { operacioId: '', costHora: 0, tempsMinuts: 10 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        + Afegir Operació
                      </button>
                    </div>

                    {/* Capçalera de Columnes per a Operacions */}
                    {formData.operacions.length > 0 && (
                      <div className={`grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider select-none ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <div className="col-span-5">Operació</div>
                        <div className="col-span-2 text-left">Preu / h</div>
                        <div className="col-span-3 text-left">Temps (minuts)</div>
                        <div className="col-span-1 text-left">Cost</div>
                        <div className="col-span-1 text-right"></div>
                      </div>
                    )}

                    {formData.operacions.length === 0 ? (
                      <p className={`text-[11px] italic py-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No s'ha assignat cap operació encara.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.operacions.map((item, idx) => {
                          const opObj = operacions.find(o => o.id === item.operacioId);
                          const hourCost = opObj ? (opObj.preuHora !== undefined ? Number(opObj.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
                          const subtotal = (Number(item.tempsMinuts || 0) / 60) * hourCost;

                          return (
                            <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${
                              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                            }`}>
                              <div className="col-span-5">
                                <select
                                  value={item.operacioId || ''}
                                  onChange={(e) => {
                                    const newOpId = e.target.value;
                                    const newOpObj = operacions.find(o => o.id === newOpId);
                                    const next = [...formData.operacions];
                                    next[idx].operacioId = newOpId;
                                    next[idx].costHora = newOpObj ? Number(newOpObj.preuHora || 0) : 0;
                                    setFormData({ ...formData, operacions: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-medium'
                                  }`}
                                >
                                  <option value="">-- Tria una operació ... --</option>
                                  {[...operacions].sort((a, b) => (a.operacio || '').localeCompare(b.operacio || '', 'ca')).map(o => (
                                    <option key={o.id} value={o.id}>
                                      {o.operacio}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Píndola de Preu / h amb 3 Decimals */}
                              <div className="col-span-2 flex justify-start items-center">
                                {opObj ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-lg border font-mono text-xs font-semibold shadow-2xs ${
                                    isDark ? 'bg-slate-950 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                                  }`}>
                                    {formatDecimal(hourCost, 3)} €/h
                                  </span>
                                ) : (
                                  <span className={`font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                                )}
                              </div>

                              <div className="col-span-3 flex items-center gap-1.5">
                                <DecimalInput
                                  value={item.tempsMinuts}
                                  onChange={(e, num) => {
                                    const next = [...formData.operacions];
                                    next[idx].tempsMinuts = num;
                                    setFormData({ ...formData, operacions: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border font-mono text-center text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                  }`}
                                  placeholder="Minuts"
                                />
                                <span className={`text-[10px] shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>min</span>
                              </div>

                              <div className={`col-span-1 text-left font-mono font-semibold text-xs truncate ${
                                isDark ? 'text-emerald-400' : 'text-emerald-800 font-bold'
                              }`}>
                                {formatCurrency(subtotal, 2)}
                              </div>

                              {/* Accions Operació */}
                              <div className="col-span-1 flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveArrayItem('operacions', idx, -1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === 0 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia amunt"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formData.operacions.length - 1}
                                  onClick={() => handleMoveArrayItem('operacions', idx, 1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === formData.operacions.length - 1 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia avall"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      operacions: formData.operacions.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className={`p-1 cursor-pointer rounded transition-colors ${
                                    isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                                  }`}
                                  title="Eliminar línia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Sub-Fila: Comentari aclaratori per a aquesta línia */}
                              {showLineComments && (
                                <div className={`col-span-12 pt-1.5 flex items-center gap-2 border-t mt-1 ${
                                  isDark ? 'border-slate-800/60' : 'border-slate-200'
                                }`}>
                                  <span className={`text-[10px] font-mono font-medium shrink-0 flex items-center gap-1 ${
                                    isDark ? 'text-emerald-400' : 'text-emerald-800 font-bold'
                                  }`}>
                                    <MessageSquare className="w-3 h-3" /> Nota:
                                  </span>
                                  <input
                                    type="text"
                                    value={item.comentari || ''}
                                    onChange={(e) => {
                                      const next = [...formData.operacions];
                                      next[idx].comentari = e.target.value;
                                      setFormData({ ...formData, operacions: next });
                                    }}
                                    placeholder="Comentari aclaratori (ex: Polit manual amb gra 240, muntatge delicat...)..."
                                    className={`w-full text-xs px-2.5 py-1 rounded-lg italic outline-none border ${
                                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500/60' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Taula 3: MAQUINÀRIA */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <div className="flex items-center justify-between pb-1">
                      <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        <Cpu className="w-4 h-4 text-sky-500" /> 3. Amortització & Ús de Maquinària
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            maquinaria: [...prev.maquinaria, { maquinaId: '', costHora: 0, tempsMinuts: 5 }]
                          }));
                        }}
                        className="px-2.5 py-1 bg-sky-600/80 hover:bg-sky-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        + Afegir Màquina
                      </button>
                    </div>

                    {/* Capçalera de Columnes per a Maquinària */}
                    {formData.maquinaria.length > 0 && (
                      <div className={`grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider select-none ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <div className="col-span-5">Màquina</div>
                        <div className="col-span-2 text-left">Preu / h</div>
                        <div className="col-span-3 text-left">Temps (minuts)</div>
                        <div className="col-span-1 text-left">Cost</div>
                        <div className="col-span-1 text-right"></div>
                      </div>
                    )}

                    {formData.maquinaria.length === 0 ? (
                      <p className={`text-[11px] italic py-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No s'ha assignat cap maquinària.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.maquinaria.map((item, idx) => {
                          const maqObj = maquinaria.find(m => m.id === item.maquinaId);
                          const hourCost = maqObj ? (maqObj.preuHora !== undefined ? Number(maqObj.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
                          const subtotal = (Number(item.tempsMinuts || 0) / 60) * hourCost;

                          return (
                            <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${
                              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                            }`}>
                              <div className="col-span-5">
                                <select
                                  value={item.maquinaId || ''}
                                  onChange={(e) => {
                                    const newMaqId = e.target.value;
                                    const newMaqObj = maquinaria.find(m => m.id === newMaqId);
                                    const next = [...formData.maquinaria];
                                    next[idx].maquinaId = newMaqId;
                                    next[idx].costHora = newMaqObj ? Number(newMaqObj.preuHora || 0) : 0;
                                    setFormData({ ...formData, maquinaria: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-medium'
                                  }`}
                                >
                                  <option value="">-- Tria una màquina ... --</option>
                                  {[...maquinaria].sort((a, b) => (a.maquina || '').localeCompare(b.maquina || '', 'ca')).map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.maquina}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Píndola de Preu / h amb 3 Decimals */}
                              <div className="col-span-2 flex justify-start items-center">
                                {maqObj ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-lg border font-mono text-xs font-semibold shadow-2xs ${
                                    isDark ? 'bg-slate-950 border-sky-500/30 text-sky-400' : 'bg-sky-100 border-sky-300 text-sky-900 font-bold'
                                  }`}>
                                    {formatDecimal(hourCost, 3)} €/h
                                  </span>
                                ) : (
                                  <span className={`font-mono text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                                )}
                              </div>

                              <div className="col-span-3 flex items-center gap-1.5">
                                <DecimalInput
                                  value={item.tempsMinuts}
                                  onChange={(e, num) => {
                                    const next = [...formData.maquinaria];
                                    next[idx].tempsMinuts = num;
                                    setFormData({ ...formData, maquinaria: next });
                                  }}
                                  className={`w-full p-1.5 rounded-lg border font-mono text-center text-xs ${
                                    isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                  }`}
                                  placeholder="Minuts"
                                />
                                <span className={`text-[10px] shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>min</span>
                              </div>

                              <div className={`col-span-1 text-left font-mono font-semibold text-xs truncate ${
                                isDark ? 'text-sky-400' : 'text-sky-800 font-bold'
                              }`}>
                                {formatCurrency(subtotal, 2)}
                              </div>

                              {/* Accions Maquinària */}
                              <div className="col-span-1 flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveArrayItem('maquinaria', idx, -1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === 0 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800' : 'text-slate-500 hover:text-sky-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia amunt"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formData.maquinaria.length - 1}
                                  onClick={() => handleMoveArrayItem('maquinaria', idx, 1)}
                                  className={`p-1 rounded transition-colors ${
                                    idx === formData.maquinaria.length - 1 ? 'text-slate-300 cursor-not-allowed opacity-30' : (isDark ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800' : 'text-slate-500 hover:text-sky-700 hover:bg-slate-100')
                                  }`}
                                  title="Moure línia avall"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      maquinaria: formData.maquinaria.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className={`p-1 cursor-pointer rounded transition-colors ${
                                    isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                                  }`}
                                  title="Eliminar línia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Sub-Fila: Comentari aclaratori per a aquesta línia */}
                              {showLineComments && (
                                <div className={`col-span-12 pt-1.5 flex items-center gap-2 border-t mt-1 ${
                                  isDark ? 'border-slate-800/60' : 'border-slate-200'
                                }`}>
                                  <span className={`text-[10px] font-mono font-medium shrink-0 flex items-center gap-1 ${
                                    isDark ? 'text-sky-400' : 'text-sky-800 font-bold'
                                  }`}>
                                    <MessageSquare className="w-3 h-3" /> Nota:
                                  </span>
                                  <input
                                    type="text"
                                    value={item.comentari || ''}
                                    onChange={(e) => {
                                      const next = [...formData.maquinaria];
                                      next[idx].comentari = e.target.value;
                                      setFormData({ ...formData, maquinaria: next });
                                    }}
                                    placeholder="Comentari aclaratori (ex: Lent 2.5 polzades, potència 45%, gravat vectorial...)..."
                                    className={`w-full text-xs px-2.5 py-1 rounded-lg italic outline-none border ${
                                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500/60' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= PESTANYA 2: OPCIONS DE PERSONALITZACIÓ ================= */}
              {activeModalTab === 'personalitzacio' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <h4 className={`font-bold flex items-center gap-1.5 text-xs mb-1 ${
                      isDark ? 'text-amber-400' : 'text-amber-900 font-extrabold'
                    }`}>
                      <Sliders className="w-4 h-4" /> Sobrecostos Interns de Personalització (Escandall)
                    </h4>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Configura el cost intern directe de taller o matèria primera per a cadascuna de les opcions de personalització. <em>Nota: Aquests valors són estrictament informatius per a l'escandall intern de fabricació; els preus de venda al públic web es gestionen directament des de la definició de l'article a l'Àrea Privada.</em>
                    </p>
                  </div>

                  {detectedCustomizationOptions.length === 0 ? (
                    <div className={`p-8 rounded-2xl border border-dashed text-center ${
                      isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-600'
                    }`}>
                      Aquest producte no té opcions de personalització definides al catàleg de la botiga.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectedCustomizationOptions.map(op => {
                        const isExpanded = expandedOptionKey === op.titol;
                        const currentValObj = formData.opcionsCostos[op.titol] || {};

                        return (
                          <div key={op.titol} className={`rounded-2xl border overflow-hidden ${
                            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
                          }`}>
                            <div
                              onClick={() => setExpandedOptionKey(isExpanded ? null : op.titol)}
                              className={`p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
                                isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{op.titol}</span>
                                {op.isText ? (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                                    isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                                  }`}>
                                    <Type className="w-3 h-3" /> Camp de Text Lliure
                                  </span>
                                ) : (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300 font-medium'
                                  }`}>
                                    {op.valors.length} valors seleccionables
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className={`p-4 pt-2 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                {op.isText ? (
                                  // OPCIÓ DE TEXT LLIURE (1 ÚNICA FILA PER ASSIGNAR COST DE GRAVAT/TEXT)
                                  (() => {
                                    const valConfig = currentValObj['Text Personalitzat'] || 
                                                      currentValObj[Object.keys(currentValObj)[0]] || 
                                                      { sobrecost: 0, tempsMinuts: 0 };

                                    return (
                                      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white shadow-2xs'
                                      }`}>
                                        <div>
                                          <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                            <Type className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Personalització de Text / Gravat</span>
                                          </div>
                                          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                            El client introdueix el text/inicial a la botiga web. Defineix el cost fix o temps extra si s'aplica.
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Sobrecost directe (€):</label>
                                            <DecimalInput
                                              step={0.5}
                                              value={valConfig.sobrecost || 0}
                                              onChange={(e, num) => handleUpdateOptionSurcharge(op.titol, 'Text Personalitzat', 'sobrecost', num)}
                                              className={`w-20 p-1 rounded-lg border font-mono text-right ${
                                                isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                              }`}
                                            />
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Minuts extra:</label>
                                            <DecimalInput
                                              step={0.5}
                                              value={valConfig.tempsMinuts || 0}
                                              onChange={(e, num) => handleUpdateOptionSurcharge(op.titol, 'Text Personalitzat', 'tempsMinuts', num)}
                                              className={`w-16 p-1 rounded-lg border font-mono text-right ${
                                                isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                              }`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  // OPCIONS DESPLEGABLES / SELECCIÓ
                                  op.valors.map(valName => {
                                    const valConfig = currentValObj[valName] || { sobrecost: 0, tempsMinuts: 0 };

                                    return (
                                      <div key={valName} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white shadow-2xs'
                                      }`}>
                                        <div>
                                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{valName}</div>
                                          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Opció: {op.titol}</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Sobrecost directe (€):</label>
                                            <DecimalInput
                                              step={0.5}
                                              value={valConfig.sobrecost || 0}
                                              onChange={(e, num) => handleUpdateOptionSurcharge(op.titol, valName, 'sobrecost', num)}
                                              className={`w-20 p-1 rounded-lg border font-mono text-right ${
                                                isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                              }`}
                                            />
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Minuts extra:</label>
                                            <DecimalInput
                                              step={0.5}
                                              value={valConfig.tempsMinuts || 0}
                                              onChange={(e, num) => handleUpdateOptionSurcharge(op.titol, valName, 'tempsMinuts', num)}
                                              className={`w-16 p-1 rounded-lg border font-mono text-right ${
                                                isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                                              }`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= PESTANYA 3: RESUM I MARGES ================= */}
              {activeModalTab === 'resum' && (
                <div className="space-y-6">
                  {/* Paràmetres Econòmics Globals */}
                  <div className={`p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-4 ${
                    isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div>
                      <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Percentatge de Mermes / Desperdici (%)</label>
                      <DecimalInput
                        value={formData.mermePercent}
                        onChange={(e, num) => setFormData({ ...formData, mermePercent: num })}
                        className={`w-full p-2 rounded-xl border font-mono ${
                          isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                        }`}
                        placeholder="Ex: 8"
                      />
                    </div>

                    <div>
                      <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Marge Comercial Desitjat (%)</label>
                      <DecimalInput
                        value={formData.margePercent}
                        onChange={(e, num) => setFormData({ ...formData, margePercent: num })}
                        className={`w-full p-2 rounded-xl border font-mono ${
                          isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-bold'
                        }`}
                        placeholder="Ex: 65"
                      />
                    </div>
                  </div>

                  {/* Quadre Resum Econòmic (Costos amb 2 Decimals per a client/web) */}
                  {(() => {
                    const previewCosts = calculateCosts(formData);
                    return (
                      <div className={`p-5 rounded-2xl border space-y-4 ${
                        isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-300/80 bg-amber-50/60 shadow-xs'
                      }`}>
                        <h4 className={`font-bold text-sm font-serif flex items-center gap-2 ${
                          isDark ? 'text-amber-400' : 'text-amber-900 font-extrabold'
                        }`}>
                          <TrendingUp className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} /> Resultat del Càlcul Tècnic d'Escandall
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className={`p-3 rounded-xl border ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cost Materials</span>
                            <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(previewCosts.costMat, 2)}</span>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cost Mà d'Obra</span>
                            <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(previewCosts.costOp, 2)}</span>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cost Maquinària</span>
                            <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(previewCosts.costMaq, 2)}</span>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mermes (+{formatDecimal(formData.mermePercent, 1)}%)</span>
                            <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCurrency(previewCosts.mermeAmount, 2)}</span>
                          </div>
                        </div>

                        <div className={`pt-3 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 text-center items-stretch ${
                          isDark ? 'border-amber-500/20' : 'border-amber-200'
                        }`}>
                          <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-semibold mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cost Total de Fabricació</span>
                            <span className={`font-mono font-extrabold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(previewCosts.totalCost, 2)}</span>
                          </div>

                          <div className={`p-2.5 rounded-xl border flex flex-col justify-center items-center ${
                            isDark ? 'bg-amber-600/20 border-amber-500/40 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          }`}>
                            <span className={`text-[10px] uppercase block font-bold mb-0.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>PVP Recomanat (+{formatDecimal(formData.margePercent, 1)}% marge)</span>
                            <span className={`font-mono font-extrabold text-base ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>{formatCurrency(previewCosts.pvpRecomanat, 2)}</span>
                          </div>

                          <div className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1 ${
                            isDark ? 'bg-slate-950 border-amber-500/30' : 'bg-white border-amber-300/80 shadow-2xs'
                          }`}>
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>Preu Actual Botiga Web (€)</span>
                              {previewCosts.pvpRecomanat > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, preuWebActual: Math.round(previewCosts.pvpRecomanat * 100) / 100 })}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold cursor-pointer border transition-colors shrink-0 ${
                                    isDark ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold'
                                  }`}
                                  title="Copiar el PVP Recomanat al Preu Web"
                                >
                                  Copiar PVP
                                </button>
                              )}
                            </div>
                            <DecimalInput
                              decimals={2}
                              value={formData.preuWebActual}
                              onChange={(e, num) => setFormData({ ...formData, preuWebActual: num })}
                              className={`w-full py-1 px-2 rounded-lg border font-mono font-extrabold text-base text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 ${
                                isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-300 bg-slate-50 text-slate-900'
                              }`}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes Internes */}
                  <div>
                    <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Notes i Observacions Tècniques de Fabricació</label>
                    <textarea
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className={`w-full p-2.5 rounded-xl border outline-none resize-none ${
                        isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-300 bg-white text-slate-900 font-medium'
                      }`}
                      placeholder="Observacions del procés de fabricació, consells de muntatge..."
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CALCULADORA DE TAULERS I MIDES DE FUSTA */}
      {/* ========================================================================= */}
      {calcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera de la Calculadora */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm font-serif flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Calculadora de Tauler
                  </h3>
                  <p className={`text-[10px] truncate max-w-[240px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {calcSelectedMaterialNom}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCalcModalOpen(false)}
                className={`p-1.5 cursor-pointer rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Tancar calculadora"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cos de la Calculadora */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              
              {/* 1. Mides del Tauler Brut (Tauler) */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`font-bold flex items-center gap-1.5 text-[11px] ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
                    <Layers className="w-3.5 h-3.5" /> 1. Mides del Tauler seleccionat (mm)
                  </label>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {calcResults.boardAreaCm2.toFixed(0)} cm²
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Llargada (mm):</span>
                    <DecimalInput
                      value={calcBoardLength}
                      onChange={(e, num) => setCalcBoardLength(num)}
                      className={`w-full p-2 rounded-lg border font-mono text-center outline-none transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-100 focus:border-amber-500/50' : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                      }`}
                      placeholder="Llargada mm"
                    />
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Amplada (mm):</span>
                    <DecimalInput
                      value={calcBoardWidth}
                      onChange={(e, num) => setCalcBoardWidth(num)}
                      className={`w-full p-2 rounded-lg border font-mono text-center outline-none transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-100 focus:border-amber-500/50' : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                      }`}
                      placeholder="Amplada mm"
                    />
                  </div>
                </div>

                {/* Valors predefinits de tauler habituals */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Formats:</span>
                  {[
                    { label: '300×200', l: 300, w: 200 },
                    { label: '300×300', l: 300, w: 300 },
                    { label: '600×400', l: 600, w: 400 },
                    { label: '1200×600', l: 1200, w: 600 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCalcBoardLength(preset.l);
                        setCalcBoardWidth(preset.w);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                        isDark 
                          ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Mides de la Peça a Tallar */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`font-bold flex items-center gap-1.5 text-[11px] ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                    <Scissors className="w-3.5 h-3.5" /> 2. Mides de la Peça a tallar (mm)
                  </label>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Net: {formatDecimal(calcPieceLength, 0)} × {formatDecimal(calcPieceWidth, 0)} mm
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Llargada peça (mm):</span>
                    <DecimalInput
                      value={calcPieceLength}
                      onChange={(e, num) => setCalcPieceLength(num)}
                      className={`w-full p-2 rounded-lg border font-mono text-center outline-none transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-100 focus:border-sky-500/50' : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
                      }`}
                      placeholder="Llargada mm"
                    />
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Amplada peça (mm):</span>
                    <DecimalInput
                      value={calcPieceWidth}
                      onChange={(e, num) => setCalcPieceWidth(num)}
                      className={`w-full p-2 rounded-lg border font-mono text-center outline-none transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-100 focus:border-sky-500/50' : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
                      }`}
                      placeholder="Amplada mm"
                    />
                  </div>
                </div>

                {/* Marge de Seguretat i Repeticions */}
                <div className={`pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <span className="text-[10px] font-bold">Marge seguretat:</span>
                    <div className="flex items-center gap-1">
                      <DecimalInput
                        value={calcMargin}
                        onChange={(e, num) => setCalcMargin(num)}
                        className={`w-12 p-1 rounded-lg border font-mono font-extrabold text-center text-xs ${
                          isDark ? 'border-amber-500/50 bg-slate-950 text-amber-300' : 'border-amber-400 bg-white text-amber-900'
                        }`}
                      />
                      <span className="text-[10px] font-bold">mm</span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <span className="text-[10px] font-bold">Repeticions:</span>
                    <div className="flex items-center gap-1">
                      <DecimalInput
                        value={calcRepeticions}
                        onChange={(e, num) => setCalcRepeticions(Math.max(1, num))}
                        className={`w-12 p-1 rounded-lg border font-mono font-extrabold text-center text-xs ${
                          isDark ? 'border-amber-500/50 bg-slate-950 text-amber-300' : 'border-amber-400 bg-white text-amber-900'
                        }`}
                        placeholder="1"
                      />
                      <span className="text-[10px] font-bold">×</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Resultat del Càlcul i Píndoles Informatives */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                isDark ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-amber-300 bg-amber-50/80'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    <Ruler className="w-3.5 h-3.5" /> Mida de tall efectiva {calcRepeticions > 1 ? `(${calcRepeticions} repeticions)` : ''}
                  </span>
                  <span className={`font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {calcResults.effLength} × {calcResults.effWidth} mm {calcRepeticions > 1 && <span className="font-extrabold text-amber-600">({calcRepeticions}×)</span>}
                  </span>
                </div>

                {/* Píndoles informatives de Resultats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`p-2 rounded-lg border ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className={`text-[9px] block uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Superfície Peça</span>
                    <span className={`font-mono font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {formatDecimal(calcResults.pieceEffAreaCm2, 1)} cm²
                    </span>
                  </div>

                  <div className={`p-2 rounded-lg border ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className={`text-[9px] block uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fracció exacta</span>
                    <span className={`font-mono font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      {formatDecimal(calcResults.rawBoardFraction, 3)} u
                    </span>
                  </div>

                  <div className={`p-2 rounded-lg border transition-colors ${
                    isDark ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  }`}>
                    <span className="text-[9px] block uppercase font-bold text-amber-700">
                      A TRASPASSAR
                    </span>
                    <span className="font-mono font-extrabold text-sm text-amber-600">
                      {formatDecimal(calcResults.roundedBoardFraction, 2)} {calcSelectedMaterialUnit || 'u'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botons d'Acció de la Calculadora */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalcModalOpen(false)}
                  className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-colors cursor-pointer text-center ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel·lar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleApplyCalculatorResult(calcResults.roundedBoardFraction);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                  title="Traspassar el valor calculat a l'escandall"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {calcTargetIndex !== null ? 'Aplicar a l\'Escandall' : 'Acceptar'}
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LIGHTBOX: VISUALITZACIÓ D'IMATGE AMPLIADA */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 transition-colors z-10 cursor-pointer shadow-lg"
              title="Tancar"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={zoomedImage}
              alt="Imatge ampliada"
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl shadow-md"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINESTRA FLOTANT: DUPLICAR ESCANDALL I TRIAR PRODUCTE DESTÍ */}
      {/* ========================================================================= */}
      {duplicateModalOpen && duplicatingSourceEsc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Capçalera */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}>
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-500" />
                <span>Duplicar Escandall de Fabricació</span>
              </h3>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className={`p-1.5 cursor-pointer rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Tancar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cos del Modal */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Informació de l'Escandall Origen */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-amber-300 bg-amber-50/80'
              }`}>
                <div className={`w-11 h-11 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  {duplicatingSourceEsc.producteImatge ? (
                    <img
                      src={resolveProducteMediaUrl(duplicatingSourceEsc.producteImatge) || resolveMediaUrl(duplicatingSourceEsc.producteImatge)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-amber-500/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] font-mono uppercase font-semibold block ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Escandall d'origen a duplicar:</span>
                  <h4 className={`font-bold text-sm font-serif truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{duplicatingSourceEsc.producteNom}</h4>
                  <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {duplicatingSourceEsc.materials?.length || 0} materials · {duplicatingSourceEsc.operacions?.length || 0} operacions · {duplicatingSourceEsc.maquinaria?.length || 0} maquinàries
                  </p>
                </div>
              </div>

              {/* Selector de Pestanyes de Mode de Duplicació */}
              <div className="space-y-3">
                <label className={`font-bold text-xs block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  A quin producte o destí vols aplicar aquesta duplicitat?
                </label>

                <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateMode('unlinked');
                      if (unlinkedProducts.length > 0 && !duplicateSelectedProductId) {
                        setDuplicateSelectedProductId(unlinkedProducts[0].id);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      duplicateMode === 'unlinked'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Producte sense escandall</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      duplicateMode === 'unlinked' ? 'bg-amber-800 text-white' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {unlinkedProducts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuplicateMode('custom')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      duplicateMode === 'custom'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    <span>Còpia lliure / Nou Projecte</span>
                  </button>
                </div>
              </div>

              {/* OPCIÓ 1: Producte del catàleg que ENCARA NO té escandall */}
              {duplicateMode === 'unlinked' && (
                <div className="space-y-3">
                  {unlinkedProducts.length === 0 ? (
                    <div className={`p-6 rounded-xl border text-center space-y-2 ${
                      isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-300 bg-amber-50'
                    }`}>
                      <CheckCircle2 className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Tots els productes del catàleg ja tenen escandall assignat!</p>
                      <p className={`text-[11px] leading-relaxed max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        No hi ha cap producte pendent a la botiga. Pots utilitzar la pestanya <strong>"Còpia lliure / Nou Projecte"</strong> per generar un escandall duplicat amb un nom personalitzat.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Cercador d'unlinked products */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cerca un producte sense escandall per nom o codi..."
                          value={duplicateSearchQuery}
                          onChange={(e) => setDuplicateSearchQuery(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs outline-none transition-all ${
                            isDark 
                              ? 'border-slate-800 bg-slate-950 text-slate-200 focus:border-amber-500/50' 
                              : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-amber-500'
                          }`}
                        />
                      </div>

                      {/* Llista Seleccionable de Productes Sense Escandall */}
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {filteredUnlinkedProducts.length === 0 ? (
                          <div className={`py-6 text-center text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            No s'ha trobat cap producte sense escandall que coincideixi amb la cerca.
                          </div>
                        ) : (
                          filteredUnlinkedProducts.map((p) => {
                            const isSelected = duplicateSelectedProductId === p.id;
                            const pImg = p.imatgePrincipal || (Array.isArray(p.imatges) && p.imatges[0]) || p.image || p.imatge || '';
                            const resolvedImg = resolveProducteMediaUrl(pImg) || resolveMediaUrl(pImg);
                            const pPrice = Number(p.preuBase !== undefined ? p.preuBase : p.preu || 0);

                            return (
                              <div
                                key={p.id}
                                onClick={() => setDuplicateSelectedProductId(p.id)}
                                onDoubleClick={() => {
                                  setDuplicateSelectedProductId(p.id);
                                  setTimeout(handleConfirmDuplicate, 50);
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? (isDark ? 'bg-amber-600/15 border-amber-500/80 text-white shadow-md' : 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm font-semibold')
                                    : (isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950' : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-100')
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'border-amber-500 bg-amber-500 text-white' : (isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white')
                                  }`}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>

                                  <div className={`w-10 h-10 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center ${
                                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                                  }`}>
                                    {resolvedImg ? (
                                      <img src={resolvedImg} alt={p.nom} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package className="w-5 h-5 text-amber-500/50" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={p.nom}>{p.nom}</h4>
                                      {p.codi && (
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                          isDark ? 'text-slate-400 bg-slate-900 border border-slate-800' : 'text-slate-600 bg-slate-200 border border-slate-300'
                                        }`}>
                                          {p.codi}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                      {p.descripcio || (Array.isArray(p.opcionsPersonalitzacio) ? `${p.opcionsPersonalitzacio.length} opcions de personalització` : 'Sense descripció')}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`text-[10px] block font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PVP Web</span>
                                  <span className={`font-mono font-bold text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                    {pPrice > 0 ? formatCurrency(pPrice, 2) : '- - -'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* OPCIÓ 2: Nom personalitzat per a còpia lliure / projecte */}
              {duplicateMode === 'custom' && (
                <div className={`space-y-3 p-4 rounded-xl border ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                }`}>
                  <label className={`block font-semibold text-xs mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Nom del nou escandall duplicat *
                  </label>
                  <input
                    type="text"
                    required
                    value={duplicateCustomName}
                    onChange={(e) => setDuplicateCustomName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-serif text-sm outline-none transition-all ${
                      isDark 
                        ? 'border-slate-800 bg-slate-900 text-slate-100 focus:border-amber-500/50' 
                        : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                    }`}
                    placeholder="Ex: Clauer Inicial Edició Especial (Còpia)"
                  />
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Es crearà una nova plantilla d'escandall independent amb tots els materials, temps d'operacions, maquinària i percentatges de merme/marge duplicats de l'original.
                  </p>
                </div>
              )}
            </div>

            {/* Botons d'Acció Inferiors del Modal */}
            <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Cancel·lar
              </button>

              <button
                type="button"
                onClick={handleConfirmDuplicate}
                disabled={duplicateMode === 'unlinked' && unlinkedProducts.length === 0}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                  duplicateMode === 'unlinked' && unlinkedProducts.length === 0
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>Duplicar i Editar Escandall</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
