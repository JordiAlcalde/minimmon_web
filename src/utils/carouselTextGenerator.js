/**
 * carouselTextGenerator.js
 * Generador intel·ligent i contextual de títols, subtítols i etiquetes
 * per a cada diapositiva d'un carrusel d'Instagram en funció de la imatge concreta
 * i del projecte o producte de Mínim Món.
 */

// Diccionari de patrons per a reconèixer elements comuns a les fotografies del taller
const IMAGE_KEYWORD_PATTERNS = [
  // Productes de catàleg i regals
  {
    regex: /marc|marcs|portafoto|portafotos|finestra|record|records|fotografia/i,
    title: "Records que donen calidesa",
    subtitle: "La fusta de til·ler abraça els teus moments més especials.",
    tag: "🪵 Fusta de til·ler"
  },
  {
    regex: /clauer|clauers|anella|clau|parella|inicial/i,
    title: "Portar qui estimes a prop",
    subtitle: "Lleugeresa, tacte suau de fusta polida i resistència al pas dels dies.",
    tag: "✨ Fet a mà"
  },
  {
    regex: /punt.*llibre|marcador|lectura|llibre|punts/i,
    title: "Entre les teves lectures",
    subtitle: "Fusta finíssima de til·ler amb calat d'alta precisió.",
    tag: "📖 Artesania"
  },
  {
    regex: /puzle|puzzle|trencaclosques|peces/i,
    title: "Peces amb memòria",
    subtitle: "Transformem els teus records en un puzle artesanal de fusta.",
    tag: "🧩 Fet a mida"
  },
  // Elements d'Atelier i diorames
  {
    regex: /calaixera|calaix|calaixos|herbes|calaixet/i,
    title: "Calaixera d'herbes",
    subtitle: "Peces minuciosament tallades i acoblades a mà en fusta de til·ler.",
    tag: "🌿 Detall d'Atelier"
  },
  {
    regex: /flasco|flascons|aroma|aromes|brossa|potes|ampolles/i,
    title: "Flascons i aromes",
    subtitle: "Rèpliques en miniatura que reten homenatge als oficis antics.",
    tag: "✨ Detall artesanal"
  },
  {
    regex: /mostrador|prestatge|prestatges|dispens|taulell/i,
    title: "Prestatges i mostrador",
    subtitle: "On es guarden i es dispensen els remeis amb calidesa d'altres temps.",
    tag: "🪵 Fusta de til·ler"
  },
  {
    regex: /facana|façana|exterior|carrer|entrada|portal|retol|ràtol/i,
    title: "Façana i presència",
    subtitle: "Relleu arquitectònic fidel que acull la memòria de l'espai.",
    tag: "🏛️ Arquitectura"
  },
  {
    regex: /escala|caragol|barana|balco|balcó/i,
    title: "Escala i volumetria",
    subtitle: "Geometria precisa tallada amb làser i polida suaument a mà.",
    tag: "📐 Precisió làser"
  },
  {
    regex: /gravat|marcatge|detall|detalls|zoom|macro|textura|veta/i,
    title: "Detalls i acabats",
    subtitle: "El valor del temps i el polit fi sobre el contraxapat de til·ler.",
    tag: "🪵 Vetes naturals"
  },
  {
    regex: /vidre|vidriera|portic|pòrtic/i,
    title: "Finestra artesanal",
    subtitle: "La llum entrant a través de les capes de fusta natural.",
    tag: "✨ Peça única"
  },
  {
    regex: /rellotge|esfera|agulles|pendul|pèndol/i,
    title: "Esfera i mecanisme",
    subtitle: "El pas del temps enregistrat amb calidesa i elegància.",
    tag: "🕰️ Artesania"
  },
  {
    regex: /capsa|caixa|cofre|tapa/i,
    title: "Capsa personalitzada",
    subtitle: "Un estoig elaborat expressament per guardar el que més estimes.",
    tag: "🎁 Fet a mida"
  },
  {
    regex: /taller|banc|eines|marcatge|proces|procés/i,
    title: "Al banc del taller",
    subtitle: "La màgia de veure com la fusta de til·ler pren vida volumètrica.",
    tag: "🔨 Taller Mínim Món"
  }
];

/**
 * Neteja un nom de fitxer o URL per extreure un nom humanitzat net.
 * Retorna cadena buida si l'origen és un base64, blob, hash o no té paraules recognoscibles.
 */
