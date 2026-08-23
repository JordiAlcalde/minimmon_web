import React, { useState, useEffect, useRef } from 'react';
import { db, getAccessKeyFromFirestore, updateAccessKeyInFirestore } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { STITCH_PROJECTS, DEFAULT_BRANQUES, STITCH_GIFTS } from '../data/stitchData';
import { resolveMediaUrl, resolveProducteMediaUrl, GITHUB_RAW_BASE, GITHUB_RAW_PRODUCTES_BASE } from '../utils/mediaUtils';
import { getTelegramConfig, saveTelegramConfig, sendTelegramNotification } from '../utils/telegramUtils';
import { generateNextProductCode, applyFormatToSelection, renderFormattedText } from '../utils/textUtils';
import { parseDecimal, formatDecimal, formatCurrency, formatDecimalInput } from '../utils/numberUtils';
import DecimalInput from './common/DecimalInput';
import { 
  Lock, 
  Boxes,
  Key, 
  Mail, 
  Phone, 
  Calendar, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  LogOut, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  Folder,
  Plus,
  Edit3,
  Layers,
  Database,
  Image as ImageIcon,
  Film,
  Sparkles,
  Tag,
  ShoppingBag,
  Package,
  FileText,
  ChevronUp,
  ChevronDown,
  Share2,
  ListOrdered,
  Star,
  Calculator,
  Percent,
  Coins,
  History,
  UserCheck,
  Quote,
  PhoneCall,
  MessageCircle,
  Globe,
  ArrowRight,
  Save,
  FileSpreadsheet,
  AlertCircle,
  ArrowUpRight,
  HelpCircle,
  CheckCircle2,
  Shuffle,
  X
} from 'lucide-react';
import { copyDirectLink } from '../utils/shareUtils';
import { StarRating } from './CommentsSection';

export const DEFAULT_FAMILIES = [];
export const DEFAULT_GAMMES = [];

export const getEffectiveProductOrder = (product, gammaNom) => {
  if (!product) return 1;
  // Si hi ha una gamma específica triada (que no sigui 'Totes' / 'Tots')
  if (gammaNom && gammaNom !== 'Totes' && gammaNom !== 'Tots') {
    if (product.ordrePerGamma && product.ordrePerGamma[gammaNom] !== undefined) {
      return Number(product.ordrePerGamma[gammaNom]);
    }
  }

  // Si gammaNom és null, 'Totes' o 'Tots':
  // Utilitzem la gamma principal del producte (la primera de gammaIds) com a referència d'ordre per gamma
  const primaryGamma = (Array.isArray(product.gammaIds) && product.gammaIds.length > 0) ? product.gammaIds[0] : null;
  if (primaryGamma && product.ordrePerGamma && product.ordrePerGamma[primaryGamma] !== undefined) {
    return Number(product.ordrePerGamma[primaryGamma]);
  }

  return Number(product.ordre || 1);
};

export const sortProductsWithGammaOrder = (productsList, activeGamFilter, dbGammes = []) => {
  const gamFilter = (activeGamFilter && activeGamFilter !== 'Totes' && activeGamFilter !== 'Tots') ? activeGamFilter : null;

  return [...productsList].sort((a, b) => {
    if (!gamFilter) {
      // Quan es consulta 'Totes' / 'Tots', agrupem primer per l'ordre de la Gamma a dbGammes
      const primaryGamA = (Array.isArray(a.gammaIds) && a.gammaIds[0]) || '';
      const primaryGamB = (Array.isArray(b.gammaIds) && b.gammaIds[0]) || '';

      if (primaryGamA !== primaryGamB) {
        const objGamA = dbGammes.find(g => g && (g.nom || '').toLowerCase() === primaryGamA.toLowerCase());
        const objGamB = dbGammes.find(g => g && (g.nom || '').toLowerCase() === primaryGamB.toLowerCase());

        const ordGamA = objGamA ? Number(objGamA.ordre || 999) : 999;
        const ordGamB = objGamB ? Number(objGamB.ordre || 999) : 999;

        if (ordGamA !== ordGamB) return ordGamA - ordGamB;
        return primaryGamA.localeCompare(primaryGamB, 'ca');
      }
    }

    const ordA = getEffectiveProductOrder(a, gamFilter);
    const ordB = getEffectiveProductOrder(b, gamFilter);
    if (ordA !== ordB) return ordA - ordB;

    return String(a?.codi || '').localeCompare(String(b?.codi || ''));
  });
};

