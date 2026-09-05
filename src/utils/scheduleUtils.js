/**
 * Utilitats per a la gestió de la programació temporal de productes i projectes a Mínim Món.
 */

import { sendTelegramScheduleNotification } from './telegramUtils';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Avalua l'estat de programació d'un element (producte o projecte).
 * @param {Object} item - Producte o projecte
 * @param {Date} [currentDate] - Data de referència (per defecte Date.now())
 * @returns {Object} Estat calculat
 */
export function getItemScheduleStatus(item, currentDate = new Date()) {
  if (!item) {
    return {
      isVisible: false,
      isProperament: false,
      isOferta: false,
      isArxivat: false,
      preuEfectiu: null,
      badgeText: null,
      badgeColor: null,
      scheduledSummary: null,
      rawStatus: 'inactiu'
    };
  }

  // 1. Si el producte o projecte no està actiu globalment, no es mostra mai
  if (item.actiu === false) {
    return {
      isVisible: false,
      isProperament: false,
      isOferta: false,
      isArxivat: false,
      preuEfectiu: item.preu ?? null,
      badgeText: 'Inactiu',
      badgeColor: 'gray',
      scheduledSummary: null,
      rawStatus: 'inactiu'
    };
  }

  const prog = item.programacio;

  // 2. Si no té programació activa, es regeix únicament pel camp esborrany
  if (!prog || !prog.activa) {
    const isEsborrany = item.esborrany === true;
    return {
      isVisible: !isEsborrany,
      isProperament: false,
      isOferta: false,
      isArxivat: false,
      preuEfectiu: item.preu ?? null,
      badgeText: isEsborrany ? 'Esborrany' : null,
      badgeColor: isEsborrany ? 'amber' : null,
      scheduledSummary: null,
      rawStatus: isEsborrany ? 'esborrany' : 'publicat'
    };
  }

  // 3. Amb programació temporal activa
  const now = currentDate instanceof Date ? currentDate.getTime() : new Date(currentDate).getTime();
  const startTime = prog.dataInici ? new Date(prog.dataInici).getTime() : null;
  const endTime = prog.dataFi ? new Date(prog.dataFi).getTime() : null;

  const tipus = prog.tipus || 'llancament';
  const modePrevi = prog.modePrevi || 'ocult'; // 'ocult' (esborrany) o 'properament'
  const accioFinal = prog.accioFinal || 'esborrany'; // 'esborrany' o 'arxivat'

  // A) Abans de la data d'inici
  if (startTime && now < startTime) {
    const dataFormatted = formatShortDateTime(prog.dataInici);
    if (modePrevi === 'properament') {
      return {
        isVisible: true,
        isProperament: true,
        isOferta: false,
        isArxivat: false,
        preuEfectiu: item.preu ?? null,
        badgeText: `Properament (${dataFormatted})`,
        badgeColor: 'indigo',
        scheduledSummary: `Llançament programat per al ${dataFormatted}`,
        rawStatus: 'properament'
      };
    }

    // Ocult / esborrany abans del llançament
    return {
      isVisible: false,
      isProperament: false,
      isOferta: false,
      isArxivat: false,
      preuEfectiu: item.preu ?? null,
      badgeText: `Programat (${dataFormatted})`,
      badgeColor: 'purple',
      scheduledSummary: `S'activarà el ${dataFormatted}`,
      rawStatus: 'programat_futur'
    };
  }

  // B) Dins del període actiu (o a partir de data d'inici si és llançament)
  const isWithinPeriod = !endTime || now <= endTime;
  if (isWithinPeriod) {
    const hasSpecialPrice = prog.preuOferta !== undefined && prog.preuOferta !== null && prog.preuOferta !== '' && Number(prog.preuOferta) > 0;
    const dataFiFormatted = endTime ? formatShortDateTime(prog.dataFi) : null;

    return {
      isVisible: true,
      isProperament: false,
      isOferta: hasSpecialPrice,
      isArxivat: false,
      preuEfectiu: hasSpecialPrice ? Number(prog.preuOferta) : (item.preu ?? null),
      badgeText: hasSpecialPrice 
        ? (dataFiFormatted ? `Oferta fins al ${dataFiFormatted}` : 'Oferta especial')
        : (dataFiFormatted ? `Campanya fins al ${dataFiFormatted}` : 'Publicat'),
      badgeColor: hasSpecialPrice ? 'emerald' : 'emerald',
      scheduledSummary: dataFiFormatted ? `Actiu fins al ${dataFiFormatted}` : 'Llançament efectuat',
      rawStatus: 'actiu_programat'
    };
  }

  // C) Després de la data de finalització
  const dataFiFormatted = formatShortDateTime(prog.dataFi);
  if (accioFinal === 'arxivat') {
    return {
      isVisible: true,
      isProperament: false,
      isOferta: false,
      isArxivat: true,
      preuEfectiu: item.preu ?? null,
      badgeText: 'Fora de temporada',
      badgeColor: 'stone',
      scheduledSummary: `Campanya finalitzada el ${dataFiFormatted}`,
      rawStatus: 'arxivat'
    };
  }

  // Per defecte en acabar: torna a esborrany (ocult al públic)
  return {
    isVisible: false,
    isProperament: false,
    isOferta: false,
    isArxivat: false,
    preuEfectiu: item.preu ?? null,
    badgeText: 'Finalitzat (Esborrany)',
    badgeColor: 'amber',
    scheduledSummary: `Finalitzat el ${dataFiFormatted}`,
    rawStatus: 'finalitzat_esborrany'
  };
}

