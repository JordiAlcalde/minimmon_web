import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { STITCH_GIFTS, STITCH_PROJECTS } from '../../data/stitchData';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';
import { 
  POSTING_FORMATS, 
  POSTING_TEMPLATES, 
  renderPostingCanvas, 
  exportCanvasToPng 
} from '../../utils/postingCanvasRenderer';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Image as ImageIcon, 
  Type, 
  Tag, 
  Eye, 
  RefreshCw, 
  ArrowLeft, 
  Share2, 
  ExternalLink, 
  Boxes, 
  Briefcase, 
  Sliders, 
  Search,
  CheckCircle2,
  Upload,
  FolderPlus,
  HelpCircle,
  Link2,
  RotateCcw
} from 'lucide-react';

/**
 * Extreu i normalitza totes les fotografies d'un producte o projecte
 */
export function extractItemImages(item, type) {
  if (!item) return [];
  const rawList = [];

  // 1. Imatges en camps directes
  if (item.imatgePrincipal) rawList.push(item.imatgePrincipal);
  if (item.image) rawList.push(item.image);
  if (item.imatge) rawList.push(item.imatge);

  // 2. Arrays d'imatges estàndard
  if (Array.isArray(item.imatges)) {
    item.imatges.forEach(img => {
      if (typeof img === 'string') rawList.push(img);
      else if (img?.url) rawList.push(img.url);
      else if (img?.imatge) rawList.push(img.imatge);
      else if (img?.src) rawList.push(img.src);
    });
  }

  if (Array.isArray(item.images)) {
    item.images.forEach(img => {
      if (typeof img === 'string') rawList.push(img);
      else if (img?.url) rawList.push(img.url);
      else if (img?.imatge) rawList.push(img.imatge);
      else if (img?.src) rawList.push(img.src);
    });
  }

  // 3. Array 'media' propi de la col·lecció 'projectes'
  if (Array.isArray(item.media)) {
    const sortedMedia = [...item.media].sort((a, b) => {
      if (a?.principal && !b?.principal) return -1;
      if (!a?.principal && b?.principal) return 1;
      return (a?.ordre || 0) - (b?.ordre || 0);
    });

    sortedMedia.forEach(m => {
      if (typeof m === 'string') {
        rawList.push(m);
      } else if (m && typeof m === 'object') {
        const val = m.imatge || m.url || m.src;
        if (val) rawList.push(val);
      }
    });
  }

  // 4. Resoldre URLs absolutes / GitHub / locals i desduplicar
  const resolvedList = [];
  rawList.forEach(raw => {
    if (!raw || typeof raw !== 'string') return;
    const resolved = type === 'productes' 
      ? (resolveProducteMediaUrl(raw) || resolveMediaUrl(raw))
      : (resolveMediaUrl(raw) || resolveProducteMediaUrl(raw));
    
    if (resolved && !resolvedList.includes(resolved)) {
      resolvedList.push(resolved);
    }
  });

  return resolvedList;
}

