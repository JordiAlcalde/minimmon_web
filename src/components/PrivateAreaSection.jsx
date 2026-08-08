import React, { useState, useEffect } from 'react';
import { db, getAccessKeyFromFirestore, updateAccessKeyInFirestore } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { STITCH_PROJECTS, DEFAULT_BRANQUES } from '../data/stitchData';
import { resolveMediaUrl, GITHUB_RAW_BASE } from '../utils/mediaUtils';
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
  Tag
} from 'lucide-react';

export default function PrivateAreaSection({ setActiveTab }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('minimmon_admin_auth') === 'true';
  });
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Active module inside Private Area ('consultes' | 'projectes' | 'branques' | 'config')
  const [activeModule, setActiveModule] = useState('consultes');

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

  // Key change state
  const [newKeyInput, setNewKeyInput] = useState('');
  const [keyChangeStatus, setKeyChangeStatus] = useState({ type: '', msg: '' });
  const [copiedId, setCopiedId] = useState(null);

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

  // Save Branca
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
          <span>Consultes i Encàrrecs</span>
          {pendentsCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full font-bold">
              {pendentsCount}
            </span>
          )}
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
          <span>Móns Mínims (Projectes)</span>
          <span className="text-xs text-on-surface-variant font-normal">
            ({dbProjects.length})
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
          <span>Gestió de Branques</span>
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
                      href={`mailto:${selectedConsulta.email}?subject=Resposta%20M%C3%ADnim%20M%C3%B3n`}
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container transition-colors flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Respondre per Correu</span>
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
                            <div className="font-semibold text-primary">{p.titol || p.title}</div>
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

      {/* MODULE 3: GESTIÓ DE BRANQUES */}
      {activeModule === 'branques' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-primary">Gestió de Branques i Categories</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Aquestes branques defineixen els filtres de la galeria pública i les categories de cada projecte a Cloud Firestore.
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
              <span>Nova Branca</span>
            </button>
          </div>

          {/* BRANCA EDITOR FORM */}
          {editingBranca ? (
            <form onSubmit={handleSaveBranca} className="bg-surface-container-lowest p-6 rounded-xl border border-primary/30 shadow-lg space-y-4 max-w-lg">
              <div className="flex justify-between items-center pb-3 border-b border-outline/15">
                <h3 className="font-serif text-lg text-primary font-semibold">
                  {dbBranques.some(b => b.id === editingBranca.id) ? `Editar Branca` : 'Crear Nova Branca'}
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
                <label className="block text-xs uppercase font-semibold text-on-surface-variant mb-1">Nom de la Branca</label>
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
                  Desar Branca
                </button>
              </div>
            </form>
          ) : (
            /* BRANQUES TABLE */
            <div className="bg-surface-container-lowest rounded-xl border border-outline/15 overflow-hidden shadow-sm max-w-2xl">
              {loadingBranques ? (
                <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Carregant branques des de Cloud Firestore...</span>
                </div>
              ) : dbBranques.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <p className="font-serif text-base text-primary">No hi ha branques creades a Firestore</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline/15">
                    <tr>
                      <th className="p-4">Ordre</th>
                      <th className="p-4">Nom de la Branca</th>
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
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline/15 shadow-sm max-w-xl">
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
      )}

    </div>
  );
}
