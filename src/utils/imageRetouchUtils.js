/**
 * Utilitat d'automatització de retoc fotogràfic per a Mínim Món
 * Protocol estàndard:
 * 1. Eliminació intel·ligent del fons (model espacial local de les 4 vores + cromaticitat + protecció topològica de l'interior de la peça)
 * 2. Detecció de la peça i enquadrament en format 1:1 mantenint l'objecte al centre
 * 3. Redimensionat a 1000x1000 píxels i optimització de pes del fitxer
 * 4. Millora de brillantor, contrast i definició de la peça amb protecció d'altes llums (sense cremar mai la fusta de til·ler)
 */

// Color de mostra escollit per defecte (extret de la mostra oficial: RGB 232, 230, 231 -> #E8E6E7)
export const DEFAULT_SWATCH_BG_HEX = '#E8E6E7';
export const DEFAULT_TARGET_SIZE = 1000;

export const PRESET_BACKGROUNDS = [
  { id: 'mostra', label: 'Mostra Mínim Món (#E8E6E7)', hex: '#E8E6E7', transparent: false },
  { id: 'atelier', label: 'Crema Atelier (#F5F2EB)', hex: '#F5F2EB', transparent: false },
  { id: 'blanc', label: 'Blanc Pur (#FFFFFF)', hex: '#FFFFFF', transparent: false },
  { id: 'transparent', label: 'Fons Transparent (PNG)', hex: null, transparent: true },
];

export const RETOUCH_PRESETS = [
  {
    id: 'natural',
    label: '✨ Automàtic Natural',
    desc: 'Elimina el fons i aplica una millora suau sense cremar la fusta clara',
    settings: {
      removeBackground: true,
      bgTolerance: 32,
      shadowCleanup: 28,
      edgeFeather: 2,
      brightness: 0,
      contrast: 6,
      warmth: 2,
      sharpness: 12,
    },
  },
  {
    id: 'only_bg',
    label: '🎯 Només Treure Fons',
    desc: 'Elimina el fons i centra 1:1 mantenint el color i llum 100% originals de la peça',
    settings: {
      removeBackground: true,
      bgTolerance: 32,
      shadowCleanup: 28,
      edgeFeather: 2,
      brightness: 0,
      contrast: 0,
      warmth: 0,
      sharpness: 0,
    },
  },
  {
    id: 'engraving',
    label: '🔥 Realçar Gravat i Detall',
    desc: 'Potencia el contrast del gravat làser i la definició de les vetes de til·ler',
    settings: {
      removeBackground: true,
      bgTolerance: 32,
      shadowCleanup: 28,
      edgeFeather: 2,
      brightness: -2,
      contrast: 14,
      warmth: 3,
      sharpness: 24,
    },
  },
];

export const DEFAULT_RETOUCH_SETTINGS = {
  targetSize: 1000,
  removeBackground: true,
  autoCenterObject: true,
  objectMarginPercent: 12, // 12% de marge al voltant de la peça centrada
  bgTolerance: 32,         // Tolerància de detecció de fons (0 - 100)
  edgeFeather: 2,          // Suavitzat de les vores de la peça (0 - 6 px)
  shadowCleanup: 28,       // Neteja d'ombres de taula del mateix to (0 - 100)
  brightness: 0,           // Millora de brillantor de la peça (-50 a +50)
  contrast: 6,             // Millora de contrast amb protecció d'altes llums (-50 a +50)
  warmth: 2,               // To càlid natural de la fusta de til·ler (-30 a +30)
  sharpness: 12,           // Nitidesa / detall del gravat làser (0 a 50)
  bgColorHex: DEFAULT_SWATCH_BG_HEX,
  transparentBg: false,
  outputFormat: 'image/jpeg', // 'image/jpeg' | 'image/webp' | 'image/png'
  outputQuality: 0.88,     // Qualitat per rebaixar el volum del fitxer mantenint nitidesa
  manualSamplePoint: null, // Compatibilitat amb un sol punt { x, y }
  manualBgPoints: [],      // Llista de punts { x, y } clicats per esborrar zones de fons
  manualFgPoints: [],      // Llista de punts { x, y } clicats per restaurar zones de la peça
  zoomOffset: 1,           // Escala manual addicional (0.5 .. 1.8)
  panX: 0,                 // Desplaçament horitzontal manual (-200 .. +200 px)
  panY: 0,                 // Desplaçament vertical manual (-200 .. +200 px)
};

