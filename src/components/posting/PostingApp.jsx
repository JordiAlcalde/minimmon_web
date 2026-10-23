import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { STITCH_GIFTS, STITCH_PROJECTS } from '../../data/stitchData';
import { resolveProducteMediaUrl, resolveMediaUrl } from '../../utils/mediaUtils';
import { 
  POSTING_FORMATS, 
  POSTING_TEMPLATES, 
  renderPostingCanvas, 
  exportCanvasToPng,
  hexToRgba
} from '../../utils/postingCanvasRenderer';
import { AVAILABLE_FONTS } from '../FontSelectorDropdown';
import { 
  generatePostingAssistantContent, 
  getGeminiApiKey, 
  setGeminiApiKey 
} from '../../utils/geminiAiService';
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
  RotateCcw,
  Wand2,
  Lightbulb,
  MessageSquare,
  Key,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Images,
  CopyPlus,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Palette,
  EyeOff,
  Smile,
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  Send
} from 'lucide-react';
import PostingCalendar from './PostingCalendar';
import { 
  subscribeScheduledPosts, 
  saveScheduledPost, 
  getNextRecommendedDate, 
  formatDateISO, 
  POST_CONTENT_TYPES 
} from '../../services/postingScheduleService';

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

export const DEFAULT_BRAND_SLOGANS = [
  "Espais en miniatura",
  "Capturant la memòria, l'espai i l'emoció",
  "L'essència del que som, en miniatura",
  "Cada línia té un nom. Cada volum, una ànima"
];

export const INITIAL_CUSTOM_LAYERS = [
  {
    id: 'layer-1',
    name: 'Capa 1',
    enabled: false,
    text: '',
    fontId: 'caveat',
    fontName: 'Caveat',
    fontFamily: "'Caveat', cursive",
    fontSize: 34, // píxels base del canvas 1080px (proporció harmònica amb el títol)
    maxWidthPercent: 58, // % d'amplada màxima abans de saltar de línia
    textColor: '#FFFFFF',
    bgColor: '#3D2B1F',
    bgOpacity: 80, // 0 (transparent) a 100 (sòlid)
    x: 50, // % horitzontal (centrat)
    y: 28  // % vertical
  },
  {
    id: 'layer-2',
    name: 'Capa 2',
    enabled: false,
    text: '',
    fontId: 'dancing',
    fontName: 'Dancing Script',
    fontFamily: "'Dancing Script', cursive",
    fontSize: 32,
    maxWidthPercent: 58,
    textColor: '#FAF7F2',
    bgColor: '#C86D3B',
    bgOpacity: 85,
    x: 50,
    y: 78
  }
];

export const QUICK_LAYER_PHRASES = [
  "✨ Fet a mà al taller",
  "🪵 Fusta noble 100% natural",
  "Personalització amb nom",
  "🤍 Record artesanal únic",
  "Edició limitada de temporada",
  "🌿 Artesania feta amb calma"
];

export const FAVORITE_ARTISAN_EMOJIS = [
  '✨', '🪵', '🌿', '🤍', '🤎', '🔨', '🪚', '🎁', '🍂', '🌾', '⭐', '🏷️', '☕', '🫶'
];

export const ARTISAN_EMOJI_GROUPS = [
  {
    name: 'Fusta & Taller',
    emojis: ['🪵', '🔨', '🪚', '📐', '🪓', '🏠', '🪑', '🚪']
  },
  {
    name: 'Natura & Calma',
    emojis: ['🌿', '🍃', '🌾', '🍂', '🌰', '🌲', '🪴', '🌻']
  },
  {
    name: 'Brillantor & Detalls',
    emojis: ['✨', '⭐', '🌟', '💫', '🎁', '🎀', '🏷️', '🪄']
  },
  {
    name: 'Calidesa & Cors',
    emojis: ['🤍', '🤎', '💛', '🧡', '🖤', '🫶', '☕', '📜']
  }
];


export const TEXT_COLOR_PRESETS = [
  { label: 'Blanc pur', value: '#FFFFFF' },
  { label: 'Crema càlid', value: '#FAF7F2' },
  { label: 'Daurat suau', value: '#E6D3C1' },
  { label: 'Fosc Mínim Món', value: '#3D2B1F' },
  { label: 'Terracota', value: '#C86D3B' },
  { label: 'Negre fusta', value: '#1A120C' }
];

export const BG_COLOR_PRESETS = [
  { label: 'Sense fons (Transparent)', value: 'transparent', opacity: 0 },
  { label: 'Fosc Mínim Món', value: '#3D2B1F', opacity: 80 },
  { label: 'Fusta Xocolata', value: '#2E2016', opacity: 85 },
  { label: 'Terracota artesà', value: '#C86D3B', opacity: 85 },
  { label: 'Blanc Cru', value: '#FAF7F2', opacity: 90 },
  { label: 'Negre suau', value: '#18120E', opacity: 75 }
];

