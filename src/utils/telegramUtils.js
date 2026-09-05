import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function getTelegramConfig() {
  try {
    const docRef = doc(db, "config", "telegram");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.botToken && data.chatId) {
        return { botToken: data.botToken, chatId: data.chatId };
      }
    }
  } catch (e) {
    console.warn("No s'ha pogut carregar la configuració de Telegram de Firestore:", e);
  }

  const botToken = localStorage.getItem('telegram_bot_token') || '';
  const chatId = localStorage.getItem('telegram_chat_id') || '';
  return { botToken, chatId };
}

export async function saveTelegramConfig(botToken, chatId) {
  try {
    localStorage.setItem('telegram_bot_token', botToken);
    localStorage.setItem('telegram_chat_id', chatId);

    const docRef = doc(db, "config", "telegram");
    await setDoc(docRef, { botToken, chatId }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error desant la configuració de Telegram a Firestore:", e);
    return false;
  }
}

export async function sendTelegramNotification({ nom, email, telefon, missatge, projecteTitol, tipus = 'Consulta Web' }) {
  try {
    const { botToken, chatId } = await getTelegramConfig();

    if (!botToken || !chatId) {
      console.log('Notificació de Telegram pendent de configurar Token i Chat ID');
      return false;
    }

    const cleanNom = nom || 'No indicat';
    const cleanEmail = email || 'No indicat';
    const cleanTelefon = telefon || 'No indicat';
    const cleanMissatge = missatge || 'Sense contingut';

    const text = `
📩 <b>NOVA CONSULTA A MÍNIM MÓN</b>

👤 <b>Nom:</b> ${cleanNom}
📧 <b>Email:</b> ${cleanEmail}
📞 <b>Telèfon:</b> ${cleanTelefon}
${projecteTitol ? `🎨 <b>Projecte:</b> ${projecteTitol}\n` : ''}
💬 <b>Missatge / Idea:</b>
${cleanMissatge}

--------------------------------
<i>Sent des de minimmon.cat (${tipus})</i>
`.trim();

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    return response.ok;
  } catch (err) {
    console.warn('Error enviant notificació a Telegram:', err);
    return false;
  }
}

export async function sendTelegramCommentNotification({ autor, puntuacio, comentari, targetTitol, targetType = 'peça' }) {
  try {
    const { botToken, chatId } = await getTelegramConfig();

    if (!botToken || !chatId) {
      console.log('Notificació de Telegram pendent de configurar Token i Chat ID');
      return false;
    }

    const numStars = Math.min(5, Math.max(1, Number(puntuacio) || 5));
    const starsStr = '★'.repeat(numStars) + '☆'.repeat(5 - numStars);
    const cleanAutor = autor || 'Anònim';
    const cleanComentari = comentari || 'Sense text';
    const cleanTitol = targetTitol || 'Peça Mínim Món';

    const text = `
⭐ <b>NOVA VALORACIÓ PENDENT D'APROVAR</b>

🎨 <b>${targetType === 'projecte' ? 'Projecte' : 'Producte'}:</b> ${cleanTitol}
👤 <b>Autor:</b> ${cleanAutor}
⭐ <b>Puntuació:</b> ${starsStr} (${numStars}/5)
💬 <b>Comentari:</b>
<i>"${cleanComentari}"</i>

--------------------------------
<i>Accedeix a l'Àrea Privada per aprovar-la.</i>
`.trim();

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    return response.ok;
  } catch (err) {
    console.warn('Error enviant notificació de valoració a Telegram:', err);
    return false;
  }
}

export async function sendTelegramScheduleNotification({ 
  itemNom, 
  tipusItem = 'producte', 
  eventTipus = 'llancament_activat', 
  dataInici = '', 
  dataFi = '', 
  preu = null, 
  preuOferta = null,
  accioFinal = 'esborrany'
}) {
  try {
    const { botToken, chatId } = await getTelegramConfig();

    if (!botToken || !chatId) {
      console.log('Notificació de Telegram pendent de configurar Token i Chat ID');
      return false;
    }

    const cleanNom = itemNom || 'Element sense nom';
    const cleanTipus = tipusItem === 'projecte' ? 'Projecte' : 'Producte';
    let capcalera = '📅 <b>AVÍS DE PROGRAMACIÓ TEMPORAL</b>';
    let detalls = '';

    if (eventTipus === 'llancament_activat') {
      capcalera = '🚀 <b>LLANÇAMENT ACTIVAT AL WEB!</b>';
      detalls = `
🎨 <b>${cleanTipus}:</b> ${cleanNom}
⏰ <b>Activació:</b> Automàtica segons programació
${preu ? `💰 <b>Preu:</b> ${preu}€\n` : ''}
🌐 <i>Ja és visible i disponible a minimmon.cat!</i>
      `.trim();
    } else if (eventTipus === 'campanya_iniciada') {
      capcalera = '🏷️ <b>CAMPANYA TEMPORAL INICIADA!</b>';
      detalls = `
🎨 <b>${cleanTipus}:</b> ${cleanNom}
📅 <b>Vigència:</b> ${dataInici ? `Des de ${dataInici}` : ''} ${dataFi ? `fins a ${dataFi}` : ''}
${preuOferta ? `🔥 <b>Preu especial oferta:</b> ${preuOferta}€ ${preu ? `(Preu habitual: ${preu}€)` : ''}\n` : ''}
🌐 <i>Visible a la botiga de minimmon.cat</i>
      `.trim();
    } else if (eventTipus === 'campanya_finalitzada') {
      capcalera = '⏳ <b>CAMPANYA PROGRAMADA FINALITZADA</b>';
      detalls = `
🎨 <b>${cleanTipus}:</b> ${cleanNom}
🏁 <b>Data fi complerta:</b> ${dataFi || 'Avui'}
📌 <b>Nou estat aplicat:</b> ${accioFinal === 'arxivat' ? 'Fora de temporada (Arxivat)' : 'Ocult (Esborrany)'}
      `.trim();
    } else if (eventTipus === 'programacio_confirmada') {
      capcalera = '📅 <b>PROGRAMACIÓ TEMPORAL DESADA</b>';
      detalls = `
🎨 <b>${cleanTipus}:</b> ${cleanNom}
⏰ <b>Inici programat:</b> ${dataInici || 'No indicat'}
${dataFi ? `🏁 <b>Final programat:</b> ${dataFi}\n` : ''}
${preuOferta ? `🏷️ <b>Preu d'oferta:</b> ${preuOferta}€\n` : ''}
🔔 <i>Rebràs un missatge aquí quan s'activi o finalitzi automàticament.</i>
      `.trim();
    }

    const text = `
${capcalera}

${detalls}

--------------------------------
<i>Notificació automàtica de Mínim Món</i>
    `.trim();

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    return response.ok;
  } catch (err) {
    console.warn('Error enviant notificació de programació a Telegram:', err);
    return false;
  }
}