/**
 * Converteix un color HEX (#RRGGBB) a objecte { r, g, b }
 */
export function hexToRgb(hex) {
  const clean = String(hex || DEFAULT_SWATCH_BG_HEX).replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 232,
      g: parseInt(clean[1] + clean[1], 16) || 230,
      b: parseInt(clean[2] + clean[2], 16) || 231,
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) ?? 232,
    g: parseInt(clean.substring(2, 4), 16) ?? 230,
    b: parseInt(clean.substring(4, 6), 16) ?? 231,
  };
}

/**
 * Construeix un mapa espacial del color de fons esperat a cada píxel (x, y)
 * interpolant de manera suau les 4 vores de la imatge (filtrades per mediana).
 * Això permet eliminar fons amb forts gradients d'il·luminació (com taules de fusta)
 * sense confondre mai la peça central amb les zones fosques o clares d'altres racons de la foto.
 */
function buildLocalBackgroundField(data, width, height) {
  const borderPad = Math.max(2, Math.floor(Math.min(width, height) * 0.038));
  const winH = Math.max(6, Math.floor(height * 0.06));
  const winW = Math.max(6, Math.floor(width * 0.06));

  const leftEdge = new Float32Array(height * 3);
  const rightEdge = new Float32Array(height * 3);
  const topEdge = new Float32Array(width * 3);
  const botEdge = new Float32Array(width * 3);

  const getMedianRGB = (samples) => {
    if (!samples.length) return [220, 220, 220];
    samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    return samples[Math.floor(samples.length / 2)];
  };

  const stepY = Math.max(1, Math.floor(winH / 4));
  for (let y = 0; y < height; y++) {
    const sL = [];
    const sR = [];
    for (let dy = -winH; dy <= winH; dy += stepY) {
      const cy = Math.max(0, Math.min(height - 1, y + dy));
      for (let x = 1; x <= borderPad; x += 2) {
        const iL = (cy * width + x) * 4;
        if (data[iL + 3] >= 128) sL.push([data[iL], data[iL + 1], data[iL + 2]]);
        const iR = (cy * width + (width - 1 - x)) * 4;
        if (data[iR + 3] >= 128) sR.push([data[iR], data[iR + 1], data[iR + 2]]);
      }
    }
    const mL = getMedianRGB(sL);
    const mR = getMedianRGB(sR);
    leftEdge[y * 3] = mL[0];
    leftEdge[y * 3 + 1] = mL[1];
    leftEdge[y * 3 + 2] = mL[2];
    rightEdge[y * 3] = mR[0];
    rightEdge[y * 3 + 1] = mR[1];
    rightEdge[y * 3 + 2] = mR[2];
  }

  const stepX = Math.max(1, Math.floor(winW / 4));
  for (let x = 0; x < width; x++) {
    const sT = [];
    const sB = [];
    for (let dx = -winW; dx <= winW; dx += stepX) {
      const cx = Math.max(0, Math.min(width - 1, x + dx));
      for (let y = 1; y <= borderPad; y += 2) {
        const iT = (y * width + cx) * 4;
        if (data[iT + 3] >= 128) sT.push([data[iT], data[iT + 1], data[iT + 2]]);
        const iB = ((height - 1 - y) * width + cx) * 4;
        if (data[iB + 3] >= 128) sB.push([data[iB], data[iB + 1], data[iB + 2]]);
      }
    }
    const mT = getMedianRGB(sT);
    const mB = getMedianRGB(sB);
    topEdge[x * 3] = mT[0];
    topEdge[x * 3 + 1] = mT[1];
    topEdge[x * 3 + 2] = mT[2];
    botEdge[x * 3] = mB[0];
    botEdge[x * 3 + 1] = mB[1];
    botEdge[x * 3 + 2] = mB[2];
  }

  const bgField = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const uY = (y + 0.5) / height;
    const wT = 1 / Math.max(0.03, uY);
    const wB = 1 / Math.max(0.03, 1 - uY);
    const y3 = y * 3;

    for (let x = 0; x < width; x++) {
      const uX = (x + 0.5) / width;
      const wL = 1 / Math.max(0.03, uX);
      const wR = 1 / Math.max(0.03, 1 - uX);
      const wSum = wL + wR + wT + wB;

      const idx3 = (y * width + x) * 3;
      const x3 = x * 3;

      bgField[idx3]     = (wL * leftEdge[y3]     + wR * rightEdge[y3]     + wT * topEdge[x3]     + wB * botEdge[x3]) / wSum;
      bgField[idx3 + 1] = (wL * leftEdge[y3 + 1] + wR * rightEdge[y3 + 1] + wT * topEdge[x3 + 1] + wB * botEdge[x3 + 1]) / wSum;
      bgField[idx3 + 2] = (wL * leftEdge[y3 + 2] + wR * rightEdge[y3 + 2] + wT * topEdge[x3 + 2] + wB * botEdge[x3 + 2]) / wSum;
    }
  }
  return bgField;
}