export default function PostingApp({ setActiveTab }) {
  // 0. Navegació Principal: Editor vs Calendari
  const [activeMainTab, setActiveMainTab] = useState('editor'); // 'editor' | 'calendar'
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [editingScheduledPostId, setEditingScheduledPostId] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(() => formatDateISO(new Date()));
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [scheduledType, setScheduledType] = useState('producte');
  const [scheduledNotes, setScheduledNotes] = useState('');
  const [showSaveScheduleModal, setShowSaveScheduleModal] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveScheduleToast, setSaveScheduleToast] = useState(null);

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
  const [imageFit, setImageFit] = useState('cover'); // 'cover' | 'contain'
  const [blurIntensity, setBlurIntensity] = useState(35); // 0% a 80% (ajust del difuminat de fons)
  const [textScale, setTextScale] = useState(1); // 1 = normal/llegible, 1.15 = gran, 1.3 = molt gran

  // 3c. Capes de Text Lliures Personalitzades (Capa 1 i Capa 2)
  const [customLayers, setCustomLayers] = useState(INITIAL_CUSTOM_LAYERS);
  const [selectedLayerTab, setSelectedLayerTab] = useState('layer-1');
  const previewContainerRef = useRef(null);
  const activeDragRef = useRef(null);

  const activeLayer = useMemo(() => {
    return customLayers.find(l => l.id === selectedLayerTab) || customLayers[0];
  }, [customLayers, selectedLayerTab]);

  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const layerTextareaRef = useRef(null);

  const handleInsertEmoji = (emoji) => {
    // Si la capa està desactivada, activem-la automàticament amb aquest emoji
    if (!activeLayer.enabled) {
      updateActiveLayer({ enabled: true, text: emoji });
      return;
    }

    const textarea = layerTextareaRef.current;
    const currentText = activeLayer.text || '';
    if (textarea && typeof textarea.selectionStart === 'number') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = currentText.substring(0, start) + emoji + currentText.substring(end);
      updateActiveLayer({ text: newText });
      setTimeout(() => {
        if (layerTextareaRef.current) {
          layerTextareaRef.current.focus();
          const newPos = start + emoji.length;
          layerTextareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    } else {
      updateActiveLayer({ text: currentText ? `${currentText} ${emoji}` : emoji });
    }
  };

  const updateActiveLayer = (updates) => {
    setCustomLayers(prev => prev.map(l => {
      if (l.id === selectedLayerTab) {
        return { ...l, ...updates };
      }
      return l;
    }));
  };

  const toggleLayerEnabled = (layerId) => {
    setCustomLayers(prev => prev.map(l => {
      if (l.id === layerId) {
        const nextEnabled = !l.enabled;
        return {
          ...l,
          enabled: nextEnabled,
          text: nextEnabled && !l.text ? '✨ Text lliure' : l.text
        };
      }
      return l;
    }));
  };

  const nudgeLayer = (layerId, deltaX, deltaY) => {
    setCustomLayers(prev => prev.map(l => {
      if (l.id === layerId) {
        const newX = Math.round(Math.max(5, Math.min(95, l.x + deltaX)));
        const newY = Math.round(Math.max(5, Math.min(95, l.y + deltaY)));
        return { ...l, x: newX, y: newY };
      }
      return l;
    }));
  };

  const handleLayerPointerDown = (e, layerId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerTab(layerId);
    activeDragRef.current = {
      layerId,
      startX: e.clientX,
      startY: e.clientY
    };
    try {
      previewContainerRef.current?.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleContainerPointerMove = (e) => {
    if (!activeDragRef.current) return;
    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const xClamped = Math.round(Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100)));
    const yClamped = Math.round(Math.max(6, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100)));

    setCustomLayers(prev => prev.map(l => {
      if (l.id === activeDragRef.current.layerId) {
        return { ...l, x: xClamped, y: yClamped };
      }
      return l;
    }));
  };

  const handleContainerPointerUp = (e) => {
    if (activeDragRef.current) {
      try {
        previewContainerRef.current?.releasePointerCapture(e.pointerId);
      } catch (_) {}
      activeDragRef.current = null;
    }
  };

  // Subtítol / Lema de Capçalera (Segell Mínim Món)
  const [brandSlogans, setBrandSlogans] = useState(() => {
    try {
      const saved = localStorage.getItem('minimmon_brand_slogans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_BRAND_SLOGANS;
  });

  const [headerSlogan, setHeaderSlogan] = useState(() => {
    try {
      const savedLast = localStorage.getItem('minimmon_last_header_slogan');
      if (savedLast) return savedLast;
    } catch (_) {}
    return DEFAULT_BRAND_SLOGANS[0];
  });

  const [newSloganInput, setNewSloganInput] = useState('');
  const [showAddSloganForm, setShowAddSloganForm] = useState(false);

  const handleAddCustomSlogan = (e) => {
    if (e) e.preventDefault();
    const clean = newSloganInput.trim();
    if (!clean) return;
    let updated = brandSlogans;
    if (!brandSlogans.includes(clean)) {
      updated = [...brandSlogans, clean];
      setBrandSlogans(updated);
      try {
        localStorage.setItem('minimmon_brand_slogans', JSON.stringify(updated));
      } catch (_) {}
    }
    setSubtitle(clean);
    setHeaderSlogan(clean);
    try {
      localStorage.setItem('minimmon_last_header_slogan', clean);
    } catch (_) {}
    setNewSloganInput('');
    setShowAddSloganForm(false);
  };

  const handleSelectHeaderSlogan = (slogan) => {
    setSubtitle(slogan);
    setHeaderSlogan(slogan);
    try {
      localStorage.setItem('minimmon_last_header_slogan', slogan);
    } catch (_) {}
  };

  // 3b. Mode de Publicació i Gestor de Carrusel Multifoto (2 a 10 imatges)
  const [postMode, setPostMode] = useState('single'); // 'single' | 'carousel'
  const [slides, setSlides] = useState([
    {
      id: 'slide-1',
      title: 'Mínim Món a la Fira',
      subtitle: 'Espais en miniatura i records artesanals.',
      photoUrl: '',
      tagText: '✨ Fira Artesana',
      imageFit: 'cover',
      blurIntensity: 35,
      showTag: true,
      showLogo: true,
      customLayers: []
    },
    {
      id: 'slide-2',
      title: 'Detalls de la parada',
      subtitle: 'Peces fetes a mà una a una amb fusta noble.',
      photoUrl: '',
      tagText: '🪵 Fet amb ànima',
      imageFit: 'cover',
      blurIntensity: 35,
      showTag: true,
      showLogo: true,
      customLayers: []
    },
    {
      id: 'slide-3',
      title: 'Gràcies per la visita!',
      subtitle: 'Més informació i encàrrecs a @minimmon.cat',
      photoUrl: '',
      tagText: '🤍 Mínim Món',
      imageFit: 'cover',
      blurIntensity: 35,
      showTag: true,
      showLogo: true,
      customLayers: []
    }
  ]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const isSyncingSlideRef = useRef(false);
  const isLoadedFromScheduleRef = useRef(false);
  const prevSelectedItemRef = useRef(null);
  const prevCopyStyleRef = useRef(null);
  const [isDownloadingCarousel, setIsDownloadingCarousel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  // Transició atòmica i síncrona entre diapositives del carrusel
  const handleSelectSlide = (targetIdx) => {
    if (targetIdx === activeSlideIdx || targetIdx < 0 || targetIdx >= slides.length) return;

    // 1. Guardem síncronament els controls actuals a la diapositiva que deixem
    const updatedSlides = slides.map((s, idx) => {
      if (idx === activeSlideIdx) {
        return {
          ...s,
          title,
          subtitle,
          photoUrl: selectedPhotoUrl,
          tagText,
          imageFit,
          blurIntensity,
          showTag,
          showLogo,
          customLayers
        };
      }
      return s;
    });

    const targetSlide = updatedSlides[targetIdx];
    if (!targetSlide) return;

    isSyncingSlideRef.current = true;
    setSlides(updatedSlides);
    setActiveSlideIdx(targetIdx);

    // 2. Carreguem síncronament la diapositiva de destí als controls
    setTitle(targetSlide.title || '');
    setSubtitle(targetSlide.subtitle || '');
    const pUrl = targetSlide.photoUrl || '';
    setSelectedPhotoUrl(pUrl ? (pUrl.startsWith('data:') || pUrl.startsWith('http') ? pUrl : resolveMediaUrl(pUrl)) : '');
    setTagText(targetSlide.tagText !== undefined ? targetSlide.tagText : '✨ Personalització inclosa');
    setImageFit(targetSlide.imageFit || 'cover');
    setBlurIntensity(targetSlide.blurIntensity ?? 35);
    setShowTag(targetSlide.showTag ?? true);
    setShowLogo(targetSlide.showLogo ?? true);
    if (Array.isArray(targetSlide.customLayers) && targetSlide.customLayers.length > 0) {
      setCustomLayers(targetSlide.customLayers);
    } else {
      setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
    }

    setTimeout(() => {
      isSyncingSlideRef.current = false;
    }, 150);
  };

  // Sincronització: Canvis a Controls locals mentre s'escriu -> Diapositiva activa
  // IMPORTANT: No depèn d'activeSlideIdx per evitar sobreescriure diapositives en canviar de pestanya
  useEffect(() => {
    if (postMode === 'carousel' && !isSyncingSlideRef.current) {
      setSlides(prev => {
        const cur = prev[activeSlideIdx];
        if (!cur) return prev;
        if (
          cur.title === title &&
          cur.subtitle === subtitle &&
          cur.photoUrl === selectedPhotoUrl &&
          cur.tagText === tagText &&
          cur.imageFit === imageFit &&
          cur.blurIntensity === blurIntensity &&
          cur.showTag === showTag &&
          cur.showLogo === showLogo &&
          JSON.stringify(cur.customLayers || []) === JSON.stringify(customLayers)
        ) {
          return prev;
        }
        const updated = [...prev];
        updated[activeSlideIdx] = {
          ...cur,
          title,
          subtitle,
          photoUrl: selectedPhotoUrl,
          tagText,
          imageFit,
          blurIntensity,
          showTag,
          showLogo,
          customLayers
        };
        return updated;
      });
    }
  }, [title, subtitle, selectedPhotoUrl, tagText, imageFit, blurIntensity, showTag, showLogo, customLayers, postMode]);

  // Canvi de Mode (Post Simple vs Carrusel)
  const handleSwitchMode = (newMode) => {
    if (newMode === postMode) return;
    setPostMode(newMode);
    if (newMode === 'carousel') {
      setSlides(prev => {
        // Si ja tenim diapositives vàlides personalitzades, no les sobreescrivim
        if (Array.isArray(prev) && prev.length >= 2 && prev.some(s => s.title && s.title !== 'Mínim Món a la Fira')) {
          return prev;
        }
        const f1 = selectedPhotoUrl || availableImages[0] || resolveMediaUrl('images/tots_productes.jpg');
        const f2 = availableImages[1] || availableImages[0] || f1;
        const f3 = availableImages[2] || availableImages[1] || f1;
        return [
          {
            id: 'slide-1',
            title: title || 'Mínim Món a la Fira',
            subtitle: subtitle || 'Espais en miniatura i records gravats.',
            photoUrl: prev[0]?.photoUrl || f1,
            tagText: tagText || '✨ Fira Artesana',
            imageFit: imageFit || 'cover',
            blurIntensity: blurIntensity ?? 35,
            showTag: true,
            showLogo: true,
            customLayers: customLayers || []
          },
          {
            id: 'slide-2',
            title: prev[1]?.title || 'Detalls de la parada',
            subtitle: prev[1]?.subtitle || 'Peces fetes a mà una a una amb fusta noble.',
            photoUrl: prev[1]?.photoUrl || f2,
            tagText: prev[1]?.tagText || '🔨 Taller Mínim Món',
            imageFit: prev[1]?.imageFit || 'cover',
            blurIntensity: prev[1]?.blurIntensity ?? 35,
            showTag: true,
            showLogo: true,
            customLayers: []
          },
          {
            id: 'slide-3',
            title: prev[2]?.title || 'Gràcies per la visita!',
            subtitle: prev[2]?.subtitle || 'Més informació i encàrrecs a @minimmon.cat',
            photoUrl: prev[2]?.photoUrl || f3,
            tagText: prev[2]?.tagText || '🤍 Fet amb ànima',
            imageFit: prev[2]?.imageFit || 'cover',
            blurIntensity: prev[2]?.blurIntensity ?? 35,
            showTag: true,
            showLogo: true,
            customLayers: []
          }
        ];
      });
      setActiveSlideIdx(0);
    }
  };

  const handleAddSlide = () => {
    if (slides.length >= 10) {
      alert("Instagram admet un màxim de 10 diapositives per carrusel.");
      return;
    }
    const nextIdx = slides.length + 1;
    const fallback = availableImages[nextIdx - 1] || availableImages[0] || selectedPhotoUrl;
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: `Diapositiva ${nextIdx}`,
      subtitle: 'Creacions úniques en fusta natural.',
      photoUrl: fallback,
      tagText: '✨ Mínim Món',
      imageFit: 'cover',
      blurIntensity: 35,
      showTag: true,
      showLogo: true,
      customLayers: INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' }))
    };

    // 1. Guardem primer la diapositiva actual
    const flushedSlides = slides.map((s, idx) => {
      if (idx === activeSlideIdx) {
        return {
          ...s,
          title,
          subtitle,
          photoUrl: selectedPhotoUrl,
          tagText,
          imageFit,
          blurIntensity,
          showTag,
          showLogo,
          customLayers
        };
      }
      return s;
    });

    const newTargetIdx = flushedSlides.length;
    const finalSlides = [...flushedSlides, newSlide];

    isSyncingSlideRef.current = true;
    setSlides(finalSlides);
    setActiveSlideIdx(newTargetIdx);

    // 2. Carreguem síncronament la nova diapositiva als controls
    setTitle(newSlide.title);
    setSubtitle(newSlide.subtitle);
    setSelectedPhotoUrl(newSlide.photoUrl ? (newSlide.photoUrl.startsWith('data:') || newSlide.photoUrl.startsWith('http') ? newSlide.photoUrl : resolveMediaUrl(newSlide.photoUrl)) : '');
    setTagText(newSlide.tagText);
    setImageFit(newSlide.imageFit);
    setBlurIntensity(newSlide.blurIntensity);
    setShowTag(newSlide.showTag);
    setShowLogo(newSlide.showLogo);
    setCustomLayers(newSlide.customLayers);

    setTimeout(() => {
      isSyncingSlideRef.current = false;
    }, 150);
  };

  const handleRemoveSlide = (idxToRemove) => {
    if (slides.length <= 2) {
      alert("Un carrusel ha de contenir com a mínim 2 diapositives.");
      return;
    }
    const flushedSlides = slides.map((s, idx) => {
      if (idx === activeSlideIdx) {
        return {
          ...s,
          title,
          subtitle,
          photoUrl: selectedPhotoUrl,
          tagText,
          imageFit,
          blurIntensity,
          showTag,
          showLogo,
          customLayers
        };
      }
      return s;
    });

    const remaining = flushedSlides.filter((_, i) => i !== idxToRemove);
    let newTargetIdx = activeSlideIdx;
    if (activeSlideIdx >= remaining.length) {
      newTargetIdx = remaining.length - 1;
    } else if (activeSlideIdx === idxToRemove) {
      newTargetIdx = Math.max(0, idxToRemove - 1);
    }

    const targetSlide = remaining[newTargetIdx];

    isSyncingSlideRef.current = true;
    setSlides(remaining);
    setActiveSlideIdx(newTargetIdx);

    if (targetSlide) {
      setTitle(targetSlide.title || '');
      setSubtitle(targetSlide.subtitle || '');
      const pUrl = targetSlide.photoUrl || '';
      setSelectedPhotoUrl(pUrl ? (pUrl.startsWith('data:') || pUrl.startsWith('http') ? pUrl : resolveMediaUrl(pUrl)) : '');
      setTagText(targetSlide.tagText !== undefined ? targetSlide.tagText : '✨ Personalització inclosa');
      setImageFit(targetSlide.imageFit || 'cover');
      setBlurIntensity(targetSlide.blurIntensity ?? 35);
      setShowTag(targetSlide.showTag ?? true);
      setShowLogo(targetSlide.showLogo ?? true);
      if (Array.isArray(targetSlide.customLayers) && targetSlide.customLayers.length > 0) {
        setCustomLayers(targetSlide.customLayers);
      } else {
        setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
      }
    }

    setTimeout(() => {
      isSyncingSlideRef.current = false;
    }, 150);
  };

  const handleDuplicateSlide = (idxToDup) => {
    if (slides.length >= 10) return;
    const flushedSlides = slides.map((s, idx) => {
      if (idx === activeSlideIdx) {
        return {
          ...s,
          title,
          subtitle,
          photoUrl: selectedPhotoUrl,
          tagText,
          imageFit,
          blurIntensity,
          showTag,
          showLogo,
          customLayers
        };
      }
      return s;
    });

    const orig = flushedSlides[idxToDup];
    if (!orig) return;
    const dup = {
      ...orig,
      id: `slide-${Date.now()}`,
      title: `${orig.title} (còpia)`
    };

    const updated = [...flushedSlides];
    const newTargetIdx = idxToDup + 1;
    updated.splice(newTargetIdx, 0, dup);

    isSyncingSlideRef.current = true;
    setSlides(updated);
    setActiveSlideIdx(newTargetIdx);

    setTitle(dup.title || '');
    setSubtitle(dup.subtitle || '');
    const pUrl = dup.photoUrl || '';
    setSelectedPhotoUrl(pUrl ? (pUrl.startsWith('data:') || pUrl.startsWith('http') ? pUrl : resolveMediaUrl(pUrl)) : '');
    setTagText(dup.tagText !== undefined ? dup.tagText : '✨ Personalització inclosa');
    setImageFit(dup.imageFit || 'cover');
    setBlurIntensity(dup.blurIntensity ?? 35);
    setShowTag(dup.showTag ?? true);
    setShowLogo(dup.showLogo ?? true);
    if (Array.isArray(dup.customLayers) && dup.customLayers.length > 0) {
      setCustomLayers(dup.customLayers);
    } else {
      setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
    }

    setTimeout(() => {
      isSyncingSlideRef.current = false;
    }, 150);
  };

  const handlePrevSlide = () => {
    if (activeSlideIdx > 0) handleSelectSlide(activeSlideIdx - 1);
  };

  const handleNextSlide = () => {
    if (activeSlideIdx < slides.length - 1) handleSelectSlide(activeSlideIdx + 1);
  };

  // Descàrrega seqüencial de totes les diapositives del carrusel en fitxers PNG numerats
  const handleDownloadCarousel = async () => {
    if (!canvasRef.current || isDownloadingCarousel) return;
    setIsDownloadingCarousel(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        setDownloadProgress({ current: i + 1, total: slides.length });
        await renderPostingCanvas(canvasRef.current, {
          format,
          template,
          title: s.title,
          subtitle: s.subtitle,
          tagText: s.tagText,
          priceText: '',
          showPrice: false,
          showTag: s.showTag,
          showLogo: s.showLogo,
          photoUrl: s.photoUrl,
          imageFit: s.imageFit,
          blurIntensity: s.blurIntensity,
          headerSlogan,
          customLayers: (s.customLayers && s.customLayers.length > 0) ? s.customLayers : (i === activeSlideIdx ? customLayers : []),
          textScale: textScale || 1
        });
        const safe = (s.title || 'carrusel').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
        const filename = `carrusel-minimmon-${i + 1}-de-${slides.length}-${safe}-${format.replace(':', 'x')}.png`;
        exportCanvasToPng(canvasRef.current, filename);
        // Breu descans per evitar bloquejos del navegador
        await new Promise(r => setTimeout(r, 340));
      }

      // Restaurar el render de la diapositiva que estava seleccionada
      const cur = slides[activeSlideIdx];
      await renderPostingCanvas(canvasRef.current, {
        format,
        template,
        title: cur.title,
        subtitle: cur.subtitle,
        tagText: cur.tagText,
        priceText: '',
        showPrice: false,
        showTag: cur.showTag,
        showLogo: cur.showLogo,
        photoUrl: cur.photoUrl,
        imageFit: cur.imageFit,
        blurIntensity: cur.blurIntensity,
        headerSlogan,
        customLayers: [],
        textScale: textScale || 1
      });
    } catch (err) {
      console.error("Error descarregant el carrusel:", err);
    } finally {
      setIsDownloadingCarousel(false);
      setDownloadProgress(null);
    }
  };

  // 4. Estat de Redacció de Copy
  const [copyStyle, setCopyStyle] = useState('emocional'); // 'emocional' | 'regal' | 'taller'
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // 5. Estat d'imatge personalitzada per URL o pujada
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  // 6. Estat de Tema Lliure i Assistent IA
  const [freeTopic, setFreeTopic] = useState('');
  const [freeTopicTone, setFreeTopicTone] = useState('noticia'); // 'noticia' | 'emocional' | 'taller' | 'filosofia' | 'regal'
  const [isAnalyzingTopic, setIsAnalyzingTopic] = useState(false);
  const [topicAnalysisResult, setTopicAnalysisResult] = useState(null);
  const [showHashtags, setShowHashtags] = useState(true);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

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

  // 1b. Subscripció a les publicacions planificades a Firestore
  useEffect(() => {
    const unsub = subscribeScheduledPosts((posts) => {
      setScheduledPosts(posts);
    });
    return () => unsub();
  }, []);

  const pendingScheduledCount = useMemo(() => {
    return scheduledPosts.filter(p => p.estat !== 'publicada').length;
  }, [scheduledPosts]);

  // Càrrega d'un post des del calendari cap a l'editor
  const handleLoadScheduledPost = (post) => {
    if (!post) return;
    // Bloquegem efectes de sincronització inversa i de regeneració de copy mentre carreguem
    isSyncingSlideRef.current = true;
    isLoadedFromScheduleRef.current = true;

    setEditingScheduledPostId(post.id);
    setScheduledDate(post.dataPublicacio || formatDateISO(new Date()));
    setScheduledTime(post.horaPublicacio || '10:00');
    setScheduledType(post.tipus || 'producte');
    setScheduledNotes(post.notes || '');

    if (post.format) setFormat(post.format);
    if (post.template) setTemplate(post.template);
    if (post.textScale !== undefined) setTextScale(post.textScale);
    else setTextScale(1);
    if (post.headerSlogan) setHeaderSlogan(post.headerSlogan);

    // Normalització del mode carrusel ('carousel' o 'carrusel')
    const isCarousel = post.postMode === 'carousel' || post.postMode === 'carrusel';
    const targetMode = isCarousel ? 'carousel' : (post.postMode || 'single');
    setPostMode(targetMode);

    if (isCarousel && Array.isArray(post.slides) && post.slides.length > 0) {
      setSlides(post.slides);
      setActiveSlideIdx(0);

      // Carreguem directament les dades de la portada (diapositiva 0) als controls
      const s0 = post.slides[0] || {};
      setTitle(s0.title !== undefined ? s0.title : (post.title || ''));
      setSubtitle(s0.subtitle !== undefined ? s0.subtitle : (post.subtitle || ''));
      const photoToUse = s0.photoUrl || post.photoUrl || '';
      setSelectedPhotoUrl(photoToUse ? (photoToUse.startsWith('data:') || photoToUse.startsWith('http') ? photoToUse : resolveMediaUrl(photoToUse)) : '');
      setTagText(s0.tagText !== undefined ? s0.tagText : (post.tagText || '✨ Personalització inclosa'));
      setImageFit(s0.imageFit || post.imageFit || 'cover');
      setBlurIntensity(s0.blurIntensity ?? post.blurIntensity ?? 35);
      setShowTag(s0.showTag ?? post.showTag ?? true);
      setShowLogo(s0.showLogo ?? post.showLogo ?? true);

      if (Array.isArray(s0.customLayers) && s0.customLayers.length > 0) {
        setCustomLayers(s0.customLayers);
      } else if (Array.isArray(post.customLayers) && post.customLayers.length > 0) {
        setCustomLayers(post.customLayers);
      } else {
        setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
      }
    } else {
      if (post.title !== undefined) setTitle(post.title);
      if (post.subtitle !== undefined) setSubtitle(post.subtitle);
      if (post.tagText !== undefined) setTagText(post.tagText);
      if (post.priceText !== undefined) setPriceText(post.priceText);
      if (post.showTag !== undefined) setShowTag(post.showTag);
      if (post.showPrice !== undefined) setShowPrice(post.showPrice);
      const photoToUse = post.photoUrl || '';
      setSelectedPhotoUrl(photoToUse ? (photoToUse.startsWith('data:') || photoToUse.startsWith('http') ? photoToUse : resolveMediaUrl(photoToUse)) : '');
      if (post.imageFit) setImageFit(post.imageFit);
      if (post.blurIntensity !== undefined) setBlurIntensity(post.blurIntensity);

      if (Array.isArray(post.customLayers) && post.customLayers.length > 0) {
        setCustomLayers(post.customLayers);
      } else {
        setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
      }
    }

    setGeneratedCopy(post.copyText || '');
    setFreeTopic(post.freeTopic || '');
    const activeSourceType = post.sourceType || (post.selectedItemId ? 'productes' : 'custom');
    setSourceType(activeSourceType);

    let resolvedItem = null;
    if (post.selectedItemId) {
      const allItems = [...dbProducts, ...dbProjects];
      const match = allItems.find(it => it.id === post.selectedItemId);
      if (match) {
        resolvedItem = match;
      } else {
        resolvedItem = { id: post.selectedItemId, nom: post.title || 'Element guardat' };
      }
    } else {
      resolvedItem = { nom: activeSourceType === 'custom' ? 'Tema lliure' : (post.title || 'Element guardat') };
    }
    setSelectedItem(resolvedItem);
    prevSelectedItemRef.current = resolvedItem;
    prevCopyStyleRef.current = copyStyle;

    // Alliberem el bloqueig un cop assentat el render inicial
    setTimeout(() => {
      isSyncingSlideRef.current = false;
    }, 350);

    setActiveMainTab('editor');
    setSaveScheduleToast(`Publicació del ${post.dataPublicacio} carregada a l'editor!`);
    setTimeout(() => setSaveScheduleToast(null), 3000);
  };

  // Restableix l'editor completament en blanc per a una nova publicació
  const resetEditorToBlank = (targetDate = null) => {
    setEditingScheduledPostId(null);
    setScheduledDate(targetDate || getNextRecommendedDate(scheduledPosts));
    setScheduledTime('10:00');
    setScheduledType('producte');
    setScheduledNotes('');
    setFreeTopic('');
    setGeneratedCopy('');
    setCustomLayers(INITIAL_CUSTOM_LAYERS.map(l => ({ ...l, enabled: false, text: '' })));
    setSelectedLayerTab('layer-1');
    setPostMode('single');
    setFormat('4:5');
    setTemplate('atelier');
    setImageFit('cover');
    setBlurIntensity(35);
    setTextScale(1);
    setShowTag(true);
    setShowPrice(false);

    if (dbProducts.length > 0) {
      const initial = dbProducts.find(p => p.nom && p.nom.toLowerCase().includes('finestra')) || dbProducts[0];
      setSourceType('productes');
      handleSelectItem(initial, 'productes');
    } else {
      setSourceType('productes');
      setSelectedItem(null);
      setTitle('Peça artesanal');
      setSubtitle('Elaborada a mà en fusta de primera qualitat.');
      setSelectedPhotoUrl(resolveMediaUrl('images/tots_productes.jpg'));
      setTagText('✨ Personalització inclosa');
      setPriceText('');
    }
  };

  const handleResetToNewPost = () => {
    resetEditorToBlank();
    setSaveScheduleToast("Has obert una nova publicació independent en blanc.");
    setTimeout(() => setSaveScheduleToast(null), 2500);
  };

  const handleCreateNewForDate = (dateStr) => {
    resetEditorToBlank(dateStr || formatDateISO(new Date()));
    setActiveMainTab('editor');
  };

  const handleSaveCurrentToSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      // Sincronització explícita de la diapositiva activa amb els controls actuals abans de desar
      const isCarousel = postMode === 'carousel' || postMode === 'carrusel';
      const syncedSlides = (isCarousel && Array.isArray(slides))
        ? slides.map((s, idx) => {
            if (idx === activeSlideIdx) {
              return {
                ...s,
                title,
                subtitle,
                photoUrl: selectedPhotoUrl,
                tagText,
                imageFit,
                blurIntensity,
                showTag,
                showLogo,
                customLayers
              };
            }
            return s;
          })
        : slides;

      const coverSlide = (isCarousel && Array.isArray(syncedSlides) && syncedSlides[0]) ? syncedSlides[0] : null;

      const postPayload = {
        id: editingScheduledPostId || undefined,
        dataPublicacio: scheduledDate,
        horaPublicacio: scheduledTime,
        tipus: scheduledType,
        notes: scheduledNotes,
        estat: 'pendent',

        // Contingut visual (per a carrusels, la portada o arrel reflecteix la diapo 1)
        format,
        template,
        title: isCarousel && coverSlide ? (coverSlide.title || title) : title,
        subtitle: isCarousel && coverSlide ? (coverSlide.subtitle || subtitle) : subtitle,
        tagText: isCarousel && coverSlide ? (coverSlide.tagText || tagText) : tagText,
        priceText,
        showTag: isCarousel && coverSlide ? (coverSlide.showTag ?? showTag) : showTag,
        showPrice,
        photoUrl: isCarousel && coverSlide ? (coverSlide.photoUrl || selectedPhotoUrl) : selectedPhotoUrl,
        imageFit: isCarousel && coverSlide ? (coverSlide.imageFit || imageFit) : imageFit,
        blurIntensity: isCarousel && coverSlide ? (coverSlide.blurIntensity ?? blurIntensity) : blurIntensity,
        headerSlogan,
        customLayers: isCarousel && coverSlide ? (coverSlide.customLayers || customLayers) : customLayers,
        textScale: textScale || 1,

        // Mode carrusel
        postMode: isCarousel ? 'carousel' : 'single',
        slides: syncedSlides,

        // Text de redacció i assumpte per separat
        copyText: generatedCopy || '',
        freeTopic: freeTopic || '',
        sourceType,
        selectedItemId: selectedItem?.id || null
      };

      const docId = await saveScheduledPost(postPayload);
      setEditingScheduledPostId(docId);
      setShowSaveScheduleModal(false);
      setSaveScheduleToast(`✓ Publicació guardada al calendari per al ${scheduledDate}!`);
      setTimeout(() => setSaveScheduleToast(null), 3500);
    } catch (e) {
      console.error("Error guardant la publicació a Firestore:", e);
      const detail = e?.message ? ` (${e.message})` : '';
      alert(`Error guardant la publicació a Firestore${detail}. Revisa la connexió o la mida de les imatges.`);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Selecció inicial del primer producte quan carreguen les dades (només en publicacions noves)
  useEffect(() => {
    if (dbProducts.length > 0 && !selectedItem && sourceType === 'productes' && !editingScheduledPostId) {
      const initial = dbProducts.find(p => p.nom && p.nom.toLowerCase().includes('finestra')) || dbProducts[0];
      handleSelectItem(initial, 'productes');
    }
  }, [dbProducts, editingScheduledPostId]);

  // Canvi d'element seleccionat i càrrega automàtica de dades
  const handleSelectItem = (item, type) => {
    setSelectedItem(item);
    if (!item) return;

    let itemTitle = 'Peça artesanal';
    let itemSub = 'Elaborada a mà en fusta de primera qualitat.';
    let imgs = [];

    if (type === 'productes') {
      itemTitle = item.nom || 'Peça artesanal';
      itemSub = item.descripcio 
        ? (item.descripcio.split('\n')[0].length > 70 ? item.descripcio.split('\n')[0].slice(0, 67) + '...' : item.descripcio.split('\n')[0])
        : 'Elaborada a mà en fusta de primera qualitat.';
      
      imgs = extractItemImages(item, 'productes');
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
      itemTitle = item.titol || item.title || item.nom || 'Projecte de Taller';
      itemSub = item.subtitol || item.subtitle || item.encarrec || item.description || item.branca || 'Creació artesanal única a mida.';
      
      imgs = extractItemImages(item, 'projectes');
      const resolvedImg = imgs[0] || resolveMediaUrl('images/tots_productes.jpg');

      setTitle(itemTitle);
      setSubtitle(itemSub);
      setSelectedPhotoUrl(resolvedImg);
      setTagText(item.branca ? `🔨 ${item.branca}` : '🔨 Projecte de Taller');
      setShowTag(true);
      setShowPrice(false);
    }

    // Si estem en Mode Carrusel i l'element té més fotos, les assignem automàticament a les primeres diapositives
    if (postMode === 'carousel' && Array.isArray(imgs) && imgs.length > 1) {
      setSlides(prev => {
        const copy = [...prev];
        if (copy[0]) {
          copy[0] = { ...copy[0], title: itemTitle, subtitle: itemSub, photoUrl: imgs[0] };
        }
        if (copy[1] && imgs[1]) {
          copy[1] = { ...copy[1], title: 'Detalls i acabats', subtitle: 'Peces artesanals amb fusta noble i caràcter.', photoUrl: imgs[1] };
        }
        if (copy[2] && imgs[2]) {
          copy[2] = { ...copy[2], title: 'Mínim Món', subtitle: 'Peces creades amb ànima al taller.', photoUrl: imgs[2] };
        }
        return copy;
      });
    }
  };

  // Generador automàtic per a Productes i Projectes (només si no estem en mode tema lliure)
  useEffect(() => {
    // Si s'ha carregat una publicació des del calendari, mai sobreescrivim el copy que té guardat l'usuari
    if (isLoadedFromScheduleRef.current) {
      isLoadedFromScheduleRef.current = false;
      return;
    }
    // Si estem en una publicació planificada existent i ja té text de copy, mai la sobreescrivim automàticament
    if (editingScheduledPostId && generatedCopy) {
      return;
    }
    if (sourceType === 'custom') return;
    if (!selectedItem) {
      setGeneratedCopy('');
      return;
    }

    // Si estem en una publicació planificada existent i ja té text de copy, no la sobreescrivim
    // tret que l'usuari canviï explícitament d'element seleccionat o d'estil de redacció
    const isNewItem = prevSelectedItemRef.current !== selectedItem;
    const isNewStyle = prevCopyStyleRef.current !== copyStyle;
    prevSelectedItemRef.current = selectedItem;
    prevCopyStyleRef.current = copyStyle;

    if (editingScheduledPostId && !isNewItem && !isNewStyle && generatedCopy) {
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

    const hashtags = showHashtags 
      ? `\n\n#minimmon #artesania #fustacatalunya #regalspersonalitzats #fetama #decoraciocasa #recordsenfusta #regalsunics #fetamà #detallsambamor #tallerartesanal`
      : '';

    setGeneratedCopy(`${copyIntro}\n\n${copyBody}\n\n${copyCta}${hashtags}`);
  }, [selectedItem, title, subtitle, copyStyle, sourceType, showHashtags]);

  // Funció per analitzar i generar copy i disseny per a qualsevol tipus de post (Productes, Projectes o Tema Lliure)
  const handleAnalyzeCopyContent = async (customTopicText = null) => {
    let textToAnalyze = (typeof customTopicText === 'string' ? customTopicText : freeTopic).trim();
    
    // Si estem en Productes o Projectes, agafem el nom i descripció de l'element seleccionat
    if (sourceType !== 'custom' && selectedItem) {
      const itemNom = selectedItem.nom || selectedItem.titol || title || '';
      const itemDesc = selectedItem.descripcio || selectedItem.subtitol || selectedItem.art || subtitle || '';
      textToAnalyze = textToAnalyze || `${itemNom}: ${itemDesc}`;
    }

    if (!textToAnalyze && !title.trim()) {
      alert("Si us plau, selecciona un producte/projecte o indica breument de què tracta el post.");
      return;
    }

    setIsAnalyzingTopic(true);
    try {
      const res = await generatePostingAssistantContent({
        topic: textToAnalyze || title.trim(),
        tone: sourceType === 'custom' ? freeTopicTone : copyStyle,
        imageUrl: selectedPhotoUrl,
        existingTitle: title,
        format: format,
        itemType: sourceType,
        itemData: selectedItem
      });

      if (res) {
        if (sourceType === 'custom') {
          if (res.titol) setTitle(res.titol);
          if (res.subtitol) setSubtitle(res.subtitol);
          if (res.etiqueta) setTagText(res.etiqueta);
        }
        setTopicAnalysisResult(res);
        setSelectedVariantIdx(0);

        let finalCopy = res.copy;
        if (!showHashtags) {
          finalCopy = finalCopy.replace(/\n*#minimmon[\s\S]*$/i, '').trimEnd();
        }
        setGeneratedCopy(finalCopy);
      }
    } catch (err) {
      console.error("Error analitzant el copy:", err);
      alert("No s'ha pogut completar la generació automàtica del copy. Pots redactar-lo manualment.");
    } finally {
      setIsAnalyzingTopic(false);
    }
  };

  const handleAnalyzeFreeTopic = handleAnalyzeCopyContent;

  // Aplicar una variant de text generada per la IA
  const handleApplyVariant = (idx, variantText) => {
    setSelectedVariantIdx(idx);
    let finalCopy = variantText;
    if (!showHashtags) {
      finalCopy = finalCopy.replace(/\n*#minimmon[\s\S]*$/i, '').trimEnd();
    }
    setGeneratedCopy(finalCopy);
  };

  // Re-renderitzar el canvas cada cop que canvia qualsevol paràmetre visual o es canvia de pestanya
  useEffect(() => {
    if (activeMainTab !== 'editor') return;
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
          photoUrl: selectedPhotoUrl,
          imageFit,
          blurIntensity,
          headerSlogan,
          customLayers: [], // Buit a la previsualització interactiva: els divs DOM interactius són els que mostren les capes!
          textScale: textScale || 1
        });
        setIsRendering(false);
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeMainTab, 
    editingScheduledPostId, 
    format, 
    template, 
    title, 
    subtitle, 
    tagText, 
    priceText, 
    showPrice, 
    showTag, 
    showLogo, 
    selectedPhotoUrl, 
    imageFit, 
    blurIntensity, 
    headerSlogan,
    textScale
  ]);

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
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setIsRendering(true);
    try {
      // 1. Renderitza al Canvas d'alta resolució (1080px) incloent les capes per al fitxer PNG
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
        photoUrl: selectedPhotoUrl,
        imageFit,
        blurIntensity,
        headerSlogan,
        customLayers,
        textScale: textScale || 1
      });
      const safeTitle = (title || 'post-minimmon').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      exportCanvasToPng(canvasRef.current, `minimmon-${safeTitle}-${format.replace(':', 'x')}.png`);
    } finally {
      // 2. Restaura el canvas sense les capes perquè a la pantalla les mostrin només els divs interactius
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
        photoUrl: selectedPhotoUrl,
        imageFit,
        blurIntensity,
        headerSlogan,
        customLayers: [],
        textScale: textScale || 1
      });
      setIsRendering(false);
    }
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

  // Pujar imatge personalitzada des del disc amb optimització automàtica per a Firestore i Canvas
  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        const maxDim = 850;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.68);
        setSelectedPhotoUrl(compressedDataUrl);
        if (!title) setTitle('Peça especial');
      };
      img.onerror = () => {
        setSelectedPhotoUrl(rawDataUrl);
        if (!title) setTitle('Peça especial');
      };
      img.src = rawDataUrl;
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

      {/* Selector de Vistes Principals: Creador vs Calendari */}
      <div className="bg-[#2E2016] border-b border-white/10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setActiveMainTab('editor')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'editor'
                  ? 'bg-amber-100 text-amber-950 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-700" />
              <span>Disseny & Creador de Post</span>
              {editingScheduledPostId && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Editant post del calendari" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'calendar'
                  ? 'bg-amber-100 text-amber-950 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-700" />
              <span>Calendari & Pla Editorial</span>
              {pendingScheduledCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-600 text-white">
                  {pendingScheduledCount}
                </span>
              )}
            </button>
          </div>

          {editingScheduledPostId && activeMainTab === 'editor' && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-amber-200/90 font-medium">
                📅 Modificant post del {scheduledDate}
              </span>
              <button
                type="button"
                onClick={handleResetToNewPost}
                className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
              >
                Nou post en blanc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Àrea Principal de Treball */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        {activeMainTab === 'calendar' ? (
          <PostingCalendar
            scheduledPosts={scheduledPosts}
            onEditPost={handleLoadScheduledPost}
            onCreateNewForDate={handleCreateNewForDate}
          />
        ) : (
          <>
            {/* Banner informatiu d'edició d'un post programat */}
            {editingScheduledPostId && (
              <div className="p-3.5 bg-amber-100/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs text-amber-950">
                  <CalendarIcon className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>
                    Estàs modificant la publicació planificada per al <strong>{scheduledDate}</strong> ({scheduledTime}h).
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSaveScheduleModal(true)}
                    className="px-3 py-1.5 bg-[#3D2B1F] hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                  >
                    Desar canvis al Calendari
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToNewPost}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-outline/20 cursor-pointer shadow-2xs"
                  >
                    Crear nou post en blanc
                  </button>
                </div>
              </div>
            )}

            {/* BARRA SUPERIOR: Selector de Format de Publicació (Post Simple vs Carrusel Multifoto) */}
            <div className="bg-white p-4 rounded-2xl border border-outline/15 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-800 to-[#3D2B1F] text-white flex items-center justify-center shrink-0 shadow-xs">
              {postMode === 'carousel' ? <Images className="w-5 h-5 text-amber-200" /> : <Layers className="w-5 h-5 text-amber-200" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#3D2B1F]">
                  {postMode === 'carousel' ? 'Mode Carrusel Multifoto per a Instagram' : 'Mode Post Simple (1 Imatge)'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/60">
                  {postMode === 'carousel' ? `${slides.length} diapositives preparades` : 'Foto única'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {postMode === 'carousel' 
                  ? 'Ideal per a fires, resum d’actes o sèries de productes. Descarrega totes les imatges numerades en un sol clic per pujar a Meta.' 
                  : 'Crea una composició directa d’una sola peça o novetat per al feed o stories.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4EFEA] p-1 rounded-xl shrink-0 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => handleSwitchMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                postMode === 'single'
                  ? 'bg-[#3D2B1F] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black hover:bg-black/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Post Simple</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('carousel')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                postMode === 'carousel'
                  ? 'bg-[#3D2B1F] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black hover:bg-black/5'
              }`}
            >
              <Images className="w-3.5 h-3.5" />
              <span>Carrusel ({slides.length} fotos)</span>
            </button>
          </div>
        </div>

        {/* Graella de dues columnes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
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
                    setSelectedItem({ nom: 'Tema lliure' });
                    if (!title || title === 'Peça artesanal') setTitle('Mínim Món');
                    if (!subtitle) setSubtitle('Artesania en fusta natural i memòria.');
                    if (!tagText || tagText === 'Personalització inclosa') setTagText('✨ Novetat');
                    if (!selectedPhotoUrl) setSelectedPhotoUrl(resolveMediaUrl('images/tots_productes.jpg'));
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceType === 'custom' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-[#3D2B1F] hover:bg-black/5'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tema lliure</span>
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
              /* Mode Tema Lliure: Assistent Integrat amb IA de Gemini & Mínim Món */
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-white rounded-2xl border border-amber-500/30 space-y-3.5 shadow-xs">
                  
                  {/* Capçalera de l'assistent */}
                  <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-700 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4 text-amber-200" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-[#3D2B1F]">
                          Assistent de Tema Lliure
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Analitza l'assumpte i redacta el post amb la filosofia de Mínim Món
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setApiKeyInput(getGeminiApiKey());
                        setShowApiKeyModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-900/15 hover:border-amber-900/30 text-[11px] font-semibold text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Configurar clau d'API de Google Gemini"
                    >
                      <Key className="w-3 h-3 text-amber-700" />
                      <span className="hidden sm:inline">Clau IA</span>
                      {getGeminiApiKey() ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="API Key activa"></span>
                      ) : (
                        <span className="text-[9px] text-amber-600 bg-amber-100 px-1 rounded">Local</span>
                      )}
                    </button>
                  </div>

                  {/* 1. Camp de l'assumpte */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#3D2B1F]">
                      De quin assumpte o novetat vols parlar en aquest post?
                    </label>
                    <textarea
                      rows={3}
                      value={freeTopic}
                      onChange={(e) => setFreeTopic(e.target.value)}
                      placeholder="Ex: Anunciar que acabem d'estrenar el nou web www.minimmon.cat, explicant la nostra passió per la fusta natural, miniatures i el taller artesanal..."
                      className="w-full p-2.5 text-xs font-sans rounded-xl bg-white border border-amber-900/20 focus:outline-none focus:border-amber-700 text-slate-800 shadow-inner"
                    />
                  </div>

                  {/* Suggeriments ràpids d'inspiració */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-600" /> Idees ràpides (fes clic per provar-ho):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '🚀 Estrena del nou web', topic: 'Anunciar l’estrena del nou web oficial de Mínim Món (www.minimmon.cat), convidant a visitar el catàleg i la galeria de diorames.' },
                        { label: '🎪 Fira d’artesania', topic: 'Participació a la propera fira d’artesania aquest cap de setmana, portant les noves peces de fusta i exposició.' },
                        { label: '🪵 Al taller amb calma', topic: 'Com treballem la fusta natural al taller, la combinació entre el gravat làser i el muntatge a mà pacient.' },
                        { label: '🤍 Història d’un record', topic: 'El significat d’un diorama o regal personalitzat com a record viu que atura el temps.' },
                        { label: '🎁 Detall artesanal únic', topic: 'Peces i clauers de fusta dissenyats especialment per a un detall únic i ple de sentiment.' }
                      ].map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            setFreeTopic(chip.topic);
                            handleAnalyzeFreeTopic(chip.topic);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white/80 hover:bg-amber-100/80 border border-amber-900/15 text-[10px] text-amber-950 font-medium transition-all cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Enfocament o to */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Enfocament o to desitjat:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'noticia', label: '📣 Notícia / Anunci' },
                        { id: 'emocional', label: '🤍 Emocional' },
                        { id: 'taller', label: '🔨 Taller & Ofici' },
                        { id: 'filosofia', label: '🌿 Filosofia' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFreeTopicTone(t.id)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                            freeTopicTone === t.id
                              ? 'bg-[#3D2B1F] text-white border-[#3D2B1F] shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-outline/15'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Botó d'acció per analitzar i generar */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isAnalyzingTopic}
                      onClick={() => handleAnalyzeFreeTopic()}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-[#3D2B1F] hover:from-amber-600 hover:to-black text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                    >
                      {isAnalyzingTopic ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-200" />
                          <span>Analitzant assumpte i redactant contingut...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Analitzar assumpte i generar contingut (Copy + Títols)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Resultat de l'anàlisi si s'ha generat */}
                  {topicAnalysisResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-fadeIn text-xs text-emerald-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Contingut generat per al post!
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                          {topicAnalysisResult.fromAi ? 'Model Gemini IA ✓' : 'Motor Contextual Mínim Món ✓'}
                        </span>
                      </div>
                      
                      {/* Canvi ràpid de variants */}
                      {topicAnalysisResult.variantsCopy && topicAnalysisResult.variantsCopy.length > 0 && (
                        <div className="pt-1 border-t border-emerald-200/60">
                          <p className="text-[10px] text-emerald-800 font-semibold mb-1">
                            Tria la variant de text que prefereixis:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyVariant(0, topicAnalysisResult.copy)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                selectedVariantIdx === 0
                                  ? 'bg-emerald-800 text-white shadow-xs'
                                  : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              Variant 1 (Principal)
                            </button>
                            {topicAnalysisResult.variantsCopy.map((v, vIdx) => (
                              <button
                                key={vIdx}
                                type="button"
                                onClick={() => handleApplyVariant(vIdx + 1, v.copy)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                  selectedVariantIdx === vIdx + 1
                                    ? 'bg-emerald-800 text-white shadow-xs'
                                    : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {v.estil || `Variant ${vIdx + 2}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </section>

          {/* BLOC 2: Gestió de la Imatge del Post (Fotos de la peça o pujar-ne una de nova) */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <span>2. Imatge del Post</span>
                  {postMode === 'carousel' && (
                    <span className="text-[11px] font-sans font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/60">
                      Editant Diapo {activeSlideIdx + 1} de {slides.length} {activeSlideIdx === 0 ? '(Portada)' : ''}
                    </span>
                  )}
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

            {/* Foto actualment seleccionada / activa */}
            {selectedPhotoUrl && (
              <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <img
                  src={selectedPhotoUrl}
                  alt="Foto activa"
                  className="w-16 h-16 object-cover rounded-xl border border-amber-900/15 shadow-2xs shrink-0 bg-white"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-amber-950">
                      Foto activa de la publicació
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedPhotoUrl.startsWith('data:') 
                      ? '✓ Imatge pujada des del teu equip' 
                      : (selectedPhotoUrl.startsWith('http') ? 'Imatge externa per URL' : selectedPhotoUrl)}
                  </p>
                </div>
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

            {/* D. Selector d'Ajust de la Foto (Omplir marc vs Encaixar sencera) */}
            <div className="pt-3 border-t border-outline/10 space-y-3 bg-[#FAF8F5] p-3 rounded-xl border border-amber-900/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#3D2B1F] block">Ajust de la foto al requadre</span>
                  <span className="text-[11px] text-slate-500">
                    {imageFit === 'cover' 
                      ? 'Omple tot el marc (ideal per a fotos centrades; retalla els extrems si és panoràmica)' 
                      : 'Mostra la foto sencera al 100% amb fons difuminat adaptable'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-outline/15 shrink-0 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setImageFit('cover')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      imageFit === 'cover' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Omplir tot el marc del post"
                  >
                    Omplir marc
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFit('contain')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      imageFit === 'contain' ? 'bg-[#3D2B1F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Encaixar tota la foto sense cap retall"
                  >
                    Encaixar sencera (100%)
                  </button>
                </div>
              </div>

              {/* Sub-opció: Selector lliscant de Difuminat de Fons (0% al 80%) */}
              {imageFit === 'contain' && (
                <div className="pt-2.5 border-t border-amber-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-amber-900/5 animate-fadeIn">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#3D2B1F]">Difuminat de fons</span>
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        {blurIntensity}%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {blurIntensity === 0 
                        ? '0% = Fons net sòlid (sense cap halo o duplicat)' 
                        : 'Ajusta el contrast entre la imatge en primer plà i el fons (màx. 80%)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-[200px] sm:w-56">
                    <span className="text-[10px] font-semibold text-slate-400">0%</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={blurIntensity}
                      onChange={(e) => setBlurIntensity(Number(e.target.value))}
                      className="w-full accent-[#3D2B1F] cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">80%</span>
                  </div>
                </div>
              )}
            </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(POSTING_TEMPLATES).map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 ${
                        template === tpl.id
                          ? 'bg-[#3D2B1F] text-white border-[#3D2B1F] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-outline/15'
                      }`}
                    >
                      <span className="text-xs font-bold truncate w-full">{tpl.nom}</span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Etiqueta destacada (Badge)</label>
                    <span className="text-[10px]">
                      {!showTag ? (
                        <span className="text-amber-800 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded">Oculta a la imatge</span>
                      ) : tagText?.length > 35 ? (
                        <span className="text-amber-800 font-semibold" title="Text llarg: s'ajusta automàticament de mida a la píndola">
                          {tagText.length} caràcters (auto-ajustat)
                        </span>
                      ) : (
                        <span className="text-slate-400">Recomanat: text concís</span>
                      )}
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled={!showTag}
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    placeholder={showTag ? "Ex: ✨ Personalització inclosa" : "(Etiqueta desactivada)"}
                    className={`w-full px-3 py-1.5 text-xs font-sans rounded-lg border transition-all ${
                      showTag 
                        ? 'bg-slate-50 border-outline/20 focus:outline-none focus:border-amber-700 text-slate-800' 
                        : 'bg-slate-100 border-outline/10 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Subtítol o frase a la imatge (amb selector integrat de lemes de marca) */}
              <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3D2B1F]">
                      Subtítol o lema a la imatge
                    </label>
                    <span className="text-[10px] text-slate-500 block">
                      Apareix sota el títol (s'adapta dinàmicament en alçada, mida de lletra i línies segons la llargada)
                    </span>
                  </div>

                  {!showAddSloganForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddSloganForm(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-white hover:bg-amber-100/70 border border-amber-300/80 rounded-md shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                      title="Afegir una nova frase persistent a la llista"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Nova frase a la llista</span>
                    </button>
                  )}
                </div>

                {/* Desplegable de frases i lemes de marca */}
                <div className="flex gap-2">
                  <select
                    value={brandSlogans.includes(subtitle) ? subtitle : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSubtitle(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-white rounded-lg border border-amber-300/80 focus:outline-none focus:ring-1 focus:ring-amber-700 shadow-2xs cursor-pointer"
                  >
                    <option value="" disabled>-- Tria una frase o lema de la llista --</option>
                    {brandSlogans.map((slogan, idx) => (
                      <option key={idx} value={slogan}>
                        {slogan}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formulari inline per afegir una nova frase persistent */}
                {showAddSloganForm && (
                  <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fadeIn">
                    <input
                      type="text"
                      autoFocus
                      value={newSloganInput}
                      onChange={(e) => setNewSloganInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSlogan();
                        }
                      }}
                      placeholder="Escriu una nova frase o lema per desar..."
                      className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-white rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-700 shadow-2xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddCustomSlogan}
                        disabled={!newSloganInput.trim()}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#3D2B1F] text-white rounded-lg hover:bg-black transition-all cursor-pointer disabled:opacity-50"
                      >
                        Afegir i aplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSloganForm(false);
                          setNewSloganInput('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                      >
                        Cancel·lar
                      </button>
                    </div>
                  </div>
                )}

                {/* Camp de text editable per personalitzar lliurement el subtítol */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Text del subtítol a la imatge:</span>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Escriu o retoca el subtítol..."
                    className="w-full px-3 py-1.5 text-xs font-sans text-slate-800 rounded-lg bg-white border border-outline/20 focus:outline-none focus:border-amber-700"
                  />
                </div>

                {/* Selector ràpid de mida de lletra dels textos principals */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200/60 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-[#3D2B1F] block">Mida dels textos (Títol i Subtítol)</span>
                    <span className="text-[10px] text-slate-500">Augmenta el cos de lletra per a màxima visibilitat</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-900/15 shrink-0 shadow-2xs">
                    {[
                      { scale: 1, label: 'Llegible (Defecte)' },
                      { scale: 1.15, label: 'Gran (+15%)' },
                      { scale: 1.3, label: 'Molt Gran (+30%)' }
                    ].map(opt => (
                      <button
                        key={opt.scale}
                        type="button"
                        onClick={() => setTextScale(opt.scale)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          textScale === opt.scale
                            ? 'bg-[#3D2B1F] text-white shadow-xs'
                            : 'text-slate-600 hover:text-black hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caselles d'elements visuals */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showTag}
                    onChange={(e) => setShowTag(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-700 accent-amber-700 cursor-pointer"
                  />
                  <span>Mostrar Etiqueta a la imatge</span>
                </label>

                {priceText && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-700 accent-amber-700 cursor-pointer"
                    />
                    <span>Mostrar Preu ({priceText})</span>
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* BLOC 4: Capes de Text Lliure (Capa 1 i Capa 2) */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <span>4. Capes de Text Lliure</span>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/60">
                    Informal & Creatiu
                  </span>
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Afegeix textos lliures i situa'ls on vulguis a la foto
              </span>
            </div>

            {/* Pestanyes de selecció de capa: Capa 1 i Capa 2 */}
            <div className="flex items-center gap-2 bg-[#F3ECE4] p-1.5 rounded-xl">
              {customLayers.map((layer) => {
                const isSelected = selectedLayerTab === layer.id;
                const isEnabled = layer.enabled && layer.text && layer.text.trim().length > 0;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerTab(layer.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#3D2B1F] text-white shadow-xs'
                        : 'text-[#3D2B1F] hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isEnabled ? (isSelected ? 'bg-amber-300' : 'bg-emerald-600') : 'bg-slate-300'
                      }`} />
                      <span className="truncate">{layer.name}</span>
                    </div>
                    {isEnabled ? (
                      <span className={`text-[10px] font-normal truncate max-w-[120px] ${
                        isSelected ? 'text-amber-200' : 'text-slate-500'
                      }`}>
                        "{layer.text}"
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono ${
                        isSelected ? 'text-white/60' : 'text-slate-400'
                      }`}>
                        (Desactivada)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Panell de configuració de la capa activa */}
            <div className="space-y-4 pt-1">
              {/* Commutador d'activació i accions ràpides */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-outline/10">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={activeLayer.enabled}
                    onChange={() => toggleLayerEnabled(activeLayer.id)}
                    className="w-4 h-4 rounded text-amber-700 accent-amber-700 cursor-pointer"
                  />
                  <span>Mostrar la {activeLayer.name} a la imatge</span>
                </label>

                {activeLayer.enabled && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveLayer({ text: '' })}
                      className="text-[11px] text-slate-500 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Netejar text"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Buidar text</span>
                    </button>
                  </div>
                )}
              </div>

              {activeLayer.enabled ? (
                <>
                  {/* Text de la capa */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Contingut del text ({activeLayer.name}):
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <span>💡 Obre tots els emojis del sistema:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px] font-bold text-slate-700">Win</kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px] font-bold text-slate-700">.</kbd>
                      </span>
                    </div>

                    {/* Paleta d'icones ràpides d'artesania Mínim Món */}
                    <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                          <Smile className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Icones artesanals (fes clic per inserir):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAllEmojis(prev => !prev)}
                          className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer shrink-0"
                        >
                          {showAllEmojis ? 'Menys icones ▲' : 'Veure per categories ▼'}
                        </button>
                      </div>

                      {/* Icones destacades ràpides */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {FAVORITE_ARTISAN_EMOJIS.map((emoji, eIdx) => (
                          <button
                            key={eIdx}
                            type="button"
                            onClick={() => handleInsertEmoji(emoji)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-amber-100/90 border border-amber-900/10 hover:border-amber-500/50 text-base flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-120 active:scale-95"
                            title={`Inserir ${emoji} al text`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Llistat complet per categories si s'ha desplegat */}
                      {showAllEmojis && (
                        <div className="pt-2 border-t border-amber-200/60 space-y-2 animate-fadeIn">
                          {ARTISAN_EMOJI_GROUPS.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-1">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                                {group.name}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {group.emojis.map((emoji, emojiIdx) => (
                                  <button
                                    key={emojiIdx}
                                    type="button"
                                    onClick={() => handleInsertEmoji(emoji)}
                                    className="w-7 h-7 rounded-lg bg-white hover:bg-amber-100/90 border border-amber-900/10 hover:border-amber-500/50 text-base flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-120 active:scale-95"
                                    title={`Inserir ${emoji} al text`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <textarea
                      ref={layerTextareaRef}
                      rows={2}
                      value={activeLayer.text}
                      onChange={(e) => updateActiveLayer({ text: e.target.value })}
                      placeholder="Ex: ✨ Fet a mà amb fusta de roure..."
                      className="w-full px-3 py-2 text-xs font-medium text-slate-800 rounded-xl bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700 resize-none shadow-2xs"
                    />

                    {/* Frases ràpides d'inspiració */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Exemples ràpids:</span>
                      {QUICK_LAYER_PHRASES.map((phrase, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => updateActiveLayer({ text: phrase })}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3ECE4] hover:bg-amber-100 text-[#3D2B1F] border border-amber-300/40 transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Font (les fonts disponibles a l'app) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Tipografia ({AVAILABLE_FONTS.length} estils de l'app):
                      </label>
                      <span className="text-[10px] text-amber-800 font-mono font-semibold">
                        {activeLayer.fontName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABLE_FONTS.map(f => {
                        const isFontSelected = activeLayer.fontId === f.id || activeLayer.fontName === f.name;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => updateActiveLayer({
                              fontId: f.id,
                              fontName: f.name,
                              fontFamily: f.fontFamily
                            })}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                              isFontSelected
                                ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-500 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-outline/15'
                            }`}
                          >
                            <span 
                              className="text-sm font-semibold truncate block" 
                              style={{ fontFamily: f.fontFamily }}
                            >
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              {f.label.split('(')[1]?.replace(')', '') || f.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mida de la font */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-outline/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-amber-700" />
                        <span>Mida de la font:</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ fontSize: Math.max(18, (activeLayer.fontSize || 34) - 2) })}
                          className="w-6 h-6 rounded-md bg-white border border-outline/20 flex items-center justify-center font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-[#3D2B1F] min-w-[42px] text-center">
                          {activeLayer.fontSize || 34}px
                        </span>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ fontSize: Math.min(70, (activeLayer.fontSize || 34) + 2) })}
                          className="w-6 h-6 rounded-md bg-white border border-outline/20 flex items-center justify-center font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">18px</span>
                      <input
                        type="range"
                        min="18"
                        max="70"
                        step="2"
                        value={activeLayer.fontSize || 34}
                        onChange={(e) => updateActiveLayer({ fontSize: Number(e.target.value) })}
                        className="w-full accent-[#3D2B1F] cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">70px</span>
                    </div>

                    {/* Presets ràpids de mida */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        { label: 'Subtil', size: 24 },
                        { label: 'Normal', size: 34 },
                        { label: 'Destacat', size: 44 },
                        { label: 'Gran', size: 56 }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateActiveLayer({ fontSize: preset.size })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                            (activeLayer.fontSize || 34) === preset.size
                              ? 'bg-[#3D2B1F] text-white border-[#3D2B1F]'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-outline/20'
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amplada de la Càpsula / Ajust de línia */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-outline/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-amber-700" />
                        <span>Amplada de la càpsula:</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-[#3D2B1F]">
                        {activeLayer.maxWidthPercent || 58}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">35%</span>
                      <input
                        type="range"
                        min="35"
                        max="90"
                        step="3"
                        value={activeLayer.maxWidthPercent || 58}
                        onChange={(e) => updateActiveLayer({ maxWidthPercent: Number(e.target.value) })}
                        className="w-full accent-[#3D2B1F] cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">90%</span>
                    </div>

                    {/* Presets ràpids d'amplada */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        { label: 'Compacta', percent: 45 },
                        { label: 'Equilibrada', percent: 58 },
                        { label: 'Àmplia', percent: 74 },
                        { label: 'Bàner total', percent: 88 }
                      ].map(wp => (
                        <button
                          key={wp.label}
                          type="button"
                          onClick={() => updateActiveLayer({ maxWidthPercent: wp.percent })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                            (activeLayer.maxWidthPercent || 58) === wp.percent
                              ? 'bg-[#3D2B1F] text-white border-[#3D2B1F]'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-outline/20'
                          }`}
                        >
                          {wp.label} ({wp.percent}%)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors: Color de text i Color de fons amb transparència */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Color del Text */}
                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-outline/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-amber-700" />
                          <span>Color del text:</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={activeLayer.textColor || '#FFFFFF'}
                            onChange={(e) => updateActiveLayer({ textColor: e.target.value })}
                            className="w-6 h-6 rounded-md border border-outline/20 cursor-pointer p-0 overflow-hidden"
                            title="Tria qualsevol color de text"
                          />
                          <span className="text-[10px] font-mono text-slate-600 font-semibold uppercase">
                            {activeLayer.textColor || '#FFFFFF'}
                          </span>
                        </div>
                      </div>

                      {/* Paleta ràpida de text */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {TEXT_COLOR_PRESETS.map((tc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateActiveLayer({ textColor: tc.value })}
                            className={`w-6 h-6 rounded-full border transition-transform cursor-pointer relative shadow-2xs ${
                              activeLayer.textColor === tc.value ? 'scale-115 ring-2 ring-amber-600 border-white' : 'hover:scale-105 border-black/20'
                            }`}
                            style={{ backgroundColor: tc.value }}
                            title={tc.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Color de Fons i Transparència */}
                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-outline/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-amber-700" />
                          <span>Fons i transparència:</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={activeLayer.bgColor && activeLayer.bgColor !== 'transparent' ? activeLayer.bgColor : '#3D2B1F'}
                            onChange={(e) => updateActiveLayer({ bgColor: e.target.value })}
                            className="w-6 h-6 rounded-md border border-outline/20 cursor-pointer p-0 overflow-hidden"
                            title="Tria el color de fons"
                          />
                          <span className="text-[10px] font-mono font-semibold text-slate-600">
                            {activeLayer.bgOpacity === 0 ? 'Cap fons' : `${activeLayer.bgOpacity}%`}
                          </span>
                        </div>
                      </div>

                      {/* Slider de Transparència/Opacitat */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span>0% (Transparent)</span>
                          <span className="font-bold text-amber-900 font-mono">
                            {activeLayer.bgOpacity === 0 ? 'Sense fons (0%)' : `${activeLayer.bgOpacity}% opacitat`}
                          </span>
                          <span>100% (Sòlid)</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={typeof activeLayer.bgOpacity === 'number' ? activeLayer.bgOpacity : 80}
                          onChange={(e) => updateActiveLayer({ bgOpacity: Number(e.target.value) })}
                          className="w-full accent-[#3D2B1F] cursor-pointer"
                        />
                      </div>

                      {/* Paleta ràpida de fons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {BG_COLOR_PRESETS.map((bc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateActiveLayer({
                              bgColor: bc.value,
                              bgOpacity: bc.opacity
                            })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                              (activeLayer.bgOpacity === bc.opacity && (bc.value === 'transparent' || activeLayer.bgColor === bc.value))
                                ? 'bg-[#3D2B1F] text-white border-[#3D2B1F]'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-outline/20'
                            }`}
                            title={bc.label}
                          >
                            {bc.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Posició i Desplaçament de Precisió */}
                  <div className="space-y-2.5 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Move className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-[#3D2B1F]">
                          Posició i desplaçament ({activeLayer.name}):
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
                        X: {activeLayer.x}% | Y: {activeLayer.y}%
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200/60 text-[11px] text-[#3D2B1F] flex items-center gap-2">
                      <span className="text-base">👆</span>
                      <span>
                        <strong>Genial:</strong> Pots fer clic i <strong>arrossegar aquesta capa directament</strong> sobre la imatge de la dreta amb el ratolí o el dit!
                      </span>
                    </div>

                    {/* Fletxes direccionals de precisió i botons d'alineació ràpida */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      {/* D-Pad de Fletxes */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => nudgeLayer(activeLayer.id, 0, -3)}
                          className="p-1.5 rounded-lg bg-white border border-outline/20 hover:bg-amber-100 text-[#3D2B1F] shadow-2xs cursor-pointer transition-all active:scale-95"
                          title="Moure cap amunt"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => nudgeLayer(activeLayer.id, -3, 0)}
                            className="p-1.5 rounded-lg bg-white border border-outline/20 hover:bg-amber-100 text-[#3D2B1F] shadow-2xs cursor-pointer transition-all active:scale-95"
                            title="Moure cap a l'esquerra"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveLayer({ x: 50, y: 50 })}
                            className="px-2 py-1.5 rounded-lg bg-white border border-outline/20 hover:bg-amber-100 text-[10px] font-bold text-[#3D2B1F] shadow-2xs cursor-pointer transition-all"
                            title="Centrar completament"
                          >
                            Centre
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeLayer(activeLayer.id, 3, 0)}
                            className="p-1.5 rounded-lg bg-white border border-outline/20 hover:bg-amber-100 text-[#3D2B1F] shadow-2xs cursor-pointer transition-all active:scale-95"
                            title="Moure cap a la dreta"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => nudgeLayer(activeLayer.id, 0, 3)}
                          className="p-1.5 rounded-lg bg-white border border-outline/20 hover:bg-amber-100 text-[#3D2B1F] shadow-2xs cursor-pointer transition-all active:scale-95"
                          title="Moure cap avall"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Botons d'Alineació Ràpida */}
                      <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ x: 50, y: 22 })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300/60 text-[#3D2B1F] transition-all cursor-pointer shadow-2xs text-center"
                        >
                          ⬆ A dalt
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ x: 50, y: 50 })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300/60 text-[#3D2B1F] transition-all cursor-pointer shadow-2xs text-center"
                        >
                          ⏹ Al mig
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ x: 50, y: 78 })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300/60 text-[#3D2B1F] transition-all cursor-pointer shadow-2xs text-center"
                        >
                          ⬇ A baix
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ x: 50 })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300/60 text-[#3D2B1F] transition-all cursor-pointer shadow-2xs text-center"
                        >
                          ↔ Centrar X
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-outline/20 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    La <strong>{activeLayer.name}</strong> està actualment desactivada.
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleLayerEnabled(activeLayer.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#3D2B1F] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Activar {activeLayer.name}</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* BLOC 5: Generador de Copywriting i Hashtags */}
          <section className="bg-white p-5 rounded-2xl border border-outline/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-700" />
                <h2 className="font-serif text-base font-semibold text-[#3D2B1F]">
                  5. Text redactat per a la publicació (Copy)
                </h2>
              </div>

              {/* Botons d'estil i botó generador amb IA */}
              <div className="flex flex-wrap items-center gap-2">
                {sourceType !== 'custom' && (
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
                )}

                {/* Botó generador amb IA disponible tant per a Productes, Projectes com Tema Lliure */}
                <button
                  type="button"
                  disabled={isAnalyzingTopic}
                  onClick={() => handleAnalyzeCopyContent()}
                  className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Genera propostes de text noves amb IA basades en aquest producte/projecte"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isAnalyzingTopic ? 'Generant...' : 'Generar text nou amb IA'}</span>
                </button>
              </div>
            </div>

            {/* Selector de variants generades per la IA (disponible per a Productes, Projectes i Tema Lliure) */}
            {topicAnalysisResult?.variantsCopy && topicAnalysisResult.variantsCopy.length > 0 && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 animate-fadeIn">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-700" /> Variants generades per l'assistent:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyVariant(0, topicAnalysisResult.copy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      selectedVariantIdx === 0
                        ? 'bg-[#3D2B1F] text-white shadow-xs'
                        : 'bg-white hover:bg-amber-100 text-[#3D2B1F] border border-amber-900/15'
                    }`}
                  >
                    Principal
                  </button>
                  {topicAnalysisResult.variantsCopy.map((v, vIdx) => (
                    <button
                      key={vIdx}
                      type="button"
                      onClick={() => handleApplyVariant(vIdx + 1, v.copy)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        selectedVariantIdx === vIdx + 1
                          ? 'bg-[#3D2B1F] text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-[#3D2B1F] border border-amber-900/15'
                      }`}
                    >
                      {v.estil || `Variant ${vIdx + 2}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                rows={6}
                value={generatedCopy}
                onChange={(e) => setGeneratedCopy(e.target.value)}
                placeholder="El text redactat del post apareixerà aquí. Pots editar-lo lliurement..."
                className="w-full p-3.5 text-xs font-sans leading-relaxed rounded-xl bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              {/* Commutador de Hashtags / Etiquetes */}
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-xs">
                <input
                  type="checkbox"
                  checked={showHashtags}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setShowHashtags(nextVal);
                    const hashtagsRegex = /\n*#minimmon[\s\S]*$/i;
                    if (!nextVal) {
                      setGeneratedCopy(prev => prev.replace(hashtagsRegex, '').trimEnd());
                    } else {
                      const hashtags = `\n\n#minimmon #artesania #fustacatalunya #regalspersonalitzats #fetama #decoraciocasa #recordsenfusta #regalsunics #fetamà #detallsambamor #tallerartesanal`;
                      setGeneratedCopy(prev => prev.replace(hashtagsRegex, '').trimEnd() + hashtags);
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-700 accent-amber-700 cursor-pointer"
                />
                <span>Incloure hashtags / etiquetes (#)</span>
              </label>

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
                    <span>Copiar text per a Instagram</span>
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
                  {postMode === 'carousel' ? 'Previsualització del Carrusel' : 'Previsualització del Post'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {POSTING_FORMATS[format]?.nom}
              </span>
            </div>

            {/* Mode Carrusel: Selector i Gestor de Diapositives */}
            {postMode === 'carousel' && (
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-amber-900/10 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-amber-800" />
                    <span className="text-xs font-bold text-[#3D2B1F]">Diapositives ({slides.length}/10)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateSlide(activeSlideIdx)}
                      title="Duplicar aquesta diapositiva"
                      className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-black bg-white hover:bg-slate-50 border border-outline/15 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <CopyPlus className="w-3 h-3 text-slate-500" />
                      <span>Duplicar</span>
                    </button>
                    {slides.length < 10 && (
                      <button
                        type="button"
                        onClick={handleAddSlide}
                        title="Afegir nova diapositiva al carrusel"
                        className="px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-amber-100/70 hover:bg-amber-100 border border-amber-300/80 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-amber-700" />
                        <span>Afegir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tira de pestanyes / miniatures de diapositiva */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                  {slides.map((s, idx) => {
                    const isCur = activeSlideIdx === idx;
                    return (
                      <div
                        key={s.id || idx}
                        onClick={() => handleSelectSlide(idx)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
                          isCur
                            ? 'bg-[#3D2B1F] text-white shadow-xs'
                            : 'bg-white hover:bg-amber-50/60 text-slate-700 border border-outline/15'
                        }`}
                      >
                        <span>{idx === 0 ? '1. Portada' : `${idx + 1}. Diapo`}</span>
                        {slides.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSlide(idx);
                            }}
                            title="Eliminar diapositiva"
                            className={`p-0.5 rounded hover:bg-red-500/20 text-[10px] ${
                              isCur ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenidor del Canvas amb escalat responsive i navegació de carrusel */}
            <div className="bg-[#EAE5DE] p-4 rounded-xl flex items-center justify-center overflow-hidden min-h-[360px] relative group">
              {/* Fletxa Esquerra en Mode Carrusel */}
              {postMode === 'carousel' && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={activeSlideIdx === 0}
                  className={`absolute left-2.5 z-10 p-2 rounded-full bg-white/90 text-[#3D2B1F] shadow-md transition-all cursor-pointer ${
                    activeSlideIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:scale-105 active:scale-95'
                  }`}
                  title="Diapositiva anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <div 
                ref={previewContainerRef}
                onPointerMove={handleContainerPointerMove}
                onPointerUp={handleContainerPointerUp}
                onPointerCancel={handleContainerPointerUp}
                className="relative rounded-lg shadow-xl overflow-hidden border border-black/10 bg-white transition-all max-w-full select-none"
                style={{ 
                  aspectRatio: POSTING_FORMATS[format]?.aspect || '4/5',
                  maxHeight: '520px',
                  height: '520px',
                  width: 'auto'
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain block pointer-events-none"
                />
                {isRendering && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
                  </div>
                )}

                {/* Capes de text lliures interactives directament sobre la imatge */}
                {customLayers.map((layer) => {
                  if (!layer.enabled || !layer.text || !layer.text.trim()) return null;
                  const isSelected = selectedLayerTab === layer.id;
                  const scaleRatio = format === '1:1' ? 0.481 : (format === '4:5' ? 0.385 : 0.271);
                  const layerFs = (layer.fontSize || 34) * scaleRatio;
                  const maxWPercent = layer.maxWidthPercent || 58;

                  return (
                    <div
                      key={layer.id}
                      onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
                      className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow z-20 group/layer ${
                        isSelected
                          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-transparent shadow-lg'
                          : 'hover:ring-2 hover:ring-amber-400/70 hover:shadow-md'
                      }`}
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: hexToRgba(layer.bgColor, layer.bgOpacity),
                        color: layer.textColor || '#FFFFFF',
                        fontFamily: layer.fontFamily,
                        fontSize: `${layerFs.toFixed(1)}px`,
                        padding: `${Math.round(layerFs * 0.40)}px ${Math.round(layerFs * 0.70)}px`,
                        borderRadius: `${Math.min(24, Math.round(layerFs * 0.50))}px`,
                        boxShadow: layer.bgOpacity > 0 ? '0 4px 14px rgba(0,0,0,0.22)' : 'none',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'center',
                        lineHeight: 1.34,
                        maxWidth: `${maxWPercent}%`,
                        wordBreak: 'break-word',
                        touchAction: 'none'
                      }}
                      title="Fes clic per editar o arrossega per moure aquesta capa per la imatge"
                    >
                      <span>{layer.text}</span>

                      {/* Etiqueta flotant de la capa (indicador visual amigable) */}
                      <div 
                        className={`absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider pointer-events-none transition-all flex items-center gap-1 whitespace-nowrap shadow-xs ${
                          isSelected 
                            ? 'bg-amber-700 text-white opacity-100 scale-100' 
                            : 'bg-black/75 text-white/90 opacity-0 group-hover/layer:opacity-100 scale-95 group-hover/layer:scale-100'
                        }`}
                      >
                        <Move className="w-2.5 h-2.5 text-amber-200" />
                        <span>{layer.name}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Punts de paginació d'Instagram */}
                {postMode === 'carousel' && (
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        className={`block rounded-full transition-all ${
                          activeSlideIdx === i ? 'w-2 h-2 bg-white scale-110' : 'w-1.5 h-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] font-mono text-white/90 font-bold ml-1">
                      {activeSlideIdx + 1}/{slides.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Fletxa Dreta en Mode Carrusel */}
              {postMode === 'carousel' && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={activeSlideIdx === slides.length - 1}
                  className={`absolute right-2.5 z-10 p-2 rounded-full bg-white/90 text-[#3D2B1F] shadow-md transition-all cursor-pointer ${
                    activeSlideIdx === slides.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:scale-105 active:scale-95'
                  }`}
                  title="Diapositiva següent"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Botons d'Acció / Descàrrega */}
            <div className="space-y-2 pt-2">
              {postMode === 'carousel' ? (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadCarousel}
                    disabled={isDownloadingCarousel}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-[#3D2B1F] hover:from-amber-600 hover:to-black text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98] disabled:opacity-80"
                  >
                    {isDownloadingCarousel ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                        <span>
                          Descarregant diapo {downloadProgress?.current || 1} de {downloadProgress?.total || slides.length}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Descarregar tot el Carrusel ({slides.length} PNGs numerats)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Descarregar només la diapositiva actual ({activeSlideIdx + 1} de {slides.length})</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-[#3D2B1F] hover:from-amber-600 hover:to-black text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar Imatge PNG (1080px)</span>
                </button>
              )}

              {/* Botó destacat per Guardar i Programar al Calendari */}
              <button
                type="button"
                onClick={() => setShowSaveScheduleModal(true)}
                className="w-full py-3 bg-white hover:bg-amber-50 text-[#3D2B1F] border-2 border-[#3D2B1F] hover:border-black font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98]"
              >
                <CalendarPlus className="w-4 h-4 text-amber-700" />
                <span>
                  {editingScheduledPostId ? '📅 Actualitzar al Calendari' : '📅 Desar i Programar al Calendari'}
                </span>
              </button>

              <p className="text-[11px] text-center text-slate-500">
                {postMode === 'carousel'
                  ? 'Fitxers numerats (carrusel-1, carrusel-2...) llestos per pujar tots d’un cop a Meta Business Suite o Instagram.'
                  : 'Resolució nativa neta de 1080px d’alta qualitat, sense marques d’aigua.'}
              </p>
            </div>

            {/* Enllaç ràpid a Meta Business Suite */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">
                  {postMode === 'carousel' ? 'Com publicar el carrusel a Meta en 30 segons:' : 'Com publicar-ho en 30 segons:'}
                </p>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  {postMode === 'carousel'
                    ? 'Obre Meta Business Suite i en fer «Crear publicació», selecciona els ' + slides.length + ' fitxers PNG junts. Meta els ordenarà sols conservant el mateix estil!'
                    : 'Pots enviar la imatge al teu mòbil i pujar-la a Instagram, o obrir Meta Business Suite al navegador per programar posts gratuïtament.'}
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

      </div>
          </>
        )}

      </main>

      {/* Modal de Desar i Programar al Calendari */}
      {showSaveScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-outline/15 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-amber-700" />
                <h3 className="font-serif font-bold text-base text-[#3D2B1F]">
                  {editingScheduledPostId ? 'Actualitzar publicació al Calendari' : 'Desar i Programar Publicació'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Tria de Data */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Data de publicació:</label>
                  <button
                    type="button"
                    onClick={() => setScheduledDate(getNextRecommendedDate(scheduledPosts))}
                    className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    ⚡ Següent data lliure recomanada
                  </button>
                </div>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-outline/20 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-700"
                />
              </div>

              {/* Tria d'Hora */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora aproximada de publicació:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 border border-outline/20 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                  <div className="flex items-center gap-1">
                    {[
                      { label: '10:00 (Matí)', val: '10:00' },
                      { label: '14:00 (Migdia)', val: '14:00' },
                      { label: '19:30 (Vespre)', val: '19:30' }
                    ].map(h => (
                      <button
                        key={h.val}
                        type="button"
                        onClick={() => setScheduledTime(h.val)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                          scheduledTime === h.val
                            ? 'bg-[#3D2B1F] text-white border-[#3D2B1F]'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-outline/20'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Temàtica del Post */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Temàtica / Tipus de contingut:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {POST_CONTENT_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setScheduledType(t.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                        scheduledType === t.id
                          ? 'border-amber-700 ring-1 ring-amber-700 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-50 border-outline/15 text-slate-700'
                      }`}
                      style={scheduledType === t.id ? { backgroundColor: t.bgLight, color: t.color } : {}}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes personals */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes internes (opcional):</label>
                <textarea
                  rows={2}
                  value={scheduledNotes}
                  onChange={(e) => setScheduledNotes(e.target.value)}
                  placeholder="Ex: Recordar etiquetar a @firaartesans o preparar un reel curt..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-outline/20 rounded-xl text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                💡 Es desarà tota la composició exacta (foto, títols, capes de text lliure, plantilla i copy redactat) a Firestore per recuperar-la o rebre l'avís de Telegram el dia programat.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline/10">
              <button
                type="button"
                onClick={() => setShowSaveScheduleModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                disabled={isSavingSchedule}
                onClick={handleSaveCurrentToSchedule}
                className="px-4 py-2 text-xs font-bold bg-[#3D2B1F] hover:bg-black text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-amber-300" />
                <span>{isSavingSchedule ? 'Desant a Firestore...' : (editingScheduledPostId ? 'Actualitzar al Calendari' : 'Desar i Programar')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmació de desat */}
      {saveScheduleToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-[#3D2B1F] text-white rounded-2xl border border-amber-400/40 shadow-xl text-xs font-bold animate-fadeIn flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveScheduleToast}</span>
        </div>
      )}

      {/* Modal de configuració de la Clau d'API de Gemini */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline/20 space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#3D2B1F]">
                    Clau d'API de Google Gemini
                  </h3>
                  <p className="text-[11px] text-slate-500">Per a la generació intel·ligent de contingut</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pots introduir la teva clau gratuïta de <strong>Google AI Studio (Gemini)</strong> per gaudir de generació il·limitada de títols, subtítols i copies adaptats a Mínim Món. Es desa exclusivament al teu navegador.
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Clau d'API (AIza...):</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-outline/20 focus:outline-none focus:border-amber-700"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {getGeminiApiKey() ? (
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey('');
                    setApiKeyInput('');
                    alert("S'ha esborrat la clau d'API.");
                  }}
                  className="text-xs text-rose-700 hover:underline font-semibold cursor-pointer"
                >
                  Esborrar clau
                </button>
              ) : <span></span>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Tancar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey(apiKeyInput.trim());
                    setShowApiKeyModal(false);
                    alert("Clau d'API desada amb èxit!");
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#3D2B1F] hover:bg-black text-white shadow-xs cursor-pointer"
                >
                  Desar clau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
