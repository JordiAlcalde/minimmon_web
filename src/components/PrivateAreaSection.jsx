import React, { useState, useEffect, useRef } from 'react';
import { db, getAccessKeyFromFirestore, updateAccessKeyInFirestore } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { STITCH_PROJECTS, DEFAULT_BRANQUES, STITCH_GIFTS } from '../data/stitchData';
import { resolveMediaUrl, GITHUB_RAW_BASE } from '../utils/mediaUtils';
import { getTelegramConfig, saveTelegramConfig, sendTelegramNotification } from '../utils/telegramUtils';
import { generateNextProductCode, applyFormatToSelection, renderFormattedText } from '../utils/textUtils';
import { 
  Lock, 
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
  ListOrdered
} from 'lucide-react';
import { copyDirectLink } from '../utils/shareUtils';

export const DEFAULT_FAMILIES = [];
export const DEFAULT_GAMMES = [];

export const getEffectiveProductOrder = (product, gammaNom) => {
  if (!product) return 1;
  if (gammaNom && gammaNom !== 'Totes' && gammaNom !== 'Tots' && product.ordrePerGamma && product.ordrePerGamma[gammaNom] !== undefined) {
    return Number(product.ordrePerGamma[gammaNom]);
  }
  return Number(product.ordre || 1);
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

      return () => {
        unsubPress();
        unsubProd();
        unsubFam();
        unsubGam();
      };
    }
  }, [isAuthenticated]);

  // Telegram state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState('');

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

  const handleMoveProductOrder = async (currProd, targetProd) => {
    if (!currProd || !targetProd) return;

    if (adminGamFilter && adminGamFilter !== 'Totes') {
      const currOrdre = getEffectiveProductOrder(currProd, adminGamFilter);
      const targetOrdre = getEffectiveProductOrder(targetProd, adminGamFilter);

      let newCurrOrdre = targetOrdre;
      let newTargetOrdre = currOrdre;
      if (newCurrOrdre === newTargetOrdre) {
        newCurrOrdre = Math.max(1, targetOrdre - 1);
      }

      const currPerGam = { ...(currProd.ordrePerGamma || {}), [adminGamFilter]: newCurrOrdre };
      const targetPerGam = { ...(targetProd.ordrePerGamma || {}), [adminGamFilter]: newTargetOrdre };

      try {
        await updateDoc(doc(db, "productes", currProd.id), { ordrePerGamma: currPerGam });
        await updateDoc(doc(db, "productes", targetProd.id), { ordrePerGamma: targetPerGam });
      } catch (err) {
        alert("Error reordenant productes: " + err.message);
      }
    } else {
      const currOrdre = currProd.ordre || 1;
      const targetOrdre = targetProd.ordre || 1;

      let newCurrOrdre = targetOrdre;
      let newTargetOrdre = currOrdre;
      if (newCurrOrdre === newTargetOrdre) {
        newCurrOrdre = Math.max(1, targetOrdre - 1);
      }

      try {
        await updateDoc(doc(db, "productes", currProd.id), { ordre: newCurrOrdre });
        await updateDoc(doc(db, "productes", targetProd.id), { ordre: newTargetOrdre });
      } catch (err) {
        alert("Error reordenant productes: " + err.message);
      }
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
    try {
      await setDoc(doc(db, "gammes", docId), {
        nom: editingGamma.nom,
        familiaNom: editingGamma.familiaNom || (dbFamilies[0]?.nom || ''),
        ordre: Number(editingGamma.ordre || 1)
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
            onClick={handleLogout}
            className="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface border border-outline/20 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            title="Tancar sessió"
          >
            <LogOut className="w-4 h-4 text-error" />
            <span>Tancar Sessió</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-outline/20 mb-8 overflow-x-auto gap-2">
        <button 
          onClick={() => setActiveModule('consultes')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'consultes' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comunicacions</span>
          {pendentsCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold">
              {pendentsCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveModule('pressupostos')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'pressupostos' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pressupostos</span>
          {pressupostosPendentsCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold">
              {pressupostosPendentsCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveModule('productes')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'productes' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Productes</span>
          <span className="px-2 py-0.5 text-xs bg-surface-container text-on-surface-variant rounded-full font-bold">
            {dbProductesAdmin.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveModule('taxonomy')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'taxonomy' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Famílies-Gammes</span>
          <span className="px-2 py-0.5 text-xs bg-surface-container text-on-surface-variant rounded-full font-bold">
            {dbGammes.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveModule('projectes')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'projectes' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Projectes</span>
          <span className="px-2 py-0.5 text-xs bg-surface-container text-on-surface-variant rounded-full font-bold">
            {dbProjects.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveModule('branques')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'branques' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categories</span>
          <span className="px-2 py-0.5 text-xs bg-surface-container text-on-surface-variant rounded-full font-bold">
            {dbBranques.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveModule('config')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeModule === 'config' 
              ? 'border-primary text-primary font-semibold' 
              : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuració i Seguretat</span>
        </button>
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
                        <p>Productes triats: <strong>{(p.productes || []).length} peces</strong></p>
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
              <div className="space-y-3 p-4 bg-surface rounded-lg border border-outline/15">
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

                {(editingProducte.opcionsPersonalitzacio || []).length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Sense opcions de personalització.</p>
                ) : (
                  <div className="space-y-3">
                    {editingProducte.opcionsPersonalitzacio.map((opc, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-surface-container rounded border border-outline/10">
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
                          <option value="text">Text</option>
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
                          placeholder={opc.tipus === 'desplegable' ? "Valors: Noguer, Roure, Bedoll" : "Placeholder de text..."}
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

              {/* Switches d'Estat: Actiu / Inactiu i Novetat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface rounded-lg border border-outline/15">
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
                        const filteredAdminProducts = dbProductesAdmin.filter(p => {
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
                        }).sort((a, b) => {
                          const gamFilter = adminGamFilter !== 'Totes' ? adminGamFilter : null;
                          const ordA = getEffectiveProductOrder(a, gamFilter);
                          const ordB = getEffectiveProductOrder(b, gamFilter);
                          if (ordA !== ordB) return ordA - ordB;

                          return (a.codi || '').localeCompare(b.codi || '');
                        });

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
                          <tr key={p.id} className="hover:bg-surface-container/40 transition-colors">
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
                            <td className="p-4 font-mono text-xs text-outline">{p.cost ? `${p.cost}€` : '-'}</td>
                            <td className="p-4 font-mono text-xs text-outline">{p.preu ? `${p.preu}€` : '-'}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={async () => {
                                  const res = await copyDirectLink('producte', p.id);
                                  alert(`Enllaç directe del producte copiat al portapapers:\n\n${res.link}`);
                                }}
                                className="px-3 py-1.5 bg-surface hover:bg-surface-container text-primary border border-outline/20 rounded text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Copiar enllaç directe per a màrqueting"
                              >
                                <Share2 className="w-3 h-3 text-primary" />
                                <span>Enllaç</span>
                              </button>
                              <button
                                onClick={() => setEditingProducte(p)}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProducte(p.id)}
                                className="px-3 py-1.5 bg-error-container/20 hover:bg-error-container/40 text-error rounded text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Esborrar
                              </button>
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
                onClick={() => setEditingGamma({ id: `gam-${Date.now()}`, nom: '', familiaNom: dbFamilies[0]?.nom || '', ordre: dbGammes.length + 1 })}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Gamma</span>
              </button>
            </div>

            {editingGamma ? (
              <form onSubmit={handleSaveGamma} className="bg-surface p-5 rounded-lg border border-primary/30 space-y-4 max-w-md">
                <h3 className="font-serif text-base font-semibold text-primary">
                  {dbGammes.some(g => g.id === editingGamma.id) ? 'Editar Gamma' : 'Crear Nova Gamma'}
                </h3>
                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom de la Gamma *</label>
                  <input
                    type="text"
                    required
                    value={editingGamma.nom || ''}
                    onChange={(e) => setEditingGamma({ ...editingGamma, nom: e.target.value })}
                    placeholder="Ex: Puzles, Clauers..."
                    className="w-full px-3 py-2 rounded bg-surface border text-sm text-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Família a la que pertany *</label>
                  <select
                    value={editingGamma.familiaNom || ''}
                    onChange={(e) => setEditingGamma({ ...editingGamma, familiaNom: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-surface border text-xs text-primary font-semibold"
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
                    className="w-full px-3 py-2 rounded bg-surface border text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingGamma(null)} className="px-3 py-1.5 bg-surface border text-xs rounded">Cancel·lar</button>
                  <button type="submit" className="px-4 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded">Desar Gamma</button>
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
                            <button onClick={() => setEditingGamma(g)} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">Editar</button>
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
              <button 
                onClick={handleSeedDatabase}
                className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-primary border border-outline/20 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4 text-primary" />
                <span>Inicialitzar DB amb dades inicials</span>
              </button>

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
                    <span className="block font-bold">Actiu a Móns Mínims</span>
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
                  <p className="font-serif text-lg text-primary">La taula 'projectes' de Firestore està buida</p>
                  <p className="text-xs text-on-surface-variant">Prem el botó <strong>"Inicialitzar DB amb dades inicials"</strong> per carregar els projectes per defecte.</p>
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