export function extractCleanImageName(rawUrlOrName = '') {
  if (!rawUrlOrName || typeof rawUrlOrName !== 'string') return '';
  
  // 1. Dades Base64 i Blob URLs: MAI són noms de fitxer humanitzats
  if (rawUrlOrName.startsWith('data:') || rawUrlOrName.startsWith('blob:')) {
    return '';
  }

  // 2. Treure queries, paràmetres i fragments
  let clean = rawUrlOrName.split('?')[0].split('#')[0];
  
  // 3. Treure camí de carpetes o rutes de fitxer
  const parts = clean.split(/[/\\]/);
  clean = parts[parts.length - 1] || '';

  // 4. Decodificar caràcters d'URL si n'hi ha (%20 -> espai, etc.)
  try {
    clean = decodeURIComponent(clean);
  } catch (_) {}

  // 5. Treure extensions habituals
  clean = clean.replace(/\.(jpe?g|png|webp|gif|svg|avif)$/i, '');

  // 6. Treure prefixos comuns de càmera o de carrusel automàtic
  clean = clean.replace(/^(diapo_?\d+_?|img_?\d*_?|pxl_?\d*_?|dsc_?\d*_?|sample_?|media_\d*_?|photo-?\d*)/i, '');
  clean = clean.replace(/^[0-9]+[-_]/, '');

  // 7. Convertir guions, subratllats i punts en espais
  clean = clean.replace(/[-_.]+/g, ' ').trim();

  // 8. Si conté símbols d'URL, codificació o matemàtics (com '=', '&', '%', '$', '+', '/')
  if (/[=&#%+$*<>/\\|]/.test(clean)) {
    return '';
  }

  // 9. Comprovar si té lletres alfabètiques reals (com a mínim una paraula de 3 o més lletres)
  const words = clean.split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]{3,}/.test(w));
  if (words.length === 0) {
    return '';
  }

  // 10. Filtrar hashes o cadenes aleatòries (ex: '9k=', 'a1b2c3d4e5', IDs numèrics purs)
  if (/^[0-9a-f]{6,}$/i.test(clean) || /^[0-9]+$/.test(clean) || /^(image|foto|photo|sample)$/i.test(clean)) {
    return '';
  }

  return clean;
}

/**
 * Genera títol, subtítol i etiqueta contextual per defecte per a Productes segons la posició de la diapositiva
 */
