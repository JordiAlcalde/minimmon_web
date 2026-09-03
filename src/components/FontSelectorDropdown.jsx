import React, { useState, useEffect, useRef } from 'react';
import { Type, ChevronDown, Check } from 'lucide-react';

export const AVAILABLE_FONTS = [
  {
    id: 'modernline',
    name: 'Modernline',
    label: 'Modernline (Manuscrita elegant)',
    fontFamily: "'Modernline', cursive, sans-serif",
    sample: 'Elisenda'
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    label: 'Playfair Display (Clàssica)',
    fontFamily: "'Playfair Display', Georgia, serif",
    sample: 'Abc'
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    label: 'Montserrat (Moderna)',
    fontFamily: "'Montserrat', sans-serif",
    sample: 'Abc'
  },
  {
    id: 'dancing',
    name: 'Dancing Script',
    label: 'Dancing Script (Cal·ligràfica)',
    fontFamily: "'Dancing Script', cursive",
    sample: 'Abc'
  },
  {
    id: 'caveat',
    name: 'Caveat',
    label: 'Caveat (Manuscrita)',
    fontFamily: "'Caveat', cursive",
    sample: 'Abc'
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    label: 'Cinzel (Monumental)',
    fontFamily: "'Cinzel', serif",
    sample: 'ABC'
  }
];

export default function FontSelectorDropdown({ selectedFontName, onSelectFont, className = '', align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentFontObj = AVAILABLE_FONTS.find(
    f => f.name === selectedFontName || f.id === selectedFontName
  ) || AVAILABLE_FONTS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignClass = align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-outline/25 hover:border-primary/50 rounded-xl text-xs font-mono text-primary transition-all cursor-pointer shadow-2xs"
        title="Triar tipografia de gravat"
      >
        <Type className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
        <span style={{ fontFamily: currentFontObj.fontFamily }} className="text-xs font-semibold truncate max-w-[95px] sm:max-w-[130px]">
          {currentFontObj.name}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-outline transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${alignClass} top-full mt-1.5 w-56 sm:w-60 max-w-[calc(100vw-2.5rem)] bg-surface border border-outline/20 rounded-2xl p-1.5 shadow-2xl z-50 space-y-1 animate-scaleIn backdrop-blur-md`}>
          <div className="px-2.5 py-1 text-[10px] uppercase font-mono font-bold text-on-surface-variant border-b border-outline/10 flex items-center justify-between">
            <span>Tipografia de Gravat</span>
            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold">{AVAILABLE_FONTS.length} estils</span>
          </div>
          {AVAILABLE_FONTS.map(f => {
            const isSelected = currentFontObj.id === f.id || currentFontObj.name === f.name;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onSelectFont(f.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold border border-amber-500/30'
                    : 'hover:bg-surface-container text-primary'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ fontFamily: f.fontFamily }}>
                    {f.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {f.label.split('(')[1]?.replace(')', '') || ''}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
