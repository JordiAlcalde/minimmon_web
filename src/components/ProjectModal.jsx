import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Film, Sparkles, X, Maximize2 } from 'lucide-react';
import { resolveMediaUrl, formatVideoEmbedUrl, formatDateDDMMAAAA } from '../utils/mediaUtils';
import VideoPlayer from './VideoPlayer';

export default function ProjectModal({ project, onClose, setActiveTab }) {
  if (!project) return null;

  // Extract properties with fallbacks
  const title = project.titol || project.title || 'Projecte sense títol';
  const subtitle = project.subtitol || project.subtitle || '';
  const displayBranques = Array.isArray(project.branques) && project.branques.length > 0 ? project.branques : [project.branca || project.category || 'Món Mínim'];
  const dataCreacio = project.dataCreacio || project.data || '';
  const encarrec = project.encarrec || project.description || '';
  const art = project.art || '';
  const resolucio = project.resolucio || '';
  const detalls = project.detalls || '';
  const videoUrl = formatVideoEmbedUrl(project.video || '');
  const videoTitle = project.titolVideo || project.videoTitle || 'Vídeo del Procés';

  // Process media list
  let mediaList = [];
  if (Array.isArray(project.media) && project.media.length > 0) {
    mediaList = project.media
      .filter(m => m.activa !== false && m.imatge)
      .map(m => ({ ...m, imatge: resolveMediaUrl(m.imatge) }))
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  } else if (project.image) {
    mediaList = [{ id: '1', imatge: resolveMediaUrl(project.image), principal: true, ordre: 1 }];
  }

  // Find header image
  const headerMedia = mediaList.find(m => m.principal) || mediaList[0] || { imatge: resolveMediaUrl(project.image) };

  // Carousel, AutoPlay & Dynamic Aspect Ratio state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({});
  const [lightboxImg, setLightboxImg] = useState(null);

  // AutoPlay timer (4 seconds per slide)
  useEffect(() => {
    if (!isAutoPlay || mediaList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mediaList.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlay, mediaList.length]);

  const handleImageLoad = (idx, e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      const isVertical = naturalHeight > naturalWidth * 1.05;
      setImageDimensions(prev => ({
        ...prev,
        [idx]: { width: naturalWidth, height: naturalHeight, isVertical }
      }));
    }
  };

  const nextSlide = () => {
    if (mediaList.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % mediaList.length);
    }
  };

  const prevSlide = () => {
    if (mediaList.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + mediaList.length) % mediaList.length);
    }
  };

  const currentDim = imageDimensions[currentSlide];
  const isCurrentVertical = currentDim?.isVertical === true;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-surface border border-outline/20 rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-surface-container/90 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors cursor-pointer shadow-md border border-outline/20"
          aria-label="Tancar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Image (Hero) */}
        <div className="relative h-72 md:h-[420px] w-full overflow-hidden bg-primary-container shrink-0">
          <img src={headerMedia.imatge} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent flex flex-col justify-end p-6 md:p-10">
            <div className="flex flex-wrap gap-2 mb-3">
              {displayBranques.map((bName, idx) => (
                <span key={idx} className="px-3 py-1 bg-surface/30 backdrop-blur-md rounded text-xs text-primary font-mono uppercase tracking-wider font-semibold border border-primary/20">
                  {bName}
                </span>
              ))}
            </div>
            <h2 className="font-serif text-3xl md:text-5xl text-primary font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="text-on-surface-variant text-base md:text-lg mt-2 max-w-2xl">{subtitle}</p>}
          </div>
        </div>

        {/* Modal Content Sections */}
        <div className="p-6 md:p-10 space-y-10">

          {/* 1. L'encàrrec */}
          {encarrec && (
            <div className="space-y-2 border-l-2 border-primary/40 pl-4 md:pl-6">
              <h3 className="font-serif text-xl md:text-2xl text-primary font-semibold">L'encàrrec</h3>
              <p className="text-on-surface-variant leading-relaxed text-body-md whitespace-pre-line">{encarrec}</p>
            </div>
          )}

          {/* 2. Traducció artística */}
          {art && (
            <div className="space-y-2 border-l-2 border-primary/40 pl-4 md:pl-6">
              <h3 className="font-serif text-xl md:text-2xl text-primary font-semibold">Traducció artística</h3>
              <p className="text-on-surface-variant leading-relaxed text-body-md whitespace-pre-line">{art}</p>
            </div>
          )}

          {/* 3. Resolució */}
          {resolucio && (
            <div className="space-y-2 border-l-2 border-primary/40 pl-4 md:pl-6">
              <h3 className="font-serif text-xl md:text-2xl text-primary font-semibold">Resolució</h3>
              <p className="text-on-surface-variant leading-relaxed text-body-md whitespace-pre-line">{resolucio}</p>
            </div>
          )}

          {/* 4. Detalls Tècnics i Data de creació */}
          {(detalls || dataCreacio) && (
            <div className="bg-surface-container p-6 rounded-lg border border-outline/15 space-y-3">
              {detalls && (
                <>
                  <h3 className="font-serif text-lg text-primary font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Detalls tècnics</span>
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">{detalls}</p>
                </>
              )}
              {dataCreacio && (
                <div className={`${detalls ? 'pt-3 border-t border-outline/15' : ''} text-xs text-on-surface-variant flex items-center gap-2 font-mono`}>
                  <span className="font-semibold uppercase tracking-wider text-primary">Data de creació:</span>
                  <span>{formatDateDDMMAAAA(dataCreacio)}</span>
                </div>
              )}
            </div>
          )}

          {/* 5. Secció de Vídeo (Només si existeix URL de vídeo) */}
          {project.video && (
            <div className="space-y-3 pt-4 border-t border-outline/15">
              <h3 className="font-serif text-xl text-primary font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                <span>{videoTitle}</span>
              </h3>
              <VideoPlayer url={project.video} title={videoTitle} />
            </div>
          )}

          {/* 6. Carrusel d'imatges Adaptatiu amb Fade i AutoPlay */}
          {mediaList.length > 1 && (
            <div className="space-y-4 pt-4 border-t border-outline/15">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-serif text-xl text-primary font-semibold">Galeria d'Imatges</h3>
                
                <div className="flex items-center gap-3">
                  {/* AutoPlay Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAutoPlay 
                        ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30' 
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline/20'
                    }`}
                    title={isAutoPlay ? "Pausar la reproducció automàtica" : "Activar la reproducció automàtica (AutoPlay)"}
                  >
                    {isAutoPlay ? (
                      <>
                        <Pause className="w-3.5 h-3.5 animate-pulse" />
                        <span>AutoPlay Actiu</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>AutoPlay</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs text-on-surface-variant font-mono">{currentSlide + 1} / {mediaList.length}</span>
                </div>
              </div>

              {/* Slider Display with Dynamic Height, Soft Fade Transition & Ambient Frame */}
              <div 
                className={`relative w-full rounded-lg overflow-hidden bg-surface-container/60 border border-outline/15 group shadow-md transition-all duration-500 ease-in-out flex items-center justify-center ${
                  isCurrentVertical 
                    ? 'h-[500px] md:h-[580px]' 
                    : 'h-[360px] md:h-[460px]'
                }`}
              >
                {/* Stacked Slide Images for True Serene Crossfade Transition (1000ms) */}
                {mediaList.map((m, idx) => {
                  const isSelected = currentSlide === idx;
                  return (
                    <img 
                      key={m.imatge || idx}
                      src={m.imatge} 
                      alt={`${title} - imatge ${idx + 1}`} 
                      onLoad={(e) => handleImageLoad(idx, e)}
                      onClick={() => setLightboxImg(m.imatge)}
                      className={`absolute inset-0 max-w-full max-h-full object-contain mx-auto my-auto cursor-zoom-in transition-opacity duration-1000 ease-in-out ${
                        isSelected 
                          ? 'opacity-100 z-10 pointer-events-auto' 
                          : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    />
                  );
                })}

                {/* Lightbox / Zoom Button */}
                <button
                  onClick={() => setLightboxImg(mediaList[currentSlide].imatge)}
                  className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow"
                  title="Ampliar imatge a pantalla completa"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Navigation Arrows */}
                <button 
                  onClick={prevSlide} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-primary transition-colors cursor-pointer shadow"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={nextSlide} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-primary transition-colors cursor-pointer shadow"
                  aria-label="Següent"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`relative w-20 h-14 rounded overflow-hidden shrink-0 border-2 transition-all cursor-pointer bg-surface-container flex items-center justify-center ${
                      currentSlide === idx ? 'border-primary scale-105 shadow' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={m.imatge} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. Peu de Fitxa (CTA) */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
              <h4 className="font-serif text-xl text-primary font-semibold">T'inspira aquesta peça?</h4>
              <p className="text-on-surface-variant text-sm mt-1">
                Podem crear un <span className="notranslate" translate="no">Món Mínim</span> basat en el teu espai o memòria personal.
              </p>
            </div>
            <button 
              onClick={() => { onClose(); setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="bg-primary text-on-primary px-8 py-3.5 rounded-DEFAULT font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer whitespace-nowrap"
            >
              Contacta amb en <span className="notranslate" translate="no">Jordi</span>
            </button>
          </div>

        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImg(null);
          }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImg(null);
            }}
            className="absolute top-4 right-4 text-white bg-surface-container/30 hover:bg-primary p-2.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImg} 
            alt="Vista ampliada" 
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[92vh] object-contain rounded shadow-2xl cursor-default"
          />
        </div>
      )}
    </div>
  );
}
