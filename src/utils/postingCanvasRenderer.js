/**
 * postingCanvasRenderer.js
 * Motor natiu de renderització en HTML5 Canvas d'alta resolució (1080px)
 * per a la generació de posts d'Instagram i xarxes socials de MínimMón.
 */

export const POSTING_FORMATS = {
  '1:1': { id: '1:1', nom: 'Quadrat (1:1)', width: 1080, height: 1080, aspect: '1 / 1' },
  '4:5': { id: '4:5', nom: 'Vertical Retrat (4:5)', width: 1080, height: 1350, aspect: '4 / 5' },
  '9:16': { id: '9:16', nom: 'Story / Reel (9:16)', width: 1080, height: 1920, aspect: '9 / 16' }
};

export const POSTING_TEMPLATES = {
  atelier: {
    id: 'atelier',
    nom: 'Atelier Cru',
    desc: 'Fons cru càlid, fotografia emmarcada amb ombra suau i tipografia serif.',
    bgColor: '#FAF7F2',
    accentColor: '#3D2B1F',
    textColor: '#3D2B1F',
    tagBg: '#3D2B1F',
    tagText: '#FAF7F2'
  },
  fusta: {
    id: 'fusta',
    nom: 'Fusta & Elegància',
    desc: 'Fons xocolata noble, lletres crema daurat i màxima calidesa artesanal.',
    bgColor: '#2E2016',
    accentColor: '#E6D3C1',
    textColor: '#FDFBF7',
    tagBg: '#E6D3C1',
    tagText: '#2E2016'
  },
  polaroid: {
    id: 'polaroid',
    nom: 'Record Artesanal',
    desc: 'Disseny estil targeta instantània amb fons de fusta clara i detall inferior.',
    bgColor: '#F2ECE4',
    accentColor: '#4A3728',
    textColor: '#3D2B1F',
    tagBg: '#8A5D3B',
    tagText: '#FFFFFF'
  },
  informal: {
    id: 'informal',
    nom: 'Informal / Fresh',
    desc: 'Sense marcs pesants. Foto àmplia i neta, tipografia moderna i disseny directe.',
    bgColor: '#F5F2EB',
    accentColor: '#C86D3B',
    textColor: '#2E2016',
    tagBg: '#C86D3B',
    tagText: '#FFFFFF'
  }
};

/**
 * Carrega una imatge com a recurs HTML Image amb gestió de CORS
 */
export function loadImageAsync(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 6000);

    const isDataOrBlob = src.startsWith('data:') || src.startsWith('blob:');
    const img = new Image();
    if (!isDataOrBlob) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (isDataOrBlob) {
        if (!done) {
          done = true;
          clearTimeout(timeout);
          resolve(null);
        }
        return;
      }
      // Intent sense anonymous si falla el header CORS
      const fallback = new Image();
      fallback.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timeout);
          resolve(fallback);
        }
      };
      fallback.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(timeout);
          resolve(null);
        }
      };
      fallback.src = src;
    };
    img.src = src;
  });
}

/**
 * Dibuixa un rectangle amb cantonades arrodonides
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Ajusta i dibuixa una imatge simulant 'object-fit: cover' dins d'una caixa
 */
