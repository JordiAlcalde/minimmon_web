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
  }
};

/**
 * Carrega una imatge com a recurs HTML Image amb gestió de CORS
 */
export function loadImageAsync(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Intent sense anonymous si falla el header CORS
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
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
 * Ajusta text amb salt de línia automàtic
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
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        // Truncar amb punts suspensius si s'excedeixen les línies màximes
        line += '...';
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
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
    photoUrl = ''
  } = options;

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

    // Marc fi artesanal exterior
    ctx.strokeStyle = 'rgba(61, 43, 31, 0.12)';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 36, 36, fmt.width - 72, fmt.height - 72, 28);
    ctx.stroke();

    // 2. Àrea de la Fotografia (Caixa central)
    let photoW, photoH, photoX, photoY;
    if (format === '1:1') {
      photoW = 760;
      photoH = 600;
      photoX = (fmt.width - photoW) / 2;
      photoY = 160;
    } else if (format === '4:5') {
      photoW = 860;
      photoH = 820;
      photoX = (fmt.width - photoW) / 2;
      photoY = 170;
    } else { // 9:16 Story
      photoW = 920;
      photoH = 1180;
      photoX = (fmt.width - photoW) / 2;
      photoY = 220;
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
      drawImageCover(ctx, productImg, photoX, photoY, photoW, photoH);
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

    // 3. Capçalera superior (Segell MínimMón)
    if (showLogo) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#3D2B1F';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '5px';
      ctx.fillText('M Í N I M   M Ó N', fmt.width / 2, 95);
      ctx.font = 'italic 16px serif';
      ctx.fillStyle = '#8C7765';
      ctx.fillText('taller artesanal · fusta amb ànima', fmt.width / 2, 122);
      ctx.restore();
    }

    // 4. Peu Inferior: Títol, Subtítol i Etiquetes
    const textStartY = photoY + photoH + 54;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2B1F';
    ctx.font = 'bold 44px "Playfair Display", Georgia, serif';
    wrapText(ctx, title, fmt.width / 2, textStartY, 880, 52, 2);

    if (subtitle) {
      ctx.fillStyle = '#6E5D4F';
      ctx.font = 'normal 24px -apple-system, BlinkMacSystemFont, sans-serif';
      wrapText(ctx, subtitle, fmt.width / 2, textStartY + 64, 860, 34, 2);
    }
    ctx.restore();

    // 5. Píndola o Preu
    const badgeY = fmt.height - 110;
    if (showTag && tagText) {
      ctx.save();
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
      const tagMetrics = ctx.measureText(tagText);
      const tagPadding = 28;
      const tagWidth = tagMetrics.width + (tagPadding * 2);
      const tagX = (fmt.width - tagWidth) / 2;

      ctx.fillStyle = tpl.tagBg;
      drawRoundedRect(ctx, tagX, badgeY - 26, tagWidth, 48, 24);
      ctx.fill();

      ctx.fillStyle = tpl.tagText;
      ctx.textAlign = 'center';
      ctx.fillText(tagText, fmt.width / 2, badgeY + 6);
      ctx.restore();
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
    // Marc doble daurat/crema
    ctx.strokeStyle = 'rgba(230, 211, 193, 0.25)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 40, 40, fmt.width - 80, fmt.height - 80, 24);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(230, 211, 193, 0.45)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 48, 48, fmt.width - 96, fmt.height - 96, 20);
    ctx.stroke();

    // Foto central emmarcada amb filet daurat
    let photoW, photoH, photoX, photoY;
    if (format === '1:1') {
      photoW = 760;
      photoH = 580;
      photoX = (fmt.width - photoW) / 2;
      photoY = 170;
    } else if (format === '4:5') {
      photoW = 840;
      photoH = 800;
      photoX = (fmt.width - photoW) / 2;
      photoY = 180;
    } else {
      photoW = 900;
      photoH = 1150;
      photoX = (fmt.width - photoW) / 2;
      photoY = 230;
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
      drawImageCover(ctx, productImg, photoX, photoY, photoW, photoH);
    }
    ctx.restore();

    // Segell
    if (showLogo) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E6D3C1';
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('M Í N I M   M Ó N', fmt.width / 2, 100);
      ctx.font = 'italic 16px serif';
      ctx.fillStyle = '#B39D88';
      ctx.fillText('artesania en fusta natural', fmt.width / 2, 126);
      ctx.restore();
    }

    // Textos inferiors
    const textStartY = photoY + photoH + 54;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "Playfair Display", Georgia, serif';
    wrapText(ctx, title, fmt.width / 2, textStartY, 860, 52, 2);

    if (subtitle) {
      ctx.fillStyle = '#D6C4B2';
      ctx.font = 'normal 24px -apple-system, sans-serif';
      wrapText(ctx, subtitle, fmt.width / 2, textStartY + 64, 840, 34, 2);
    }
    ctx.restore();

    // Badge
    const badgeY = fmt.height - 110;
    if (showTag && tagText) {
      ctx.save();
      ctx.font = 'bold 20px -apple-system, sans-serif';
      const tagMetrics = ctx.measureText(tagText);
      const tagPadding = 28;
      const tagWidth = tagMetrics.width + (tagPadding * 2);
      const tagX = (fmt.width - tagWidth) / 2;

      ctx.fillStyle = tpl.tagBg;
      drawRoundedRect(ctx, tagX, badgeY - 26, tagWidth, 48, 24);
      ctx.fill();

      ctx.fillStyle = tpl.tagText;
      ctx.textAlign = 'center';
      ctx.fillText(tagText, fmt.width / 2, badgeY + 6);
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
      drawImageCover(ctx, productImg, photoX, photoY, photoW, photoH);
    } else {
      ctx.fillStyle = '#ECE5DC';
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }
    ctx.restore();

    // Text sota la polaroid
    const textStartY = photoY + photoH + 58;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3D2B1F';
    ctx.font = 'bold 42px "Playfair Display", Georgia, serif';
    wrapText(ctx, title, fmt.width / 2, textStartY, cardW - 80, 50, 2);

    if (subtitle) {
      ctx.fillStyle = '#786555';
      ctx.font = 'italic 24px Georgia, serif';
      wrapText(ctx, subtitle, fmt.width / 2, textStartY + 60, cardW - 100, 34, 2);
    }
    ctx.restore();

    // Peu polaroid: Logotip discret
    if (showLogo) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#A38F7E';
      ctx.font = 'bold 16px -apple-system, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('M Í N I M   M Ó N   ·   F E T   A   M À', fmt.width / 2, cardY + cardH - 30);
      ctx.restore();
    }
  }
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