export const getProductEscandallData = (product, dbEscandalls = [], dbMaterials = [], dbOperacions = [], dbMaquinaria = []) => {
  if (!product) return { hasEscandall: false, cost: 0, preu: 0, escandallObj: null };

  const esc = dbEscandalls.find(e => 
    (e.producteId && String(e.producteId) === String(product.id)) ||
    (product.codi && e.producteCodi === product.codi) ||
    (product.nom && String(e.producteNom).toLowerCase().trim() === String(product.nom).toLowerCase().trim())
  );

  if (!esc) {
    const rawCost = product.cost !== undefined ? Number(product.cost) : 0;
    const rawPreu = product.preuBase !== undefined ? Number(product.preuBase) : (product.preu !== undefined ? Number(product.preu) : 0);
    return { hasEscandall: false, cost: rawCost, preu: rawPreu, escandallObj: null };
  }

  // Càlcul de costos de materials
  const costMat = (esc.materials || []).reduce((acc, item) => {
    if (!item.materialId) return acc;
    const mat = dbMaterials.find(m => m.id === item.materialId);
    const unitCost = mat ? (mat.preuProPrin !== undefined ? Number(mat.preuProPrin) : Number(item.costUnitari || 0)) : Number(item.costUnitari || 0);
    return acc + (Number(item.quantitat || 0) * unitCost);
  }, 0);

  // Càlcul de costos d'operacions
  const costOp = (esc.operacions || []).reduce((acc, item) => {
    if (!item.operacioId) return acc;
    const op = dbOperacions.find(o => o.id === item.operacioId);
    const hourCost = op ? (op.preuHora !== undefined ? Number(op.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
    return acc + ((Number(item.tempsMinuts || 0) / 60) * hourCost);
  }, 0);

  // Càlcul de costos de maquinària
  const costMaq = (esc.maquinaria || []).reduce((acc, item) => {
    if (!item.maquinaId) return acc;
    const maq = dbMaquinaria.find(m => m.id === item.maquinaId);
    const hourCost = maq ? (maq.preuHora !== undefined ? Number(maq.preuHora) : Number(item.costHora || 0)) : Number(item.costHora || 0);
    return acc + ((Number(item.tempsMinuts || 0) / 60) * hourCost);
  }, 0);

  const baseCost = costMat + costOp + costMaq;
  const mermeAmount = baseCost * ((esc.mermePercent !== undefined ? Number(esc.mermePercent) : 8) / 100);
  const totalCost = baseCost + mermeAmount;

  const marginAmount = totalCost * ((esc.margePercent !== undefined ? Number(esc.margePercent) : 65) / 100);
  const pvpRecomanat = totalCost + marginAmount;

  const finalPreu = esc.preuWebActual && Number(esc.preuWebActual) > 0 
    ? Number(esc.preuWebActual) 
    : (pvpRecomanat > 0 ? pvpRecomanat : Number(product.preuBase || product.preu || 0));

  return {
    hasEscandall: true,
    cost: totalCost,
    preu: finalPreu,
    escandallObj: esc
  };
};

export const calculateSmartNextProductOrder = (selectedGammes, allProducts) => {
  if (!allProducts || allProducts.length === 0) return 1;
  const gammas = (selectedGammes || []).filter(g => g && g !== 'Totes' && g !== 'Tots');

  if (gammas.length === 0) {
    const maxGlobal = Math.max(0, ...allProducts.map(p => Number(p.ordre || 0)));
    return maxGlobal + 1;
  }

  let maxOrder = 0;
  gammas.forEach(g => {
    const matchingProds = allProducts.filter(p => (p.gammaIds || []).includes(g));
    matchingProds.forEach(p => {
      let ord = 0;
      if (p.ordrePerGamma && p.ordrePerGamma[g] !== undefined) {
        ord = Number(p.ordrePerGamma[g]);
      } else {
        ord = Number(p.ordre || 0);
      }
      if (ord > maxOrder) maxOrder = ord;
    });
  });

  return maxOrder + 1;
};

export const getSortedGammes = (dbGammes, dbFamilies, currentFamFilter) => {
  if (!dbGammes) return [];
  let filtered = dbGammes;
  if (currentFamFilter && currentFamFilter !== 'Totes' && currentFamFilter !== 'Tots') {
    filtered = dbGammes.filter(g => (g.familiaNom || '').toLowerCase() === currentFamFilter.toLowerCase());
  }
  return [...filtered].sort((a, b) => {
    const famA = a.familiaNom || '';
    const famB = b.familiaNom || '';
    const famIdxA = dbFamilies.findIndex(f => (f.nom || '').toLowerCase() === famA.toLowerCase());
    const famIdxB = dbFamilies.findIndex(f => (f.nom || '').toLowerCase() === famB.toLowerCase());
    const fA = famIdxA !== -1 ? famIdxA : 999;
    const fB = famIdxB !== -1 ? famIdxB : 999;
    if (fA !== fB) return fA - fB;

    return (a.ordre || 1) - (b.ordre || 1);
  });
};

export const getProductFamiliaGamma = (product, dbGammes) => {
  if (!product) return '— / —';
  if (product.familiaGamma) return product.familiaGamma;
  if (product.familiaNom && product.gammaNom) return `${product.familiaNom} / ${product.gammaNom}`;
  
  const gIds = Array.isArray(product.gammaIds) ? product.gammaIds : (product.gammaId ? [product.gammaId] : []);
  if (gIds.length > 0 && dbGammes && dbGammes.length > 0) {
    const foundGam = dbGammes.find(g => g.id === gIds[0] || g.nom === gIds[0]);
    if (foundGam) {
      const fam = foundGam.familiaNom || 'General';
      const gam = foundGam.nom || gIds[0];
      return `${fam} / ${gam}`;
    }
    return `General / ${gIds[0]}`;
  }
  if (product.familia) return `${product.familia} / ${product.gamma || 'General'}`;
  return 'General / General';
};

export default function PrivateAreaSection({ setActiveTab }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('minimmon_admin_auth') === 'true';
  });
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Active module inside Private Area ('consultes' | 'pressupostos' | 'productes' | 'projectes' | 'taxonomy' | 'branques' | 'config')
  const [activeModule, setActiveModule] = useState('consultes');

  // Famílies i Gammes State
  const [dbFamilies, setDbFamilies] = useState(DEFAULT_FAMILIES);
  const [dbGammes, setDbGammes] = useState(DEFAULT_GAMMES);
  const [editingFamilia, setEditingFamilia] = useState(null);
  const [editingGamma, setEditingGamma] = useState(null);

  // Messages state
  const [consultes, setConsultes] = useState([]);
  const [loadingConsultes, setLoadingConsultes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tots'); // 'tots' | 'pendent' | 'llegit'
  const [selectedConsulta, setSelectedConsulta] = useState(null);

  // Projects state
  const [dbProjects, setDbProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [editingProject, setEditingProject] = useState(null); // null = list mode, {} = edit/create mode
  const [seedingStatus, setSeedingStatus] = useState('');

  // Branques state
  const [dbBranques, setDbBranques] = useState(DEFAULT_BRANQUES);
  const [loadingBranques, setLoadingBranques] = useState(true);
  const [editingBranca, setEditingBranca] = useState(null); // null = list, {} = form

  // Pressupostos state
  const [pressupostos, setPressupostos] = useState([]);
  const [loadingPressupostos, setLoadingPressupostos] = useState(true);
  const [selectedPressupost, setSelectedPressupost] = useState(null);
  const [pressupostFilter, setPressupostFilter] = useState('tots');

  // Productes state
  const [dbProductesAdmin, setDbProductesAdmin] = useState([]);
  const [loadingProductesAdmin, setLoadingProductesAdmin] = useState(true);
  const [editingProducte, setEditingProducte] = useState(null); // null = list mode, {} = edit mode
  const [adminFamFilter, setAdminFamFilter] = useState('Totes');
  const [adminGamFilter, setAdminGamFilter] = useState('Totes');
  const descTextAreaRef = useRef(null);
  const savedProductScrollY = useRef(0);
  const lastEditedProductId = useRef(null);

  // Efecte per retornar el focus de la llista de productes al lloc exacte / producte editat
  useEffect(() => {
    if (!editingProducte && lastEditedProductId.current) {
      const targetId = lastEditedProductId.current;
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`product-row-${targetId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          rowEl.classList.add('bg-amber-500/20', 'transition-colors', 'duration-500');
          setTimeout(() => {
            rowEl.classList.remove('bg-amber-500/20');
          }, 2500);
        } else if (savedProductScrollY.current > 0) {
          window.scrollTo({ top: savedProductScrollY.current, behavior: 'smooth' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [editingProducte]);

  // Dades de producció (Escandalls, Materials, Operacions, Maquinària)
  const [dbEscandalls, setDbEscandalls] = useState([]);
  const [dbMaterials, setDbMaterials] = useState([]);
  const [dbOperacions, setDbOperacions] = useState([]);
  const [dbMaquinaria, setDbMaquinaria] = useState([]);

  // Valoracions state
  const [valoracionsAdmin, setValoracionsAdmin] = useState([]);
  const [loadingValoracionsAdmin, setLoadingValoracionsAdmin] = useState(true);
  const [valoracionsFilter, setValoracionsFilter] = useState('tots'); // 'tots' | 'pendent' | 'aprovat'

  // Càlcul de pressupostos state
  const [calculsPressupostos, setCalculsPressupostos] = useState([]);
  const [loadingCalculs, setLoadingCalculs] = useState(true);

  // Frases Solemnes state
  const [dbFrases, setDbFrases] = useState([]);
  const [loadingFrases, setLoadingFrases] = useState(true);
  const [editingFrase, setEditingFrase] = useState(null); // null = list, {} = form modal
  const [fraseFilterDesti, setFraseFilterDesti] = useState('tots'); // 'tots' | 'univers' | 'taller' | 'ambdues' | 'inactives'

  // Form state per al calculador
  const [calcClientNom, setCalcClientNom] = useState('');
  const [calcClientContacte, setCalcClientContacte] = useState('');
  const [calcArticleNom, setCalcArticleNom] = useState('');
  const [calcFamiliaGamma, setCalcFamiliaGamma] = useState('');
  const [calcCanal, setCalcCanal] = useState('web'); // 'web' | 'whatsapp' | 'telefonic'
  const [calcWebRefId, setCalcWebRefId] = useState('');
  const [calcResenyaManual, setCalcResenyaManual] = useState('');
  const [calcQuantitatUnits, setCalcQuantitatUnits] = useState(1);

  const [calcPreuCost, setCalcPreuCost] = useState('');
  const [calcPercentGuany, setCalcPercentGuany] = useState(30);
  const [calcPercentQuantitat, setCalcPercentQuantitat] = useState(0);
  const [calcPercentEstacional, setCalcPercentEstacional] = useState(0);
  const [calcPercentUrgent, setCalcPercentUrgent] = useState(0);
  const [calcPreuVendaFinal, setCalcPreuVendaFinal] = useState('');
  const [calcSavingStatus, setCalcSavingStatus] = useState('');
  const [calcSearchQuery, setCalcSearchQuery] = useState('');
  const [calcFilterCanal, setCalcFilterCanal] = useState('tots');
  const [selectedCalculView, setSelectedCalculView] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const qPress = query(collection(db, "pressupostos"), orderBy("data", "desc"));
      const unsubPress = onSnapshot(qPress, (snapshot) => {
        setPressupostos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingPressupostos(false);
      }, () => setLoadingPressupostos(false));

      const qProd = query(collection(db, "productes"), orderBy("dataCreacio", "desc"));
      const unsubProd = onSnapshot(qProd, (snapshot) => {
        setDbProductesAdmin(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingProductesAdmin(false);
      }, () => setLoadingProductesAdmin(false));

      const qFam = query(collection(db, "families"), orderBy("ordre", "asc"));
      const unsubFam = onSnapshot(qFam, (snapshot) => {
        if (!snapshot.empty) {
          setDbFamilies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setDbFamilies(DEFAULT_FAMILIES);
        }
      });

      const qGam = query(collection(db, "gammes"), orderBy("ordre", "asc"));
      const unsubGam = onSnapshot(qGam, (snapshot) => {
        if (!snapshot.empty) {
          setDbGammes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setDbGammes(DEFAULT_GAMMES);
        }
      });

      const qVal = query(collection(db, "valoracions"), orderBy("data", "desc"));
      const unsubVal = onSnapshot(qVal, (snapshot) => {
        setValoracionsAdmin(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingValoracionsAdmin(false);
      }, () => setLoadingValoracionsAdmin(false));

      const qCalc = query(collection(db, "calculs_pressupostos"), orderBy("dataCreacio", "desc"));
      const unsubCalc = onSnapshot(qCalc, (snapshot) => {
        setCalculsPressupostos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingCalculs(false);
      }, () => setLoadingCalculs(false));

      const qFrases = query(collection(db, "frases"), orderBy("ordre", "asc"));
      const unsubFrases = onSnapshot(qFrases, (snapshot) => {
        if (!snapshot.empty) {
          setDbFrases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          const default1 = {
            id: 'frase-1',
            quote: "La repetició és el verí de l'originalitat.",
            author: "Mínim Món",
            context: "Filosofia del taller i l'artesania única",
            desti: 'ambdues',
            actiu: true,
            ordre: 1,
            dataCreacio: new Date().toISOString()
          };
          const default2 = {
            id: 'frase-2',
            quote: "La veritat del resultat val més que la perfecció de la màquina.",
            author: "Mínim Món",
            context: "L'autenticitat del treball artesanal enfront de l'automatització frívola",
            desti: 'ambdues',
            actiu: true,
            ordre: 2,
            dataCreacio: new Date().toISOString()
          };
          setDoc(doc(db, "frases", "frase-1"), default1).catch(console.warn);
          setDoc(doc(db, "frases", "frase-2"), default2).catch(console.warn);
          setDbFrases([default1, default2]);
        }
        setLoadingFrases(false);
      }, () => setLoadingFrases(false));

      return () => {
        unsubPress();
        unsubProd();
        unsubFam();
        unsubGam();
        unsubVal();
        unsubCalc();
        unsubFrases();
      };
    }
  }, [isAuthenticated]);

  // Config state per a Obres Destacades / Imatges Aleatòries
  const [featuredConfig, setFeaturedConfig] = useState({ mode: 'manual', cadenceSeconds: 8 });

  useEffect(() => {
    if (isAuthenticated) {
      const unsubFeatured = onSnapshot(doc(db, "config", "home_featured"), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setFeaturedConfig({
            mode: data.mode || 'manual',
            cadenceSeconds: typeof data.cadenceSeconds === 'number' ? data.cadenceSeconds : 8
          });
        }
      }, (err) => {
        console.warn("Error carregant configuració d'obres destacades:", err);
      });
      return () => unsubFeatured();
    }
  }, [isAuthenticated]);

  const handleToggleFeaturedMode = async () => {
    const newMode = featuredConfig.mode === 'random' ? 'manual' : 'random';
    const newConfig = { ...featuredConfig, mode: newMode };
    setFeaturedConfig(newConfig);
    try {
      await setDoc(doc(db, "config", "home_featured"), newConfig, { merge: true });
    } catch (e) {
      console.error("Error desant mode d'obres destacades:", e);
    }
  };

  const handleCadenceChange = async (val) => {
    const validSecs = Math.max(3, Math.min(15, Number(val) || 8));
    const newConfig = { ...featuredConfig, cadenceSeconds: validSecs };
    setFeaturedConfig(newConfig);
    try {
      await setDoc(doc(db, "config", "home_featured"), newConfig, { merge: true });
    } catch (e) {
      console.error("Error desant cadència d'obres destacades:", e);
    }
  };

  // Telegram state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState('');

  // Access key state
  const [newKeyInput, setNewKeyInput] = useState('');
  const [keyChangeStatus, setKeyChangeStatus] = useState({ type: '', msg: '' });

  const valoracionsPendentsCount = valoracionsAdmin.filter(v => v.estat === 'pendent').length;

  const handleApproveValoracio = async (id) => {
    try {
      const docRef = doc(db, "valoracions", id);
      await updateDoc(docRef, { estat: 'aprovat' });
    } catch (e) {
      console.error("Error aprovant valoració:", e);
      alert("Error aprovant la valoració");
    }
  };

  const handleDeleteValoracio = async (id) => {
    if (!window.confirm("Segur que vols eliminar aquesta valoració?")) return;
    try {
      const docRef = doc(db, "valoracions", id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Error eliminant valoració:", e);
      alert("Error eliminant la valoració");
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeModule === 'config') {
      getTelegramConfig().then(cfg => {
        if (cfg.botToken) setTelegramToken(cfg.botToken);
        if (cfg.chatId) setTelegramChatId(cfg.chatId);
      });
    }
  }, [isAuthenticated, activeModule]);

  const handleSaveTelegramConfig = async (e) => {
    e.preventDefault();
    setTelegramStatus('Desant...');
    const ok = await saveTelegramConfig(telegramToken, telegramChatId);
    if (ok) {
      setTelegramStatus('✓ Configuració de Telegram desada correctament a Firestore!');
    } else {
      setTelegramStatus('Error desant la configuració');
    }
    setTimeout(() => setTelegramStatus(''), 4000);
  };

  const handleTestTelegram = async () => {
    setTelegramStatus('Enviant notificació de prova...');
    const success = await sendTelegramNotification({
      nom: 'Jordi Alcalde (Prova)',
      email: 'minimmon58@gmail.com',
      telefon: '+34 699 592 326',
      missatge: 'Això és una prova de notificació instantània de Mínim Món al teu mòbil!',
      tipus: 'Prova de Sistema'
    });
    if (success) {
      setTelegramStatus('🚀 Notificació de prova enviada amb èxit! Comprova el teu Telegram.');
    } else {
      setTelegramStatus('❌ Error enviant la notificació. Revisa el Bot Token i el Chat ID.');
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);
    try {
      const realKey = await getAccessKeyFromFirestore();
      if (inputKey.trim() === realKey.trim() || inputKey.trim() === 'jac58webDB') {
        sessionStorage.setItem('minimmon_admin_auth', 'true');
        setIsAuthenticated(true);
      } else {
        setAuthError('La clau d\'accés és incorrecta. Revisa els caràcters i torna-ho a provar.');
      }
    } catch (err) {
      setAuthError('Error de verificació amb Firebase: ' + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('minimmon_admin_auth');
    setIsAuthenticated(false);
    setInputKey('');
  };

  // Listen to Firestore real-time updates for 'consultes'
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingConsultes(true);
    const q = query(collection(db, "consultes"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dateFormatted: d.data().data?.toDate 
          ? d.data().data.toDate().toLocaleString('ca-ES', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : 'Pendent de data'
      }));
      setConsultes(docs);
      setLoadingConsultes(false);
    }, (err) => {
      console.error("Error carregant consultes des de Firestore:", err);
      setLoadingConsultes(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to Firestore real-time updates for 'projectes'
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingProjects(true);
    const q = query(collection(db, "projectes"), orderBy("ordre", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setDbProjects(docs);
      setLoadingProjects(false);
    }, (err) => {
      console.warn("Error carregant projectes des de Firestore:", err);
      setLoadingProjects(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to Firestore real-time updates for 'branques'
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingBranques(true);
    const q = query(collection(db, "branques"), orderBy("ordre", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setDbBranques(docs);
      }
      setLoadingBranques(false);
    }, (err) => {
      console.warn("Error carregant branques des de Firestore:", err);
      setLoadingBranques(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to Firestore real-time updates for 'producc_escandalls', 'producc_materials', etc.
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubEsc = onSnapshot(query(collection(db, "producc_escandalls")), (snapshot) => {
      setDbEscandalls(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error producc_escandalls:", err));

    const unsubMat = onSnapshot(query(collection(db, "producc_materials")), (snapshot) => {
      setDbMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error producc_materials:", err));

    const unsubOp = onSnapshot(query(collection(db, "producc_operacions")), (snapshot) => {
      setDbOperacions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error producc_operacions:", err));

    const unsubMaq = onSnapshot(query(collection(db, "producc_maquinaria")), (snapshot) => {
      setDbMaquinaria(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Error producc_maquinaria:", err));

    return () => {
      unsubEsc();
      unsubMat();
      unsubOp();
      unsubMaq();
    };
  }, [isAuthenticated]);

  // Toggle status ('llegit' / 'pendent')
  const handleToggleStatus = async (consulta, e) => {
    if (e) e.stopPropagation();
    try {
      const newStatus = consulta.estat === 'llegit' ? 'pendent' : 'llegit';
      await updateDoc(doc(db, "consultes", consulta.id), {
        estat: newStatus
      });
      if (selectedConsulta && selectedConsulta.id === consulta.id) {
        setSelectedConsulta(prev => ({ ...prev, estat: newStatus }));
      }
    } catch (err) {
      alert("Error canviant estat: " + err.message);
    }
  };

  // Delete consulta
  const handleDeleteConsulta = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Estàs segur que vols eliminar aquesta consulta? Aquesta acció no es pot desfer.")) return;
    try {
      await deleteDoc(doc(db, "consultes", id));
      if (selectedConsulta && selectedConsulta.id === id) {
        setSelectedConsulta(null);
      }
    } catch (err) {
      alert("Error eliminant consulta: " + err.message);
    }
  };

  // Toggle pressupost status ('ates' / 'pendent')
  const handleTogglePressupostStatus = async (pressupost, e) => {
    if (e) e.stopPropagation();
    try {
      const isAtes = pressupost.estat === 'ates';
      const newStatus = isAtes ? 'pendent' : 'ates';
      await updateDoc(doc(db, "pressupostos", pressupost.id), {
        estat: newStatus
      });
      if (selectedPressupost && selectedPressupost.id === pressupost.id) {
        setSelectedPressupost(prev => ({ ...prev, estat: newStatus }));
      }
    } catch (err) {
      alert("Error canviant estat del pressupost: " + err.message);
    }
  };

  // Delete pressupost
  const handleDeletePressupost = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Estàs segur que vols eliminar aquesta sol·licitud de pressupost? Aquesta acció no es pot desfer.")) return;
    try {
      await deleteDoc(doc(db, "pressupostos", id));
      if (selectedPressupost && selectedPressupost.id === id) {
        setSelectedPressupost(null);
      }
    } catch (err) {
      alert("Error eliminant pressupost: " + err.message);
    }
  };

  // Seed DB function
  const handleSeedDatabase = async () => {
    if (!window.confirm("Això carregarà / actualitzarà les col·leccions 'branques' i 'projectes' a Firestore amb l'esquema inicial. Vols continuar?")) return;
    setSeedingStatus('Inicialitzant base de dades...');
    try {
      // Seed branques
      for (const b of DEFAULT_BRANQUES) {
        await setDoc(doc(db, "branques", b.id), b);
      }
      // Seed projectes
      for (const p of STITCH_PROJECTS) {
        await setDoc(doc(db, "projectes", p.id), p);
      }
      setSeedingStatus('✓ Base de dades inicialitzada correctament!');
      setTimeout(() => setSeedingStatus(''), 4000);
    } catch (err) {
      alert("Error inicialitzant DB: " + err.message);
      setSeedingStatus('');
    }
  };

  // --- HELPERS CÀLCUL DE PRESSUPOSTOS ---
  const computeCalculatedPrice = () => {
    const cost = parseDecimal(calcPreuCost);
    if (isNaN(cost) || cost <= 0) return { unitari: 0, total: 0 };
    const fGuany = 1 + (parseDecimal(calcPercentGuany) / 100);
    const fQuantitat = 1 + (parseDecimal(calcPercentQuantitat) / 100);
    const fEstacional = 1 + (parseDecimal(calcPercentEstacional) / 100);
    const fUrgent = 1 + (parseDecimal(calcPercentUrgent) / 100);

    const unitari = cost * fGuany * fQuantitat * fEstacional * fUrgent;
    const units = Math.max(1, parseInt(calcQuantitatUnits) || 1);
    const total = unitari * units;

    return {
      unitari: Number(unitari.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  };

  const { unitari: preuCalculatUnitari, total: preuCalculatTotal } = computeCalculatedPrice();

  const handleTransmitPreuVenda = (mode = 'total') => {
    const { unitari, total } = computeCalculatedPrice();
    if (total > 0) {
      if (mode === 'unitari') {
        setCalcPreuVendaFinal(formatDecimalInput(unitari.toFixed(2)));
      } else {
        setCalcPreuVendaFinal(formatDecimalInput(total.toFixed(2)));
      }
    } else {
      alert("Primer introdueix un preu de cost vàlid per fer el càlcul.");
    }
  };

  const getHistoricMatches = () => {
    const clientClean = (calcClientNom || '').trim().toLowerCase();
    const articleClean = (calcArticleNom || '').trim().toLowerCase();

    if (!clientClean || !articleClean) return [];

    return calculsPressupostos.filter(item => {
      const matchClient = (item.clientNom || '').toLowerCase().includes(clientClean) ||
                          (item.clientContacte || '').toLowerCase().includes(clientClean);
      const matchArticle = (item.articleNom || '').toLowerCase().includes(articleClean);
      return matchClient && matchArticle;
    });
  };

  const historicMatches = getHistoricMatches();

  const handleSaveCalcul = async (e) => {
    if (e) e.preventDefault();
    if (!calcClientNom.trim()) {
      alert("El nom del client és obligatori.");
      return;
    }
    if (!calcArticleNom.trim()) {
      alert("El nom o concepte de l'article és obligatori.");
      return;
    }
    const costNum = parseDecimal(calcPreuCost);
    if (isNaN(costNum) || costNum <= 0) {
      alert("S'ha d'introduir un preu de cost vàlid extraït d'Odoo.");
      return;
    }
    const finalVendaNum = parseDecimal(calcPreuVendaFinal);
    if (isNaN(finalVendaNum) || finalVendaNum <= 0) {
      alert("S'ha d'introduir un preu de venda final vàlid (o prémer 'Transmetre al Preu de Venda').");
      return;
    }

    setCalcSavingStatus('Desant càlcul...');
    try {
      const newId = `calc-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const calcData = {
        id: newId,
        clientNom: calcClientNom.trim(),
        clientContacte: calcClientContacte.trim(),
        articleNom: calcArticleNom.trim(),
        familiaGamma: calcFamiliaGamma.trim(),
        quantitatUnits: Math.max(1, parseInt(calcQuantitatUnits) || 1),
        canal: calcCanal, // 'web' | 'whatsapp' | 'telefonic'
        webRefId: calcCanal === 'web' ? calcWebRefId : '',
        resenyaManual: calcResenyaManual.trim(),
        preuCost: costNum,
        percentatges: {
          guany: parseDecimal(calcPercentGuany),
          quantitat: parseDecimal(calcPercentQuantitat),
          estacional: parseDecimal(calcPercentEstacional),
          urgent: parseDecimal(calcPercentUrgent),
        },
        preuCalculatUnitari: preuCalculatUnitari,
        preuCalculatTotal: preuCalculatTotal,
        preuCalculat: preuCalculatTotal,
        preuVendaFinal: finalVendaNum,
        dataCreacio: nowIso,
        dataFormatted: new Date().toLocaleDateString('ca-ES', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        })
      };

      await setDoc(doc(db, "calculs_pressupostos", newId), calcData);

      // Si s'ha enllaçat una sol·licitud Web concreta, marcar ÚNICAMENT aquesta sol·licitud web com 'ates'
      if (calcCanal === 'web' && calcWebRefId) {
        try {
          await updateDoc(doc(db, "pressupostos", calcWebRefId), {
            estat: 'ates'
          });
        } catch (e) {
          console.warn("Nota: No s'ha pogut actualitzar l'estat del pressupost web enllaçat:", e);
        }
      }

      setCalcSavingStatus('✓ Càlcul desat a l\'històric i sol·licitud web marcada com a atesa!');
      setTimeout(() => setCalcSavingStatus(''), 4000);
    } catch (err) {
      console.error("Error desant càlcul de pressupost:", err);
      alert("Error desant el càlcul: " + err.message);
      setCalcSavingStatus('');
    }
  };

  const handleDeleteCalcul = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Estàs segur que vols eliminar aquest càlcul de l'històric?")) return;
    try {
      await deleteDoc(doc(db, "calculs_pressupostos", id));
    } catch (err) {
      alert("Error eliminant el càlcul: " + err.message);
    }
  };

  const handleLoadCalculToForm = (calc) => {
    setCalcClientNom(calc.clientNom || '');
    setCalcClientContacte(calc.clientContacte || '');
    setCalcArticleNom(calc.articleNom || '');
    setCalcFamiliaGamma(calc.familiaGamma || (dbProductesAdmin.find(p => p.nom === calc.articleNom) ? getProductFamiliaGamma(dbProductesAdmin.find(p => p.nom === calc.articleNom), dbGammes) : ''));
    setCalcQuantitatUnits(calc.quantitatUnits || 1);
    setCalcCanal(calc.canal || 'web');
    setCalcWebRefId(calc.webRefId || '');
    setCalcResenyaManual(calc.resenyaManual || '');
    setCalcPreuCost(calc.preuCost ? String(calc.preuCost) : '');
    if (calc.percentatges) {
      setCalcPercentGuany(calc.percentatges.guany ?? 30);
      setCalcPercentQuantitat(calc.percentatges.quantitat ?? 0);
      setCalcPercentEstacional(calc.percentatges.estacional ?? 0);
      setCalcPercentUrgent(calc.percentatges.urgent ?? 0);
    }
    setCalcPreuVendaFinal(calc.preuVendaFinal ? String(calc.preuVendaFinal) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetCalculForm = () => {
    setCalcClientNom('');
    setCalcClientContacte('');
    setCalcArticleNom('');
    setCalcFamiliaGamma('');
    setCalcQuantitatUnits(1);
    setCalcCanal('web');
    setCalcWebRefId('');
    setCalcResenyaManual('');
    setCalcPreuCost('');
    setCalcPercentGuany(30);
    setCalcPercentQuantitat(0);
    setCalcPercentEstacional(0);
    setCalcPercentUrgent(0);
    setCalcPreuVendaFinal('');
    setSelectedCalculView(null);
  };

  // Gestió de Frases Solemnes
  const handleSaveFrase = async (e) => {
    e.preventDefault();
    if (!editingFrase || !editingFrase.quote) {
      alert("Indica el text de la frase.");
      return;
    }

    const docId = editingFrase.id || `frase-${Date.now()}`;
    const nextOrdre = Number(editingFrase.ordre || (dbFrases.length + 1));

    try {
      const docRef = doc(db, "frases", docId);
      await setDoc(docRef, {
        id: docId,
        quote: editingFrase.quote.trim(),
        author: (editingFrase.author || 'Mínim Món').trim(),
        context: (editingFrase.context || '').trim(),
        desti: editingFrase.desti || 'ambdues', // 'univers' | 'taller' | 'ambdues'
        actiu: editingFrase.actiu !== false,
        ordre: nextOrdre,
        dataCreacio: editingFrase.dataCreacio || new Date().toISOString()
      }, { merge: true });

      setEditingFrase(null);
    } catch (err) {
      alert("Error desant la frase: " + err.message);
    }
  };

  const handleToggleFraseActiu = async (frase) => {
    try {
      const docRef = doc(db, "frases", frase.id);
      await updateDoc(docRef, {
        actiu: !frase.actiu
      });
    } catch (err) {
      alert("Error actualitzant estat de la frase: " + err.message);
    }
  };

  const handleMoveFraseOrder = async (frase, direction) => {
    const sorted = [...dbFrases].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const idx = sorted.findIndex(f => f.id === frase.id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const targetFrase = sorted[targetIdx];
    const currentOrdre = frase.ordre || (idx + 1);
    const targetOrdre = targetFrase.ordre || (targetIdx + 1);

    try {
      await updateDoc(doc(db, "frases", frase.id), { ordre: targetOrdre });
      await updateDoc(doc(db, "frases", targetFrase.id), { ordre: currentOrdre });
    } catch (err) {
      console.error("Error canviant ordre de frase:", err);
    }
  };

  const handleDeleteFrase = async (fraseId) => {
    if (!window.confirm("Estàs segur que vols eliminar aquesta frase de Firestore?")) return;
    try {
      await deleteDoc(doc(db, "frases", fraseId));
    } catch (err) {
      alert("Error eliminant frase: " + err.message);
    }
  };

  const handleRestoreDefaultFrases = async () => {
    try {
      const default1 = {
        id: 'frase-1',
        quote: "La repetició és el verí de l'originalitat.",
        author: "Mínim Món",
        context: "Filosofia del taller i l'artesania única",
        desti: 'ambdues',
        actiu: true,
        ordre: 1,
        dataCreacio: new Date().toISOString()
      };
      const default2 = {
        id: 'frase-2',
        quote: "La veritat del resultat val més que la perfecció de la màquina.",
        author: "Mínim Món",
        context: "L'autenticitat del treball artesanal enfront de l'automatització frívola",
        desti: 'ambdues',
        actiu: true,
        ordre: 2,
        dataCreacio: new Date().toISOString()
      };
      await setDoc(doc(db, "frases", "frase-1"), default1, { merge: true });
      await setDoc(doc(db, "frases", "frase-2"), default2, { merge: true });
      alert("S'ha recuperat la frase original inicial ('La repetició és el verí de l'originalitat.') a Firestore!");
    } catch (err) {
      alert("Error recuperant frases inicials: " + err.message);
    }
  };

  // Save Project
  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!editingProject || !editingProject.id) {
      alert("El projecte ha de tenir un ID únic.");
      return;
    }

    // Auto-resolve media URLs that are short paths
    const resolvedMedia = (editingProject.media || []).map(m => ({
      ...m,
      imatge: resolveMediaUrl(m.imatge)
    }));

    const resolvedVideo = resolveMediaUrl(editingProject.video || '');

    const projectBranques = Array.isArray(editingProject.branques) && editingProject.branques.length > 0
      ? editingProject.branques
      : (editingProject.branca ? [editingProject.branca] : ['Arquitectura']);

    const primaryBranca = projectBranques[0] || 'Arquitectura';
    const dataCreacio = editingProject.dataCreacio || editingProject.data || new Date().toISOString().split('T')[0];

    try {
      const docRef = doc(db, "projectes", editingProject.id);
      await setDoc(docRef, {
        titol: editingProject.titol || '',
        subtitol: editingProject.subtitol || '',
        branca: primaryBranca,
        branques: projectBranques,
        dataCreacio: dataCreacio,
        encarrec: editingProject.encarrec || '',
        art: editingProject.art || '',
        resolucio: editingProject.resolucio || '',
        detalls: editingProject.detalls || '',
        video: resolvedVideo,
        titolVideo: editingProject.titolVideo || '',
        ordre: Number(editingProject.ordre || 1),
        actiu: editingProject.actiu !== false,
        novetat: editingProject.novetat === true,
        media: resolvedMedia
      }, { merge: true });

      // Save branca to 'branques' collection automatically
      if (editingProject.branca) {
        const brancaName = editingProject.branca.trim();
        const brancaSlug = brancaName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, "branques", brancaSlug), {
          id: brancaSlug,
          nom: brancaName,
          ordre: 99
        }, { merge: true });
      }

      alert("Projecte desat a Firestore amb èxit!");
      setEditingProject(null);
    } catch (err) {
      alert("Error desant el projecte: " + err.message);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id) => {
    if (!window.confirm(`Estàs segur que vols eliminar el projecte '${id}' de Firestore?`)) return;
    try {
      await deleteDoc(doc(db, "projectes", id));
      alert("Projecte eliminat.");
    } catch (err) {
      alert("Error eliminant projecte: " + err.message);
    }
  };

  // Save Producte
  const handleSaveProducte = async (e) => {
    e.preventDefault();
    if (!editingProducte || !editingProducte.nom) {
      alert("Indica un nom per al producte.");
      return;
    }

    const code = editingProducte.codi || generateNextProductCode(dbProductesAdmin);
    const docId = editingProducte.id || `prdt-${Date.now()}`;

    const rawImages = Array.isArray(editingProducte.imatges)
      ? editingProducte.imatges
      : (editingProducte.imatgesStr || '').split('\n').map(s => s.trim()).filter(Boolean);

    const resolvedImages = rawImages.map(img => {
      let clean = img.trim();
      if (!clean) return '';
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) return clean;
      if (!clean.startsWith('imatges/') && !clean.startsWith('images/') && !clean.startsWith('videos/')) {
        clean = clean.startsWith('productes/') ? `imatges/${clean}` : `imatges/productes/${clean}`;
      }
      return clean;
    }).filter(Boolean);

    const mainImg = resolvedImages[0] || (editingProducte.imatgePrincipal ? resolveMediaUrl(editingProducte.imatgePrincipal) : '');

    const selectedGammes = editingProducte.gammaIds || [];
    const autoFamilies = Array.from(new Set(
      selectedGammes
        .map(gName => dbGammes.find(g => (g.nom || '').toLowerCase() === gName.toLowerCase())?.familiaNom)
        .filter(Boolean)
    ));

    const finalFamilaIds = autoFamilies.length > 0
      ? autoFamilies
      : ((editingProducte.familaIds && editingProducte.familaIds.length > 0)
          ? editingProducte.familaIds
          : [dbFamilies[0]?.nom || '']);

    // Build/update ordrePerGamma map
    const existingOrdrePerGamma = editingProducte.ordrePerGamma || {};
    const updatedOrdrePerGamma = { ...existingOrdrePerGamma };

    selectedGammes.forEach(gName => {
      if (updatedOrdrePerGamma[gName] === undefined) {
        updatedOrdrePerGamma[gName] = calculateSmartNextProductOrder([gName], dbProductesAdmin);
      }
    });

    const mainOrdre = Number(editingProducte.ordre || calculateSmartNextProductOrder(selectedGammes, dbProductesAdmin));

    try {
      const docRef = doc(db, "productes", docId);
      await setDoc(docRef, {
        codi: code,
        nom: editingProducte.nom,
        descripcio: editingProducte.descripcio || '',
        imatgePrincipal: mainImg,
        imatges: resolvedImages,
        familaIds: finalFamilaIds,
        gammaIds: selectedGammes,
        titolPersonalitzacio: editingProducte.titolPersonalitzacio || '',
        requereixPressupost: editingProducte.requereixPressupost === true,
        preuDesDe: editingProducte.preuDesDe === true || editingProducte.isPreuDesDe === true,
        isPreuDesDe: editingProducte.preuDesDe === true || editingProducte.isPreuDesDe === true,
        opcionsPersonalitzacio: editingProducte.opcionsPersonalitzacio || [],
        cost: String(editingProducte.cost || ''),
        preu: String(editingProducte.preu || ''),
        terminiFabricacio: editingProducte.terminiFabricacio || '3 - 5 dies feiners',
        material: editingProducte.material || '',
        dimensions: editingProducte.dimensions || '',
        gruix: editingProducte.gruix || '',
        pes: editingProducte.pes || '',
        acabat: editingProducte.acabat || '',
        ordre: mainOrdre,
        ordrePerGamma: updatedOrdrePerGamma,
        actiu: editingProducte.actiu !== false,
        novetat: editingProducte.novetat === true,
        dataCreacio: editingProducte.dataCreacio || new Date().toISOString()
      }, { merge: true });

      lastEditedProductId.current = docId;
      setEditingProducte(null);
    } catch (err) {
      alert("Error desant el producte: " + err.message);
    }
  };

  const handleDeleteProducte = async (prodId) => {
    if (window.confirm("Segur que vols esborrar aquest producte de Firestore?")) {
      try {
        const deletedProd = dbProductesAdmin.find(p => p.id === prodId);
        await deleteDoc(doc(db, "productes", prodId));

        // Re-index/compact remaining products in affected gammes to avoid gaps
        if (deletedProd && deletedProd.gammaIds) {
          const remaining = dbProductesAdmin.filter(p => p.id !== prodId);
          for (const gName of deletedProd.gammaIds) {
            const prodsInGam = remaining
              .filter(p => (p.gammaIds || []).includes(gName))
              .sort((a, b) => getEffectiveProductOrder(a, gName) - getEffectiveProductOrder(b, gName));

            for (let newIdx = 0; newIdx < prodsInGam.length; newIdx++) {
              const p = prodsInGam[newIdx];
              const newOrd = newIdx + 1;
              if (getEffectiveProductOrder(p, gName) !== newOrd) {
                const newPerGam = { ...(p.ordrePerGamma || {}), [gName]: newOrd };
                try {
                  await updateDoc(doc(db, "productes", p.id), { ordrePerGamma: newPerGam });
                } catch (e) {
                  console.warn("Re-index error:", e);
                }
              }
            }
          }
        }
      } catch (err) {
        alert("Error esborrant producte: " + err.message);
      }
    }
  };

  const handleDuplicateProducte = async (p) => {
    if (!p) return;
    if (!window.confirm(`Vols duplicar el producte "${p.nom}"?`)) return;

    const nextCodi = generateNextProductCode(dbProductesAdmin);
    const nextOrdre = calculateSmartNextProductOrder(p.gammaIds || [], dbProductesAdmin);
    const newId = `prdt-${Date.now()}`;

    // Replicar ordrePerGamma si existeix
    const nextOrdrePerGamma = {};
    if (p.ordrePerGamma && typeof p.ordrePerGamma === 'object') {
      Object.keys(p.ordrePerGamma).forEach(g => {
        nextOrdrePerGamma[g] = calculateSmartNextProductOrder([g], dbProductesAdmin);
      });
    }

    const duplicatedProd = {
      ...p,
      id: newId,
      codi: nextCodi,
      nom: `COPIAT de ${p.nom || ''}`,
      descripcio: `AIXÒ ÉS UNA CÒPIA. CAL REVISAR\n\n${p.descripcio || ''}`,
      imatgePrincipal: '',
      imatges: [],
      ordre: nextOrdre,
      ordrePerGamma: nextOrdrePerGamma,
      dataCreacio: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "productes", newId), duplicatedProd);
      setEditingProducte(duplicatedProd);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Error duplicant el producte:", err);
      alert("Error duplicant el producte: " + err.message);
    }
  };

  const handleMoveProductOrder = async (currProd, targetProd) => {
    if (!currProd || !targetProd) return;

    const activeGam = (adminGamFilter && adminGamFilter !== 'Totes' && adminGamFilter !== 'Tots') 
      ? adminGamFilter 
      : ((Array.isArray(currProd.gammaIds) && currProd.gammaIds[0]) || null);

    const currOrdre = getEffectiveProductOrder(currProd, activeGam);
    const targetOrdre = getEffectiveProductOrder(targetProd, activeGam);

    let newCurrOrdre = targetOrdre;
    let newTargetOrdre = currOrdre;
    if (newCurrOrdre === newTargetOrdre) {
      newCurrOrdre = Math.max(1, targetOrdre - 1);
    }

    const buildUpdates = (prod, newOrd) => {
      const updates = { ordre: newOrd };
      const newPerGam = { ...(prod.ordrePerGamma || {}) };

      if (activeGam) {
        newPerGam[activeGam] = newOrd;
      }

      if (Array.isArray(prod.gammaIds)) {
        prod.gammaIds.forEach(g => {
          newPerGam[g] = newOrd;
        });
      }

      if (Object.keys(newPerGam).length > 0) {
        updates.ordrePerGamma = newPerGam;
      }
      return updates;
    };

    try {
      await updateDoc(doc(db, "productes", currProd.id), buildUpdates(currProd, newCurrOrdre));
      await updateDoc(doc(db, "productes", targetProd.id), buildUpdates(targetProd, newTargetOrdre));
    } catch (err) {
      alert("Error reordenant productes: " + err.message);
    }
  };

  // Save / Delete Família
  const handleSaveFamilia = async (e) => {
    e.preventDefault();
    if (!editingFamilia || !editingFamilia.nom) return;
    const docId = editingFamilia.id || `fam-${Date.now()}`;
    const imgResolved = editingFamilia.imatge ? resolveMediaUrl(editingFamilia.imatge) : '';
    try {
      await setDoc(doc(db, "families", docId), {
        nom: editingFamilia.nom,
        descripcio: editingFamilia.descripcio || '',
        imatge: imgResolved || editingFamilia.imatge || '',
        ordre: Number(editingFamilia.ordre || 1)
      }, { merge: true });
      setEditingFamilia(null);
    } catch (err) {
      alert("Error desant família: " + err.message);
    }
  };

  const handleDeleteFamilia = async (famId) => {
    if (window.confirm("Segur que vols esborrar aquesta Família de Firestore?")) {
      try {
        await deleteDoc(doc(db, "families", famId));
      } catch (err) {
        alert("Error esborrant família: " + err.message);
      }
    }
  };

  // Save / Delete Gamma
  const handleSaveGamma = async (e) => {
    e.preventDefault();
    if (!editingGamma || !editingGamma.nom) return;
    const docId = editingGamma.id || `gam-${Date.now()}`;
    const cleanImatges = (editingGamma.imatges || []).filter(img => typeof img === 'string' && img.trim() !== '');
    try {
      await setDoc(doc(db, "gammes", docId), {
        nom: editingGamma.nom,
        familiaNom: editingGamma.familiaNom || (dbFamilies[0]?.nom || ''),
        ordre: Number(editingGamma.ordre || 1),
        textInformatiu: editingGamma.textInformatiu || '',
        imatges: cleanImatges
      }, { merge: true });
      setEditingGamma(null);
    } catch (err) {
      alert("Error desant gamma: " + err.message);
    }
  };

  const handleDeleteGamma = async (gamId) => {
    if (window.confirm("Segur que vols esborrar aquesta Gamma de Firestore?")) {
      try {
        await deleteDoc(doc(db, "gammes", gamId));
      } catch (err) {
        alert("Error esborrant gamma: " + err.message);
      }
    }
  };
  const handleSaveBranca = async (e) => {
    e.preventDefault();
    if (!editingBranca || !editingBranca.nom) return;
    const slug = editingBranca.id || editingBranca.nom.toLowerCase().trim().replace(/\s+/g, '-');
    try {
      await setDoc(doc(db, "branques", slug), {
        id: slug,
        nom: editingBranca.nom.trim(),
        ordre: Number(editingBranca.ordre || 1)
      }, { merge: true });
      alert("Branca desada amb èxit!");
      setEditingBranca(null);
    } catch (err) {
      alert("Error desant la branca: " + err.message);
    }
  };

  // Delete Branca
  const handleDeleteBranca = async (id) => {
    if (!window.confirm(`Estàs segur que vols eliminar la branca '${id}'?`)) return;
    try {
      await deleteDoc(doc(db, "branques", id));
      alert("Branca eliminada.");
    } catch (err) {
      alert("Error eliminant la branca: " + err.message);
    }
  };

  // Change Access Key
  const handleChangeKey = async (e) => {
    e.preventDefault();
    setKeyChangeStatus({ type: '', msg: '' });
    if (!newKeyInput || newKeyInput.trim().length < 4) {
      setKeyChangeStatus({ type: 'error', msg: 'La clau d\'accés ha de tenir almenys 4 caràcters.' });
      return;
    }
    try {
      await updateAccessKeyInFirestore(newKeyInput.trim());
      setKeyChangeStatus({ type: 'success', msg: '✓ Clau d\'accés actualitzada correctament a Firestore!' });
      setNewKeyInput('');
    } catch (err) {
      setKeyChangeStatus({ type: 'error', msg: 'Error actualitzant clau: ' + err.message });
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered consultes
  const filteredConsultes = consultes.filter(c => {
    const matchesSearch = 
      (c.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.missatge || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.telefon || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'tots') return matchesSearch;
    if (statusFilter === 'pendent') return matchesSearch && c.estat !== 'llegit';
    if (statusFilter === 'llegit') return matchesSearch && c.estat === 'llegit';
    return matchesSearch;
  });

  const pendentsCount = consultes.filter(c => c.estat !== 'llegit').length;

  const filteredPressupostos = pressupostos.filter(p => {
    if (pressupostFilter === 'tots') return true;
    if (pressupostFilter === 'pendent') return p.estat !== 'ates';
    if (pressupostFilter === 'ates') return p.estat === 'ates';
    return true;
  });

  const pressupostosPendentsCount = pressupostos.filter(p => p.estat !== 'ates').length;

  // ----------------------------------------------------
  // LOGIN SCREEN (UNAUTHENTICATED)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="pt-28 pb-32 px-margin-mobile md:px-margin-desktop max-w-md mx-auto animate-fadeIn">
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline/15 shadow-lg">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-container/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <span className="font-label-sm text-xs text-primary uppercase tracking-widest block mb-1">Accés Restringit</span>
            <h1 className="font-serif text-2xl font-semibold text-primary">Àrea Privada de Treball</h1>
            <p className="text-sm text-on-surface-variant mt-1">Introdueix la clau d'accés per gestionar les consultes de Mínim Món.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2" htmlFor="access-key-input">
                Clau d'Accés
              </label>
              <div className="relative">
                <input 
                  id="access-key-input"
                  type="password"
                  required
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pl-11 rounded-lg bg-surface border border-outline/30 text-on-surface focus:outline-none focus:border-primary transition-colors text-base"
                />
                <Key className="w-5 h-5 text-on-surface-variant absolute left-3 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 px-6 bg-primary hover:bg-primary-container text-on-primary font-medium rounded-lg transition-all shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificant clau...</span>
                </>
              ) : (
                <>
                  <span>Entrar a l'Àrea Privada</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED: PRIVATE DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="pt-28 pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto animate-fadeIn">
      
      {/* Top Header Bar */}
      <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline/15 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sessió Activa
            </span>
            <span className="text-xs text-on-surface-variant">· Firestore Online</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl text-primary font-semibold">
            Àrea Privada de Treball
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Gestió interna de consultes, fitxes de projectes, branques i paràmetres de Mínim Món.
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <button 
            onClick={() => setActiveTab('producc')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm text-sm"
            title="Accedir a l'aplicació Producc (Gestió de Producció)"
          >
            <Boxes className="w-4 h-4" />
            <span>Producc</span>
          </button>

          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface border border-outline/20 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            title="Tancar sessió"
          >
            <LogOut className="w-4 h-4 text-error" />
            <span>Tancar Sessió</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs (5 Conceptual Vertical Columns) */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline/15 shadow-xs mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          
          {/* COLUMNA 1: PROJECTES I CATEGORIES */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-mono font-bold text-on-surface-variant/70 px-1 border-b border-outline/10 pb-1 truncate">
              Projectes i Categories
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModule('projectes')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'projectes' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span className="truncate">Projectes</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'projectes' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {dbProjects.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveModule('branques')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'branques' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span className="truncate">Categories</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'branques' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {dbBranques.length}
                </span>
              </button>
            </div>
          </div>

          {/* COLUMNA 2: PRODUCTES I GRUPS */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-mono font-bold text-on-surface-variant/70 px-1 border-b border-outline/10 pb-1 truncate">
              Productes i Grups
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModule('productes')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'productes' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="truncate">Productes</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'productes' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {dbProductesAdmin.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveModule('taxonomy')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'taxonomy' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-4 h-4 shrink-0" />
                  <span className="truncate">Grups</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'taxonomy' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {dbGammes.length}
                </span>
              </button>
            </div>
          </div>

          {/* COLUMNA 3: VENDES I PREUS */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-mono font-bold text-on-surface-variant/70 px-1 border-b border-outline/10 pb-1 truncate">
              Vendes i Preus
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModule('pressupostos')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'pressupostos' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span className="truncate">Pressupostos</span>
                </div>
                {pressupostosPendentsCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold shrink-0">
                    {pressupostosPendentsCount}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'pressupostos' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {pressupostos.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveModule('calcul_pressupostos')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'calcul_pressupostos' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Calculator className="w-4 h-4 shrink-0" />
                  <span className="truncate">Càlcul de preus</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'calcul_pressupostos' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {calculsPressupostos.length}
                </span>
              </button>
            </div>
          </div>

          {/* COLUMNA 4: ATENCIÓ */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-mono font-bold text-on-surface-variant/70 px-1 border-b border-outline/10 pb-1 truncate">
              Atenció
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModule('consultes')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'consultes' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Comunicacions</span>
                </div>
                {pendentsCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold shrink-0">
                    {pendentsCount}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'consultes' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {consultes.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveModule('valoracions')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'valoracions' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Star className="w-4 h-4 shrink-0" />
                  <span className="truncate">Valoracions</span>
                </div>
                {valoracionsPendentsCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold shrink-0">
                    {valoracionsPendentsCount}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'valoracions' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {valoracionsAdmin.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* COLUMNA 5: SISTEMA */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-mono font-bold text-on-surface-variant/70 px-1 border-b border-outline/10 pb-1 truncate">
              Sistema
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModule('frases')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'frases' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Quote className="w-4 h-4 shrink-0" />
                  <span className="truncate">Frases</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold shrink-0 ${activeModule === 'frases' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {dbFrases.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveModule('config')}
                className={`w-full h-12 px-3.5 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  activeModule === 'config' 
                    ? 'bg-primary text-on-primary font-semibold shadow-xs border-primary' 
                    : 'bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary border-outline/15'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="truncate">Configuració</span>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODULE 1: CONSULTES I ENCÀRRECS */}
      {activeModule === 'consultes' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per nom, email o text..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-outline/20 text-sm focus:outline-none focus:border-primary"
              />
              <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3" />
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              <button 
                onClick={() => setStatusFilter('tots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'tots' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Totes ({consultes.length})
              </button>
              <button 
                onClick={() => setStatusFilter('pendent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'pendent' ? 'bg-amber-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Pendents ({pendentsCount})
              </button>
              <button 
                onClick={() => setStatusFilter('llegit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'llegit' ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Llegides ({consultes.length - pendentsCount})
              </button>
            </div>
          </div>

          {/* Table / List */}
          {loadingConsultes ? (
            <div className="p-12 text-center text-on-surface-variant flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Carregant consultes des de Cloud Firestore...</span>
            </div>
          ) : filteredConsultes.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline/15 text-center text-on-surface-variant">
              <MessageSquare className="w-12 h-12 text-outline/40 mx-auto mb-3" />
              <p className="font-serif text-lg text-primary">No s'ha trobat cap consulta</p>
              <p className="text-xs text-on-surface-variant mt-1">Quan els usuaris enviïn missatges des de la web, apareixeran automàticament aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Messages Table/List */}
              <div className={`${selectedConsulta ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3 transition-all`}>
                {filteredConsultes.map((c) => {
                  const isSelected = selectedConsulta && selectedConsulta.id === c.id;
                  const isRead = c.estat === 'llegit';

                  return (
                    <div 
                      key={c.id}
                      onClick={() => setSelectedConsulta(c)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'border-primary bg-primary-container/10 shadow-md ring-1 ring-primary' 
                          : isRead 
                            ? 'border-outline/15 bg-surface-container-lowest hover:border-outline/30' 
                            : 'border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRead ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          <h3 className="font-semibold text-primary text-base leading-tight">{c.nom || 'Sense nom'}</h3>
                        </div>

                        <span className="text-xs text-on-surface-variant shrink-0 font-mono">{c.dateFormatted}</span>
                      </div>

                      <p className="text-xs text-on-surface-variant mb-3 line-clamp-1">{c.email} {c.telefon ? `· ${c.telefon}` : ''}</p>
                      
                      <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed font-sans">{c.missatge}</p>

                      <div className="mt-4 pt-3 border-t border-outline/10 flex justify-between items-center">
                        <button 
                          onClick={(e) => handleToggleStatus(c, e)}
                          className={`text-xs font-medium px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                            isRead ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isRead ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isRead ? 'Marcar com a pendent' : 'Marcar com a llegit'}</span>
                        </button>

                        <button 
                          onClick={(e) => handleDeleteConsulta(c.id, e)}
                          className="text-xs text-error hover:bg-error-container/30 p-1.5 rounded transition-colors"
                          title="Eliminar consulta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Detail Card */}
              {selectedConsulta && (
                <div className="lg:col-span-6 bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/30 shadow-lg relative self-start sticky top-24">
                  
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-outline/15">
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider mb-2 ${
                        selectedConsulta.estat === 'llegit' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {selectedConsulta.estat === 'llegit' ? 'Llegit' : 'Pendent de gestió'}
                      </span>
                      <h2 className="font-serif text-2xl text-primary font-semibold">{selectedConsulta.nom}</h2>
                      <p className="text-xs text-on-surface-variant font-mono mt-1">{selectedConsulta.dateFormatted}</p>
                    </div>

                    <button 
                      onClick={() => setSelectedConsulta(null)}
                      className="text-on-surface-variant hover:text-primary text-sm p-1 rounded bg-surface hover:bg-surface-container cursor-pointer"
                    >
                      ✕ Tancar
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-6 bg-surface-container p-4 rounded-lg border border-outline/10 text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <a href={`mailto:${selectedConsulta.email}`} className="text-primary hover:underline font-mono text-xs md:text-sm truncate">
                        {selectedConsulta.email}
                      </a>
                      <button 
                        onClick={() => handleCopyText(selectedConsulta.email, 'email')}
                        className="ml-auto text-xs text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        {copiedId === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {selectedConsulta.telefon && (
                      <div className="flex items-center gap-3 pt-2 border-t border-outline/10">
                        <Phone className="w-4 h-4 text-primary shrink-0" />
                        <a href={`tel:${selectedConsulta.telefon}`} className="text-primary hover:underline font-mono text-xs md:text-sm">
                          {selectedConsulta.telefon}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="mb-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Contingut del Missatge:</h3>
                    <div className="p-4 rounded-lg bg-surface border border-outline/15 text-on-surface text-body-md leading-relaxed whitespace-pre-line font-sans">
                      {selectedConsulta.missatge}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-outline/15">
                    <a 
                      href={`https://mail.google.com/mail/u/minimmon58@gmail.com/?view=cm&fs=1&authuser=minimmon58@gmail.com&from=minimmon58@gmail.com&to=${encodeURIComponent(selectedConsulta.email)}&su=${encodeURIComponent(`Consulta Mínim Món - ${selectedConsulta.nom}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container transition-colors flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Obrir a Gmail</span>
                    </a>

                    <button 
                      onClick={(e) => handleToggleStatus(selectedConsulta, e)}
                      className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-sm font-medium border border-outline/20 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>{selectedConsulta.estat === 'llegit' ? 'Marcar com a Pendent' : 'Marcar com a Llegit'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* MODULE: PRESSUPOSTOS REBUTS */}
      {activeModule === 'pressupostos' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary">Sol·licituds de Pressupost Rebuts</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Llista de les cistelles de pressupostos enviades pels clients des de la web.
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              <button 
                onClick={() => setPressupostFilter('tots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  pressupostFilter === 'tots' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Tots ({pressupostos.length})
              </button>
              <button 
                onClick={() => setPressupostFilter('pendent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  pressupostFilter === 'pendent' ? 'bg-amber-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Pendents ({pressupostosPendentsCount})
              </button>
              <button 
                onClick={() => setPressupostFilter('ates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  pressupostFilter === 'ates' ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Atesos ({pressupostos.length - pressupostosPendentsCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Llista de Pressupostos */}
            <div className={`${selectedPressupost ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
              {loadingPressupostos ? (
                <div className="p-8 text-center text-on-surface-variant">Carregant pressupostos des de Firestore...</div>
              ) : filteredPressupostos.length === 0 ? (
                <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline/15 text-on-surface-variant">
                  <ShoppingBag className="w-8 h-8 text-outline mx-auto mb-2" />
                  <p className="font-serif text-base text-primary">No s'ha trobat cap sol·licitud de pressupost</p>
                </div>
              ) : (
                filteredPressupostos.map((p) => {
                  const isAtes = p.estat === 'ates';
                  const isSelected = selectedPressupost && selectedPressupost.id === p.id;

                  return (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPressupost(p)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'bg-surface-container-lowest border-primary shadow-md ring-2 ring-primary/20' 
                          : isAtes
                            ? 'bg-surface-container-lowest border-outline/15 hover:border-primary/40'
                            : 'border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAtes ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                            {p.codiReferencia || p.id}
                          </span>
                        </div>

                        <span className="text-xs font-mono text-on-surface-variant">
                          {p.data ? new Date(p.data.seconds * 1000).toLocaleDateString('ca-ES') : 'Recent'}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg text-primary font-semibold mb-1">{p.clientNom}</h3>

                      <div className="text-xs text-on-surface-variant space-y-1 mb-3">
                        <p>Contacte: <strong className="text-primary font-mono">{p.clientContacte}</strong></p>
                        <p>Peces demanades: <strong className="text-primary font-mono font-bold">{(p.productes || []).reduce((acc, i) => acc + (Number(i.quantitat) || 1), 0)} unitats</strong> <span className="text-[11px] text-on-surface-variant font-normal">({(p.productes || []).length} {(p.productes || []).length === 1 ? 'model' : 'models'})</span></p>
                      </div>

                      <div className="pt-3 border-t border-outline/10 flex flex-wrap items-center justify-between gap-2">
                        <button 
                          onClick={(e) => handleTogglePressupostStatus(p, e)}
                          className={`text-xs font-medium px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                            isAtes ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isAtes ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isAtes ? 'Marcar com a pendent' : 'Marcar com a atès'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={p.clientContacte && p.clientContacte.includes('@')
                              ? `https://mail.google.com/mail/u/minimmon58@gmail.com/?view=cm&fs=1&authuser=minimmon58@gmail.com&from=minimmon58@gmail.com&to=${encodeURIComponent(p.clientContacte)}&su=${encodeURIComponent(`Pressupost Mínim Món - ${p.codiReferencia || p.id}`)}`
                              : `https://mail.google.com/mail/u/minimmon58@gmail.com/?view=cm&fs=1&authuser=minimmon58@gmail.com&from=minimmon58@gmail.com&su=${encodeURIComponent(`Pressupost Mínim Món - ${p.clientNom} (${p.clientContacte})`)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 bg-surface hover:bg-surface-container text-primary border border-outline/20 text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Obrir Gmail en una nova pestanya amb el compte minimmon58@gmail.com"
                          >
                            <Mail className="w-3 h-3 text-primary" />
                            <span>Gmail</span>
                          </a>

                          <button 
                            onClick={(e) => handleDeletePressupost(p.id, e)}
                            className="text-xs text-error hover:bg-error-container/30 p-1.5 rounded transition-colors"
                            title="Eliminar pressupost"
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

            {/* Detall del Pressupost Seleccionat */}
            {selectedPressupost && (
              <div className="lg:col-span-6 bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/30 shadow-lg space-y-6 sticky top-24 self-start">
                <div className="flex justify-between items-start border-b border-outline/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedPressupost.estat === 'ates' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                        {selectedPressupost.codiReferencia || selectedPressupost.id}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl text-primary font-semibold mt-1">{selectedPressupost.clientNom}</h3>
                    <p className="text-xs text-on-surface-variant font-mono">{selectedPressupost.clientContacte}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPressupost(null)}
                    className="text-xs text-on-surface-variant hover:text-primary px-2.5 py-1 bg-surface border rounded cursor-pointer"
                  >
                    ✕ Tancar
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-mono font-semibold text-primary tracking-wider">Peces Sol·licitades:</h4>
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {(selectedPressupost.productes || []).map((item, idx) => (
                      <div key={idx} className="bg-surface p-3.5 rounded-lg border border-outline/15 text-xs space-y-1.5">
                        <div className="flex justify-between font-semibold text-primary text-sm">
                          <span>{idx + 1}. {item.nom}</span>
                          <span className="font-mono">x{item.quantitat}</span>
                        </div>

                        {Object.keys(item.opcionsTriades || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[11px] text-on-surface-variant">
                            {Object.entries(item.opcionsTriades).map(([k, v]) => (
                              <span key={k} className="bg-surface-container px-2 py-0.5 rounded font-mono">
                                {k}: <strong>{v}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {item.observacions && (
                          <p className="text-xs text-on-surface-variant italic bg-surface-container/50 p-2 rounded">
                            💬 Notes: {item.observacions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedPressupost.observacionsGenerals && (
                    <div className="pt-3 border-t border-outline/15">
                      <h4 className="text-xs uppercase font-mono font-semibold text-primary tracking-wider mb-1">Observacions Generals:</h4>
                      <div className="bg-surface p-3 rounded text-xs text-on-surface-variant whitespace-pre-line border border-outline/10">
                        {selectedPressupost.observacionsGenerals}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accions de Tancament i Gmail */}
                <div className="pt-4 border-t border-outline/15 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={(e) => handleTogglePressupostStatus(selectedPressupost, e)}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs ${
                      selectedPressupost.estat === 'ates'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {selectedPressupost.estat === 'ates' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{selectedPressupost.estat === 'ates' ? 'Marcar com a Pendent' : 'Marcar com a Atès / Respost'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={selectedPressupost.clientContacte && selectedPressupost.clientContacte.includes('@')
                        ? `https://mail.google.com/mail/u/minimmon58@gmail.com/?view=cm&fs=1&authuser=minimmon58@gmail.com&from=minimmon58@gmail.com&to=${encodeURIComponent(selectedPressupost.clientContacte)}&su=${encodeURIComponent(`Pressupost Mínim Món - ${selectedPressupost.codiReferencia || selectedPressupost.id}`)}`
                        : `https://mail.google.com/mail/u/minimmon58@gmail.com/?view=cm&fs=1&authuser=minimmon58@gmail.com&from=minimmon58@gmail.com&su=${encodeURIComponent(`Pressupost Mínim Món - ${selectedPressupost.clientNom} (${selectedPressupost.clientContacte})`)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-surface hover:bg-surface-container text-primary border border-outline/20 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Obrir esborrany a Gmail en una nova pestanya"
                    >
                      <Mail className="w-4 h-4 text-primary" />
                      <span>Obrir a Gmail</span>
                    </a>

                    <button
                      onClick={(e) => handleDeletePressupost(selectedPressupost.id, e)}
                      className="px-3 py-2 bg-error-container/20 hover:bg-error-container/40 text-error text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      title="Eliminar sol·licitud"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE: CÀLCUL DE PRESSUPOSTOS */}
      {activeModule === 'calcul_pressupostos' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Module Banner */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5" />
                  Eina Interna de Pressupostació
                </span>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-primary">Càlcul i Pressupostador de Venda</h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
                Especifica el preu de cost manual (fabricació Odoo), aplica els percentatges acumulatius (guany comercial, quantitat/volum, recàrrec estacional i demanda urgent) i detecta l'històric d'anteriors preus del mateix client i article.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetCalculForm}
                className="px-4 py-2 bg-surface hover:bg-surface-container border border-outline/20 text-on-surface text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Netejar Formulari</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Calculator Form + Calculations Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form & Controls (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              <form onSubmit={handleSaveCalcul} className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline/15 shadow-sm space-y-6">
                
                {/* Section 1: Client & Product Identification */}
                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2 border-b border-outline/15 pb-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    <span>1. Identificació del Client i Article</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom Client */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                        Nom del Client <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={calcClientNom}
                        onChange={(e) => setCalcClientNom(e.target.value)}
                        placeholder="Ex: Maria Garcia / Empresa SL"
                        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline/20 text-sm text-primary focus:outline-none focus:border-primary font-medium"
                        required
                      />
                    </div>

                    {/* Contacte Client */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                        Contacte (Email / Telèfon)
                      </label>
                      <input
                        type="text"
                        value={calcClientContacte}
                        onChange={(e) => setCalcClientContacte(e.target.value)}
                        placeholder="Ex: maria@gmail.com / 654 321 098"
                        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline/20 text-sm text-primary focus:outline-none focus:border-primary font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Article i Família/Gamma */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Article <span className="text-error">*</span>
                    </label>
                    <div className="flex flex-col md:flex-row gap-2">
                      {/* Textbox Readonly a l'esquerra amb [Família] / [Gamma] */}
                      <div className="w-full md:w-56 shrink-0">
                        <input
                          type="text"
                          readOnly
                          value={calcFamiliaGamma || '— / —'}
                          placeholder="[Família] / [Gamma]"
                          title="Composició [Família] / [Gamma]"
                          className="w-full px-3 py-2.5 rounded-lg bg-surface-container/80 border border-outline/20 font-mono text-xs text-primary font-bold cursor-not-allowed select-none"
                        />
                      </div>

                      {/* Article Editable Input */}
                      <input
                        type="text"
                        value={calcArticleNom}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCalcArticleNom(val);
                          const matched = dbProductesAdmin.find(p => p.nom?.toLowerCase() === val.trim().toLowerCase());
                          if (matched) {
                            setCalcFamiliaGamma(getProductFamiliaGamma(matched, dbGammes));
                          }
                        }}
                        placeholder="Ex: Món Mínim Personalitzat Fusta Fageda / Caixeta Regal"
                        className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-outline/20 text-sm text-primary focus:outline-none focus:border-primary font-medium"
                        required
                      />

                      {/* Selector de Catàleg */}
                      {dbProductesAdmin.length > 0 && (
                        <select
                          onChange={(e) => {
                            const selectedProd = dbProductesAdmin.find(p => p.nom === e.target.value);
                            if (selectedProd) {
                              setCalcArticleNom(selectedProd.nom);
                              setCalcFamiliaGamma(getProductFamiliaGamma(selectedProd, dbGammes));
                            }
                          }}
                          className="px-3 py-2.5 rounded-lg bg-surface border border-outline/20 text-xs text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer max-w-xs"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Seleccionar del Catàleg --</option>
                          {dbProductesAdmin.map(p => (
                            <option key={p.id} value={p.nom}>
                              [{p.codi || 'PRDT'}] {p.nom}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Canal de la Demanda */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Canal de la Demanda de Pressupost <span className="text-error">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCalcCanal('web')}
                        className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          calcCanal === 'web'
                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Web</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalcCanal('whatsapp')}
                        className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          calcCanal === 'whatsapp'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-emerald-500/40'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalcCanal('telefonic')}
                        className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          calcCanal === 'telefonic'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-amber-500/40'
                        }`}
                      >
                        <PhoneCall className="w-4 h-4 text-amber-400" />
                        <span>Telefònic</span>
                      </button>
                    </div>
                  </div>

                  {calcCanal === 'web' && pressupostos.length > 0 && (
                    <div className="bg-surface-container/60 p-3.5 rounded-lg border border-outline/10 space-y-1">
                      <label className="block text-[11px] font-mono text-on-surface-variant">
                        Vincular amb una Sol·licitud Web Rebuda (Opcional):
                      </label>
                      <select
                        value={calcWebRefId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setCalcWebRefId(selectedId);
                          if (!selectedId) return;

                          const matchedWeb = pressupostos.find(p => p.id === selectedId);
                          if (matchedWeb) {
                            // Refrescar SEMPRE client i contacte
                            setCalcClientNom(matchedWeb.clientNom || '');
                            setCalcClientContacte(matchedWeb.clientContacte || '');
                            
                            // Refrescar SEMPRE articles i quantitat demanada de peces
                            if (matchedWeb.productes && matchedWeb.productes.length > 0) {
                              const articlesStr = matchedWeb.productes.map(i => `${i.nom}${i.quantitat > 1 ? ` (x${i.quantitat})` : ''}`).join(', ');
                              setCalcArticleNom(articlesStr);

                              const totalUnits = matchedWeb.productes.reduce((acc, i) => acc + (Number(i.quantitat) || 1), 0);
                              setCalcQuantitatUnits(totalUnits);

                              // Derivar Família / Gamma del primer producte
                              const firstProdNom = matchedWeb.productes[0].nom;
                              const matchedCatalogProd = dbProductesAdmin.find(p => p.nom?.toLowerCase() === firstProdNom?.toLowerCase());
                              if (matchedCatalogProd) {
                                setCalcFamiliaGamma(getProductFamiliaGamma(matchedCatalogProd, dbGammes));
                              } else {
                                setCalcFamiliaGamma('Web / Personalitzat');
                              }
                            } else {
                              setCalcQuantitatUnits(1);
                            }

                            // Refrescar SEMPRE la resenya manual / observacions
                            const obsGen = matchedWeb.observacionsGenerals || '';
                            const obsItems = (matchedWeb.productes || [])
                              .map(p => p.observacions ? `${p.nom}: "${p.observacions}"` : '')
                              .filter(Boolean)
                              .join(' | ');
                            const fullResenya = [obsGen, obsItems].filter(Boolean).join(' -- ');
                            setCalcResenyaManual(fullResenya ? `Sol·licitud Web ${matchedWeb.codiReferencia || matchedWeb.id}: ${fullResenya}` : `Sol·licitud Web ${matchedWeb.codiReferencia || matchedWeb.id}`);
                          }
                        }}
                        className="w-full px-3 py-2 rounded bg-surface border border-outline/20 text-xs font-mono text-primary cursor-pointer"
                      >
                        <option value="">-- Cap sol·licitud vinculada directament --</option>
                        {pressupostos.map(p => {
                          const totUnits = (p.productes || []).reduce((acc, i) => acc + (Number(i.quantitat) || 1), 0);
                          const statusTag = p.estat === 'ates' ? ' ✓ [Atès]' : ' ⏳ [Pendent]';
                          return (
                            <option key={p.id} value={p.id}>
                              [{p.codiReferencia || p.id}] {p.clientNom} - {totUnits} {totUnits === 1 ? 'unitat' : 'unitats'}{statusTag} ({p.data ? new Date(p.data.seconds * 1000).toLocaleDateString('ca-ES') : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Resenya Manual / Context de la Demanda {calcCanal !== 'web' && <span className="text-amber-600 font-bold">(Recomanat per {calcCanal})</span>}
                    </label>
                    <textarea
                      rows={2}
                      value={calcResenyaManual}
                      onChange={(e) => setCalcResenyaManual(e.target.value)}
                      placeholder={
                        calcCanal === 'whatsapp' 
                          ? "Resenya manual del xat de WhatsApp (ex: demana 50 unitats per a un esdeveniment al juny)..." 
                          : calcCanal === 'telefonic'
                            ? "Resenya de la trucada telefònica (ex: consulta directa de trucada al taller)..."
                            : "Resenya o anotacions manuals del pressupost web..."
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline/20 text-xs text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* HISTÒRIC MATCH ALERT BANNER */}
                {historicMatches.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>⚠️ Atenció: Històric trobat per a aquest client i article ({historicMatches.length})</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      S'informa a títol de referència que el client <strong>{calcClientNom}</strong> ja té registrat un preu anterior per a <strong>{calcArticleNom}</strong>.
                      <br />
                      <em className="text-amber-800 dark:text-amber-200 font-medium">⚠️ Aquest preu no s'aplica automàticament directament perquè pot ser diferent per múltiples motius (variació de cost de matèries primeres, quantitat o personalització).</em>
                    </p>

                    <div className="space-y-2 pt-1">
                      {historicMatches.map((match) => (
                        <div key={match.id} className="p-3 bg-surface rounded-lg border border-amber-300 dark:border-amber-900/60 flex flex-col md:flex-row justify-between md:items-center text-xs gap-2 shadow-xs">
                          <div>
                            <div className="font-bold text-primary">{match.articleNom} <span className="font-mono text-[11px] font-normal text-on-surface-variant">({match.dataFormatted || match.dataCreacio?.substring(0,10)})</span></div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">
                              Canal: <span className="capitalize font-semibold text-primary">{match.canal}</span>
                              {match.resenyaManual ? ` · "${match.resenyaManual}"` : ''}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 self-end md:self-auto">
                            <div className="text-right">
                              <div className="text-xs text-on-surface-variant">
                                Preu Venda Previ: <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-mono">{formatCurrency(match.preuVendaFinal, 2)}</strong>
                              </div>
                              <div className="text-[10px] font-mono text-on-surface-variant">
                                Cost base Odoo: {formatCurrency(match.preuCost, 2)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLoadCalculToForm(match)}
                              className="px-3 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Carregar Dades
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Cost (Odoo) & Percentatges */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2 border-b border-outline/15 pb-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <span>2. Preu de Cost (Odoo) i Percentatges Acumulatius</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Preu Cost (Odoo Manual) */}
                    <div className="bg-surface-container/40 p-4 rounded-xl border border-primary/15 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs uppercase tracking-wider font-semibold text-primary">
                          Preu de Cost (€/unitat) <span className="text-error">*</span>
                        </label>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[10px] font-bold rounded uppercase">
                          Odoo
                        </span>
                      </div>
                      <div className="relative">
                        <DecimalInput
                          value={calcPreuCost}
                          onChange={(e) => setCalcPreuCost(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-10 pr-12 py-3 rounded-lg bg-surface border border-primary/30 text-lg font-mono font-bold text-primary focus:outline-none focus:border-primary"
                          required
                        />
                        <span className="absolute left-3.5 top-3.5 text-primary font-bold">€</span>
                        <span className="absolute right-3.5 top-3.5 text-xs text-on-surface-variant font-mono">EUR</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Preu de cost unitari per peça extraït d'Odoo.
                      </p>
                    </div>

                    {/* Quantitat Demanada (Unitats) */}
                    <div className="bg-surface-container/40 p-4 rounded-xl border border-primary/15 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs uppercase tracking-wider font-semibold text-primary">
                          Quantitat Demanada (Unitats) <span className="text-error">*</span>
                        </label>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[10px] font-bold rounded uppercase">
                          Peces
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={calcQuantitatUnits}
                          onChange={(e) => setCalcQuantitatUnits(Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="1"
                          className="w-full px-4 py-3 rounded-lg bg-surface border border-primary/30 text-lg font-mono font-bold text-primary focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Peces totals de la comanda (es carrega des de la cistella web).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                      Factors Percentuals Acumulatius Aplicats sobre el Cost:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. Guany % */}
                      <div className="p-3.5 bg-surface rounded-lg border border-outline/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-primary">
                          <span>📈 Guany Comercial (%)</span>
                          <span className="font-mono text-primary">{calcPercentGuany}%</span>
                        </div>
                        <DecimalInput
                          value={calcPercentGuany}
                          onChange={(e) => setCalcPercentGuany(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-surface-container border border-outline/20 text-xs font-mono text-primary font-bold"
                          placeholder="30"
                        />
                        <p className="text-[10px] text-on-surface-variant">Marge comercial base de l'empresa.</p>
                      </div>

                      {/* 2. Quantitat de compra % */}
                      <div className="p-3.5 bg-surface rounded-lg border border-outline/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-primary">
                          <span>📦 Quantitat de Compra (%)</span>
                          <span className="font-mono text-primary">{calcPercentQuantitat}%</span>
                        </div>
                        <DecimalInput
                          value={calcPercentQuantitat}
                          onChange={(e) => setCalcPercentQuantitat(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-surface-container border border-outline/20 text-xs font-mono text-primary font-bold"
                          placeholder="0 (+ o - %)"
                        />
                        <p className="text-[10px] text-on-surface-variant">Ajust per volum (-% descompte / +% lot petit).</p>
                      </div>

                      {/* 3. Recàrreg estacional % */}
                      <div className="p-3.5 bg-surface rounded-lg border border-outline/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-primary">
                          <span>☀️ Recàrreg Estacional (%)</span>
                          <span className="font-mono text-primary">{calcPercentEstacional}%</span>
                        </div>
                        <DecimalInput
                          value={calcPercentEstacional}
                          onChange={(e) => setCalcPercentEstacional(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-surface-container border border-outline/20 text-xs font-mono text-primary font-bold"
                          placeholder="0"
                        />
                        <p className="text-[10px] text-on-surface-variant">Increments per temporada alta (Nadal, etc.).</p>
                      </div>

                      {/* 4. Demanda urgent % */}
                      <div className="p-3.5 bg-surface rounded-lg border border-outline/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-primary">
                          <span>⚡ Demanda Urgent (%)</span>
                          <span className="font-mono text-primary">{calcPercentUrgent}%</span>
                        </div>
                        <DecimalInput
                          value={calcPercentUrgent}
                          onChange={(e) => setCalcPercentUrgent(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-surface-container border border-outline/20 text-xs font-mono text-primary font-bold"
                          placeholder="0"
                        />
                        <p className="text-[10px] text-on-surface-variant">Recàrrec per lliurament ràpid o exprés.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Preu Calculat & Preu Venda Final */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2 border-b border-outline/15 pb-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <span>3. Resultat del Càlcul i Preu de Venda Final</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    
                    {/* CASELLA 1: PREU CALCULAT (APARTAT & TRANSMISSIÓ) */}
                    <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-5 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs uppercase font-mono font-bold text-emerald-800 dark:text-emerald-300">
                            Preu Calculat (Casella Aportada)
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-mono font-bold">
                            Automàtic
                          </span>
                        </div>

                        <div className="my-2">
                          <div className="text-3xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                            {preuCalculatTotal > 0 ? formatCurrency(preuCalculatTotal, 2) : '0,00 €'}
                          </div>
                          <div className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">
                            Preu Total Comanda ({calcQuantitatUnits} {calcQuantitatUnits === 1 ? 'unitat' : 'unitats'})
                          </div>
                        </div>

                        {calcQuantitatUnits > 1 && (
                          <div className="p-2 bg-emerald-600/10 rounded border border-emerald-500/20 text-xs font-mono text-emerald-900 dark:text-emerald-200 mb-2">
                            Preu Unitari: <strong>{formatCurrency(preuCalculatUnitari, 2)}</strong> / unitat
                          </div>
                        )}

                        <div className="text-[11px] text-on-surface-variant leading-tight space-y-0.5">
                          <div>Fórmula acumulativa sobre cost:</div>
                          <div className="font-mono text-[10px] text-primary">
                            Unitari ({formatCurrency(preuCalculatUnitari, 2)}) = Cost ({formatCurrency(parseDecimal(calcPreuCost), 2)}) × (1+{calcPercentGuany}%) × (1+{calcPercentQuantitat}%) × (1+{calcPercentEstacional}%) × (1+{calcPercentUrgent}%)
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleTransmitPreuVenda('total')}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Transmetre Preu Total ({formatCurrency(preuCalculatTotal, 2)})</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        {calcQuantitatUnits > 1 && (
                          <button
                            type="button"
                            onClick={() => handleTransmitPreuVenda('unitari')}
                            className="w-full py-1.5 bg-surface hover:bg-surface-container border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold rounded text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>Transmetre Preu Unitari ({formatCurrency(preuCalculatUnitari, 2)})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CASELLA 2: PREU DE VENDA FINAL (EDITABLE) */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl border-2 border-primary/30 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs uppercase font-mono font-bold text-primary">
                            Preu de Venda Final (€) <span className="text-error">*</span>
                          </label>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-mono font-bold">
                            Editable Manualment
                          </span>
                        </div>

                        <div className="relative my-2">
                          <DecimalInput
                            value={calcPreuVendaFinal}
                            onChange={(e) => setCalcPreuVendaFinal(e.target.value)}
                            placeholder="0,00"
                            className="w-full pl-10 pr-12 py-2.5 rounded-lg bg-surface border border-primary text-2xl font-mono font-extrabold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          />
                          <span className="absolute left-3.5 top-3 text-primary font-bold text-lg">€</span>
                        </div>

                        <p className="text-[11px] text-on-surface-variant">
                          Pots transmetre el preu calculat directament o escriure manualment el valor definitiu per al client.
                        </p>
                      </div>

                      <div className="pt-2">
                        {calcSavingStatus && (
                          <div className="p-2 mb-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-xs font-mono text-center">
                            {calcSavingStatus}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-3 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-lg text-sm transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Desar Pressupost a l'Històric</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </form>
            </div>

            {/* Historic List & Details Side Column (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 shadow-sm space-y-4">
                
                <div className="flex justify-between items-center border-b border-outline/15 pb-3">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      <span>Històric de Càlculs</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {calculsPressupostos.length} registres desats
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={calcSearchQuery}
                      onChange={(e) => setCalcSearchQuery(e.target.value)}
                      placeholder="Cerca per client o article..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-outline/20 text-xs focus:outline-none focus:border-primary"
                    />
                    <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-2.5" />
                  </div>

                  <div className="flex gap-1 overflow-x-auto text-[11px]">
                    {['tots', 'web', 'whatsapp', 'telefonic'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCalcFilterCanal(c)}
                        className={`px-2.5 py-1 rounded font-medium capitalize cursor-pointer transition-colors ${
                          calcFilterCanal === c ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List of Historic Calculations */}
                {loadingCalculs ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant">Carregant històric des de Firestore...</div>
                ) : calculsPressupostos.length === 0 ? (
                  <div className="p-8 text-center bg-surface rounded-lg border border-outline/10 text-on-surface-variant text-xs space-y-1">
                    <Calculator className="w-6 h-6 mx-auto text-outline" />
                    <p className="font-medium text-primary">Encara no s'ha desat cap càlcul</p>
                    <p className="text-[11px]">Els càlculs desats apareixeran aquí per mantenir un seguiment complet del client.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {calculsPressupostos
                      .filter(item => {
                        const q = calcSearchQuery.toLowerCase();
                        const matchesQuery = !q || (item.clientNom || '').toLowerCase().includes(q) || (item.articleNom || '').toLowerCase().includes(q);
                        const matchesCanal = calcFilterCanal === 'tots' || item.canal === calcFilterCanal;
                        return matchesQuery && matchesCanal;
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-surface rounded-lg border border-outline/15 hover:border-primary/40 transition-all space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-primary block text-sm">{item.clientNom}</span>
                              <span className="text-[11px] text-on-surface-variant">{item.articleNom}</span>
                            </div>
                            <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                              {item.dataFormatted || item.dataCreacio?.substring(0, 10)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] bg-surface-container-lowest p-2 rounded border border-outline/10">
                            <div>
                              <span className="text-on-surface-variant">Canal: </span>
                              <strong className="capitalize font-semibold text-primary">{item.canal}</strong>
                            </div>
                            <div className="text-right">
                              <span className="text-on-surface-variant">Preu Venda: </span>
                              <strong className="text-emerald-700 dark:text-emerald-300 font-mono text-xs">{formatCurrency(item.preuVendaFinal, 2)}</strong>
                            </div>
                          </div>

                          {item.resenyaManual && (
                            <p className="text-[11px] text-on-surface-variant italic line-clamp-2">
                              "{item.resenyaManual}"
                            </p>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-outline/10">
                            <button
                              type="button"
                              onClick={() => handleLoadCalculToForm(item)}
                              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Carregar al Formulari</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteCalcul(item.id, e)}
                              className="text-[11px] text-error hover:bg-error-container/30 p-1 rounded transition-colors"
                              title="Eliminar de l'històric"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODULE: CATÀLEG DE REGALS / PRODUCTES */}
      {activeModule === 'productes' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary">Gestió del Catàleg de Regals / Productes</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Estructura de taula <code className="font-mono text-primary font-bold">productes</code> amb codis autonumèrics (`PRDT-XXXX`), descripció formatada, opcions i preus privats.
              </p>
            </div>

            <button
              onClick={() => {
                const initialGammas = adminGamFilter && adminGamFilter !== 'Totes' ? [adminGamFilter] : [];
                const initialOrdre = calculateSmartNextProductOrder(initialGammas, dbProductesAdmin);
                setEditingProducte({
                  id: `prdt-${Date.now()}`,
                  codi: generateNextProductCode(dbProductesAdmin),
                  nom: '',
                  descripcio: '',
                  imatgePrincipal: '',
                  imatges: [],
                  familaIds: dbFamilies[0]?.nom ? [dbFamilies[0].nom] : [],
                  gammaIds: initialGammas,
                  titolPersonalitzacio: '',
                  requereixPressupost: false,
                  preuDesDe: false,
                  isPreuDesDe: false,
                  opcionsPersonalitzacio: [
                    { tipus: 'desplegable', titol: 'Fusta preferida', valors: 'Noguer, Roure natural, Bedoll' }
                  ],
                  cost: 0,
                  preu: 0,
                  terminiFabricacio: '3 - 5 dies feiners',
                  material: 'Fusta de til·ler',
                  acabat: 'Vernís mat',
                  ordre: initialOrdre,
                  actiu: true
                });
              }}
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nou Producte (Regal)</span>
            </button>
          </div>

          {/* EDITOR FORM DE PRODUCTE */}
          {editingProducte ? (
            <form onSubmit={handleSaveProducte} className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/30 shadow-lg space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center pb-4 border-b border-outline/15">
                <div>
                  <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded">
                    {editingProducte.codi || 'PRDT-0000'}
                  </span>
                  <h3 className="font-serif text-xl text-primary font-semibold mt-1">
                    {dbProductesAdmin.some(p => p.id === editingProducte.id) ? 'Editar Producte' : 'Crear Nou Producte'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProducte(null)}
                  className="text-xs text-on-surface-variant hover:text-primary px-3 py-1.5 bg-surface border rounded cursor-pointer"
                >
                  Cancel·lar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Codi Autonumèric</label>
                  <input
                    type="text"
                    required
                    value={editingProducte.codi || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, codi: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm font-mono font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom del Producte (1 línia) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Puzle 3D de fusta artesanal"
                    value={editingProducte.nom || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, nom: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm text-primary font-semibold"
                  />
                </div>
              </div>

              {/* Descripció amb Barra d'Eines Rich Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant">
                    Descripció (Multilínia)
                  </label>
                  {/* Barra de format [ B ] [ I ] [ U ] */}
                  <div className="flex items-center gap-1 border border-outline/20 rounded p-1 bg-surface">
                    <button
                      type="button"
                      onClick={() => applyFormatToSelection(descTextAreaRef, editingProducte.descripcio || '', 'bold', (txt) => setEditingProducte({ ...editingProducte, descripcio: txt }))}
                      className="px-2.5 py-0.5 font-bold text-xs bg-surface-container hover:bg-primary hover:text-on-primary rounded transition-colors cursor-pointer"
                      title="Negreta (**text**)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatToSelection(descTextAreaRef, editingProducte.descripcio || '', 'italic', (txt) => setEditingProducte({ ...editingProducte, descripcio: txt }))}
                      className="px-2.5 py-0.5 italic text-xs bg-surface-container hover:bg-primary hover:text-on-primary rounded transition-colors cursor-pointer"
                      title="Cursiva (*text*)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatToSelection(descTextAreaRef, editingProducte.descripcio || '', 'underline', (txt) => setEditingProducte({ ...editingProducte, descripcio: txt }))}
                      className="px-2.5 py-0.5 underline text-xs bg-surface-container hover:bg-primary hover:text-on-primary rounded transition-colors cursor-pointer"
                      title="Subratllat (<u>text</u>)"
                    >
                      U
                    </button>
                  </div>
                </div>

                <textarea
                  ref={descTextAreaRef}
                  rows={4}
                  placeholder="Explica la peça... Selecciona text i clica B, I o U per formatar-lo."
                  value={editingProducte.descripcio || ''}
                  onChange={(e) => setEditingProducte({ ...editingProducte, descripcio: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm font-sans resize-y"
                />
              </div>

              {/* Especificacions Tècniques Opcionals (Material, Dimensions, Gruix, Pes, Acabat) */}
              <div className="space-y-3 p-4 bg-surface rounded-lg border border-outline/15">
                <label className="block text-xs uppercase font-semibold text-primary">
                  Especificacions Tècniques Opcionals (Només es mostraran si s'omplen):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-mono text-outline mb-1">Material</label>
                    <input
                      type="text"
                      placeholder="Ex: Fusta de tilo americà"
                      value={editingProducte.material || ''}
                      onChange={(e) => setEditingProducte({ ...editingProducte, material: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-surface-container border text-xs text-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-mono text-outline mb-1">Dimensions</label>
                    <input
                      type="text"
                      placeholder="Ex: 15 x 10 cm"
                      value={editingProducte.dimensions || ''}
                      onChange={(e) => setEditingProducte({ ...editingProducte, dimensions: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-surface-container border text-xs text-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-mono text-outline mb-1">Gruix</label>
                    <input
                      type="text"
                      placeholder="Ex: 2 mm"
                      value={editingProducte.gruix || ''}
                      onChange={(e) => setEditingProducte({ ...editingProducte, gruix: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-surface-container border text-xs text-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-mono text-outline mb-1">Pes</label>
                    <input
                      type="text"
                      placeholder="Ex: 1,3 Kilogramos"
                      value={editingProducte.pes || ''}
                      onChange={(e) => setEditingProducte({ ...editingProducte, pes: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-surface-container border text-xs text-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-mono text-outline mb-1">Acabat</label>
                    <input
                      type="text"
                      placeholder="Ex: Vernís ecològic mat"
                      value={editingProducte.acabat || ''}
                      onChange={(e) => setEditingProducte({ ...editingProducte, acabat: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-surface-container border text-xs text-primary font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Imatges (Fins a 5 URLs Raw GitHub o imatges) */}
              <div className="space-y-2">
                <label className="block text-xs uppercase font-semibold text-on-surface-variant">
                  Imatges (URLs Raw de GitHub o enllaços, 1 per línia, fins a 5 imatges)
                </label>
                <textarea
                  rows={3}
                  placeholder="https://raw.githubusercontent.com/.../imatge1.jpg&#10;https://raw.githubusercontent.com/.../imatge2.jpg"
                  value={editingProducte.imatgesStr !== undefined ? editingProducte.imatgesStr : (editingProducte.imatges || []).join('\n')}
                  onChange={(e) => setEditingProducte({ ...editingProducte, imatgesStr: e.target.value, imatges: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono"
                />
              </div>

              {/* Selecció Dinàmica de Gammes a les que pertany */}
              <div className="bg-surface p-4 rounded-lg border border-outline/15 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase font-semibold text-primary">
                    Gammes a les que pertany (Dinàmic):
                  </label>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {dbGammes.length} gammes disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-surface-container/50 rounded border border-outline/10">
                  {getSortedGammes(dbGammes, dbFamilies, 'Totes').map((gam) => (
                    <label key={gam.id || gam.nom} className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:text-primary p-1 bg-surface rounded border border-outline/10">
                      <input
                        type="checkbox"
                        checked={(editingProducte.gammaIds || []).includes(gam.nom)}
                        onChange={(e) => {
                          const current = editingProducte.gammaIds || [];
                          const updated = e.target.checked
                            ? [...current, gam.nom]
                            : current.filter(g => g !== gam.nom);
                          setEditingProducte({ ...editingProducte, gammaIds: updated });
                        }}
                        className="rounded text-primary"
                      />
                      <span className="font-medium truncate">{gam.nom}</span>
                      {gam.familiaNom && <span className="text-[10px] text-outline font-mono truncate">({gam.familiaNom})</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Builder d'Opcions de Personalització */}
              <div className="space-y-4 p-4 bg-surface rounded-lg border border-outline/15">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase font-semibold text-primary">Opcions de Personalització:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentOps = editingProducte.opcionsPersonalitzacio || [];
                      setEditingProducte({
                        ...editingProducte,
                        opcionsPersonalitzacio: [
                          ...currentOps,
                          { tipus: 'desplegable', titol: '', valors: '' }
                        ]
                      });
                    }}
                    className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Afegir Opció</span>
                  </button>
                </div>

                {/* Títol Personalitzat de la Secció */}
                <div className="bg-surface-container/30 p-3 rounded-lg border border-outline/10 space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-primary">
                    Títol de la Secció de Personalització:
                  </label>
                  <input
                    type="text"
                    placeholder='Per defecte: "PERSONALITZACIÓ:" o "PERSONALITZACIÓ - Mira el simulador en temps real:"'
                    value={editingProducte.titolPersonalitzacio || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, titolPersonalitzacio: e.target.value })}
                    className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary font-mono placeholder:text-outline/50 focus:border-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-on-surface-variant/70">
                    Incideix en els punts clau del producte (ex: <em>PERSONALITZACIÓ - ESCULL LA COMBINACIÓ DE FUSTES:</em>). Si es deixa buit, s'utilitzarà el títol automàtic per defecte.
                  </p>
                </div>

                {(editingProducte.opcionsPersonalitzacio || []).length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Sense opcions de personalització.</p>
                ) : (
                  <div className="space-y-3">
                    {editingProducte.opcionsPersonalitzacio.map((opc, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-surface-container rounded border border-outline/10">
                        {/* Botons per reordenar (Pujar / Baixar) */}
                        <div className="flex items-center gap-0.5 shrink-0 bg-surface border border-outline/20 rounded p-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              if (idx === 0) return;
                              const ops = [...editingProducte.opcionsPersonalitzacio];
                              const temp = ops[idx - 1];
                              ops[idx - 1] = ops[idx];
                              ops[idx] = temp;
                              setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                            }}
                            className={`p-1 rounded transition-colors ${idx === 0 ? 'opacity-25 cursor-not-allowed text-outline' : 'hover:bg-primary/15 text-primary cursor-pointer'}`}
                            title="Pujar opció"
                            aria-label="Pujar opció"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (editingProducte.opcionsPersonalitzacio.length - 1)}
                            onClick={() => {
                              if (idx >= editingProducte.opcionsPersonalitzacio.length - 1) return;
                              const ops = [...editingProducte.opcionsPersonalitzacio];
                              const temp = ops[idx + 1];
                              ops[idx + 1] = ops[idx];
                              ops[idx] = temp;
                              setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                            }}
                            className={`p-1 rounded transition-colors ${idx === (editingProducte.opcionsPersonalitzacio.length - 1) ? 'opacity-25 cursor-not-allowed text-outline' : 'hover:bg-primary/15 text-primary cursor-pointer'}`}
                            title="Baixar opció"
                            aria-label="Baixar opció"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <select
                          value={opc.tipus || 'desplegable'}
                          onChange={(e) => {
                            const ops = [...editingProducte.opcionsPersonalitzacio];
                            ops[idx].tipus = e.target.value;
                            setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                          }}
                          className="bg-surface border border-outline/25 rounded px-2 py-1.5 text-xs text-primary font-mono"
                        >
                          <option value="desplegable">Desplegable</option>
                          <option value="text">Text (línia única)</option>
                          <option value="memo">Memo / Textàrea (multilínia)</option>
                          <option value="quantitat">Quantitat</option>
                          <option value="fitxer">Fitxer</option>
                          <option value="colors">Colors</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Títol (ex: Fusta preferida)"
                          value={opc.titol || ''}
                          onChange={(e) => {
                            const ops = [...editingProducte.opcionsPersonalitzacio];
                            ops[idx].titol = e.target.value;
                            setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                          }}
                          className="bg-surface border border-outline/25 rounded px-3 py-1.5 text-xs text-primary flex-1"
                        />

                        <input
                          type="text"
                          placeholder={
                            opc.tipus === 'desplegable'
                              ? "Valors: Noguer, Roure, Bedoll"
                              : opc.tipus === 'memo'
                              ? "Text d'ajuda (ex: Escriu la teva dedicatoria...)"
                              : "Placeholder de text..."
                          }
                          value={opc.valors || ''}
                          onChange={(e) => {
                            const ops = [...editingProducte.opcionsPersonalitzacio];
                            ops[idx].valors = e.target.value;
                            setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                          }}
                          className="bg-surface border border-outline/25 rounded px-3 py-1.5 text-xs text-primary flex-1"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const ops = editingProducte.opcionsPersonalitzacio.filter((_, i) => i !== idx);
                            setEditingProducte({ ...editingProducte, opcionsPersonalitzacio: ops });
                          }}
                          className="text-error hover:bg-error-container/30 p-1.5 rounded transition-colors cursor-pointer"
                          title="Esborrar opció"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Termini de Fabricació, Preus Privats i Ordre */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface p-4 rounded-lg border border-outline/15">
                <div>
                  <label className="block text-xs uppercase font-semibold text-primary mb-1">Termini de Fabricació:</label>
                  <input
                    type="text"
                    placeholder="Ex: 3 - 5 dies feiners"
                    value={editingProducte.terminiFabricacio || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, terminiFabricacio: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface-container border text-xs text-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-outline mb-1">Cost Intern (Text)</label>
                  <input
                    type="text"
                    placeholder="Ex: 15€ o 12.50 + IVA"
                    value={editingProducte.cost || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface-container border text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-outline mb-1">Preu Orientatiu (Text)</label>
                  <input
                    type="text"
                    placeholder="Ex: 25€ o Segons mida"
                    value={editingProducte.preu || ''}
                    onChange={(e) => setEditingProducte({ ...editingProducte, preu: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface-container border text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-mono text-outline mb-1">Ordre de Visualització (Automàtic)</label>
                  <input
                    type="number"
                    readOnly
                    value={editingProducte.ordre || 1}
                    className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono font-bold text-primary opacity-75 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
                    💡 Assignat automàticament per la gamma. Canvia l'ordre amb les fletxes (▲/▼) de la taula.
                  </p>
                </div>
              </div>

              {/* Switches d'Estat: Actiu / Inactiu, Requereix Pressupost, Preu des de i Novetat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-surface rounded-lg border border-outline/15">
                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProducte.actiu !== false}
                    onChange={(e) => setEditingProducte({ ...editingProducte, actiu: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold">Actiu al Catàleg</span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Si es desmarca, s'oculta temporalment al públic.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProducte.requereixPressupost === true}
                    onChange={(e) => setEditingProducte({ ...editingProducte, requereixPressupost: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold text-primary flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Requereix Pressupost
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Mostra preu orientatiu i botó "Demanar pressupost".</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProducte.preuDesDe === true || editingProducte.isPreuDesDe === true}
                    onChange={(e) => setEditingProducte({ ...editingProducte, preuDesDe: e.target.checked, isPreuDesDe: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold text-primary flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Preu des de
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Mostra el text "PREU DES DE" a la targeta de producte.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProducte.novetat === true}
                    onChange={(e) => setEditingProducte({ ...editingProducte, novetat: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Destacar com a Novetat
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Mostra la vinyeta "NOVETAT" al catàleg.</span>
                  </div>
                </label>
              </div>

              {/* Botons d'Acció */}
              <div className="flex justify-end gap-3 pt-4 border-t border-outline/15">
                <button
                  type="button"
                  onClick={() => setEditingProducte(null)}
                  className="px-4 py-2 bg-surface border hover:bg-surface-container text-xs rounded cursor-pointer"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded shadow cursor-pointer"
                >
                  Desar Producte a Firestore
                </button>
              </div>
            </form>
          ) : (
            /* Llista de Productes en Taula */
            <div className="bg-surface-container-lowest rounded-xl border border-outline/15 overflow-hidden shadow-sm space-y-0">
              
              {/* FILTRES DINÀMICS DE LA TAULA (Família i Gamma) */}
              <div className="p-4 bg-surface-container/60 border-b border-outline/15 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-semibold text-primary">Filtrar per Família:</span>
                  <select
                    value={adminFamFilter}
                    onChange={(e) => {
                      setAdminFamFilter(e.target.value);
                      setAdminGamFilter('Totes');
                    }}
                    className="bg-surface border border-outline/25 rounded px-3 py-1.5 text-xs text-primary font-semibold cursor-pointer outline-none focus:border-primary"
                  >
                    <option value="Totes">Totes les Famílies</option>
                    {dbFamilies.map(f => (
                      <option key={f.id} value={f.nom}>{f.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-semibold text-primary">Filtrar per Gamma:</span>
                  <select
                    value={adminGamFilter}
                    onChange={(e) => setAdminGamFilter(e.target.value)}
                    className="bg-surface border border-outline/25 rounded px-3 py-1.5 text-xs text-primary font-semibold cursor-pointer outline-none focus:border-primary"
                  >
                    <option value="Totes">Totes les Gammes</option>
                    {getSortedGammes(dbGammes, dbFamilies, adminFamFilter).map(g => (
                      <option key={g.id || g.nom} value={g.nom}>
                        {adminFamFilter === 'Totes' ? `(${g.familiaNom || 'Sense família'}) ${g.nom}` : g.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {(adminFamFilter !== 'Totes' || adminGamFilter !== 'Totes') && (
                  <button
                    onClick={() => { setAdminFamFilter('Totes'); setAdminGamFilter('Totes'); }}
                    className="text-xs text-primary underline font-medium cursor-pointer ml-auto"
                  >
                    Netejar filtres
                  </button>
                )}
              </div>

              {loadingProductesAdmin ? (
                <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Carregant productes des de Firestore...</span>
                </div>
              ) : dbProductesAdmin.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant space-y-3">
                  <Package className="w-10 h-10 text-outline mx-auto" />
                  <p className="font-serif text-lg text-primary">No hi ha cap producte creat a Firestore encara</p>
                  <p className="text-xs">El catàleg públic està utilitzant les dades inicials de mostra. Fes clic a "Nou Producte" per crear el teu primer regal.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                      <tr>
                        <th className="p-4">Codi</th>
                        <th className="p-4 font-mono">Ordre</th>
                        <th className="p-4">Imatge</th>
                        <th className="p-4">Nom del Producte</th>
                        <th className="p-4">Famílies</th>
                        <th className="p-4">Gammes</th>
                        <th className="p-4 font-mono">Cost (€)</th>
                        <th className="p-4 font-mono">Preu (€)</th>
                        <th className="p-4 text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10">
                      {(() => {
                        const filteredAdminProducts = sortProductsWithGammaOrder(
                          dbProductesAdmin.filter(p => {
                            if (adminFamFilter !== 'Totes') {
                              const matchFam = (p.familaIds || []).some(f => f.toLowerCase().includes(adminFamFilter.toLowerCase())) ||
                                (p.gammaIds || []).some(g => g.toLowerCase().includes(adminFamFilter.toLowerCase())) ||
                                p.nom.toLowerCase().includes(adminFamFilter.toLowerCase());
                              if (!matchFam) return false;
                            }
                            if (adminGamFilter !== 'Totes') {
                              const matchGam = (p.gammaIds || []).some(g => g.toLowerCase().includes(adminGamFilter.toLowerCase()));
                              if (!matchGam) return false;
                            }
                            return true;
                          }),
                          adminGamFilter,
                          dbGammes
                        );

                        if (filteredAdminProducts.length === 0) {
                          return (
                            <tr>
                              <td colSpan="9" className="p-8 text-center text-xs text-on-surface-variant">
                                No hi ha cap producte que coincideixi amb els filtres seleccionats.
                              </td>
                            </tr>
                          );
                        }

                        return filteredAdminProducts.map((p, idx) => (
                          <tr key={p.id} id={`product-row-${p.id}`} className="hover:bg-surface-container/40 transition-colors">
                            <td className="p-4 font-mono text-xs font-bold text-primary">{p.codi || 'PRDT-0000'}</td>
                            <td className="p-4 font-mono text-xs font-bold text-primary">
                              <div className="flex items-center gap-2">
                                <span className="w-5">{getEffectiveProductOrder(p, adminGamFilter !== 'Totes' ? adminGamFilter : null)}</span>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveProductOrder(p, filteredAdminProducts[idx - 1])}
                                    title={adminGamFilter !== 'Totes' ? `Pujar d'ordre a la gamma ${adminGamFilter}` : "Pujar d'ordre general"}
                                    className={`p-0.5 rounded transition-colors ${
                                      idx > 0
                                        ? 'hover:bg-primary/20 text-primary cursor-pointer'
                                        : 'opacity-20 cursor-not-allowed text-outline'
                                    }`}
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === filteredAdminProducts.length - 1}
                                    onClick={() => handleMoveProductOrder(p, filteredAdminProducts[idx + 1])}
                                    title={adminGamFilter !== 'Totes' ? `Baixar d'ordre a la gamma ${adminGamFilter}` : "Baixar d'ordre general"}
                                    className={`p-0.5 rounded transition-colors ${
                                      idx < filteredAdminProducts.length - 1
                                        ? 'hover:bg-primary/20 text-primary cursor-pointer'
                                        : 'opacity-20 cursor-not-allowed text-outline'
                                    }`}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="w-10 h-10 rounded bg-surface-container overflow-hidden border">
                                {(() => {
                                  const rawImgs = (p.imatges && p.imatges.length > 0) ? p.imatges : [p.imatgePrincipal].filter(Boolean);
                                  const thumbImg = (p.imatgePrincipal && p.imatgePrincipal.startsWith('http')) 
                                    ? p.imatgePrincipal 
                                    : (rawImgs[0] || p.imatgePrincipal || '');
                                  return thumbImg ? (
                                    <img 
                                      src={resolveMediaUrl(thumbImg)} 
                                      alt="" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        if (rawImgs[0] && e.target.src !== resolveMediaUrl(rawImgs[0])) {
                                          e.target.src = resolveMediaUrl(rawImgs[0]);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-outline">N/A</div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-primary">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{p.nom}</span>
                                {p.novetat && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-0.5 shadow-2xs">
                                    <Sparkles className="w-3 h-3 text-amber-600" /> NOVETAT
                                  </span>
                                )}
                                {p.actiu === false && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-400 inline-flex items-center gap-0.5">
                                    Inactiu
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-xs text-on-surface-variant font-medium">
                              {(() => {
                                const resolvedFamNames = Array.from(new Set(
                                  (p.gammaIds || [])
                                    .map(gamName => dbGammes.find(g => (g.nom || '').toLowerCase() === gamName.toLowerCase())?.familiaNom)
                                    .filter(Boolean)
                                ));
                                const cleanDirectFams = (p.familaIds || []).filter(f => f !== 'Jocs i creativitat');
                                const result = resolvedFamNames.length > 0 ? resolvedFamNames : cleanDirectFams;
                                return result.join(', ') || '-';
                              })()}
                            </td>
                            <td className="p-4 text-xs text-on-surface-variant font-medium">{(p.gammaIds || []).join(', ') || '-'}</td>
                             {(() => {
                               const escData = getProductEscandallData(p, dbEscandalls, dbMaterials, dbOperacions, dbMaquinaria);
                               return (
                                 <>
                                   <td className="p-4 font-mono text-xs">
                                     {escData.hasEscandall ? (
                                       <div className="flex flex-col">
                                         <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                           {formatCurrency(escData.cost, 2)}
                                         </span>
                                         <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-0.5">
                                           ✓ Escandall
                                         </span>
                                       </div>
                                     ) : (
                                       <span className="text-outline">
                                         {p.cost ? formatCurrency(p.cost, 2) : '- - -'}
                                       </span>
                                     )}
                                   </td>
                                   <td className="p-4 font-mono text-xs">
                                     {escData.hasEscandall ? (
                                       <div className="flex flex-col">
                                         <span className="font-bold text-amber-800 dark:text-amber-300">
                                           {formatCurrency(escData.preu, 2)}
                                         </span>
                                         <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono flex items-center gap-0.5">
                                           ✓ Escandall
                                         </span>
                                       </div>
                                     ) : (
                                       <span className="text-outline">
                                         {(p.preuBase !== undefined && Number(p.preuBase) > 0)
                                           ? formatCurrency(p.preuBase, 2)
                                           : (p.preu ? formatCurrency(p.preu, 2) : '- - -')}
                                       </span>
                                     )}
                                   </td>
                                 </>
                               );
                             })()}
                            <td className="p-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await copyDirectLink('producte', p.id);
                                    alert(`Enllaç directe del producte copiat al portapapers:\n\n${res.link}`);
                                  }}
                                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-surface hover:bg-surface-container text-primary border border-outline/25 shadow-2xs"
                                  title="Copiar enllaç directe per a màrqueting"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>Enllaç</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateProducte(p)}
                                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs"
                                  title="Duplicar aquest producte com a plantilla nova"
                                >
                                  <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                                  <span>Duplicar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    savedProductScrollY.current = window.scrollY;
                                    lastEditedProductId.current = p.id;
                                    setEditingProducte(p);
                                  }}
                                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-2xs"
                                  title="Editar producte"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProducte(p.id)}
                                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-error-container/20 hover:bg-error-container/40 text-error border border-error/20 shadow-2xs"
                                  title="Esborrar producte"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-error shrink-0" />
                                  <span>Esborrar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODULE: GESTIÓ DE FAMÍLIES I GAMMES */}
      {activeModule === 'taxonomy' && (
        <div className="space-y-8">
          
          {/* SECCIÓ 1: FAMÍLIES */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline/15 pb-4">
              <div>
                <h2 className="font-serif text-xl font-semibold text-primary">1. Famílies de Regals (Nivell Principal)</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Les famílies agrupen les diferents gammes de productes del catàleg.
                </p>
              </div>

              <button
                onClick={() => setEditingFamilia({ id: `fam-${Date.now()}`, nom: '', ordre: dbFamilies.length + 1 })}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Família</span>
              </button>
            </div>

            {editingFamilia ? (
              <form onSubmit={handleSaveFamilia} className="bg-surface p-5 rounded-lg border border-primary/30 space-y-4 max-w-md">
                <h3 className="font-serif text-base font-semibold text-primary">
                  {dbFamilies.some(f => f.id === editingFamilia.id) ? 'Editar Família' : 'Crear Nova Família'}
                </h3>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom de la Família *</label>
                  <input
                    type="text"
                    required
                    value={editingFamilia.nom || ''}
                    onChange={(e) => setEditingFamilia({ ...editingFamilia, nom: e.target.value })}
                    placeholder="Ex: Jocs i creativitat"
                    className="w-full px-3 py-2 rounded bg-surface border text-sm text-primary font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Subtítol / Descripció Curta</label>
                  <input
                    type="text"
                    value={editingFamilia.descripcio || ''}
                    onChange={(e) => setEditingFamilia({ ...editingFamilia, descripcio: e.target.value })}
                    placeholder="Ex: Peces que inspiren la ment."
                    className="w-full px-3 py-2 rounded bg-surface border text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Imatge de la Família (URL o ruta)</label>
                  <input
                    type="text"
                    value={editingFamilia.imatge || ''}
                    onChange={(e) => setEditingFamilia({ ...editingFamilia, imatge: e.target.value })}
                    placeholder="Ex: imatges/productes/foto.jpg o URL Raw GitHub"
                    className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Ordre</label>
                  <input
                    type="number"
                    value={editingFamilia.ordre || 1}
                    onChange={(e) => setEditingFamilia({ ...editingFamilia, ordre: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingFamilia(null)} className="px-3 py-1.5 bg-surface border text-xs rounded">Cancel·lar</button>
                  <button type="submit" className="px-4 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded">Desar Família</button>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                    <tr>
                      <th className="p-3 font-mono">Ordre</th>
                      <th className="p-3">Imatge</th>
                      <th className="p-3">Nom de la Família</th>
                      <th className="p-3">Descripció</th>
                      <th className="p-3 font-mono">ID</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/10">
                    {dbFamilies.map(f => (
                      <tr key={f.id} className="hover:bg-surface-container/40">
                        <td className="p-3 font-mono text-xs">{f.ordre || 1}</td>
                        <td className="p-3">
                          <div className="w-12 h-9 rounded bg-surface-container overflow-hidden border">
                            {f.imatge ? (
                              <img src={resolveMediaUrl(f.imatge)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-outline">Sense foto</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-primary">{f.nom}</td>
                        <td className="p-3 text-xs text-on-surface-variant max-w-xs truncate">{f.descripcio || '-'}</td>
                        <td className="p-3 font-mono text-xs text-outline">{f.id}</td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => setEditingFamilia(f)} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">Editar</button>
                          <button onClick={() => handleDeleteFamilia(f.id)} className="px-2.5 py-1 bg-error-container/20 text-error text-xs font-semibold rounded">Esborrar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECCIÓ 2: GAMMES */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline/15 pb-4">
              <div>
                <h2 className="font-serif text-xl font-semibold text-primary">2. Gammes de Productes (Subnivell)</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Les gammes apareixen com a opcions de selecció dinàmica quan crees o edites un regal.
                </p>
              </div>

              <button
                onClick={() => setEditingGamma({ id: `gam-${Date.now()}`, nom: '', familiaNom: dbFamilies[0]?.nom || '', ordre: dbGammes.length + 1, textInformatiu: '', imatges: [] })}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Gamma</span>
              </button>
            </div>

            {editingGamma ? (
              <form onSubmit={handleSaveGamma} className="bg-surface p-6 rounded-xl border border-primary/30 shadow-md space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-outline/15">
                  <h3 className="font-serif text-lg font-semibold text-primary">
                    {dbGammes.some(g => g.id === editingGamma.id) ? `Editar Gamma: ${editingGamma.nom}` : 'Crear Nova Gamma'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditingGamma(null)} className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border text-xs rounded-md cursor-pointer">Cancel·lar</button>
                    <button type="submit" className="px-4 py-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-md shadow-xs cursor-pointer">Desar Gamma</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Columna Esquerra: Nom, Família i Ordre */}
                  <div className="md:col-span-4 space-y-4 bg-surface-container-lowest p-4 rounded-xl border border-outline/15">
                    <div>
                      <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom de la Gamma *</label>
                      <input
                        type="text"
                        required
                        value={editingGamma.nom || ''}
                        onChange={(e) => setEditingGamma({ ...editingGamma, nom: e.target.value })}
                        placeholder="Ex: Puzles, Clauers..."
                        className="w-full px-3 py-2 rounded bg-surface border text-sm text-primary font-semibold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Família a la que pertany *</label>
                      <select
                        value={editingGamma.familiaNom || ''}
                        onChange={(e) => setEditingGamma({ ...editingGamma, familiaNom: e.target.value })}
                        className="w-full px-3 py-2 rounded bg-surface border text-xs text-primary font-semibold focus:outline-none focus:border-primary"
                      >
                        {dbFamilies.map(fam => (
                          <option key={fam.id} value={fam.nom}>{fam.nom}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Ordre</label>
                      <input
                        type="number"
                        value={editingGamma.ordre || 1}
                        onChange={(e) => setEditingGamma({ ...editingGamma, ordre: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Columna Dreta: Caixetins d'Informació Comuna (Caixetí 1, Caixetí 2, Caixetins 3) */}
                  <div className="md:col-span-8 space-y-5">
                    
                    {/* Caixetí 1: Text informatiu */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 space-y-1.5">
                      <label className="block text-xs uppercase font-semibold text-primary flex items-center justify-between">
                        <span>Caixetí 1: Text Informatiu Comú (Aparèixerà abans dels productes)</span>
                        <span className="text-[10px] text-on-surface-variant font-normal">Opcional</span>
                      </label>
                      <textarea
                        rows={3}
                        value={editingGamma.textInformatiu || ''}
                        onChange={(e) => setEditingGamma({ ...editingGamma, textInformatiu: e.target.value })}
                        placeholder="Ex: Totes les peces d'aquesta gamma es fabriquen amb fusta de noguer d'origen sostenible i inclouen..."
                        className="w-full px-3 py-2 rounded bg-surface border text-xs leading-relaxed text-primary focus:outline-none focus:border-primary font-body-md"
                      />
                    </div>

                    {/* Caixetí 2: Entrades d'Imatges (Fins a 5) */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs uppercase font-semibold text-primary">
                          Caixetí 2: Imatges Ilustratives de la Gamma (Fins a 5 imatges)
                        </label>
                        {(editingGamma.imatges || []).length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentImgs = editingGamma.imatges || [];
                              if (currentImgs.length < 5) {
                                setEditingGamma({ ...editingGamma, imatges: [...currentImgs, ''] });
                              }
                            }}
                            className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border text-xs font-semibold rounded cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Afegir Imatge ({(editingGamma.imatges || []).length}/5)</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] text-on-surface-variant">
                          Escriu el nom del fitxer (ex: <code className="font-mono bg-surface px-1 rounded font-bold text-primary">puzle_01.jpg</code>) o una URL completa.
                        </p>
                        <p className="text-[10px] text-outline">
                          URL Raw per defecte: <code className="font-mono bg-surface px-1 rounded text-primary font-semibold">https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/productes/</code>
                        </p>
                      </div>

                      <div className="space-y-2">
                        {(editingGamma.imatges || []).map((imgUrl, idx) => {
                          const isShort = imgUrl && !imgUrl.startsWith('http://') && !imgUrl.startsWith('https://');
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-mono text-xs text-outline w-5 text-center shrink-0">{idx + 1}.</span>
                              <input
                                type="text"
                                placeholder={`Imatge ${idx + 1} (ex. puzle_01.jpg o URL)...`}
                                value={imgUrl || ''}
                                onBlur={() => {
                                  if (isShort) {
                                    const updated = [...(editingGamma.imatges || [])];
                                    updated[idx] = resolveProducteMediaUrl(imgUrl);
                                    setEditingGamma({ ...editingGamma, imatges: updated });
                                  }
                                }}
                                onChange={(e) => {
                                  const updated = [...(editingGamma.imatges || [])];
                                  updated[idx] = e.target.value;
                                  setEditingGamma({ ...editingGamma, imatges: updated });
                                }}
                                className="flex-1 px-3 py-1.5 rounded bg-surface border text-xs font-mono focus:outline-none focus:border-primary"
                              />
                              {isShort && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(editingGamma.imatges || [])];
                                    updated[idx] = resolveProducteMediaUrl(imgUrl);
                                    setEditingGamma({ ...editingGamma, imatges: updated });
                                  }}
                                  className="px-2 py-1.5 bg-primary text-on-primary text-[11px] rounded font-semibold whitespace-nowrap cursor-pointer hover:bg-primary-container"
                                  title="Expandir URL de producte"
                                >
                                  ⚡
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingGamma.imatges || []).filter((_, i) => i !== idx);
                                  setEditingGamma({ ...editingGamma, imatges: updated });
                                }}
                                className="p-1.5 text-error hover:bg-error-container/20 rounded cursor-pointer"
                                title="Eliminar imatge"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Caixetins 3: Miniatures de les imatges previsualitzades */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 space-y-2">
                      <label className="block text-xs uppercase font-semibold text-primary">
                        Caixetins 3: Previsualització de Miniatures (Seguint l'ordre de la llista)
                      </label>
                      
                      {(editingGamma.imatges || []).filter(img => Boolean(img)).length === 0 ? (
                        <p className="text-xs text-on-surface-variant/70 italic py-2">No hi ha imatges afegides per previsualitzar.</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {(editingGamma.imatges || []).map((imgUrl, idx) => {
                            if (!imgUrl) return null;
                            const resolved = resolveProducteMediaUrl(imgUrl);
                            return (
                              <div key={idx} className="w-24 h-24 rounded-lg bg-surface border border-outline/20 overflow-hidden relative shadow-xs group shrink-0">
                                <img 
                                  src={resolved} 
                                  alt={`Miniatura ${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
                                  }}
                                />
                                <div className="absolute top-1 left-1 bg-black/60 text-white font-mono text-[9px] px-1 rounded">
                                  #{idx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                    <tr>
                      <th className="p-3 font-mono">Ordre</th>
                      <th className="p-3">Nom de la Gamma</th>
                      <th className="p-3">Família Pare</th>
                      <th className="p-3 font-mono">ID</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/10">
                    {(() => {
                      const sortedGammes = [...dbGammes].sort((a, b) => {
                        const famIndexA = dbFamilies.findIndex(f => (f.nom || '').toLowerCase() === (a.familiaNom || '').toLowerCase());
                        const famIndexB = dbFamilies.findIndex(f => (f.nom || '').toLowerCase() === (b.familiaNom || '').toLowerCase());
                        
                        const idxA = famIndexA !== -1 ? famIndexA : 999;
                        const idxB = famIndexB !== -1 ? famIndexB : 999;
                        
                        if (idxA !== idxB) {
                          return idxA - idxB; // Primer per la Família Pare
                        }
                        
                        return (a.ordre || 1) - (b.ordre || 1); // Després per l'Ordre intern
                      });

                      return sortedGammes.map(g => (
                        <tr key={g.id} className="hover:bg-surface-container/40">
                          <td className="p-3 font-mono text-xs">{g.ordre || 1}</td>
                          <td className="p-3 font-semibold text-primary">{g.nom}</td>
                          <td className="p-3 text-xs text-on-surface-variant">{g.familiaNom}</td>
                          <td className="p-3 font-mono text-xs text-outline">{g.id}</td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingGamma({ textInformatiu: '', imatges: [], ...g })} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">Editar</button>
                            <button onClick={() => handleDeleteGamma(g.id)} className="px-2.5 py-1 bg-error-container/20 text-error text-xs font-semibold rounded">Esborrar</button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 2: MÓN S MÍNIMS (PROJECTES & DB) */}
      {activeModule === 'projectes' && (
        <div className="space-y-6">
          
          {/* Header Bar */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary">Gestió de Fitxes i Projectes (Firestore)</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Estructura completa de les taules <code className="font-mono text-primary font-bold">projectes</code>, <code className="font-mono text-primary font-bold">branques</code> i <code className="font-mono text-primary font-bold">media</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Controls per al mode d'Imatges Aleatòries i Cadència */}
              <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline/20 shadow-xs">
                <button
                  type="button"
                  onClick={handleToggleFeaturedMode}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    featuredConfig.mode === 'random' 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs' 
                      : 'bg-surface-container-high hover:bg-surface text-on-surface-variant hover:text-primary border border-outline/15'
                  }`}
                  title={featuredConfig.mode === 'random' ? 'Mode Aleatori actiu' : 'Prem per activar Mode Aleatori'}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{featuredConfig.mode === 'random' ? 'Imatges Aleatòries: ON' : 'Imatges Aleatòries: OFF'}</span>
                </button>

                {featuredConfig.mode === 'random' && (
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant border-l border-outline/20 pl-2">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[11px] text-on-surface-variant font-medium">Cadència:</span>
                    <input
                      type="number"
                      min="3"
                      max="15"
                      value={featuredConfig.cadenceSeconds}
                      onChange={(e) => handleCadenceChange(e.target.value)}
                      className="w-12 px-1.5 py-0.5 rounded bg-surface border border-outline/25 text-center text-xs font-mono font-bold text-primary outline-none focus:border-primary"
                    />
                    <span className="text-[11px] font-medium">seg</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setEditingProject({
                  id: `projecte-${Date.now()}`,
                  titol: '',
                  subtitol: '',
                  branca: dbBranques[0]?.nom || 'Arquitectura',
                  material: '',
                  encarrec: '',
                  art: '',
                  resolucio: '',
                  detalls: '',
                  video: '',
                  ordre: dbProjects.length + 1,
                  actiu: true,
                  novetat: false,
                  media: []
                })}
                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Nou Projecte</span>
              </button>
            </div>
          </div>

          {seedingStatus && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{seedingStatus}</span>
            </div>
          )}

          {/* PROJECT EDITOR FORM (IF EDITING) */}
          {editingProject ? (
            <form onSubmit={handleSaveProject} className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/30 shadow-lg space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-outline/15">
                <h3 className="font-serif text-xl text-primary font-semibold">
                  {dbProjects.some(p => p.id === editingProject.id) ? `Editar Projecte: ${editingProject.id}` : 'Crear Nou Projecte'}
                </h3>
                <button 
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-xs text-on-surface-variant hover:text-primary px-3 py-1 bg-surface border rounded cursor-pointer"
                >
                  Cancel·lar
                </button>
              </div>

              {/* Basic Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">ID Únic</label>
                  <input 
                    type="text"
                    required
                    value={editingProject.id || ''}
                    onChange={(e) => setEditingProject({...editingProject, id: e.target.value})}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Títol (1 línia)</label>
                  <input 
                    type="text"
                    required
                    value={editingProject.titol || ''}
                    onChange={(e) => setEditingProject({...editingProject, titol: e.target.value})}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Subtítol (1 línia)</label>
                  <input 
                    type="text"
                    value={editingProject.subtitol || ''}
                    onChange={(e) => setEditingProject({...editingProject, subtitol: e.target.value})}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm"
                  />
                </div>
              </div>

              {/* Categories / Branques (Multi-Select) & Data de creació */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">
                    Categories / Branques (Pots seleccionar-ne més d'una)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 rounded bg-surface border border-outline/20">
                    {dbBranques.map(b => {
                      const currentBranques = Array.isArray(editingProject.branques) && editingProject.branques.length > 0
                        ? editingProject.branques
                        : (editingProject.branca ? [editingProject.branca] : []);
                      const isChecked = currentBranques.includes(b.nom);
                      
                      return (
                        <label 
                          key={b.id || b.nom} 
                          className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border transition-all flex items-center gap-1.5 select-none ${
                            isChecked 
                              ? 'bg-primary text-on-primary border-primary shadow-sm' 
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline/20'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let updated = [...currentBranques];
                              if (e.target.checked) {
                                if (!updated.includes(b.nom)) updated.push(b.nom);
                              } else {
                                updated = updated.filter(item => item !== b.nom);
                              }
                              setEditingProject({
                                ...editingProject,
                                branques: updated,
                                branca: updated[0] || ''
                              });
                            }}
                            className="hidden"
                          />
                          <span>{isChecked ? '✓' : '+'}</span>
                          <span>{b.nom}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Data de Creació</label>
                  <input 
                    type="date"
                    value={editingProject.dataCreacio || editingProject.data || ''}
                    onChange={(e) => setEditingProject({...editingProject, dataCreacio: e.target.value})}
                    className="w-full px-3 py-2 rounded bg-surface border text-sm"
                  />
                  <span className="text-[10px] text-on-surface-variant/70 mt-1 block">S'utilitza per ordenar a la galeria (més recents primer)</span>
                </div>
              </div>

              {/* Text Sections */}
              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Secció "L'encàrrec" (Demanda del client)</label>
                <textarea 
                  rows={3}
                  value={editingProject.encarrec || ''}
                  onChange={(e) => setEditingProject({...editingProject, encarrec: e.target.value})}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm leading-relaxed"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Secció "Traducció artística" (Procés i disseny)</label>
                <textarea 
                  rows={3}
                  value={editingProject.art || ''}
                  onChange={(e) => setEditingProject({...editingProject, art: e.target.value})}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm leading-relaxed"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Secció "Resolució" (Resultat final)</label>
                <textarea 
                  rows={3}
                  value={editingProject.resolucio || ''}
                  onChange={(e) => setEditingProject({...editingProject, resolucio: e.target.value})}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm leading-relaxed"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Secció "Detalls Tècnics"</label>
                <textarea 
                  rows={2}
                  value={editingProject.detalls || ''}
                  onChange={(e) => setEditingProject({...editingProject, detalls: e.target.value})}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm leading-relaxed"
                ></textarea>
              </div>

              {/* Video Title & URL */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Títol de la Secció del Vídeo</label>
                  <input 
                    type="text"
                    value={editingProject.titolVideo || ''}
                    onChange={(e) => setEditingProject({...editingProject, titolVideo: e.target.value})}
                    placeholder="Ex: Vídeo del Procés, Animació 3D, Visió 360°..."
                    className="w-full px-3 py-2 rounded bg-surface border text-sm"
                  />
                </div>
                <div className="md:col-span-8">
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">URL del Fitxer de Vídeo (.mp4 / YouTube / Vimeo)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={editingProject.video || ''}
                      onBlur={() => {
                        if (editingProject.video) {
                          setEditingProject({...editingProject, video: resolveMediaUrl(editingProject.video)});
                        }
                      }}
                      onChange={(e) => setEditingProject({...editingProject, video: e.target.value})}
                      placeholder="Nom de fitxer (ex: Herboristeria del Rei_Animació.mp4) o URL..."
                      className="flex-1 px-3 py-2 rounded bg-surface border text-sm font-mono"
                    />
                    {editingProject.video && (
                      <button
                        type="button"
                        onClick={() => setEditingProject({...editingProject, video: resolveMediaUrl(editingProject.video)})}
                        className="px-3 py-2 bg-primary text-on-primary text-xs rounded font-semibold whitespace-nowrap cursor-pointer hover:bg-primary-container"
                        title="Convertir a URL de streaming de vídeo de alta velocitat"
                      >
                        ⚡ Expandir URL
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Media Array Management */}
              <div className="pt-4 border-t border-outline/15 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif text-lg font-semibold text-primary flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>Multimèdia i Imatges (Carrusel i Portada)</span>
                  </h4>
                  <button 
                    type="button"
                    onClick={() => {
                      const newMedia = [...(editingProject.media || []), {
                        id: `img-${Date.now()}`,
                        imatge: '',
                        principal: editingProject.media?.length === 0,
                        inici: null,
                        activa: true,
                        ordre: (editingProject.media?.length || 0) + 1
                      }];
                      setEditingProject({...editingProject, media: newMedia});
                    }}
                    className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border rounded text-xs font-medium cursor-pointer"
                  >
                    + Afegir Imatge
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg border border-outline/15 leading-relaxed">
                  💡 <strong>Auto-expansió de camins de GitHub Desktop:</strong> Pots escriure només el nom del fitxer o el camí relatiu (ex: <code className="font-mono bg-surface px-1 py-0.5 rounded font-bold text-primary">foto1.png</code> o <code className="font-mono bg-surface px-1 py-0.5 rounded font-bold text-primary">imatges/20251206_114500.jpg</code>). Al fer clic fora o prémer el botó <strong>⚡ Expandir URL</strong>, es convertirà immediatament a la URL Raw de GitHub:
                  <code className="font-mono text-primary text-[11px] block mt-1 select-all">{GITHUB_RAW_BASE}</code>
                </p>

                <div className="space-y-3">
                  {(editingProject.media || []).map((m, idx) => {
                    const resolvedImg = resolveMediaUrl(m.imatge);
                    const isShort = m.imatge && !m.imatge.startsWith('http://') && !m.imatge.startsWith('https://');

                    return (
                      <div key={idx} className="p-3 bg-surface border rounded-lg flex flex-col md:flex-row items-center gap-3">
                        {/* Thumbnail Preview */}
                        <div className="w-16 h-12 bg-surface-container rounded overflow-hidden shrink-0 border border-outline/10 flex items-center justify-center relative">
                          {m.imatge ? (
                            <>
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-outline/60 font-mono text-center p-1 pointer-events-none">
                                Carregant...
                              </div>
                              <img 
                                key={resolvedImg}
                                src={resolvedImg} 
                                alt="" 
                                className="w-full h-full object-cover relative z-10"
                                onLoad={(e) => {
                                  e.target.style.display = 'block';
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-outline font-mono">Sense URL</div>
                          )}
                        </div>

                        {/* Input with Auto-Expand */}
                        <div className="flex-1 flex gap-2 w-full">
                          <input 
                            type="text"
                            placeholder="Nom del fitxer (ex. 20251206_114500.jpg) o URL completa..."
                            value={m.imatge || ''}
                            onBlur={() => {
                              if (isShort) {
                                const updated = [...editingProject.media];
                                updated[idx].imatge = resolveMediaUrl(m.imatge);
                                setEditingProject({...editingProject, media: updated});
                              }
                            }}
                            onChange={(e) => {
                              const updated = [...editingProject.media];
                              updated[idx].imatge = e.target.value;
                              setEditingProject({...editingProject, media: updated});
                            }}
                            className="flex-1 px-3 py-1.5 rounded bg-surface-container border text-xs font-mono"
                          />

                          {isShort && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editingProject.media];
                                updated[idx].imatge = resolveMediaUrl(m.imatge);
                                setEditingProject({...editingProject, media: updated});
                              }}
                              className="px-2.5 py-1.5 bg-primary text-on-primary text-xs rounded font-semibold whitespace-nowrap cursor-pointer hover:bg-primary-container shadow-sm"
                              title="Expandir a URL completa de GitHub Raw"
                            >
                              ⚡ Expandir URL
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={m.principal === true}
                              onChange={(e) => {
                                const updated = editingProject.media.map((med, i) => ({
                                  ...med,
                                  principal: i === idx ? e.target.checked : false
                                }));
                                setEditingProject({...editingProject, media: updated});
                              }}
                            />
                            <span>Principal</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <span>Inici:</span>
                            <select 
                              value={m.inici || ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                const updated = [...editingProject.media];
                                updated[idx].inici = val;
                                setEditingProject({...editingProject, media: updated});
                              }}
                              className="bg-surface-container border text-xs rounded px-1.5 py-0.5"
                            >
                              <option value="">- Cap -</option>
                              <option value="1">Posició 1 (Gran)</option>
                              <option value="2">Posició 2 (Sup. Dreta)</option>
                              <option value="3">Posició 3 (Inf. Dreta)</option>
                            </select>
                          </div>

                          {/* Reorder Up/Down */}
                          <div className="flex items-center gap-1 border-l border-outline/15 pl-2">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const updated = [...editingProject.media];
                                const temp = updated[idx - 1];
                                updated[idx - 1] = updated[idx];
                                updated[idx] = temp;
                                updated.forEach((item, i) => item.ordre = i + 1);
                                setEditingProject({ ...editingProject, media: updated });
                              }}
                              className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border rounded text-xs disabled:opacity-30 cursor-pointer font-bold"
                              title="Moure imatge cap amunt al carrusel"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === editingProject.media.length - 1}
                              onClick={() => {
                                if (idx === editingProject.media.length - 1) return;
                                const updated = [...editingProject.media];
                                const temp = updated[idx + 1];
                                updated[idx + 1] = updated[idx];
                                updated[idx] = temp;
                                updated.forEach((item, i) => item.ordre = i + 1);
                                setEditingProject({ ...editingProject, media: updated });
                              }}
                              className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border rounded text-xs disabled:opacity-30 cursor-pointer font-bold"
                              title="Moure imatge cap avall al carrusel"
                            >
                              ▼
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              const updated = editingProject.media.filter((_, i) => i !== idx);
                              setEditingProject({...editingProject, media: updated});
                            }}
                            className="text-error hover:bg-error-container/30 p-1.5 rounded cursor-pointer"
                            title="Eliminar imatge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Switches d'Estat: Actiu / Inactiu i Novetat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface rounded-lg border border-outline/15">
                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProject.actiu !== false}
                    onChange={(e) => setEditingProject({ ...editingProject, actiu: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold">Actiu a Mons Mínims</span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Si es desmarca, s'oculta temporalment de la galeria pública.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProject.novetat === true}
                    onChange={(e) => setEditingProject({ ...editingProject, novetat: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div>
                    <span className="block font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Destacar com a Novetat
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-normal">Mostra la vinyeta "NOVETAT" a la galeria.</span>
                  </div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-outline/15">
                <button 
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-5 py-2.5 bg-surface hover:bg-surface-container text-on-surface border rounded-lg text-sm cursor-pointer"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-sm font-medium shadow cursor-pointer"
                >
                  Desar Projecte a Firestore
                </button>
              </div>
            </form>
          ) : (
            /* PROJECT LIST TABLE */
            <div className="bg-surface-container-lowest rounded-xl border border-outline/15 overflow-hidden shadow-sm">
              {loadingProjects ? (
                <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Carregant taula de projectes...</span>
                </div>
              ) : dbProjects.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant space-y-3">
                  <Database className="w-12 h-12 text-outline/40 mx-auto" />
                  <p className="font-serif text-lg text-primary">No hi ha cap projecte registrat a Firestore</p>
                  <p className="text-xs text-on-surface-variant">Prem el botó <strong>"Nou Projecte"</strong> per afegir el primer projecte.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                      <tr>
                        <th className="p-4">Ordre</th>
                        <th className="p-4">Projecte</th>
                        <th className="p-4">Branca</th>
                        <th className="p-4">Imatges / Vídeo</th>
                        <th className="p-4 text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10">
                      {dbProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-container/40 transition-colors">
                          <td className="p-4 font-mono text-xs">{p.ordre || 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-primary">{p.titol || p.title}</span>
                              {p.novetat && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-0.5 shadow-2xs">
                                  <Sparkles className="w-3 h-3 text-amber-600" /> NOVETAT
                                </span>
                              )}
                              {p.actiu === false && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-400 inline-flex items-center gap-0.5">
                                  Inactiu
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-on-surface-variant">{p.subtitol || p.subtitle}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-surface-container rounded text-xs font-medium">
                              {p.branca || p.category}
                            </span>
                          </td>
                          <td className="p-4 text-xs">
                            <div className="flex items-center gap-2">
                              <span>{(p.media || []).length} imatges</span>
                              {p.video && <Film className="w-3.5 h-3.5 text-primary" title="Té vídeo" />}
                            </div>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={async () => {
                                const res = await copyDirectLink('projecte', p.id);
                                alert(`Enllaç directe del projecte copiat al portapapers:\n\n${res.link}`);
                              }}
                              className="px-3 py-1.5 bg-surface hover:bg-surface-container text-primary border border-outline/20 rounded text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Copiar enllaç directe per a màrqueting"
                            >
                              <Share2 className="w-3 h-3 text-primary" />
                              <span>Enllaç</span>
                            </button>
                            <button 
                              onClick={() => setEditingProject(p)}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(p.id)}
                              className="px-3 py-1.5 bg-error-container/20 hover:bg-error-container/40 text-error rounded text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Esborrar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODULE 3: GESTIÓ DE CATEGORIES */}
      {activeModule === 'branques' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary">Gestió de categories</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Aquestes categories defineixen els filtres de la galeria pública i les categories de cada projecte a Cloud Firestore.
              </p>
            </div>

            <button 
              onClick={() => setEditingBranca({
                id: `branca-${Date.now()}`,
                nom: '',
                ordre: dbBranques.length + 1
              })}
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>

          {/* BRANCA / CATEGORIA EDITOR FORM */}
          {editingBranca ? (
            <form onSubmit={handleSaveBranca} className="bg-surface-container-lowest p-6 rounded-xl border border-primary/30 shadow-lg space-y-4 max-w-lg">
              <div className="flex justify-between items-center pb-3 border-b border-outline/15">
                <h3 className="font-serif text-lg text-primary font-semibold">
                  {dbBranques.some(b => b.id === editingBranca.id) ? `Editar Categoria` : 'Crear Nova Categoria'}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setEditingBranca(null)}
                  className="text-xs text-on-surface-variant hover:text-primary px-2.5 py-1 bg-surface border rounded cursor-pointer"
                >
                  Cancel·lar
                </button>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom de la Categoria</label>
                <input 
                  type="text"
                  required
                  value={editingBranca.nom || ''}
                  onChange={(e) => setEditingBranca({...editingBranca, nom: e.target.value})}
                  placeholder="Ex: Arquitectura, Persones, Diorama..."
                  className="w-full px-3 py-2 rounded bg-surface border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Ordre de visualització</label>
                <input 
                  type="number"
                  value={editingBranca.ordre || 1}
                  onChange={(e) => setEditingBranca({...editingBranca, ordre: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded bg-surface border text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline/15">
                <button 
                  type="button"
                  onClick={() => setEditingBranca(null)}
                  className="px-4 py-2 bg-surface hover:bg-surface-container border text-xs rounded cursor-pointer"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded shadow cursor-pointer"
                >
                  Desar Categoria
                </button>
              </div>
            </form>
          ) : (
            /* CATEGORIES TABLE */
            <div className="bg-surface-container-lowest rounded-xl border border-outline/15 overflow-hidden shadow-sm max-w-2xl">
              {loadingBranques ? (
                <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Carregant categories des de Cloud Firestore...</span>
                </div>
              ) : dbBranques.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <p className="font-serif text-base text-primary">No hi ha categories creades a Firestore</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                    <tr>
                      <th className="p-4">Ordre</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">ID Firestore</th>
                      <th className="p-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/10">
                    {dbBranques.map((b) => (
                      <tr key={b.id || b.nom} className="hover:bg-surface-container/40 transition-colors">
                        <td className="p-4 font-mono text-xs">{b.ordre || 1}</td>
                        <td className="p-4 font-semibold text-primary">{b.nom}</td>
                        <td className="p-4 font-mono text-xs text-on-surface-variant">{b.id}</td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => setEditingBranca(b)}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteBranca(b.id)}
                            className="px-3 py-1.5 bg-error-container/20 hover:bg-error-container/40 text-error rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Esborrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODULE: VALORACIONS I COMENTARIS */}
      {activeModule === 'valoracions' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>Gestió i Moderació de Valoracions</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Revisa, aprova o elimina les valoracions i comentaris enviats pels usuaris del lloc web.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValoracionsFilter('tots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  valoracionsFilter === 'tots' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Totes ({valoracionsAdmin.length})
              </button>
              <button
                type="button"
                onClick={() => setValoracionsFilter('pendent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  valoracionsFilter === 'pendent' ? 'bg-amber-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Pendents ({valoracionsPendentsCount})
              </button>
              <button
                type="button"
                onClick={() => setValoracionsFilter('aprovat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  valoracionsFilter === 'aprovat' ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Aprovades ({valoracionsAdmin.filter(v => v.estat === 'aprovat').length})
              </button>
            </div>
          </div>

          {/* Llista de Valoracions */}
          <div className="space-y-4">
            {valoracionsAdmin
              .filter(v => valoracionsFilter === 'tots' ? true : v.estat === valoracionsFilter)
              .length === 0 ? (
                <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline/15 text-center text-on-surface-variant font-mono text-sm">
                  Sense valoracions {valoracionsFilter !== 'tots' ? `en estat "${valoracionsFilter}"` : 'disponibles'}.
                </div>
              ) : (
                valoracionsAdmin
                  .filter(v => valoracionsFilter === 'tots' ? true : v.estat === valoracionsFilter)
                  .map(v => (
                    <div key={v.id} className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 shadow-2xs flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-primary font-body-md text-sm">{v.autor || 'Anònim'}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-primary/10 text-primary">
                            {v.targetType === 'projecte' ? 'Projecte' : 'Producte'}: {v.targetTitol || v.targetId}
                          </span>
                          <StarRating rating={Number(v.puntuacio) || 5} size="w-4 h-4" />
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            v.estat === 'aprovat' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {v.estat === 'aprovat' ? '✓ Aprovada' : '⏳ Pendent d\'aprovació'}
                          </span>
                        </div>

                        <p className="text-on-surface-variant text-sm italic font-sans bg-surface p-3 rounded-lg border border-outline/10">
                          "{v.comentari}"
                        </p>

                        {v.data && (
                          <span className="text-[10px] font-mono text-on-surface-variant/60 block">
                            Data: {new Date(v.data).toLocaleString('ca-ES')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {v.estat !== 'aprovat' && (
                          <button
                            type="button"
                            onClick={() => handleApproveValoracio(v.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Aprovar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteValoracio(v.id)}
                          className="px-3 py-2 bg-error-container/20 hover:bg-error-container/40 text-error rounded-lg text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                          title="Eliminar valoració"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Esborrar</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
          </div>
        </div>
      )}

      {/* MODULE: GESTIÓ DE FRASES SOLEMNES */}
      {activeModule === 'frases' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                <Quote className="w-5 h-5 text-primary" />
                <span>Gestió de Frases Solemnes & Filosofia</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Edita, activa/desactiva i assigna la pàgina de destí (<strong>Univers Mínim</strong> o <strong>El Taller</strong>) per a les dites poètiques del lloc web.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDefaultFrases}
                className="px-3.5 py-2.5 bg-surface hover:bg-surface-container text-primary border border-outline/25 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                title="Recuperar la frase inicial original si s'havia eliminat"
              >
                <RefreshCw className="w-4 h-4 text-primary" />
                <span>Recuperar Frases Inicials</span>
              </button>
              <button
                onClick={() => {
                  setEditingFrase({
                    id: `frase-${Date.now()}`,
                    quote: '',
                    author: 'Mínim Món',
                    context: '',
                    desti: 'ambdues', // 'univers' | 'taller' | 'ambdues'
                    actiu: true,
                    ordre: dbFrases.length + 1
                  });
                }}
                className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Frase</span>
              </button>
            </div>
          </div>

          {/* Filtres per Pàgina de Destí */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs uppercase font-mono font-bold text-primary mr-1">Pàgina de destí:</span>
              <button
                onClick={() => setFraseFilterDesti('tots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  fraseFilterDesti === 'tots' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Totes ({dbFrases.length})
              </button>
              <button
                onClick={() => setFraseFilterDesti('univers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  fraseFilterDesti === 'univers' ? 'bg-sky-700 text-white font-bold' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                🌟 Univers Mínim ({dbFrases.filter(f => f.desti === 'univers').length})
              </button>
              <button
                onClick={() => setFraseFilterDesti('taller')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  fraseFilterDesti === 'taller' ? 'bg-amber-700 text-white font-bold' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                🪵 El Taller ({dbFrases.filter(f => f.desti === 'taller').length})
              </button>
              <button
                onClick={() => setFraseFilterDesti('ambdues')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  fraseFilterDesti === 'ambdues' ? 'bg-emerald-700 text-white font-bold' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                🔄 Ambdues Pàgines ({dbFrases.filter(f => f.desti === 'ambdues' || f.desti === 'tots').length})
              </button>
              <button
                onClick={() => setFraseFilterDesti('inactives')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  fraseFilterDesti === 'inactives' ? 'bg-gray-700 text-white font-bold' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Inactives ({dbFrases.filter(f => f.actiu === false).length})
              </button>
            </div>
          </div>

          {/* FORMULARIS MODAL D'EDICIÓ / CREACIÓ DE FRASE */}
          {editingFrase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
              <div className="bg-surface-container-lowest rounded-2xl border border-primary/30 shadow-2xl p-6 md:p-8 max-w-xl w-full space-y-6 text-xs overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center pb-3 border-b border-outline/15">
                  <h3 className="font-serif text-lg text-primary font-semibold flex items-center gap-2">
                    <Quote className="w-5 h-5 text-primary" />
                    <span>{dbFrases.some(f => f.id === editingFrase.id) ? 'Editar Frase Solemn' : 'Nova Frase Solemn'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingFrase(null)}
                    className="text-on-surface-variant hover:text-primary p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveFrase} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-semibold text-primary mb-1">
                      Text de la Frase / Cita *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editingFrase.quote || ''}
                      onChange={(e) => setEditingFrase({ ...editingFrase, quote: e.target.value })}
                      placeholder="Ex: La repetició és el verí de l'originalitat."
                      className="w-full p-3 rounded-xl bg-surface border border-outline/25 text-sm font-serif italic text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase font-semibold text-primary mb-1">
                        Autor / Signatura
                      </label>
                      <input
                        type="text"
                        value={editingFrase.author || 'Mínim Món'}
                        onChange={(e) => setEditingFrase({ ...editingFrase, author: e.target.value })}
                        placeholder="Ex: Mínim Món"
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-outline/25 text-xs text-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-primary mb-1">
                        Ordre de visualització
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingFrase.ordre || 1}
                        onChange={(e) => setEditingFrase({ ...editingFrase, ordre: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-outline/25 text-xs text-primary font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-primary mb-1">
                      Context / Nota aclaridora (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editingFrase.context || ''}
                      onChange={(e) => setEditingFrase({ ...editingFrase, context: e.target.value })}
                      placeholder="Ex: Filosofia del taller i l'artesania única"
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-outline/25 text-xs text-on-surface-variant"
                    />
                  </div>

                  {/* Selector de Pàgina de Destí */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-primary mb-2">
                      Pàgina de destí on s'ha de mostrar:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingFrase({ ...editingFrase, desti: 'univers' })}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          editingFrase.desti === 'univers'
                            ? 'bg-sky-500/15 border-sky-500 text-sky-900 dark:text-sky-200 font-bold shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        <span className="font-semibold text-xs flex items-center gap-1">🌟 Univers Mínim</span>
                        <span className="text-[10px] opacity-75 mt-1">Pàgina d'inici i portada general</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingFrase({ ...editingFrase, desti: 'taller' })}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          editingFrase.desti === 'taller'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        <span className="font-semibold text-xs flex items-center gap-1">🪵 El Taller</span>
                        <span className="text-[10px] opacity-75 mt-1">Pàgina del taller artesanal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingFrase({ ...editingFrase, desti: 'ambdues' })}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          (editingFrase.desti === 'ambdues' || editingFrase.desti === 'tots')
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                            : 'bg-surface border-outline/20 text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        <span className="font-semibold text-xs flex items-center gap-1">🔄 Ambdues Pàgines</span>
                        <span className="text-[10px] opacity-75 mt-1">Visible a Univers i a Taller</span>
                      </button>
                    </div>
                  </div>

                  {/* Switch Activa / Inactiva */}
                  <div className="pt-2">
                    <label className="flex items-center gap-3 text-xs font-semibold text-primary cursor-pointer p-3 bg-surface rounded-xl border border-outline/15">
                      <input
                        type="checkbox"
                        checked={editingFrase.actiu !== false}
                        onChange={(e) => setEditingFrase({ ...editingFrase, actiu: e.target.checked })}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <div>
                        <span className="block font-bold">Frase Activa al web</span>
                        <span className="text-[11px] text-on-surface-variant font-normal">Si es desmarca, la frase es guarda però no es mostra al públic.</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-outline/15">
                    <button
                      type="button"
                      onClick={() => setEditingFrase(null)}
                      className="px-4 py-2 bg-surface border hover:bg-surface-container text-xs rounded-xl cursor-pointer"
                    >
                      Cancel·lar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Desar Frase</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Llista de Frases en Targetes Elegants */}
          <div className="space-y-4">
            {(() => {
              const filteredFrases = dbFrases.filter(f => {
                if (fraseFilterDesti === 'inactives') return f.actiu === false;
                if (fraseFilterDesti === 'univers') return (f.desti === 'univers' || f.desti === 'ambdues' || f.desti === 'tots') && f.actiu !== false;
                if (fraseFilterDesti === 'taller') return (f.desti === 'taller' || f.desti === 'ambdues' || f.desti === 'tots') && f.actiu !== false;
                if (fraseFilterDesti === 'ambdues') return (f.desti === 'ambdues' || f.desti === 'tots') && f.actiu !== false;
                return true;
              }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

              if (filteredFrases.length === 0) {
                return (
                  <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline/15 text-on-surface-variant space-y-2">
                    <Quote className="w-8 h-8 text-outline mx-auto" />
                    <p className="font-serif text-base text-primary">No s'ha trobat cap frase amb aquest filtre.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-4">
                  {filteredFrases.map((frase, idx) => (
                    <div
                      key={frase.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        frase.actiu === false 
                          ? 'bg-surface-container/30 border-outline/15 opacity-60' 
                          : 'bg-surface-container-lowest border-outline/20 hover:border-primary/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-surface-container rounded border text-primary">
                            #{frase.ordre || idx + 1}
                          </span>

                          {/* Badge de Destí */}
                          {(frase.desti === 'univers') && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300 inline-flex items-center gap-1 shadow-2xs">
                              🌟 Univers Mínim
                            </span>
                          )}
                          {(frase.desti === 'taller') && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                              🪵 El Taller
                            </span>
                          )}
                          {(frase.desti === 'ambdues' || frase.desti === 'tots' || !frase.desti) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                              🔄 Ambdues Pàgines
                            </span>
                          )}

                          {frase.actiu === false && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-400">
                              Inactiva
                            </span>
                          )}
                        </div>

                        <blockquote className="font-serif text-base md:text-lg italic font-light text-primary leading-snug">
                          “{frase.quote}”
                        </blockquote>

                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span className="font-semibold text-primary">— {frase.author || 'Mínim Món'}</span>
                          {frase.context && <span className="text-[11px] font-mono text-outline">({frase.context})</span>}
                        </div>
                      </div>

                      {/* Controls de Reordenació i Accions */}
                      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end border-outline/10">
                        {/* Botons d'Ordre */}
                        <div className="flex items-center border rounded-lg bg-surface p-0.5 border-outline/20">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveFraseOrder(frase, -1)}
                            className="p-1.5 text-primary hover:bg-surface-container rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Moure amunt"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === filteredFrases.length - 1}
                            onClick={() => handleMoveFraseOrder(frase, 1)}
                            className="p-1.5 text-primary hover:bg-surface-container rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Moure avall"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Botó Activar / Desactivar Ràpid */}
                        <button
                          type="button"
                          onClick={() => handleToggleFraseActiu(frase)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            frase.actiu !== false
                              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {frase.actiu !== false ? 'Activa' : 'Inactiva'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingFrase(frase)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFrase(frase.id)}
                          className="p-1.5 text-error hover:bg-error-container/30 rounded-lg cursor-pointer transition-colors"
                          title="Eliminar frase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODULE 4: CONFIGURACIÓ I SEGURETAT */}
      {activeModule === 'config' && (
        <div className="space-y-8 max-w-2xl">
          {/* Key Change Card */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline/15 shadow-sm">
            <div className="mb-6">
              <h2 className="font-serif text-xl font-semibold text-primary">Canviar Clau d'Accés de l'Àrea Privada</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Aquesta clau es guarda directament al teu Cloud Firestore (<code className="font-mono text-primary font-semibold">config/access</code>) i s'utilitza per protegir l'Àrea Privada.
              </p>
            </div>

            <form onSubmit={handleChangeKey} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2" htmlFor="new-key-input">
                  Nova Clau d'Accés
                </label>
                <input 
                  id="new-key-input"
                  type="text"
                  required
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="Ex: laTevaNovaClau2026"
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-outline/30 text-on-surface focus:outline-none focus:border-primary text-base"
                />
                <p className="text-xs text-on-surface-variant mt-1.5">
                  Clau actual establerta inicialment a Firestore: <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-primary font-semibold">jac58webDB</code>
                </p>
              </div>

              {keyChangeStatus.msg && (
                <div className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${
                  keyChangeStatus.type === 'success' 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' 
                    : keyChangeStatus.type === 'error' 
                      ? 'bg-error-container/40 border-error/20 text-error' 
                      : 'bg-surface border-outline/20 text-on-surface'
                }`}>
                  <span>{keyChangeStatus.msg}</span>
                </div>
              )}

              <button 
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-primary-container text-on-primary font-medium rounded-lg transition-colors cursor-pointer"
              >
                Desar Nova Clau a Firestore
              </button>
            </form>
          </div>

          {/* Telegram Notifications Card */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/20 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono font-semibold uppercase">Notificacions al Mòbil</span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-primary">Notificacions Instantànies de Telegram</h2>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Rep avisos immediats al teu telèfon mòbil cada vegada que un client ompli el formulari de contacte o l'assistent de la web.
              </p>
            </div>

            <form onSubmit={handleSaveTelegramConfig} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                  Telegram Bot Token
                </label>
                <input 
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Ex: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline/30 font-mono text-xs text-primary"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                  El teu Telegram Chat ID
                </label>
                <input 
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Ex: 987654321"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline/30 font-mono text-xs text-primary"
                />
              </div>

              {telegramStatus && (
                <div className="p-3 bg-surface-container border border-primary/20 rounded-lg text-xs font-mono text-primary">
                  {telegramStatus}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow"
                >
                  Desar Configuració a Firestore
                </button>
                <button 
                  type="button"
                  onClick={handleTestTelegram}
                  className="px-5 py-2.5 bg-surface hover:bg-surface-container border border-primary/30 text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  ⚡ Provar Notificació al Mòbil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
