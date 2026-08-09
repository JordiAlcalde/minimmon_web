import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { ShoppingBag } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems, setIsDrawerOpen } = useBudget();

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/90 dark:bg-surface-dim/90 backdrop-blur-md border-b border-outline/15 transition-all duration-300">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center h-20">
        
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
        <div className="hidden md:flex gap-8 items-center font-body-md text-body-md uppercase tracking-wider flex-grow justify-center">
          <button 
            onClick={() => handleNavClick('inici')}
            className={`${activeTab === 'inici' ? 'text-primary dark:text-primary-fixed border-b-2 border-primary font-semibold' : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed'} pb-1 transition-colors duration-300 cursor-pointer active:scale-95 transition-transform`}
          >
            UNIVERS MÍNIM
          </button>

          <button 
            onClick={() => handleNavClick('mons')}
            className={`${activeTab === 'mons' ? 'text-primary dark:text-primary-fixed border-b-2 border-primary font-semibold' : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed'} pb-1 transition-colors duration-300 cursor-pointer active:scale-95 transition-transform`}
          >
            MÓNS MÍNIMS
          </button>

          <button 
            onClick={() => handleNavClick('regals')}
            className={`${activeTab === 'regals' ? 'text-primary dark:text-primary-fixed border-b-2 border-primary font-semibold' : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed'} pb-1 transition-colors duration-300 cursor-pointer active:scale-95 transition-transform`}
          >
            CATÀLEG DE REGALS
          </button>

          <button 
            onClick={() => handleNavClick('taller')}
            className={`${activeTab === 'taller' ? 'text-primary dark:text-primary-fixed border-b-2 border-primary font-semibold' : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed'} pb-1 transition-colors duration-300 cursor-pointer active:scale-95 transition-transform uppercase`}
          >
            EL TALLER
          </button>

          <button 
            onClick={() => handleNavClick('contacte')}
            className={`${activeTab === 'contacte' ? 'text-primary dark:text-primary-fixed border-b-2 border-primary font-semibold' : 'text-on-surface-variant dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed'} pb-1 transition-colors duration-300 cursor-pointer active:scale-95 transition-transform`}
          >
            COM ENCARREGAR
          </button>

          {/* Desktop Budget Cart Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-primary/20 ml-4 shadow-xs hover:shadow"
            title="Obrir Cistella de Pressupostos"
          >
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>Pressupost</span>
            {totalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-mono text-[10px] flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Menu & Budget Button */}
        <div className="flex items-center gap-3 text-primary dark:text-primary-fixed md:hidden">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary transition-all cursor-pointer border border-primary/20"
            title="Obrir Cistella de Pressupostos"
          >
            <ShoppingBag className="w-4 h-4 text-primary" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-on-primary font-mono text-[9px] flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer active:scale-95 transition-transform p-2 text-primary"
            aria-label="Menú de navegació"
          >
            <span className="material-symbols-outlined notranslate" translate="no">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
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
            Móns Mínims
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
            Com Encarregar / Contacte
          </button>
        </div>
      )}
    </nav>
  );
}