/**
 * Distància combinada de luminància + cromaticitat respecte al fons local esperat
 */
function pixelBgDistance(r, g, b, bgR, bgG, bgB, shadowCleanup = 28) {
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  let rgbDist = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);

  // Diferència cromàtica (separa fusta de til·ler clara o metall d'una taula de fusta fosca/càlida)
  const cRB = Math.abs((r - b) - (bgR - bgB));
  const cRG = Math.abs((r - g) - (bgR - bgG));
  const cGB = Math.abs((g - b) - (bgG - bgB));
  const chromaDist = cRB * 0.55 + cRG * 0.25 + cGB * 0.20;

  // Si és una ombra o veta suau del mateix to cromàtic que el fons (però sense arribar al negre del cantell làser)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const bgLuma = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  if (shadowCleanup > 0 && luma < bgLuma && luma > bgLuma - shadowCleanup * 1.4 && chromaDist < 14 && luma > 48) {
    rgbDist *= 0.65;
  }

  return rgbDist * 0.65 + chromaDist * 0.90;
}

/**
 * Calcula la màscara d'opacitat (alpha 0..255) separant la peça del fons.
 * - Preserva 100% l'interior de la peça (lletres gravades, logotips, vetes)
 * - Buida automàticament els forats passants reals (com l'anella metàl·lica o el forat del clauer)
 * - Permet afegir punts manuals d'esborrat de fons o de restauració de peça
 */