function drawImageCover(ctx, img, x, y, w, h) {
  if (!img) return;
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;

  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Dibuixa la imatge segons el mode d'ajust:
 * - 'cover': omple tot el requadre retallant els extrems si la foto és molt allargada.
 * - 'contain': encaixa la imatge sencera al 100% sense retallar res, amb fons difuminat estètic ajustable (0% a 80%).
 */
function drawAdaptiveImage(ctx, img, x, y, w, h, fit = 'cover', tplId = 'atelier', blurIntensity = 35) {
  if (!img) return;

  if (fit !== 'contain') {
    drawImageCover(ctx, img, x, y, w, h);
    return;
  }

  // Fons base del requadre: color sòlid càlid i net de la plantilla
  const baseBg = tplId === 'fusta' ? '#1A120C' : (tplId === 'informal' ? '#EAE5DC' : '#EAE2D8');
  ctx.save();
  ctx.fillStyle = baseBg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Si blurIntensity > 0, dibuixem el fons difuminat amb l'opacitat seleccionada (0 a 80%)
  if (blurIntensity > 0) {
    const blurPx = Math.round(10 + (blurIntensity / 80) * 35);
    const alpha = Math.min(0.8, Math.max(0.05, blurIntensity / 100));

    ctx.save();
    try {
      ctx.filter = `blur(${blurPx}px) brightness(0.88)`;
    } catch (_) {}
    ctx.globalAlpha = alpha;
    drawImageCover(ctx, img, x - 12, y - 12, w + 24, h + 24);
    ctx.restore();

    // Vel matitzador per equilibrar contrast
    ctx.save();
    ctx.fillStyle = tplId === 'fusta' ? 'rgba(26, 18, 12, 0.35)' : 'rgba(61, 43, 31, 0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // 2. Calcular dimensions de la imatge continguda
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let dw, dh, dx, dy;

  if (imgRatio > boxRatio) {
    // Imatge molt apaïsada / panoràmica
    dw = w;
    dh = w / imgRatio;
    dx = x;
    dy = y + (h - dh) / 2;
  } else {
    // Imatge molt vertical / estreta
    dh = h;
    dw = h * imgRatio;
    dx = x + (w - dw) / 2;
    dy = y;
  }

  // 3. Ombra subtil al voltant de la foto nítida per donar relleu
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * Ajusta un text a un ample màxim afegint punts suspensius (...) de forma segura
 */
function fitTextEllipsis(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  let best = '';
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.substring(0, mid).trimEnd() + '...';
    if (ctx.measureText(candidate).width <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best || '...';
}

/**
 * Ajusta text amb salt de línia automàtic, mesura garantida i truncament net si supera les línies màximes
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  if (!text) return y;
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        // Darrera línia permesa: afegim el que queda i trunquem amb punts suspensius si cal
        const remaining = (line + words.slice(n).join(' ')).trim();
        const safeLine = fitTextEllipsis(ctx, remaining, maxWidth);
        ctx.fillText(safeLine, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  // Si encara queda text a la cua
  if (line.trim()) {
    const safeLine = fitTextEllipsis(ctx, line.trim(), maxWidth);
    ctx.fillText(safeLine, x, currentY);
    return currentY + lineHeight;
  }
  return currentY;
}

/**
 * Dibuixa una píndola (badge/etiqueta) garantint que mai desbordi els marges segurs
 * adaptant la font i truncant amb punts suspensius si cal.
 */
function drawBadgePill(ctx, tagText, options = {}) {
  if (!tagText || !tagText.trim()) return;
  const {
    centerX = 0,
    centerY = 0,
    align = 'center', // 'center' | 'right'
    rightX = 0,
    topY = 0,
    maxBadgeWidth = 800,
    baseFontSize = 21,
    minFontSize = 16,
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingX = 26,
    height = 48,
    radius = 24,
    bgColor = '#3D2B1F',
    textColor = '#FFFFFF',
    shadow = false
  } = options;

  ctx.save();
  let currentFontSize = baseFontSize;
  ctx.font = `bold ${currentFontSize}px ${fontFamily}`;
  const maxTextWidth = Math.max(80, maxBadgeWidth - (paddingX * 2));
  let textWidth = ctx.measureText(tagText).width;

  // 1. Reducció progressiva de mida de font si el text és llarg
  while (textWidth > maxTextWidth && currentFontSize > minFontSize) {
    currentFontSize -= 1;
    ctx.font = `bold ${currentFontSize}px ${fontFamily}`;
    textWidth = ctx.measureText(tagText).width;
  }

  // 2. Truncament garantit amb punts suspensius si encara supera l'espai
  let displayText = tagText;
  if (textWidth > maxTextWidth) {
    displayText = fitTextEllipsis(ctx, tagText, maxTextWidth);
    textWidth = ctx.measureText(displayText).width;
  }

  const badgeWidth = Math.min(maxBadgeWidth, textWidth + (paddingX * 2));
  let badgeX = 0;
  let badgeY = 0;
  let textX = 0;
  let textY = 0;

  if (align === 'right') {
    badgeX = rightX - badgeWidth;
    badgeY = topY;
    textX = badgeX + badgeWidth / 2;
    textY = badgeY + height / 2 + (currentFontSize * 0.35);
  } else {
    badgeX = centerX - badgeWidth / 2;
    badgeY = centerY - height / 2;
    textX = centerX;
    textY = centerY + (currentFontSize * 0.35);
  }

  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
  }

  ctx.fillStyle = bgColor;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, height, radius);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayText, textX, textY);
  ctx.restore();
}

/**
 * Calcula la mida del títol i subtítol de forma proporcional al format, plantilla i llargada del text
 * garantint que mai sigui massa petit o difícil de llegir.
 */
function computeHeadlineSizes(format, title, subtitle, multiplier = 1) {
  const isStory = format === '9:16';
  const isPortrait = format === '4:5';

  // Base del Títol (ampliat per a màxima llegibilitat i presència)
  let baseTitle = isStory ? 60 : (isPortrait ? 54 : 50);
  if (title && title.length > 36) baseTitle -= 8;
  if (title && title.length > 55) baseTitle -= 6;
  const titleFontSize = Math.round(baseTitle * (multiplier || 1));
  const titleLineHeight = Math.round(titleFontSize * 1.22);

  // Base del Subtítol (augmentat substancialment, mai per sota de 30px)
  let baseSub = isStory ? 42 : (isPortrait ? 38 : 34);
  if (subtitle && subtitle.length > 55) baseSub -= 4;
  if (subtitle && subtitle.length > 95) baseSub -= 3;
  if (baseSub < 30) baseSub = 30; // Mínim garantit de 30px
  const subFontSize = Math.round(baseSub * (multiplier || 1));
  const subLineHeight = Math.round(subFontSize * 1.32);

  return { titleFontSize, titleLineHeight, subFontSize, subLineHeight };
}

/**
 * Renderitza la imatge completa a l'element Canvas segons les opcions
 */
export async function renderPostingCanvas(canvas, options = {}) {
  if (!canvas) return;
  const {
    format = '1:1',
    template = 'atelier',
    title = 'MínimMón',
    subtitle = 'Peça artesanal personalitzada en fusta natural.',
    tagText = 'Personalització inclosa',
    priceText = '',
    showPrice = true,
    showTag = true,
    showLogo = true,
    photoUrl = '',
    imageFit = 'cover',
    blurIntensity = 35,
    headerSlogan = "Espais en miniatura",
    customLayers = [],
    textScale = 1
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 250))
      ]);
    }
  } catch (_) {}

  const fmt = POSTING_FORMATS[format] || POSTING_FORMATS['1:1'];
  const tpl = POSTING_TEMPLATES[template] || POSTING_TEMPLATES.atelier;

  canvas.width = fmt.width;
  canvas.height = fmt.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Carregar la foto del producte
  const productImg = await loadImageAsync(photoUrl);

  // 1. Fons principal
  ctx.fillStyle = tpl.bgColor;
  ctx.fillRect(0, 0, fmt.width, fmt.height);

  // Textura suau o sanefa decorativa segons la plantilla
  if (tpl.id === 'atelier') {
    // Fons amb subtil degradat càlid
    const grad = ctx.createLinearGradient(0, 0, 0, fmt.height);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F3ECE4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, fmt.width, fmt.height);

    // Marc fi artesanal exterior (respecta la zona segura superior i inferior a 9:16)
    const outerFrameY = format === '9:16' ? 140 : 36;
    const outerFrameH = format === '9:16' ? fmt.height - 280 : fmt.height - 72;
    ctx.strokeStyle = 'rgba(61, 43, 31, 0.12)';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 36, outerFrameY, fmt.width - 72, outerFrameH, 28);
    ctx.stroke();

    // 2. Àrea de la Fotografia (Caixa central adaptada sense col·lisió superior)
    let photoW, photoH, photoX, photoY;
    if (format === '1:1') {
      photoW = 820;
      photoH = 620;
      photoX = (fmt.width - photoW) / 2;
      photoY = 85;
    } else if (format === '4:5') {
      photoW = 880;
      photoH = 880;
      photoX = (fmt.width - photoW) / 2;
      photoY = 95;
    } else { // 9:16 Story / Reel (deixa lliure la part superior d'Instagram)
      photoW = 900;
      photoH = 1260;
      photoX = (fmt.width - photoW) / 2;
      photoY = 180;
    }

    // Ombra de la fotografia
    ctx.save();
    ctx.shadowColor = 'rgba(61, 43, 31, 0.16)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
    ctx.fill();
    ctx.restore();

    // Dibuixar la imatge retallada
    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
    ctx.clip();
    if (productImg) {
      drawAdaptiveImage(ctx, productImg, photoX, photoY, photoW, photoH, imageFit, 'atelier', blurIntensity);
    } else {
      ctx.fillStyle = '#EAE2D8';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#8C7765';
      ctx.font = '500 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fotografia del Producte', photoX + photoW / 2, photoY + photoH / 2);
    }
    // Filet intern càlid
    ctx.strokeStyle = 'rgba(61, 43, 31, 0.08)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
    ctx.stroke();
    ctx.restore();

    // 4. Peu Inferior: Títol, Subtítol i Etiquetes
    const badgeY = fmt.height - (format === '9:16' ? 105 : (format === '4:5' ? 76 : 68));
    const textStartY = photoY + photoH + (format === '9:16' ? 90 : (format === '4:5' ? 80 : 72));
    ctx.save();
    ctx.textAlign = 'center';

    // A. Títol adaptatiu amb màxima presència
    const { titleFontSize, titleLineHeight, subFontSize, subLineHeight } = computeHeadlineSizes(format, title, subtitle, textScale);

    ctx.fillStyle = '#261B13';
    ctx.font = `bold ${titleFontSize}px "Playfair Display", Georgia, serif`;
    const titleEndY = wrapText(ctx, title, fmt.width / 2, textStartY, 900, titleLineHeight, 2);

    // B. Subtítol adaptatiu nítid i altament llegible (mínim 2 línies, 3 al format petit)
    if (subtitle) {
      const badgeTopLimit = (showTag && tagText) || (showPrice && priceText) ? (badgeY - 26) : (fmt.height - 36);
      const subStartY = titleEndY + 12;
      const availableSpace = badgeTopLimit - subStartY;

      // Criteri de línies: 3 línies al format més petit (textScale <= 1.05), mínim 2 línies garantides amb escales superiors
      const isSmallScale = (!textScale || textScale <= 1.05);
      const targetLines = isSmallScale ? 3 : (format === '9:16' ? 3 : 2);
      const allowedLines = Math.max(2, targetLines);

      let effectiveSubLineHeight = subLineHeight;
      let effectiveSubFontSize = subFontSize;
      if (availableSpace < allowedLines * effectiveSubLineHeight) {
        effectiveSubLineHeight = Math.max(32, Math.floor(availableSpace / allowedLines));
        effectiveSubFontSize = Math.min(subFontSize, Math.round(effectiveSubLineHeight / 1.28));
      }

      ctx.fillStyle = '#261B13'; // Contrast nítid i elegant de marca
      ctx.font = `600 ${effectiveSubFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      wrapText(ctx, subtitle, fmt.width / 2, subStartY, 900, effectiveSubLineHeight, allowedLines);
    }
    ctx.restore();

    // 5. Píndola o Preu
    if (showTag && tagText) {
      drawBadgePill(ctx, tagText, {
        centerX: fmt.width / 2,
        centerY: badgeY,
        maxBadgeWidth: Math.min(840, fmt.width - 120),
        baseFontSize: 20,
        minFontSize: 14,
        bgColor: tpl.tagBg,
        textColor: tpl.tagText
      });
    } else if (showPrice && priceText) {
      ctx.save();
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#3D2B1F';
      ctx.textAlign = 'center';
      ctx.fillText(priceText, fmt.width / 2, badgeY + 6);
      ctx.restore();
    }

  } else if (tpl.id === 'fusta') {
    // Plantilla Fusta Fosc & Noble
    // Marc doble daurat/crema (respecta la zona segura superior i inferior a 9:16)
    const fustaFrameY = format === '9:16' ? 140 : 40;
    const fustaFrameH = format === '9:16' ? fmt.height - 280 : fmt.height - 80;
    ctx.strokeStyle = 'rgba(230, 211, 193, 0.25)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 40, fustaFrameY, fmt.width - 80, fustaFrameH, 24);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(230, 211, 193, 0.45)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 48, fustaFrameY + 8, fmt.width - 96, fustaFrameH - 16, 20);
    ctx.stroke();

    // Foto central emmarcada amb filet daurat (sense col·lisió superior)
    let photoW, photoH, photoX, photoY;
    if (format === '1:1') {
      photoW = 820;
      photoH = 620;
      photoX = (fmt.width - photoW) / 2;
      photoY = 85;
    } else if (format === '4:5') {
      photoW = 880;
      photoH = 880;
      photoX = (fmt.width - photoW) / 2;
      photoY = 95;
    } else {
      photoW = 900;
      photoH = 1260;
      photoX = (fmt.width - photoW) / 2;
      photoY = 180;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 20);
    ctx.fillStyle = '#1A120C';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 20);
    ctx.clip();
    if (productImg) {
      drawAdaptiveImage(ctx, productImg, photoX, photoY, photoW, photoH, imageFit, 'fusta', blurIntensity);
    }
    ctx.restore();

    // Textos inferiors
    const badgeY = fmt.height - (format === '9:16' ? 105 : (format === '4:5' ? 76 : 68));
    const textStartY = photoY + photoH + (format === '9:16' ? 90 : (format === '4:5' ? 80 : 72));
    ctx.save();
    ctx.textAlign = 'center';

    const { titleFontSize, titleLineHeight, subFontSize, subLineHeight } = computeHeadlineSizes(format, title, subtitle, textScale);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${titleFontSize}px "Playfair Display", Georgia, serif`;
    const titleEndY = wrapText(ctx, title, fmt.width / 2, textStartY, 880, titleLineHeight, 2);

    // Subtítol adaptatiu (mínim 2 línies, 3 al format petit)
    if (subtitle) {
      const badgeTopLimit = (showTag && tagText) || (showPrice && priceText) ? (badgeY - 26) : (fmt.height - 36);
      const subStartY = titleEndY + 12;
      const availableSpace = badgeTopLimit - subStartY;

      // Criteri de línies: 3 línies al format més petit (textScale <= 1.05), mínim 2 línies garantides amb escales superiors
      const isSmallScale = (!textScale || textScale <= 1.05);
      const targetLines = isSmallScale ? 3 : (format === '9:16' ? 3 : 2);
      const allowedLines = Math.max(2, targetLines);

      let effectiveSubLineHeight = subLineHeight;
      let effectiveSubFontSize = subFontSize;
      if (availableSpace < allowedLines * effectiveSubLineHeight) {
        effectiveSubLineHeight = Math.max(32, Math.floor(availableSpace / allowedLines));
        effectiveSubFontSize = Math.min(subFontSize, Math.round(effectiveSubLineHeight / 1.28));
      }

      ctx.fillStyle = '#FAF7F2'; // Crema clar d'alt contrast sobre el fons fusta fosc
      ctx.font = `600 ${effectiveSubFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      wrapText(ctx, subtitle, fmt.width / 2, subStartY, 880, effectiveSubLineHeight, allowedLines);
    }
    ctx.restore();

    // Badge o Preu
    if (showTag && tagText) {
      drawBadgePill(ctx, tagText, {
        centerX: fmt.width / 2,
        centerY: badgeY,
        maxBadgeWidth: Math.min(840, fmt.width - 120),
        baseFontSize: 20,
        minFontSize: 14,
        bgColor: tpl.tagBg,
        textColor: tpl.tagText
      });
    } else if (showPrice && priceText) {
      ctx.save();
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#E6D3C1';
      ctx.textAlign = 'center';
      ctx.fillText(priceText, fmt.width / 2, badgeY + 6);
      ctx.restore();
    }

  } else if (tpl.id === 'polaroid') {
    // Plantilla Polaroid Artesanal
    let cardW, cardH, cardX, cardY;
    if (format === '1:1') {
      cardW = 820;
      cardH = 920;
      cardX = (fmt.width - cardW) / 2;
      cardY = 80;
    } else if (format === '4:5') {
      cardW = 880;
      cardH = 1180;
      cardX = (fmt.width - cardW) / 2;
      cardY = 85;
    } else {
      cardW = 920;
      cardH = 1520;
      cardX = (fmt.width - cardW) / 2;
      cardY = 200;
    }

    // Ombra de la targeta polaroid
    ctx.save();
    ctx.shadowColor = 'rgba(61, 43, 31, 0.18)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.restore();

    // Foto superior dins la polaroid
    const innerPadding = 44;
    const photoW = cardW - (innerPadding * 2);
    const photoH = format === '1:1' ? 620 : (format === '4:5' ? 820 : 1080);
    const photoX = cardX + innerPadding;
    const photoY = cardY + innerPadding;

    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 10);
    ctx.clip();
    if (productImg) {
      drawAdaptiveImage(ctx, productImg, photoX, photoY, photoW, photoH, imageFit, 'polaroid', blurIntensity);
    } else {
      ctx.fillStyle = '#ECE5DC';
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }
    ctx.restore();

    // Text sota la polaroid
    const badgeY = cardY + cardH - (format === '9:16' ? 44 : 36);
    const textStartY = photoY + photoH + (format === '9:16' ? 82 : (format === '4:5' ? 72 : 64));
    ctx.save();
    ctx.textAlign = 'center';

    const { titleFontSize, titleLineHeight, subFontSize, subLineHeight } = computeHeadlineSizes(format, title, subtitle, textScale);

    ctx.fillStyle = '#261B13';
    ctx.font = `bold ${titleFontSize}px "Playfair Display", Georgia, serif`;
    const titleEndY = wrapText(ctx, title, fmt.width / 2, textStartY, cardW - 70, titleLineHeight, 2);

    // Subtítol adaptatiu (mínim 2 línies, 3 al format petit)
    if (subtitle) {
      const badgeTopLimit = (showTag && tagText) || (showPrice && priceText) ? (badgeY - 24) : (cardY + cardH - 20);
      const subStartY = titleEndY + 12;
      const availableSpace = badgeTopLimit - subStartY;

      const isSmallScale = (!textScale || textScale <= 1.05);
      const targetLines = isSmallScale ? 3 : (format === '9:16' ? 3 : 2);
      const allowedLines = Math.max(2, targetLines);

      let effectiveSubLineHeight = subLineHeight;
      let effectiveSubFontSize = subFontSize;
      if (availableSpace < allowedLines * effectiveSubLineHeight) {
        effectiveSubLineHeight = Math.max(30, Math.floor(availableSpace / allowedLines));
        effectiveSubFontSize = Math.min(subFontSize, Math.round(effectiveSubLineHeight / 1.28));
      }

      ctx.fillStyle = '#261B13';
      ctx.font = `italic 600 ${effectiveSubFontSize}px Georgia, serif`;
      wrapText(ctx, subtitle, fmt.width / 2, subStartY, cardW - 70, effectiveSubLineHeight, allowedLines);
    }
    ctx.restore();

    // Badge a la polaroid (si l'usuari el vol mostrar)
    if (showTag && tagText) {
      drawBadgePill(ctx, tagText, {
        centerX: fmt.width / 2,
        centerY: badgeY,
        maxBadgeWidth: Math.min(cardW - 80, 680),
        baseFontSize: 18,
        minFontSize: 14,
        height: 42,
        radius: 21,
        bgColor: tpl.tagBg,
        textColor: tpl.tagText
      });
    } else if (showPrice && priceText) {
      ctx.save();
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.fillStyle = '#3D2B1F';
      ctx.textAlign = 'center';
      const priceY = cardY + cardH - 42;
      ctx.fillText(priceText, fmt.width / 2, priceY);
      ctx.restore();
    }

  } else if (tpl.id === 'informal') {
    // Plantilla Informal / Fresh
    // Concepte: Sense marcs pesants, foto neta i àmplia protagonista, tipografia bold moderna i estil directe
    let photoW, photoH, photoX, photoY;
    if (format === '1:1') {
      photoW = 940;
      photoH = 720;
      photoX = (fmt.width - photoW) / 2;
      photoY = 65;
    } else if (format === '4:5') {
      photoW = 960;
      photoH = 960;
      photoX = (fmt.width - photoW) / 2;
      photoY = 75;
    } else { // 9:16 Story
      photoW = 960;
      photoH = 1380;
      photoX = (fmt.width - photoW) / 2;
      photoY = 170;
    }

    // 2. Ombra suau i difusa contemporània per a la fotografia (sense cap marc ni vora sòlida)
    ctx.save();
    ctx.shadowColor = 'rgba(46, 32, 22, 0.12)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // 3. Imatge amb cantonades netes arrodonides
    ctx.save();
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
    ctx.clip();
    if (productImg) {
      drawAdaptiveImage(ctx, productImg, photoX, photoY, photoW, photoH, imageFit, 'informal', blurIntensity);
    } else {
      ctx.fillStyle = '#EAE5DC';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#8C7765';
      ctx.font = '600 28px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fotografia', photoX + photoW / 2, photoY + photoH / 2);
    }
    ctx.restore();

    // 4. Etiqueta flotant integrada (Pill Badge) a la cantonada superior dreta de la foto
    if (showTag && tagText) {
      drawBadgePill(ctx, tagText, {
        align: 'right',
        rightX: photoX + photoW - 22,
        topY: photoY + 22,
        maxBadgeWidth: Math.min(photoW - 48, 520),
        baseFontSize: 20,
        minFontSize: 14,
        height: 46,
        radius: 23,
        bgColor: tpl.tagBg,
        textColor: tpl.tagText,
        shadow: true
      });
    }

    // 5. Textos inferiors: Tipografia moderna bold, fresca i dinàmica (sans-serif)
    const textStartY = photoY + photoH + (format === '9:16' ? 90 : (format === '4:5' ? 80 : 72));
    ctx.save();
    ctx.textAlign = 'center';

    const { titleFontSize, titleLineHeight, subFontSize, subLineHeight } = computeHeadlineSizes(format, title, subtitle, textScale);

    ctx.fillStyle = '#1A120C';
    ctx.font = `800 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const titleEndY = wrapText(ctx, title, fmt.width / 2, textStartY, 920, titleLineHeight, 2);

    // Subtítol adaptatiu (mínim 2 línies, 3 al format petit)
    if (subtitle) {
      const priceTopLimit = (showPrice && priceText) ? (fmt.height - 65) : (fmt.height - 32);
      const subStartY = titleEndY + 12;
      const availableSpace = priceTopLimit - subStartY;

      const isSmallScale = (!textScale || textScale <= 1.05);
      const targetLines = isSmallScale ? 3 : (format === '9:16' ? 3 : 2);
      const allowedLines = Math.max(2, targetLines);

      let effectiveSubLineHeight = subLineHeight;
      let effectiveSubFontSize = subFontSize;
      if (availableSpace < allowedLines * effectiveSubLineHeight) {
        effectiveSubLineHeight = Math.max(32, Math.floor(availableSpace / allowedLines));
        effectiveSubFontSize = Math.min(subFontSize, Math.round(effectiveSubLineHeight / 1.28));
      }

      ctx.fillStyle = '#1A120C';
      ctx.font = `600 ${effectiveSubFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      wrapText(ctx, subtitle, fmt.width / 2, subStartY, 920, effectiveSubLineHeight, allowedLines);
    }
    ctx.restore();

    // 6. Preu modern destacat al peu
    if (showPrice && priceText) {
      ctx.save();
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#C86D3B';
      ctx.textAlign = 'center';
      ctx.fillText(priceText, fmt.width / 2, fmt.height - 42);
      ctx.restore();
    }
  }

  // 7. Capes de text lliures personalitzades (Capa 1 i Capa 2)
  if (Array.isArray(customLayers) && customLayers.length > 0) {
    renderCustomLayers(ctx, customLayers, fmt.width, fmt.height);
  }
}

/**
 * Converteix un color hex i un percentatge d'opacitat en format rgba()
 */
export function hexToRgba(hex, opacityPercent = 100) {
  if (!hex || hex === 'transparent') return 'transparent';
  let clean = String(hex).replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const alpha = Math.max(0, Math.min(1, (Number(opacityPercent) || 0) / 100));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Renderitza les capes de text lliures i personalitzades a sobre de la composició del canvas
 */
export function renderCustomLayers(ctx, layers = [], canvasWidth = 1080, canvasHeight = 1080) {
  if (!ctx || !Array.isArray(layers) || layers.length === 0) return;

  layers.forEach((layer) => {
    if (!layer || !layer.enabled || !layer.text || !layer.text.trim()) return;

    const xPercent = typeof layer.x === 'number' ? layer.x : 50;
    const yPercent = typeof layer.y === 'number' ? layer.y : 50;
    const posX = (xPercent / 100) * canvasWidth;
    const posY = (yPercent / 100) * canvasHeight;

    const fontSize = Number(layer.fontSize) || 44;
    const fontFamily = layer.fontFamily || "'Caveat', cursive";
    const fontWeight = layer.fontWeight || (layer.fontId === 'caveat' || layer.fontId === 'dancing' ? '700' : '600');

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Suport per a múltiples línies (salt de línia \n) i auto-wrap segons l'amplada màxima de la càpsula
    const rawLines = String(layer.text).split('\n');
    const maxPercent = Number(layer.maxWidthPercent) || 58;
    const maxAllowedWidth = Math.round(canvasWidth * (maxPercent / 100));
    const lines = [];

    rawLines.forEach(rawL => {
      const trimmed = rawL.trim();
      if (!trimmed) return;
      if (ctx.measureText(trimmed).width <= maxAllowedWidth) {
        lines.push(trimmed);
      } else {
        const words = trimmed.split(' ');
        let curLine = '';
        words.forEach(w => {
          const test = curLine ? `${curLine} ${w}` : w;
          if (ctx.measureText(test).width > maxAllowedWidth && curLine) {
            lines.push(curLine);
            curLine = w;
          } else {
            curLine = test;
          }
        });
        if (curLine) lines.push(curLine);
      }
    });

    if (lines.length === 0) {
      ctx.restore();
      return;
    }

    // Mesurar l'amplada màxima de les línies
    let maxLineWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
    });

    const lineHeight = Math.round(fontSize * 1.34);
    const totalTextHeight = lines.length * lineHeight;
    
    // Coixí proporcional a la mida del text
    const padX = Math.round(fontSize * 0.70);
    const padY = Math.round(fontSize * 0.40);
    const boxW = Math.round(maxLineWidth + (padX * 2));
    const boxH = Math.round(totalTextHeight + (padY * 2));

    // Clamping defensiu: assegura que el requadre MAI quedi tallat fora dels marges del canvas
    const safeMarginX = Math.round(canvasWidth * 0.035);
    const safeMarginY = Math.round(canvasHeight * 0.025);

    let boxX = Math.round(posX - (boxW / 2));
    let boxY = Math.round(posY - (boxH / 2));

    if (boxX < safeMarginX) {
      boxX = safeMarginX;
    } else if (boxX + boxW > canvasWidth - safeMarginX) {
      boxX = canvasWidth - safeMarginX - boxW;
    }

    if (boxY < safeMarginY) {
      boxY = safeMarginY;
    } else if (boxY + boxH > canvasHeight - safeMarginY) {
      boxY = canvasHeight - safeMarginY - boxH;
    }

    const textCenterX = Math.round(boxX + (boxW / 2));

    // Dibuixar requadre de fons si té opacitat > 0
    const bgOpacity = typeof layer.bgOpacity === 'number' ? layer.bgOpacity : 75;
    if (bgOpacity > 0 && layer.bgColor && layer.bgColor !== 'transparent') {
      ctx.save();
      if (bgOpacity >= 15) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
      }
      ctx.fillStyle = hexToRgba(layer.bgColor, bgOpacity);
      const radius = Math.min(boxH / 2, Math.round(fontSize * 0.50));
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Dibuixar el text centrat a la caixa
    ctx.fillStyle = layer.textColor || '#FFFFFF';
    const startY = boxY + padY + (lineHeight / 2);
    lines.forEach((line, idx) => {
      ctx.fillText(line, textCenterX, startY + (idx * lineHeight));
    });

    ctx.restore();
  });
}

/**
 * Descarrega el canvas directament a l'ordinador de l'usuari en format PNG d'alta qualitat
 */
export function exportCanvasToPng(canvas, filename = 'post-minimmon.png') {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
