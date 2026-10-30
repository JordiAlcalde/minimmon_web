import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { 
  Building2, 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Mail, 
  Phone, 
  Info, 
  X, 
  Check, 
  ArrowLeft,
  Sun,
  Moon,
  ChevronRight,
  Package
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { ProductCard } from './RegalsCatalogSection';
import { DEFAULT_CLIENT_PALETTE, resolveClientLogoUrl } from '../utils/clientPortalsUtils';

export default function ClientPortalView({ clientPortal }) {
  const { cart, setIsCartOpen } = useBudget();
  const [dbProducts, setDbProducts] = useState([]);
  const [dbGammes, setDbGammes] = useState([]);
  const [dbEscandalls, setDbEscandalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGamma, setSelectedGamma] = useState('Tots');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModalImage, setSelectedModalImage] = useState(null);

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

  // Obtenir de manera dinàmica únicament les gammes presents als productes d'aquest client
  const availableGammes = useMemo(() => {
    const gammesSet = new Set();
    dbProducts.forEach(p => {
      if (Array.isArray(p.gammaIds)) {
        p.gammaIds.forEach(g => {
          if (g && typeof g === 'string') gammesSet.add(g.trim());
        });
      } else if (p.gammaNom || p.gamma) {
        gammesSet.add(String(p.gammaNom || p.gamma).trim());
      }
    });

    return Array.from(gammesSet).sort();
  }, [dbProducts]);

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
  const cartCount = (cart || []).reduce((acc, item) => acc + (item.quantity || 1), 0);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo i Nom del Client */}
          <div className="flex items-center gap-3.5 min-w-0">
            {clientPortal.logoUrl ? (
              <div className="h-12 max-w-[180px] sm:max-w-[220px] flex items-center justify-start overflow-hidden">
                <img 
                  src={resolveClientLogoUrl(clientPortal.logoUrl)} 
                  alt={clientPortal.nomComercial} 
                  className="max-h-12 w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {(clientPortal.nomComercial || 'C').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="truncate">
              <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight truncate" style={{ color: primaryColor }}>
                {clientPortal.nomComercial}
              </h1>
              <p className="text-[11px] text-on-surface-variant font-mono truncate">
                Col·lecció Exclusiva
              </p>
            </div>
          </div>

          {/* Dades de Contacte ràpides i Botó Cistella */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {clientPortal.emailContacte && (
              <a
                href={`mailto:${clientPortal.emailContacte}`}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                title="Contactar amb la marca per correu"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[140px]">{clientPortal.emailContacte}</span>
              </a>
            )}

            {clientPortal.telefonContacte && (
              <a
                href={`tel:${clientPortal.telefonContacte}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                title="Trucar o escriure"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{clientPortal.telefonContacte}</span>
              </a>
            )}

            {/* Botó Cistella / Pressupost */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
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

      {/* BANNER / HERO DE BENVINGUDA PERSONALITZAT */}
      <section className="relative overflow-hidden py-10 md:py-14 border-b border-outline/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          
          {/* Segell Artesanal Mínim Món */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs border border-outline/15 bg-surface-container/60 text-on-surface-variant">
            <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Fusta de til·ler seleccionada & precisió làser · Artesania Mínim Món</span>
          </div>

          {/* Títol Principal Lliure */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance" style={{ color: primaryColor }}>
            {clientPortal.titolCapcalera || clientPortal.nomComercial}
          </h2>

          {/* Subtítol */}
          {clientPortal.subtitolCapcalera && (
            <p className="font-serif text-lg sm:text-xl text-on-surface-variant italic max-w-2xl mx-auto">
              {clientPortal.subtitolCapcalera}
            </p>
          )}

          {/* Descripció o Missatge de Benvinguda */}
          {clientPortal.descripcioCapcalera && (
            <p className="text-sm text-on-surface-variant max-w-2xl mx-auto leading-relaxed pt-1">
              {clientPortal.descripcioCapcalera}
            </p>
          )}

          {/* Caixetí d'Informació de Tramitació / Enviament i Pagament del Client */}
          {clientPortal.infoComanda && (
            <div className="pt-3 max-w-xl mx-auto">
              <div 
                className="p-3.5 rounded-2xl border text-xs text-left flex items-start gap-2.5 shadow-2xs"
                style={{ backgroundColor: containerColor, borderColor: `${primaryColor}25` }}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                <div className="space-y-0.5">
                  <span className="font-bold block" style={{ color: primaryColor }}>
                    Tramitació directa amb {clientPortal.nomComercial}:
                  </span>
                  <span className="text-on-surface-variant leading-snug block">
                    {clientPortal.infoComanda}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

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

        {/* GRAELLA DE PRODUCTES DEL CLIENT */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  // Si no té material definit, recordem sempre la fusta de til·ler
                  material: product.material || 'Fusta de til·ler seleccionada'
                }}
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
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* PEU DE PÀGINA ARTESANAL MÍNIM MÓN */}
      <footer className="mt-auto border-t border-outline/15 py-8 bg-surface-container/30 text-center text-xs text-on-surface-variant space-y-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>© {new Date().getFullYear()} {clientPortal.nomComercial}</span>
            <span>·</span>
            <span>Col·lecció Exclusiva</span>
          </div>

          <div className="flex items-center gap-1.5 font-serif text-xs text-primary/80">
            <span>Artesania en fusta de til·ler per</span>
            <strong className="font-semibold text-primary">Mínim Món</strong>
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