export function computeForegroundMask(imageData, settings) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  mask.fill(255);

  // Si la imatge ja és un PNG amb fons transparent real i no hi ha clics manuals, el respectem
  let transparentCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 20) {
      mask[i] = 0;
      transparentCount++;
    }
  }
  const hasManualPoints =
    Boolean(settings.manualSamplePoint) ||
    (Array.isArray(settings.manualBgPoints) && settings.manualBgPoints.length > 0) ||
    (Array.isArray(settings.manualFgPoints) && settings.manualFgPoints.length > 0);

  if (transparentCount > totalPixels * 0.12 && !hasManualPoints) {
    for (let i = 0; i < totalPixels; i++) {
      mask[i] = data[i * 4 + 3];
    }
    return mask;
  }

  const bgTolerance = Math.max(4, Number(settings.bgTolerance ?? 32));
  const shadowCleanup = Math.max(0, Number(settings.shadowCleanup ?? 28));

  const bgField = buildLocalBackgroundField(data, width, height);
  const distMap = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const i4 = i * 4;
    const i3 = i * 3;
    distMap[i] = pixelBgDistance(
      data[i4], data[i4 + 1], data[i4 + 2],
      bgField[i3], bgField[i3 + 1], bgField[i3 + 2],
      shadowCleanup
    );
  }

  // Pas 1: Flood-Fill des de les 4 vores amb fre en arestes vives (step gradient barrier)
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const enqueueIfBg = (x, y, prevPos = -1) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pos = y * width + x;
    if (visited[pos]) return;

    const d = distMap[pos];
    let isBg = d <= bgTolerance;

    if (prevPos >= 0) {
      const i1 = pos * 4;
      const i2 = prevPos * 4;
      const stepR = Math.abs(data[i1] - data[i2]);
      const stepG = Math.abs(data[i1 + 1] - data[i2 + 1]);
      const stepB = Math.abs(data[i1 + 2] - data[i2 + 2]);
      const stepDist = stepR * 0.3 + stepG * 0.59 + stepB * 0.11;
      const stepChroma = Math.abs((data[i1] - data[i1 + 2]) - (data[i2] - data[i2 + 2]));

      // Si hi ha un salt brusc de vora cap a la peça, frenem la inundació
      if (stepDist > 22 || stepChroma > 18) {
        if (d > bgTolerance * 0.65) {
          isBg = false;
        }
      } else if (!isBg && d <= bgTolerance * 1.22 && stepDist < 8 && stepChroma < 8) {
        isBg = true;
      }
    }

    if (isBg) {
      visited[pos] = 1;
      mask[pos] = 0;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueIfBg(x, 0, -1);
    enqueueIfBg(x, height - 1, -1);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBg(0, y, -1);
    enqueueIfBg(width - 1, y, -1);
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = (curr - cx) / width;
    enqueueIfBg(cx - 1, cy, curr);
    enqueueIfBg(cx + 1, cy, curr);
    enqueueIfBg(cx, cy - 1, curr);
    enqueueIfBg(cx, cy + 1, curr);
  }

  // Pas 2: Detecció automàtica de forats passants reals (interior d'anelles de clauer o forats de peça)
  // Només s'activen si el seu color coincideix fidelment amb el fons local esperat en aquell punt
  const holeSeeds = [];
  for (let y = 6; y < height - 6; y += 2) {
    for (let x = 6; x < width - 6; x += 2) {
      const pos = y * width + x;
      if (mask[pos] === 255 && distMap[pos] < bgTolerance * 0.65) {
        let allBgLike = true;
        for (let dy = -1; dy <= 1 && allBgLike; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (distMap[(y + dy) * width + (x + dx)] > bgTolerance * 0.75) {
              allBgLike = false;
              break;
            }
          }
        }
        if (allBgLike) holeSeeds.push(pos);
      }
    }
  }

  const holeVisited = new Uint8Array(totalPixels);
  for (let s = 0; s < holeSeeds.length; s++) {
    const seed = holeSeeds[s];
    if (holeVisited[seed] || mask[seed] === 0) continue;
    let hHead = 0;
    let hTail = 0;
    queue[hTail++] = seed;
    holeVisited[seed] = 1;
    const component = [seed];

    while (hHead < hTail) {
      const curr = queue[hHead++];
      const cx = curr % width;
      const cy = (curr - cx) / width;
      const nbs = [
        cx > 0 ? curr - 1 : -1,
        cx < width - 1 ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy < height - 1 ? curr + width : -1,
      ];
      for (let k = 0; k < 4; k++) {
        const nb = nbs[k];
        if (nb < 0 || holeVisited[nb] || mask[nb] === 0) continue;
        if (distMap[nb] <= bgTolerance * 0.92) {
          holeVisited[nb] = 1;
          queue[hTail++] = nb;
          component.push(nb);
        }
      }
    }

    if (component.length >= Math.max(18, Math.round(totalPixels * 0.00085)) && component.length < totalPixels * 0.12) {
      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (let k = 0; k < component.length; k++) {
        const p = component[k];
        const px = p % width;
        const py = (p - px) / width;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const minHoleDim = Math.max(4, Math.round(Math.min(width, height) * 0.032));
      const fillRatio = component.length / (bw * bh);

      // Només buidem forats compactes i prou amplis (anella o forat del clauer), mai traços prims de lletres gravades
      if (bw >= minHoleDim && bh >= minHoleDim && fillRatio >= 0.52) {
        for (let k = 0; k < component.length; k++) {
          mask[component[k]] = 0;
        }
      }
    }
  }

  // Pas 3: Neteja de petites illes de soroll aïllades al fons (< 55 píxels)
  const fgVisited = new Uint8Array(totalPixels);
  const minComponentSize = Math.max(35, Math.round(totalPixels * 0.0005));
  for (let i = 0; i < totalPixels; i++) {
    if (mask[i] === 255 && !fgVisited[i]) {
      let fH = 0;
      let fT = 0;
      queue[fT++] = i;
      fgVisited[i] = 1;
      const comp = [i];
      while (fH < fT) {
        const curr = queue[fH++];
        const cx = curr % width;
        const cy = (curr - cx) / width;
        if (cx > 0 && mask[curr - 1] === 255 && !fgVisited[curr - 1]) {
          fgVisited[curr - 1] = 1;
          queue[fT++] = curr - 1;
          comp.push(curr - 1);
        }
        if (cx < width - 1 && mask[curr + 1] === 255 && !fgVisited[curr + 1]) {
          fgVisited[curr + 1] = 1;
          queue[fT++] = curr + 1;
          comp.push(curr + 1);
        }
        if (cy > 0 && mask[curr - width] === 255 && !fgVisited[curr - width]) {
          fgVisited[curr - width] = 1;
          queue[fT++] = curr - width;
          comp.push(curr - width);
        }
        if (cy < height - 1 && mask[curr + width] === 255 && !fgVisited[curr + width]) {
          fgVisited[curr + width] = 1;
          queue[fT++] = curr + width;
          comp.push(curr + width);
        }
      }
      if (comp.length < minComponentSize) {
        for (let k = 0; k < comp.length; k++) mask[comp[k]] = 0;
      }
    }
  }

  // Pas 4: Punts manuals d'esborrat de fons (inundació local acotada al color del punt clicat)
  const bgPoints = [
    ...(Array.isArray(settings.manualBgPoints) ? settings.manualBgPoints : []),
    ...(settings.manualSamplePoint ? [settings.manualSamplePoint] : []),
  ];
  for (let pIdx = 0; pIdx < bgPoints.length; pIdx++) {
    const pt = bgPoints[pIdx];
    if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') continue;
    const sx = Math.max(0, Math.min(width - 1, Math.round(pt.x * width)));
    const sy = Math.max(0, Math.min(height - 1, Math.round(pt.y * height)));
    const seedPos = sy * width + sx;
    const s4 = seedPos * 4;
    const sr = data[s4], sg = data[s4 + 1], sb = data[s4 + 2];
    const localTol = Math.max(14, bgTolerance * 0.85);

    const mVisited = new Uint8Array(totalPixels);
    let mH = 0, mT = 0;
    queue[mT++] = seedPos;
    mVisited[seedPos] = 1;

    while (mH < mT) {
      const curr = queue[mH++];
      mask[curr] = 0;
      const cx = curr % width;
      const cy = (curr - cx) / width;
      const nbs = [
        cx > 0 ? curr - 1 : -1,
        cx < width - 1 ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy < height - 1 ? curr + width : -1,
      ];
      for (let k = 0; k < 4; k++) {
        const nb = nbs[k];
        if (nb < 0 || mVisited[nb]) continue;
        const n4 = nb * 4;
        const d = pixelBgDistance(data[n4], data[n4 + 1], data[n4 + 2], sr, sg, sb, 0);
        if (d <= localTol) {
          mVisited[nb] = 1;
          queue[mT++] = nb;
        }
      }
    }
  }

  // Pas 5: Punts manuals de restauració de peça (inundació local per recuperar zones de la peça)
  const fgPoints = Array.isArray(settings.manualFgPoints) ? settings.manualFgPoints : [];
  for (let pIdx = 0; pIdx < fgPoints.length; pIdx++) {
    const pt = fgPoints[pIdx];
    if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') continue;
    const sx = Math.max(0, Math.min(width - 1, Math.round(pt.x * width)));
    const sy = Math.max(0, Math.min(height - 1, Math.round(pt.y * height)));
    const seedPos = sy * width + sx;
    const s4 = seedPos * 4;
    const sr = data[s4], sg = data[s4 + 1], sb = data[s4 + 2];
    const localTol = Math.max(18, bgTolerance * 0.95);

    const mVisited = new Uint8Array(totalPixels);
    let mH = 0, mT = 0;
    queue[mT++] = seedPos;
    mVisited[seedPos] = 1;

    while (mH < mT) {
      const curr = queue[mH++];
      mask[curr] = 255;
      const cx = curr % width;
      const cy = (curr - cx) / width;
      const nbs = [
        cx > 0 ? curr - 1 : -1,
        cx < width - 1 ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy < height - 1 ? curr + width : -1,
      ];
      for (let k = 0; k < 4; k++) {
        const nb = nbs[k];
        if (nb < 0 || mVisited[nb]) continue;
        const n4 = nb * 4;
        const d = pixelBgDistance(data[n4], data[n4 + 1], data[n4 + 2], sr, sg, sb, 0);
        if (d <= localTol) {
          mVisited[nb] = 1;
          queue[mT++] = nb;
        }
      }
    }
  }

  // Pas 6: Suavitzat de contorns (anti-aliasing / feathering) a la frontera entre peça i fons
  const refinedMask = new Uint8Array(mask);
  const featherRadius = Math.max(0, Math.min(6, Math.round(Number(settings.edgeFeather ?? 2))));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;
      if (mask[pos] === 255) {
        if (
          mask[pos - 1] === 0 ||
          mask[pos + 1] === 0 ||
          mask[pos - width] === 0 ||
          mask[pos + width] === 0
        ) {
          const d = distMap[pos];
          const ramp = Math.min(255, Math.max(60, Math.round(((d - bgTolerance * 0.5) / (bgTolerance * 0.7)) * 255)));
          refinedMask[pos] = ramp;
        }
      }
    }
  }

  if (featherRadius <= 0) return refinedMask;

  const smoothed = new Uint8Array(refinedMask);
  const r = Math.min(2, featherRadius);
  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const pos = y * width + x;
      const cVal = refinedMask[pos];
      if (
        cVal !== refinedMask[pos - 1] ||
        cVal !== refinedMask[pos + 1] ||
        cVal !== refinedMask[pos - width] ||
        cVal !== refinedMask[pos + width]
      ) {
        let sum = 0;
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          const rowOffset = (y + dy) * width;
          for (let dx = -r; dx <= r; dx++) {
            sum += refinedMask[rowOffset + x + dx];
            count++;
          }
        }
        smoothed[pos] = Math.round(sum / count);
      }
    }
  }

  return smoothed;
}

