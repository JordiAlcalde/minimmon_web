import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Upload, Trash2, Smartphone, Monitor } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUtils';
import VisualOptionCarousel from './common/VisualOptionCarousel';

// Els 17 models de marcs gravats disponibles a public/imatges/productes/
export const MARC_MODELS = [
  { id: 'diamants', nom: 'Diamants', fitxer: 'marc_diamants.png', imatge: 'imatges/productes/marc_diamants.png' },
  { id: 'dispersio', nom: 'Dispersió', fitxer: 'marc_dispersió.png', imatge: 'imatges/productes/marc_dispersió.png' },
  { id: 'flors', nom: 'Flors', fitxer: 'marc_flors.png', imatge: 'imatges/productes/marc_flors.png' },
  { id: 'fosc', nom: 'Fosc', fitxer: 'marc_fosc.png', imatge: 'imatges/productes/marc_fosc.png' },
  { id: 'fulles', nom: 'Fulles', fitxer: 'marc_fulles.png', imatge: 'imatges/productes/marc_fulles.png' },
  { id: 'fulletes', nom: 'Fulletes', fitxer: 'marc_fulletes.png', imatge: 'imatges/productes/marc_fulletes.png' },
  { id: 'natural', nom: 'Natural', fitxer: 'marc_natural.png', imatge: 'imatges/productes/marc_natural.png' },
  { id: 'onades', nom: 'Onades', fitxer: 'marc_onades.png', imatge: 'imatges/productes/marc_onades.png' },
  { id: 'organigrama', nom: 'Organigrama', fitxer: 'marc_organigrama.png', imatge: 'imatges/productes/marc_organigrama.png' },
  { id: 'palmera', nom: 'Palmera', fitxer: 'marc_palmera.png', imatge: 'imatges/productes/marc_palmera.png' },
  { id: 'parquet', nom: 'Parquet', fitxer: 'marc_parquet.png', imatge: 'imatges/productes/marc_parquet.png' },
  { id: 'pics', nom: 'Pics', fitxer: 'marc_pics.png', imatge: 'imatges/productes/marc_pics.png' },
  { id: 'psicodelia', nom: 'Psicodèlia', fitxer: 'marc_psicodelia.png', imatge: 'imatges/productes/marc_psicodelia.png' },
  { id: 'puntets', nom: 'Puntets', fitxer: 'marc_puntets.png', imatge: 'imatges/productes/marc_puntets.png' },
  { id: 'punts', nom: 'Punts', fitxer: 'marc_punts.png', imatge: 'imatges/productes/marc_punts.png' },
  { id: 'rusc', nom: 'Rusc', fitxer: 'marc_rusc.png', imatge: 'imatges/productes/marc_rusc.png' },
  { id: 'teulada', nom: 'Teulada', fitxer: 'marc_teulada.png', imatge: 'imatges/productes/marc_teulada.png' }
];

// Banc de fotografies reals d'exemple
export const SAMPLE_PHOTOS = [
  'imatges/Mirada_01.jpg',
  'imatges/Mirada_02.jpg',
  'imatges/Mirada_03.jpg',
  'imatges/Estètica Marta_01.jpg',
  'imatges/Estètica Marta_02.jpg',
  'imatges/Estètica Marta_07.jpg',
  'imatges/Orquestra_01.jpg',
  'imatges/Orquestra_02.jpg',
  'imatges/escacs_01.jpg',
  'imatges/escacs_02.jpg',
  'imatges/herboristeria_01.jpg',
  'imatges/herboristeria_02.jpg',
  'images/workshop.jpg',
  'images/world_library.jpg',
  'images/world_lighthouse.jpg'
];

