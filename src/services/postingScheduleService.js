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
 * Desa o actualitza una publicació planificada a Firestore
 */
export async function saveScheduledPost(postData) {
  try {
    const colRef = collection(db, POSTING_SCHEDULE_COLLECTION);
    const now = serverTimestamp();

    // Dades netes que es desen
    const payload = {
      dataPublicacio: postData.dataPublicacio || formatDateISO(new Date()),
      horaPublicacio: postData.horaPublicacio || '10:00',
      estat: postData.estat || 'pendent', // 'pendent' | 'publicada'
      tipus: postData.tipus || 'producte',
      notes: postData.notes || '',
      notificatTelegram: postData.notificatTelegram || false,

      // Contingut visual del disseny
      format: postData.format || '4:5',
      template: postData.template || 'atelier',
      title: postData.title || '',
      subtitle: postData.subtitle || '',
      tagText: postData.tagText || '',
      priceText: postData.priceText || '',
      showTag: postData.showTag !== undefined ? postData.showTag : true,
      showPrice: postData.showPrice !== undefined ? postData.showPrice : false,
      photoUrl: postData.photoUrl || '',
      imageFit: postData.imageFit || 'cover',
      blurIntensity: postData.blurIntensity !== undefined ? postData.blurIntensity : 35,
      headerSlogan: postData.headerSlogan || 'Espais en miniatura',

      // Capes de text lliures (Capa 1 i Capa 2)
      customLayers: Array.isArray(postData.customLayers) ? postData.customLayers : [],
      textScale: postData.textScale !== undefined ? postData.textScale : 1,

      // Mode carrusel
      postMode: postData.postMode || 'single',
      slides: Array.isArray(postData.slides) ? postData.slides : [],

      // Text de redacció (Copy d'Instagram)
      copyText: postData.copyText || '',
      freeTopic: postData.freeTopic || '',
      sourceType: postData.sourceType || 'productes',
      selectedItemId: postData.selectedItemId || null,

      updatedAt: now
    };

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
 * Canvia ràpidament la data d'una publicació
 */
export async function updatePostDate(id, newDate) {
  if (!id || !newDate) return;
  const docRef = doc(db, POSTING_SCHEDULE_COLLECTION, id);
  await updateDoc(docRef, {
    dataPublicacio: newDate,
    updatedAt: serverTimestamp()
  });
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
