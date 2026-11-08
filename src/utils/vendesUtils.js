import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { parseDecimal } from './numberUtils';

export const DEFAULT_VENDES_CONFIG = {
  emissor: {
    nomComercial: 'Mínim Món',
    raoSocial: 'Mínim Món · Taller Artesanal',
    nif: '',
    adreca: '',
    codiPostal: '',
    poblacio: '',
    provincia: '',
    pais: 'Espanya',
    telefon: '',
    email: '',
    web: 'www.minimmon.cat',
    iban: '',
    banc: ''
  },
  series: {
    prefixAlbara: 'ALB',
    prefixFactura: 'FAC',
    prefixRectificativa: 'REC',
    prefixComanda: 'CMD',
    prefixPressupost: 'PRE',
    reiniciarCadaAny: true
  },
  ivaPerDefecte: 21,
  peuFactura: 'Artesania d\'alta precisió en fusta de til·ler seleccionada · Mínim Món',
  terminiPagamentDies: 30
};

/**
 * Carrega la configuració fiscal i de sèries des de Firestore
 */
export async function getVendesConfig() {
  try {
    const snap = await getDoc(doc(db, "vendes_configuracio", "main"));
    if (snap.exists()) {
      return { ...DEFAULT_VENDES_CONFIG, ...snap.data() };
    }
  } catch (err) {
    console.warn("Error carregant configuració de vendes:", err);
  }
  return DEFAULT_VENDES_CONFIG;
}

/**
 * Desa la configuració fiscal a Firestore
 */
export async function saveVendesConfig(config) {
  try {
    await setDoc(doc(db, "vendes_configuracio", "main"), config, { merge: true });
    return true;
  } catch (err) {
    console.error("Error desant configuració de vendes:", err);
    throw err;
  }
}

/**
 * Genera el següent número seqüencial de document per a un any determinat
 * @param {'albara'|'factura'|'rectificativa'|'comanda'} tipus 
 * @param {Array} llistaDocuments 
 * @param {number} any 
 */
export function getNextDocumentNumber(tipus, llistaDocuments = [], any = new Date().getFullYear()) {
  let prefix = 'DOC';
  if (tipus === 'albara') prefix = 'ALB';
  else if (tipus === 'factura') prefix = 'FAC';
  else if (tipus === 'rectificativa') prefix = 'REC';
  else if (tipus === 'comanda') prefix = 'CMD';
  else if (tipus === 'pressupost') prefix = 'PRE';

  const anyStr = String(any);
  let maxSeq = 0;

  // Cerca tots els números que coincideixin amb PREFIX-ANY-XXXX o PREFIX-YY-XXXX
  const regex = new RegExp(`^${prefix}[-_](${anyStr}|${anyStr.slice(-2)})[-_](\\d+)$`, 'i');

  (llistaDocuments || []).forEach(docItem => {
    const numStr = String(docItem.numero || docItem.codi || docItem.id || '');
    const match = numStr.match(regex);
    if (match) {
      const seq = parseInt(match[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeqStr = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}-${anyStr}-${nextSeqStr}`;
}

/**
 * Calcula els totals i impostos d'un conjunt de línies de venda
 * @param {Array} linies - [{ quantitat, preuUnitari, descomptePercent }]
 * @param {number} costEnviament 
 * @param {number} ivaPercent 
 */
export function calcularTotalsVenda(linies = [], costEnviament = 0, ivaPercent = 21) {
  let baseArticles = 0;

  (linies || []).forEach(l => {
    const qty = parseDecimal(l.quantitat, 1);
    const preu = parseDecimal(l.preuUnitari, 0);
    const dsc = parseDecimal(l.descomptePercent, 0);
    const subtotalLinia = qty * preu * (1 - (dsc / 100));
    baseArticles += subtotalLinia;
  });

  const enviament = parseDecimal(costEnviament, 0);
  const baseImposable = Math.round((baseArticles + enviament) * 100) / 100;
  const pctIva = parseDecimal(ivaPercent, 21);
  const importIva = Math.round((baseImposable * (pctIva / 100)) * 100) / 100;
  const total = Math.round((baseImposable + importIva) * 100) / 100;

  return {
    baseArticles: Math.round(baseArticles * 100) / 100,
    costEnviament: enviament,
    baseImposable,
    ivaPercent: pctIva,
    importIva,
    total
  };
}