export default function PostingApp({ setActiveTab }) {
  // 1. Dades de Firestore
  const [dbProducts, setDbProducts] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Estat del Selector de Contingut
  const [sourceType, setSourceType] = useState('productes'); // 'productes' | 'projectes' | 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // 3. Estat del Disseny Visual
  const [format, setFormat] = useState('4:5'); // 4:5 és l'òptim per defecte a Instagram
  const [template, setTemplate] = useState('atelier');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tagText, setTagText] = useState('Personalització inclosa');
  const [priceText, setPriceText] = useState('');
  const [showPrice, setShowPrice] = useState(false);
  const [showTag, setShowTag] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  // 4. Estat de Redacció de Copy
  const [copyStyle, setCopyStyle] = useState('emocional'); // 'emocional' | 'regal' | 'taller'
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // 5. Estat d'imatge personalitzada per URL o pujada
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  // Referències Canvas
  const canvasRef = useRef(null);

  // Subscripció en temps real a Productes i Projectes de Firestore
  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productes"), (snap) => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbProducts(prods.length > 0 ? prods : STITCH_GIFTS);
      setLoading(false);
    }, () => {
      setDbProducts(STITCH_GIFTS);
      setLoading(false);
    });

    const unsubProj = onSnapshot(collection(db, "projectes"), (snap) => {
      const projs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbProjects(projs.length > 0 ? projs : STITCH_PROJECTS);
    }, () => {
      setDbProjects(STITCH_PROJECTS);
    });

    return () => {
      unsubProd();
      unsubProj();
    };
  }, []);

  // Selecció inicial del primer producte quan carreguen les dades
  useEffect(() => {
    if (dbProducts.length > 0 && !selectedItem && sourceType === 'productes') {
      const initial = dbProducts.find(p => p.nom && p.nom.toLowerCase().includes('finestra')) || dbProducts[0];
      handleSelectItem(initial, 'productes');
    }
  }, [dbProducts]);

  // Canvi d'element seleccionat i càrrega automàtica de dades
  const handleSelectItem = (item, type) => {
    setSelectedItem(item);
    if (!item) return;

    if (type === 'productes') {
      const itemTitle = item.nom || 'Peça artesanal';
      const itemSub = item.descripcio 
        ? (item.descripcio.split('\n')[0].length > 70 ? item.descripcio.split('\n')[0].slice(0, 67) + '...' : item.descripcio.split('\n')[0])
        : 'Elaborada a mà en fusta de primera qualitat.';
      
      const imgs = extractItemImages(item, 'productes');
      const resolvedImg = imgs[0] || resolveMediaUrl('images/tots_productes.jpg');

      setTitle(itemTitle);
      setSubtitle(itemSub);
      setSelectedPhotoUrl(resolvedImg);

      const hasCustom = Array.isArray(item.opcionsPersonalitzacio) && item.opcionsPersonalitzacio.length > 0;
      setTagText(hasCustom ? '✨ Personalització inclosa' : 'Peces fetes a mà');
      setShowTag(true);

      const priceVal = item.preu ? `${item.preu.replace('.', ',')} €` : '';
      setPriceText(priceVal);
      setShowPrice(false);

    } else if (type === 'projectes') {
      const itemTitle = item.titol || item.title || item.nom || 'Projecte de Taller';
      const itemSub = item.subtitol || item.subtitle || item.encarrec || item.description || item.branca || 'Creació artesanal única a mida.';
      
      const imgs = extractItemImages(item, 'projectes');
      const resolvedImg = imgs[0] || resolveMediaUrl('images/tots_productes.jpg');

      setTitle(itemTitle);
      setSubtitle(itemSub);
      setSelectedPhotoUrl(resolvedImg);
      setTagText(item.branca ? `🔨 ${item.branca}` : '🔨 Projecte de Taller');
      setShowTag(true);
      setShowPrice(false);
    }
  };

  // Generador de Copies per a Instagram segons l'estil escollit
  useEffect(() => {
    if (!selectedItem) {
      setGeneratedCopy('');
      return;
    }

    const itemName = title || selectedItem.nom || selectedItem.titol || 'Aquesta peça única';
    const itemDesc = selectedItem.descripcio || selectedItem.subtitol || 'Una creació plena de detalls artesanals.';
    
    let copyIntro = '';
    let copyBody = '';
    let copyCta = '✨ Encarrega la teva o descobreix més models a l’enllaç de la nostra bio (@minimmon.cat) o envia’ns un missatge privat!';

    if (copyStyle === 'emocional') {
      copyIntro = `Hi ha records que mereixen quedar gravats per sempre. 🪵🤍\n\nUs presentem el nostre ${itemName}, una peça pensada per acollir moments inoblidables i donar calidesa a la vostra llar.`;
      copyBody = `${itemDesc}\n\nCada detall està elaborat amb calma al nostre taller, cuidant cada veta i cada acabat perquè sigui un record per a tota la vida.`;
    } else if (copyStyle === 'regal') {
      copyIntro = `Busques un detall realment inoblidable i diferent? 🎁✨\n\nEl nostre ${itemName} és el regal perfecte per sorprendre aquelles persones que tant estimes.`;
      copyBody = `Artesania pura, personalització a mida i materials nobles. ${itemDesc}\n\nUn detall que no es compra en una gran botiga, sinó que es crea expressament per a tu.`;
    } else { // 'taller'
      copyIntro = `Directe des del banc de feina del taller! 🔨🪵\n\nAvui donem vida a un nou ${itemName}. Treballar la fusta natural, combinar el tall de precisió amb l'acabat a mà en vernís mat és el que fa única cada peça.`;
      copyBody = `${itemDesc}\n\nPeces amb ànima, fetes a Catalunya amb paciència i passió pel treball ben fet.`;
    }

    const hashtags = `\n\n#minimmon #artesania #fustacatalunya #regalspersonalitzats #fetama #decoraciocasa #recordsenfusta #regalsunics #fetamà #detallsambamor #tallerartesanal`;

    setGeneratedCopy(`${copyIntro}\n\n${copyBody}\n\n${copyCta}${hashtags}`);
  }, [selectedItem, title, subtitle, copyStyle]);

  // Re-renderitzar el canvas cada cop que canvia qualsevol paràmetre visual
  useEffect(() => {
    let active = true;
    setIsRendering(true);

    const timer = setTimeout(async () => {
      if (canvasRef.current && active) {
        await renderPostingCanvas(canvasRef.current, {
          format,
          template,
          title,
          subtitle,
          tagText,
          priceText,
          showPrice,
          showTag,
          showLogo,
          photoUrl: selectedPhotoUrl
        });
        setIsRendering(false);
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [format, template, title, subtitle, tagText, priceText, showPrice, showTag, showLogo, selectedPhotoUrl]);

  // Filtrar la llista d'elements
  const filteredList = useMemo(() => {
    const list = sourceType === 'productes' ? dbProducts : dbProjects;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => {
      const name = String(item.nom || item.titol || item.title || '').toLowerCase();
      const cat = String(item.branca || item.category || (Array.isArray(item.gammaIds) && item.gammaIds.join(' ')) || '').toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [sourceType, dbProducts, dbProjects, searchQuery]);

  // Llista d'imatges alternatives de l'element seleccionat
  const availableImages = useMemo(() => {
    if (!selectedItem) return [];
    return extractItemImages(selectedItem, sourceType);
  }, [selectedItem, sourceType]);

  // Descarregar imatge
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safeTitle = (title || 'post-minimmon').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    exportCanvasToPng(canvasRef.current, `minimmon-${safeTitle}-${format.replace(':', 'x')}.png`);
  };

  // Copiar copy al porta-retalls
  const handleCopyText = async () => {
    if (!generatedCopy) return;
    try {
      await navigator.clipboard.writeText(generatedCopy);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch (e) {
      alert("No s'ha pogut copiar el text automàticament. Pots seleccionar-lo i copiar-lo manualment.");
    }
  };

  // Pujar imatge personalitzada des del disc
  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedPhotoUrl(event.target.result);
      if (!title) setTitle('Peça especial');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-slate-800 flex flex-col font-sans">
      
      {/* 1. Dedicated Navbar de Posting */}
      <header className="bg-[#3D2B1F] text-white border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Esquerra: Logotip i Títol de l'aplicació */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-white tracking-wide">Posting</span>
                <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  Instagram Studio
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70 font-sans hidden sm:block">
                Generador de continguts i posts per a xarxes socials de Mínim Món
              </p>
            </div>
          </div>

          {/* Dreta: Accions ràpides de navegació (Àrea Privada, Producc, Projecc, Web) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab && setActiveTab('privat')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tornar a l'Àrea Privada"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Àrea Privada</span>
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('producc')}
              className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Anar a Producc"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Producc</span>
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('projecc')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Anar a Projecc"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Projecc</span>
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('regals')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
              title="Veure web públic"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Veure Web</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Àrea Principal de Treball en 2 Columnes */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA ESQUERRA: Controls, Selecció i Copywriting (7 de 12 columnes) */}
        <div className="lg:col-span-7 space-y-6">

          {/* BLOC 1: Selector de Contingut de la Web */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F]">
                  1. Tria què vols publicar
                </h2>
              </div>

              {/* Pestanyes: Productes / Projectes / Personalitzat */}
              <div className="flex items-center gap-1 bg-[#F3ECE4] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('productes');
                    if (dbProducts.length > 0) handleSelectItem(dbProducts[0], 'productes');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    sourceType === 'productes' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  Regals ({dbProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('projectes');
                    if (dbProjects.length > 0) handleSelectItem(dbProjects[0], 'projectes');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    sourceType === 'projectes' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  Projectes ({dbProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('custom');
                    setSelectedItem({ nom: 'Peça a mida' });
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    sourceType === 'custom' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  Foto lliure
                </button>
              </div>
            </div>

            {sourceType !== 'custom' ? (
              <div className="space-y-3">
                {/* Cercador ràpid */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={`Cerca ràpidament entre els ${sourceType === 'productes' ? 'productes' : 'projectes'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700 font-sans"
                  />
                </div>

                {/* Graella de selecció ràpida amb miniatures */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {filteredList.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const itemImgs = extractItemImages(item, sourceType);
                    const resolved = itemImgs[0] || '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item, sourceType)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-700 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-outline/15'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-black/5">
                          {resolved ? (
                            <img src={resolved} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-sans">Sense foto</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-900' : 'text-slate-800'}`}>
                            {item.nom || item.titol || item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {item.preu ? `${item.preu} €` : (item.branca || item.category || 'Artesanal')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Mode Foto Lliure: Pujar imatge pròpia */
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-outline/30 text-center space-y-2">
                <Upload className="w-6 h-6 text-amber-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Puja una foto del taller des del teu equip</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-700 file:text-white hover:file:bg-amber-800 cursor-pointer"
                />
              </div>
            )}
          </section>

          {/* BLOC 2: Gestió de la Imatge del Post (Fotos de la peça o pujar-ne una de nova) */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F]">
                  2. Imatge del Post
                </h2>
              </div>
              
              {/* Botó per restablir la foto si és diferent de la foto inicial */}
              {availableImages.length > 0 && selectedPhotoUrl !== availableImages[0] && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoUrl(availableImages[0])}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Tornar a posar la fotografia principal d'aquest element"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablir foto original</span>
                </button>
              )}
            </div>

            {/* A. Galeria de fotografies disponibles del projecte / producte */}
            {sourceType !== 'custom' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">
                    {sourceType === 'projectes' ? 'Fotos d’aquest projecte:' : 'Fotos d’aquest regal:'}
                    <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 font-mono text-[11px]">
                      {availableImages.length} {availableImages.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">Fes clic a qualsevol per aplicar-la al post</span>
                </div>

                {availableImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                    {availableImages.map((imgUrl, idx) => {
                      const isActive = selectedPhotoUrl === imgUrl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhotoUrl(imgUrl)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group text-left ${
                            isActive 
                              ? 'border-amber-600 ring-2 ring-amber-500/30 shadow-md scale-[1.02]' 
                              : 'border-outline/15 hover:border-amber-400 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          {isActive && (
                            <div className="absolute inset-0 bg-amber-950/20 flex items-end p-1">
                              <span className="w-full text-center bg-amber-600 text-white text-[9px] font-bold py-0.5 rounded shadow-xs">
                                Activa ✓
                              </span>
                            </div>
                          )}
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                            #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Aquest projecte no té fotografies vinculades a la base de dades.</p>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">Pots pujar una foto del teu equip o enganxar un enllaç a sota per al post.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. Botons d'acció per pujar o canviar foto */}
            <div className="pt-2 border-t border-outline/10 flex flex-wrap items-center gap-3">
              {/* File upload hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pujar foto des del teu equip</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{showUrlInput ? 'Amagar enllaç URL' : 'O enganxar URL d’imatge'}</span>
              </button>
            </div>

            {/* C. Formulari d'enllaç URL desplegable */}
            {showUrlInput && (
              <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                <input
                  type="url"
                  placeholder="Enganxa l’enllaç web de la imatge (https://...)"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrlInput.trim()) {
                      setSelectedPhotoUrl(customUrlInput.trim());
                      setCustomUrlInput('');
                      setShowUrlInput(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#3D2B1F] text-white text-xs font-semibold cursor-pointer hover:bg-black"
                >
                  Aplicar
                </button>
              </div>
            )}
          </section>

          {/* BLOC 3: Format d'Instagram i Plantilla d'Estil */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline/10 pb-3">
              <Sliders className="w-4 h-4 text-amber-700" />
              <h2 className="font-serif text-base font-semibold text-[#3D2B1F]">
                3. Format i Estètica
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Formats */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Format d'Instagram</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(POSTING_FORMATS).map(fmt => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        format === fmt.id
                          ? 'bg-[#3D2B1F] text-white border-[#3D2B1F] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-outline/15'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">{fmt.id}</span>
                      <span className="text-[10px] opacity-80">{fmt.id === '4:5' ? 'Feed vertical' : (fmt.id === '1:1' ? 'Quadrat' : 'Story')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plantilles */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Estil Visual</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(POSTING_TEMPLATES).map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        template === tpl.id
                          ? 'bg-[#3D2B1F] text-white border-[#3D2B1F] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-outline/15'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{tpl.nom}</span>
                      <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: tpl.bgColor }}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Textos i commutadors de la imatge */}
            <div className="space-y-3 pt-3 border-t border-outline/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Títol a la imatge</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-serif font-bold text-slate-800 rounded-lg bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Etiqueta destacada (Badge)</label>
                  <input
                    type="text"
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    placeholder="Ex: ✨ Personalització inclosa"
                    className="w-full px-3 py-1.5 text-xs font-sans rounded-lg bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Subtítol o frase a la imatge</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-sans text-slate-700 rounded-lg bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700"
                />
              </div>

              {/* Caselles d'elements visuals */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showTag}
                    onChange={(e) => setShowTag(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-700 accent-amber-700"
                  />
                  <span>Mostrar Etiqueta</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-700 accent-amber-700"
                  />
                  <span>Mostrar Segell MínimMón</span>
                </label>

                {priceText && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-700 accent-amber-700"
                    />
                    <span>Mostrar Preu ({priceText})</span>
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* BLOC 4: Generador de Copywriting i Hashtags */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F]">
                  4. Text redactat per a la publicació (Copy)
                </h2>
              </div>

              {/* Selector d'estil de text */}
              <div className="flex items-center gap-1 bg-[#F3ECE4] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCopyStyle('emocional')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    copyStyle === 'emocional' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  🤍 Emocional
                </button>
                <button
                  type="button"
                  onClick={() => setCopyStyle('regal')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    copyStyle === 'regal' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  🎁 Regal
                </button>
                <button
                  type="button"
                  onClick={() => setCopyStyle('taller')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    copyStyle === 'taller' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  🔨 Taller
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={6}
                value={generatedCopy}
                onChange={(e) => setGeneratedCopy(e.target.value)}
                className="w-full p-3.5 text-xs font-sans leading-relaxed rounded-xl bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] text-slate-500">
                Pots editar qualsevol part del text abans de copiar-lo.
              </span>

              <button
                type="button"
                onClick={handleCopyText}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  copiedToast 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-[#3D2B1F] hover:bg-black text-white active:scale-95'
                }`}
              >
                {copiedToast ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Copiat al porta-retalls!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar text i hashtags</span>
                  </>
                )}
              </button>
            </div>
          </section>

        </div>

        {/* COLUMNA DRETA: Previsualització en viu de la Imatge i Botons d'Acció (5 de 12 columnes) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          
          <div className="bg-white p-5 rounded-2xl border border-outline/15 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-700" />
                <h3 className="font-serif text-base font-semibold text-[#3D2B1F]">
                  Previsualització del Post
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {POSTING_FORMATS[format]?.nom}
              </span>
            </div>

            {/* Contenidor del Canvas amb escalat responsive per cabre a la pantalla */}
            <div className="bg-[#EAE5DE] p-4 rounded-xl flex items-center justify-center overflow-hidden min-h-[360px]">
              <div 
                className="relative rounded-lg shadow-xl overflow-hidden border border-black/10 bg-white transition-all max-w-full"
                style={{ 
                  aspectRatio: POSTING_FORMATS[format]?.aspect || '4/5',
                  maxHeight: '520px',
                  width: 'auto'
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain block"
                />
                {isRendering && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Botó Principal: Descarregar PNG */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-[#3D2B1F] hover:from-amber-600 hover:to-black text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar Imatge PNG (1080px)</span>
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Resolució nativa neta de 1080px d'alta qualitat, sense marques d'aigua.
              </p>
            </div>

            {/* Enllaç ràpid a Meta Business Suite */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">Com publicar-ho en 30 segons:</p>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  Pots enviar la imatge al teu mòbil i pujar-la a Instagram, o obrir <strong>Meta Business Suite</strong> al navegador per programar posts gratuïtament.
                </p>
                <a
                  href="https://business.facebook.com/latest/composer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 underline text-[11px] pt-0.5"
                >
                  <span>Obrir Meta Business Suite per programar</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
