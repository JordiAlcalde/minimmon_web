/**
 * Utilitats per a la gestió de tarifes d'enviament i configuració de Correos a Mínim Món.
 */

import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_SHIPPING_CONFIG = {
  cartaOrdinaria: {
    id: 'ordinari',
    nom: 'Carta Ordinària (Correos)',
    preu: 2.50,
    termini: '2 - 4 dies de trànsit',
    descripcio: 'Fins a 2 kg. Fàcil: estalvia temps i costos amb enviaments normalitzats.',
    actiu: true
  },
  cartaCertificada: {
    id: 'certificat',
    nom: 'Carta Certificada (Correos)',
    preu: 6.00,
    termini: '2 - 4 dies de trànsit',
    descripcio: 'Fins a 2 kg. Màxima confiança: identificat i registrat, entrega sota signatura i seguiment garantit.',
    actiu: true
  },
  recollida: {
    id: 'recollida',
    nom: 'Recollida / Entrega acordada',
    preu: 0.00,
    termini: 'A convenir',
    descripcio: 'Ens trobem en un punt acordat (sense despeses de transport).',
    actiu: true
  }
};

/**
 * Obté la configuració d'enviaments des de Firestore (config/enviaments) o fallback per defecte.
 */
export async function getShippingConfig() {
  try {
    const docRef = doc(db, "config", "enviaments");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        cartaOrdinaria: { ...DEFAULT_SHIPPING_CONFIG.cartaOrdinaria, ...(data.cartaOrdinaria || {}) },
        cartaCertificada: { ...DEFAULT_SHIPPING_CONFIG.cartaCertificada, ...(data.cartaCertificada || {}) },
        recollida: { ...DEFAULT_SHIPPING_CONFIG.recollida, ...(data.recollida || {}) }
      };
    }
  } catch (e) {
    console.warn("No s'ha pogut carregar la configuració d'enviaments de Firestore, emprant valors per defecte:", e);
  }

  // Fallback a localStorage si n'hi ha
  try {
    const local = localStorage.getItem('minimmon_shipping_config');
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {}

  return DEFAULT_SHIPPING_CONFIG;
}

/**
 * Desa la configuració d'enviaments a Firestore i localStorage.
 */
export async function saveShippingConfig(config) {
  try {
    localStorage.setItem('minimmon_shipping_config', JSON.stringify(config));
    const docRef = doc(db, "config", "enviaments");
    await setDoc(docRef, config, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error desant la configuració d'enviaments a Firestore:", e);
    return false;
  }
}

/**
 * Calcula el cost d'enviament segons el mètode seleccionat.
 * @param {string} metode - 'ordinari' | 'certificat' | 'recollida'
 * @param {Object} [customConfig]
 */
export function calculateShippingCost(metode, customConfig = DEFAULT_SHIPPING_CONFIG) {
  if (metode === 'ordinari') {
    return Number(customConfig?.cartaOrdinaria?.preu ?? 2.50);
  }
  if (metode === 'certificat') {
    return Number(customConfig?.cartaCertificada?.preu ?? 6.00);
  }
  return 0.00;
}
