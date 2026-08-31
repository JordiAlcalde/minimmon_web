import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';

/**
 * Component Universal de Carrusel Visual per a selecció d'opcions
 * Reutilitzable per a marcs, clauers, siluetes, patrons, etc.
 * 
 * @param {Array} options - Llista d'opcions: [{ id, nom, imatge, fitxer, preu, descripcio }]
 * @param {string} selectedId - ID o nom de l'opció activa
 * @param {Function} onSelect - Callback en clicar una opció: (option) => void
 * @param {string} title - Títol opcional del bloc
 * @param {string} subtitle - Subtítol opcional
 * @param {string} itemWidth - Classe d'amplada per targeta (default: 'w-24 sm:w-28')
 * @param {string} aspectRatio - Aspect ratio de la miniatura (default: 'aspect-[1/1.41]')
 * @param {boolean} showLabel - Si es mostra el nom del gravat sota la imatge (default: true)
 */
export default function VisualOptionCarousel({
  options = [],
  selectedId = '',
  onSelect = () => {},
  title = '',
  subtitle = '',
  itemWidth = 'w-24 sm:w-28',
  aspectRatio = 'aspect-[1/1.41]',
  showLabel = true,
  className = ''
}) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability, { passive: true });
      window.addEventListener('resize', checkScrollability);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [options]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = Math.max(220, container.clientWidth * 0.65);
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Scroll automàtic per centrar l'element actiu si canvia
  const scrollToActiveItem = (idx) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const items = container.querySelectorAll('[data-carousel-item]');
    if (items[idx]) {
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Capçalera del selector */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            {title && (
              <h4 className="text-xs font-bold text-primary font-mono flex items-center gap-1.5">
                <span>{title}</span>
                <span className="text-[10px] font-normal text-on-surface-variant/80">({options.length} disponibles)</span>
              </h4>
            )}
            {subtitle && (
              <p className="text-[11px] text-on-surface-variant font-sans">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Contenidor del carrusel amb botons de fletxa */}
      <div className="relative group/carousel">
        {/* Botó Fletxa Esquerra */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-surface/95 dark:bg-surface-container-high/95 text-primary border border-outline/30 shadow-md flex items-center justify-center hover:scale-110 hover:bg-primary hover:text-on-primary transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Desplaçar a l'esquerra"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* Llista Horitzontal Lliscant */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-2.5 overflow-x-auto scrollbar-none py-1.5 px-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.id === selectedId || opt.nom === selectedId || opt.fitxer === selectedId;
            const resolvedImg = resolveMediaUrl(opt.imatge || opt.fitxer || '');

            return (
              <div
                key={opt.id || idx}
                data-carousel-item
                onClick={() => {
                  onSelect(opt);
                  scrollToActiveItem(idx);
                }}
                className={`${itemWidth} shrink-0 snap-start rounded-xl border transition-all duration-200 cursor-pointer p-1.5 flex flex-col items-center justify-between text-center relative group ${
                  isSelected
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm scale-[1.02]'
                    : 'bg-surface hover:bg-surface-container border-outline/20 hover:border-primary/40 shadow-2xs hover:scale-[1.01]'
                }`}
                title={`Seleccionar ${opt.nom}`}
              >
                {/* Badge de Seleccionat */}
                {isSelected && (
                  <div className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}

                {/* Miniatura de la imatge / gravat */}
                <div className={`w-full ${aspectRatio} rounded-lg overflow-hidden relative flex items-center justify-center bg-stone-100 dark:bg-stone-800/50 p-1 border border-outline/10`}>
                  {resolvedImg ? (
                    <img
                      src={resolvedImg}
                      alt={opt.nom || `Opció ${idx + 1}`}
                      className="w-full h-full object-contain relative z-2 transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-[10px] text-on-surface-variant font-mono">Sense imatge</div>
                  )}
                </div>

                {/* Nom del gravat sota la imatge */}
                {showLabel && (
                  <div className="w-full mt-1.5 px-0.5">
                    <p className={`text-[11px] leading-tight truncate font-semibold ${
                      isSelected ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-primary'
                    }`}>
                      {opt.nom}
                    </p>
                    {opt.preu && Number(opt.preu) > 0 ? (
                      <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-bold block">
                        +{Number(opt.preu).toFixed(2).replace('.', ',')} €
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botó Fletxa Dreta */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-surface/95 dark:bg-surface-container-high/95 text-primary border border-outline/30 shadow-md flex items-center justify-center hover:scale-110 hover:bg-primary hover:text-on-primary transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Desplaçar a la dreta"
          >
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
