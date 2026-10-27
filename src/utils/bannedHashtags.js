import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export const BANNED_HASHTAGS_STORAGE_KEY = 'minimmon_banned_hashtags';
export const BANNED_HASHTAGS_CHANGED_EVENT = 'minimmon_banned_hashtags_changed';

/**
 * Hashtags vetats inicials per defecte (no es poden fer servir mai tret que es retirin explícitament)
 */
export const DEFAULT_BANNED_HASHTAGS = [
  '#MiniaturesEnFusta',
  '#MiniaturesAmbÀnima',
  '#FustaDeBedoll'
];

/**
 * Normalitza un hashtag per a comparacions insensibles a majúscules/minúscules, diacrítics i '#'
 */
export function normalizeTag(tag = '') {
  if (!tag) return '';
  return String(tag)
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Comprova si un hashtag concret està dins de la llista de vetats
 */
export function isHashtagBanned(tag, bannedList = DEFAULT_BANNED_HASHTAGS) {
  if (!tag) return false;
  const normalized = normalizeTag(tag);
  if (!normalized) return false;
  return (bannedList || DEFAULT_BANNED_HASHTAGS).some(banned => normalizeTag(banned) === normalized);
}

/**
 * Troba quins hashtags vetats apareixen dins d'un text determinat
 * @returns {string[]} Array amb els hashtags prohibits trobats al text
 */
export function findBannedHashtagsInText(text = '', bannedList = DEFAULT_BANNED_HASHTAGS) {
  if (!text || typeof text !== 'string') return [];
  // Regex que captura qualsevol hashtag amb caràcters alfanumèrics catalans/castellans
  const tagRegex = /#([a-zA-Z0-9_àèéíòóúç·ÀÈÉÍÒÓÚÇ]+)/g;
  const found = [];
  let match;
  const list = (bannedList && bannedList.length > 0) ? bannedList : DEFAULT_BANNED_HASHTAGS;
  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    if (isHashtagBanned(fullTag, list) && !found.includes(fullTag)) {
      found.push(fullTag);
    }
  }
  return found;
}

/**
 * Elimina automàticament tots els hashtags vetats d'un text (copy, descripció, etc.)
 */
export function filterBannedHashtagsFromText(text = '', bannedList = DEFAULT_BANNED_HASHTAGS) {
  if (!text || typeof text !== 'string') return '';
  const list = (bannedList && bannedList.length > 0) ? bannedList : DEFAULT_BANNED_HASHTAGS;
  
  // Regex que busca qualsevol hashtag i l'elimina si coincideix amb un de la llista de vetats
  const tagRegex = /#([a-zA-Z0-9_àèéíòóúç·ÀÈÉÍÒÓÚÇ]+)/g;
  let cleaned = text.replace(tagRegex, (matched) => {
    if (isHashtagBanned(matched, list)) {
      return '';
    }
    return matched;
  });

  // Neteja espais dobles sobrants i línies buides consecutives derivades d'eliminar el hashtag
  cleaned = cleaned
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Llegeix la llista actual de hashtags vetats des de localStorage amb fallback als per defecte
 */
export function getStoredBannedHashtags() {
  if (typeof window === 'undefined') return DEFAULT_BANNED_HASHTAGS;
  try {
    const raw = localStorage.getItem(BANNED_HASHTAGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_BANNED_HASHTAGS;
}

/**
 * Desa la llista de hashtags vetats tant a localStorage com a Firestore per a sincronització persistent
 */
export async function saveBannedHashtags(list) {
  if (!Array.isArray(list)) return;
  // Format consistent amb '#' al davant
  const formatted = list
    .map(t => String(t).trim())
    .filter(Boolean)
    .map(t => t.startsWith('#') ? t : `#${t}`);

  // 1. Guardar a localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BANNED_HASHTAGS_STORAGE_KEY, JSON.stringify(formatted));
      window.dispatchEvent(new CustomEvent(BANNED_HASHTAGS_CHANGED_EVENT, { detail: formatted }));
    } catch (_) {}
  }

  // 2. Sincronitzar amb Firestore
  try {
    await setDoc(doc(db, 'config', 'posting_hashtags'), {
      bannedHashtags: formatted,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Avís guardant hashtags vetats a Firestore:', err);
  }
}

/**
 * Subscriu-te als canvis en temps real de Firestore i localStorage
 */
export function subscribeToBannedHashtags(callback) {
  // Callback inicial amb dades locals
  callback(getStoredBannedHashtags());

  // Listener local per canvis a la mateixa pestanya o finestra
  const handleLocal = (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      callback(e.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(BANNED_HASHTAGS_CHANGED_EVENT, handleLocal);
  }

  // Listener Firestore en temps real
  const unsubFirestore = onSnapshot(doc(db, 'config', 'posting_hashtags'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.bannedHashtags) && data.bannedHashtags.length > 0) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(BANNED_HASHTAGS_STORAGE_KEY, JSON.stringify(data.bannedHashtags));
          } catch (_) {}
        }
        callback(data.bannedHashtags);
      }
    } else {
      // Si encara no existeix a Firestore, inicialitzem-lo amb els per defecte
      saveBannedHashtags(DEFAULT_BANNED_HASHTAGS);
    }
  }, (err) => {
    console.warn('Avís escoltant hashtags vetats de Firestore:', err);
  });

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(BANNED_HASHTAGS_CHANGED_EVENT, handleLocal);
    }
    unsubFirestore();
  };
}