/**
 * Troba la caixa contenidora (Bounding Box) i el centre geomètric de la peça
 */
function findObjectBounds(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let fgCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[rowOffset + x] > 120) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        fgCount++;
      }
    }
  }

  if (fgCount < 25 || minX >= maxX || minY >= maxY) {
    return {
      minX: 0,
      minY: 0,
      maxX: width - 1,
      maxY: height - 1,
      objWidth: width,
      objHeight: height,
      centerX: width / 2,
      centerY: height / 2,
    };
  }

  const objWidth = maxX - minX + 1;
  const objHeight = maxY - minY + 1;
  return {
    minX,
    minY,
    maxX,
    maxY,
    objWidth,
    objHeight,
    centerX: minX + objWidth / 2,
    centerY: minY + objHeight / 2,
  };
}

/**
 * Compressió suau d'altes llums (Highlight Roll-Off) perquè la fusta de til·ler clara
 * no es cremi mai a blanc pur (255) ni es fongui amb el fons #E8E6E7.
 */
function applySoftToneChannel(val, contrastFactor, brightOffset, pivot = 120) {
  let v = contrastFactor * (val - pivot) + pivot + brightOffset;
  // Protecció d'altes llums per sobre de 190 (soft knee)
  if (v > 190 && contrastFactor > 1 && brightOffset >= 0) {
    const excess = v - 190;
    v = 190 + (62 * excess) / (excess + 62);
  }
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Millora de brillantor, contrast, calidesa i nitidesa sobre els píxels de la peça
 */
function enhanceObjectPixels(imageData, mask, settings) {
  const { width, height, data } = imageData;
  const brightness = Number(settings.brightness ?? 0); // -50 .. +50
  const contrast = Number(settings.contrast ?? 6);     // -50 .. +50
  const warmth = Number(settings.warmth ?? 2);         // -30 .. +30
  const sharpness = Number(settings.sharpness ?? 12);  // 0 .. 50

  // Si tots els paràmetres de retoc de llum estan a 0 ("Només Treure Fons"), no alterem cap píxel de la peça
  if (brightness === 0 && contrast === 0 && warmth === 0 && sharpness === 0) {
    return;
  }

  const cVal = contrast * 1.8;
  const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
  const brightOffset = brightness * 1.6;

  const origCopy = sharpness > 0 ? new Uint8ClampedArray(data) : null;
  const sharpAmount = (sharpness / 100) * 0.95;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const pos = rowOffset + x;
      const alpha = mask ? mask[pos] : 255;
      if (alpha === 0) continue;

      const idx = pos * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      // 1. Nitidesa local (realça les vetes de la fusta de til·ler i el gravat làser)
      if (origCopy && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const up = ((y - 1) * width + x) * 4;
        const dn = ((y + 1) * width + x) * 4;
        const lf = (rowOffset + x - 1) * 4;
        const rt = (rowOffset + x + 1) * 4;

        const blurR = (origCopy[up] + origCopy[dn] + origCopy[lf] + origCopy[rt]) * 0.25;
        const blurG = (origCopy[up + 1] + origCopy[dn + 1] + origCopy[lf + 1] + origCopy[rt + 1]) * 0.25;
        const blurB = (origCopy[up + 2] + origCopy[dn + 2] + origCopy[lf + 2] + origCopy[rt + 2]) * 0.25;

        r += (r - blurR) * sharpAmount;
        g += (g - blurG) * sharpAmount;
        b += (b - blurB) * sharpAmount;
      }

      // 2. Calidesa subtil per a la fusta de til·ler
      if (warmth !== 0) {
        r += warmth * 0.9;
        g += warmth * 0.3;
        b -= warmth * 0.85;
      }

      // 3. Contrast i brillantor amb protecció d'altes llums (pivot a 120 per protegir tons clars)
      data[idx]     = applySoftToneChannel(r, contrastFactor, brightOffset, 120);
      data[idx + 1] = applySoftToneChannel(g, contrastFactor, brightOffset, 120);
      data[idx + 2] = applySoftToneChannel(b, contrastFactor, brightOffset, 120);
    }
  }
}

