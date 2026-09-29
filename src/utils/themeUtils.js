import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const THEME_STORAGE_KEY = 'minimmon_default_theme';
export const THEME_OVERRIDE_PREFIX = 'theme_override_';
export const THEME_CHANGED_EVENT = 'minimmon_theme_changed';

/**
 * Retorna el mode per defecte emmagatzemat a localStorage ('light' o 'dark').
 * Si no hi ha res definit prèviament, per defecte s'utilitza 'dark'.
 */
export const getDefaultTheme = () => {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark') return val;
  } catch (e) {
    console.warn("Error llegint THEME_STORAGE_KEY:", e);
  }
  return 'dark';
};

/**
 * Retorna el mode efectiu per a una pantalla concreta:
 * 1. Si l'usuari ha canviat expressament el mode en aquesta pantalla durant la sessió actual (sessionStorage), retorna aquest.
 * 2. Si no, retorna el mode global per defecte de l'aplicació.
 */
export const getScreenTheme = (screenKey) => {
  try {
    if (screenKey) {
      const override = sessionStorage.getItem(`${THEME_OVERRIDE_PREFIX}${screenKey}`);
      if (override === 'light' || override === 'dark') {
        return override;
      }
    }
  } catch (e) {
    console.warn("Error llegint override de tema per a pantalla:", screenKey, e);
  }
  return getDefaultTheme();
};

/**
 * Desa l'elecció particular d'una pantalla per a la sessió de treball actual
 */
export const setScreenTheme = (screenKey, theme) => {
  try {
    if (screenKey) {
      sessionStorage.setItem(`${THEME_OVERRIDE_PREFIX}${screenKey}`, theme);
    }
  } catch (e) {
    console.warn("Error desant override de tema:", e);
  }
};

/**
 * Neteja l'override d'una pantalla específica
 */
export const clearScreenThemeOverride = (screenKey) => {
  try {
    if (screenKey) {
      sessionStorage.removeItem(`${THEME_OVERRIDE_PREFIX}${screenKey}`);
    }
  } catch (e) {}
};

/**
 * Desa la nova configuració global per defecte a Firestore i localStorage,
 * i notifica totes les pantalles que no tinguin override actiu.
 */
export const saveDefaultTheme = async (newTheme) => {
  if (newTheme !== 'light' && newTheme !== 'dark') return false;

  // 1. Desa a localStorage
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch (e) {}

  // 2. Dispara event global per sincronitzar components oberts
  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: newTheme }));
  } catch (e) {}

  // 3. Desa a Firestore per persistir entre dispositius
  try {
    await setDoc(doc(db, "config", "theme"), {
      defaultTheme: newTheme,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error("Error desant tema per defecte a Firestore:", e);
    return false;
  }
};

/**
 * Carrega la configuració inicial de Firestore (si existeix)
 */
export const fetchDefaultThemeFromFirestore = async () => {
  try {
    const snap = await getDoc(doc(db, "config", "theme"));
    if (snap.exists() && snap.data()?.defaultTheme) {
      const val = snap.data().defaultTheme;
      if (val === 'light' || val === 'dark') {
        localStorage.setItem(THEME_STORAGE_KEY, val);
        return val;
      }
    }
  } catch (e) {
    console.warn("Error llegint tema de Firestore:", e);
  }
  return getDefaultTheme();
};