/**
 * Formata una data ISO o YYYY-MM-DDTHH:mm a format català curt (DD/MM/YYYY HH:mm o DD/MM HH:mm)
 */
export function formatShortDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return dateTimeStr;
  }
}

/**
 * Comprova els elements programats i envia notificació a Telegram si s'acaba d'activar o finalitzar
 * i actualitza la marca a Firestore per no repetir-ho.
 * @param {Array} items - Llista de productes o projectes
 * @param {string} collectionName - 'productes' o 'projects'
 * @param {string} tipusItem - 'producte' o 'projecte'
 */
export async function syncAndCheckScheduleNotifications(items, collectionName, tipusItem = 'producte') {
  if (!Array.isArray(items) || items.length === 0) return;

  const now = Date.now();

  for (const item of items) {
    const prog = item.programacio;
    if (!prog || !prog.activa || !prog.notificarTelegram) continue;

    const startTime = prog.dataInici ? new Date(prog.dataInici).getTime() : null;
    const endTime = prog.dataFi ? new Date(prog.dataFi).getTime() : null;

    // 1. Notificació d'activació / inici de campanya
    if (startTime && now >= startTime && !prog.notificatInici) {
      const isStillBeforeEnd = !endTime || now <= endTime;
      if (isStillBeforeEnd) {
        try {
          await sendTelegramScheduleNotification({
            itemNom: item.nom || item.titol || 'Element sense nom',
            tipusItem,
            eventTipus: prog.tipus === 'periode' ? 'campanya_iniciada' : 'llancament_activat',
            dataInici: prog.dataInici,
            dataFi: prog.dataFi,
            preu: item.preu,
            preuOferta: prog.preuOferta
          });

          // Marcar a Firestore que s'ha notificat
          if (item.id) {
            const itemRef = doc(db, collectionName, item.id);
            await updateDoc(itemRef, {
              'programacio.notificatInici': true
            });
          }
        } catch (err) {
          console.warn(`Error enviant notificació d'inici per a ${item.nom}:`, err);
        }
      }
    }

    // 2. Notificació de finalització de campanya
    if (endTime && now > endTime && !prog.notificatFi) {
      try {
        await sendTelegramScheduleNotification({
          itemNom: item.nom || item.titol || 'Element sense nom',
          tipusItem,
          eventTipus: 'campanya_finalitzada',
          dataInici: prog.dataInici,
          dataFi: prog.dataFi,
          accioFinal: prog.accioFinal
        });

        // Marcar a Firestore que s'ha notificat
        if (item.id) {
          const itemRef = doc(db, collectionName, item.id);
          await updateDoc(itemRef, {
            'programacio.notificatFi': true
          });
        }
      } catch (err) {
        console.warn(`Error enviant notificació de finalització per a ${item.nom}:`, err);
      }
    }
  }
}
