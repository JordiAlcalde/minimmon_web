import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Mail, 
  Phone, 
  Info, 
  X, 
  Package,
  Globe
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { ProductCard } from './RegalsCatalogSection';
import { DEFAULT_CLIENT_PALETTE, resolveClientLogoUrl } from '../utils/clientPortalsUtils';
import { getCurrentLanguage, setLanguage } from '../utils/translator';
import { renderFormattedText } from '../utils/textUtils';

const PORTAL_LANGUAGES = ['CA', 'ES', 'EN', 'FR'];

/**
 * Protegeix el nom comercial del client i "Mínim Món" dins de qualsevol cadena de text
 * perquè Google Translate no els tradueixi mai (embolcallant-los amb notranslate).
 */
function renderProtectedClientText(text, clientName) {
  if (!text) return null;
  const str = String(text);
  const terms = [clientName, 'Mínim Món']
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) return str;

  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = str.split(regex);

  return parts.map((part, idx) => {
    const isProtected = terms.some(t => t.toLowerCase() === part.toLowerCase());
    if (isProtected) {
      return (
        <span key={idx} className="notranslate" translate="no">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function ClientPortalView({ clientPortal: initialClientPortal }) {
  const { cart, addToCart, openCart, setIsDrawerOpen, totalItems } = useBudget();
  const [livePortal, setLivePortal] = useState(initialClientPortal);
  const portalCacheSlug = String(initialClientPortal?.slug || '').toLowerCase().trim();
  const [dbProducts, setDbProducts] = useState(() => {
    if (typeof window === 'undefined' || !portalCacheSlug) return [];
    try {
      const raw = localStorage.getItem(`minimmon_client_prods_cache_${portalCacheSlug}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [dbGammes, setDbGammes] = useState([]);
  const [dbEscandalls, setDbEscandalls] = useState([]);
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined' || !portalCacheSlug) return true;
    try {
      return !localStorage.getItem(`minimmon_client_prods_cache_${portalCacheSlug}`);
    } catch (e) {
      return true;
    }
  });
  const [selectedGamma, setSelectedGamma] = useState('Tots');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [lang, setLang] = useState(() => getCurrentLanguage());

  const clientPortal = livePortal || initialClientPortal;

  const handleLanguageChange = (l) => {
    setLang(l);
    setLanguage(l);
  };

  // Sincronització en temps real de les dades del portal del client
  useEffect(() => {
    if (!initialClientPortal?.id) return;
    const unsubPortal = onSnapshot(doc(db, 'clients_portals', initialClientPortal.id), (snap) => {
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() };
        setLivePortal(updated);
        if (updated.slug) {
          try {
            localStorage.setItem(`minimmon_client_portal_cache_${String(updated.slug).toLowerCase().trim()}`, JSON.stringify(updated));
          } catch (e) {}
        }
      }
    });
    return () => unsubPortal();
  }, [initialClientPortal?.id]);

  // Paleta de colors corporativa del client
  const colors = clientPortal.colors || DEFAULT_CLIENT_PALETTE;
  const primaryColor = colors.primary || DEFAULT_CLIENT_PALETTE.primary;
  const containerColor = colors.primaryContainer || DEFAULT_CLIENT_PALETTE.primaryContainer;
  const accentColor = colors.accent || DEFAULT_CLIENT_PALETTE.accent;
  const surfaceColor = colors.surface || DEFAULT_CLIENT_PALETTE.surface;

  // Carregar productes, gammes i escandalls
  useEffect(() => {
    // 1. Productes
    const unsubProd = onSnapshot(collection(db, "productes"), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtrar NOMÉS els productes d'aquest client específic i actius
      const clientProds = prods.filter(p => 
        p.actiu !== false &&
        p.tipusCataleg === 'client_exclusiu' && 
        (
          (clientPortal.id && p.clientId === clientPortal.id) ||
          (clientPortal.slug && p.clientSlug === clientPortal.slug)
        )
      );
      setDbProducts(clientProds);
      setLoading(false);
      if (clientPortal.slug) {
        try {
          localStorage.setItem(`minimmon_client_prods_cache_${String(clientPortal.slug).toLowerCase().trim()}`, JSON.stringify(clientProds));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Error carregant productes del portal:", err);
      setLoading(false);
    });

    // 2. Gammes
    const unsubGam = onSnapshot(collection(db, "gammes"), (snapshot) => {
      setDbGammes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Escandalls
    const unsubEsc = onSnapshot(collection(db, "producc_escandalls"), (snapshot) => {
      setDbEscandalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProd();
      unsubGam();
      unsubEsc();
    };
  }, [clientPortal.id, clientPortal.slug]);

  // Obtenir les gammes d'aquest client (definides a Firestore + presents als seus productes)
  const availableGammes = useMemo(() => {
    // 1. Gammes registrades a la base de dades exclusives per a aquest client
    const registeredGammes = (dbGammes || [])
      .filter(g => 
        g.actiu !== false && 
        g.tipus === 'client_exclusiu' && 
        (
          (clientPortal.id && g.clientId === clientPortal.id) ||
          (clientPortal.slug && g.clientSlug === clientPortal.slug)
        )
      )
      .sort((a, b) => Number(a.ordre || 1) - Number(b.ordre || 1))
      .map(g => (g.nom || '').trim())
      .filter(Boolean);

    // 2. Gammes assignades als productes d'aquest client
    const fromProds = new Set();
    dbProducts.forEach(p => {
      if (Array.isArray(p.gammaIds)) {
        p.gammaIds.forEach(g => {
          if (g && typeof g === 'string') fromProds.add(g.trim());
        });
      } else if (p.gammaNom || p.gamma) {
        fromProds.add(String(p.gammaNom || p.gamma).trim());
      }
    });

    // Unir mantenint la prioritat d'ordre configurat pel client
    const combined = [...registeredGammes];
    fromProds.forEach(g => {
      if (!combined.some(c => c.toLowerCase() === g.toLowerCase())) {
        combined.push(g);
      }
    });

    return combined;
  }, [dbGammes, dbProducts, clientPortal.id, clientPortal.slug]);

  // Filtrar productes per gamma i per cerca
  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => {
      // Filtre per gamma
      if (selectedGamma !== 'Tots') {
        const prodGams = Array.isArray(p.gammaIds) 
          ? p.gammaIds.map(g => String(g).toLowerCase().trim()) 
          : [String(p.gammaNom || p.gamma || '').toLowerCase().trim()];
        const selLower = selectedGamma.toLowerCase().trim();
        if (!prodGams.includes(selLower)) return false;
      }

      // Filtre per cerca de text
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNom = String(p.nom || '').toLowerCase().includes(q);
        const matchDesc = String(p.descripcio || '').toLowerCase().includes(q);
        const matchCodi = String(p.codi || '').toLowerCase().includes(q);
        return matchNom || matchDesc || matchCodi;
      }

      return true;
    }).sort((a, b) => (Number(a.ordre || 1) - Number(b.ordre || 1)));
  }, [dbProducts, selectedGamma, searchQuery]);

  // Comptador total d'articles a la cistella
  const cartCount = totalItems !== undefined
    ? totalItems
    : (cart || []).reduce((acc, item) => acc + (item.quantitat || item.quantity || 1), 0);

  // Etiquetes editables i opcionals de la capçalera i del banner
  const headerLogoSubtitle = clientPortal.etiquetaLogo !== undefined
    ? String(clientPortal.etiquetaLogo).trim()
    : 'Col·lecció Exclusiva';

  const bannerTopBadge = clientPortal.etiquetaSuperior !== undefined
    ? String(clientPortal.etiquetaSuperior).trim()
    : 'Fusta de til·ler seleccionada & precisió làser · Artesania Mínim Món';

  const bannerMainTitle = clientPortal.titolCapcalera !== undefined
    ? String(clientPortal.titolCapcalera).trim()
    : String(clientPortal.nomComercial || '').trim();

  const bannerSubtitle = String(clientPortal.subtitolCapcalera || '').trim();
  const bannerDescription = String(clientPortal.descripcioCapcalera || '').trim();

  const infoComandaTitle = clientPortal.titolInfoComanda !== undefined
    ? String(clientPortal.titolInfoComanda).trim()
    : (clientPortal.nomComercial ? `Tramitació directa amb ${clientPortal.nomComercial}:` : '');
  const infoComandaText = String(clientPortal.infoComanda || '').trim();
  const hasInfoComandaBox = Boolean(infoComandaTitle || infoComandaText);

  const hasHeroContent = Boolean(
    bannerTopBadge || bannerMainTitle || bannerSubtitle || bannerDescription || hasInfoComandaBox
  );

  // Configuració del Peu de Pàgina (editable i opcional)
  const footerMainText = String(clientPortal.peuContingut || '').trim();
  const footerColumns = [
    { titol: String(clientPortal.peuCol1Titol || '').trim(), text: String(clientPortal.peuCol1Text || '').trim() },
    { titol: String(clientPortal.peuCol2Titol || '').trim(), text: String(clientPortal.peuCol2Text || '').trim() },
    { titol: String(clientPortal.peuCol3Titol || '').trim(), text: String(clientPortal.peuCol3Text || '').trim() }
  ].filter(c => c.titol || c.text);

  const footerCopyright = clientPortal.peuCopyright !== undefined
    ? String(clientPortal.peuCopyright).trim()
    : `© ${new Date().getFullYear()} ${clientPortal.nomComercial || ''}${headerLogoSubtitle ? ` · ${headerLogoSubtitle}` : ''}`;

  const footerCredit = clientPortal.peuCredit !== undefined
    ? String(clientPortal.peuCredit).trim()
    : 'Artesania en fusta de til·ler per Mínim Món';

  return (
    <div 
      className="min-h-screen transition-colors flex flex-col font-sans"
      style={{
        backgroundColor: surfaceColor,
        '--portal-primary': primaryColor,
        '--portal-container': containerColor,
        '--portal-accent': accentColor,
        '--portal-surface': surfaceColor
      }}
    >
      {/* CAPÇALERA SUPERIOR CORPORATIVA DEL CLIENT */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline/15 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo i Nom del Client */}
          <div className="flex items-center gap-3.5 min-w-0">
            {clientPortal.logoUrl ? (
              <div className="h-12 max-w-[160px] sm:max-w-[220px] flex items-center justify-start overflow-hidden shrink-0">
                <img 
                  src={resolveClientLogoUrl(clientPortal.logoUrl)} 
                  alt={clientPortal.nomComercial} 
                  className="max-h-12 w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 notranslate"
                style={{ backgroundColor: primaryColor }}
                translate="no"
              >
                {(clientPortal.nomComercial || 'C').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="truncate">
              <h1 
                className="font-serif text-lg sm:text-xl font-bold tracking-tight truncate notranslate" 
                style={{ color: primaryColor }}
                translate="no"
              >
                {clientPortal.nomComercial}
              </h1>
              {headerLogoSubtitle && (
                <p className="text-[11px] text-on-surface-variant font-mono truncate">
                  {renderProtectedClientText(headerLogoSubtitle, clientPortal.nomComercial)}
                </p>
              )}
            </div>
          </div>

          {/* Selector d'Idiomes (ES, CA, EN, FR), Dades de Contacte i Botó Comanda */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {clientPortal.emailContacte && (
              <a
                href={`mailto:${clientPortal.emailContacte}`}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                title="Contactar amb la marca per correu"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[140px]">{clientPortal.emailContacte}</span>
              </a>
            )}

            {clientPortal.telefonContacte && (
              <a
                href={`tel:${clientPortal.telefonContacte}`}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                title="Trucar o escriure"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{clientPortal.telefonContacte}</span>
              </a>
            )}

            {/* Selector d'Idiomes (ES, CA, EN, FR) */}
            <div 
              className="flex items-center bg-surface-container/80 border border-outline/20 rounded-xl p-1 gap-0.5 shadow-2xs notranslate"
              translate="no"
              aria-label="Selector d'idioma"
            >
              <Globe className="w-3.5 h-3.5 text-on-surface-variant ml-1.5 mr-0.5 hidden sm:block shrink-0" />
              {PORTAL_LANGUAGES.map((l) => {
                const isActive = lang === l;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLanguageChange(l)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer notranslate ${
                      isActive
                        ? 'text-white shadow-2xs'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface/60'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                    translate="no"
                    title={`Canviar idioma a ${l}`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {/* Botó Cistella / Pressupost */}
            <button
              onClick={() => openCart ? openCart() : setIsDrawerOpen(true)}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
              title="Veure la comanda / pressupost"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Comanda</span>
              {cartCount > 0 && (
                <span 
                  className="px-2 py-0.5 text-[11px] rounded-full font-bold shadow-2xs"
                  style={{ backgroundColor: accentColor, color: '#ffffff' }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* BANNER / HERO DE BENVINGUDA PERSONALITZAT (Totes les etiquetes són editables i opcionals) */}
      {hasHeroContent && (
        <section className="relative overflow-hidden py-10 md:py-14 border-b border-outline/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            
            {/* Píndola / Etiqueta Superior (Editable i Opcional) */}
            {bannerTopBadge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs border border-outline/15 bg-surface-container/60 text-on-surface-variant">
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                <span>{renderProtectedClientText(bannerTopBadge, clientPortal.nomComercial)}</span>
              </div>
            )}

            {/* Títol Principal (Editable i Opcional) */}
            {bannerMainTitle && (
              <h2 
                className={`font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance ${
                  bannerMainTitle.toLowerCase() === String(clientPortal.nomComercial || '').trim().toLowerCase() ? 'notranslate' : ''
                }`}
                style={{ color: primaryColor }}
                translate={bannerMainTitle.toLowerCase() === String(clientPortal.nomComercial || '').trim().toLowerCase() ? 'no' : undefined}
              >
                {renderProtectedClientText(bannerMainTitle, clientPortal.nomComercial)}
              </h2>
            )}

            {/* Subtítol (Editable i Opcional) */}
            {bannerSubtitle && (
              <p className="font-serif text-lg sm:text-xl text-on-surface-variant italic max-w-2xl mx-auto">
                {renderProtectedClientText(bannerSubtitle, clientPortal.nomComercial)}
              </p>
            )}

            {/* Descripció o Missatge de Benvinguda (Editable i Opcional) */}
            {bannerDescription && (
              <p className="text-sm text-on-surface-variant max-w-2xl mx-auto leading-relaxed pt-1 whitespace-pre-line">
                {renderProtectedClientText(bannerDescription, clientPortal.nomComercial)}
              </p>
            )}

            {/* Caixetí d'Informació de Tramitació / Enviament i Pagament del Client (Editable i Opcional) */}
            {hasInfoComandaBox && (
              <div className="pt-3 max-w-xl mx-auto">
                <div 
                  className="p-3.5 rounded-2xl border text-xs text-left flex items-start gap-2.5 shadow-2xs"
                  style={{ backgroundColor: containerColor, borderColor: `${primaryColor}25` }}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                  <div className="space-y-0.5">
                    {infoComandaTitle && (
                      <span className="font-bold block" style={{ color: primaryColor }}>
                        {renderProtectedClientText(infoComandaTitle, clientPortal.nomComercial)}
                      </span>
                    )}
                    {infoComandaText && (
                      <span className="text-on-surface-variant leading-snug block whitespace-pre-line">
                        {renderProtectedClientText(infoComandaText, clientPortal.nomComercial)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CONTINGUT PRINCIPAL: FILTRES DE GAMMES I PRODUCTES */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 w-full space-y-8">
        
        {/* BARRA DE CATEGORIES (= GAMMES) I CERCA */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-outline/15 shadow-xs">
          
          {/* Píndoles de Gammes */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedGamma('Tots')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                selectedGamma === 'Tots' 
                  ? 'text-white' 
                  : 'bg-surface-container text-on-surface-variant hover:text-primary'
              }`}
              style={selectedGamma === 'Tots' ? { backgroundColor: primaryColor } : {}}
            >
              Tots els productes ({dbProducts.length})
            </button>

            {availableGammes.map(gamName => {
              const isSelected = selectedGamma.toLowerCase() === gamName.toLowerCase();
              const count = dbProducts.filter(p => {
                const gams = Array.isArray(p.gammaIds) 
                  ? p.gammaIds.map(g => String(g).toLowerCase().trim()) 
                  : [String(p.gammaNom || p.gamma || '').toLowerCase().trim()];
                return gams.includes(gamName.toLowerCase().trim());
              }).length;

              return (
                <button
                  key={gamName}
                  onClick={() => setSelectedGamma(gamName)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    isSelected 
                      ? 'text-white' 
                      : 'bg-surface-container text-on-surface-variant hover:text-primary'
                  }`}
                  style={isSelected ? { backgroundColor: primaryColor } : {}}
                >
                  {gamName} ({count})
                </button>
              );
            })}
          </div>

          {/* Cercador ràpid */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Cercar en aquesta col·lecció..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-outline/25 text-xs text-primary focus:border-primary outline-none shadow-2xs"
            />
            <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-outline hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LLISTA DE PRODUCTES DEL CLIENT (Ample complet) */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-outline/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-on-surface-variant font-mono">Carregant la col·lecció exclusiva...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 bg-surface-container-lowest rounded-3xl border border-outline/15 text-center p-8 space-y-3 max-w-lg mx-auto">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-primary">Cap producte disponible en aquesta selecció</h3>
            <p className="text-xs text-on-surface-variant">
              {searchQuery 
                ? 'No hi ha cap resultat que coincideixi amb la cerca. Prova d\'esborrar el filtre de cerca.' 
                : 'Aquest client encara no té peces visibles en aquesta gamma.'}
            </p>
            {selectedGamma !== 'Tots' && (
              <button
                onClick={() => setSelectedGamma('Tots')}
                className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl text-white cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                Veure tots els productes
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedGamma={selectedGamma}
                dbGammes={dbGammes}
                dbEscandalls={dbEscandalls}
                onSelectImageModal={(url) => setSelectedModalImage(url)}
                onAddToCart={(cartItem) => {
                  // Afegir informació del client a l'article del carret per a traçabilitat
                  cartItem.clientPortalRef = {
                    id: clientPortal.id,
                    slug: clientPortal.slug,
                    nomComercial: clientPortal.nomComercial,
                    emailContacte: clientPortal.emailContacte,
                    telefonContacte: clientPortal.telefonContacte
                  };
                  addToCart(cartItem);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* PEU DE PÀGINA CONFIGURABLE DEL PORTAL DE CLIENT */}
      <footer className="mt-auto border-t border-outline/15 bg-surface-container/35 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          
          {/* Contingut superior o columnes del peu de pàgina (si se n'han definit) */}
          {(footerMainText || footerColumns.length > 0) && (
            <div className="space-y-6 pb-6 border-b border-outline/15">
              {footerMainText && (
                <div className="max-w-3xl text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {renderFormattedText(footerMainText)}
                </div>
              )}

              {footerColumns.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(footerColumns.length, 3)} gap-6 text-left`}>
                  {footerColumns.map((col, idx) => (
                    <div key={idx} className="space-y-2">
                      {col.titol && (
                        <h4 className="font-serif text-sm font-bold" style={{ color: primaryColor }}>
                          {col.titol}
                        </h4>
                      )}
                      {col.text && (
                        <div className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
                          {renderFormattedText(col.text)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Barra inferior del Peu de Pàgina */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {footerCopyright ? (
              <div className="flex items-center gap-2 font-mono text-[11px] text-center sm:text-left">
                <span>{renderProtectedClientText(footerCopyright, clientPortal.nomComercial)}</span>
              </div>
            ) : <div />}

            {footerCredit && (
              <div className="flex items-center gap-1.5 font-serif text-xs text-primary/80 text-center sm:text-right">
                <span>{renderProtectedClientText(footerCredit, clientPortal.nomComercial)}</span>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* MODAL ZOOM D'IMATGE GRAN */}
      {selectedModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out animate-fadeIn"
          onClick={() => setSelectedModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent">
            <button
              onClick={() => setSelectedModalImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedModalImage} 
              alt="Zoom Producte" 
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
