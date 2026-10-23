/**
 * postingScheduleService.js
 * Servei de gestió de planificació de publicacions a Firestore per a MínimMón.
 * Gestiona el calendari editorial, la persistència de composicions, la distribució de dates
 * i els criteris de contingut equilibrat.
 */

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { sendTelegramPostingReminder } from '../utils/telegramUtils';

export const POSTING_SCHEDULE_COLLECTION = 'posting_planificacio';

export const POST_CONTENT_TYPES = [
  { id: 'producte', label: 'Producte', icon: '🪵', color: '#B45309', bgLight: '#FEF3C7', border: '#FDE68A' },
  { id: 'projecte', label: 'Projecte Atelier', icon: '🎨', color: '#9A3412', bgLight: '#FFEDD5', border: '#FED7AA' },
  { id: 'esdeveniment', label: 'Esdeveniment / Fira', icon: '🎪', color: '#6D28D9', bgLight: '#EDE9FE', border: '#DDD6FE' },
  { id: 'novetat', label: 'Novetat / Notícia', icon: '📣', color: '#0369A1', bgLight: '#E0F2FE', border: '#BAE6FD' },
  { id: 'filosofia', label: 'Filosofia & Taller', icon: '🌿', color: '#047857', bgLight: '#D1FAE5', border: '#A7F3D0' }
];

export const DEFAULT_CADENCE_DAYS = [2, 4]; // 2: Dimarts, 4: Dijous

// Festius habituals a Catalunya (format MM-DD)
export const FIXED_CATALAN_HOLIDAYS = [
  '01-01', // Cap d'Any
  '01-06', // Reis
  '05-01', // Dia del Treball
  '06-24', // Sant Joan
  '08-15', // L'Assumpció
  '09-11', // Diada Nacional
  '10-12', // Festa Nacional
  '11-01', // Tots Sants
  '12-06', // Constitució
  '12-08', // Immaculada
  '12-25', // Nadal
  '12-26'  // Sant Esteve
];

/**
 * Comprova si una data (YYYY-MM-DD) és festiva
 */
export function isHoliday(dateStr) {
  if (!dateStr) return false;
  const monthDay = dateStr.substring(5, 10);
  return FIXED_CATALAN_HOLIDAYS.includes(monthDay);
}

/**
 * Converteix un objecte Date o string en format YYYY-MM-DD
 */
export function formatDateISO(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula la següent data òptima de publicació lliure
 * respectant els dies de cadència (ex: dimarts i dijous), evitant festius i dies ja ocupats.
 */
export function getNextRecommendedDate(existingPosts = [], preferredDays = DEFAULT_CADENCE_DAYS, fromDate = null) {
  const occupiedDates = new Set(
    existingPosts
      .filter(p => p.estat !== 'publicada' && p.dataPublicacio)
      .map(p => p.dataPublicacio)
  );

  let current = fromDate ? new Date(fromDate) : new Date();
  // Comencem a buscar a partir de demà
  current.setDate(current.getDate() + 1);

  // Busquem fins a un màxim de 60 dies endavant
  for (let i = 0; i < 60; i++) {
    const dayOfWeek = current.getDay(); // 0: Dg, 1: Dl, 2: Dm, 3: Dx, 4: Dj, 5: Dv, 6: Ds
    const dateStr = formatDateISO(current);

    if (
      preferredDays.includes(dayOfWeek) &&
      !isHoliday(dateStr) &&
      !occupiedDates.has(dateStr)
    ) {
      return dateStr;
    }

    current.setDate(current.getDate() + 1);
  }

  // Fallback si no troba forat
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 2);
  return formatDateISO(fallback);
}

/**
 * Subscripció en temps real a totes les publicacions planificades
 */
export function subscribeScheduledPosts(onUpdate, onError) {
  const q = query(
    collection(db, POSTING_SCHEDULE_COLLECTION),
    orderBy('dataPublicacio', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onUpdate(posts);
    },
    (err) => {
      console.error("Error carregant publicacions planificades de Firestore:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Neteja recursiva per eliminar qualsevol camp 'undefined' abans de desar a Firestore
 */
function cleanForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(x => x !== undefined);
  }
  if (typeof obj === 'object') {
    // Si és un FieldValue de Firestore com serverTimestamp, mantenir-lo intacte
    if (obj.toDate || obj._methodName || (obj.constructor && obj.constructor.name === 'FieldValue')) {
      return obj;
    }
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res;
  }
  return obj;
}

function sanitizeLayers(layers) {
  if (!Array.isArray(layers)) return [];
  return layers.map((l, i) => ({
    id: l.id || `layer-${i + 1}`,
    name: l.name || `Capa ${i + 1}`,
    enabled: Boolean(l.enabled),
    text: l.text || '',
    fontId: l.fontId || 'caveat',
    fontName: l.fontName || 'Caveat',
    fontFamily: l.fontFamily || "'Caveat', cursive",
    fontSize: Number(l.fontSize) || 34,
    maxWidthPercent: Number(l.maxWidthPercent) || 58,
    textColor: l.textColor || '#FFFFFF',
    bgColor: l.bgColor || '#3D2B1F',
    bgOpacity: Number(l.bgOpacity ?? 80),
    x: Number(l.x ?? 50),
    y: Number(l.y ?? 28)
  }));
}

/**
 * Assegura que una imatge en Base64 no superi la mida recomanada (~40-60KB per foto)
 * per garantir que carrusels multifoto mai excedeixin el límit estricte d'1 MiB de Firestore.
 */
async function compressDataUrlIfNeeded(dataUrl, maxDim = 800, quality = 0.65) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  // Si ja és una imatge ultra lleugera (< 45KB), no cal recomprimir
  if (dataUrl.length < 45000) {
    return dataUrl;
  }
  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }
  return dataUrl;
}

