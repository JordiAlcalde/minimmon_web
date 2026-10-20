/**
 * Script autònom per comprovar programacions temporals a Firestore
 * i enviar notificacions a Telegram.
 * 
 * Es pot executar manualment: node scripts/check_schedules.mjs
 * O mitjançant GitHub Actions de manera periòdica (cron).
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNdiZmlhYEAvMDsJWiD8XW-cAQJwQ_Er8",
  authDomain: "minimmon-web.firebaseapp.com",
  projectId: "minimmon-web",
  storageBucket: "minimmon-web.firebasestorage.app",
  messagingSenderId: "28312425135",
  appId: "1:28312425135:web:c6f515c618cc7f37df3a5a",
  measurementId: "G-R3GJSC068E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getTelegramConfig() {
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
    console.warn("No s'ha pogut carregar la configuració de Telegram de Firestore:", e.message);
  }
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || ''
  };
}

async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) {
    console.log("Notificació no enviada: manquen botToken o chatId.");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.error("Error contactant amb l'API de Telegram:", err.message);
    return false;
  }
}

async function processCollection(collName, tipusItem, botToken, chatId) {
  console.log(`\nRevisant col·lecció '${collName}'...`);
  const snapshot = await getDocs(collection(db, collName));
  const now = Date.now();
  let count = 0;

  for (const docSnap of snapshot.docs) {
    const item = docSnap.data();
    const prog = item.programacio;

    if (!prog || !prog.activa || !prog.notificarTelegram) continue;

    const cleanNom = item.nom || item.titol || item.title || 'Sense nom';
    const cleanTipus = tipusItem === 'projecte' ? 'Projecte' : 'Producte';
    const startTime = prog.dataInici ? new Date(prog.dataInici).getTime() : null;
    const endTime = prog.dataFi ? new Date(prog.dataFi).getTime() : null;

    // 1. Avaluació d'inici
    if (startTime && now >= startTime && !prog.notificatInici) {
      const isStillBeforeEnd = !endTime || now <= endTime;
      if (isStillBeforeEnd) {
        console.log(`[ACTIVACIÓ] ${cleanTipus} '${cleanNom}' ha assolit la data d'inici.`);
        let msg = '';
        if (prog.tipus === 'periode') {
          msg = `
🏷️ <b>CAMPANYA TEMPORAL INICIADA!</b>

🎨 <b>${cleanTipus}:</b> ${cleanNom}
📅 <b>Vigència:</b> ${prog.dataInici} fins a ${prog.dataFi || 'final indefinit'}
${prog.preuOferta ? `🔥 <b>Preu especial oferta:</b> ${prog.preuOferta}€\n` : ''}
🌐 <i>Ja és visible al web de minimmon.cat!</i>

--------------------------------
<i>Notificació automàtica de Mínim Món</i>
          `.trim();
        } else {
          msg = `
🚀 <b>LLANÇAMENT ACTIVAT AL WEB!</b>

🎨 <b>${cleanTipus}:</b> ${cleanNom}
⏰ <b>Hora d'activació:</b> ${prog.dataInici}
${item.preu ? `💰 <b>Preu:</b> ${item.preu}€\n` : ''}
🌐 <i>Ja és visible i disponible a minimmon.cat!</i>

--------------------------------
<i>Notificació automàtica de Mínim Món</i>
          `.trim();
        }

        const sent = await sendTelegramMessage(botToken, chatId, msg);
        if (sent) {
          await updateDoc(doc(db, collName, docSnap.id), {
            'programacio.notificatInici': true
          });
          console.log(`-> Notificació d'inici enviada i registrada per a '${cleanNom}'.`);
          count++;
        }
      }
    }

    // 2. Avaluació de finalització
    if (endTime && now > endTime && !prog.notificatFi) {
      console.log(`[FINALITZACIÓ] ${cleanTipus} '${cleanNom}' ha finalitzat el període.`);
      const accio = prog.accioFinal === 'arxivat' ? 'Fora de temporada (Arxivat)' : 'Ocult (Esborrany)';
      const msg = `
⏳ <b>CAMPANYA PROGRAMADA FINALITZADA</b>

🎨 <b>${cleanTipus}:</b> ${cleanNom}
🏁 <b>Data de finalització:</b> ${prog.dataFi}
📌 <b>Nou estat aplicat:</b> ${accio}

--------------------------------
<i>Notificació automàtica de Mínim Món</i>
      `.trim();

      const sent = await sendTelegramMessage(botToken, chatId, msg);
      if (sent) {
        await updateDoc(doc(db, collName, docSnap.id), {
          'programacio.notificatFi': true
        });
        console.log(`-> Notificació de finalització enviada i registrada per a '${cleanNom}'.`);
        count++;
      }
    }
  }

  return count;
}

async function processPostingSchedules(botToken, chatId) {
  console.log(`\nRevisant col·lecció 'posting_planificacio' (Calendari de publicacions)...`);
  try {
    const snapshot = await getDocs(collection(db, 'posting_planificacio'));
    const now = Date.now();
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const post = docSnap.data();

      // Només publicacions pendents que no hagin estat notificades
      if (post.estat === 'publicada' || post.notificatTelegram) continue;
      if (!post.dataPublicacio) continue;

      const hora = post.horaPublicacio || '10:00';
      const [h, m] = hora.split(':').map(Number);
      const [year, month, day] = post.dataPublicacio.split('-').map(Number);

      // Ajust d'hora de Madrid (península) per executar-se en qualsevol entorn (com GitHub Actions UTC)
      const testUtc = new Date(Date.UTC(year, month - 1, day, h || 10, m || 0));
      const madridDateStr = testUtc.toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
      const madridDate = new Date(madridDateStr);
      const offsetMs = testUtc.getTime() - madridDate.getTime();
      const scheduledTime = testUtc.getTime() + offsetMs;

      // Si ja s'ha assolit l'hora i data establertes (amb un marge raonable de fins a 7 dies)
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      if (now >= scheduledTime && scheduledTime >= sevenDaysAgo) {
        console.log(`[POSTING] Publicació '${post.title || docSnap.id}' ha assolit la data i hora programada (${post.dataPublicacio} ${hora}h).`);

        const tipusLabels = {
          producte: '🪵 Producte artesanal',
          projecte: '🎨 Projecte Atelier',
          esdeveniment: '🎪 Esdeveniment / Fira',
          novetat: '📣 Novetat / Notícia',
          filosofia: '🌿 Filosofia & Taller'
        };
        const tipusNom = tipusLabels[post.tipus] || '📸 Publicació de xarxes';
        const cleanTitol = post.title || 'Sense títol a la imatge';
        const cleanData = post.dataPublicacio;
        const cleanHora = post.horaPublicacio ? ` a les ${post.horaPublicacio}h` : '';
        const cleanCopy = post.copyText ? post.copyText.trim() : '(Sense text de peu de foto)';

        const msg = `
🔔 <b>RECORDATORI AUTOMÀTIC DE PUBLICACIÓ</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>Programat per a:</b> ${cleanData}${cleanHora}
🏷️ <b>Temàtica:</b> ${tipusNom}
🖼️ <b>Títol imatge:</b> ${cleanTitol}
${post.subtitle ? `💬 <b>Subtítol:</b> ${post.subtitle}\n` : ''}${post.tagText && post.showTag ? `🏷️ <b>Etiqueta:</b> ${post.tagText}\n` : ''}
📋 <b>TEXT PER COPIAR AL POST (Instagram):</b>
━━━━━━━━━━━━━━━━━━━━
${cleanCopy}
━━━━━━━━━━━━━━━━━━━━

🚀 <i>Obre Instagram al teu dispositiu, tria la imatge i enganxa aquest text!</i>
        `.trim();

        const sent = await sendTelegramMessage(botToken, chatId, msg);
        if (sent) {
          await updateDoc(doc(db, 'posting_planificacio', docSnap.id), {
            notificatTelegram: true,
            dataNotificatTelegram: new Date().toISOString()
          });
          console.log(`-> Notificació de publicació enviada automàticament per a '${cleanTitol}'.`);
          count++;
        }
      }
    }

    return count;
  } catch (err) {
    console.error("Error revisant posting_planificacio:", err.message);
    return 0;
  }
}

async function run() {
  console.log("=== Comprovador de Programacions de Mínim Món ===");
  console.log("Hora actual:", new Date().toISOString());

  const { botToken, chatId } = await getTelegramConfig();
  if (!botToken || !chatId) {
    console.log("Avís: Configuració de Telegram no trobada a Firestore o entorn.");
  } else {
    console.log("Configuració de Telegram carregada correctament.");
  }

  const notifProds = await processCollection('productes', 'producte', botToken, chatId);
  const notifProjs = await processCollection('projectes', 'projecte', botToken, chatId);
  const notifPosting = await processPostingSchedules(botToken, chatId);

  console.log(`\nComprovació finalitzada. Notificacions enviades: ${notifProds + notifProjs + notifPosting}`);
  process.exit(0);
}

run().catch(err => {
  console.error("Error en executar la comprovació:", err);
  process.exit(1);
});