/**
 * Carrega un File, Blob o URL d'imatge en un objecte HTMLImageElement
 */
export function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let objectUrl = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    if (source instanceof Blob || source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else if (typeof source === 'string') {
      img.src = source;
    } else {
      reject(new Error("Format d'imatge no suportat"));
    }
  });
}

/**
 * Processa una imatge seguint el protocol complet de Mínim Món:
 * - Format 1:1 (1000x1000 px)
 * - Objecte centrat automàticament
 * - Millora de brillantor, contrast i nitidesa de la peça (amb opció de mantenir 100% original)
 * - Fons eliminat i substituït pel color de la mostra (#E8E6E7) o transparent
 *
 * Retorna { dataUrl, blob, width, height, sizeBytes, bounds }
 */
export async function processMinimMonImage(source, customSettings = {}) {
  const settings = { ...DEFAULT_RETOUCH_SETTINGS, ...customSettings };
  const targetSize = Number(settings.targetSize) || DEFAULT_TARGET_SIZE;

  const img = await loadImageElement(source);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Escalem a una resolució de treball intermèdia màxima de 1200px per a rapidesa i precisió
  const maxWorkDim = 1200;
  let workW = srcW;
  let workH = srcH;
  if (Math.max(srcW, srcH) > maxWorkDim) {
    const ratio = maxWorkDim / Math.max(srcW, srcH);
    workW = Math.round(srcW * ratio);
    workH = Math.round(srcH * ratio);
  }

  const workCanvas = document.createElement('canvas');
  workCanvas.width = workW;
  workCanvas.height = workH;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = 'high';
  workCtx.drawImage(img, 0, 0, workW, workH);

  const workImageData = workCtx.getImageData(0, 0, workW, workH);

  // Pas 1: Calcular màscara de fons si està activat "Treure el fons"
  const mask = settings.removeBackground
    ? computeForegroundMask(workImageData, settings)
    : null;

  // Pas 2: Millorar brillantor, contrast i detall de la peça
  enhanceObjectPixels(workImageData, mask, settings);

  // Apliquem la màscara al canal Alpha de la imatge de treball
  if (mask) {
    const d = workImageData.data;
    for (let i = 0; i < mask.length; i++) {
      d[i * 4 + 3] = Math.min(d[i * 4 + 3], mask[i]);
    }
  }
  workCtx.putImageData(workImageData, 0, 0);

  // Pas 3: Detectar les coordenades de la peça per centrar-la en el format 1:1 (1000x1000)
  const bounds = mask && settings.autoCenterObject
    ? findObjectBounds(mask, workW, workH)
    : {
        minX: 0,
        minY: 0,
        maxX: workW - 1,
        maxY: workH - 1,
        objWidth: workW,
        objHeight: workH,
        centerX: workW / 2,
        centerY: workH / 2,
      };

  // Pas 4: Compondre el llenç final 1:1 de 1000x1000 píxels
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  // Pintar el fons amb el color de la mostra (#E8E6E7 per defecte) si no és transparent
  const isTransparent = Boolean(settings.transparentBg && settings.removeBackground);
  if (!isTransparent) {
    outCtx.fillStyle = settings.bgColorHex || DEFAULT_SWATCH_BG_HEX;
    outCtx.fillRect(0, 0, targetSize, targetSize);
  } else {
    outCtx.clearRect(0, 0, targetSize, targetSize);
  }

  // Calcular l'escala perquè l'objecte quedi centrat amb el marge desitjat
  const marginRatio = Math.max(0, Math.min(0.4, Number(settings.objectMarginPercent ?? 12) / 100));
  const usableBox = targetSize * (1 - marginRatio * 2);
  const maxObjDim = Math.max(bounds.objWidth, bounds.objHeight, 1);

  let scale = settings.autoCenterObject
    ? usableBox / maxObjDim
    : Math.max(targetSize / workW, targetSize / workH);

  scale *= Number(settings.zoomOffset || 1);

  const drawW = workW * scale;
  const drawH = workH * scale;

  const drawX = (targetSize / 2) - (bounds.centerX * scale) + Number(settings.panX || 0);
  const drawY = (targetSize / 2) - (bounds.centerY * scale) + Number(settings.panY || 0);

  outCtx.drawImage(workCanvas, drawX, drawY, drawW, drawH);

  // Pas 5: Exportar amb pes reduït a 1000x1000 px
  const mimeType = isTransparent
    ? 'image/png'
    : (settings.outputFormat === 'image/png' ? 'image/png' : (settings.outputFormat || 'image/jpeg'));
  const quality = mimeType === 'image/png' ? undefined : Number(settings.outputQuality || 0.88);

  const dataUrl = outCanvas.toDataURL(mimeType, quality);
  const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, mimeType, quality));
  const sizeBytes = blob ? blob.size : Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    blob,
    width: targetSize,
    height: targetSize,
    originalWidth: srcW,
    originalHeight: srcH,
    sizeBytes,
    mimeType,
    bounds,
  };
}

/**
 * Formata bytes en KB o MB llegibles
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