export default function MarcSimulator({
  productNom = '',
  selectedOptions = {},
  setSelectedOptions = () => {},
  attachedFiles = {},
  setAttachedFiles = () => {}
}) {
  // Clau d'opció per al model de marc
  const optionKey = useMemo(() => {
    const existingKey = Object.keys(selectedOptions).find(k => {
      const lk = k.toLowerCase();
      return lk.includes('gravat') || lk.includes('dibuix') || lk.includes('model') || lk.includes('marc');
    });
    return existingKey || 'Model de gravat';
  }, [selectedOptions]);

  // Model de marc seleccionat
  const currentSelectedValue = selectedOptions[optionKey] || '';
  const currentModel = useMemo(() => {
    if (!currentSelectedValue) return MARC_MODELS[0];
    return MARC_MODELS.find(m => 
      m.nom.toLowerCase() === currentSelectedValue.toLowerCase() ||
      m.fitxer.toLowerCase() === currentSelectedValue.toLowerCase() ||
      m.id.toLowerCase() === currentSelectedValue.toLowerCase()
    ) || MARC_MODELS[0];
  }, [currentSelectedValue]);

  // Orientació: 'Vertical' o 'Horitzontal'
  const [orientation, setOrientation] = useState(() => selectedOptions['Orientació'] || 'Vertical');

  // Foto d'exemple aleatòria
  const [photoIndex, setPhotoIndex] = useState(() => Math.floor(Math.random() * SAMPLE_PHOTOS.length));
  
  // Foto personalitzada que l'usuari pot pujar per provar
  const [userCustomPhoto, setUserCustomPhoto] = useState(null);

  // Sincronitzar selecció inicial
  useEffect(() => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => {
        const next = { ...prev };
        let modified = false;
        if (!next[optionKey]) {
          next[optionKey] = MARC_MODELS[0].nom;
          modified = true;
        }
        if (!next['Orientació']) {
          next['Orientació'] = orientation;
          modified = true;
        }
        return modified ? next : prev;
      });
    }
  }, [optionKey, orientation]);

  // Canviar model de marc i triar una foto aleatòria nova
  const handleSelectModel = (model) => {
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        [optionKey]: model.nom
      }));
    }
    if (!userCustomPhoto) {
      setPhotoIndex(prevIdx => (prevIdx + 1 + Math.floor(Math.random() * (SAMPLE_PHOTOS.length - 1))) % SAMPLE_PHOTOS.length);
    }
  };

  // Commutar orientació Vertical / Horitzontal
  const handleToggleOrientation = () => {
    const nextOrient = orientation === 'Vertical' ? 'Horitzontal' : 'Vertical';
    setOrientation(nextOrient);
    if (setSelectedOptions) {
      setSelectedOptions(prev => ({
        ...prev,
        'Orientació': nextOrient
      }));
    }
  };

  // Botó per canviar manualment la foto d'exemple
  const handleShufflePhoto = () => {
    setUserCustomPhoto(null);
    setPhotoIndex(prevIdx => (prevIdx + 1) % SAMPLE_PHOTOS.length);
  };

  // Pujar foto pròpia de l'usuari
  const handleUploadUserPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUserCustomPhoto(ev.target.result);
      if (setAttachedFiles) {
        setAttachedFiles(prev => ({
          ...prev,
          'Foto per al marc': {
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            dataUrl: ev.target.result,
            isImage: true
          }
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUserPhoto = () => {
    setUserCustomPhoto(null);
    if (setAttachedFiles) {
      setAttachedFiles(prev => {
        const copy = { ...prev };
        delete copy['Foto per al marc'];
        return copy;
      });
    }
  };

  // URL de la imatge activa
  const currentPhotoUrl = userCustomPhoto || resolveMediaUrl(SAMPLE_PHOTOS[photoIndex]);
  const currentFrameOverlayUrl = resolveMediaUrl(currentModel.imatge);
  const isHorizontal = orientation === 'Horitzontal';

  return (
    <div className="space-y-3 my-3">
      {/* 1. Carrusel de Selecció de Models de Gravat */}
      <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline/15 shadow-xs space-y-2">
        <VisualOptionCarousel
          title="Dibuix que es grava al marc"
          subtitle="Desplaça't pel carrusel per triar el model de gravat que més t'agradi:"
          options={MARC_MODELS}
          selectedId={currentModel.nom}
          onSelect={handleSelectModel}
          itemWidth="w-22 sm:w-24"
          aspectRatio="aspect-[1/1.41]"
          showLabel={true}
        />
      </div>

      {/* 2. Simulador en Temps Real (mida ~2/3 de l'original, cantonades quadrades) */}
      <div className="relative w-full rounded-xl border border-primary/20 bg-gradient-to-b from-surface-container-lowest via-amber-950/5 to-surface-container-lowest p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden shadow-inner select-none animate-fadeIn">
        
        {/* Barra superior de controls i model actiu */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-outline/10 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold text-primary text-xs sm:text-sm">
              Model: <span className="text-amber-800 dark:text-amber-300 font-extrabold">{currentModel.nom}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Botó Orientació Vertical / Horitzontal */}
            <button
              type="button"
              onClick={handleToggleOrientation}
              className="px-2.5 py-1 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/25 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40"
              title={`Canviar a orientació ${isHorizontal ? 'vertical' : 'horitzontal'}`}
            >
              {isHorizontal ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Horitzontal</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Vertical</span>
                </>
              )}
            </button>

            {/* Botó Canviar foto d'exemple */}
            <button
              type="button"
              onClick={handleShufflePhoto}
              className="px-2.5 py-1 bg-surface hover:bg-surface-container text-primary rounded-lg border border-outline/25 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40"
              title="Mostrar una altra fotografia de mostra"
            >
              <RefreshCw className="w-3 h-3 text-primary shrink-0" />
              <span>Canviar foto d'exemple</span>
            </button>

            {/* Pujar foto pròpia */}
            {!userCustomPhoto ? (
              <label className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                <Upload className="w-3 h-3 text-primary shrink-0" />
                <span>Prova la teva foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadUserPhoto}
                  className="hidden"
                />
              </label>
            ) : (
              <button
                type="button"
                onClick={handleRemoveUserPhoto}
                className="px-2 py-1 bg-error-container/30 hover:bg-error-container text-error rounded-lg border border-error/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Tornar a les fotos d'exemple"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>Treure foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Marc Físic amb Cantonades Quadrades (rounded-none) i mida 2/3 */}
        <div className={`relative my-2 w-full transition-all duration-300 flex items-center justify-center ${
          isHorizontal 
            ? 'max-w-[280px] sm:max-w-[310px] aspect-[646/457]' 
            : 'max-w-[200px] sm:max-w-[225px] aspect-[457/646]'
        }`}>
          
          <div className="relative w-full h-full rounded-none overflow-hidden shadow-xl border border-amber-950/30 bg-amber-100/30 dark:bg-amber-950/20">
            
            {/* Capa 1: Fotografia (de mostra o de l'usuari) adaptada a tota la superfície del marc sense franges negres */}
            <div className="absolute inset-0 z-10 rounded-none overflow-hidden flex items-center justify-center">
              {currentPhotoUrl ? (
                <img
                  key={currentPhotoUrl + (isHorizontal ? '-h' : '-v')}
                  src={currentPhotoUrl}
                  alt="Fotografia emmarcada"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className="text-xs text-on-surface-variant/70 font-mono text-center p-2">
                  Fotografia
                </div>
              )}
            </div>

            {/* Capa 2: Marc de Fusta Gravat (marc_xxxxx.png amb centre transparent) */}
            {isHorizontal ? (
              /* En horitzontal: el marc es gira 90 graus per encaixar de forma exacta */
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden">
                <img
                  key={currentFrameOverlayUrl + '-horiz'}
                  src={currentFrameOverlayUrl}
                  alt={`Gravat ${currentModel.nom}`}
                  className="max-w-none max-h-none object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(43,24,13,0.35)] rotate-90 origin-center"
                  style={{
                    width: '70.743%',
                    height: '141.357%'
                  }}
                />
              </div>
            ) : (
              /* En vertical: el marc s'ajusta directament a la mida completa */
              <img
                key={currentFrameOverlayUrl + '-vert'}
                src={currentFrameOverlayUrl}
                alt={`Gravat ${currentModel.nom}`}
                className="absolute inset-0 w-full h-full object-fill z-30 pointer-events-none drop-shadow-[0_1px_2px_rgba(43,24,13,0.35)]"
              />
            )}

            {/* Capa 3: Marc exterior i relleu net amb cantonades quadrades */}
            <div className="absolute inset-0 z-40 pointer-events-none rounded-none border border-black/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.3)]" />

          </div>
        </div>

      </div>
    </div>
  );
}
