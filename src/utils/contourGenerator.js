/**
 * Utilitat per analitzar el text del nom i generar les corbes/siluetes
 * adaptades als 3 models de Finestra: Onada, Núvol i Batec.
 */

/**
 * Mesura les posicions X i altures relatives de cada lletra/segment del nom
 * utilitzant un canvas offscreen amb la font Modernline Bold.
 */
export function analyzeNameContour(text, targetWidth = 457, targetHeight = 646) {
  const cleanText = (text && text.trim().length > 0) ? text.trim() : 'Nom';

  // Creem canvas per escanejar
  const canvas = document.createElement('canvas');
  const w = 500;
  const h = 180;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return fallbackPoints(cleanText);
  }

  ctx.clearRect(0, 0, w, h);
  // Dibuixem el text en Modernline Bold centrat
  const fontSize = cleanText.length > 20 ? 34 : (cleanText.length > 14 ? 40 : (cleanText.length > 9 ? 48 : 58));
  ctx.font = `bold ${fontSize}px 'Modernline Bold', 'Modernline', cursive, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const textX = w / 2;
  const textY = h * 0.58; // baseline aproximada
  ctx.fillText(cleanText, textX, textY);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Trobem els límits reals de la tinta (bounding box)
  let minInkX = w, maxInkX = 0;
  let minInkY = h, maxInkY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 30) {
        if (x < minInkX) minInkX = x;
        if (x > maxInkX) maxInkX = x;
        if (y < minInkY) minInkY = y;
        if (y > maxInkY) maxInkY = y;
      }
    }
  }

  if (maxInkX <= minInkX) {
    return fallbackPoints(cleanText);
  }

  // Scan vertical per columnes per trobar la cota superior min_y(x)
  const colStep = 3;
  const rawPoints = [];
  
  for (let x = minInkX; x <= maxInkX; x += colStep) {
    let topY = textY + 10;
    for (let y = 0; y < h; y++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 30) {
        topY = y;
        break;
      }
    }
    rawPoints.push({ x, y: topY });
  }

  const frameLeft = 54;
  const frameRight = 403;
  const frameWidth = frameRight - frameLeft;
  
  // El text s'ubica centrat al marc:
  const inkWidth = maxInkX - minInkX;
  const textScale = Math.min(1, (frameWidth * 0.82) / inkWidth);
  const renderedTextWidth = inkWidth * textScale;
  const startXInFrame = frameLeft + (frameWidth - renderedTextWidth) / 2;

  // Alçada de referència de la base del text al marc:
  // El nom té el seu centre vertical aproximat a Y ~ 546-548px (646 * 0.84)
  const baseFrameY = 548;

  // Mostregem els punts clau
  // Filtrem soroll local amb una finestra mòbil (moving average de 5 mostres)
  const smoothedRaw = [];
  const windowHalf = 2;
  for (let i = 0; i < rawPoints.length; i++) {
    let sumY = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowHalf); j <= Math.min(rawPoints.length - 1, i + windowHalf); j++) {
      sumY += rawPoints[j].y;
      count++;
    }
    smoothedRaw.push({ x: rawPoints[i].x, y: sumY / count });
  }

  // Reduïm a un conjunt coherent de mostres
  const sampleCount = Math.max(6, Math.min(12, Math.floor(smoothedRaw.length / 4)));
  const step = Math.floor(smoothedRaw.length / sampleCount);
  
  const keyPoints = [];
  
  // Punt d'entrada des de l'esquerra (connecta amb la cota Y=498 del marc)
  keyPoints.push({
    x: frameLeft,
    y: 498
  });

  // Si hi ha marge abans de la primera lletra, transició suau
  const firstLetterX = startXInFrame;
  if (firstLetterX - frameLeft > 15) {
    keyPoints.push({
      x: frameLeft + (firstLetterX - frameLeft) * 0.4,
      y: 510
    });
  }

  for (let i = 0; i < smoothedRaw.length; i += step) {
    const pt = smoothedRaw[i];
    const normX = (pt.x - minInkX) / inkWidth;
    const targetX = startXInFrame + normX * renderedTextWidth;
    
    // Alçada relativa sobre la línia de base
    // Marge òptim de 22px (+5px sol·licitats) per sobre del pic real de cada lletra
    const letterHeight = (textY - pt.y) * textScale;
    const targetY = Math.max(425, baseFrameY - letterHeight - 22);

    keyPoints.push({ x: targetX, y: targetY });
  }

  // Si l'últim punt no és a prop del final de la lletra, afegim el final
  const lastRaw = smoothedRaw[smoothedRaw.length - 1];
  const lastTargetX = startXInFrame + renderedTextWidth;
  const lastLetterHeight = (textY - lastRaw.y) * textScale;
  const lastTargetY = Math.max(425, baseFrameY - lastLetterHeight - 22);
  keyPoints.push({ x: lastTargetX, y: lastTargetY });

  // Marge suau fins a la dreta del marc
  if (frameRight - lastTargetX > 15) {
    keyPoints.push({
      x: lastTargetX + (frameRight - lastTargetX) * 0.6,
      y: 510
    });
  }

  // Punt de sortida cap a la dreta (connecta amb la cota Y=498 del marc)
  keyPoints.push({
    x: frameRight,
    y: 498
  });

  return keyPoints;
}

function fallbackPoints(text) {
  const frameLeft = 54;
  const frameRight = 403;
  return [
    { x: frameLeft, y: 498 },
    { x: 120, y: 480 },
    { x: 190, y: 505 },
    { x: 260, y: 475 },
    { x: 330, y: 500 },
    { x: frameRight, y: 498 }
  ];
}

/**
 * Converteix una sèrie de punts en el camí inferior segons el model:
 * - 'onada': corbes Bézier suaus i arrodonides
 * - 'nuvol': arcs convexos suaus reduint el nombre de salts a la mitat (arcs més amplis i suaus)
 * - 'batec': traços rectes poligonals en ziga-zaga
 */
export function buildBottomPath(points, modelId = 'onada') {
  if (!points || points.length < 2) return '';

  const id = String(modelId || '').toLowerCase();

  if (id.includes('batec')) {
    // Model Batec: línies rectes poligonals
    let d = '';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      } else {
        const prev = points[i - 1];
        const midX = (prev.x + p.x) / 2;
        if (Math.abs(p.y - prev.y) > 10) {
          d += `L ${midX.toFixed(1)} ${(prev.y + (p.y - prev.y) * 0.25).toFixed(1)} `;
        }
        d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      }
    }
    return d;
  }

  if (id.includes('nuvol') || id.includes('núvol')) {
    // Model Núvol: reduïm els salts a la mitat agrupant punts (pas de 2 en 2)
    // d'aquesta manera queden la meitat d'arcs, més amples i elegants com al disseny original
    const simplifiedPoints = [];
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || i === points.length - 1 || i % 2 === 0) {
        simplifiedPoints.push(points[i]);
      } else if (i === points.length - 2 && simplifiedPoints.length < 3) {
        simplifiedPoints.push(points[i]);
      }
    }

    let d = `L ${simplifiedPoints[0].x.toFixed(1)} ${simplifiedPoints[0].y.toFixed(1)} `;
    for (let i = 1; i < simplifiedPoints.length; i++) {
      const p0 = simplifiedPoints[i - 1];
      const p1 = simplifiedPoints[i];
      const dx = p1.x - p0.x;
      
      // Arc convex de núvol suau i proporcionat
      const arcSag = Math.min(14, Math.max(6, dx * 0.16));

      const cp1x = p0.x + dx * 0.25;
      const cp1y = p0.y - arcSag;
      const cp2x = p0.x + dx * 0.75;
      const cp2y = p1.y - arcSag;

      d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} `;
    }
    return d;
  }

  // Model Onada (per defecte): corba Bézier cúbica suau contínua
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    // Control points for smooth spline
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    if (i === 0) {
      d += `L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} `;
    }
    d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }

  return d;
}
