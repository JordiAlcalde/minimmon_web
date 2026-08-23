import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag, Lock, Search, X, Boxes } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  catalogSearchQuery = '', 
  setCatalogSearchQuery = () => {} 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { totalItems, setIsDrawerOpen } = useBudget();

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/90 dark:bg-surface-dim/90 backdrop-blur-md border-b border-outline/15 transition-all duration-300">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center h-20">
        
        {/* Vista Mòbil: Quan la cerca està oberta, ocupa el 100% de la capçalera */}
        {isMobileSearchOpen ? (
          <div className="flex md:hidden items-center w-full gap-2.5 animate-fadeIn">
            <div className="flex-1 flex items-center bg-primary/10 border border-primary/30 rounded-full px-3.5 py-2 shadow-xs">
              <Search className="w-4 h-4 text-primary shrink-0 mr-2 opacity-75" />
              <input
                type="text"
                autoFocus
                placeholder="Cerca un regal o producte..."
                value={catalogSearchQuery}
                onChange={(e) => {
                  setCatalogSearchQuery(e.target.value);
                  if (activeTab !== 'regals') handleNavClick('regals');
                }}
                className="w-full bg-transparent text-sm text-primary font-body-md outline-none placeholder-primary/50"
              />
              {catalogSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCatalogSearchQuery('')}
                  className="p-1 hover:bg-primary/20 rounded-full text-primary transition-colors cursor-pointer shrink-0 mr-0.5"
                  title="Esborrar text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-full transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              Cancel·lar
            </button>
          </div>
        ) : (
          <>
            {/* Brand Logo */}
            <button 
              onClick={() => handleNavClick('inici')} 
              className="font-headline-md text-headline-md text-primary dark:text-primary-fixed flex items-center gap-2 cursor-pointer focus:outline-none text-left"
            >
              <img 
                alt="Mínim Món Logo" 
                className="h-12 w-auto object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAS8Jj-lMhj2YQ72t6WLkDSnqRoaVGgnJcBn1mFLA2dz2EbXCcs9lMmNJEzNqnPLgaQFbCFwYRuEyApwh8-QW8HnoTc93LaDdIoaaDu56EYaxyCzQQXCS5N9Ge6zVSpgg10WuYz5av2AKy8LDEC3rc0DMoEuOlnAy2jSCJuEPgLsZKrtQlS9qoL-sy8AQvR8vBKkHGZp1zvLiYEjWDbNE8PqRyExPu8HJUvtp89sPvvci3kmY0aLOuve1WHm7YE8NTqnLg" 
              />
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-6 lg:gap-10 items-center font-body-md text-[11px] lg:text-xs uppercase tracking-wider flex-grow justify-center">
              <button 
                onClick={() => handleNavClick('inici')}
                className={`relative py-1.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === 'inici'
                    ? 'text-primary dark:text-primary-fixed font-bold'
                    : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed font-medium'
                }`}
              >
                <span>UNIVERS MÍNIM</span>
                {activeTab === 'inici' && (
                  <span className="absolute -bottom-1 -left-3.5 -right-3.5 h-[5px] border-b-[2.5px] border-x-[2px] border-primary dark:border-primary-fixed rounded-b-lg animate-fadeIn" />
                )}
              </button>

              <button 
                onClick={() => handleNavClick('mons')}
                className={`relative py-1.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === 'mons'
                    ? 'text-primary dark:text-primary-fixed font-bold'
                    : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed font-medium'
                }`}
              >
                <span>MONS MÍNIMS</span>
                {activeTab === 'mons' && (
                  <span className="absolute -bottom-1 -left-3.5 -right-3.5 h-[5px] border-b-[2.5px] border-x-[2px] border-primary dark:border-primary-fixed rounded-b-lg animate-fadeIn" />
                )}
              </button>

              <button 
                onClick={() => handleNavClick('regals')}
                className={`relative py-1.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === 'regals'
                    ? 'text-primary dark:text-primary-fixed font-bold'
                    : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed font-medium'
                }`}
              >
                <span>CATÀLEG DE REGALS</span>
                {activeTab === 'regals' && (
                  <span className="absolute -bottom-1 -left-3.5 -right-3.5 h-[5px] border-b-[2.5px] border-x-[2px] border-primary dark:border-primary-fixed rounded-b-lg animate-fadeIn" />
                )}
              </button>

              <button 
                onClick={() => handleNavClick('taller')}
                className={`relative py-1.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === 'taller'
                    ? 'text-primary dark:text-primary-fixed font-bold'
                    : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed font-medium'
                }`}
              >
                <span>EL TALLER</span>
                {activeTab === 'taller' && (
                  <span className="absolute -bottom-1 -left-3.5 -right-3.5 h-[5px] border-b-[2.5px] border-x-[2px] border-primary dark:border-primary-fixed rounded-b-lg animate-fadeIn" />
                )}
              </button>

              <button 
                onClick={() => handleNavClick('contacte')}
                className={`relative py-1.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === 'contacte'
                    ? 'text-primary dark:text-primary-fixed font-bold'
                    : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed font-medium'
                }`}
              >
                <span>CONNECTAR</span>
                {activeTab === 'contacte' && (
                  <span className="absolute -bottom-1 -left-3.5 -right-3.5 h-[5px] border-b-[2.5px] border-x-[2px] border-primary dark:border-primary-fixed rounded-b-lg animate-fadeIn" />
                )}
              </button>

              {/* Grup de 3 Botons d'Acció (Lupa / Cistella / Privat) */}
              <div className="flex items-center gap-2 ml-3">
                
                {/* 1. Botó i Camp de Cerca Expansible Compacte (Lupa) */}
                {isSearchExpanded || catalogSearchQuery ? (
                  <div className="relative flex items-center bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1 w-36 sm:w-44 transition-all duration-300 shadow-xs">
                    <Search className="w-3.5 h-3.5 text-primary shrink-0 mr-1.5 opacity-70" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Cerca..."
                      value={catalogSearchQuery}
                      onChange={(e) => {
                        setCatalogSearchQuery(e.target.value);
                        if (activeTab !== 'regals') handleNavClick('regals');
                      }}
                      className="w-full bg-transparent text-xs text-primary font-sans outline-none placeholder-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="p-0.5 hover:bg-primary/20 rounded-full text-primary transition-colors cursor-pointer shrink-0 ml-1"
                      title="Esborrar cerca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchExpanded(true);
                      if (activeTab !== 'regals') handleNavClick('regals');
                    }}
                    className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer border border-primary/20 shadow-xs hover:shadow hover:scale-105"
                    title="Cerca de regals i productes"
                    aria-label="Cerca al catàleg"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                  </button>
                )}

                {/* 2. Botó Cistella de Pressupostos */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer border border-primary/20 shadow-xs hover:shadow hover:scale-105"
                  title="Cistella de Pressupostos"
                  aria-label="Cistella de Pressupostos"
                >
                  <img src="/images/icon-pressupost.png" alt="Cistella de Pressupostos" className="w-5 h-5 object-contain dark:brightness-0 dark:invert shrink-0" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-on-primary font-mono text-[10px] flex items-center justify-center font-bold shadow-xs">
                      {totalItems}
                    </span>
                  )}
                </button>

                {/* 3. Botó Àrea Privada (Candau) */}
                <button
                  type="button"
                  onClick={() => handleNavClick('privat')}
                  className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all cursor-pointer border shadow-xs hover:shadow hover:scale-105 ${
                    (activeTab === 'privat' || activeTab === 'privada')
                      ? 'bg-primary text-on-primary border-primary shadow-md' 
                      : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                  }`}
                  title="Accedir a l'Àrea Privada"
                  aria-label="Accedir a l'Àrea Privada"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                </button>

              </div>
            </div>

            {/* Mobile Actions: Lupa, Cistella, Menú */}
            <div className="flex items-center gap-2 text-primary dark:text-primary-fixed md:hidden">
              {/* Botó Lupa Mòbil */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchOpen(true);
                  if (activeTab !== 'regals') handleNavClick('regals');
                }}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer border border-primary/20 shadow-xs active:scale-95"
                title="Cerca de regals i productes"
                aria-label="Cerca al catàleg"
              >
                <Search className="w-4 h-4 shrink-0" />
              </button>

              {/* Mobile Budget Cart Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary transition-all cursor-pointer border border-primary/20 active:scale-95"
                title="Obrir Cistella de Pressupostos"
              >
                <img src="/images/icon-pressupost.png" alt="Cistella de Pressupostos" className="w-4 h-4 object-contain dark:brightness-0 dark:invert shrink-0" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-on-primary font-mono text-[9px] flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="cursor-pointer active:scale-95 transition-transform p-1.5 text-primary"
                aria-label="Menú de navegació"
              >
                <span className="material-symbols-outlined notranslate text-2xl" translate="no">{mobileMenuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container border-b border-outline/15 px-6 py-6 flex flex-col gap-4 shadow-lg animate-fadeIn">
          <button 
            onClick={() => handleNavClick('inici')}
            className={`text-left font-body-md text-lg uppercase tracking-wider py-2 ${activeTab === 'inici' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            Univers Mínim
          </button>
          <button 
            onClick={() => handleNavClick('mons')}
            className={`text-left font-body-md text-lg uppercase tracking-wider py-2 ${activeTab === 'mons' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            Mons Mínims
          </button>
          <button 
            onClick={() => handleNavClick('regals')}
            className={`text-left font-body-md text-lg uppercase tracking-wider py-2 ${activeTab === 'regals' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            Catàleg de Regals
          </button>
          <button 
            onClick={() => handleNavClick('taller')}
            className={`text-left font-body-md text-lg uppercase tracking-wider py-2 ${activeTab === 'taller' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            El Taller
          </button>
          <button 
            onClick={() => handleNavClick('contacte')}
            className={`text-left font-body-md text-lg uppercase tracking-wider py-2 ${activeTab === 'contacte' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            Connectar
          </button>
        </div>
      )}
    </nav>
  );
}
