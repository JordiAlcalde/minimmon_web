import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { getCurrentLanguage, setLanguage } from '../utils/translator';

export default function Footer({ setActiveTab, onOpenLegal }) {
  const [lang, setLang] = useState(() => getCurrentLanguage());

  const handleLanguageChange = (l) => {
    setLang(l);
    setLanguage(l);
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full mt-auto bg-surface-container dark:bg-surface-container-high border-t border-outline/10 z-10 relative">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 mb-12 gap-8 md:gap-4">
          
          {/* Logo & Brand */}
          <div className="md:col-span-3 flex items-start">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => handleNavClick('inici')}
                className="focus:outline-none text-left cursor-pointer"
              >
                <img 
                  alt="Mínim Món de Jordi Alcalde" 
                  className="h-20 w-auto object-contain self-start hover:opacity-90 transition-opacity" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGngLecf7bJAQLVU44EVGD4A1jmiEWGg9rwtEolM1coBI0A8sycQF4egjnkoS-MYCZTFJIeDi7Qco5QdDc1EPMUgNn30fofQF648umsW7-JrySyVFyQVwnxopr4XulVSW2y8MbuE4xGe68pqbkXBP3nz6JIpC0wHFlG0n5VhWGH_YFKmyfvt-vXBvSXGEPD90A7n3A2x7E1alEYCipCslRThmjYGDYDrbanwkwfF3hg3IzwiUVkpSHxNxbHkBbsr4jpe0" 
                />
              </button>
              <div className="font-body-md text-on-surface-variant italic space-y-1">
                <p>Artesania en fusta</p>
                <p>Espais en miniatura</p>
              </div>
            </div>
          </div>

          {/* Idiomes */}
          <div className="md:col-span-2">
            <h3 className="font-headline-md text-primary mb-4 text-xl font-serif">Idiomes</h3>
            <ul className="space-y-2 font-body-md text-on-surface-variant">
              {['CA', 'ES', 'EN', 'FR'].map((l) => (
                <li key={l}>
                  <button 
                    onClick={() => handleLanguageChange(l)}
                    className={`${lang === l ? 'text-primary font-bold underline' : 'hover:text-primary'} transition-colors cursor-pointer notranslate`}
                    translate="no"
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Navegació */}
          <div className="md:col-span-2">
            <h3 className="font-headline-md text-primary mb-4 text-xl font-serif">Navegació</h3>
            <ul className="space-y-2 font-body-md text-on-surface-variant">
              <li>
                <button onClick={() => handleNavClick('inici')} className="hover:text-primary transition-colors cursor-pointer text-left">
                  Univers <span className="notranslate" translate="no">Mínim</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('mons')} className="hover:text-primary transition-colors cursor-pointer text-left">
                  <span className="notranslate" translate="no">Mínims Mons</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('regals')} className="hover:text-primary transition-colors cursor-pointer text-left">
                  Obsequis
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('taller')} className="hover:text-primary transition-colors cursor-pointer text-left">
                  El taller
                </button>
              </li>
            </ul>
          </div>

          {/* Començar */}
          <div className="md:col-span-3">
            <h3 className="font-headline-md text-primary mb-4 text-xl font-serif">Començar</h3>
            <p className="font-body-md text-on-surface-variant">Encarrega una feina o</p>
            <button 
              onClick={() => handleNavClick('contacte')}
              className="text-primary font-medium underline hover:text-primary-container transition-colors cursor-pointer mt-1"
            >
              contacta amb nosaltres.
            </button>
          </div>

          {/* Contacte (Jordi Alcalde Casalta) */}
          <div className="md:col-span-2">
            <h3 className="font-headline-md text-primary mb-4 text-xl font-serif notranslate" translate="no">Jordi Alcalde</h3>
            <div className="space-y-1 font-body-md text-on-surface-variant">
              <p>
                <a className="hover:text-primary transition-colors" href="mailto:minimmon58@gmail.com">minimmon58@gmail.com</a>
              </p>
              <p>
                <a className="hover:text-primary transition-colors" href="tel:+34699592326">+34 699 592 326</a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-outline/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-body-md text-sm text-on-surface-variant flex flex-wrap items-center gap-1.5">
            <span>© 2026</span>
            <span className="notranslate" translate="no">Mínim Món</span>
            <span>de</span>
            <span className="notranslate" translate="no">Jordi Alcalde</span>
            <span>·</span>
            <span>Tots els drets reservats</span>
          </div>
          <div className="flex items-center space-x-6 font-body-md text-sm text-on-surface-variant">
            <button onClick={() => onOpenLegal('Avís legal')} className="hover:text-primary transition-colors cursor-pointer">
              Avís legal
            </button>
            <button onClick={() => onOpenLegal('Privacitat')} className="hover:text-primary transition-colors cursor-pointer">
              Privacitat
            </button>
            <button onClick={() => onOpenLegal('Cookies')} className="hover:text-primary transition-colors cursor-pointer">
              Cookies
            </button>

            {/* Accés Àrea Privada */}
            <button 
              onClick={() => handleNavClick('privat')} 
              className="hover:text-primary text-primary/80 font-medium transition-colors cursor-pointer flex items-center gap-1.5 pl-2 border-l border-outline/20"
              title="Accedir a l'Àrea Privada de Treball"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>PRIVAT</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