/**
 * Desa o actualitza una publicació planificada a Firestore
 */
export async function saveScheduledPost(postData) {
  try {
    const colRef = collection(db, POSTING_SCHEDULE_COLLECTION);
    const now = serverTimestamp();
    const isCarousel = postData.postMode === 'carousel' || postData.postMode === 'carrusel';

    // Per a carrusels, la foto d'arrel només és una miniatura del calendari (max 360px ~10KB)
    // per evitar duplicar pes inútilment amb les diapositives
    const rootMaxDim = isCarousel ? 360 : 800;
    const rootQuality = isCarousel ? 0.60 : 0.65;
    const compressedPhotoUrl = await compressDataUrlIfNeeded(postData.photoUrl || '', rootMaxDim, rootQuality);

    // Comprimir fotos de les diapositives
    let processedSlides = [];
    if (Array.isArray(postData.slides)) {
      processedSlides = await Promise.all(
        postData.slides.map(async (s, idx) => ({
          id: s.id || `slide-${idx + 1}`,
          title: s.title || '',
          subtitle: s.subtitle || '',
          photoUrl: await compressDataUrlIfNeeded(s.photoUrl || '', 800, 0.65),
          tagText: s.tagText || '',
          imageFit: s.imageFit || 'cover',
          blurIntensity: s.blurIntensity !== undefined ? Number(s.blurIntensity) : 35,
          showTag: s.showTag !== undefined ? Boolean(s.showTag) : true,
          showLogo: s.showLogo !== undefined ? Boolean(s.showLogo) : true,
          customLayers: sanitizeLayers(s.customLayers)
        }))
      );
    }

    // Dades netes que es desen
    const rawPayload = {
      dataPublicacio: postData.dataPublicacio || formatDateISO(new Date()),
      horaPublicacio: postData.horaPublicacio || '10:00',
      estat: postData.estat || 'pendent', // 'pendent' | 'publicada'
      tipus: postData.tipus || 'producte',
      notes: postData.notes || '',
      notificatTelegram: Boolean(postData.notificatTelegram),

      // Contingut visual del disseny
      format: postData.format || '4:5',
      template: postData.template || 'atelier',
      title: postData.title || '',
      subtitle: postData.subtitle || '',
      tagText: postData.tagText || '',
      priceText: postData.priceText || '',
      showTag: postData.showTag !== undefined ? Boolean(postData.showTag) : true,
      showPrice: postData.showPrice !== undefined ? Boolean(postData.showPrice) : false,
      photoUrl: compressedPhotoUrl,
      imageFit: postData.imageFit || 'cover',
      blurIntensity: postData.blurIntensity !== undefined ? Number(postData.blurIntensity) : 35,
      headerSlogan: postData.headerSlogan || 'Espais en miniatura',

      // Capes de text lliures (Capa 1 i Capa 2)
      customLayers: sanitizeLayers(postData.customLayers),
      textScale: postData.textScale !== undefined ? Number(postData.textScale) : 1,

      // Mode carrusel ('carousel' | 'single')
      postMode: (postData.postMode === 'carousel' || postData.postMode === 'carrusel') ? 'carousel' : (postData.postMode || 'single'),
      slides: processedSlides,

      // Text de redacció (Copy d'Instagram)
      copyText: postData.copyText || '',
      freeTopic: postData.freeTopic || '',
      sourceType: postData.sourceType || 'productes',
      selectedItemId: postData.selectedItemId || null,

      updatedAt: now
    };

    const payload = cleanForFirestore(rawPayload);

    if (postData.id) {
      // Edició existent
      const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, postData.id);
      await setDoc(docRef, payload, { merge: true });
      return postData.id;
    } else {
      // Nova creació
      payload.createdAt = now;
      const newDoc = await addDoc(colRef, payload);
      return newDoc.id;
    }
  } catch (error) {
    console.error("Error desant publicació a Firestore:", error);
    throw error;
  }
}