function getContextualSlideTextForProduct(item, slideIdx, totalSlides) {
  const nom = (item?.nom || item?.titol || item?.title || '').toLowerCase();
  const desc = (item?.descripcio || item?.subtitol || item?.subtitle || '').toLowerCase();
  const cat = (item?.categoria || item?.subcategoria || '').toLowerCase();
  const isLast = slideIdx === totalSlides - 1 && totalSlides > 1;

  // Si és un marc de fotos / finestra de records
  if (nom.includes('marc') || nom.includes('finestra') || desc.includes('marc') || desc.includes('finestra') || cat.includes('marc')) {
    if (slideIdx === 1) {
      return {
        title: "Records que donen calidesa",
        subtitle: "La fusta de til·ler abraça els teus moments inoblidables.",
        tagText: "🪵 Fusta de til·ler"
      };
    }
    if (slideIdx === 2 || isLast) {
      return {
        title: "Acabats i textures",
        subtitle: "Gravat nítid i suau tacte artesanal amb vernís mat a l'aigua.",
        tagText: "✨ Fet a mida"
      };
    }
    return {
      title: "Detalls d'Atelier",
      subtitle: "Suport sòlid i fusta de til·ler seleccionada per a la llar.",
      tagText: "🤍 Mínim Món"
    };
  }

  // Si és un clauer o peça de butxaca
  if (nom.includes('clauer') || desc.includes('clauer') || cat.includes('clauer')) {
    if (slideIdx === 1) {
      return {
        title: "Portar qui estimes a prop",
        subtitle: "Lleugeresa, tacte suau de fusta polida i resistència al pas dels dies.",
        tagText: "🪵 Fusta de til·ler"
      };
    }
    if (slideIdx === 2 || isLast) {
      return {
        title: "Personalització i gravat",
        subtitle: "Inicials i siluetes que encaixen amb precisió mil·limètrica.",
        tagText: "✨ Fet a mà"
      };
    }
    return {
      title: "Detall del clauer",
      subtitle: "Elaborat amb contraxapat de til·ler al taller de Mínim Món.",
      tagText: "🤍 Mínim Món"
    };
  }

  // Si és un punt de llibre
  if (nom.includes('punt') || nom.includes('llibre') || desc.includes('lectura') || cat.includes('llibre')) {
    if (slideIdx === 1) {
      return {
        title: "Entre les teves lectures",
        subtitle: "Fusta de til·ler finíssima amb calat d'alta precisió.",
        tagText: "🪵 Fusta de til·ler"
      };
    }
    if (slideIdx === 2 || isLast) {
      return {
        title: "El valor de la calma",
        subtitle: "Un detall personalitzat per acompanyar els teus moments de lectura.",
        tagText: "📖 Artesania"
      };
    }
    return {
      title: "Calat i precisió",
      subtitle: "Gravat delicat sobre làmines de fusta natural de til·ler.",
      tagText: "✨ Fet a mida"
    };
  }

  // Si és un puzle
  if (nom.includes('puzle') || nom.includes('puzzle') || desc.includes('puzle') || cat.includes('puzle')) {
    if (slideIdx === 1) {
      return {
        title: "Peces amb memòria",
        subtitle: "Transformem els teus records en un puzle artesanal de fusta.",
        tagText: "🪵 Fusta de til·ler"
      };
    }
    if (slideIdx === 2 || isLast) {
      return {
        title: "Acabats d'alta precisió",
        subtitle: "Tall làser nítid i fusta de til·ler amb tacte sedós.",
        tagText: "🧩 Fet a mida"
      };
    }
    return {
      title: "Encaix i relleu",
      subtitle: "Cada peça té la seva pròpia veta de til·ler natural.",
      tagText: "✨ Peça única"
    };
  }

  // Producte genèric
  if (slideIdx === 1) {
    return {
      title: "Acabats i textures",
      subtitle: "Treball artesanal en fusta de til·ler seleccionada i polida a mà.",
      tagText: "🪵 Fusta de til·ler"
    };
  }
  if (slideIdx === 2 || isLast) {
    return {
      title: "L'ànima del detall",
      subtitle: "Peces creades amb paciència per acompanyar el dia a dia.",
      tagText: "✨ Peça única"
    };
  }
  return {
    title: `Detall artesanal ${slideIdx + 1}`,
    subtitle: "Qualitat i calidesa de la fusta de til·ler al taller de Mínim Món.",
    tagText: "🤍 Mínim Món"
  };
}

/**
 * Genera títol, subtítol i etiqueta contextual per defecte per a Projectes segons la posició de la diapositiva
 */
function getContextualSlideTextForProject(item, slideIdx, totalSlides) {
  const isLast = slideIdx === totalSlides - 1 && totalSlides > 1;
  if (slideIdx === 1) {
    return {
      title: "Detalls i volumetria",
      subtitle: "Treball pacient de capes superposades en fusta de til·ler polit.",
      tagText: "🌿 Detall d'Atelier"
    };
  }
  if (slideIdx === 2) {
    return {
      title: "L'ànima del detall",
      subtitle: "Geometries i elements a escala que reten homenatge a la memòria.",
      tagText: "🔨 Taller Mínim Món"
    };
  }
  if (isLast) {
    return {
      title: "Arquitectura i memòria",
      subtitle: "Més racons i projectes d'Atelier a @minimmon.cat",
      tagText: "🏛️ Arquitectura"
    };
  }
  return {
    title: `Relleu i perspectiva ${slideIdx + 1}`,
    subtitle: "Cada racó explica una història feta amb precisió i dedicació.",
    tagText: "✨ Peça d'Atelier"
  };
}

/**
 * Genera títol, subtítol i etiqueta contextual per a una imatge concreta d'una diapositiva de carrusel
 */
export function generateSlideTextForImage({
  imgUrl = '',
  slideIdx = 0,
  totalSlides = 3,
  item = null,
  itemType = 'projectes',
  fileName = ''
}) {
  const isCover = slideIdx === 0;
  const isLast = slideIdx === totalSlides - 1 && totalSlides > 1;
  const cleanName = fileName ? extractCleanImageName(fileName) : extractCleanImageName(imgUrl);
  const itemNom = item?.nom || item?.titol || item?.title || 'Creació artesanal';
  const itemDesc = item?.descripcio || item?.subtitol || item?.subtitle || 'Elaborada amb fusta de til·ler al nostre taller.';
  const isProject = itemType === 'projectes' || item?.branca;

  // 1. DIAPOSITIVA 1: Portada i presentació principal de la peça
  if (isCover) {
    const subOneLine = itemDesc.split('\n')[0].split('.')[0] || 'Espais en miniatura i records en fusta.';
    return {
      title: itemNom,
      subtitle: subOneLine.length > 60 ? `${subOneLine.slice(0, 57)}...` : subOneLine,
      tagText: item?.branca ? `🔨 ${item.branca}` : (isProject ? '✨ Projecte de Taller' : '✨ Fet a mà')
    };
  }

  // 2. Comprovar si l'element té metadata explícita d'aquesta imatge a item.media o item.imatges
  if (item && Array.isArray(item.media)) {
    const matchedMedia = item.media.find(m => {
      if (!m) return false;
      const mUrl = typeof m === 'string' ? m : (m.imatge || m.url || m.src);
      return mUrl && imgUrl && cleanName && (mUrl.includes(cleanName) || imgUrl.includes(extractCleanImageName(mUrl)));
    });

    if (matchedMedia && typeof matchedMedia === 'object') {
      const mediaTitle = matchedMedia.titol || matchedMedia.title || matchedMedia.peu;
      const mediaSub = matchedMedia.subtitol || matchedMedia.descripcio;
      if (mediaTitle && mediaTitle.trim().length > 2 && !/[=&#]/.test(mediaTitle)) {
        return {
          title: mediaTitle,
          subtitle: mediaSub || 'Detall artesanal elaborat amb contraxapat de til·ler.',
          tagText: matchedMedia.etiqueta || '🪵 Fusta de til·ler'
        };
      }
    }
  }

  // 3. Comprovar coincidències en el nom del fitxer amb el nostre diccionari artesà
  if (cleanName) {
    for (const pattern of IMAGE_KEYWORD_PATTERNS) {
      if (pattern.regex.test(cleanName)) {
        return {
          title: pattern.title,
          subtitle: pattern.subtitle,
          tagText: pattern.tag
        };
      }
    }
  }

  // 4. Si el nom del fitxer té paraules humanes netes i significatives (més de 3 caràcters alfabètics reals)
  if (cleanName && cleanName.length >= 3) {
    const words = cleanName.split(' ').filter(w => w.length > 0 && /[a-zA-ZÀ-ÿ]/.test(w));
    if (words.length > 0) {
      const humanTitle = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (humanTitle.length >= 4 && !/[=&#]/.test(humanTitle)) {
        return {
          title: humanTitle,
          subtitle: isProject 
            ? "Detall i perspectiva elaborats amb calidesa al taller."
            : "Fusta natural de til·ler amb polit fi i vetes úniques.",
          tagText: "🪵 Fusta de til·ler"
        };
      }
    }
  }

  // 5. Generació narrativa seqüencial i contextual adaptada al tipus de producte o projecte
  if (!isProject) {
    return getContextualSlideTextForProduct(item, slideIdx, totalSlides);
  } else {
    return getContextualSlideTextForProject(item, slideIdx, totalSlides);
  }
}

/**
 * Construeix un conjunt complet de diapositives per a un element concret,
 * associant a cada imatge el seu títol i subtítol propi
 */
export function buildCarouselSlidesFromItem(item, itemType, availableImages = []) {
  if (!item || !Array.isArray(availableImages) || availableImages.length === 0) {
    return [];
  }

  // Com a màxim 10 diapositives (límit d'Instagram)
  const imagesToUse = availableImages.slice(0, 10);
  const total = imagesToUse.length;

  return imagesToUse.map((imgUrl, idx) => {
    const textData = generateSlideTextForImage({
      imgUrl,
      slideIdx: idx,
      totalSlides: total,
      item,
      itemType
    });

    return {
      id: `slide-${idx + 1}-${Date.now()}`,
      title: textData.title,
      subtitle: textData.subtitle,
      photoUrl: imgUrl,
      tagText: textData.tagText,
      imageFit: 'cover',
      blurIntensity: 35,
      showTag: true,
      showLogo: true,
      customLayers: []
    };
  });
}