/**
 * Elimina una publicació planificada
 */
export async function deleteScheduledPost(id) {
  if (!id) return;
  const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Canvia ràpidament la data i opcionalment l'hora d'una publicació,
 * reiniciant l'avís automàtic de Telegram per a la nova data
 */
export async function updatePostDate(id, newDate, newTime = null) {
  if (!id || !newDate) return;
  const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, id);
  const updateData = {
    dataPublicacio: newDate,
    notificatTelegram: false,
    updatedAt: serverTimestamp()
  };
  if (newTime !== null) {
    updateData.horaPublicacio = newTime;
  }
  await updateDoc(docRef, updateData);
}

/**
 * Canvia l'estat d'una publicació ('pendent' o 'publicada')
 */
export async function togglePostStatus(id, currentStatus) {
  if (!id) return;
  const nextStatus = currentStatus === 'publicada' ? 'pendent' : 'publicada';
  const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, id);
  await updateDoc(docRef, {
    estat: nextStatus,
    updatedAt: serverTimestamp()
  });
  return nextStatus;
}

/**
 * Desplaça en cascada totes les publicacions pendents a partir d'una data
 * (útil si apareix una publicació imprevista i es vol moure tota la cua)
 */
export async function shiftPendingPostsInCascade(posts, fromDate, daysToAdd = 2) {
  if (!Array.isArray(posts) || !fromDate) return 0;

  const postsToShift = posts.filter(p => 
    p.estat !== 'publicada' && 
    p.dataPublicacio && 
    p.dataPublicacio >= fromDate
  );

  let updatedCount = 0;
  for (const p of postsToShift) {
    const d = new Date(p.dataPublicacio);
    d.setDate(d.getDate() + Number(daysToAdd));
    const newDateStr = formatDateISO(d);

    const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, p.id);
    await updateDoc(docRef, {
      dataPublicacio: newDateStr,
      updatedAt: serverTimestamp()
    });
    updatedCount++;
  }

  return updatedCount;
}

/**
 * Analitza l'equilibri de continguts (mix editorial) dels darrers posts
 */
export function analyzeEditorialMix(posts = []) {
  const counts = {
    producte: 0,
    projecte: 0,
    esdeveniment: 0,
    novetat: 0,
    filosofia: 0
  };

  posts.forEach(p => {
    if (counts[p.tipus] !== undefined) {
      counts[p.tipus]++;
    }
  });

  const total = posts.length;
  // Identifiquem quina categoria està menys representada
  let minCategory = 'projecte';
  let minCount = Infinity;
  Object.entries(counts).forEach(([cat, cnt]) => {
    if (cnt < minCount) {
      minCount = cnt;
      minCategory = cat;
    }
  });

  return {
    counts,
    total,
    suggestedNextType: minCategory
  };
}

/**
 * Comprova si hi ha publicacions programades que han assolit el seu dia i hora
 * i que encara no han estat notificades per Telegram, enviant l'avís automàticament
 * i marcant-les a Firestore per no duplicar mai l'enviament.
 * @param {Array} posts - Llista de publicacions planificades de Firestore
 * @returns {Promise<number>} - Nombre d'avisos enviats
 */
export async function checkAndNotifyDuePostingSchedules(posts = []) {
  if (!Array.isArray(posts) || posts.length === 0) return 0;

  const now = Date.now();
  let count = 0;

  for (const post of posts) {
    // Només posts pendents i no notificats anteriorment
    if (!post || post.estat === 'publicada' || post.notificatTelegram) continue;
    if (!post.dataPublicacio) continue;

    const hora = post.horaPublicacio || '10:00';
    const [h, m] = hora.split(':').map(Number);
    const [year, month, day] = post.dataPublicacio.split('-').map(Number);

    const postDate = new Date(year, month - 1, day, h || 10, m || 0, 0);
    const postTime = postDate.getTime();

    // Marge de seguretat de fins a 7 dies per si l'ordinador ha estat apagat
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    if (now >= postTime && postTime >= sevenDaysAgo) {
      try {
        console.log(`[Posting Schedule] Enviant avís automàtic per al post: "${post.title || post.id}" (${post.dataPublicacio} ${hora}h)`);
        const ok = await sendTelegramPostingReminder({ post });
        if (ok && post.id) {
          const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, post.id);
          await updateDoc(docRef, {
            notificatTelegram: true,
            dataNotificatTelegram: new Date().toISOString()
          });
          count++;
          console.log(`[Posting Schedule] Avís automàtic enviat i registrat amb èxit per a "${post.title || post.id}"`);
        }
      } catch (err) {
        console.warn(`[Posting Schedule] Error enviant avís automàtic a Telegram:`, err);
      }
    }
  }

  return count;
}

